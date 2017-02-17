/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * This schema is to ensure the uniqueness of domain name
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerOwnDomainSchema = new Schema({
    name: {type: String, required: true, index: true, unique: true},
});

module.exports = partnerOwnDomainSchema;