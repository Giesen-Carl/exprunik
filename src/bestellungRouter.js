import express from 'express';
import { auth, authUser, Role, validateRole } from './auth_router.js';
import cookieParser from 'cookie-parser';
import Bestellung from './database/model/bestellungModel.js';
import User from './database/model/userModel.js';
import Cocktail from './database/model/cocktailModel.js';
import bodyParser from 'body-parser';
import { redirect } from './auth_router.js';
import jwt from 'jsonwebtoken';

const BestellStatus = {
    IN_PROGRESS: 'IN_PROGRESS',
    FINISHED: 'FINISHED',
}

const bestellungRouter = express.Router();
bestellungRouter.use(cookieParser());
bestellungRouter.use(express.urlencoded({ extended: true }));
bestellungRouter.use(bodyParser.json());
bestellungRouter.use(redirect);

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' })

bestellungRouter.get('/bestellung', auth, async (req, res) => {
    const bestellungenDB = await Bestellung.findAll();
    const bestellungen = await Promise.all(bestellungenDB.map(b => {
        const timeString = dateFormat.format(new Date(b.createdAt)).replace(',', '');
        return {
            time: timeString,
            username: b.username,
            cocktailIdent: b.cocktailIdent,
            status: b.status,
            id: b.id
        }
    }));
    const config = {
        username: req.user.username,
        role: req.user.role,
    };
    res.render('bestellungen', { bestellungen, config })
});

bestellungRouter.get(
    '/bestellungen',
    authUser,
    async (req, res) => {
        let bestellungenDB;
        if (req.user?.role === Role.USER) {
            bestellungenDB = await Bestellung.findAll({ where: { username: req.user.username } });
        } else if (req.user?.role === Role.ADMIN) {
            bestellungenDB = await Bestellung.findAll();
        }
        let bestellungen;
        if (bestellungenDB !== undefined) {
            bestellungen = await Promise.all(bestellungenDB.map(b => {
                const timeString = dateFormat.format(new Date(b.createdAt)).replace(',', '');
                return {
                    time: timeString,
                    username: b.username,
                    cocktailIdent: b.cocktailIdent,
                    status: b.status,
                    id: b.id
                }
            }));
        }
        res.json(bestellungen);
    });

const bestellungSession = [];
function registerBestellungClient(user, ws) {
    bestellungSession.push({
        userId: user.id,
        ws: ws
    });
    ws.on('close', () => {
        bestellungSession.splice(bestellungSession.findIndex(session => session.userId === user.id), 1);
    });
    console.log('👤 A user connected to Bestellung. Total:', bestellungSession.length);
}
function getUserIdFromRequest(req) {
    const token = req.cookies.token;
    return token ? jwt.verify(token, process.env.PASSWORD_HASH_SECRET).id : null;
}
async function findBestellungenByUser(user) {
    let bestellungenDB;
    if (user.role === Role.USER) {
        bestellungenDB = await Bestellung.findAll({ where: { username: user.username } });
    } else if (user.role === Role.ADMIN) {
        bestellungenDB = await Bestellung.findAll();
    }
    let bestellungen;
    if (bestellungenDB !== undefined) {
        bestellungen = await Promise.all(bestellungenDB.map(b => {
            const timeString = dateFormat.format(new Date(b.createdAt)).replace(',', '');
            return {
                time: timeString,
                username: b.username,
                cocktailIdent: b.cocktailIdent,
                status: b.status,
                id: b.id
            }
        }));
    }
    return bestellungen;
}

export const mountBestellungRouter = () => {
    bestellungRouter.ws('/bestellung/ws', async (ws, req) => {
        const userId = getUserIdFromRequest(req);
        const user = await User.findByPk(userId);
        if (!user) {
            ws.close();
            return;
        }
        console.log('WebSocket connection established');
        registerBestellungClient(user, ws);
        const bestellungen = await findBestellungenByUser(user);
        ws.send(JSON.stringify(bestellungen));
    });
};

async function sendBestellungUpdateToClients(userId) {
    const notifyIds = [...(await User.findAll({ where: { role: Role.ADMIN } })).map(user => user.id), userId];
    for (const session of bestellungSession) {
        if (notifyIds.includes(session.userId)) {
            const user = await User.findByPk(session.userId);
            const bestellungen = await findBestellungenByUser(user);
            session.ws.send(JSON.stringify(bestellungen));
        }
    }
}

bestellungRouter.post(
    '/bestellung/:cocktailIdent',
    authUser,
    validateRole(Role.USER),
    async (req, res) => {
        try {
            await bestellungHinzufuegen(req.params.cocktailIdent, req.user.username)
            await sendBestellungUpdateToClients(req.user.id);
        } catch (error) {
            console.log(error)
        }
        res.sendStatus(200);
    });
bestellungRouter.post(
    '/bestellung/delete/:id',
    authUser,
    validateRole(Role.ADMIN),
    async (req, res) => {
        try {
            const params = req.params;
            const username = (await Bestellung.findByPk(params.id)).username;
            const user = await User.findOne({ where: { username: username } });
            await bestellungEntfernen(params.id);
            await sendBestellungUpdateToClients(user.id);
        } catch (error) {}
        res.sendStatus(200);
    });
bestellungRouter.post(
    '/bestellung/complete/:id',
    authUser,
    validateRole(Role.ADMIN),
    async (req, res) => {
        try {
            const params = req.params;
            const username = (await Bestellung.findByPk(params.id)).username;
            const user = await User.findOne({ where: { username: username } });
            await bestellungAbschliessen(params.id);
            await sendBestellungUpdateToClients(user.id);
        } catch (error) {}
        res.sendStatus(200);
    });

async function bestellungHinzufuegen(cocktailIdent, username) {
    if (!username) {
        throw new Error('No username provided');
    }
    if (!cocktailIdent) {
        throw new Error('No CocktailIdent provided');
    }
    const existingUser = await User.findOne({ where: { username: username } });
    if (!existingUser) {
        throw new Error(`The user ${username} does not exist.`);
    }
    const existingCocktail = await Cocktail.findOne({ where: { cocktailIdent: cocktailIdent } });
    if (!existingCocktail) {
        throw new Error(`The Cocktail ${cocktailIdent} does not exist.`);
    }
    await Bestellung.create({ username: username, cocktailIdent: cocktailIdent, status: BestellStatus.IN_PROGRESS })
}

async function bestellungEntfernen(id) {
    const existingBestellung = await Bestellung.findByPk(id);
    if (!existingBestellung) {
        throw new Error(`Es existiert keine Bestellung für ${cocktailIdent} von ${username}`);
    }
    await existingBestellung.destroy();
}

async function bestellungAbschliessen(id) {
    const existingBestellung = await Bestellung.findByPk(id);
    if (!existingBestellung) {
        throw new Error(`Es existiert keine Bestellung für ${cocktailIdent} von ${username}`);
    }
    if (existingBestellung.status !== BestellStatus.IN_PROGRESS) {
        throw new Error('Die Bestellung ist nicht in progress');
    }
    await existingBestellung.update({ status: BestellStatus.FINISHED });
}

export default bestellungRouter;