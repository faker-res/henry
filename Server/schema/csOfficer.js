var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var csOfficerSchema = new Schema({
    name: {type: String, unique: true, required: true},
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    url: [{
        domain: {type: String},
        way: {type: String},
        createTime: {type: Date}
    }]
});

module.exports = csOfficerSchema;