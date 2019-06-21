var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerRegisterIP = new Schema({
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},

    // record ipAddress when the player register
    ipAddress: {type: String, required: true, index: true},
    // create Time
    createTime: {type: Date, default: Date.now, index: true},
});

module.exports = playerRegisterIP;
