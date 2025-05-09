import express from 'express';
import { auth, authUser, Role, validateRole } from './auth_router.js';
import cookieParser from 'cookie-parser';
import Bestellung from './database/model/bestellungModel.js';
import User from './database/model/userModel.js';
import Cocktail from './database/model/cocktailModel.js';
import bodyParser from 'body-parser';
import { redirect } from './auth_router.js';

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

bestellungRouter.post(
    '/bestellung/:cocktailIdent',
    authUser,
    validateRole(Role.USER),
    async (req, res) => {
        try {
            await bestellungHinzufuegen(req.params.cocktailIdent, req.user.username)
        } catch (error) {
            console.log(error)
        }
        res.status(200);
    });
bestellungRouter.post(
    '/bestellung/delete/:id',
    authUser,
    validateRole(Role.ADMIN),
    async (req, res) => {
        try {
            const params = req.params;
            await bestellungEntfernen(params.id);
        } catch (error) {}
        res.redirect(req.query.redirect)
    });
bestellungRouter.post(
    '/bestellung/complete/:id',
    authUser,
    validateRole(Role.ADMIN),
    async (req, res) => {
        try {
            const params = req.params;
            await bestellungAbschliessen(params.id);
        } catch (error) {}
        res.redirect(req.query.redirect)
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