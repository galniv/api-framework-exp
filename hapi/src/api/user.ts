import * as Hapi from '@hapi/hapi';
import * as Joi from '@hapi/joi';
import * as Boom from '@hapi/boom';
import * as bcrypt from 'bcrypt';
const config = require('config');

// Helpers.
async function rejectExistingEmail(request: Hapi.Request, h:Hapi.ResponseToolKit) {
    const userExists = await h.context.methods.sql`
        SELECT COUNT(email)
        FROM users
        WHERE email = ${ request.payload.email }
    `;

    if (userExists[0].count > 0) {
        throw Boom.conflict('A user with that email already exists');
    }

    return h.continue;
};

async function loadUserFromDb(request: Hapi.Request, h:Hapi.ResponseToolKit) {
    const selectResult = await h.context.methods.sql`
        SELECT id, name, email
        FROM users
        WHERE id = ${ request.auth.credentials.id }
    `;

    request.app.authenticatedUser = selectResult[0];

    return h.continue;
};

// Route handlers.
async function getUser(request: Hapi.Request, h:Hapi.ResponseToolKit) {
    return {
        id: request.app.authenticatedUser.id,
        name: request.app.authenticatedUser.name,
        email: request.app.authenticatedUser.email
    }
};

async function createUser(request: Hapi.Request, h:Hapi.ResponseToolKit) {
    const body = request.payload;
    const hashedPassword = await bcrypt.hash(body.password, config.crypto.hashRounds);
    
    const insertResult = await h.context.methods.sql`
        INSERT INTO users (name, email, password)
        VALUES (${ body.name }, ${ body.email }, ${ hashedPassword })
        returning "id"
    `;

    return {
        id: insertResult[0].id
    }
};

exports.plugin = {
    pkg: require('../../package.json'),
    register: async (server: Hapi.server, options) => {
        server.route({
            method: 'POST',
            path: '/',
            handler: createUser,
            options: {
                bind: server,
                pre: [{ method: rejectExistingEmail }],
                validate: {
                    failAction: (request, h, err) => {
                        throw err;
                    },
                    payload: Joi.object({
                        name: Joi.string().min(2).max(50).optional().default(''),
                        email: Joi.string().email().required(),
                        password: Joi.string().min(8).max(50).required()
                    })
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/',
            handler: getUser,
            options: {
                bind: server,
                auth: {
                    mode: 'required',
                    strategies: [ 'basic' ],
                    access: {
                        entity: 'user'
                    }
                },
                pre: [{ method: loadUserFromDb }]
            }
        });
    }
}