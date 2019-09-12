import polka from 'polka';
import {Guid} from "guid-typescript";
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import session from 'express-session';

import Config from './config/config';
import {db} from './config/db';
import {User, Token} from './models/models';
import tokenGenerator from './token/token';

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

    if (!req.session.uuid) req.session.uuid = Guid.create();

    let date = new Date().toLocaleString();
    console.log(`${date}: Incoming request:${req.session.uuid.value} for route: -> ${req.url} <- with method: -> ${req.method} <-`);
    next();
}

async function handleAuthentication(req, res, next) {
    if (req.session.token && req.session.user) {
        let token = await db<Token>("token")
            .select("*")
            .where("token", req.session.token)
            .where("user", req.session.user)
            .first();
        if (token) {
            req.auth = true;
        }
        next();
    }
    else {
        req.auth = false;
        next();
    }
}

function returnError(req, res, error) {
    console.log(`Endpoint ended with error`);
    console.log(error);
    res.end(JSON.stringify({"status": "error"}));
}

// </editor-fold>

function healthCheck(req, res) {
    let healthCheckData = {"status": "ok", "serverTime": new Date().toLocaleString()};
    res.end(JSON.stringify(healthCheckData));
}

async function loginUser(req, res) {

    let user = await db<User>("user")
        .select("*")
        .where("user", req.body.user)
        .first();

    if (!user) {
        returnError(req, res, "Username or password incorrect");
        return;
    }

    if (bcrypt.compareSync(req.body.password, user.password)) {
        let token = tokenGenerator.generate();

        let tokenObj : Token = {
            token: token,
            user: user.id
        };

        let [tokenId] = await db<Token>("token").insert(tokenObj);
        req.session.token = token;
        req.session.user = user.id;

        res.end(JSON.stringify({"status": "ok", "token": token, "tokenId": tokenId}));
    }
    else {
        returnError(req, res, "Username or password incorrect");
    }

}

async function registerUser(req, res) {

    if (!req.body.user || !req.body.password) {
        returnError(req, res, Error("Please provide valid user data"));
    }
    else {

        let user: User = {
            user: req.body.user,
            password: bcrypt.hashSync(req.body.password, 10)
        };

        if (await canCreateUser(user)) {
            let [userId] = await db<User>("user").insert(user);
            res.end(JSON.stringify({"status": "ok", "userId": userId}));
        } else {
            returnError(req, res, "User with this name already exists");
        }
    }
}

function canCreateUser(user: User) {
    return db<User>("user")
        .select("*")
        .where("user", user.user)
        .first()
        .then((userExists: User) => {
            console.log(!userExists);
            return !userExists;
        });
}


polka()
    .use(session({
        secret: Config.SESSION_SECRET,
        resave: false,
        saveUninitialized: true
    }))
    .use(bodyParser.urlencoded({extended: true}))
    .use(setApiHeaders)
    .use(handleAuthentication)
    .use(logIncomingRequest)
    .get('/', healthCheck)
    .post('/login', loginUser)
    .post('/register', registerUser)
    .listen(Config.APP_PORT, err => {
        if (err) throw err;
        console.log(`> Running on localhost:${Config.APP_PORT}`);
    });
