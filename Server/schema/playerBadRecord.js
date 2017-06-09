var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerBadRecordSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    // Player level such as "Good", "Normal", "Bad"
    name: {type: String, required: true},
    //permissions
    permissions: [{type: String}]
});

module.exports = playerBadRecordSchema;