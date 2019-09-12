import {db} from "../../config/db";
import {Token, User} from "../../models/models";
import bcrypt from "bcrypt";
import tokenGenerator from "../../token/token";

async function loginUser(req, res) {

    let user = await db<User>("user")
        .select("*")
        .where("user", req.body.user)
        .first();

    if (!user) {
        throw Error("Username or password incorrect");
    }

    if (bcrypt.compareSync(req.body.password, user.password)) {
        let token = tokenGenerator.generate();

        let tokenObj: Token = {
            token: token,
            user: user.id
        };

        let [tokenId] = await db<Token>("token").insert(tokenObj);
        req.session.token = token;
        req.session.user = user.id;

        res.end(JSON.stringify({"status": "ok", "token": token, "tokenId": tokenId}));
    } else {
        throw Error("Username or password incorrect");
    }

}

async function registerUser(req, res) {

    if (!req.body.user || !req.body.password) {
        throw Error("Please provide valid user data");
    } else {

        let user: User = {
            user: req.body.user,
            password: bcrypt.hashSync(req.body.password, 10)
        };

        if (await canCreateUser(user)) {
            let [userId] = await db<User>("user").insert(user);
            res.end(JSON.stringify({"status": "ok", "userId": userId}));
        } else {
            throw Error("User with this name already exists");
        }
    }
}

async function getAllUsers(req, res) {

    if (req.auth) {
        let allUsers = await db<User>("user")
            .select(["user.id", "user.user"]);
        res.end(JSON.stringify({"status": "ok", "users": allUsers}));
    } else {
        throw Error("Authentication needed");
    }
}

async function getUserById(req, res) {

    if (req.auth && req.params.id) {
        let userById = await db<User>("user")
            .select(["user.id", "user.user"])
            .where("id", req.params.id)
            .first();
        res.end(JSON.stringify({"status": "ok", "user": userById}));
    } else {
        throw Error("Authentication needed");
    }
}

function canCreateUser(user: User) {
    return db<User>("user")
        .select("*")
        .where("user", user.user)
        .first()
        .then((userExists: User) => {
            return !userExists;
        });
}

export {loginUser, registerUser, getAllUsers, getUserById}
