let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let wcGroupControlPlayerWechatSchema = new Schema({
    // wcGroupControl deviceId
    deviceId: {type: String, required: true, index: true},

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},

    // Bind Player's wechat Id
    playerWechatId: {type: String, index: true},

    // Bind Player's wechat nickname
    playerWechatNickname: {type: String},

    // Bind Player's wechat remark
    playerWechatRemark: {type: String, index: true},

    // Create time
    createTime: {type: Date, default: new Date(), index: true},

    // Last Update time
    lastUpdateTime: {type: Date, index: true}
});

module.exports = wcGroupControlPlayerWechatSchema;
