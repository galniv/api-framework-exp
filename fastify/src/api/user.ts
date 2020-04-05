import * as fastify from 'fastify';
import * as bcrypt from 'bcrypt';
import { ServerResponse } from 'http';
import * as fastifyPlugin from 'fastify-plugin';
const config = require('config');

module.exports = fastifyPlugin(async (fastify:fastify.FastifyInstance, options:fastifyPlugin.PluginOptions) => {
    // Helpers.
    async function rejectExistingEmail(request:fastify.FastifyRequest, reply: fastify.FastifyReply<ServerResponse>) {
        const userExists = await fastify.sql`
            SELECT COUNT(email)
            FROM users
            WHERE email = ${ request.body.email }
        `;

        if (userExists[0].count > 0) {
            throw new Error('A user with that email already exists');
        }
    
        return;
    };

    async function loadUserFromDb(request:fastify.FastifyRequest, reply: fastify.FastifyReply<ServerResponse>) {
        const selectResult = await fastify.sql`
            SELECT id, name, email
            FROM users
            WHERE id = ${ request.authenticatedUserId }
        `;

        request.authenticatedUser = {
            id: String(selectResult[0].id),
            name: selectResult[0].name || '',
            email: selectResult[0].email
        };
    
        return;
    };
    
    // Route handlers.
    async function getUser(request:fastify.FastifyRequest, reply: fastify.FastifyReply<ServerResponse>) {
        return {
            id: request.authenticatedUser.id,
            name: request.authenticatedUser.name,
            email: request.authenticatedUser.email
        }
    };
    
    async function createUser (request:fastify.FastifyRequest, reply: fastify.FastifyReply<ServerResponse>) {
        const body = request.body;
        const hashedPassword = await bcrypt.hash(body.password, config.crypto.hashRounds);
        
        const insertResult = await fastify.sql`
            INSERT INTO users (name, email, password)
            VALUES (${ body.name }, ${ body.email }, ${ hashedPassword })
            returning "id"
        `;
    
        return {
            id: insertResult[0].id
        }
    };

    // Define routes.
    fastify.post('/user', {   
        schema: {
            body: {
                type: 'object',
                required : ['email', 'password'],
                properties: {
                    email: {
                        type: 'string',
                        format: 'email',
                        maxLength: 50,
                        minLength: 3
                    },
                    name: {
                        type: 'string',
                        maxLength: 50
                    },
                    password: {
                        type: 'string',
                        minLength: 8,
                        maxLength: 50
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string'
                        }
                    }
                }
            }
        },
        preHandler: [ rejectExistingEmail ],
        handler: createUser
    });

    fastify.get('/user', {
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string'
                        },
                        name: {
                            type: 'string'
                        },
                        email: {
                            type: 'string'
                        }
                    }
                }
            }
        },
        preParsing: fastify.basicAuth,
        preHandler: [ loadUserFromDb ],
        handler: getUser
    });
});
