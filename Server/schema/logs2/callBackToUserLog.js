let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let callBackToUserLogSchema = new Schema({
    // Platform
    platform: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // playerId
    player: {type: Schema.ObjectId, ref: 'player', required: true, index: true},
    // IP Address
    ipAddress: {type: String, index: true},
    // Create time
    createTime: {type: Date, default: Date.now, index: true},
});

module.exports = callBackToUserLogSchema;
