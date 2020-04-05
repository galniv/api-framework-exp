import * as Hapi from '@hapi/hapi';
import * as Boom from '@hapi/boom';
import * as bcrypt from 'bcrypt';
const config = require('config');
const sql = require('./db');

const server: Hapi.server = new Hapi.server({ host: config.server.host, port: config.server.port });

const authenticate = async (request: Hapi.Request, email: string, password: string) => {
    const selectResults = await sql`
        SELECT id, password
        FROM users
        WHERE email = ${ email }
    `;

    if (selectResults.count == 0) {
        return { credentials: null, isValid: false };
    }

    const user = selectResults[0];

    const isValid:boolean = await bcrypt.compare(password, user.password);

    return {
        isValid,
        credentials: {
            id: user.id,
            user: true
        }
    };
};

async function start() {
    try {
        await server.register(require('@hapi/basic'));

        server.auth.strategy('basic', 'basic', { validate: authenticate });

        await server.register(require('./api/user'), {
            routes: {
                prefix: '/user'
            }
        });

        await server.start();
        console.log(`Server started. ${ server.info.uri }`);
    } catch (err) {
        console.log(err);
    }
}

start();