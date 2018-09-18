let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let platformBlacklistIpConfigSchema = new Schema({
    // blacklist ip
    ip: {type: String, required: true, unique: true, index: true},
    // remark
    remark: {type: String},
    // admin name, that create this blacklist ip config
    adminName: {type: String},
    // is blacklist ip effective
    isEffective: {type: Boolean, default: false, index: true},
});

platformBlacklistIpConfigSchema.index({ip: 1, isEffective: 1}, {unique: true});

module.exports = platformBlacklistIpConfigSchema;