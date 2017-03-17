/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var gameProviderPlayerDaySummarySchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true, index: true},
    //platform id
    platformId: {type: Schema.ObjectId, required: true, index: true},
    //provider id
    providerId: {type: Schema.ObjectId, required: true},
    // game Id
    gameId: {type: Schema.ObjectId, required: true},
    // game type
    gameType: {type: String, required: true},
    // time
    date: {type: Date, required: true, index: true},
    //total amount
    amount: {type: Number, default: 0},
    //total valid amount
    validAmount: {type: Number, default: 0},
    //total bonus amount
    bonusAmount: {type: Number, default: 0},
    //consumption times
    consumptionTimes: {type: Number, default: 0}
});

//record is unique by playerId platformId and date
gameProviderPlayerDaySummarySchema.index({ playerId: 1, platformId: 1, providerId: 1, gameId: 1, date: 1});

module.exports = gameProviderPlayerDaySummarySchema;
