/**
 * Created by hninpwinttin on 13/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var proposalTypeProcessStepSchema = new Schema({
    //next step if approve
    nextStepWhenApprove : {type:Schema.Types.ObjectId, ref:'proposalTypeProcessStep'},
    //next step if reject
    nextStepWhenReject : {type:Schema.Types.ObjectId, ref:'proposalTypeProcessStep'},
    //title
    title:String,
    //assigned department
    department: {type:Schema.Types.ObjectId, ref:'department'},
    //assigned role
    role:{type:Schema.Types.ObjectId, ref:'role'}
});

module.exports = proposalTypeProcessStepSchema;