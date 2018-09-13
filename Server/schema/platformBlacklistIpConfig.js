let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let platformBlacklistIpConfigSchema = new Schema({
    // platform id
    platform: {type: Schema.ObjectId, required: true, index: true},
    // blacklist ip
    ip: {type: String, required: true, index: true},
    // remark
    remark: {type: String},
    // admin name, that create this blacklist ip config
    adminName: {type: String},
    // is blacklist ip effective
    isEffective: {type: Boolean, default: false},
});

module.exports = platformBlacklistIpConfigSchema;