import { DataTypes } from 'sequelize';
import database from '../database.js';

const Runik = database.define('Runik', {
    gameId: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    player1Id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    player2Id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isOver: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    }
},
    {
        tableName: 'Runik',
        timestamps: false
    });

export default Runik;