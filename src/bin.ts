import polka from 'polka';
import Config from './config/config';
import { Guid } from "guid-typescript";
import bodyParser from 'body-parser';
import {checkPassword, hashPassword} from './security/security';

import {db} from './config/db';
import {User, Token} from './models/models';

// <editor-fold desc="headers and other middlewares">
function setApiHeaders(req, res, next) {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*'
    });
    next();
}

function logIncomingRequest(req, res, next) {
    req.requestUUID = Guid.create();
    let date = new Date().toLocaleString();
    console.log(`${date}: Incoming request:${req.requestUUID} for route: -> ${req.url} <- with method: ->${req.method} <-`);
    next();
}

function returnError(req, res, error) {
    console.log(`Endpoint ended with error`);
    console.log(error);
    res.end(JSON.stringify({"error": true}));
}
// </editor-fold>

async function authenticateUser(req, res, next) {
    /*
    let token = req.headers['authorization'];
    if (!token) return (res.statusCode=401,res.end('No token!'));
    req.user = await Users.find(token); // <== fake
    next(); // done, woot!
     */
}

function healthCheck(req, res) {
    let healthCheckData = {"status": "ok", "serverTime": new Date().toLocaleString()};
    res.end(JSON.stringify(healthCheckData));
}

async function loginUser(req, res) {
    console.log(req.body);

    let hashedPassword = await hashPassword(req.body.password);

    let data = await db<User>("user")
        .select("*")
        .where("user", req.body.user)
        .where("password", hashedPassword)
        .first();
    console.log(data);

    res.end(JSON.stringify({"status": "ok"}));
}

async function registerUser(req, res) {
    let hashedPassword = await hashPassword(req.body.password);
    res.end(JSON.stringify({"status": "ok"}));
}



polka()
    .use(bodyParser.urlencoded({ extended: true }))
    .use(setApiHeaders)
    .use(logIncomingRequest)
    .get('/', healthCheck)
    .post('/login', loginUser)
    .post('/register', loginUser)
    .listen(Config.APP_PORT, err => {
        if (err) throw err;
        console.log(`> Running on localhost:${Config.APP_PORT}`);
    });