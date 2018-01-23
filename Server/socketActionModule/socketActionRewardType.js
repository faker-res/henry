/**
 * Created by hninpwinttin on 20/1/16.
 */
/**
 * Created by hninpwinttin on 14/1/16.
 */
var dbRewardType = require('./../db_modules/dbRewardType');
var dbRewardCondition = require('./../db_modules/dbRewardCondition');
var dbRewardParam = require('./../db_modules/dbRewardParam');

var dbRewardRule = require('./../db_modules/dbRewardRule');
var socketUtil = require('./../modules/socketutility');
const constRewardType = require('../const/constRewardType');

function socketActionReward(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create new reward condition
         * @param {json} data
         */
        createRewardCondition: function createRewardCondition(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.condition);
            socketUtil.emitter(self.socket, dbRewardCondition.createRewardCondition, [data], actionName, isValidData);
        },

        /**
         * Get all reward types
         */
        getAllRewardTypes: function getAllRewardTypes() {
            var actionName = arguments.callee.name;
            socketUtil.emitterWithoutRoleCheck(self.socket, dbRewardType.getAllRewardType, [{}], actionName);
        },

        /**
         * Get all reward types configuration for params
         */
        getRewardTypesConfig: function getRewardTypesConfig() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {
                success: true, data: {
                    canApply: [
                        constRewardType.FIRST_TOP_UP,
                        constRewardType.GAME_PROVIDER_REWARD,
                        constRewardType.PLAYER_CONSUMPTION_INCENTIVE,
                        constRewardType.PLAYER_REGISTRATION_REWARD,
                        constRewardType.PLAYER_CONSUMPTION_RETURN,
                        constRewardType.PLAYER_TOP_UP_RETURN,
                        constRewardType.PLAYER_TOP_UP_REWARD,
                        constRewardType.PLAYER_REFERRAL_REWARD,
                        constRewardType.PLAYER_DOUBLE_TOP_UP_REWARD,
                        constRewardType.PLAYER_CONSECUTIVE_LOGIN_REWARD,
                        constRewardType.PLAYER_EASTER_EGG_REWARD,
                        constRewardType.PLAYER_PACKET_RAIN_REWARD,
                        constRewardType.PLAYER_LIMITED_OFFERS_REWARD,
                    ],
                    canSettle: [
                        constRewardType.PLAYER_CONSUMPTION_RETURN,
                        constRewardType.FULL_ATTENDANCE,
                        constRewardType.PARTNER_CONSUMPTION_RETURN,
                        constRewardType.PARTNER_INCENTIVE_REWARD,
                        constRewardType.PARTNER_REFERRAL_REWARD,
                        constRewardType.PARTNER_TOP_UP_RETURN,
                        constRewardType.PLAYER_CONSUMPTION_INCENTIVE],
                    canChangePeriod: [
                        constRewardType.PLAYER_CONSUMPTION_RETURN]
                }
            });
        }
    };
    socketActionReward.actions = this.actions;
};

module.exports = socketActionReward;