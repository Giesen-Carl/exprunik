import { DataTypes } from 'sequelize';
import database from '../database.js';

const User = database.define('User', {
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
},
    {
        tableName: 'User',
        timestamps: false
    });

export default User;