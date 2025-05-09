import { DataTypes } from 'sequelize';
import database from '../database.js';

const Auth = database.define('Auth', {
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
},
    {
        tableName: 'Auth',
        timestamps: false
    });

export default Auth;