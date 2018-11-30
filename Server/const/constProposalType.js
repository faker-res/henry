/*
 * All proposal types
 */
const constProposalType = {
    UPDATE_PLAYER_INFO: "UpdatePlayerInfo",
    UPDATE_PLAYER_INFO_PARTNER: "UpdatePlayerInfoPartner",
    UPDATE_PLAYER_INFO_LEVEL: "UpdatePlayerInfoLevel",
    UPDATE_PLAYER_INFO_ACC_ADMIN: "UpdatePlayerInfoAccAdmin",
    UPDATE_PLAYER_CREDIT: "UpdatePlayerCredit",
    FIX_PLAYER_CREDIT_TRANSFER: "FixPlayerCreditTransfer",
    UPDATE_PLAYER_EMAIL: "UpdatePlayerEmail",
    UPDATE_PLAYER_PHONE: "UpdatePlayerPhone",
    UPDATE_PLAYER_QQ: "UpdatePlayerQQ",
    UPDATE_PLAYER_WECHAT: "UpdatePlayerWeChat",
    UPDATE_PLAYER_BANK_INFO: "UpdatePlayerBankInfo",
    UPDATE_PLAYER_REAL_NAME: "UpdatePlayerRealName",
    ADD_PLAYER_REWARD_TASK: "AddPlayerRewardTask",
    UPDATE_PARTNER_BANK_INFO: "UpdatePartnerBankInfo",
    UPDATE_PARTNER_PHONE: "UpdatePartnerPhone",
    UPDATE_PARTNER_EMAIL: "UpdatePartnerEmail",
    UPDATE_PARTNER_QQ: "UpdatePartnerQQ",
    UPDATE_PARTNER_WECHAT: "UpdatePartnerWeChat",
    UPDATE_PARTNER_INFO: "UpdatePartnerInfo",
    UPDATE_PARTNER_COMMISSION_TYPE: "UpdatePartnerCommissionType",
    UPDATE_PARTNER_REAL_NAME: "UpdatePartnerRealName",
    CUSTOMIZE_PARTNER_COMM_RATE: "CustomizePartnerCommRate",
    UPDATE_CHILD_PARTNER: "UpdateChildPartner",
    PARTNER_CREDIT_TRANSFER_TO_DOWNLINE: "PartnerCreditTransferToDownline",
    DOWNLINE_RECEIVE_PARTNER_CREDIT: "DownlineReceivePartnerCredit",
    UPDATE_PARENT_PARTNER_COMMISSION: "UpdateParentPartnerCommission",
    SETTLE_PARTNER_COMMISSION: "SettlePartnerCommission",
    FULL_ATTENDANCE: "FullAttendance",
    PLAYER_CONSUMPTION_RETURN: "PlayerConsumptionReturn",
    PARTNER_CONSUMPTION_RETURN: "PartnerConsumptionReturn",
    FIRST_TOP_UP: "FirstTopUp",
    PARTNER_INCENTIVE_REWARD: "PartnerIncentiveReward",
    PARTNER_REFERRAL_REWARD: "PartnerReferralReward",
    GAME_PROVIDER_REWARD: "GameProviderReward",
    PLATFORM_TRANSACTION_REWARD: "PlatformTransactionReward",
    PLAYER_MANUAL_TOP_UP: "ManualPlayerTopUp",
    PLAYER_ALIPAY_TOP_UP: "PlayerAlipayTopUp",
    PLAYER_WECHAT_TOP_UP: "PlayerWechatTopUp",
    PLAYER_TOP_UP: "PlayerTopUp",
    PLAYER_BONUS: "PlayerBonus",
    PLAYER_TOP_UP_RETURN: "PlayerTopUpReturn",
    PLAYER_CONSUMPTION_INCENTIVE: "PlayerConsumptionIncentive",
    PLAYER_LEVEL_UP: "PlayerLevelUp",
    PARTNER_TOP_UP_RETURN: "PartnerTopUpReturn",
    PLAYER_TOP_UP_REWARD: "PlayerTopUpReward",
    PLAYER_REFERRAL_REWARD: "PlayerReferralReward",
    PARTNER_BONUS: "PartnerBonus",
    PLAYER_CONSUMPTION_RETURN_FIX: "PlayerConsumptionReturnFix",
    PLAYER_REGISTRATION_REWARD: "PlayerRegistrationReward",
    PARTNER_COMMISSION: "PartnerCommission",
    MANUAL_UNLOCK_PLAYER_REWARD: "ManualUnlockPlayerReward",
    PLAYER_DOUBLE_TOP_UP_REWARD: "PlayerDoubleTopUpReward",
    UPDATE_PARTNER_CREDIT:"UpdatePartnerCredit",
    PLAYER_CONSECUTIVE_LOGIN_REWARD: "PlayerConsecutiveLoginReward",
    PLAYER_REGISTRATION_INTENTION: "PlayerRegistrationIntention",
    PLAYER_EASTER_EGG_REWARD: "PlayerEasterEggReward",
    PLAYER_QUICKPAY_TOP_UP: "PlayerQuickpayTopUp",
    PLAYER_TOP_UP_PROMO: "PlayerTopUpPromo",
    PLAYER_LEVEL_MIGRATION: "PlayerLevelMigration",
    PLAYER_CONSECUTIVE_CONSUMPTION_REWARD: "PlayerConsecutiveConsumptionReward",
    PLAYER_PACKET_RAIN_REWARD: "PlayerPacketRainReward",
    PLAYER_PROMO_CODE_REWARD: "PlayerPromoCodeReward",
    DX_REWARD: "DxReward",
    PLAYER_LIMITED_OFFER_INTENTION: "PlayerLimitedOfferIntention",
    PLAYER_LIMITED_OFFER_REWARD: "PlayerLimitedOfferReward",
    PLAYER_CONSECUTIVE_REWARD_GROUP: "PlayerConsecutiveRewardGroup",
    PLAYER_TOP_UP_RETURN_GROUP: "PlayerTopUpReturnGroup",
    PLAYER_RANDOM_REWARD_GROUP: "PlayerRandomRewardGroup",
    PLAYER_CONSUMPTION_REWARD_GROUP: "PlayerConsumptionRewardGroup",
    PLAYER_FREE_TRIAL_REWARD_GROUP: "PlayerFreeTrialRewardGroup",
    PLAYER_ADD_REWARD_POINTS: "PlayerAddRewardPoints",
    PLAYER_MINUS_REWARD_POINTS: "PlayerMinusRewardPoints",
    PLAYER_CONVERT_REWARD_POINTS: "PlayerConvertRewardPoints",
    PLAYER_AUTO_CONVERT_REWARD_POINTS: "PlayerAutoConvertRewardPoints",
    BULK_EXPORT_PLAYERS_DATA: "BulkExportPlayerData",
    PLAYER_LOSE_RETURN_REWARD_GROUP: "PlayerLoseReturnRewardGroup",
    FINANCIAL_POINTS_ADD: "FinancialPointsAdd",
    FINANCIAL_POINTS_DEDUCT: "FinancialPointsDeduct",
    PLAYER_CONSUMPTION_SLIP_REWARD_GROUP: "PlayerConsumptionSlipRewardGroup",
    PLAYER_RETENTION_REWARD_GROUP: "PlayerRetentionRewardGroup",
    PLAYER_BONUS_DOUBLED_REWARD_GROUP: "PlayerBonusDoubledRewardGroup",

    // Third party payment system
    PLAYER_FKP_TOP_UP: "PlayerFKPTopUp"
};

module.exports = constProposalType;
