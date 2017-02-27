/******************************************************************
 *  Fantasy Player Management Tool
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// This collection records all rewards that were awarded to players / partners
var rewardLogSchema = new Schema ({
    // Platform Id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},

    // Player Id
    player: {type: Schema.ObjectId, ref: 'player', required: false},
    playerId: {type: String, required: false},

    // Partner Id   (We may log partner rewards in future)
    //partner: {type: Schema.ObjectId, ref: 'partner', required: false},
    //partnerId: {type: String, required: false},

    rewardType: {type: Schema.ObjectId, ref: 'rewardType'},
    rewardTypeName: {type: String, required: true},

    rewardEventId: {type: Schema.ObjectId, ref: 'rewardEvent', required: false},
    rewardEventName: {type: String, required: false},
    rewardEventCode: {type: String, required: false},

    // Amount
    amount: {type: Number, required: true},
    // etc.

    // Action
    //action: {type: String, required: false},

    // Data sent {rewardType:xxx, partnerId:xxxx }
    //data: {type: Object, required: true},

    // Level of the log: such as "info", "error"
    //level: {type: String, required: true},

    // Date of reward
    createTime: {type: Date, required: true},
});

module.exports = rewardLogSchema;
