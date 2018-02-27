/*
 * Types of notification message that we might send to players.
 */

var constRewardType = require('./../const/constRewardType');

const constMessageType = {
    // NEW MESSAGE TYPE

    PLAYER_CONSUMPTION_RETURN_SUCCESS: "PlayerConsumptionReturnSuccess",
    MANUAL_TOPUP_SUCCESS:"ManualTopupSuccess",
    ONLINE_TOPUP_SUCCESS: "OnlineTopupSuccess",
    ALIPAY_TOPUP_SUCCESS: "AlipayTopupSuccess",
    WECHAT_TOPUP_SUCCESS: "WechatTopupSuccess",
    WITHDRAW_SUCCESS: "WithdrawSuccess",
    WITHDRAW_CANCEL: "WithdrawCancel",
    PLAYER_LIMITED_OFFERS_REWARD_SUCCESS: "PlayerLimitedOfferRewardSuccess",
    UPDATE_BANK_INFO_SUCCESS: "UpdateBankInfoSuccess",
    UPDATE_PHONE_INFO_SUCCESS: "UpdatePhoneInfoSuccess",
    UPDATE_PASSWORD: "updatePassword", // use back old message type
    SMS_VERIFICATION: "smsVerificationCode", // use back old message type
    PLAYER_TOP_UP_RETURN_GROUP_SUCCESS: "PlayerTopUpReturnGroupSuccess",
    PLAYER_LOSE_RETURN_REWARD_GROUP_SUCCESS: "PlayerLoseReturnRewardGroupSuccess",
    PLAYER_CONSECUTIVE_REWARD_GROUP_SUCCESS: "PlayerConsecutiveRewardGroupSuccess",
    PLAYER_CONSUMPTION_REWARD_GROUP_SUCCESS: "PlayerConsumptionRewardGroupSuccess",
    PLAYER_FREE_TRIAL_REWARD_GROUP_SUCCESS: "PlayerFreeTrialRewardGroupSuccess",
    PLAYER_REGISTER_INTENTION_SUCCESS: "PlayerRegisterIntentionSuccess",
    PLAYER_PROMO_CODE_REWARD_SUCCESS: "PlayerPromoCodeRewardSuccess",
    PLAYER_LEVEL_UP_MIGRATION_SUCCESS: "PlayerLevelUpMigrationSuccess",
    PLAYER_LEVEL_DOWN_MIGRATION_SUCCESS: "PlayerLevelDownMigrationSuccess",
    PLAYER_LEVEL_UP_SUCCESS: "PlayerLevelUpSuccess"

/* OLD MESSAGE TYPE
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
    UPDATE_PASSWORD: "updatePassword",

    SMS_VERIFICATION: "smsVerificationCode"
    */
};

module.exports = constMessageType;
