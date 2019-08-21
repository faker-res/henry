var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndScriptDescriptionSchema = new Schema({

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // title
    title: {type: String},
    // instructions
    instructions: {type: String},
    // whether the setting is showing up
    isVisible: {type: Boolean, default: true},
    // 1: available; 2: deleted
    status: {type: Number, default: 1, index: true}
});

module.exports = frontEndScriptDescriptionSchema;