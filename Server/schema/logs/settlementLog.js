/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var settlementLogSchema = new Schema({

    //settlementType: platform or provider
    type: {type: String},
    //interval: daily or weekly
    interval: {type: String},
    id: {type: Schema.ObjectId, required: true},
    result: {type: Boolean},
    data: JSON,
    createTime: {type: Date, default: Date.now},
    settlementTime: {type: Date, default: Date.now},
});

module.exports = settlementLogSchema;