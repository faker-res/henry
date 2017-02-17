/**
 * Created by hninpwinttin on 13/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var proposalTypeProcessSchema = new Schema({
    //platform id
    platformId: {type: Schema.Types.ObjectId, required: true},
    //proposal type process
    name : {type: String, required: true},
    //proposal type process steps
    steps:[{type: Schema.Types.ObjectId, ref: 'proposalTypeProcessStep' }],
});

proposalTypeProcessSchema.index({ platformId: 1, name: 1}, { unique: true });

module.exports = proposalTypeProcessSchema;