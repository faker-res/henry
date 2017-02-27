/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var counterManager = require("../modules/counterManager.js");

var paymentChannelSchema = new Schema({
    //simplified channelId
    channelId: {type: String, unique: true, index: true},
    // payment channel name
    name: {type: String, unique: true, required: true},
    //icon url
    icon: String,
    //code
    code: String,
    //key
    key: String,
    //status
    status: String,
    //validForTransactionReward
    validForTransactionReward: {type: Boolean, default: false},
    //des
    des: String
});

//add channel before save
paymentChannelSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('channelId'));

/*
paymentChannelSchema.pre('save', function (next) {
    var channel = this;
    counterModel.findByIdAndUpdate(
        {_id: 'channelId'},
        {$inc: { seq: 1}},
        {upsert: true}
    ).then(
        function(counter){
            channel.channelId = counter ? counter.seq : 0;
            return next();
        },
        function(error){
            return next(error);
        }
    );
});
*/

module.exports = paymentChannelSchema;