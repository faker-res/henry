
const constMessageTypeParam = {

    PLAYER_CONSUMPTION_RETURN_SUCCESS: {
        name:'PlayerConsumptionReturnSuccess',

        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'ximaAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    MANUAL_TOPUP_SUCCESS: {
        name:"ManualTopupSuccess",
        params:[
            {parameterName:'proposalData.data.amount' , description:'manualTopupAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    ONLINE_TOPUP_SUCCESS: {
        name:"OnlineTopupSuccess",
        params:[
            {parameterName:'proposalData.data.amount' , description:'onlineTopupAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    ALIPAY_TOPUP_SUCCESS: {
        name:"AlipayTopupSuccess",
        params:[
            {parameterName:'proposalData.data.amount' , description:'alipayTopupAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    WECHAT_TOPUP_SUCCESS: {
        name:"WechatTopupSuccess",
        params:[
            {parameterName:'proposalData.data.amount' , description:'wechatTopupAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    WITHDRAW_SUCCESS: {
        name:"WithdrawSuccess",
        params:[
            {parameterName:'proposalData.data.amount' , description:'withdrawAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    WITHDRAW_CANCEL: {
        name:"WithdrawCancel",
        params:[
            {parameterName:'proposalData.data.amount' , description:'withdrawAmount'},
            {parameterName:'proposalData.cancelTime' , description:'cancelTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    PLAYER_LIMITED_OFFERS_REWARD_SUCCESS: {
        name:"PlayerLimitedOfferRewardSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'limitedOfferRewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    UPDATE_BANK_INFO_SUCCESS: {
        name:"UpdateBankInfoSuccess",
        params:[
            {parameterName:'proposalData.data.bankAccount' , description:'bankcardLast4Number(new)'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    UPDATE_PHONE_INFO_SUCCESS: {
        name:"UpdatePhoneInfoSuccess",
        params:[
            {parameterName:'proposalData.data.phoneNumber' , description:'phoneLast4Number(new)'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    UPDATE_PASSWORD: {
        name:"updatePassword",
        params:[
            {parameterName:'executeTime' , description:'executeTime'}
        ]
    },
    SMS_VERIFICATION: {
        name:"smsVerificationCode",
        params:[
            {parameterName:'smsCode' , description:'smsVerificationCode'},
            {parameterName:'sendTime' , description:'sendTime'}
        ]
    },
    PLAYER_TOP_UP_RETURN_GROUP_SUCCESS: {
        name:"PlayerTopUpReturnGroupSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
            {parameterName:'proposalData.data.eventName' , description:'rewardEventName'},
        ]
    },
    PLAYER_LOSE_RETURN_REWARD_GROUP_SUCCESS: {
        name:"PlayerLoseReturnRewardGroupSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
            {parameterName:'proposalData.data.eventName' , description:'rewardEventName'},
        ]
    },
    PLAYER_CONSECUTIVE_REWARD_GROUP_SUCCESS: {
        name:"PlayerConsecutiveRewardGroupSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
            {parameterName:'proposalData.data.eventName' , description:'rewardEventName'},
        ]
    },
    PLAYER_CONSUMPTION_REWARD_GROUP_SUCCESS: {
        name:"PlayerConsumptionRewardGroupSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
            {parameterName:'proposalData.data.eventName' , description:'rewardEventName'},
        ]
    },
    PLAYER_FREE_TRIAL_REWARD_GROUP_SUCCESS: {
        name:"PlayerFreeTrialRewardGroupSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
            {parameterName:'proposalData.data.eventName' , description:'rewardEventName'},
        ]
    },
    PLAYER_REGISTER_INTENTION_SUCCESS:{
        name:"PlayerRegisterIntentionSuccess",
        params:[
            {parameterName:'proposalData.data.playerName' , description:'PLAYER_NAME'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
        ]
    },
    PLAYER_PROMO_CODE_REWARD_SUCCESS:{
        name:"PlayerPromoCodeRewardSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
            {parameterName:'proposalData.data.promoCodeName' , description:'promoCodeName'}
        ]
    }

};

module.exports = constMessageTypeParam;
