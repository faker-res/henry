var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var constRewardPriority = require('./../const/constRewardPriority');
var constRewardType = require('./../const/constRewardType');
var constProposalType = require('./../const/constProposalType');
const constGameStatus = require('./../const/constGameStatus');

let cpmsAPI = require("../externalAPI/cpmsAPI");
let SettlementBalancer = require('../settlementModule/settlementBalancer');

let dbUtil = require('../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

let dbRewardMainEvent = {
    /**
     *
     * @param query
     * @returns {Promise}
     */
    getRewardMainTypes: () => {
        return dbconfig.collection_rewardMainType.find().populate({
            path: "type",
            model: dbconfig.collection_rewardType
        }).exec();
    },
};

module.exports = dbRewardMainEvent;