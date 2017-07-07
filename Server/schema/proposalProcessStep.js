var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constProposalStepStatus = require("./../const/constProposalStepStatus");

var proposalProcessStepSchema = new Schema({
    // Status of this step pending, reject, approve
    status : {type: String, default: constProposalStepStatus.PENDING, index: true},
    // Remark by the Admin
    memo: String,
    // Assigned admin who process this step
    operator:  {type:Schema.Types.ObjectId, ref:'adminInfo'},
    // Operation Time
    operationTime: {type: Date, default: Date.now},
    // Id of the Proposal Process
    type : {type:Schema.Types.ObjectId, ref:'proposalTypeProcessStep', required: true, index: true},
    //next step if approve
    nextStepWhenApprove : {type:Schema.Types.ObjectId, ref:'proposalProcessStep'},
    //next step if reject
    nextStepWhenReject : {type:Schema.Types.ObjectId, ref:'proposalProcessStep'},
    //assigned department
    department: {type:Schema.Types.ObjectId, ref:'department', index: true},
    //assigned role
    role:{type:Schema.Types.ObjectId, ref:'role', index: true},
    //creation date
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = proposalProcessStepSchema;

