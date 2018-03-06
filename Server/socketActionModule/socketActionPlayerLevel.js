/**
 * Created by hninpwinttin on 29/1/16.
 */
var encrypt = require('./../modules/encrypt');
var dbPlayerLevel = require('./../db_modules/dbPlayerLevel');
var socketUtil = require('./../modules/socketutility');
var constPlayerLevelPeriod= require('./../const/constPlayerLevelPeriod');

function socketActionPlayerLevel(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create new playerLevel by playerLevel data
         * @param {json} data - partnerLevel data. It has to contain correct data format. Refer "partnerLevel" schema
         */
        createPlayerLevel: function createPlayerLevel(data) {
            var actionName = arguments.callee.name;
            // @todo data.levelUpConfig and data.levelDownConfig should be arrays with valid items inside them
            var isValidData = Boolean(data && data.platform && data.name && data.value);
            socketUtil.emitter(self.socket, dbPlayerLevel.createPlayerLevel, [data], actionName, isValidData);
        },
        /**
         * get playerLevel by partner name or _id
         * @param {json} data - partnerLevel data. It has to contain correct data format. Refer "partnerLevel" schema
         */
        getPlayerLevel: function getPlayerLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id));
            socketUtil.emitter(self.socket, dbPlayerLevel.getPlayerLevel, [data], actionName, isValidData);
        },
        /**
         * update playerLevel by  _id or name
         * @param {json} data - query and updateData
         */
        updatePlayerLevel: function updatePlayerLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerLevel.updatePlayerLevel, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * delete player Level
         */
        deletePlayerLevel: function deletePlayerLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerLevel.deletePlayerLevel, [data._id], actionName, isValidData);
        },
        /**
         * get playerLevel by platformId
         * @param {json} data. It has to contain platformId
         */
        getPlayerLevelByPlatformId: function getPlayerLevelByPlatformId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerLevel.getPlayerLevel, [{platform: data.platformId}], actionName, isValidData);
        },

        getPlayerLvlPeriodConst: function getPlayerLvlPeriodConst() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerLevelPeriod});

        }

    };
};

module.exports = socketActionPlayerLevel;

