let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let partnerFeedbackTopicSchema = new Schema({
    key: {type: String, required: true, unique: true},
    value: {type: String, required: true, unique: true},
    platform: {type: Schema.ObjectId, ref: 'platform', index:true}
});
partnerFeedbackTopicSchema.index({ platform: 1, key: 1}, {unique: true});
partnerFeedbackTopicSchema.index({ platform: 1, value: 1}, {unique: true});
partnerFeedbackTopicSchema.index({ platform: 1, platform: 1}, {unique: true});

module.exports = partnerFeedbackTopicSchema;
