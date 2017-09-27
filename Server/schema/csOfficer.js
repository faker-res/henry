var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var csOfficerSchema = new Schema({
    name: {type: String, unique: true, required: true},
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    url: [{
        _id: {type: Schema.ObjectId, default: function () {return new ObjectId()}},
        domain:{type: String},
        way:{type: String},
        createTime:{type: Date, default: Date.now}
    }]
});

module.exports = csOfficerSchema;