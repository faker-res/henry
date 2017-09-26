let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerStateSchema = new Schema({
    // playerId
    player: {type: Schema.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // Last modified
    lastApplyPacketRainReward: {type: Date, default: new Date()}
});

module.exports = playerStateSchema;