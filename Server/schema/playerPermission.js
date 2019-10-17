
var ensureFieldsAreUnique = require("../db_modules/middleware/ensureFieldsAreUnique.js");
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var playerPermissionSchema = new Schema({
    //player id
    _id: {type: Schema.ObjectId, required: true},
    //User permission
    permission: {
        _id: false,
        applyBonus: {type: Boolean, default: true},
        // advanceConsumptionReward: {type: Boolean, default: true},
        transactionReward: {type: Boolean, default: true},
        allTopUp: {type: Boolean, default: true},
        topupOnline: {type: Boolean, default: true},
        topupManual: {type: Boolean, default: true},
        topUpCard: {type: Boolean, default: true},
        phoneCallFeedback: {type: Boolean, default: true, index: true},
        SMSFeedBack: {type: Boolean, default: true},
        alipayTransaction: {type: Boolean, default: true},
        quickpayTransaction: {type: Boolean, default: true},
        banReward: {type: Boolean, default: false},
        rewardPointsTask: {type: Boolean, default: true},
        disableWechatPay: {type: Boolean, default: false},
        forbidPlayerConsumptionReturn: {type: Boolean, default: false},
        allowPromoCode: {type: Boolean, default: true, index: true},
        forbidPlayerConsumptionIncentive: {type: Boolean, default: false},
        PlayerTopUpReturn: {type: Boolean, default: true},
        PlayerDoubleTopUpReturn: {type: Boolean, default: true},
        forbidPlayerFromLogin: {type: Boolean, default: false},
        forbidPlayerFromEnteringGame: {type: Boolean, default: false},
        playerConsecutiveConsumptionReward: {type: Boolean, default: true},
        PlayerPacketRainReward: {type: Boolean, default: true},
        PlayerLimitedOfferReward: {type: Boolean, default: true},
        levelChange: {type: Boolean, default: true}
    }
});

module.exports = playerPermissionSchema;