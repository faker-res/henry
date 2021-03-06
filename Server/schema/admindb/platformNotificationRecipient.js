var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformNotificationRecipientSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // email address
    email: {type: String},
});

module.exports = platformNotificationRecipientSchema;
