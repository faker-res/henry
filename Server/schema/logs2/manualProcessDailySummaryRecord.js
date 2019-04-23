var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var manualProcessDailySummaryRecordSchema = new Schema({
    // the number of proposal submited manually by cs
    manualSubmitCount: {type: Number, default: 0},
    // the proposalId that are manually submited by cs
    manualSubmitProposalId: [{type: String}],
    // the number of proposal approved manually by cs
    manualApprovalCount: {type: Number, default: 0},
    // the proposalId that are manually approved by cs
    manualApprovalProposalId: [{type: String}],
    // the number of proposal canceled manually by cs
    manualCancelCount: {type: Number, default: 0},
    // the proposalId that are manually canceled by cs
    manualCancelProposalId: [{type: String}],
    // admin ObjectId
    adminObjId:  {type:Schema.Types.ObjectId, ref:'adminInfo', index: true},
    //creation date
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = manualProcessDailySummaryRecordSchema;
