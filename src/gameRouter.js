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

const gameRouter = express.Router();
gameRouter.use(cookieParser());
gameRouter.use(express.urlencoded({ extended: true }));
gameRouter.use(bodyParser.json());
gameRouter.use(redirect);

gameRouter.route('/runik')
    .get(auth, async (req, res) => {
        const config = {
            username: req.user.username,
            role: req.user.role,
        };
        res.render('runikLobby.ejs', { config });
    });

gameRouter.route('/runik/game')
    .get(auth, async (req, res) => {
        const userId = req.user.id;
        const dbGames = await Runik.findAll({
            where: {
                [Op.or]: [
                    { player1Id: userId },
                    { player2Id: userId },
                ]
            }
        });
        const returnGames = await Promise.all(dbGames.map(async g => {
            const player1Name = (await User.findByPk(g.player1Id)).username;
            const player2Name = (await User.findByPk(g.player2Id))?.username;
            return {
                gameId: g.gameId,
                player1Id: g.player1Id,
                player2Id: g.player2Id,
                isOver: g.isOver,
                player1Name: player1Name,
                player2Name: player2Name,
            }
        }));
        res.send(returnGames);
    })
    .post(auth, async (req, res) => {
        const userId = req.user.id;
        const updateUserLobbies = [userId]
        const dbGames = await Runik.findAll({ where: { player2Id: null } });
        const joinableGames = dbGames.filter(game => game.player1Id !== userId);
        let gameId;
        if (joinableGames.length === 0) {
            gameId = await initNewGame(userId)
        } else {
            const gameToJoin = joinableGames[0];
            updateUserLobbies.push(gameToJoin.player1Id);
            await gameToJoin.update({ player2Id: userId });
            gameId = gameToJoin.gameId;
        }
        for (const lobby of lobbySession) {
            if (updateUserLobbies.includes(lobby.userId)) {
                const returnGames = await findGamesByUserId(lobby.userId);
                lobby.ws.send(JSON.stringify(returnGames));
            }
        }
    });

export const mountRouter = () => {
    gameRouter.ws('/runik/game/ws', (ws, req) => {
        const userId = getUserIdFromRequest(req);
        console.log(` ==> WebSocket connection established with ${userId} <==`);
        ws.on('message', async (msg) => {
            await handleIncomingMessage(ws, msg)
        });
    });
    gameRouter.ws('/runik/lobby/ws', async (ws, req) => {
        const userId = getUserIdFromRequest(req);
        console.log('WebSocket connection established');
        registerLobbyClient(userId, ws);
        const returnGames = await findGamesByUserId(userId);
        ws.send(JSON.stringify(returnGames));
    });
}
async function findGamesByUserId(userId) {
    const dbGames = await Runik.findAll({
        where: {
            [Op.or]: [
                { player1Id: userId },
                { player2Id: userId },
            ]
        }
    });
    const returnGames = await Promise.all(dbGames.map(async g => {
        const player1Name = (await User.findByPk(g.player1Id)).username;
        const player2Name = (await User.findByPk(g.player2Id))?.username;
        return {
            gameId: g.gameId,
            player1Id: g.player1Id,
            player2Id: g.player2Id,
            isOver: g.isOver,
            player1Name: player1Name,
            player2Name: player2Name,
        }
    }));
    return returnGames;
}

const lobbySession = [];
function registerLobbyClient(userId, ws) {
    lobbySession.push({
        userId: userId,
        ws: ws
    });
    ws.on('close', () => {
        lobbySession.splice(lobbySession.findIndex(session => session.userId === userId), 1);
    });
    console.log('👤 A user connected to Lobby. Total:', lobbySession.length);
}

const gameSessions = [];
function registerGameClient(gameId, userId, ws) {
    gameSessions.push({
        gameId: gameId,
        userId: userId,
        ws: ws
    });
    ws.on('close', () => {
        gameSessions.splice(gameSessions.findIndex(session => session.gameId === gameId && session.userId === userId), 1);
    });
    console.log('👤 A user connected to Game. Total:', gameSessions.length);
}
function getUserIdFromRequest(req) {
    const token = req.cookies.token;
    return token ? jwt.verify(token, process.env.PASSWORD_HASH_SECRET).id : null;
}

async function handleIncomingMessage(ws, msg) {
    const message = JSON.parse(msg);
    const command = message.command;
    const body = message.body;
    switch (command) {
        case 'GAMESTATE': {
            const gameId = body.gameId;
            const userId = body.userId;
            const game = await Runik.findByPk(gameId);
            if (game === undefined || game === null) {
                return;
            }
            const moves = await RunikMove.findAll({ where: { gameId: gameId } })
            const turnplayer = moves.length % 2 === 0 ? game.player1Id : game.player2Id;
            ws.send(JSON.stringify({ command: 'GAMESTATE', body: { moves: moves, yourTurn: turnplayer === userId } }));
            registerGameClient(gameId, userId, ws);
            break;
        }
        case 'MOVE': {
            const gameId = body.gameId;
            const userId = body.userId;
            const game = await Runik.findByPk(gameId);
            if (game === undefined || game === null) {
                return;
            }
            const move = {
                sourcex: body.move.sourcex,
                sourcey: body.move.sourcey,
                targetx: body.move.targetx,
                targety: body.move.targety,
                rune: body.move.rune,
            }
            const validation = await validateMove(game, userId, move);
            if (validation.valid === false) {
                return;
            }
            await addMove(game, move);
            if (validation.isGameOver) {
                await game.update({ isOver: true });
            }
            for (const session of gameSessions) {
                if (session.gameId === gameId) {
                    session.ws.send(JSON.stringify({ command: 'MOVE', body: { move: move, isGameOver: validation.isGameOver } }))
                }
            }
        }
            break;
    }
}

gameRouter.route('/runik/game/:gameId')
    .get(auth, async (req, res) => {
        const gameId = req.params.gameId;
        const game = await Runik.findByPk(gameId);
        if (game === undefined || game === null) {
            res.sendStatus(404);
        } else {
            const moves = await RunikMove.findAll({ where: { gameId: gameId } })
            res.send(moves.map(m => {
                return {
                    index: m.index,
                    sourcex: m.sourcex,
                    sourcey: m.sourcey,
                    targetx: m.targetx,
                    targety: m.targety,
                    rune: m.rune,
                }
            }));
        }
    })
    .post(auth, async (req, res) => {
        const userId = req.user.id;
        const gameId = req.params.gameId;
        const game = await Runik.findByPk(gameId);
        if (game === undefined || game === null) {
            res.sendStatus(404);
        }
        const move = {
            sourcex: req.body.sourcex,
            sourcey: req.body.sourcey,
            targetx: req.body.targetx,
            targety: req.body.targety,
            rune: req.body.rune,
        }
        const validation = await validateMove(game, userId, move);
        if (validation.valid) {
            await addMove(game, move);
            if (validation.isGameOver) {
                await game.update({ isOver: true });
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(400)
        }
    });

gameRouter.route('/runik/:gameId')
    .get(auth, async (req, res) => {
        const config = {
            username: req.user.username,
            role: req.user.role,
        };
        res.render('runikGame.ejs', { userId: req.user.id, config });
    });

async function initNewGame(player1Id) {
    const gameId = crypto.randomUUID();
    await Runik.create({
        gameId: gameId,
        player1Id: player1Id,
        player2Id: null,
        isOver: false,
    })
    return gameId;
}

async function validateMove(game, userId, move) {
    // Check if there are 2 Players in game
    if (game.player2Id === null) {
        return false;
    }
    // Check if the sending player is the turnplayer
    const pastMoves = await RunikMove.findAll({ where: { gameId: game.gameId } });
    const sortedMoves = pastMoves.sort((a, b) => a.index - b.index);
    if (sortedMoves.length % 2 === 0 && game.player1Id !== userId || sortedMoves.length % 2 === 1 && game.player2Id !== userId) {
        console.log('WRONG PLAYER')
        return false;
    }
    // Check if the move is legal
    const moves = sortedMoves.map(m => {
        return {
            index: m.index,
            sourcex: m.sourcex,
            sourcey: m.sourcey,
            targetx: m.targetx,
            targety: m.targety,
            rune: m.rune,
        }
    });
    moves.push({ index: moves.length, ...move });
    return validateMoves(moves);
}

async function addMove(game, move) {
    const pastMoves = await RunikMove.findAll({ where: { gameId: game.gameId } });
    await RunikMove.create({
        gameId: game.gameId,
        index: pastMoves.length,
        sourcex: move.sourcex,
        sourcey: move.sourcey,
        targetx: move.targetx,
        targety: move.targety,
        rune: move.rune,
    })
}

export default gameRouter;