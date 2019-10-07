let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let qqGroupControlPlayerQQSchema = new Schema({
    // qqGroupControl deviceId
    deviceId: {type: String, required: true, index: true},

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},

    // Bind Player's qq Id
    playerQQId: {type: String, index: true},

    // Bind Player's qq nickname
    playerQQNickname: {type: String},

    // Bind Player's qq remark
    playerQQRemark: {type: String, index: true},

    // Create time
    createTime: {type: Date, default: Date.now, index: true},

    // Last Update time
    lastUpdateTime: {type: Date, index: true}
});

module.exports = qqGroupControlPlayerQQSchema;
