import { DataTypes } from 'sequelize';
import database from '../database.js';

const RunikMove = database.define('RunikMove', {
    gameId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    sourcex: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    sourcey: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    targetx: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    targety: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    rune: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
},
    {
        tableName: 'RunikMove',
        timestamps: false
    });

export default RunikMove;