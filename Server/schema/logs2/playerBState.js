let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerBStateSchema = new Schema({
    // playerId
    player: {type: Schema.Types.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // Apply reward event state
    applyRewardEvent: {type: Boolean, default: false},
    // Transfer to provider
    transferToProvider: {type: Boolean, default: false},
    // Player Level
    playerLevelMigration: {type: Boolean, default: false},
    // last update player level time
    lastApplyLevelUp: {type: Date, default: Date.now},
    // Player convert reward point
    convertRewardPointsToCredit: {type: Boolean, default: false},
    // Generate promo code
    generatePromoCode: {type: Boolean, default: false},
    // Front end apply XIMA
    applyXIMAFrontEnd: {type: Boolean, default: false},
    // Apply promo code
    ApplyPromoCode: {type: Boolean, default: false},
    // update password
    updatePassword: {type: Boolean, default: false},
    // Apply reward points
    applyRewardPoint: {type: Boolean, default: false},
    // deduct reward points
    deductRewardPoint: {type: Boolean, default: false},
});

module.exports = playerBStateSchema;
