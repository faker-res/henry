'use strict';

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let platformTopUpAmountConfigSchema = new Schema({
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    commonTopUpAmountRange: {
        minAmount: {type: Number},
        maxAmount: {type: Number},
    },
    topUpCountAmountRange: [{
        topUpCount: {type: Number},
        minAmount: {type: Number},
        maxAmount: {type: Number}
    }]
});

module.exports = platformTopUpAmountConfigSchema;
