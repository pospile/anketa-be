import polka from 'polka';
import {Guid} from "guid-typescript";
import bodyParser from 'body-parser';
import session from 'express-session';

import Config from './config/config';
import {db} from './config/db';
import {Token} from './models/models';
import {getAllUsers, getUserById, loginUser, registerUser} from "./controllers/user/UserController";
import {getAllPollOptions, getAllPolls, newPoll, voteOnPoll} from "./controllers/poll/PollController";

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
// </editor-fold>

async function healthCheck(req, res) {
    let healthCheckData = {"status": "ok", "serverTime": new Date().toLocaleString()};
    res.end(JSON.stringify(healthCheckData));
}


polka({
    onError: (err, req, res, next) => {
        console.log(err);
        res.end(JSON.stringify({"status": "error"}));
    }
})
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
    .get('/user', getAllUsers)
    .get('/user/:id', getUserById)
    .get('/poll', getAllPolls)
    .get('/poll/options/:id', getAllPollOptions)
    .post('/poll/options/:id', voteOnPoll)
    .post('/poll', newPoll)
    .post('/login', loginUser)
    .post('/register', registerUser)
    .listen(Config.APP_PORT, err => {
        if (err) throw err;
        console.log(`> Running on localhost:${Config.APP_PORT}`);
    });
