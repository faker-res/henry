var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var csPromoteWaySchema = new Schema({
    name: {type: String, required: true},
    platform: {type: Schema.ObjectId, ref: 'platform', index: true}
});

module.exports = csPromoteWaySchema;