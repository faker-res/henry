var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// for security question
var clientQnATemplateConfigSchema = new Schema({
    //platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    //clientQnA template type
    type: {type: String, required: true, index: true},
    // default value to update (only for reset password)
    defaultPassword: {type: String},
    // security question minimum correct count
    minQuestionPass: {type: Number},
    // security question wrong count config
    wrongCount: {type: Number},
});
//record is unique by platform and type
clientQnATemplateConfigSchema.index({platform: 1, type: 1});


module.exports = clientQnATemplateConfigSchema;