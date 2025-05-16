import 'dotenv/config';
import express from 'express';
import http from 'http';
import auth_router, { authUser, authws } from './auth_router.js';
import cocktailRouter from './cocktailRouter.js';
import database from './database/database.js';
import Cocktail from './database/model/cocktailModel.js';
import bestellungRouter from './bestellungRouter.js';
import gameRouter from './gameRouter.js';
import expressWs from 'express-ws';
import jwt from 'jsonwebtoken';


const app = express();
const httpServer = http.createServer(app);
expressWs(app, httpServer);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(auth_router);
app.use(cocktailRouter);
app.use(bestellungRouter);
app.use(gameRouter);

app.get('/', authUser, async (req, res) => {
    const cocktails = await Cocktail.findAll();
    const categories = [...new Set(cocktails.map(elem => elem.category))];
    const data = categories.map(categoryName => {
        return {
            name: categoryName, items: cocktails.filter(elem => elem.category === categoryName).map(cocktail => {
                return {
                    cocktailIdent: cocktail.cocktailIdent,
                    price: cocktail.price,
                    description: cocktail.description.split(','),
                }
            })
        }
    })
    const config = {
        role: req.user?.role,
        redirect: `?redirect=${req.url}`,
        username: req.user?.username,
    }
    res.render('cocktails', { data: data, config: config })
});

app.get('/test', authUser, (req, res) => {
    res.render('test');
});

httpServer.on('upgrade', authws);

const clients = {};
function registerClient(req, ws) {
    const userId = getUserIdFromRequest(req);
    if (userId) {
        clients[userId] = ws;
    }
    console.log('👤 A user connected. Total:', Object.keys(clients).length);
}
function getUserIdFromRequest(req) {
    const token = req.cookies.token;
    return token ? jwt.verify(token, process.env.PASSWORD_HASH_SECRET).id : null;
}
app.ws('/', async (ws, req) => {
    registerClient(req, ws);

    ws.on('message', (msg) => {
        console.log('Received message:', msg);
        const target_clients = Object.entries(clients).filter(([user_id, _client]) => user_id !== req.user.id).map(([_user_id, client]) => client);
        for (const client of target_clients) {
            client.send(msg);
        };
    });

    ws.on('close', () => {
    });
    console.log('WebSocket connection closed');
});

const start = async () => {
    await database.sync();
    httpServer.listen(3000, () => console.log(`Server is running at http://localhost:${3000}`));
};

start();
