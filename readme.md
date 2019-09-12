# Anketa

anketa-be is backend application written for Node.js using Typescript.\
Its main purpose is to provide backend for poll voting application.

API documentation available [here](https://documenter.getpostman.com/view/544369/SVmsW1M9?version=latest)\
TODO list available on [trello](https://trello.com/b/8ZrlTGn4/anketa-be)

## This api allows you to:

* check the application health
* create users and login into their accounts (login is neccessary for AUTH required endpoints)
* list users (either by ID or list them all)
* create new polls with specific poll options
* get all polls and poll options
* vote for specific poll option


## Getting started guide:

### for developers:

- clone this repository
- build typescript with provided tsconfig.json
- create .env file with these keys
    - APP_PORT -> port which should be used with webserver
    - SALT_ROUNDS -> number of SALT rounds in bcrypt password hashing
    - SESSION_SECRET -> secret with which the session is saved on the server
- run application with node build/bin.js

## Few more details

This api uses **SQLite** -> thought is not really good idea to use it on big projects.\
This api is really simple -> thus using [Polka](https://github.com/lukeed/polka) -> A micro web server so fast, it'll make you dance! 👯 (as mentioned on their Github)\



