/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var syncDataRequestIdSchema = new Schema({
    requestId: {type: String, required: true, index: true, unique: true},
    createTime: {type: Date, default: Date.now},
});

module.exports = syncDataRequestIdSchema;