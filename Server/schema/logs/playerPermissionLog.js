var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var playerPermissionLogSchema = new Schema({
    //requested admin
    admin: {type: Schema.ObjectId, required: true},
    //platformId
    platform: {type: Schema.ObjectId, required: true},
    //player _id
    player: {type: Schema.ObjectId, required: true},
    //remark
    remark: String,
    //orginal data
    oldData: JSON,
    // requested time
    createTime: {type: Date, default: Date.now},
    //updated data
    newData: JSON,
});

module.exports = playerPermissionLogSchema;