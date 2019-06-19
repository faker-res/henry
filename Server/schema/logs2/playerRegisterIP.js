var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerRegisterIP = new Schema({
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true},

    // record ipAddress when the player register
    ipAddress: {type: String, required: true},
    // create Time
    createTime: {type: Date, default: Date.now},
});

module.exports = playerRegisterIP;
