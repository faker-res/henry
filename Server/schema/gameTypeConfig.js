let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let gameTypeConfigSchema = new Schema({
    // Platform object ID
    platform: {type: Schema.ObjectId, required: true, index: true},
    // Game type
    gameType: {type: Schema.ObjectId},
    // Game providers
    providers: [{type: Schema.ObjectId}],
});

module.exports = gameTypeConfigSchema;
