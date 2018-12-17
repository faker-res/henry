var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var clientQnATemplateSchema = new Schema({
    // QnA process step number
    processNo: {type: String, required: true, index: true},
    //QnA process type
    type: {type: String, required: true, index: true},
    //QnA question (pick 1 to save : question/ securityQuestion)
    // question: {type: String},
    //QnA question title when multiple question
    questionTitle: {type:String},
    //QnA question - use questionNo to match answer input, des for question string
    question: [{questionNo: Number, des: String}],
    //QnA question (pick 1 to save : question/ securityQuestion)
    // securityQuestion: [{type: String}],
    // red question: ex- forgot username? processNo - navigate to specific process step
    alternativeQuestion: {
        des: {type: String},
        action: {type: String}
    },
    hint: {type:String},
    // question 's answer
    answerInput: [{
        type: {type: String},
        objKey: {type: String},
        questionNo: {type: Number},
        options: {type: String},
        placeHolder: {type: String}
    }],
    // to differentiate security question
    isSecurityQuestion: {type: Boolean, default: false, index: true},
    //action perform when execute (function name)
    action: {type: String},
});
//record is unique by processNo and type
clientQnATemplateSchema.index({processNo: 1, type: 1});


module.exports = clientQnATemplateSchema;
