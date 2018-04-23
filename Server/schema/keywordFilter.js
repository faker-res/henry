var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var keywordFilterSchema = new Schema({
    // platform used
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // type of mail filter use (refer to constKeywordFilterType_)
    type: {type: String, index: true},
    // sms channel (if type is sms)
    smsChannel: {type: String, index: true},
    // keyword that need to be filter
    keywords: {type: Array},
});

module.exports = keywordFilterSchema;