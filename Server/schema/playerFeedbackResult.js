let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerFeedbackResultSchema = new Schema({
    key: {type: String, required: true, unique: true},
    value: {type: String, required: true, unique: true}
});

module.exports = playerFeedbackResultSchema;