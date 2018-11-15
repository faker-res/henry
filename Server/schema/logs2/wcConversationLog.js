let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let wcConversationLogSchema = new Schema({
    // wcGroupControlSessionId
    wcGroupControlSessionId: {type: Schema.Types.ObjectId, ref: 'wcGroupControlSession', required: true, index: true},

    // wcGroupControl deviceId
    deviceId: {type: String, required: true, index: true},

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},

    // csOfficer
    csOfficer: {type: Schema.ObjectId, ref: 'admin', index: true},

    // chatting wechat Id
    conversationWechatId: {type: String, index: true},

    // chatting wechat name
    conversationWechatName: {type: String},

    // chatting datetime
    conversationTime: {type: Date, index: true},

    // chatting content
    conversationContent: {type: String},

    // Create time
    createTime: {type: Date, default: new Date(), index: true}
});

module.exports = wcConversationLogSchema;
