var constRewardType = require("../const/constRewardType");

function isValidRewardEvent(type, eventData) {
    switch (type) {
        case constRewardType.FULL_ATTENDANCE:
            if (eventData && eventData.param && eventData.executeProposal && (eventData.param.checkTopUp || eventData.param.checkConsumption)) {
                if( eventData.param.checkTopUp && (eventData.param.numOfTopUpDays <= 0 || eventData.param.minTopUpAmount <= 0 )){
                    return false;
                }
                if( eventData.param.checkConsumption && (eventData.param.numOfConsumeDays <= 0 || eventData.param.minConsumeAmount <= 0 )){
                    return false;
                }
                return true;
            }
            break;
        case constRewardType.PLAYER_CONSUMPTION_RETURN:
            if (eventData && eventData.param && eventData.executeProposal && eventData.param.ratio) {
                return true;
            }
            break;
        case constRewardType.PARTNER_CONSUMPTION_RETURN:
            if (eventData && eventData.param && eventData.param.rewardPercentage && eventData.executeProposal) {
                return true;
            }
            break;
        case constRewardType.PARTNER_REFERRAL_REWARD:
            if (eventData && eventData.param && eventData.param.rewardAmount && eventData.executeProposal) {
                return true;
            }
            break;
        case constRewardType.PARTNER_INCENTIVE_REWARD:
            if (eventData && eventData.condition && eventData.executeProposal) {
                return true;
            }
            break;
        case constRewardType.GAME_PROVIDER_REWARD:
            if (eventData && eventData.param && eventData.param.rewardPercentage && eventData.param.spendingPercentage && eventData.executeProposal) {
                return true
            }
            break;
        case constRewardType.FIRST_TOP_UP :
            if (eventData && eventData.param && eventData.param.reward && eventData.executeProposal) {
                return true
            }
            break;
        case constRewardType.PLAYER_TOP_UP_RETURN:
            if (eventData && eventData.param && eventData.executeProposal && eventData.param.reward) {
                return true;
            }
            break;
        case constRewardType.PLAYER_CONSUMPTION_INCENTIVE:
            if (eventData && eventData.param && eventData.executeProposal && eventData.param.reward) {
                return true;
            }
            break;
        case constRewardType.PLAYER_TOP_UP_REWARD:
            if (eventData && eventData.param && eventData.executeProposal && eventData.param.reward) {
                return true;
            }
            break;
        default :
            return false;
    }

    return false;
}

var rewardUtility = {
    isValidRewardEvent: isValidRewardEvent
};

module.exports = rewardUtility;