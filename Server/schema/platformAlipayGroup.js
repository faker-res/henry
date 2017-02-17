/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformAlipayGroupSchema = new Schema({
    //group id
    groupId: {type: String, required: true, unique: true, index: true},
    //group code
    code: {type: String, required: true, index: true},
    //group name
    name: {type: String, required: true},
    //group display name
    displayName: {type: String, required: true},
    //platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    //group alipays
    alipays: [{type: String}],
    //if it is default group
    bDefault: {type: Boolean, default: false}
});

//group is unique by platform and code
platformAlipayGroupSchema.index({platform: 1, code: 1}, {unique: true});

module.exports = platformAlipayGroupSchema;