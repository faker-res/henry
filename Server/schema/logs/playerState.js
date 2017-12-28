let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerStateSchema = new Schema({
    // playerId
    player: {type: Schema.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // Last apply packet rain reward date
    lastApplyPacketRainReward: {type: Date, default: new Date()},
    // Last apply top up return date
    lastApplyTopUpReturnReward: {type: Date, default: new Date()},
    // last apply levelup reward
    lastApplyLevelUpReward: {type: Date, default: new Date()},
    // last apply reward group
    lastApplyRewardGroup: {type: Date, default: new Date()},
});

module.exports = playerStateSchema;