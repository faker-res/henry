let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerBStateSchema = new Schema({
    // playerId
    player: {type: Schema.Types.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // Apply reward event state
    applyRewardEvent: {type: Boolean, default: false},
    // Transfer to provider
    transferToProvider: {type: Boolean, default: false}
});

module.exports = playerBStateSchema;