mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerCredibilityUpdateLogSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    //playerId
    player: {type: Schema.ObjectId, ref: 'playerInfo', required: true, index: true},
    // admin
    admin: String,
    // payment time
    credibilityRemarkNames: [String],
    // admin's comment on this update
    comment: String,
    // create time
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = playerCredibilityUpdateLogSchema;