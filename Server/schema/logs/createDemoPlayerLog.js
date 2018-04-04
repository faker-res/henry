let mongoose = require('mongoose');
let Schema = mongoose.Schema;
var rsaCrypto = require("../../modules/rsaCrypto");
var dbUtil = require("../../modules/dbutility");


// demo player details
let createDemoPlayerLogSchema = new Schema({
    // platform of demo player
    platform: {type: Schema.ObjectId, required: true, index: true},
    // demo account name
    name: {type: String},
    // account creation registration interface
    device: {type: String},
    // whether the player is old player, pre-converted player or post-converted player
    status: {type: String, index: true},
    // phone number used to register this demo player
    phoneNumber: {type: String, index: true},
    // create time
    createTime: {type: Date, default: Date.now, index: true},
});

var playerPostFindUpdate = function (result) {
    if (result && result.phoneNumber) {
        if (result.phoneNumber.length > 20) {
            try {
                result.phoneNumber = rsaCrypto.decrypt(result.phoneNumber);
            }
            catch (err) {
                console.log(err);
            }
        }
    }

};

// // example to get player phone number
createDemoPlayerLogSchema.post('find', function (result) {
    if (result && result.length > 0) {
        for (var i = 0; i < result.length; i++) {
            playerPostFindUpdate(result[i]);
        }
        return result;
    }
});

createDemoPlayerLogSchema.post('findOne', function (result) {
    playerPostFindUpdate(result);
});

module.exports = createDemoPlayerLogSchema;