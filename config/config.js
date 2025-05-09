export default {
    development: {
        username: "admin",
        password: process.env.POSTGRES_PASSWORD,
        database: "express_db",
        host: "localhost",
        dialect: "postgres"
    },
    production: {
        username: "admin",
        password: process.env.POSTGRES_PASSWORD,
        database: "express_db",
        host: "postgres_container",
        dialect: "postgres"
    }
}