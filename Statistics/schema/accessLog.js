//
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var accessLogSchema = new Schema({

    //player id
    playerId: {type: String, required: true},
    // access time
    accessTime: {type: Date, default: Date.now},
    //platform info
    platform: {type: String, required: true},

});

module.exports = accessLogSchema;