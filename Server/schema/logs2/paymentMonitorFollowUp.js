var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var paymentMonitorFollowUpSchema = new Schema({
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    website: {type: String, index: true},
    proposalId: {type: String, index: true},
    //proposal type
    type: {type: Schema.Types.ObjectId, ref: 'proposalType', index: true},
    // Device interface
    userAgent: {type: Number, index: true},
    topupType: {type: Number, index: true},
    merchantNo: {type: String, index: true},
    merchantNo$: {type: String},
    inputDevice: {type: Number},
    depositMethod: {type: Number, index: true},
    bankTypeId: {type: Number, index: true},
    merchantName: {type: String, index: true},
    merchantCurrentCount: {type: Number},
    merchantTotalCount: {type: Number},
    merchantGapTime: {type: Number},
    status: {type: String, index: true},
    playerObjId: {type: Schema.Types.ObjectId, ref: 'player', index: true},
    playerName: {type: String, index: true},
    playerCurrentCount: {type: Number},
    playerTotalCount: {type: Number},
    playerGapTime: {type: Number},
    amount: {type: Number, required: true, default: 0},
    proposalCreateTime: {type: Date, default: Date.now, index: true},
    createTime: {type: Date, default: Date.now, index: true},
    lockedAdminId: {type: Schema.Types.ObjectId, ref: 'admin', index: true},
    lockedAdminName: {type: String},
    followUpCompletedTime: {type: Date, default: Date.now},
    followUpContent: {type: String},
    line: {type: Number},
    bankCardNo: {type: String, index: true},
    accountNo: {type: String, index: true},
    alipayAccount: {type: String, index: true},
    wechatAccount: {type: String, index: true},
    weChatAccount: {type: String, index: true},
});

module.exports = paymentMonitorFollowUpSchema;
