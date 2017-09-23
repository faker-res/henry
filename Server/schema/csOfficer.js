var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var csOfficerSchema = new Schema({
    name: {type: String, unique: true, required: true},
    url: {
        domain:{type: String},
        way:{type: String},
        createTime:{type: Date, default: Date.now}
    }
});

module.exports = CsOfficerSchema;