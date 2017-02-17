/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var constTopUpIntentRecordStatus = require("../const/constTopUpIntentRecordStatus");

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerTopUpIntentRecordSchema = new Schema({
    //playerId
    playerId: String,
    //player name
    playerName: String,
    // platform ID
    platformId: {type: Schema.ObjectId},
    //create time
    createTime: {type: Date, default: Date.now},
    //ip address
    ip: {type: String},
    //mobile number
    mobile: String,
    //operation list - the players did
    operationList: [],
    //proposal - created
    proposalId: {type: Schema.Types.ObjectId, ref: 'proposal'},
    // status of this topup intention - Intented, TopUp processing, Success, Fail
    status: {type: String, default: constTopUpIntentRecordStatus.INTENT},
    //topup time
    topupTime: {type: Date},
    // topup channel
    topupChannel: String,
    //topup amount
    topUpAmount: Number,
    //finish time
    finishTime: {type: Date}
});

module.exports = playerTopUpIntentRecordSchema;