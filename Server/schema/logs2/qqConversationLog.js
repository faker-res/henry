let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let qqConversationLogSchema = new Schema({
    // qqGroupControlSessionId
    qqGroupControlSessionId: {type: Schema.Types.ObjectId, ref: 'qqGroupControlSession', required: true, index: true},

    // qqGroupControl deviceId
    deviceId: {type: String, required: true, index: true},

    // qqGroupControl device nickname
    deviceNickName: {type: String, required: true, index: true},

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},

    // AdminName
    csOfficer: {type: Schema.ObjectId, ref: 'admin', index: true},

    // cs dealing with which player qq remark
    playerQQRemark: {type: String, index: true},

    // cs reply player datetime
    csReplyTime: {type: Date, index: true},

    // cs reply player content
    csReplyContent: {type: String, index: true},

    // Create time
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = qqConversationLogSchema;
