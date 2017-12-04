/**
 * Created by hninpwinttin on 14/1/16.
 */
var encrypt = require('./../modules/encrypt');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbPlayerPartner = require('./../db_modules/dbPlayerPartner');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbPlayerConsumptionRecord = require('./../db_modules/dbPlayerConsumptionRecord');
let dbPlayerConsumptionDaySummary = require('./../db_modules/dbPlayerConsumptionDaySummary');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbGameProviderPlayerDaySummary = require('./../db_modules/dbGameProviderPlayerDaySummary');
let dbPlayerRewardPoints = require('../db_modules/dbPlayerRewardPoints');
let dbApiLog = require('./../db_modules/dbApiLog');
var socketUtil = require('./../modules/socketutility');
var utility = require('./../modules/encrypt');
var constPlayerStatus = require('./../const/constPlayerStatus');
var constPlayerTrustLevel = require('./../const/constPlayerTrustLevel');
var constPlayerPermission = require('./../const/constPlayerPermissions');
var constSystemParam = require('../const/constSystemParam');
var constDepositMethod = require('../const/constDepositMethod');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var queryPhoneLocation = require('query-mobile-phone-area');
var dbUtil = require('./../modules/dbutility');
var smsAPI = require('../externalAPI/smsAPI');
var cpmsAPI = require('../externalAPI/cpmsAPI');
let pmsAPI = require('../externalAPI/pmsAPI');
var Chance = require('chance');
var chance = new Chance();

function socketActionPlayer(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    this.actions = {

        /**
         * Create new player by player data
         * @param {json} data - Player data. It has to contain correct data format
         */
        createPlayer: function createPlayer(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.password && data.password.length >= constSystemParam.PASSWORD_LENGTH && (!data.realName || data.realName.match(/\d+/g) === null));
            if (data.phoneNumber) {
                var queryRes = queryPhoneLocation(data.phoneNumber);
                if (queryRes) {
                    data.phoneProvince = queryRes.province;
                    data.phoneCity = queryRes.city;
                    data.phoneType = queryRes.type;
                }
            }
            socketUtil.emitter(self.socket, dbPlayerInfo.createPlayerInfoAPI, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        },

        /**
         * Create new player and partner by player data
         * @param {json} data - Player data. It has to contain correct data format
         */
        createPlayerPartner: function createPlayerPartner(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.name && data.password && data.password.length >= constSystemParam.PASSWORD_LENGTH && (!data.realName || data.realName.match(/\d+/g) === null));
            if (data.phoneNumber) {
                var queryRes = queryPhoneLocation(data.phoneNumber);
                if (queryRes) {
                    data.phoneProvince = queryRes.province;
                    data.phoneCity = queryRes.city;
                    data.phoneType = queryRes.type;
                }
            }
            socketUtil.emitter(self.socket, dbPlayerPartner.createPlayerPartner, [data], actionName, isValidData);
        },

        /**
         * Create a new reward points record based on player data
         */
        createPlayerRewardPointsRecord: function createPlayerRewardPointsRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlayerInfo.createPlayerRewardPointsRecord, [data.platformId, data.data.playerId, data.data.points, data.data.playerName, data.data.playerLevel, data.data.progress], actionName, isValidData);
        },

        /**
         * Update player info with reward points record based on player id and platform id
         */
        upsertPlayerInfoRewardPointsObjId: function upsertPlayerInfoRewardPointsObjId(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.platformId && data.rewardPointsObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.upsertPlayerInfoRewardPointsObjId, [data.playerId, data.platformId, data.rewardPointsObjId], actionName, isValidData);
        },

        /**
         * Get player reward points record based on player rewardPointsObjId
         */
        getPlayerRewardPointsRecord: function getPlayerRewardPointsRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.rewardPointsObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerRewardPointsRecord, [data.rewardPointsObjId], actionName, isValidData);
        },

        /**
         * Get player reward points record based on player rewardPointsObjId
         */
        updatePlayerRewardPointsRecord: function updatePlayerRewardPointsRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.rewardPointsObjId && data.finalValidAmount);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerRewardPointsRecord, [data.rewardPointsObjId, data.finalValidAmount], actionName, isValidData);
        },

        /**
         * Create a test player for platform
         * @param {json} data - It has to contain platform id
         */
        createTestPlayerForPlatform: function createTestPlayerForPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerInfo.createTestPlayerForPlatform, [data.platformId], actionName, isValidData);
        },

        /**
         * Create player info by playerId or _id
         * @param {json} data - It has to contain playerId or _id
         */
        getPlayerInfo: function getPlayerInfo(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id || data.playerId));
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerInfo, [data], actionName, isValidData);
        },
        getOnePlayerInfo: function getOnePlayerInfo(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id || data.playerId));
            socketUtil.emitter(self.socket, dbPlayerInfo.getOnePlayerInfo, [data], actionName, isValidData);
        },
        getOnePlayerCardGroup: function getOnePlayerCardGroup(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id || data.playerId));
            socketUtil.emitter(self.socket, dbPlayerInfo.getOnePlayerCardGroup, [data], actionName, isValidData);
        },

        /**
         * Create player phone number by object id
         * @param {json} data - It has to contain _id
         */
        getPlayerPhoneNumber: function getPlayerPhoneNumber(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPhoneNumber, [data.playerObjId], actionName, isValidData);
        },

        /**
         * Get all player status options
         */
        getPlayerStatusList: function getPlayerStatusList() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerStatus});
        },

        /**
         * Update player info by query with playerId or _id and updateData
         * @param {json} data - It has to contain query string and updateData
         */
        updatePlayer: function updatePlayer(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            if (data.phoneNumber) {
                var queryRes = queryPhoneLocation(data.phoneNumber);
                if (queryRes) {
                    data.updateData.phoneProvince = queryRes.province;
                    data.updateData.phoneCity = queryRes.city;
                    data.updateData.phoneType = queryRes.type;
                }
            }
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerInfo, [data.query, data.updateData], actionName, isValidData);
        },

        updatePlayerPermission: function updatePlayerPermission(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.query.platform && data.query._id && data.admin && data.permission && data.remark);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerPermission, [data.query, data.admin, data.permission, data.remark], actionName, isValidData);
        },
        /**
         * Update player info by query with playerId or _id and updateData
         * @param {json} data - It has to contain query string and updateData
         */
        updatePlayerPayment: function updatePlayerPayment(data) {
            let userAgent = "";
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerPayment, [userAgent, data.query, {forbidTopUpType: data.updateData.forbidTopUpType}, true], actionName, isValidData);
        },

        /**
         * Update player status
         * @param {json} data - It has to contain _id, status and reason
         */
        updatePlayerStatus: function updatePlayerStatus(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id && data.status && data.reason);
            // if  Status is back to normal , empty the ForbidGame list
            if (data.status == constPlayerStatus.NORMAL) {
                data.forbidProviders = [];
            }
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerStatus, [data._id, data.status, data.reason, data.forbidProviders, data.adminName], actionName, isValidData);
        },

        updatePlayerForbidProviders: function updatePlayerForbidProviders(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.forbidProviders);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerForbidProviders, [data._id, data.forbidProviders], actionName, isValidData);
        },

        updatePlayerForbidRewardEvents: function updatePlayerForbidRewardEvents(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.forbidRewardEvents);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerForbidRewardEvents, [data._id, data.forbidRewardEvents], actionName, isValidData);
        },

        /**
         * Delete player infos by _ids
         * @param {json} data - It has to contain _ids(array of player object id)
         */
        deletePlayersById: function deletePlayersById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbPlayerInfo.deletePlayers, [data._ids], actionName, isValidData);
        },

        /**
         * get player infos by platform _id
         * @param {json} data - It has to contain  object id of platform
         */
        getPlayersByPlatform: function getPlayersByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayersByPlatform, [data.platform, data.count], actionName, isValidData);
        },
        getPlayersCountByPlatform: function getPlayersCountByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayersCountByPlatform, [data.platform], actionName, isValidData);
        },

        /**
         * handle player top up
         * @param {json} data - It has to contain playerId and amount
         */
        playerTopUp: function playerTopUp(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && typeof data.amount === 'number' && data.amount > 0);
            socketUtil.emitter(self.socket, dbPlayerInfo.playerTopUp, [data.playerId, data.amount], actionName, isValidData);
        },

        /**
         * handle player in game purchase action
         * @param {json} data - It has to contain  object id of platform
         */
        playerPurchase: function playerPurchase(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.gameId && typeof data.amount === 'number' && data.amount >= 0);
            socketUtil.emitter(self.socket, dbPlayerInfo.playerPurchase, [data.playerId, data.gameId, data.amount], actionName, isValidData);
        },

        /**
         * get player consumption records
         * @param {json} data - It has to contain playerid
         */
        getPlayerConsumptionRecords: function getPlayerConsumptionRecords(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerConsumptionRecords, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * get player's daily consumption summary records
         * @param {json} data - It has to contain playerid
         */
        getGameProviderPlayerDaySummary: function getGameProviderPlayerDaySummary(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbGameProviderPlayerDaySummary.getPlayerDailyExpenseSummary, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * get player top up records
         * @param {json} data - It has to contain player id
         */
        getPlayerTopUpRecords: function getPlayerTopUpRecords(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerTopUpRecords, [data, data.filterDirty], actionName, isValidData);
        },
        getPagePlayerTopUpRecords: function getPagePlayerTopUpRecords(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            data.startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            data.endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPagePlayerTopUpRecords, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * get player's credit change logs
         * @param {json} data - It has to contain  object id of platform
         */
        getPlayerCreditChangeLogs: function getPlayerCreditChangeLogs(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerCreditChangeLogs, [data.playerId], actionName, isValidData);
        },

        getPlayerCreditChangeLogsByQuery: function getPlayerCreditChangeLogsByQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            var limit = data.limit ? (data.limit < 0 ? 0 : data.limit) : constSystemParam.MIN_RECORD_NUM;
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerCreditChangeLogsByQuery, [data, limit], actionName, isValidData);
        },

        getPagedPlayerCreditChangeLogs: function getPagedPlayerCreditChangeLogs(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPagedPlayerCreditChangeLogs, [data, data.startTime, data.endTime, data.index, data.limit, data.sortCol], actionName, isValidData);
        },
        /**
         * get players by more than one filter
         * @param {json} data - It has to contain the query fields
         */
        getPlayerByAdvanceQuery: function getPlayerByAdvanceQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data.query && data.platformId);
            var query = utility.buildPlayerQueryString(data.query);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerByAdvanceQuery, [data.platformId, query], actionName, isValidData);
        },
        getPagePlayerByAdvanceQuery: function getPagePlayerByAdvanceQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data.query && data.platformId && data.index != null && data.limit);
            var query = utility.buildPlayerQueryString(data.query);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPagePlayerByAdvanceQuery, [data.platformId, query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },
        getPlayerForAttachGroup: function getPlayerForAttachGroup(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data.query && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPaymentPlayerByAdvanceQuery, [data.platformId, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        /**
         * generate random player password
         * @param {Object} data - It has to contain  object id of player
         */
        resetPlayerPassword: function resetPlayerPassword(data) {
            let actionName = arguments.callee.name;
            let newPassword = (data && data.newPassword) ? data.newPassword : chance.hash({length: constSystemParam.PASSWORD_LENGTH});
            let isValidData = Boolean(data && data.playerId && newPassword && newPassword.length >= 6);
            socketUtil.emitter(self.socket, dbPlayerInfo.resetPlayerPassword, [data.playerId, newPassword, data.platform, data.resetPartnerPassword], actionName, isValidData);
        },

        // /**
        //  *  player login
        //  * @param {json} data - It has to contain  name and password and some more additional info
        //  * TODO: modify the params in future
        //  */
        // playerLogin: function playerLogin(data) {
        //     var actionName = arguments.callee.name;
        //     var isValidData = Boolean(data && data.name && data.password && data.lastLoginIp);
        //     socketUtil.emitter(self.socket, dbPlayerInfo.playerLogin, [data], actionName, isValidData);
        // },
        /**
         * player logout
         * @param {json} data - It has to contain  name and of the player
         * TODO: modify the params in future
         */
        playerLogout: function playerLogout(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.playerLogout, [data], actionName, isValidData);
        },
        /**
         * get the recent active players - playing until now
         * @param {json} data - The total no of players to be returned
         */
        getActivePlayers: function getActivePlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.noOfPlayers);
            socketUtil.emitter(self.socket, dbPlayerInfo.getActivePlayers, [data.noOfPlayers, data.platform], actionName, isValidData);
        },

        getLoggedInPlayers: function getLoggedInPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.noOfPlayers);
            socketUtil.emitter(self.socket, dbPlayerInfo.getLoggedInPlayers, [data.noOfPlayers, data.name, data.platform], actionName, isValidData);
        },

        /**
         * get cahnge history for players
         * @param {json} data - contains platform, playerId
         */
        getPlayerPermissionLog: function getPlayerPermissionLog(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPermissionLog, [data.platform, data.playerId, data.createTime], actionName, isValidData);
        },

        getPlayerReferrals: function getPlayerReferrals(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerReferrals, [data.platform, data.playerObjId, data.index, data.limit, data.sortObj], actionName, isValidData);
        },

        /**
         * get the list of all player trust levels defined in the system
         * @param data
         */
        getPlayerTrustLevelList: function getPlayerTrustLevelList(data) {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constPlayerTrustLevel});
        },

        /**
         * get the total count of current active players
         * @param {json} data - The total no of players to be returned
         */
        getCurrentActivePlayersCount: function getCurrentActivePlayersCount(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getCurrentActivePlayersCount, [data.platform], actionName, isValidData);
        },

        getLoggedInPlayersCount: function getLoggedInPlayersCount(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getLoggedInPlayersCount, [data.platform], actionName, isValidData);
        },

        /**
         * Transfer player's credit from game provider to platform
         * @param {json} data - data contains platform, playerId and amount
         */
        transferPlayerCreditToProvider: function transferPlayerCreditToProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.playerId && data.providerId && typeof(data.amount) === 'number');
            socketUtil.emitter(self.socket, dbPlayerInfo.transferPlayerCreditToProvider, [data.playerId, data.platform, data.providerId, data.amount, data.adminName], actionName, isValidData);
        },

        transferPlayerCreditFromProvider: function transferPlayerCreditFromProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.playerId && data.providerId && typeof(data.amount) === 'number');
            socketUtil.emitter(self.socket, dbPlayerInfo.transferPlayerCreditFromProvider, [data.playerId, data.platform, data.providerId, data.amount, data.adminName], actionName, isValidData);
        },

        /**
         * Player apply for game provider reward event
         * @param {json} data - data contains platform, playerId
         */
        applyForGameProviderReward: function applyForGameProviderReward(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.applyForGameProviderReward, [data.platform, data.playerId], actionName, isValidData);
        },

        /**
         * Get player status change log
         * @param {json} data - data contains _id
         */
        getPlayerStatusChangeLog: function getPlayerStatusChangeLog(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerStatusChangeLog, [data._id], actionName, isValidData);
        },
        /**
         * Get new player count
         * @param {json} data - data contains _id
         */
        countNewPlayerbyPlatform: function countNewPlayerbyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countNewPlayerbyPlatform, [ObjectId(data.platformId), startTime, endTime, data.period], actionName, isValidData);
        },

        countNewPlayerAllPlatform: function countNewPlayerAllPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerInfo.countDailyNewPlayerByPlatform, [platform, startTime, endTime], actionName, isValidData);
        },

        countPlayerBonusAllPlatform: function countPlayerBonusAllPlatform(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerInfo.countDailyPlayerBonusByPlatform, [platform, startTime, endTime], actionName, isValidData);
        },
        /**
         * Get active player count
         * @param {json} data - data contains _id
         */
        countActivePlayerbyPlatform: function countActivePlayerbyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countActivePlayerbyPlatform, [ObjectId(data.platformId), startTime, endTime], actionName, isValidData);
        },
        /**
         * Get total count of consumptionAmount or topUpAmount by a platform
         * @param {json} data - data contains platformId
         */
        countTopUpORConsumptionbyPlatform: function countTopUpORConsumptionbyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period && data.type);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countTopUpORConsumptionByPlatform, [ObjectId(data.platformId), startTime, endTime, data.period, data.type], actionName, isValidData);
        },

        countTopUpORConsumptionAllPlatform: function countTopUpORConsumptionAllPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.type);
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerInfo.dashboardTopupORConsumptionGraphData, [platform, 'day', data.type], actionName, isValidData);
        },

        /**
         * Get new player count for all the platforms within the time frame
         * @param {json} data - data contains start time , end time
         */
        countNewPlayers: function countNewPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerInfo.countNewPlayersAllPlatform, [startTime, endTime, platform], actionName, isValidData);
        },

        /**
         * Get active player count
         * @param {json} data - data contains _id
         */
        countActivePlayerALLPlatform: function countActivePlayerALLPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.date);
            var startTime = data.date ? dbUtil.getDayStartTime(data.date) : new Date(0);
            var endTime = data.date ? dbUtil.getDayEndTime(data.date) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countActivePlayerALLPlatform, [startTime, endTime], actionName, isValidData);
        },

        /**
         * Get total player consumption amount for all the platforms within the time frame
         * @param {json} data - data contains start time , end time
         *  result - total consumption of all players in each platform
         */
        getPlayerConsumptionSumForAllPlatform: function getPlayerConsumptionSumForAllPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getConsumptionTotalAmountForAllPlatform, [startTime, endTime, platform], actionName, isValidData);
        },

        getPlayersConsumptionDaySumForAllPlatform: function getPlayersConsumptionDaySumForAllPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerConsumptionDaySummary.getPlayersConsumptionSumForAllPlatform, [startTime, endTime, platform], actionName, isValidData);
        },

        /**
         * Get total player topUp amount for all the platforms within the time frame
         * @param {json} data - data contains start time , end time
         * result - total topUp amount of all players in each platform
         */
        getTopUpTotalAmountForAllPlatform: function getTopUpTotalAmountForAllPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.getTopUpTotalAmountForAllPlatform, [startTime, endTime, platform], actionName, isValidData);
        },

        getPlayerTotalConsumptionForTimeFrame: function getPlayerTotalConsumptionForTimeFrame(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.playerId);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getPlayerTotalConsumptionForTimeFrame, [startTime, endTime, ObjectId(data.playerId), ObjectId(data.platformId), true], actionName, isValidData);
        },

        checkPlayerNameValidity: function checkPlayerNameValidity(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.name);
            socketUtil.emitter(self.socket, dbPlayerInfo.isPlayerNameValidToRegister, [{
                platform: data.platform,
                name: data.name
            }], actionName, isValidData);

        },
        getSimilarPlayers: function getSimilarPlayers(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getSimilarPlayers, [data.playerId], actionName, isValidData);
        },
        /**
         * getPlayerPhoneLocation
         * @param {json} data - It has to contain _id of platform)
         */
        getPlayerPhoneLocation: function getPlayerPhoneLocation(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.startTime && data.endTime && data.player && data.date);
            var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
            var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPhoneLocation, [ObjectId(data.platform), startTime, endTime, data.player, data.date], actionName, isValidData);
        },

        /**
         * getPlayerPhoneLocation
         * @param {json} data - It has to contain _id of platform)
         */
        getPlayerPhoneLocationInProvince: function getPlayerPhoneLocationInProvince(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.startTime && data.endTime && data.player && data.date && data.phoneProvince);
            var startTime = data.startTime ? dbUtil.getDayStartTime(data.startTime) : new Date(0);
            var endTime = data.endTime ? dbUtil.getDayEndTime(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPhoneLocation, [ObjectId(data.platform), startTime, endTime, data.player, data.date, data.phoneProvince], actionName, isValidData);
        },
        /**
         * get player device data
         */
        getPlayerDeviceAnalysisData: function getPlayerDeviceAnalysisData(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.type);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDeviceAnalysisData, [ObjectId(data.platformId), data.type, startTime, endTime], actionName, isValidData);
        },
        /**
         *  apply Manual TopUp
         */
        applyManualTopUpRequest: function applyManualTopUpRequest(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.amount && data.amount > 0 && data.depositMethod && data.lastBankcardNo && data.provinceId && data.cityId);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.addManualTopupRequest, [userAgent, data.playerId, data, "ADMIN", getAdminId(), getAdminName(), data.fromFPMS], actionName, isValidData);
        },
        /**
         *  Get deposit methods
         */
        getDepositMethodList: function getDepositMethodList() {
            var actionName = arguments.callee.name;
            self.socket.emit("_" + actionName, {success: true, data: constDepositMethod});
        },
        /**
         *  Apply player bonus
         */
        applyBonusRequest: function applyBonusRequest(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.bonusId && data.amount);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerInfo.applyBonus, [userAgent, data.playerId, data.bonusId, data.amount, data.honoreeDetail, data.bForce, {
                type: "admin",
                name: getAdminName(),
                id: getAdminId()
            }], actionName, isValidData);
        },

        applyRewardEvent: function applyRewardEvent(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.code && data.data);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerInfo.applyRewardEvent, [userAgent, data.playerId, data.code, data.data, getAdminId(), getAdminName()], actionName, isValidData);
        },

        getPlayerTransferErrorLogs: function getPlayerTransferErrorLogs(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerTransferErrorLog, [data.playerObjId], actionName, isValidData);
        },

        searchMailLog: function searchMailLog(data) {
            var actionName = arguments.callee.name;
            // Optional: startTime, endTime
            // Bad: anything else!
            var isValidData = Boolean(data && (data.senderId || data.recipientId));
            // It might be good to restrict the search to the admin's allowed platforms
            socketUtil.emitter(self.socket, dbPlatform.searchMailLog, [data], actionName, isValidData);
        },

        pushNotification: function pushNotification(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.appKey != null && data.masterKey != null && data.tittle != null && data.text != null);
            console.log("pushNotification: " + JSON.stringify(data));
            socketUtil.emitter(self.socket, dbPlatform.pushNotification, [data], actionName, isValidData);
        },

        sendSMSToPlayer: function sendSMSToPlayer(data) {
            var actionName = arguments.callee.name;
            var adminObjId = getAdminId();
            var adminName = getAdminName();
            var isValidData = Boolean(data && data.channel != null && (data.platformId != null || data.partnerId != null) && data.message && adminObjId && adminName);
            if (data) {
                data.delay = data.delay || 0;
            }
            socketUtil.emitter(self.socket, dbPlatform.sendSMS, [adminObjId, adminName, data], actionName, isValidData);
        },

        sentSMSToNewPlayer: function sentSMSToNewPlayer(data) {
            var actionName = arguments.callee.name;
            var adminObjId = getAdminId();
            var adminName = getAdminName();
            var isValidData = Boolean(data && data.channel != null && (data.platformId != null ) && data.message && adminObjId && adminName);
            if (data) {
                data.delay = data.delay || 0;
            }
            socketUtil.emitter(self.socket, dbPlatform.sendNewPlayerSMS, [adminObjId, adminName, data], actionName, isValidData);
        },

        searchSMSLog: function searchSMSLog(data) {
            var actionName = arguments.callee.name;
            // Optional: status, startTime, endTime
            // Bad: anything else!
            var isValidData = Boolean(data);
            // It might be good to restrict the search to the admin's allowed platforms
            socketUtil.emitter(self.socket, dbPlatform.searchSMSLog, [data, data.index, data.limit], actionName, isValidData);
        },

        getSMSChannelList: function getSMSChannelList(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, smsAPI.channel_getChannelList, [data], actionName, true);
        },
        vertificationSMSQuery: function vertificationSMSQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlatform.vertificationSMS, [data, data.index, data.limit], actionName, isValidData);
        },
        verifyPlayerPhoneNumber: function verifyPlayerPhoneNumber(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerObjId != null && data.phoneNumber != null);
            socketUtil.emitter(self.socket, dbPlayerInfo.verifyPlayerPhoneNumber, [data.playerObjId, data.phoneNumber], actionName, isValidData);
        },

        // Manual TopUp
        getManualTopupRequestList: function getManualTopupRequestList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId != null);
            socketUtil.emitter(self.socket, dbPlayerInfo.getManualTopupRequestList, [data.playerId], actionName, isValidData);
        },

        cancelManualTopupRequest: function cancelManualTopupRequest(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId != null && data.proposalId != null);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.cancelManualTopupRequest, [data.playerId, data.proposalId, getAdminName()], actionName, isValidData);
        },

        // Alipay TopUp
        getAlipayTopUpRequestList: function getAlipayTopUpRequestList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId !== null);
            socketUtil.emitter(self.socket, dbPlayerInfo.getAlipayTopupRequestList, [data.playerId], actionName, isValidData);
        },

        applyAlipayTopUpRequest: function applyAlipayTopUpRequest(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.amount && data.alipayName && data.alipayAccount);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.requestAlipayTopup, [userAgent, data.playerId, data.amount, data.alipayName, data.alipayAccount, data.bonusCode, 'ADMIN', getAdminId(), getAdminName(), data.remark, data.createTime], actionName, isValidData);
        },

        cancelAlipayTopup: function cancelAlipayTopup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data.playerId && data.proposalId);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.cancelAlipayTopup, [data.playerId, data.proposalId, getAdminName()], actionName, isValidData);
        },

        // WechatPay TopUp
        getWechatPayTopUpRequestList: function getWechatPayTopUpRequestList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId !== null);
            socketUtil.emitter(self.socket, dbPlayerInfo.getWechatTopupRequestList, [data.playerId], actionName, isValidData);
        },

        applyWechatPayTopUpRequest: function applyWechatPayTopUpRequest(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.amount && data.wechatPayAccount);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.requestWechatTopup, [userAgent, data.playerId, data.amount, data.wechatPayName, data.wechatPayAccount, data.bonusCode, 'ADMIN', getAdminId(), getAdminName(), data.remark, data.createTime], actionName, isValidData);
        },

        cancelWechatPayTopup: function cancelWechatPayTopup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data.playerId && data.proposalId);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.cancelWechatTopup, [data.playerId, data.proposalId, getAdminName()], actionName, isValidData);
        },

        // Quickpay TopUp
        getQuickpayTopUpRequestList: function getQuickpayTopUpRequestList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId !== null);
            socketUtil.emitter(self.socket, dbPlayerInfo.getQuickpayTopUpRequestList, [data.playerId], actionName, isValidData);
        },

        applyQuickpayTopUpRequest: function applyQuickpayTopUpRequest(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.amount && data.quickpayName && data.quickpayAccount);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.requestQuickpayTopup, [data.playerId, data.amount, data.quickpayName, data.quickpayAccount, 'ADMIN', getAdminId(), getAdminName(), data.remark, data.createTime], actionName, isValidData);
        },

        cancelQuickpayTopup: function cancelQuickpayTopup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data.playerId && data.proposalId);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.cancelQuickpayTopup, [data.playerId, data.proposalId], actionName, isValidData);
        },

        verifyPlayerBankAccount: function verifyPlayerBankAccount(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerObjId != null && data.bankAccount != null);
            socketUtil.emitter(self.socket, dbPlayerInfo.verifyPlayerBankAccount, [data.playerObjId, data.bankAccount], actionName, isValidData);
        },

        getPagePlayerByAdvanceQueryWithTopupTimes: function getPagePlayerByAdvanceQueryWithTopupTimes(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data.query && data.platformId && data.index != null && data.limit);
            var query = utility.buildPlayerQueryString(data.query);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPagePlayerByAdvanceQueryWithTopupTimes, [data.platformId, query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getValidTopUpRecordList: function getValidTopUpRecordList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data.reward && data.playerId && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.getValidTopUpRecordList, [data.reward, data.playerId, data.playerObjId], actionName, isValidData);
        },

        getGameCreditLog: function getGameCreditLog(data) {
            var actionName = arguments.callee.name;
            console.log("getGameCreditLog: " + data);
            var isValidData = Boolean(data.playerName && data.platformId && data.providerId && data.startDate && data.endDate && data.page);
            socketUtil.emitter(self.socket, cpmsAPI.player_getCreditLog, [data], actionName, isValidData);
        },

        getPagedPlatformCreditTransferLog: function getPagedPlatformCreditTransferLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbPlatform.getPagedPlatformCreditTransferLog, [data.playerName, data.startTime, data.endTime, data.provider, data.type, data.index, data.limit, data.sortCol, data.status, data.PlatformObjId], actionName, isValidData);
        },

        requestClearProposalLimit: function requestClearProposalLimit(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.username);
            let username = data.username || '';
            socketUtil.emitter(self.socket, pmsAPI.payment_requestClearProposalLimits, [{username: username}], actionName, isValidData);
        },

        getPlayerCreditsDaily: function getPlayerCreditsDaily(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerCreditsDaily, [data.playerId, data.from, data.to, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getPlayerApiLog: function getPlayerApiLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId && data.startDate && data.endDate);
            socketUtil.emitter(self.socket, dbApiLog.getPlayerApiLog, [data.playerObjId, data.startDate, data.endDate, data.action, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        transferAllPlayersCreditFromProvider: function transferAllPlayersCreditFromProvider(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.playerId && data.providerId && typeof(data.amount) === 'number');
            socketUtil.emitter(self.socket, dbPlayerInfo.transferAllPlayersCreditFromProvider, [data.platform, data.providerId, data.adminName], actionName, isValidData);
        },

        updatePlayerReferral: function updatePlayerReferral(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId && data.referral);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerReferral, [data.playerObjId, data.referral], actionName, isValidData);
        },
        getBonusRequestList: function getBonusRequestList(data){
            var isValidData = Boolean(data);
            let actionName = arguments.callee.name;
            data = data || {};
            data.startIndex = data.startIndex || 0;
            data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
            var startDate = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endDate = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getAllAppliedBonusList, [data.platform, data.startIndex, data.requestCount, startDate, endDate, data.status, !data.sort], actionName, isValidData);
        },
        getAnalysisSingleBonusRequestList: function getAnalysisSingleBonusRequestList(data){
            var isValidData = Boolean(data);
            let actionName = arguments.callee.name;
            data = data || {};
            data.startIndex = data.startIndex || 0;
            data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
            var startDate = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endDate = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            var period = data.period
            socketUtil.emitter(self.socket, dbPlayerInfo.countDailyPlayerBonusBySinglePlatform, [data.platform, startDate, endDate, data.period, !data.sort], actionName, isValidData);
        },
        getAnalysisBonusRequestList: function getAnalysisBonusRequestList(data){
            console.log(data);
            var isValidData = Boolean(data);
            let actionName = arguments.callee.name;
            data = data || {};
            data.startIndex = data.startIndex || 0;
            data.requestCount = data.requestCount || constSystemParam.MAX_RECORD_NUM;
            var startDate = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endDate = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countBonusAmountALLPlatform,   [startDate, endDate, !data.sort], actionName, isValidData);
        },
        updatePlayerCredibilityRemark: function updatePlayerCredibilityRemark(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.admin && data.platformObjId && data.playerObjId && data.remarks);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerCredibilityRemark, [data.admin, data.platformObjId, data.playerObjId, data.remarks, data.comment], actionName, isValidData);
        },

        createUpdateTopUpGroupLog: function createUpdateTopUpGroupLog(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.adminId);
            socketUtil.emitter(self.socket, dbPlayerInfo.createUpdateTopUpGroupLog, [data.playerId,data.adminId, data.topUpGroup, data.remark], actionName, isValidData);
        },

        getPlayerTopUpGroupLog: function getPlayerTopUpGroupLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId);
            let index = data.index || 0;
            let limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerTopUpGroupLog, [data.playerId, index, limit], actionName, isValidData);
        },

        createForbidRewardLog: function createForbidRewardLog(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.adminId && data.forbidRewardNames);
            socketUtil.emitter(self.socket, dbPlayerInfo.createForbidRewardLog, [data.playerId, data.adminId, data.forbidRewardNames, data.remark], actionName, isValidData);
        },

        getForbidRewardLog: function getForbidRewardLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbPlayerInfo.getForbidRewardLog, [data.playerId, data.startTime, data.endTime, index, limit], actionName, isValidData);
        },

        createForbidGameLog: function createForbidGameLog(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.adminId && data.forbidGameNames);
            socketUtil.emitter(self.socket, dbPlayerInfo.createForbidGameLog, [data.playerId, data.adminId, data.forbidGameNames, data.remark], actionName, isValidData);
        },

        getForbidGameLog: function getForbidGameLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbPlayerInfo.getForbidGameLog, [data.playerId, data.startTime, data.endTime, index, limit], actionName, isValidData);
        },

        createForbidTopUpLog: function createForbidTopUpLog(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.adminId && data.forbidTopUpNames);
            socketUtil.emitter(self.socket, dbPlayerInfo.createForbidTopUpLog, [data.playerId, data.adminId, data.forbidTopUpNames, data.remark], actionName, isValidData);
        },

        getForbidTopUpLog: function getForbidTopUpLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbPlayerInfo.getForbidTopUpLog, [data.playerId, data.startTime, data.endTime, index, limit], actionName, isValidData);
        },

        comparePhoneNum: function comparePhoneNum(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayInputPhone);
            socketUtil.emitter(self.socket, dbPlayerInfo.comparePhoneNum, [data.filterAllPlatform, data.platformObjId, data.arrayInputPhone], actionName, isValidData);
        },

        uploadPhoneFileCSV: function uploadPhoneFileCSV(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayPhoneCSV);
            socketUtil.emitter(self.socket, dbPlayerInfo.uploadPhoneFileCSV, [data.filterAllPlatform, data.platformObjId, data.arrayPhoneCSV], actionName, isValidData);
        },

        uploadPhoneFileTXT: function uploadPhoneFileTXT(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayPhoneTXT);
            socketUtil.emitter(self.socket, dbPlayerInfo.uploadPhoneFileTXT, [data.filterAllPlatform, data.platformObjId, data.arrayPhoneTXT], actionName, isValidData);
        },

        uploadPhoneFileXLS: function uploadPhoneFileXLS(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayPhoneXLS);
            socketUtil.emitter(self.socket, dbPlayerInfo.uploadPhoneFileXLS, [data.filterAllPlatform, data.platformObjId, data.arrayPhoneXLS], actionName, isValidData);
        },

        convertRewardPointsToCredit: function convertRewardPointsToCredit(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.convertRewardPointsAmount);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerRewardPoints.convertRewardPointsToCredit, [data.playerId, data.convertRewardPointsAmount, data.remark , getAdminId(), getAdminName()], actionName, isValidData);
        },

    };
    socketActionPlayer.actions = this.actions;
}

module.exports = socketActionPlayer;
