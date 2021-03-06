var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// AdminActionLog
var playerStatusChangeLogSchema = new Schema ({
    //Player object Id
    _playerId: {type: Schema.ObjectId, required: true},
    //changed status
    status: String,
    //reason
    reason: String,
    // Time of creation
    createTime: {type: Date, default: Date.now},
    //admin user name
    adminName: {type: String}
});

module.exports = playerStatusChangeLogSchema;