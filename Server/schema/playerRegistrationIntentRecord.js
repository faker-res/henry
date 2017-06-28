var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constRegistrationIntentRecordStatus = require("../const/constRegistrationIntentRecordStatus");

var playerRegistrationIntentRecordSchema = new Schema({

    //ip address
    ipAddress: String,
    //creation time
    createTime: {type: Date, default: Date.now},
    //Operation List
    operationList: [],
    //Status
    status: {type: String, default: constRegistrationIntentRecordStatus.INTENT},
    //name of player
    name: String,
    //mobile phone
    mobile: {type: String},
    //playerId
    playerId: String,
    //platformId
    platform: {type: Schema.ObjectId}

});

module.exports = playerRegistrationIntentRecordSchema;