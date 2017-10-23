let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let gameProviderGroupSchema = new Schema({
    // Platform object ID
    platform: {type: Schema.ObjectId, required: true},
    // Game group name
    name: {type: String, index: true},
    // Game providers
    providers: [{type: Schema.ObjectId}],
});

module.exports = gameProviderGroupSchema;
