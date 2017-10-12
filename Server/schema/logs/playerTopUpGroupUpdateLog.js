mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerTopUpGroupUpdateLogSchema = new Schema({
    //admin
    admin: {type: Schema.ObjectId, ref: 'adminInfo', required: true},
    //playerId
    player: {type: Schema.ObjectId, ref: 'playerInfo', required: true, index: true},
    // payment time
    topUpGroupNames: {type: JSON, default: {}},
    // admin's comment on this update
    remark: String,
    // create time
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = playerTopUpGroupUpdateLogSchema;