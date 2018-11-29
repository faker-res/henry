'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tsPhoneTradeSchema = new Schema({
    // encoded phone number (e.g. '139****5588)
    encodedPhoneNumber: {type: String, index: true},
    // platform obj id that the phone originated from
    sourcePlatform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // decompose time, the time that this tsPhoneTrade created, it is also createTime
    decomposeTime: {type: Date, default: new Date(), index: true},
    // the original tsPhone
    sourceTsPhone: {type: Schema.Types.ObjectId, ref: 'tsPhone'},
    // the phone list of original tsPhone
    sourceTsPhoneList: {type: Schema.Types.ObjectId, ref: 'tsPhoneList'},
    // name of sourceTsPhoneList
    sourceTsPhoneListName: {type: String},
    // the platform that the phone traded/exported to (only exist after it traded to new platform)
    targetPlatform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // the time that the trade/export happen (only exist after it traded to new platform)
    tradeTime: {type: Date, index: true},
    // the new tsPhone object that the trade created (only exist after the new platform decide to use this phone)
    targetTsPhone: {type: Schema.Types.ObjectId, ref: 'tsPhone', index: true},
    // the phone list that new tsPhone generated on
    targetTsPhoneList: {type: Schema.Types.ObjectId, ref: 'tsPhoneList'},
    // last successful feedback time, empty means it was not used before
    lastSuccessfulFeedbackTime: {type: Date},
    // last successful feedback topic, empty means it was not used before
    lastSuccessfulFeedbackTopic: {type: String},
    // last successful feedback content, empty means it was not used before
    lastSuccessfulFeedbackContent: {type: String},
});

module.exports = tsPhoneTradeSchema;

