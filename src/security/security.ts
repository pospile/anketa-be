import bcrypt from 'bcrypt';
import config from '../config/config';


async function hashPassword (password: string) : Promise<string> {
    console.log(password + config.SALT_ROUNDS);
    return await bcrypt.hash(password, config.SALT_ROUNDS);
}

async function checkPassword(hash: string) : Promise<boolean> {
    return false;
}

export {hashPassword, checkPassword}