import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config();

export default {
    APP_PORT: process.env.APP_PORT,
    DB_PATH: path.resolve(`${__dirname}../../../db/anketa.db`),
    SALT_ROUNDS: process.env.SALT_ROUNDS,
    SESSION_SECRET: process.env.SESSION_SECRET
};
