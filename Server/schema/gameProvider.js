/**
 * Created by hninpwinttin on 21/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constGameStatus = require("./../const/constGameStatus");
var constProviderStatus = require("./../const/constProviderStatus");
var constPlatformStatus = require("./../const/constPlatformStatus");
var counterManager = require("../modules/counterManager.js");

var gameProviderSchema = new Schema({
    //simplified providerId
    providerId: {type: String, unique: true, index: true},

    name: {type: String, unique: true, required: true, dropDups: true, index: true},
    nickName: {type: String},
    prefix: {type: String, default: ''},
    code: {type: String, required: true, unique: true, index: true},
    status: {type: Number, default: constGameStatus.ENABLE},
    //canChangePassword - 1.Yes, 2.No
    canChangePassword: {type: Number},
    //run time status
    runTimeStatus: {type: Number, default: constProviderStatus.NORMAL},
    description: String,
    //daily settlement time, hour(0-23) Minutes(0-59)
    dailySettlementHour : {type: Number, min: 0, max: 23, required: false, default: 0},
    dailySettlementMinute : {type: Number, min: 0, max: 59, required: false, default: 0},
    //settlement status, daily settlement, weekly settlement or ready
    settlementStatus: {type: String, default: constPlatformStatus.READY},
    //last daily settlement time
    lastDailySettlementTime : {type: Date},
    //store based on platformObjId eg.: {platformObjId: {processedAmount: number, totalAmount: number}}
    batchCreditTransferOutStatus: {type: JSON, default: {}}
});

//add game id before save
//gameProviderSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('providerId'));

/*
gameProviderSchema.pre('save', function (next) {
    var provider = this;
    counterModel.findByIdAndUpdate(
        {_id: 'providerId'},
        {$inc: { seq: 1}},
        {upsert: true}
    ).then(
        function(counter){
            provider.providerId = counter ? counter.seq : 0;
            return next();
        },
        function(error){
            return next(error);
        }
    );
});
*/

module.exports = gameProviderSchema;
