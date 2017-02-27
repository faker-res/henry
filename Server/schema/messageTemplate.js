var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var messageTemplateSchema = new Schema({
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    // Its human-readable ID.  Usually what it is used for, e.g. 'TopUp'
    type: {type: String, required: true, index: true},
    // Not actually the format, but the transport medium (the type of delivery).
    format: {type: String, required: true, enum: ['email', 'sms', 'internal']},
    // The actual contents, with parameters encoded by {{...}}.  The format (HTML or plaintext) is auto-detected at runtime.
    content: {type: String, required: true},

    // Subject line of email
    // When format === 'email',    subject is required.
    // When format === 'internal', subject is optional.
    // When format === 'sms',      subject is unused.
    subject: {type: String, required: false}
});

module.exports = messageTemplateSchema;