var encrypt = require('./../modules/encrypt');
var dbPlatformGameStatus = require('./../db_modules/dbPlatformGameStatus');
var socketUtil = require('./../modules/socketutility');


function socketActionPlatformGameStatus(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create new platform game status ( attaching game to a platform)
         * @param {json} data - . It has to contain _id of platform and _id of game
         */
        attachGameToPlatform: function attachGameToPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.game);
            socketUtil.emitter(self.socket, dbPlatformGameStatus.createPlatformGameStatus, [data], actionName, isValidData);
        },
        attachGamesToPlatform: function attachGamesToPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.games);
            socketUtil.emitter(self.socket, dbPlatformGameStatus.createPlatformGamesStatus, [data.platform, data.games], actionName, isValidData);
        },
        /**
         * Remove a game which is attached to a platform( detaching game to a platform)
         * @param {json} data - . It has to contain _id of platform and _id of game
         */
        detachGameFromPlatform: function detachGameFromPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.game);
            socketUtil.emitter(self.socket, dbPlatformGameStatus.deletePlatformGameStatus, [data], actionName, isValidData);
        },
        detachGamesFromPlatform: function detachGamesFromPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.games);
            socketUtil.emitter(self.socket, dbPlatformGameStatus.detachPlatformGamesStatus, [data.platform, data.games], actionName, isValidData);
        },
        /**
         * Update a game status which is attached to a platform (updating a platformGameStatus )
         * @param {json} data - . It has to contain _id of platform and _id of game and updateData (status of game)
         */
        updateGameStatusToPlatform: function updateGameStatusToPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlatformGameStatus.updatePlatformGameStatus, [data.query, data.updateData], actionName, isValidData);
        }

    };
    socketActionPlatformGameStatus.actions = this.actions;
};

module.exports = socketActionPlatformGameStatus;