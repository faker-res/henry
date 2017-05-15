const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const dbPlayerTopUpRecord = require("../db_modules/dbPlayerTopUpRecord");


const cursor = dbconfig.collection_playerTopUpRecord.find({amount : 0}).cursor();
var i = 0;
cursor.eachAsync(
    recordData => {
        dbconfig.collection_players.findOneAndUpdate(
            {_id: recordData.playerId, platform: recordData.platformId, topUpTimes: {$gt: 0}},
            {$inc: {topUpTimes: -1}},
            {new: true}
        ).then();
        console.log("index", i);
        i++;
    }
);

