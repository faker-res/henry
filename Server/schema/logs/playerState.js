let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerStateSchema = new Schema({
    // playerId
    player: {type: Schema.Types.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // Last apply packet rain reward date
    lastApplyPacketRainReward: {type: Date, default: new Date()},
    // Last apply top up return date
    lastApplyTopUpReturnReward: {type: Date, default: new Date()},
    // last apply levelup reward
    lastApplyLevelUpReward: {type: Date, default: new Date()},
    // Last wechat top up
    lastWechatTopUp: {type: Date, default: new Date()},
    // Last alipay top up
    lastAlipayTopUp: {type: Date, default: new Date()},
    // Last manual top up
    lastManualTopUp: {type: Date, default: new Date()},
    // Last generate promo code reward
    lastGeneratePromoCode: {type: Date, default: new Date()},
    // Last apply promo code reward
    lastApplyPromoCode: {type: Date, default: new Date()},
    // Last apply transfer credit from provider
    lastTransferFromProvider: {type: Date, default: new Date()},
    // Last apply transfer credit from provider
    lastApplyRewardEvent: {type: Date, default: new Date()},

    // Spam control
    // Last player get sms code
    lastGetVerificationCode: {type: Date, default: new Date()},
});

module.exports = playerStateSchema;