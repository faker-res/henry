//
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var activeAccessLogSchema = new Schema({

    //player id
    playerId: {type: String, required: true},
    activityTime: {type: Date, default: Date.now},
    activityType: {type: String, required: true},
    activityDetail: {type: JSON},

});

module.exports = activeAccessLogSchema;