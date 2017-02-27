/**
 * Created by hninpwinttin on 14/1/16.
 */
var dbRewardRule = require('./../db_modules/dbRewardRule');
var socketUtil = require('./../modules/socketutility');

function socketActionRewardRule(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create a new reward rule
         * @param {String} typeName - reward rule type name
         * @param {json} data - The data of the reward rule. Refer to rewardRule schema.
         */
        createRewardRuleWithType: function createRewardRuleWithType(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.typeName && data.ruleData );
            socketUtil.emitter(self.socket, dbRewardRule.createRewardRuleWithType, [data.typeName, data.ruleData], actionName, isValidData);
        },

        /**
         * Get one Reward Rule
         * @param {json} data - data has to contain _id
         */
        getRewardRuleById: function getRewardRuleById (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id );
            socketUtil.emitter(self.socket, dbRewardRule.getRewardRule, [data], actionName, isValidData);
        },

        /**
         * Get all ProposalType
         */
        getAllRewardRule: function getAllRewardRule() {
            var actionName = arguments.callee.name;
            socketUtil.emitterWithoutRoleCheck(self.socket, dbRewardRule.getAllRewardRule, [{}], actionName);
        },

        /**
         * Update one Reward rule
         *  @param {json} data - data has to contain query and updateData
         */
        updateRewardRule: function updateRewardRule (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbRewardRule.updateRewardRule, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * delete Rewards by ids
         * @param {json} data - data has to contain _ids
         */
        deleteRewardRuleByIds: function deleteRewardRuleByIds (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbRewardRule.deleteRewardRuleByIds, [data._ids], actionName ,isValidData );
        }
    };
    socketActionRewardRule.actions = this.actions;
};

module.exports = socketActionRewardRule;