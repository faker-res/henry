let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// Partner permission change log
let partnerPermissionLogSchema = new Schema({
    //requested admin
    admin: {type: Schema.ObjectId, required: true},
    //platformId
    platform: {type: Schema.ObjectId, required: true},
    //player _id
    partner: {type: Schema.ObjectId, required: true},
    //remark
    remark: String,
    //orginal data
    oldData: JSON,
    // requested time
    createTime: {type: Date, default: Date.now},
    //updated data
    newData: JSON,
});

module.exports = partnerPermissionLogSchema;