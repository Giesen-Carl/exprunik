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

const gameRouter = express.Router();
gameRouter.use(cookieParser());
gameRouter.use(express.urlencoded({ extended: true }));
gameRouter.use(bodyParser.json());
gameRouter.use(redirect);

gameRouter.route('/runik')
    .get(auth, validateRole(Role.USER), async (req, res) => {
        const config = {
            username: req.user.username,
            role: req.user.role,
        };
        res.render('runikLobby.ejs', { config });
    });

gameRouter.route('/runik/game')
    .get(auth, validateRole(Role.USER), async (req, res) => {
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
    .post(auth, validateRole(Role.USER), async (req, res) => {
        const userId = req.user.id;
        const dbGames = await Runik.findAll({ where: { player2Id: null } });
        const joinableGames = dbGames.filter(game => game.player1Id !== userId);
        let gameId;
        if (joinableGames.length === 0) {
            gameId = await initNewGame(userId)
        } else {
            const gameToJoin = joinableGames[0];
            await gameToJoin.update({ player2Id: userId });
            gameId = gameToJoin.gameId;
        }
        res.redirect(req.query.redirect)
    });

gameRouter.route('/runik/game/:gameId')
    .get(auth, validateRole(Role.USER), async (req, res) => {
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
    .post(auth, validateRole(Role.USER), async (req, res) => {
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
    .get(auth, validateRole(Role.USER), async (req, res) => {
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