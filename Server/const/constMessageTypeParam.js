
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
            {parameterName:'proposalData.cancelTime' , description:'cancelTime'}, //should get cancel time, Need test
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    PLAYER_LIMITED_OFFERS_REWARD_SUCCESS: {
        name:"PlayerLimitedOfferRewardSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    UPDATE_PAYMENT_INFO_SUCCESS: {
        name:"UpdatePaymentInfoSuccess",
        params:[
            {parameterName:'proposalData.data.bankAccount' , description:'bankcardLast4Number(new)'}, //Need test
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    UPDATE_PHONE_INFO_SUCCESS: {
        name:"UpdatePhoneInfoSuccess",
        params:[
            {parameterName:'proposalData.data.updateData.phoneNumber' , description:'phoneLast4Number(new)'}, //Need test
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
        ]
    },
    UPDATE_PASSWORD_SUCCESS: {
        name:"UpdatePasswordSuccess",
        params:[
            {parameterName:'proposalData.createTime' , description:'executeTime'}
        ]
    },
    SMS_VERIFICATION_SUCCESS: {
        name:"SmsVerificationCodeSuccess",
        params:[
            {parameterName:'proposalData.code' , description:'smsVerificationCode'}, //Need test
            {parameterName:'proposalData.createTime' , description:'sendTime'} //Need test
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
            {parameterName:'proposalData.createTime' , description:'executeTime'}, //Need test
        ]
    },
    PROMO_CODE_SUCCESS:{
        name:"PromoCodeSuccess",
        params:[
            {parameterName:'proposalData.data.rewardAmount' , description:'rewardAmount'},
            {parameterName:'proposalData.createTime' , description:'executeTime'},
            {parameterName:'proposalData.proposalId' , description:'proposalId'},
            {parameterName:'proposalData.data.eventName' , description:'promoCodeName'} // need test
        ]
    }

};

module.exports = constMessageTypeParam;
