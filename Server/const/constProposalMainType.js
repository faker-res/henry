/*
 * All proposal types
 */

const constMainType = {
    TOP_UP: "TopUp",
    BONUS: "PlayerBonus",
    REWARD: "Reward",
    // REWARD_POINTS: "Reward Points",
    UPDATE_PLAYER: "UpdatePlayer",
    UPDATE_PARTNER: "UpdatePartner",
    INTENTION: "Intention",
    OTHERS: "Others",
};

const constProposalMainType = {
    //TOP_UP
    "PlayerWechatTopUp": constMainType.TOP_UP,
    "ManualPlayerTopUp": constMainType.TOP_UP,
    "PlayerAlipayTopUp": constMainType.TOP_UP,
    "PlayerTopUp": constMainType.TOP_UP,
    "PlayerQuickpayTopUp": constMainType.TOP_UP,
    "PlayerFKPTopUp": constMainType.TOP_UP,
    "PlayerCommonTopUp": constMainType.TOP_UP,
    "PlayerAssignTopUp": constMainType.TOP_UP,

    //BONUS
    "PartnerBonus": constMainType.BONUS,
    "PlayerBonus": constMainType.BONUS,
    "PlayerFKPWithdraw": constMainType.BONUS,

    //REWARD
    "AddPlayerRewardTask": constMainType.REWARD,
    "PlayerAuctionPromotionReward": constMainType.REWARD,
    "PlayerLevelUp": constMainType.REWARD,
    "PlayerTopUpReturn": constMainType.REWARD,
    "PartnerConsumptionReturn": constMainType.REWARD,
    "PartnerIncentiveReward": constMainType.REWARD,
    "PartnerReferralReward": constMainType.REWARD,
    "PlatformTransactionReward": constMainType.REWARD,
    "GameProviderReward": constMainType.REWARD,
    "PlayerDoubleTopUpReward": constMainType.REWARD,
    "PlayerConsecutiveLoginReward": constMainType.REWARD,
    "PlayerConsumptionIncentive": constMainType.REWARD,
    "PlayerConsumptionReturn": constMainType.REWARD,
    "PlayerTopUpReward": constMainType.REWARD,
    "FirstTopUp": constMainType.REWARD,
    "FullAttendance": constMainType.REWARD,
    "PlayerReferralReward": constMainType.REWARD,
    "PlayerRegistrationReward": constMainType.REWARD,
    "ConsecutiveTopUp": constMainType.REWARD,
    //"PlayerConsumptionReturnFix": constMainType.REWARD,
    "PlayerEasterEggReward": constMainType.REWARD,
    "PlayerTopUpPromo": constMainType.REWARD,
    "PlayerConsecutiveConsumptionReward": constMainType.REWARD,
    "PlayerPacketRainReward": constMainType.REWARD,
    "PlayerPromoCodeReward": constMainType.REWARD,
    "DxReward": constMainType.REWARD,
    "PlayerLimitedOfferReward": constMainType.REWARD,
    "PlayerTopUpReturnGroup": constMainType.REWARD,
    "PlayerFreeTrialRewardGroup": constMainType.REWARD,
    "PlayerRandomRewardGroup": constMainType.REWARD,
    "PlayerLoseReturnRewardGroup": constMainType.REWARD,
    "PlayerConsumptionRewardGroup": constMainType.REWARD,
    "PlayerConsecutiveRewardGroup": constMainType.REWARD,
    "PlayerConsumptionSlipRewardGroup": constMainType.REWARD,
    "PlayerRetentionRewardGroup": constMainType.REWARD,
    "PlayerBonusDoubledRewardGroup": constMainType.REWARD,
    "BaccaratRewardGroup": constMainType.REWARD,

    //UPDATE_PLAYER
    "UpdatePlayerInfo" : constMainType.UPDATE_PLAYER,
    "UpdatePlayerInfoPartner" : constMainType.UPDATE_PLAYER,
    "UpdatePlayerInfoLevel" : constMainType.UPDATE_PLAYER,
    "UpdatePlayerInfoAccAdmin" : constMainType.UPDATE_PLAYER,
    "UpdatePlayerBankInfo": constMainType.UPDATE_PLAYER,
    "UpdatePlayerEmail": constMainType.UPDATE_PLAYER,
    "UpdatePlayerPhone": constMainType.UPDATE_PLAYER,
    //"UpdatePlayerCredit": constMainType.UPDATE_PLAYER,
    "FixPlayerCreditTransfer": constMainType.UPDATE_PLAYER,
    "UpdatePlayerQQ": constMainType.UPDATE_PLAYER,
    "UpdatePlayerWeChat": constMainType.UPDATE_PLAYER,
    //"ManualUnlockPlayerReward": constMainType.UPDATE_PLAYER,
    //"PlayerRegistrationIntention":constMainType.UPDATE_PLAYER,
    "PlayerLevelMigration": constMainType.UPDATE_PLAYER,
    "UpdatePlayerRealName": constMainType.UPDATE_PLAYER,

    //UPDATE_PARTNER
    "UpdatePartnerInfo": constMainType.UPDATE_PARTNER,
    "UpdatePartnerBankInfo": constMainType.UPDATE_PARTNER,
    "UpdatePartnerEmail": constMainType.UPDATE_PARTNER,
    "UpdatePartnerPhone": constMainType.UPDATE_PARTNER,
    "UpdatePartnerQQ": constMainType.UPDATE_PARTNER,
    "UpdatePartnerWeChat": constMainType.UPDATE_PARTNER,
    "UpdatePartnerCommissionType": constMainType.UPDATE_PARTNER,
    "CustomizePartnerCommRate": constMainType.UPDATE_PARTNER,
    "UpdatePartnerRealName": constMainType.UPDATE_PARTNER,
    //"PartnerCommission": constMainType.UPDATE_PARTNER,
    //"UpdatePartnerCredit":constMainType.UPDATE_PARTNER,

    //OTHERS
    "UpdatePlayerCredit": constMainType.OTHERS,
    "RepairTransaction":constMainType.OTHERS, // New added
    "UpdatePartnerCredit":constMainType.OTHERS,
    "ManualUnlockPlayerReward": constMainType.OTHERS,
    "PlayerRegistrationIntention":constMainType.OTHERS,
    "PlayerConsumptionReturnFix": constMainType.OTHERS,
    "PartnerCommission": constMainType.OTHERS,
    "PlayerLimitedOfferIntention": constMainType.OTHERS,
    "PlayerAddRewardPoints": constMainType.OTHERS,          //Reward Points
    "PlayerMinusRewardPoints": constMainType.OTHERS,        //Reward Points
    "PlayerConvertRewardPoints": constMainType.OTHERS,      //Reward Points
    "PlayerAutoConvertRewardPoints": constMainType.OTHERS,  //Reward Points
    "SettlePartnerCommission": constMainType.OTHERS,
    "BulkExportPlayerData": constMainType.OTHERS,
    "FinancialPointsAdd": constMainType.OTHERS,
    "FinancialPointsDeduct": constMainType.OTHERS,
    "UpdateChildPartner": constMainType.OTHERS,
    "UpdateParentPartnerCommission": constMainType.OTHERS,
    "PartnerCreditTransferToDownline": constMainType.OTHERS,
    "DownlineReceivePartnerCredit": constMainType.OTHERS,
    "ManualExportTsPhone": constMainType.OTHERS,

};

module.exports = constProposalMainType;
