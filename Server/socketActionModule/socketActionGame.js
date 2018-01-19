var dbGame = require('./../db_modules/dbGame');
var socketUtil = require('./../modules/socketutility');
var dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
var dbGameType = require("../db_modules/dbGameType.js");
var constGameStatus = require('./../const/constGameStatus');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionGame(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        /**
         * Create a new game by game data
         * @param {json} data - game data
         */
        createGame: function createGame(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbGame.createGame, [data], actionName, isValidData);
        },
        /**
         * Create a new Game and Add to a Provider
         * @param {json} data - game data , providerObjId
         */

        createGameAndAddToProvider: function createGameAndAddToProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.provider);
            socketUtil.emitter(self.socket, dbGame.createGameAndAddToProvider, [data], actionName, isValidData);
        },
        /**
         * Get game by departmentName or _id
         * @param {json} data - Query data. It has to contain departmentName or _id
         */
        getGame: function getGame(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id));
            socketUtil.emitter(self.socket, dbGame.getGame, [data], actionName, isValidData);
        },

        /**
         * Get admin department by departmentName or _id
         * @param {json} data - Query data. It has to contain departmentName or _id
         */
        getGames: function getGames(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbGame.getGames, [data], actionName, isValidData);
        },

        /**
         * Update game
         * @param {json} data - data has query and updateData
         */
        updateGame: function updateGame(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbGame.updateGame, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * Delete game by id
         * @param {json} data - It has to contain game id
         */
        deleteGameById: function deleteGameById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbGame.deleteGameById, [data], actionName, isValidData);
        },
        /**
         * Get games by _id of Provider
         * @param {json} data - Query data. It has to contain  _id of the gameProvider
         */
        getGamesByProviderId: function getGamesByProviderId(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbGame.getGamesByProvider, [data._id], actionName, isValidData);
        },
        getGamesByProviders: function getGamesByProviders(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.providers);
            socketUtil.emitter(self.socket, dbGame.getGamesByProviders, [data.providers], actionName, isValidData);
        },
        /**
         * Get all Game Types
         */
        getAllGameTypes: function getAllGameTypes() {
            var actionName = arguments.callee.name;
            socketUtil.emitterWithoutRoleCheck(self.socket, dbGameType.getAllGameTypes, [], actionName, true);
        },
        /**
         * Get Game Type List
         */
        getGameTypeList: function getGameTypeList() {
            var actionName = arguments.callee.name;
            socketUtil.emitterWithoutRoleCheck(self.socket, dbGameType.getGameTypeList, [], actionName, true);
        },
        /**
         * Add Game Types
         */
        addGameType: function addGameType(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name);
            socketUtil.emitter(self.socket, dbGameType.addGameType, [data], actionName, isValidData);
        },
        /**
         * update Game Types
         */
        updateGameType: function updateGameType(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && (data.query.code || data.query.name) && data.update);
            socketUtil.emitter(self.socket, dbGameType.updateGameType, [data.query, data.update], actionName, isValidData);
        },
        deleteGameTypeByName: function deleteGameTypeByName(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name);
            socketUtil.emitter(self.socket, dbGameType.deleteGameTypeByQuery, [{name: data.name}], actionName, isValidData);
        },
        /**
         * Get all games by Provider and Platform
         *  @param {json} data - Query data. It has to contain  _id of gameProvider and _id of game Platform
         */
        getGamesByPlatformAndProvider: function getGamesByPlatformAndProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.provider);
            socketUtil.emitter(self.socket, dbGame.getGamesByPlatformAndProvider, [data.platform, data.provider], actionName, isValidData);
        },

        /**
         * Get games from game provider but not attached to platform
         * @param {json} data - Query data. It has to contain  platform and provider
         */
        getGamesNotAttachedToPlatform: function getGamesNotAttachedToPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.provider);
            socketUtil.emitter(self.socket, dbGame.getGamesNotAttachedToPlatform, [data.platform, data.provider], actionName, isValidData);
        },

        /**
         * Get all game status
         */
        getAllGameStatus: function getAllGameStatus() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constGameStatus});
        },

        /**
         * Get game consumption record
         * @param {json} data - Query data. It has to contain providerObjId
         */
        getPagedGameConsumptionRecord: function getPagedGameConsumptionRecord(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.gameId);
            var argArr = [data, null, null, ObjectId(data.gameId), data.index, data.limit, data.sortCol];
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getPagedGameProviderConsumptionRecord, argArr, actionName, isValidData);
        },

        modifyGamePassword: function modifyGamePassword(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.providerId && data.newPassword);
            let argArr = [data.playerId, data.providerId, data.newPassword, data.creator];
            socketUtil.emitter(self.socket, dbGame.modifyGamePassword, argArr, actionName, isValidData);
        }
    };
    socketActionGame.actions = this.actions;
};

module.exports = socketActionGame;