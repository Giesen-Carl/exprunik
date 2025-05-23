import express from 'express';
import { auth, Role, validateRole } from './auth_router.js';
import Runik from './database/model/runikModel.js';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { redirect } from './auth_router.js';
import crypto from 'crypto';
import { Op } from 'sequelize';
import RunikMove from './database/model/runikMoveModel.js';
import { validateMoves } from './runik/runik.js';
import User from './database/model/userModel.js';
import jwt from 'jsonwebtoken';

const golRouter = express.Router();
golRouter.use(cookieParser());
golRouter.use(express.urlencoded({ extended: true }));
golRouter.use(bodyParser.json());
golRouter.use(redirect);

golRouter.route('/gol')
    .get(auth, async (req, res) => {
        const config = {
            username: req.user.username,
            role: req.user.role,
        };
        res.render('gol.ejs', { config });
    });

export const mountGolRouter = () => {
    golRouter.ws('/gol/ws', (ws, req) => {
        const userId = getUserIdFromRequest(req);
        registerGolClient(userId, ws);
        console.log(` ==> WebSocket connection established with ${userId} <==`);
        ws.on('message', async (msg) => {
            await handleIncomingMessage(userId, msg)
        });
    });
}

const golSessions = [];
function registerGolClient(userId, ws) {
    golSessions.push({
        userId: userId,
        ws: ws
    });
    ws.on('close', () => {
        golSessions.splice(golSessions.findIndex(session => session.userId === userId), 1);
    });
    console.log('👤 A user connected to Game. Total:', golSessions.length);
}

function getUserIdFromRequest(req) {
    const token = req.cookies.token;
    return token ? jwt.verify(token, process.env.PASSWORD_HASH_SECRET).id : null;
}

async function handleIncomingMessage(userId, msg) {
    const data = JSON.parse(msg);
    if (data instanceof Array && data.every(d => typeof d.x === 'number' && typeof d.y === 'number')) {
        const coloredCells = data.map(cell => ({
            x: cell.x,
            y: cell.y,
            c: stringToColor(userId),
        }));
        addingCells.push(...coloredCells);
    }
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

// Game logic
let state = [];
let addingCells = [];
function initState() {
    // networkState = [[5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5], [10, 6]];
    state = [
        { x: 0, y: 0, c: 'black' },
        { x: 1, y: 0, c: 'black' },
        { x: 0, y: 1, c: 'black' },
        { x: 1, y: 1, c: 'black' },
    ];
}
setupServer();
function setupServer() {
    initState();
    setInterval(drawServer, 16);
    sendMessage(state);
}

function drawServer() {
    advanceState();
    addCellsToState();
    sendMessage(state);
}

function advanceState() {
    const getN = (x, y) => { return [[x - 1, y - 1], [x - 1, y], [x - 1, y + 1], [x, y - 1], [x, y + 1], [x + 1, y - 1], [x + 1, y], [x + 1, y + 1]] };
    const map = [];
    for (const cell of state) {
        const n = getN(cell.x, cell.y);
        for (const [nx, ny] of n) {
            const existing = map.find((m) => m.x === nx && m.y === ny);
            if (existing) {
                if (existing.n[cell.c] === undefined) {
                    existing.n[cell.c] = 1;
                } else {
                    existing.n[cell.c] = existing.n[cell.c] + 1;
                }
            } else {
                map.push({ x: nx, y: ny, o: false, n: { [cell.c]: 1 } });
            }
        }
        const existing = map.find((m) => m.x === cell.x && m.y === cell.y);
        if (existing) {
            existing.o = true;
        } else {
            map.push({ x: cell.x, y: cell.y, o: true, n: {} });
        }
    }
    const newState = [];
    for (const m of map) {
        const obj = m.n;
        const n = Object.values(obj).reduce((total, num) => total + num, 0);
        if (n === 3 || n === 2 && m.o) {
            const sortedKeys = Object.keys(obj).sort((a, b) => obj[b] - obj[a]);
            const maxKey = sortedKeys[0] === 'black' && sortedKeys.length > 1 ? sortedKeys[1] : sortedKeys[0];
            const duplicates = Object.values(obj).filter(o => o === obj[maxKey]).length > 1;
            const c = duplicates ? 'black' : maxKey;
            newState.push({ x: m.x, y: m.y, c: c });
        }
    }
    state = newState;
}

function addCellsToState() {
    while (addingCells.length > 0) {
        const cell = addingCells.shift();
        const existing = state.find((ex) => ex.x === cell.x && ex.y === cell.y);
        if (!existing) {
            state.push(cell);
        } else {
            const index = state.findIndex((ex) => ex.x === cell.x && ex.y === cell.y);
            state.splice(index, 1);
        }
    }
}

function sendMessage(msg) {
    for (const session of golSessions) {
        session.ws.send(JSON.stringify(msg));
    }
}

export default golRouter;