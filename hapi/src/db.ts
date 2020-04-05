import * as Postgres from 'postgres';
const config = require('config');

const sql = Postgres({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    password: config.db.password
});

module.exports = sql;