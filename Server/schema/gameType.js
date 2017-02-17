var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var gameTypeSchema = new Schema({
    gameTypeId: {type: String, required: true, unique: true, index: true},
    code: {type: String, required: true, unique: true, index: true},
    name: {type: String, required: true, unique: true, index: true},
    description: {type: String}
});

module.exports = gameTypeSchema;