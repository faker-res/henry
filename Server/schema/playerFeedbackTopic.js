let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerFeedbackTopicSchema = new Schema({
    key: {type: String, required: true},
    value: {type: String, required: true},
    platform: {type: Schema.ObjectId, ref: 'platform', index:true}
});

playerFeedbackTopicSchema.index({ platform: 1, key: 1}, {unique: true});
playerFeedbackTopicSchema.index({ platform: 1, value: 1}, {unique: true});

module.exports = playerFeedbackTopicSchema;
