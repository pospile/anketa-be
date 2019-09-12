import {Poll, PollOption, UserVote} from "../../models/models";
import {db} from "../../config/db";

async function newPoll(req, res) {

    console.log(req.body);

    if (req.auth) {

        if (!req.body.pollName) {
            throw Error("You need to specify pollName");
        }

        let poll: Poll = {
            name: req.body.pollName,
        };

        let pollOptions = req.body.pollOptions.split(",");

        console.log(pollOptions);

        let [pollId] = await db<Poll>("poll")
            .insert(poll);

        await pollOptions.forEach(async (each: string) => {
            let pollOption: PollOption = {
                name: each,
                poll: pollId
            };
            await db<PollOption>("pollOption")
                .insert(pollOption);
        });
        res.end(JSON.stringify({"status": "ok", "createdPollId": pollId}));
    } else {
        throw Error("Authentication needed")
    }
}

async function getAllPolls(req, res) {
    if (req.auth) {

        let polls = await db<Poll>("poll")
            .select("*");

        res.end(JSON.stringify({"status": "ok", "polls": polls}));
    } else {
        throw Error("Authentication needed");
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
    } else {
        throw Error("Authentication needed");
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
            let userVote: UserVote = {
                pollOption: pollOption.id,
                user: req.session.user
            };

            console.log(userVote);

            let [vote] = await db<UserVote>("userVote")
                .insert(userVote);
            res.end(JSON.stringify({"status": "ok", "vote": vote}));
        } else {
            throw Error("Already voted in this poll");
        }


    } else {
        console.log("fok ju");
        throw Error("Authentication needed");
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

export {newPoll, getAllPolls, getAllPollOptions, voteOnPoll}
