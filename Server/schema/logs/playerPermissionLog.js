var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var playerPermissionLogSchema = new Schema({
    //requested admin (if it is not auto/system, then this field is required)
    admin: {type: Schema.ObjectId, required: function() { return !this.isSystem; }},
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
    //true if trigger by system / automatic
    isSystem: {type: Boolean, default: false},
});

module.exports = playerPermissionLogSchema;