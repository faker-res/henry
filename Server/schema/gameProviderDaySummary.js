/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var gameProviderDaySummarySchema = new Schema({
    //provider id
    providerId: {type: Schema.ObjectId, required: true},
    // game Id
    gameId: {type: Schema.ObjectId, required: true},
    // game type
    gameType: {type: String, required: true},
    //platform id
    platformId: {type: Schema.ObjectId, required: true},
    // payment time
    date: {type: Date, required: true},
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
gameProviderDaySummarySchema.index({ providerId: 1, gameId: 1, date: 1});

module.exports = gameProviderDaySummarySchema;