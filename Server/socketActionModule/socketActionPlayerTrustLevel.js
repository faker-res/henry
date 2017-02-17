var dbPlayerTrustLevel = require('./../db_modules/dbPlayerTrustLevel');
var socketUtil = require('./../modules/socketutility');

function socketActionPlayerTrustLevel(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create new playerTrustLevel by playerTrustLevel data
         * @param {json} data - partnerLevel data. It has to contain correct data format. Refer "partnerLevel" schema
         */
        createPlayerTrustLevel: function createPlayerTrustLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name);
            socketUtil.emitter(self.socket, dbPlayerTrustLevel.createPlayerTrustLevel, [data], actionName, isValidData);
        },
        /**
         * get playerTrustLevel by partner name or _id
         * @param {json} data - partnerLevel data. It has to contain correct data format. Refer "partnerLevel" schema
         */
        getPlayerTrustLevel: function getPlayerTrustLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id));
            socketUtil.emitter(self.socket, dbPlayerTrustLevel.getPlayerTrustLevel, [data], actionName, isValidData);
        },
        /**
         * update playerTrustLevel by  _id or name
         * @param {json} data - query and updateData
         */
        updatePlayerTrustLevel: function updatePlayerTrustLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerTrustLevel.updatePlayerTrustLevel, [data.query, data.updateData], actionName, isValidData);

        },
        /**
         * get all player trust Levels
         */
        getAllPlayerTrustLevels: function getAllPlayerTrustLevels() {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbPlayerTrustLevel.getAllPlayerTrustLevels,[{}], actionName);
        },
        
        /**
         * delete player trust Level
         */
        deletePlayerTrustLevel: function deletePlayerTrustLevel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerTrustLevel.deletePlayerTrustLevel, [data._id], actionName, isValidData);
        },
        /**
         * get playerTrustLevel by platformId
         * @param {json} data. It has to contain platformId
         */
        getPlayerTrustLevelByPlatformId: function getPlayerTrustLevelByPlatformId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerTrustLevel.getPlayerTrustLevel, [{platform: data.platformId}], actionName, isValidData);
        }

    };
};

module.exports = socketActionPlayerTrustLevel;

