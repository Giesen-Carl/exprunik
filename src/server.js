import 'dotenv/config';
import express from 'express';
import https from 'https';
import fs from 'fs';
import auth_router, { auth } from './auth_router.js';
import database from './database/database.js';

const privateKey = fs.readFileSync('cert/key.pem', 'utf8');
const certificate = fs.readFileSync('cert/cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const app = express();
const httpsServer = https.createServer(credentials, app);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(auth_router);

app.get('/', auth, (req, res) => {
    res.render('home', { name: req.user.username });
});

app.get('/about', auth, (req, res) => {
    const data = {
        username: req.user.username,
        email: req.user.email
    };
    res.render('about', data);
});

app.get('/profile', auth, (req, res) => {
    const data = {
        username: req.user.username,
        email: req.user.email
    };
    res.render('profile', data);
});

const start = async () => {
    await database.sync();
    httpsServer.listen(443, () => console.log(`Server is running at http://localhost:${443}`));
};

start();
