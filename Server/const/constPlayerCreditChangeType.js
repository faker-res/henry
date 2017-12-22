/*
 * Player credit change type
 */
const constPlayerCreditChangeType = {
    TOP_UP: "OnlineTopUp",
    ALIPAY_TOP_UP: "AlipayTopUp",
    WECHAT_TOP_UP: "WechatTopUp",
    QUICKPAY_TOP_UP: "QuickpayTopUp",
    MANUAL_TOP_UP: "ManualTopUp",
    CONSUME: "Consume",
    REWARD: "Reward",
    REWARD_TASK: "RewardTask",
    TRANSFER_IN: "TransferIn",
    TRANSFER_OUT: "TransferOut",
    PURCHASE: "Purchase",
    APPLY_FIRST_TOP_UP_REWARD_REFUND: "applyFirstTopUpReward:ProposalFailedRefund",
    APPLY_TOP_UP_RETURN_REFUND: "applyTopUpReturn:ProposalFailedRefund",
    TOP_UP_REWARD_DEDUCTION: "applyPlayerTopUpReward:Deduction",
    APPLY_TOP_UP_REWARD_REFUND: "applyPlayerTopUpReward:ProposalFailedRefund",
    REJECT_UPDATE_PLAYER_CREDIT: "rejectUpdatePlayerCredit",
    REJECT_GAME_PROVIDER_REWARD: "rejectGameProviderReward",
    REJECT_FIRST_TOP_UP: "rejectFirstTopUp",
    REJECT_PLAYER_TOP_UP_RETURN: "rejectPlayerTopUpReturn",
    REJECT_PLAYER_BONUS: "rejectPlayerBonus",
    REJECT_PLAYER_TOP_UP_REWARD: "rejectPlayerTopUpReward",
    REJECT_PLAYER_DOUBLE_TOP_UP_REWARD: "rejectPlayerDoubleTopUpReward",
    //
    EDIT_CREDIT_DEDUCTION: "editPlayerCredit:Deduction",
    DEDUCT_BELOW_ZERO_REFUND: "deductedBelowZeroRefund",
    PLAYER_BONUS_RESET_CREDIT: "PlayerBonus:resetCredit",

    // REJECT
    REJECT_PLAYER_TOP_UP_RETURN_GROUP: "rejectPlayerTopUpReturnGroup",
    DUPLICATE_DEDUCTION_DETECTED: "duplicateDeductionDetected"



};

module.exports = constPlayerCreditChangeType;