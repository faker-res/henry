
var dbconfig = require('./../modules/dbproperties');
var encrypt = require('./../modules/encrypt');
var dbRewardCondition = require('./dbRewardCondition');
let constRewardType = require('./../const/constRewardType');

var Q = require("q");

var dbRewardType = {

    /**
     * Get all reward types
     */
    getAllRewardType: function () {
        //hide unused reward type
        let hideRewardType = [
            constRewardType.FULL_ATTENDANCE,
            constRewardType.PARTNER_CONSUMPTION_RETURN,
            constRewardType.FIRST_TOP_UP,
            constRewardType.PARTNER_INCENTIVE_REWARD,
            constRewardType.PARTNER_REFERRAL_REWARD,
            constRewardType.GAME_PROVIDER_REWARD,
            constRewardType.PLATFORM_TRANSACTION_REWARD,
            constRewardType.PLAYER_TOP_UP_RETURN,
            constRewardType.PLAYER_CONSUMPTION_INCENTIVE,
            constRewardType.PARTNER_TOP_UP_RETURN,
            constRewardType.PLAYER_TOP_UP_REWARD,
            constRewardType.PLAYER_REFERRAL_REWARD,
            constRewardType.PLAYER_REGISTRATION_REWARD,
            constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD,
            constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD,
            constRewardType.PLAYER_EASTER_EGG_REWARD,
            constRewardType.PLAYER_TOP_UP_PROMO,
            constRewardType.PLAYER_CONSECUTIVE_CONSUMPTION_REWARD,
            constRewardType.PLAYER_PACKET_RAIN_REWARD,
        ];
        return dbconfig.collection_rewardType.find({name: {$nin: hideRewardType}})
            .populate({path: "params", model: dbconfig.collection_rewardParam})
            .populate({path: "condition", model: dbconfig.collection_rewardCondition}).exec();
    },

    /**
     * Get reward type by query
     * @param {Object} query - The query
     */
    getRewardType: function(query){
        return dbconfig.collection_rewardType.findOne(query).exec();
    }

};

module.exports = dbRewardType;