var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var syncDataRequestIdSchema = new Schema({
    requestId: {type: String, required: true, index: true, unique: true},
    createTime: {type: Date, default: Date.now},
});

module.exports = syncDataRequestIdSchema;