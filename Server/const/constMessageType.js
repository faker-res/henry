/*
 * Types of notification message that we might send to players.
 */

var constRewardType = require('./../const/constRewardType');

const constMessageType = {
    //For proposal
    FULL_ATTENDANCE: "FullAttendance",
    CONSECUTIVE_TOP_UP: "ConsecutiveTopUp",
    PLAYER_CONSUMPTION_RETURN: "PlayerConsumptionReturn",
    PARTNER_CONSUMPTION_RETURN: "PartnerConsumptionReturn",
    FIRST_TOP_UP: "FirstTopUp",
    PARTNER_INCENTIVE_REWARD: "PartnerIncentiveReward",
    PARTNER_REFERRAL_REWARD: "PartnerReferralReward",
    GAME_PROVIDER_REWARD: "GameProviderReward",
    PLATFORM_TRANSACTION_REWARD: "PlatformTransactionReward",

    //FOR SMS
    MANUAL_TOPUP: "manualTopup",
    APPLY_BONUS: "applyBonus",
    CANCEL_BONUS: "cancelBonus",
    APPLY_REWARD: "applyReward",
    CONSUMPTION_RETURN: "consumptionReturn",
    UPDATE_PAYMENT_INFO: "updatePaymentInfo",
    UPDATE_PASSWORD: "updatePassword"
};

module.exports = constMessageType;
