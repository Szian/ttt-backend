'use strict';

const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;
const uuid = require('uuid');
const ObjectID = require('mongodb').ObjectID;
const FILE_DIR = './data';
const FILE_PATH = './data/player.json';
const HANDED = {
    'left': 'L',
    'right': 'R',
    'ambi': 'A',
}
const HANDED_REV = {
    'L': 'left',
    'R': 'right',
    'A': 'ambi',
    'left': 'left',
    'right': 'right',
    'ambi': 'ambi',
} 

const TRUES = new Array('1', 't', 'true', 'T', 'TRUE');

class PlayerMapper {
    constructor(mongoDb) {
        this.mongoDb = mongoDb;
        this.COLLECTION = 'player';
    }

    async setDefaultVals(result) {
        result.num_join = result.num_join || 0;
        result.num_won = result.num_won || 0;
        result.num_dq = result.num_dq || 0;
        result.total_points = result.total_points || 0;
        result.total_prize_usd = result.total_prize_usd || '0.00';
        if (!result.in_active_match) result.in_active_match = null;
        return result;
    }
    /**
     * get a list of all the players in database
     */
    async listAllPlayers() {
        try {
            let result = await mongoDb.collection(this.COLLECTION).find({}).toArray();
            if (result != null) {
                for (let i = 0; i < result.length; i ++) {
                    result[i] = await this.setDefaultVals(result[i]);
                }
            }
            return result;
        } catch (err) {
            process.exit(5);
        }
    }

    /**
     * 
     * @param {*} player player info to insert into db
     * @returns result.insertedId
     */
    async insertPlayer(playerDO) {
        try {
            const result = await mongoDb.collection(this.COLLECTION).insertOne(playerDO);
            return result;
        } catch (err) {
            console.log(err);
            process.exit(5);
        }
    }

    /**
     * 
     * @param {strig} pid pid to search in the database
     * @returns 
     */
    async getPlayer(pid) {
        try {
            let result = await mongoDb.collection(this.COLLECTION).findOne({'_id': ObjectID(pid)});
            if (result != null) {
                result = this.setDefaultVals(result);
            }
            return result;
        } catch (err) {
            return null;
        }
    } 

    /**
     * 
     * @param {strig} pid pid to search in the database
     * @returns 
     */
    async deletePlayer(pid) {
        try {
            const result = await mongoDb.collection(this.COLLECTION).deleteOne({ '_id': ObjectID(pid) });
            return result;
        } catch (err) {
            console.log(err);
            process.exit(5);
        }
    }

    async updatePlayer(pid, toUpdate) {
        try {
            const result = await mongoDb.collection(this.COLLECTION).updateOne({'_id': ObjectID(pid)}, {$set: toUpdate});
            return result;
        } catch (err) {
            console.log(err);
            process.exit(5);
        }
    }
}

class MatchMapper {
    constructor(mongoDb) {
        this.mongoDb = mongoDb;
        this.COLLECTION = 'match';
    }

    async setDefaultVals(result) {
        result.p1_points = result.p1_points || 0;
        result.p2_points = result.p2_points || 0;
        let player1DO = await playerMapper.getPlayer(result.p1_id);
        let player2DO = await playerMapper.getPlayer(result.p2_id);
        let player1VO = new PlayerVO(player1DO);
        let player2VO = new PlayerVO(player2DO);
        result.p1_name = result.p1_name || player1VO.name;
        result.p2_name = result.p2_name || player2VO.name;
        if (!result.ended_at) {
            result.winner_pid = null;
            result.ended_at = null;
            result.is_active = result.is_active || true;
        }
        result.is_dq = result.is_dq || false;
        return result;
    }

    async listAllMatches() {
        try {
            let result = await mongoDb.collection(this.COLLECTION).find({}).toArray();
            if (result != null) {
                for (let i = 0; i < result.length; i ++) {
                    result[i] = await this.setDefaultVals(result[i]);
                }
            }
            
            return result;
        } catch (err) {
            console.log(err);
            process.exit(5);
        }
    }

    async insertMatch(matchDO) {
        try {
            const result = await mongoDb.collection(this.COLLECTION).insertOne(matchDO);
            return result;
        } catch (err) {
            console.log(err);
            process.exit(5);
        }
    }

    async getMatch(mid) {
        try {
            let result = await mongoDb.collection(this.COLLECTION).findOne({'_id': ObjectID(mid)});
            if (result != null) {
                result = await this.setDefaultVals(result);
            }
            return result;
        } catch (err) {
            return null;
        }
    }

    async updateMatch(mid, toUpdate) {
        try {
            const result = await mongoDb.collection(this.COLLECTION).updateOne({'_id': ObjectID(mid)}, {$set: toUpdate});
            return result;
        } catch (err) {
            console.log(err);
            process.exit(5);
        }
    }
}

class PlayerDO {
    constructor(fname, lname, handed, is_active, balance_usd) {
        this.fname = fname;
        this.lname = lname;
        this.handed = handed;
        this.is_active = is_active;
        this.balance_usd = balance_usd;
        this.created_at = new Date();
        this.num_join = 0;
        this.num_won = 0;
        this.num_dq = 0;
        this.total_points = 0;
        this.total_prize_usd = 0;
        this.in_active_match = null;
    }
}

class PlayerVO {
    constructor(playerDO) {
        this.pid = playerDO._id.toString();
        // concat name
        this.name = playerDO.fname;
        if (playerDO.lname  != '') {
            this.name = this.name + ' ' + playerDO.lname;
        }
        this.handed = HANDED_REV[playerDO.handed];
        this.is_active = playerDO.is_active;
        this.balance_usd = playerDO.balance_usd;
        this.num_join = playerDO.num_join;
        this.num_won = playerDO.num_won;
        this.num_dq = playerDO.num_dq;
        this.total_points = playerDO.total_points;
        this.total_prize_usd = playerDO.total_prize_usd;
        this.efficiency = this.num_won / this.num_join;
        this.in_active_match = playerDO.in_active_match;
    }
}

class MatchDO {
    constructor(entry_fee_usd, p1_id, p1_name, p2_id, p2_name, prize_usd) {
        this.is_active = true;
        this.created_at = new Date();
        this.ended_at = null;
        this.entry_fee_usd = parseFloat(entry_fee_usd).toFixed(2);
        this.is_dq = false;
        this.p1_id = ObjectID(p1_id);
        this.p1_name = p1_name;
        this.p1_points = 0;
        this.p2_id = ObjectID(p2_id);
        this.p2_name = p2_name;
        this.p2_points = 0;
        this.prize_usd = parseFloat(prize_usd).toFixed(2);
        this.winner_pid = null;
    }
}

class MatchVO {
    constructor(matchDO) {
        this.mid = matchDO._id.toString();
        this.is_active = matchDO.is_active;
        this.entry_fee_usd = matchDO.entry_fee_usd;
        this.p1_id = matchDO.p1_id.toString();
        this.p1_name = matchDO.p1_name;
        this.p1_points = matchDO.p1_points;
        this.p2_id = matchDO.p2_id.toString();
        this.p2_name = matchDO.p2_name;
        this.p2_points = matchDO.p2_points;
        this.winner_pid = null;
        if (!this.is_active) this.winner_pid = matchDO.winner_pid;
        this.is_dq = matchDO.is_dq;
        this.prize_usd = matchDO.prize_usd;
        this.ended_at = matchDO.ended_at;
        this.age = (Date.parse(new Date()) - Date.parse(matchDO.created_at)) / 1000;
    }
}

function usdStrToNum(str) {
    // str = str.substr(1);
    return parseFloat(str);
}

var sequence = 1;
function genPlayerId() {
    return sequence ++;
}

function allAlpha(str) {
    return /^[A-Z]+$/i.test(str);
}

function validBalance(str) {
    return /^0*[0-9]+$/.test(str) || /^0*[0-9]+.[0-9]{0,2}$/.test(str);
}

function validInt(str) {
    return /^[0-9]+$/.test(str);
}

function validPid(str) {
    return str.length == 12;
}

function preRequest(req, res, next) {
    req.my_data = {
        request_id: uuid.v4(),
        start_at: new Date()
    };

    next();
}

function postRequest(req, res) {
    console.log(`Request complete --path: ${req.path}, status: ${res.statusCode}, 
    id: ${req.my_data.request_id}, duration: ${new Date() - req.my_data.start_at}ms`)
}

app.use(express.static('public'));
app.use(preRequest);


app.get('/ping', (req, res, next) => {
    res.writeHead(204);
    res.end();
});

app.get('/player', async (req, res, next) => {
    let players = await playerMapper.listAllPlayers();
    let playerVOs = [];
    for (let i = 0; i < players.length; i ++) {
        let playerVO = new PlayerVO(players[i]);
        playerVOs.push(playerVO);
    }
    playerVOs.sort((a, b) => {
        let nameA = a.name.toUpperCase();
        let nameB = b.name.toUpperCase();
        if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
        return 0;
    });
    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(playerVOs));
    res.end();
    return;
});

app.get('/player/:pid', async (req, res, next) => {
    let pid = req.params['pid'];

    let player = await playerMapper.getPlayer(pid);
    if (player == null) {
        res.writeHead(404);
        res.end();
    } else {
        let playerVO = new PlayerVO(player);
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(playerVO));
        res.end();
    }
});

app.delete('/player/:pid', async (req, res, next) => {
    let pid = req.params['pid'];
    let result = await playerMapper.deletePlayer(pid);
    if (result.deletedCount == 0) {
        res.writeHead(404);
        res.end();
    } else {
        playerMapper.deletePlayer(pid);
        res.redirect(303, '/player');
    }
})

app.post('/player/:pid', async (req, res, next) => {
    let pid = req.params['pid'];
    let toUpdate = {};
    if (req.query.hasOwnProperty('lname')) {
        let lname = req.query['lname'];
        if (lname != '' && !allAlpha(lname)) {
            res.writeHead(400);
            res.end();
            
            return;
        }
        toUpdate.lname = lname;
    }

    if (req.query.hasOwnProperty('active')) {
        let is_active = req.query['active'];
        if (TRUES.indexOf(is_active) != -1) {
            is_active = true;
        } else {
            is_active = false;
        }
        toUpdate.is_active = is_active;
    }
    
    let result = await playerMapper.updatePlayer(pid, toUpdate);
    if (result.matchedCount == 0) {
        // pid not found, 404
        res.writeHead(404);
        res.end();
    } else {
        res.redirect(303, `/player/${pid}`);
    }
})

app.post('/player', async (req, res, next) => {
    let invalids = [];

    // verify params
    // lname contains only letters, but can be empty
    let lname = req.query['lname'];
    if (lname != '' && !allAlpha(lname)) {
        invalids.push('lname');
    }
    // fname contains only letters, can not be empty
    let fname = req.query['fname'];
    if (fname == '' || !allAlpha(fname)) {
        invalids.push('fname');
    }
    // handed in enum ['left', 'right', 'ambi']
    let handed = req.query['handed'];
    if (!HANDED.hasOwnProperty(handed)) {
        invalids.push('handed');
    }
    handed = HANDED[handed];
    // initial_balance_usd, format given by specifications
    let balance_usd = req.query['initial_balance_usd'];
    if (!validBalance(balance_usd)) {
        invalids.push('initial_balance_usd');
    }
    // balance_usd = '$' + balance_usd;
    balance_usd = parseFloat(balance_usd).toFixed(2);
    // is_active set to true by default
    let is_active = true;

    if (invalids.length != 0) {
        // concat error msg
        let errMsg = 'invalid fields:';
        for (let i = 0; i < invalids.length; i ++) {
            errMsg += invalids[i];
            if (i != invalids.length - 1) {
                errMsg += ',';
            }
        }
        res.writeHead(422);
        res.write(errMsg);
        res.end();
        
        return;
    }

    // all params valid, start to write file
    let player = new PlayerDO(fname, lname, handed, is_active, balance_usd);
    let result = await playerMapper.insertPlayer(player);

    res.redirect(303, `/player/${result.insertedId}`);    
});

app.post('/deposit/player/:pid', async (req, res, next) => {
    let pid = req.params['pid'];
    // verify amount
    let amount = req.query['amount_usd'];
    if (!validBalance(amount)) {
        res.writeHead(400);
        res.end();
        
        return;
    }
    amount = parseFloat(amount);

    let player = await playerMapper.getPlayer(pid);
    if (player == null) {
        res.writeHead(404);
        res.end();
    } else {
        let oldBalance = usdStrToNum(player.balance_usd);
        let newBalance = oldBalance + amount;
        let toUpdate = {'balance_usd': newBalance.toString()};
        let result = await playerMapper.updatePlayer(pid, toUpdate);
        
        let json = {
            "old_balance_usd": oldBalance.toFixed(2),
            "new_balance_usd": newBalance.toFixed(2)
        };
        res.writeHead(200);
        res.write(JSON.stringify(json));
        res.end();
    }
});

app.post('/match', async (req, res, next) => {
    let p1_id = req.query.p1_id;
    let p2_id = req.query.p2_id;
    let entry_fee_usd = req.query.entry_fee_usd;
    let prize_usd = req.query.prize_usd;

    let player1DO = await playerMapper.getPlayer(p1_id);
    let player2DO = await playerMapper.getPlayer(p2_id);

    // player not found
    if (player1DO == null || player2DO == null) {
        res.writeHead(404);
        res.end();
        return;
    }

    // player in active match
    if (player1DO.in_active_match != null || player2DO.in_active_match != null) {
        res.writeHead(409);
        res.end();
        return;
    }

    if (!prize_usd || !validBalance(prize_usd)) {
        res.writeHead(400);
        res.end();
        return;
    }

    if (!entry_fee_usd || !validBalance(entry_fee_usd)) {
        res.writeHead(400);
        res.end();
        return;
    }

    let entry_fee_num = parseFloat(entry_fee_usd);
    let p1_bal = usdStrToNum(player1DO.balance_usd);
    let p2_bal = usdStrToNum(player2DO.balance_usd);
    // insufficient account balacne
    if (p1_bal < entry_fee_num || p2_bal < entry_fee_num) {
        res.writeHead(402);
        res.end();
        return;
    }

    let player1VO = new PlayerVO(player1DO);
    let player2VO = new PlayerVO(player2DO);
    
    const matchDO = new MatchDO(entry_fee_usd, p1_id, player1VO.name, p2_id, player2VO.name, prize_usd);
    let result = await matchMapper.insertMatch(matchDO);
    
    // update players
    let p1_update = {'balance_usd': (p1_bal - entry_fee_num).toFixed(2), 'in_active_match': ObjectID(result.insertedId)};
    let p2_update = {'balance_usd': (p2_bal - entry_fee_num).toFixed(2), 'in_active_match': ObjectID(result.insertedId)};
    let p1_result = await playerMapper.updatePlayer(p1_id, p1_update);
    let p2_result = await playerMapper.updatePlayer(p2_id, p2_update);

    res.redirect(303, `/match/${result.insertedId}`);
    return;
});

app.get('/match/:mid', async (req, res, next) => {
    let mid = req.params['mid'];

    let matchDO = await matchMapper.getMatch(mid);
    if (matchDO == null) {
        res.writeHead(404);
        res.end();
    } else {
        let matchVO = new MatchVO(matchDO);
        res.writeHead(200, {'Content-Type': 'json'});
        res.write(JSON.stringify(matchVO));
        res.end();
    }
});

app.get('/match', async (req, res, next) => {
    let matchDOs = await matchMapper.listAllMatches();
    let activeMatchVOs = [];

    // active ones
    for (let i = 0; i < matchDOs.length; i ++) {
        if (!matchDOs[i].is_active) continue;
        let matchVO = new MatchVO(matchDOs[i]);
        activeMatchVOs.push(matchVO);
    }
    activeMatchVOs.sort((a, b) => {
        let prizeA = parseFloat(a.prize_usd);
        let prizeB = parseFloat(b.prize_usd);
        if (prizeA < prizeB) {
            return 1;
        } else if (prizeA > prizeB) {
            return -1;
        }
        return 0;
    });

    // inactive ones
    let inactiveMatchVOs = [];

    for (let i = 0; i < matchDOs.length; i ++) {
        if (matchDOs[i].is_active) continue;
        let matchVO = new MatchVO(matchDOs[i]);
        inactiveMatchVOs.push(matchVO);
        if (inactiveMatchVOs.length == 4) break;
    }
    activeMatchVOs.sort((a, b) => {
        let dateA = Date.parse(a.ended_at);
        let dateB = parseFloat(b.ended_at);
        if (dateA < dateB) {
            return 1;
        } else if (dateA > dateB) {
            return -1;
        }
        return 0;
    });

    let matchVOs = [];
    for (let i = 0; i < activeMatchVOs.length; i ++) matchVOs.push(activeMatchVOs[i]);
    for (let i = 0; i < inactiveMatchVOs.length; i ++) matchVOs.push(inactiveMatchVOs[i]);

    res.writeHead(200, {'Content-Type': 'json'});
    res.write(JSON.stringify(matchVOs));
    res.end();
    return;
});

app.post('/match/:mid/award/:pid', async (req, res, next) => {
    let mid = req.params.mid;
    let pid = req.params.pid;
    let points = req.query.points;
    
    if (!validInt(points)) {
        res.writeHead(400);
        res.end();
        return;
    }

    points = parseInt(points);
    // points is not positive integer
    if (!points || points <= 0) {
        res.writeHead(400);
        res.end();
        return;
    }

    let matchDO = await matchMapper.getMatch(mid);
    let playerDO = await playerMapper.getPlayer(pid);
    if (!matchDO || !playerDO) {
        res.writeHead(404);
        res.end();
        return;
    }

    if (!matchDO.is_active) {
        res.writeHead(409);
        res.end();
        return;
    }

    if (playerDO._id.toString() != matchDO.p1_id.toString() && playerDO._id.toString() != matchDO.p2_id.toString()) {
        res.writeHead(400);
        res.end();
        return;
    }

    // update player
    let cur_points = playerDO.total_points ? playerDO.total_points : 0;
    let pUpdate = {'total_points': cur_points + points};
    let pResult = await playerMapper.updatePlayer(pid, pUpdate);

    // update match
    let mUpdate = {};
    if (pid == matchDO.p1_id.toString()) {
        mUpdate['p1_points'] = matchDO.p1_points + points;
    } else if (pid == matchDO.p2_id.toString()) {
        mUpdate['p2_points'] = matchDO.p2_points + points;
    } else {
        res.writeHead(400);
        res.end();
        return;
    }
    let mResult = await matchMapper.updateMatch(mid, mUpdate);

    matchDO = await matchMapper.getMatch(mid);
    let resBody = new MatchVO(matchDO);
    res.writeHead(200);
    res.write(JSON.stringify(resBody));
    res.end();
    return;
});

app.post('/match/:mid/end', async (req, res, next) => {
    let mid = req.params.mid;
    
    let matchDO = await matchMapper.getMatch(mid);
    if (!matchDO) {
        res.writeHead(404);
        res.end();
        return;
    }

    if (!matchDO.is_active) {
        res.writeHead(409);
        res.end();
        return;
    }

    if (matchDO.p1_points == matchDO.p2_points) {
        res.writeHead(409);
        res.end();
        return;
    }

    let winPid = matchDO.p1_points > matchDO.p2_points ? matchDO.p1_id.toString() : matchDO.p2_id.toString();
    let losePid = matchDO.p1_points > matchDO.p2_points ? matchDO.p2_id.toString() : matchDO.p1_id.toString();


    // update winner
    let winUpdate = {};
    let winDO = await playerMapper.getPlayer(winPid);
    winUpdate.num_join = winDO.num_join + 1;
    winUpdate.num_won = winDO.num_won + 1;
    winUpdate.total_prize_usd = winDO.total_prize_usd + matchDO.prize_usd;
    winUpdate.in_active_match = null;
    winUpdate.balance_usd = (usdStrToNum(winDO.balance_usd) + usdStrToNum(matchDO.prize_usd)).toFixed(2);
    let winResult = await playerMapper.updatePlayer(winPid, winUpdate);

    // update loser
    let loseUpdate = {};
    let loseDO = await playerMapper.getPlayer(losePid);
    loseUpdate.num_join = loseUpdate.num_join + 1;
    winUpdate.in_active_match = null;
    let loseResult = await playerMapper.updatePlayer(winPid, winUpdate);

    // update match
    let matchUpdate = {};
    matchUpdate.is_active = false;
    matchUpdate.ended_at = new Date();
    matchUpdate.winner_pid = ObjectID(winPid);
    let matchResult = await matchMapper.updateMatch(mid, matchUpdate);

    matchDO = await matchMapper.getMatch(mid);
    let matchVO = new MatchVO(matchDO);
    res.writeHead(200);
    res.write(JSON.stringify(matchVO));
    res.end();
    return;
});

app.post('/match/:mid/disqualify/:pid', async (req, res, next) => {
    let mid = req.params.mid;
    let pid = req.params.pid;
    
    let matchDO = await matchMapper.getMatch(mid);
    let playerDO = await playerMapper.getPlayer(pid);

    if (!matchDO || !playerDO) {
        res.writeHead(404);
        res.end();
        return;
    }
    if (!matchDO.is_active) {
        res.writeHead(409);
        res.end();
        return;
    }

    if (playerDO._id.toString() != matchDO.p1_id.toString() && playerDO._id.toString() != matchDO.p2_id.toString()) {
        res.writeHead(400);
        res.end();
        return;
    }

    let winPid = matchDO.p2_id.toString() == pid ? matchDO.p1_id.toString() : matchDO.p2_id.toString();
    let losePid = matchDO.p2_id.toString() == pid ? matchDO.p2_id.toString() : matchDO.p1_id.toString();

    // update winner
    let winUpdate = {};
    let winDO = await playerMapper.getPlayer(winPid);
    winUpdate.num_join = winDO.num_join + 1;
    winUpdate.num_won = winDO.num_won + 1;
    winUpdate.total_prize_usd = winDO.total_prize_usd + matchDO.prize_usd;
    winUpdate.in_active_match = null;
    winUpdate.balance_usd = (parseFloat(winDO.balance_usd) + parseFloat(matchDO.prize_usd)).toFixed(2);
    let winResult = await playerMapper.updatePlayer(winPid, winUpdate);

    // update loser
    let loseUpdate = {};
    let loseDO = await playerMapper.getPlayer(losePid);
    loseUpdate.num_join = loseUpdate.num_join + 1;
    loseUpdate.num_dq = loseUpdate.num_dq + 1;
    winUpdate.in_active_match = null;
    let loseResult = await playerMapper.updatePlayer(winPid, winUpdate);

    // update match
    let matchUpdate = {};
    matchUpdate.is_active = false;
    matchUpdate.ended_at = new Date();
    matchUpdate.winner_pid = ObjectID(winPid);
    matchUpdate.is_dq = true;
    let matchResult = await matchMapper.updateMatch(mid, matchUpdate);

    matchDO = await matchMapper.getMatch(mid);
    let matchVO = new MatchVO(matchDO);
    res.writeHead(200);
    res.write(JSON.stringify(matchVO));
    res.end();
    return;
});

app.get('*', (req, res, next) => {
    res.writeHead(404);
    res.end();
    
});


let mongoDb;
let playerMapper;
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
    db: mongoFileInfo.db || 'ee547_hw',
    opts: mongoFileInfo.opts || {useUnifiedTopology: true}
};

const uri = `mongodb://${mongoInfo.host}:${mongoInfo.port}?useUnifiedTopology=${mongoInfo.opts.useUnifiedTopology}`;
const { MongoClient } = require('mongodb');
const { result } = require('lodash');

const mongoDatabase = (async () => {

  const mongoConnect = await MongoClient.connect(uri);
  mongoDb = mongoConnect.db(mongoInfo.db);
  playerMapper = new PlayerMapper(mongoDb);
  matchMapper = new MatchMapper(mongoDb);

  app.listen(PORT);
  console.log(`Server started, port ${PORT}`);
})();