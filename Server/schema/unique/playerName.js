/*
 * This schema is to ensure the uniqueness of player name in player schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerNameSchema = new Schema({
    platform: {type: Schema.ObjectId, required: true},
    name: {type: String, required: true}
});

//record is unique by name and platform
playerNameSchema.index({ platform: 1, name: 1 }, {unique: true});

module.exports = playerNameSchema;