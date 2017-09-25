let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerStateSchema = new Schema({
    // playerId
    player: {type: Schema.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // State
    state: {
        _id: false,
        applyingPacketRainReward: {type: Boolean, default: false}
    },
    // Last modified
    lastModified: {type: Date, default: new Date()}
});

module.exports = playerStateSchema;