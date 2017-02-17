/******************************************************************
 *  Fantasy Player Management Tool
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var constSystemParam = require('../const/constSystemParam');
var counterManager = require("../modules/counterManager.js");

var apiUserSchema = new Schema({

    apiUserId: {type: String, unique: true, index: {unique: true}},
    //playerApiUserName:{type:String},
    name: {type: String, unique: true, required: true, index: true},
    password: {type: String, required: true},
    key: {type:String}

});

apiUserSchema.pre('save', counterManager.incrementCounterAndSetPropertyIfNew('apiUserId'));

apiUserSchema.pre('save', function (next) {
    var apiUser = this;

    /*
    counterModel.findByIdAndUpdate(
        {_id: 'apiUserId'},
        {$inc: {seq: 1}},
        {upsert: true}
    ).then(
        function (counter) {
            apiUser.apiUserId = counter ? counter.seq : 0;
    */

            if (!apiUser.isModified('password')) {
                return next();
            }
            bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
                if (err) {
                    return next(err);
                }
                bcrypt.hash(apiUser.password, salt, function (err, hash) {
                    if (err) {
                        return next(err);
                    }
                    // override the cleartext password with the hashed one
                    apiUser.password = hash;
                    next();
                });
            });
    
    /*
        },
        function (error) {
            return next(error);
        }
    );
    */
});
module.exports = apiUserSchema;
