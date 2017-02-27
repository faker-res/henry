/******************************************************************
 *  Fantasy Player Management Tool
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var counterSchema = new Schema({
    _id: {type: String, required: true},
    seq: { type: Number, default: 0 }
});

module.exports = counterSchema;