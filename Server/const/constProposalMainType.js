/*
 * All proposal types
 */

const constMainType = {
    UPDATE_PLAYER: "UpdatePlayer",
    UPDATE_PARTNER: "UpdatePartner",
    REWARD: "Reward",
    TOP_UP: "TopUp",
    BONUS: "PlayerBonus",
    INTENTION: "Intention"
};

const constProposalMainType = {
    //UPDATE_PLAYER
    "UpdatePlayerInfo" : constMainType.UPDATE_PLAYER,
    "UpdatePlayerCredit": constMainType.UPDATE_PLAYER,
    "FixPlayerCreditTransfer": constMainType.UPDATE_PLAYER,
    "UpdatePlayerEmail": constMainType.UPDATE_PLAYER,
    "UpdatePlayerPhone": constMainType.UPDATE_PLAYER,
    "UpdatePlayerQQ": constMainType.UPDATE_PLAYER,
    "UpdatePlayerWeChat": constMainType.UPDATE_PLAYER,
    "UpdatePlayerBankInfo": constMainType.UPDATE_PLAYER,
    "ManualUnlockPlayerReward": constMainType.UPDATE_PLAYER,
    "PlayerRegistrationIntention":constMainType.UPDATE_PLAYER,
    "PlayerLevelMigration": constMainType.UPDATE_PLAYER,

    //UPDATE_PARTNER
    "UpdatePartnerBankInfo": constMainType.UPDATE_PARTNER,
    "UpdatePartnerPhone": constMainType.UPDATE_PARTNER,
    "UpdatePartnerEmail": constMainType.UPDATE_PARTNER,
    "UpdatePartnerInfo": constMainType.UPDATE_PARTNER,
    "PartnerCommission": constMainType.UPDATE_PARTNER,
    "UpdatePartnerCredit":constMainType.UPDATE_PARTNER,

    //TOP_UP
    "ManualPlayerTopUp": constMainType.TOP_UP,
    "PlayerTopUp": constMainType.TOP_UP,
    "PlayerAlipayTopUp": constMainType.TOP_UP,
    "PlayerWechatTopUp": constMainType.TOP_UP,
    "PlayerQuickpayTopUp": constMainType.TOP_UP,

    //REWARD
    "ConsecutiveTopUp": constMainType.REWARD,
    "FullAttendance": constMainType.REWARD,
    "FirstTopUp": constMainType.REWARD,
    "PlayerConsumptionReturn": constMainType.REWARD,
    "PartnerConsumptionReturn": constMainType.REWARD,
    "PartnerIncentiveReward": constMainType.REWARD,
    "PartnerReferralReward": constMainType.REWARD,
    "GameProviderReward": constMainType.REWARD,
    "PlatformTransactionReward": constMainType.REWARD,
    "PlayerTopUpReturn": constMainType.REWARD,
    "PlayerConsumptionIncentive": constMainType.REWARD,
    "PlayerLevelUp": constMainType.REWARD,
    "PlayerTopUpReward": constMainType.REWARD,
    "PlayerReferralReward": constMainType.REWARD,
    "AddPlayerRewardTask": constMainType.REWARD,
    "PlayerRegistrationReward": constMainType.REWARD,
    "PlayerConsumptionReturnFix": constMainType.REWARD,
    "PlayerDoubleTopUpReward": constMainType.REWARD,
    "PlayerConsecutiveLoginReward": constMainType.REWARD,
    "PlayerEasterEggReward": constMainType.REWARD,
    "PlayerTopUpPromo": constMainType.REWARD,
    "PlayerConsecutiveConsumptionReward": constMainType.REWARD,
    "PlayerPacketRainReward": constMainType.REWARD,
    "PlayerPromoCodeReward": constMainType.REWARD,
    "PlayerLimitedOfferReward": constMainType.REWARD,

    //BONUS
    "PlayerBonus": constMainType.BONUS,
    "PartnerBonus": constMainType.BONUS,

    // INTENTION
    "PlayerLimitedOfferIntention": constMainType.INTENTION

};

module.exports = constProposalMainType;