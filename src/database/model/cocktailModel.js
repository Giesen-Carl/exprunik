import { DataTypes } from 'sequelize';
import database from '../database.js';

const Cocktail = database.define('Cocktail', {
    cocktailIdent: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    }
},
    {
        tableName: 'Cocktail',
        timestamps: false
    });

export default Cocktail;