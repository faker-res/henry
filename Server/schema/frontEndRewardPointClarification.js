var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndRewardPointClarificationSchema = new Schema({

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // title
    title: {type: String},
    // type 1 = PC, 2 = APP, 3 = H5
    device: {type: Number, index: true},
    // the ftp url for uploaded image
    vipPrivilegeUrl: {type: String},
    // the ftp url for uploaded image
    rewardPointClarificationUrl: {type: String},
    // the ftp url for uploaded image
    voucherClarificationUrl: {type: String},
    // 1: available; 2: deleted
    status: {type: Number, default: 1, index: true}
});

module.exports = frontEndRewardPointClarificationSchema;