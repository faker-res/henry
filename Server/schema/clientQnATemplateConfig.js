var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// for security question
var clientQnATemplateConfigSchema = new Schema({
    //platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    //QnA template object Id
    template: {type: Schema.ObjectId, ref: 'CSQnATemplate', required: true},
    // default value to update (only for reset password)
    defaultPassword: {type: String},
    // security question minimum correct count
    minQuestionPass: {type: Number},
    // security question wrong count config
    wrongCount: {type: Number},
});
//record is unique by platform and template
clientQnATemplateConfigSchema.index({platform: 1, template: 1});


module.exports = clientQnATemplateConfigSchema;