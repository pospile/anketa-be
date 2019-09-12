import Knex from 'knex';
import Config from './config';

export const config = {
    client: 'sqlite3',
    connection: {
        filename: Config.DB_PATH
    }
};

export const db = Knex(config);