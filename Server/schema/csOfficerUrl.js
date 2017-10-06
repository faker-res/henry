var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var csOfficerUrlSchema = new Schema({
    domain: {type: String},
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    admin: {type: Schema.ObjectId, ref: 'adminInfo'},
    way: {type: String},
    createTime: {type: Date, default: Date.now}
});

module.exports = csOfficerUrlSchema;