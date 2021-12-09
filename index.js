'use strict';

const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;
const uuid = require('uuid');
const ObjectID = require('mongodb').ObjectID;
const cors = require('cors');
const solve = require('./inf');

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

class MatchDO {
    constructor(username, level, player, winner, steps) {
        this.username = username;
        this.level = level;
        this.player = player;
        this.winner = winner;
        this.steps = steps;
        this.timestamp = new Date();
    }
}

class MatchVO {
    constructor(matchDO) {
        this.id = matchDO._id.toString();
        this.level = matchDO.level;
        this.player = matchDO.player;
        this.winner = matchDO.winner;
        this.steps = matchDO.steps;
        this.timestamp = matchDO.timestamp;
    }

}

class MatchMapper {
    constructor(mongoDb) {
        this.db = mongoDb;
        this.COLLECTION = 'match';
    }

    async insertMatch(matchDO) {
        const result = await this.db.collection(this.COLLECTION).insertOne(matchDO);
        return result;
    }

    async listMatches(username) {
        const result = await this.db.collection(this.COLLECTION).find({'username': username}).toArray();
        return result;
    }

    // async getAccount(username) {
    //     let result = await this.db.collection(this.COLLECTION).findOne({'username': username});
    //     return result;
    // }

    // async updateToken(username, token) {
    //     let toUpdate = {
    //         token: token
    //     };
    //     const result = await mongoDb.collection(this.COLLECTION).updateOne({'username': username}, {$set: toUpdate});
    //     return result;
    // }
}

app.use(cors());

app.use(express.json());

app.post('/account/signup', async (req, res, next) => {
    let username = req.body.username;
    let password = req.body.password;

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
        resBody.success = true;
    } else {
        res.writeHead(502);
        res.end();
        return;
    }
    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(resBody));
    res.end();
    return;
});

app.post('/account/login', async (req, res, next) => {
    let username = req.body.username;
    let password = req.body.password;

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
    let username = req.body.username;

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

app.post('/board/next', async (req, res, next) => {
    const level = req.body.level;
    const opponent = req.body.player; // opponent from AI's perspective
    let board = req.body.board;

    if (!level || !opponent || !board) {
        res.writeHead(400);
        res.end();
        return;
    }
    const player = opponent == 'x' ? 'o' : 'x';
    
    let solveRes = solve(board, player, opponent);
    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(solveRes));
    res.end();
    return;
});

app.post('/board/record', async (req, res, next) => {
    const username = req.body.username;
    const token = req.body.token;
    const level = req.body.level;
    const player = req.body.player;
    const winner = req.body.winner;
    const steps = req.body.steps;

    let resBody = {
        success: false,
        message: ""
    };

    if (!username || !token || !level || !player || !winner ||!steps) {
        res.writeHead(400);
        res.end();
        return;
    }
    
    const accountDO = await accountMapper.getAccount(username);
    if (!accountDO) {
        resBody.message = "username does not exist";
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    }
    if (accountDO.token != token) {
        resBody.message = "unmatched token and username";
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    }

    let matchDO = new MatchDO(username, level, player, winner, steps);

    const writeRes = await matchMapper.insertMatch(matchDO);
    if (writeRes.acknowledged) {
        resBody.success = true;
    } else {
        res.writeHead(502);
        res.end();
        return;
    }
    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(resBody));
    res.end();
    return;
});

app.get('/board/record', async (req, res, next) => {
    let token = req.query.token;
    let username = req.query.username;

    if (!token || !username) {
        res.writeHead(400);
        res.end();
        return;
    }

    let matches = [];

    let resBody = {
        success: false,
        message: "",
    }

    const accountDO = await accountMapper.getAccount(username);
    if (!accountDO) {
        resBody.message = "username does not exist";
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    }
    if (accountDO.token != token) {
        resBody.message = "unmatched token and username";
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(resBody));
        res.end();
        return;
    }
    
    let matchDOs = await matchMapper.listMatches(username);
    for (let i = 0; i < matchDOs.length; i ++) {
        const matchVO = new MatchVO(matchDOs[i]);
        matches.append(matchVO);
    }
    resBody.success = true;
    resBody.matches = matches;
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
let matchMapper;

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
  matchMapper = new MatchMapper(mongoDb);

  app.listen(PORT);
  console.log(`Server started, port ${PORT}`);
})();