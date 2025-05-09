import { Sequelize } from 'sequelize';
import config from '../../config/config.js';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const database = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
});

export default database;