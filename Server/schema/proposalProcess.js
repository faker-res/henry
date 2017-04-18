/**
 * Created by hninpwinttin on 15/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constProposalStepStatus = require("./../const/constProposalStepStatus");

var proposalProcessSchema = new Schema({
    //proposal process type
    type: {type:Schema.Types.ObjectId, ref:'proposalTypeProcess', index: true},
    //the current process step
    currentStep : {type:Schema.Types.ObjectId, ref:'proposalProcessStep', index: true},
    //steps
    steps : [{type:Schema.Types.ObjectId, ref:'proposalProcessStep'}],
    // Status of this step pending, reject, approve
    status : {type: String, default: constProposalStepStatus.PENDING, index: true},
    //creation date
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = proposalProcessSchema;