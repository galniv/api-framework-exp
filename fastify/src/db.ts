import * as fastifyPlugin from 'fastify-plugin';
import * as Postgres from 'postgres';
import * as fastify from 'fastify';
const config = require('config');

const sql = Postgres({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    password: config.db.password
});

// Extend fastify typings.
declare module "fastify" {
    interface FastifyInstance {
        sql:Function
    }
}

module.exports = fastifyPlugin(async (fastify:fastify.FastifyInstance, options:fastifyPlugin.PluginOptions) => {
    fastify.decorate('sql', sql);
});