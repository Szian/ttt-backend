'use strict';

const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;
const uuid = require('uuid');
const ObjectID = require('mongodb').ObjectID;

class AccountDO {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.token = '';
    }
}

class AccountMapper {
    constructor(mongoDb) {
        this.db = mongoDb;
        this.COLLECTION = 'account';
    }

    async insertAccount(accountDO) {
        const result = await this.db.collection(this.COLLECTION).insertOne(accountDO);
        return result;
    }

    async getAccount(username) {
        let result = await this.db.collection(this.COLLECTION).findOne({'username': username});
        return result;
    }

    async updateToken(username, token) {
        let toUpdate = {
            token: token
        };
        const result = await mongoDb.collection(this.COLLECTION).updateOne({'username': username}, {$set: toUpdate});
        return result;
    }
}

app.post('/account/signup', async (req, res, next) => {
    let username = req.query.username;
    let password = req.query.password;

    let resBody = {
        success: false,
        message: ""
    };

    if (!username || !password) {
        res.writeHead(400);
        res.end();
        return
    }

    let accountDO = new AccountDO(username, password);
    const existed = await accountMapper.getAccount(username);
    if (existed) {
        resBody.message = "username already exists";
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    }

    const writeRes = await accountMapper.insertAccount(accountDO);
    if (writeRes.acknowledged) {
        resBody.inserted = true;
    }
    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(resBody));
    res.end();
    return;
});

app.post('/account/login', async (req, res, next) => {
    let username = req.query.username;
    let password = req.query.password;

    let resBody = {
        success: false,
        message: "",
        token: ""
    };
    
    if (!username || !password) {
        res.writeHead(400);
        res.end();
        return
    }

    const account = await accountMapper.getAccount(username);
    if (!account) {
        res.writeHead(200, {'Content-Type': 'json'});
        resBody.message = "username does not exist";
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    } else if (account.password != password) {
        res.writeHead(200, {'Content-Type': 'json'});
        resBody.message = "wrong password";
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    }

    const token = uuid.v4();
    const writeRes = await accountMapper.updateToken(username, token);
    if (writeRes.modifiedCount != 1) {
        res.writeHead(502);
        res.end();
        return;
    }
    
    resBody.success = true;
    resBody.token = token;
    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(resBody));
    res.end();
    return;
});

app.post('/account/logout', async (req, res, next) => {
    let username = req.query.username;

    let resBody = {
        success: false,
        message: "",
    };
    
    if (!username) {
        res.writeHead(400);
        res.end();
        return
    }

    const account = await accountMapper.getAccount(username);
    if (!account) {
        res.writeHead(200, {'Content-Type': 'json'});
        resBody.message = "username does not exist";
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    }

    const writeRes = await accountMapper.updateToken(username, "");
    if (writeRes.modifiedCount != 1) {
        res.writeHead(502);
        res.end();
        return;
    }
    
    resBody.success = true;
    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(resBody));
    res.end();
    return;
});

app.get('*', (req, res, next) => {
    res.writeHead(404);
    res.end();
    
});


let mongoDb;
let accountMapper;

const MONGO_FILE_PATH = './config/mongo.json';
let mongoFileInfo;
// read database connection details from file
try {
    mongoFileInfo  = JSON.parse(fs.readFileSync(MONGO_FILE_PATH));
} catch (error) {
    process.exit(2);
}

let mongoInfo = {
    host: mongoFileInfo.host || 'localhost',
    port: mongoFileInfo.port || '27017',
    db: mongoFileInfo.db || 'proj',
    opts: mongoFileInfo.opts || {useUnifiedTopology: true}
};

const uri = `mongodb://${mongoInfo.host}:${mongoInfo.port}?useUnifiedTopology=${mongoInfo.opts.useUnifiedTopology}`;
const { MongoClient } = require('mongodb');
const { result } = require('lodash');

const mongoDatabase = (async () => {

  const mongoConnect = await MongoClient.connect(uri);
  mongoDb = mongoConnect.db(mongoInfo.db);
  accountMapper = new AccountMapper(mongoDb);

  app.listen(PORT);
  console.log(`Server started, port ${PORT}`);
})();