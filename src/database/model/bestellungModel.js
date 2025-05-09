import { DataTypes } from 'sequelize';
import database from '../database.js';

const Bestellung = database.define('Bestellung', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cocktailIdent: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    }
},
    {
        tableName: 'Bestellung',
        timestamps: true
    });

export default Bestellung;