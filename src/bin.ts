import polka from 'polka';
import {Guid} from "guid-typescript";
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import session from 'express-session';

import Config from './config/config';
import {db} from './config/db';
import {Poll, PollOption, Token, User, UserVote} from './models/models';
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

async function healthCheck(req, res) {
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

async function getAllUsers(req, res) {

    if (req.auth) {
        console.log("givin ja jusers");
        let allUsers = await db<User>("user")
            .select(["user.id", "user.user"]);
        res.end(JSON.stringify({"status": "ok", "users": allUsers}));
    }
    else {
        console.log("fok ju");
        returnError(req, res, "Authentication needed");
    }
}

async function getUserById(req, res) {

    if (req.auth && req.params.id) {
        console.log("givin ja jusers");
        let userById = await db<User>("user")
            .select(["user.id", "user.user"])
            .where("id", req.params.id)
            .first();
        res.end(JSON.stringify({"status": "ok", "user": userById}));
    }
    else {
        console.log("fok ju");
        returnError(req, res, "Authentication needed");
    }
}

async function newPoll(req, res) {

    console.log(req.body);

    if (req.auth) {

        if (!req.body.pollName) {
            returnError(req, res, "You need to specify pollName");
            return;
        }

        let poll : Poll = {
            name: req.body.pollName,
        };

        let pollOptions = req.body.pollOptions.split(",");

        console.log(pollOptions);

        let [pollId] = await db<Poll>("poll")
                        .insert(poll);

        await pollOptions.forEach(async (each : string) => {
            let pollOption : PollOption = {
                name: each,
                poll: pollId
            };
            await db<PollOption>("pollOption")
                .insert(pollOption);
        });
        res.end(JSON.stringify({"status": "ok", "createdPollId": pollId}));
    }
    else {
        returnError(req, res, "Authentication needed")
    }
}

async function getAllPolls(req, res) {
    if (req.auth) {

        let polls = await db<Poll>("poll")
            .select("*");

        res.end(JSON.stringify({"status": "ok", "polls": polls}));
    }
    else {
        returnError(req, res, "Authentication needed");
    }
}

async function getAllPollOptions(req, res) {
    if (req.auth) {

        /*
        LEFT JOIN userVote ON userVote.pollOption = pollOption.id
        GROUP BY pollOption.name
         */
        let pollOptions = await db("pollOption")
            .select(["pollOption.*", db.raw("count(userVote.id) as votes")])
            .leftJoin("userVote", "userVote.pollOption", "=", "pollOption.id")
            .groupBy("pollOption.name")
            .where("poll", req.params.id);

        res.end(JSON.stringify({"status": "ok", "pollOptions": pollOptions}));
    }
    else {
        returnError(req, res, "Authentication needed");
    }
}

async function voteOnPoll(req, res) {

    if (req.auth) {

        let pollOption = await db<PollOption>("pollOption")
            .select("*")
            .where("id", req.params.id)
            .first();

        console.log(pollOption);


        if (await canVote(pollOption.poll, req.session.user)) {
            let userVote : UserVote = {
                pollOption: pollOption.id,
                user: req.session.user
            };

            console.log(userVote);

            let [vote] = await db<UserVote>("userVote")
                .insert(userVote);
            res.end(JSON.stringify({"status": "ok", "vote": vote}));
        }
        else {
            returnError(req, res, "Already voted in this poll");
        }


    }
    else {
        console.log("fok ju");
        returnError(req, res, "Authentication needed");
    }
}

function canVote(pollId: number, userId: number) {

    /*
        select * from poll
        INNER JOIN pollOption on pollOption.poll = poll.id
        INNER JOIN userVote on userVote.pollOption = pollOption.id
        where poll.id = 4 AND userVote.user = 13
    */
    return db("poll")
        .select("*")
        .innerJoin("pollOption", "pollOption.poll", "=", "poll.id")
        .innerJoin("userVote", "userVote.pollOption", "=", "pollOption.id")
        .where("poll", pollId)
        .where("user", userId)
        .first()
        .then((canVote) => {
            console.log(!canVote);
            return !canVote;
        });
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
