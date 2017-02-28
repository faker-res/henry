/**
 * Created by hninpwinttin on 13/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var proposalTypeSchema = new Schema({
    //platform id
    platformId: {type: Schema.Types.ObjectId, required: true},
    //proposal type name
    name : {type: String, required: true},
    //proposal process type
    process: {type:Schema.Types.ObjectId, ref:'proposalTypeProcess'},
    //execution type
    executionType: String,
    //rejection type
    rejectionType: String,
    //Expiration duration
    ExpirationDuration: {type: String, default: 0},
});

proposalTypeSchema.index({ platformId: 1, name: 1}, { unique: true });

module.exports = proposalTypeSchema;
