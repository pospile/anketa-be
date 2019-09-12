import polka from 'polka';
import Config from './config/config';
import {Guid} from "guid-typescript";
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import session from 'express-session';

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

    if (!req.session.uuid) req.session.uuid = Guid.create();

    let date = new Date().toLocaleString();
    console.log(`${date}: Incoming request:${req.session.uuid.value} for route: -> ${req.url} <- with method: ->${req.method} <-`);
    next();
}

function returnError(req, res, error) {
    console.log(`Endpoint ended with error`);
    console.log(error);
    res.end(JSON.stringify({"status": "error"}));
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

    let user = await db<User>("user")
        .select("*")
        .where("user", req.body.user)
        .first();


    if (bcrypt.compareSync(req.body.password, user.password)) {
        res.end(JSON.stringify({"status": "ok"}));
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
    .use(logIncomingRequest)
    .get('/', healthCheck)
    .post('/login', loginUser)
    .post('/register', registerUser)
    .listen(Config.APP_PORT, err => {
        if (err) throw err;
        console.log(`> Running on localhost:${Config.APP_PORT}`);
    });
