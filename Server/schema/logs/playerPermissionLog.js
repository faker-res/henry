var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var playerPermissionLogSchema = new Schema({
    //requested admin (if it is not auto/system, then this field is required)
    admin: {type: Schema.ObjectId, required: function() { return !this.isSystem; }},
    //platformId
    platform: {type: Schema.ObjectId, required: true, index: true},
    //player _id
    player: {type: Schema.ObjectId, required: true, index: true},
    //remark
    remark: String,
    //orginal data
    oldData: JSON,
    // requested time
    createTime: {type: Date, default: Date.now, index: true},
    //updated data
    newData: JSON,
    //true if trigger by system / automatic
    isSystem: {type: Boolean, default: false},
});

playerPermissionLogSchema.index({"newData.applyBonus": 1});

module.exports = playerPermissionLogSchema;
