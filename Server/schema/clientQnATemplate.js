var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var clientQnATemplateSchema = new Schema({
    // QnA process step number
    processNo: {type: String, required: true, index: true},
    //QnA process type
    type: {type: String, required: true, index: true},
    //QnA question (pick 1 to save : question/ securityQuestion)
    question: {type: String},
    //QnA question (pick 1 to save : question/ securityQuestion)
    securityQuestion: [{type: String}],
    // red question: ex- forgot username?
    alternativeQuestion: {type: String},
    //action perform when execute (function name)
    action: {type: String},
});
//record is unique by processNo and type
clientQnATemplateSchema.index({processNo: 1, type: 1});


module.exports = clientQnATemplateSchema;