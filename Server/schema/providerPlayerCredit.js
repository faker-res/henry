/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * Todo:: only for testing, to be removed
 * Test schema to simulate provider credit transfer
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var providerPlayerCreditSchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true},
    //platform id
    platformId: {type: Schema.ObjectId, required: true},
    //provider id
    providerId: {type: Schema.ObjectId, required: true},
    /*Playe Credit*/
    //valid credit
    gameCredit: {type: Number, min: 0, default: 0},
    //locked credit
    lockedCredit: {type: Number, min: 0, default: 0}
});

module.exports = providerPlayerCreditSchema;