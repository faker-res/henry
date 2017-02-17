/**
 * Created by hninpwinttin on 15/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var constProposalStepStatus = require("./../const/constProposalStepStatus");

var proposalProcessSchema = new Schema({
    //proposal process type
    type: {type:Schema.Types.ObjectId, ref:'proposalTypeProcess'},
    //the current process step
    currentStep : {type:Schema.Types.ObjectId, ref:'proposalProcessStep'},
    //steps
    steps : [{type:Schema.Types.ObjectId, ref:'proposalProcessStep'}],
    // Status of this step pending, reject, approve
    status : {type: String, default: constProposalStepStatus.PENDING},
    //creation date
    createTime: {type: Date, default: Date.now}
});

module.exports = proposalProcessSchema;