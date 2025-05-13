const players = [
    {
        id: 0,
    }, {
        id: 1,
    }
]

const game = {
    rowsAndCols: 13,
    players: players,
    turnplayer: players[0],
    field: [],
    moves: [],
    history: [],
}

function setup() {
    game.field = generateField();
}

function generateMoves(field, player) {
    let options = []
    iterateField(field, (cell, pos) => {
        if (cell.player === player && cell.rune > 0) {
            // BLOCKER
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i !== 0 || j !== 0) {
                        const targetPos = { x: pos.x + i, y: pos.y + j };
                        if (isEmpty(field, targetPos)) {
                            const move = genMove(field, pos, targetPos, 0, cell.player, []);
                            if (testMove(field, move)) {
                                options.push(move);
                            }
                        }
                    }
                }
            }
            // RUNES
            const placeableRunes = [1, 2, 3, 4, 5].filter(r => r !== cell.rune);
            getAttackedFields(field, pos).forEach(f => placeableRunes.forEach(pr => {
                const move = genMove(field, pos, f.pos, pr, cell.player, f.paths);
                if (testMove(field, move)) {
                    options.push(move);
                }
            }))
        }
    });
    return options;
}

function genMove(field, sourcePos, targetPos, rune, player, path) {
    const move = {
        sourcePos: sourcePos,
        targetPos: targetPos,
        before: {
            rune: field[targetPos.x][targetPos.y].rune,
            player: field[targetPos.x][targetPos.y].player,
        },
        after: {
            rune: rune,
            player: player,
        },
        path: path,
    };
    return move;
}

function doMove(field, move) {
    field[move.targetPos.x][move.targetPos.y].rune = move.after.rune;
    field[move.targetPos.x][move.targetPos.y].player = move.after.player;
    for (const path of move.path) {
        field[path.x][path.y].rune = 0;
        field[path.x][path.y].player = move.after.player;
    }
}

function undoMove(field, move) {
    field[move.targetPos.x][move.targetPos.y].rune = move.before.rune;
    field[move.targetPos.x][move.targetPos.y].player = move.before.player;
    for (const path of move.path) {
        field[path.x][path.y].rune = -1;
        field[path.x][path.y].player = -1;
    }
}

function testMove(field, move) {
    doMove(field, move);
    const attackedFields = [];
    const playerFields = [];
    iterateField(field, (cell, pos) => {
        if (cell.player === move.after.player) {
            playerFields.push(`${pos.x}-${pos.y}`);
        } else {
            attackedFields.push(...getAttackedFields(field, pos, cell.player).map(f => `${f.pos.x}-${f.pos.y}`));
        }
    });
    const valid = new Set([...attackedFields, ...playerFields]).size === new Set(attackedFields).size + playerFields.length;
    undoMove(field, move);
    return valid;
}

function getAttackedFields(field, pos) {
    const x = pos.x;
    const y = pos.y;
    const rune = field[x][y].rune;
    const player = field[x][y].player;
    const attackedFields = [];
    const processPaths = (paths) => {
        for (const path of paths) {
            const mappedPath = path.map(pos => { return { x: x + pos[0], y: y + pos[1] } });
            for (let i = 0; i < path.length; i++) {
                const subpath = i === 0 ? mappedPath : mappedPath.slice(0, -i);
                const lastPos = subpath[subpath.length - 1];
                const behindPath = subpath.slice(0, -1);
                if (isPlaceable(field, lastPos, player) && behindPath.every(pos => isEmpty(field, pos))) {
                    attackedFields.push({
                        pos: lastPos,
                        paths: behindPath
                    });
                }
            }
        }
    }
    switch (rune) {
        case 1: processPaths([
            [[-1, -1]],
            [[-1, 0]],
            [[-1, 1]],
            [[0, -1]],
            [[0, 1]],
            [[1, -1]],
            [[1, 0]],
            [[1, 1]],
        ]);
            break;
        case 2: processPaths([
            [[-1, 0], [-2, 0], [-3, 0]],
            [[0, -1], [0, -2], [0, -3]],
            [[1, 0], [2, 0], [3, 0]],
            [[0, 1], [0, 2], [0, 3]],
        ]);
            break;
        case 3: processPaths([
            [[1, 0], [2, 0], [2, -1]],
            [[1, 0], [2, 0], [2, 1]],
            [[0, 1], [0, 2], [-1, 2]],
            [[0, 1], [0, 2], [1, 2]],
            [[-1, 0], [-2, 0], [-2, 1]],
            [[-1, 0], [-2, 0], [-2, -1]],
            [[0, -1], [0, -2], [1, -2]],
            [[0, -1], [0, -2], [-1, -2]],
        ]);
            break;
        case 4: processPaths([
            [[-1, -1], [-2, -2], [-3, -3]],
            [[-1, 1], [-2, 2], [-3, 3]],
            [[1, -1], [2, -2], [3, -3]],
            [[1, 1], [2, 2], [3, 3]],
        ]);
            break;
        case 5: processPaths([
            [[-1, -1], [-2, -2], [-3, -1]],
            [[-1, -1], [-2, -2], [-1, -3]],
            [[1, -1], [2, -2], [3, -1]],
            [[1, -1], [2, -2], [1, -3]],
            [[-1, 1], [-2, 2], [-3, 1]],
            [[-1, 1], [-2, 2], [-1, 3]],
            [[1, 1], [2, 2], [3, 1]],
            [[1, 1], [2, 2], [1, 3]],
        ]);
            break;
    };
    return attackedFields;
}

function isEmpty(field, pos) {
    return pos.x >= 0 && pos.x < game.rowsAndCols && pos.y >= 0 && pos.y < game.rowsAndCols && field[pos.x][pos.y].rune === -1;
}

function isPlaceable(field, pos, player) {
    return pos.x >= 0 && pos.x < game.rowsAndCols && pos.y >= 0 && pos.y < game.rowsAndCols && field[pos.x][pos.y].rune !== 0 && field[pos.x][pos.y].player !== player;
}

function iterateField(field, doStuff) {
    for (let x = 0; x < field.length; x++) {
        for (let y = 0; y < field[0].length; y++) {
            doStuff(field[x][y], { x, y });
        }
    }
}

function generateField() {
    const field = []
    for (let i = 0; i < game.rowsAndCols; i++) {
        if (field[i] === undefined) {
            field[i] = [];
        }
        for (let j = 0; j < game.rowsAndCols; j++) {
            field[i][j] = {
                player: -1,
                rune: -1,
            }
        }
    }
    field[6][6].rune = 0;
    field[5][5] = {
        rune: 1,
        player: game.players[0].id
    }
    field[7][7] = {
        rune: 1,
        player: game.players[1].id,
    }
    return field;
}

function compPos(pos1, pos2) {
    return pos1.x === pos2.x && pos1.y === pos2.y;
}

function gameEnded(game) {
    return Object.values(game.moves).some(moves => moves.length === 0);
}

function getLosingPlayer(game) {
    const playerIds = Object.keys(game.moves);
    for (const id of playerIds) {
        if (generateMoves(game.field, id).length === 0) {
            return parseInt(id);
        }
    }
    return undefined;
}

export function validateMoves(moves) {
    const field = generateField();
    for (const move of moves) {
        const player = move.index % 2;
        const availableMoves = generateMoves(field, player);
        const foundMove = findMove(availableMoves, move);
        if (foundMove === undefined) {
            return { valid: false, isGameOver: undefined };
        } else {
            doMove(field, foundMove);
        }
    }
    const hasP1Lost = generateMoves(field, 0).length === 0;
    const hasP2Lost = generateMoves(field, 1).length === 0;
    return { valid: true, isGameOver: hasP1Lost || hasP2Lost };
}

function findMove(moves, move) {
    return moves.find(m =>
        m.sourcePos.x === move.sourcex &&
        m.sourcePos.y === move.sourcey &&
        m.targetPos.x === move.targetx &&
        m.targetPos.y === move.targety &&
        m.after.rune === move.rune
    )
}
