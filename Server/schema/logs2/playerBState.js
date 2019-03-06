let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerBStateSchema = new Schema({
    // playerId
    player: {type: Schema.Types.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // Apply reward event state
    applyRewardEvent: {type: Boolean, default: false},
    // the time when apply Reward Event
    applyRewardEventUpdatedTime: {type: Date, default: Date.now},
    // Transfer to provider
    transferToProvider: {type: Boolean, default: false},
    // the time when transfer to provider
    transferToProviderUpdatedTime: {type: Date, default: Date.now},
    // Player Level
    playerLevelMigration: {type: Boolean, default: false},
    // last update player level time
    lastApplyLevelUp: {type: Date, default: Date.now},
    // Player convert reward point
    convertRewardPointsToCredit: {type: Boolean, default: false},
    // the time when convert rewardPoints to credit
    convertRewardPointsToCreditUpdatedTime: {type: Date, default: Date.now},
    // Generate promo code
    generatePromoCode: {type: Boolean, default: false},
    // the time when generate promo code
    generatePromoCodeUpdatedTime: {type: Date, default: Date.now},
    // Front end apply XIMA
    applyXIMAFrontEnd: {type: Boolean, default: false},
    // the time when apply XIMA from front end
    applyXIMAFrontEndUpdatedTime: {type: Date, default: Date.now},
    // Apply promo code
    ApplyPromoCode: {type: Boolean, default: false},
    // the time when apply promo code
    ApplyPromoCodeUpdatedTime: {type: Date, default: Date.now},
    // update password
    updatePassword: {type: Boolean, default: false},
    // the time when update password
    updatePasswordUpdatedTime: {type: Date, default: Date.now},
    // Apply reward points
    applyRewardPoint: {type: Boolean, default: false},
    // the time when apply reward points
    applyRewardPointUpdatedTime: {type: Date, default: Date.now},
    // deduct reward points
    deductRewardPoint: {type: Boolean, default: false},
    // the time when deduct rewardPoints
    deductRewardPointUpdatedTime: {type: Date, default: Date.now},
    // auction bidding process
    auctionBidding: {type: Boolean, default: false},
    // the tome when bidding
    auctionBiddingUpdatedTime: {type: Date, default: Date.now},
    // update the player's payment info
    updatePaymentInfo: {type: Boolean, default: false},
    // the tome when updating the player's payment info
    updatePaymentInfoUpdatedTime: {type: Date, default: Date.now}
});

module.exports = playerBStateSchema;
