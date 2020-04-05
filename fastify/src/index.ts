import * as fastify from 'fastify';
import * as bcrypt from 'bcrypt';
import * as fastifyBasicAuth from 'fastify-basic-auth';
import { Server, IncomingMessage, ServerResponse } from 'http'

const config = require('config');

const server:fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> = fastify({});

server.register(require('./db'));
server.register(require('./api/user'));

interface AuthenticatedUser {
    id: string,
    name: string,
    email: string
}

// Extend fastify typings.
declare module "fastify" {
    interface FastifyRequest {
        authenticatedUserId:string
        authenticatedUser: AuthenticatedUser
    }
}

server.decorateRequest('authenticatedUserId', '');
server.decorateRequest('authenticatedUser', {});

async function validate(username:string, password:string, req:fastify.FastifyRequest, reply: fastify.FastifyReply<ServerResponse>) {
    const selectResults = await server.sql`
        SELECT id, password
        FROM users
        WHERE email = ${ username }
    `;

    if (selectResults.count > 0) {
        const user = selectResults[0];

        const isValid:boolean = await bcrypt.compare(password, user.password);

        if (isValid) {
            console.log(1);
            req.authenticatedUserId = String(user.id);
            return;
        }
    }

    throw new Error('Invalid credentials')
}

server.register(require('fastify-basic-auth'), { validate })

async function start() {
    try {
        await server.listen(config.server.port);
    } catch (err) {
        console.log(err);
        server.log.error(err);
        process.exit(1);
    }
    console.log(`Server started -- listening on post ${ config.server.port }`);
    server.log.info(`Server started -- listening on post ${ config.server.port }`);
};

start();