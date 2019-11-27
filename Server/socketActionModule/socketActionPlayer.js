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
let dbRewardPointsLog = require('./../db_modules/dbRewardPointsLog');
let dbDemoPlayer = require('./../db_modules/dbDemoPlayer');
let dbPlayerPayment = require('../db_modules/dbPlayerPayment');
var socketUtil = require('./../modules/socketutility');
var utility = require('./../modules/encrypt');
var constPlayerStatus = require('./../const/constPlayerStatus');
var constPlayerTrustLevel = require('./../const/constPlayerTrustLevel');
var constPlayerPermission = require('./../const/constPlayerPermissions');
var constPlayerRegistrationInterface = require('./../const/constPlayerRegistrationInterface');
var constSystemParam = require('../const/constSystemParam');
var constDepositMethod = require('../const/constDepositMethod');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var queryPhoneLocation = require('cellocate');
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
                    data.phoneType = queryRes.sp;
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
                    data.phoneType = queryRes.sp;
                }
            }
            socketUtil.emitter(self.socket, dbPlayerPartner.createPlayerPartner, [data], actionName, isValidData);
        },

        /**
         * Remove a new reward points record based on player data
         */
        removePlayerRewardPointsRecord: function removePlayerRewardPointsRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.playerId && data.rewardPointsObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.removePlayerRewardPointsRecord, [data.platformId, data.playerId, data.rewardPointsObjId], actionName, isValidData);
        },


        /**
         * Get player reward points record based on player rewardPointsObjId
         */
        updatePlayerRewardPointsRecord: function updatePlayerRewardPointsRecord(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId && data.platformObjId && data.updateAmount);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerRewardPointsRecord, [data.playerObjId, data.platformObjId, data.updateAmount, data.remark, getAdminName(), getAdminId()], actionName, isValidData);
        },

        /**
         * Get player reward points conversion rate
         */
        getPlayerRewardPointsConversionRate: function getPlayerRewardPointsConversionRate(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerLevel);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerRewardPointsConversionRate, [data.platformObjId, data.playerLevel], actionName, isValidData);
        },

        /**
         * Get player reward points daily limit
         */
        getPlayerRewardPointsDailyLimit: function getPlayerRewardPointsDailyLimit(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerLevel);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerRewardPointsDailyLimit, [data.platformObjId, data.playerLevel], actionName, isValidData);
        },

        /**
         * Get player reward points daily converted points
         */
        getPlayerRewardPointsDailyConvertedPoints: function getPlayerRewardPointsDailyConvertedPoints(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.rewardPointsObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerRewardPointsDailyConvertedPoints, [data.rewardPointsObjId], actionName, isValidData);
        },

        /**
         * Create a test player for platform (to be deprecated)
         * @param {json} data - It has to contain platform id
         */
        createTestPlayerForPlatform: function createTestPlayerForPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerInfo.createTestPlayerForPlatform, [data.platformId], actionName, isValidData);
        },
        /**
         * Create a test player for platform
         * @param {json} data - It has to contain platform id (not object id)
         */
        createDemoPlayer: function createDemoPlayer(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            let isBackStageGenerated = true;
            socketUtil.emitter(self.socket, dbPlayerInfo.createDemoPlayer, [data.platformId, null, null, null, null, isBackStageGenerated], actionName, isValidData);
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

        getReferralPlayerInfo: function getReferralPlayerInfo(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && (data.name || data._id || data.playerId));
            socketUtil.emitter(self.socket, dbPlayerInfo.getReferralPlayerInfo, [data], actionName, isValidData);
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
                    data.updateData.phoneType = queryRes.sp;
                }
            }
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerInfo, [data.query, data.updateData], actionName, isValidData);
        },
        updateBatchPlayerPermission: function updateBatchPlayerPermission(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.query.playerNames && data.query.platformObjId && data.admin && data.permission && data.remark);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerPermission, [data.query, data.admin, data.permission, data.remark], actionName, isValidData);
        },
        updatePlayerPermission: function updatePlayerPermission(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.query.platform && data.query._id && data.admin && data.permission && data.remark);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerPermission, [data.query, data.admin, data.permission, data.remark, data.selected], actionName, isValidData);
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

        updateBatchPlayerForbidPaymentType: function updateBatchPlayerForbidPaymentType(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerForbidPaymentType, [data.query, data.updateData.forbidTopUpType], actionName, isValidData);
        },

        updatePlayerForbidPaymentType: function updatePlayerForbidPaymentType(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerForbidPaymentType, [data.query, data.updateData.forbidTopUpType], actionName, isValidData);
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

        updateBatchPlayerForbidProviders: function updateBatchPlayerForbidProviders(data) {
            console.log(data);
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerNames && data.platformObjId && data.forbidProviders);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerForbidProviders, [data.platformObjId, data.playerNames, data.forbidProviders], actionName, isValidData);
        },

        updatePlayerForbidRewardEvents: function updatePlayerForbidRewardEvents(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.forbidRewardEvents);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerForbidRewardEvents, [data._id, data.forbidRewardEvents, data.forbidPromoCode, data.forbidLevelUpReward, data.forbidLevelMaintainReward], actionName, isValidData);
        },

        updatePlayerForbidPromoCode: function updatePlayerForbidPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.forbidPromoCodeList);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerForbidPromoCode, [data._id, data.forbidPromoCodeList], actionName, isValidData);
        },

        updateBatchPlayerForbidRewardEvents: function updateBatchPlayerForbidRewardEvents(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerNames && data.forbidRewardEvents);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerForbidRewardEvents, [data.platformObjId, data.playerNames, data.forbidRewardEvents, data], actionName, isValidData);
        },

        updateBatchPlayerForbidPromoCode: function updateBatchPlayerForbidPromoCode(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.playerNames && data.forbidPromoCode);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerForbidPromoCode, [data.platformObjId, data.playerNames, data.forbidPromoCode, data], actionName, isValidData);
        },

        updatePlayerForbidRewardPointsEvent: function updatePlayerForbidRewardPointsEvent(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id && data.forbidRewardPointsEvent);
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerForbidRewardPointsEvent, [data._id, data.forbidRewardPointsEvent], actionName, isValidData);
        },

        updateBatchPlayerForbidRewardPointsEvent: function updateBatchPlayerForbidRewardPointsEvent(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerNames && data.platformObjId && data.forbidRewardPointsEvent);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerForbidRewardPointsEvent, [data.playerNames, data.platformObjId, data.forbidRewardPointsEvent], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbPlayerInfo.resetPlayerPassword, [data.playerId, newPassword, data.platform, data.resetPartnerPassword, null, data.creator], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPermissionLog, [ObjectId(data.platform), ObjectId(data.playerId), data.createTime], actionName, isValidData);
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
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countNewPlayerbyPlatform, [ObjectId(data.platformId), startTime, endTime, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
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
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countActivePlayerbyPlatform, [ObjectId(data.platformId), startTime, endTime, data.period, false, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },

        getOnlineTopupAnalysisDetailUserCount: function getOnlineTopupAnalysisDetailUserCount(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getOnlineTopupAnalysisDetailUserCount, [ObjectId(data.platformId), startTime, endTime, data.period, data.userAgent, data.merchantTopupTypeId, data.analysisCategory, data.merchantTypeId, data.merchantNo], actionName, isValidData);
        },

        /**
         * Get valid active player count
         * @param {json} data - data contains _id
         */
        countValidActivePlayerbyPlatform: function countValidActivePlayerbyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countValidActivePlayerbyPlatform, [ObjectId(data.platformId), startTime, endTime, data.period, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },

        /**
         * Get total count of consumptionAmount by a platform
         * @param {json} data - data contains platformId
         */
        countConsumptionByPlatform: function countConsumptionByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period && data.type && data.providerId);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countConsumptionByPlatform, [ObjectId(data.platformId), startTime, endTime, data.period, data.type, data.providerId == 'all' ? data.providerId : ObjectId(data.providerId)], actionName, isValidData);
        },

        /**
         * Get total count of consumptionAmount or topUpAmount by a platform
         * @param {json} data - data contains platformId
         */
        countTopUpbyPlatform: function countTopUpbyPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countTopUpByPlatform, [ObjectId(data.platformId), startTime, endTime, data.period], actionName, isValidData);
        },

        countTopUpCountByPlatform: function countTopUpCountByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.countTopUpCountByPlatform, [ObjectId(data.platformId), startTime, endTime, data.period], actionName, isValidData);
        },

        countTopUpORConsumptionAllPlatform: function countTopUpORConsumptionAllPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.type);
            var platform = data.platform ? ObjectId(data.platform) : 'all';
            socketUtil.emitter(self.socket, dbPlayerInfo.dashboardTopupORConsumptionGraphData, [platform, 'day', data.type], actionName, isValidData);
        },

        /**
         * Get total count of topUpAmount by topup method and platform
         * @param {json} data - data contains platformId, startDate, endDate and period
         */
        getTopUpMethodAnalysisByPlatform: function getTopUpMethodAnalysisByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getTopUpMethodAnalysisByPlatform, [ObjectId(data.platformId), startTime, endTime, data.period], actionName, isValidData);
        },

        /**
         * Get total count of totalrecord by topup method and platform
         * @param {json} data - data contains platformId, startDate, endDate and period
         */
        getTopUpMethodCountByPlatform: function getTopUpMethodCountByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getTopUpMethodCountByPlatform, [ObjectId(data.platformId), startTime, endTime, data.period], actionName, isValidData);
        },

        /**
         * Get total head count of totalrecord by topup method success and platform
         * @param {json} data - data contains platformId, startDate, endDate and period
         */
        getTopUpMethodSuccessHeadCountByPlatform: function getTopUpMethodSuccessHeadCountByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.period);
            var startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            var endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getTopUpMethodSuccessHeadCountByPlatform, [ObjectId(data.platformId), startTime, endTime, data.period], actionName, isValidData);
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

        getPlayerConsumptionDetailByPlatform: function getPlayerConsumptionDetailByPlatform(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.startDate && data.endDate && data.platformId);
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerConsumptionRecord.getPlayerConsumptionDetailByPlatform, [startTime, endTime, ObjectId(data.platformId)], actionName, isValidData);
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
            var isValidData = Boolean(data && data.platform && data.startTime && data.endTime && data.player && data.date &&  typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPhoneLocation, [ObjectId(data.platform), startTime, endTime, data.player, data.date, null, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },

        /**
         * getPlayerPhoneLocation
         * @param {json} data - It has to contain _id of platform)
         */
        getPlayerPhoneLocationInProvince: function getPlayerPhoneLocationInProvince(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.startTime && data.endTime && data.player && data.date && data.phoneProvince &&  typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startTime ? new Date(data.startTime) : new Date(0);
            var endTime = data.endTime ? new Date(data.endTime) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPhoneLocation, [ObjectId(data.platform), startTime, endTime, data.player, data.date, data.phoneProvince, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },
        /**
         * get player device data
         */
        getPlayerDeviceAnalysisData: function getPlayerDeviceAnalysisData(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId && data.type && data.queryRequirement && typeof data.isRealPlayer === 'boolean' && typeof data.isTestPlayer === 'boolean');
            var startTime = data.startDate ? new Date(data.startDate) : new Date(0);
            var endTime = data.endDate ? new Date(data.endDate) : new Date();
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDeviceAnalysisData, [ObjectId(data.platformId), data.type, startTime, endTime, data.queryRequirement, data.isRealPlayer, data.isTestPlayer, data.hasPartner], actionName, isValidData);
        },
        /**
         *  apply Manual TopUp
         */
        applyManualTopUpRequest: function applyManualTopUpRequest(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.amount && data.amount > 0 && data.depositMethod);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.addManualTopupRequest, [userAgent, data.playerId, data, "ADMIN", getAdminId(), getAdminName(), data.fromFPMS, null, data.topUpReturnCode, data.platform], actionName, isValidData);
        },
        /**
        *
        */
        applyAssignTopUpRequest: function applyAssignTopUpRequest(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.amount && data.amount > 0 && data.depositMethod);
            let userAgent = '';
            let isPlayerAssign = true;
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.addManualTopupRequest, [userAgent, data.playerId, data, "ADMIN", getAdminId(), getAdminName(), data.fromFPMS, null, data.topUpReturnCode, data.platform, isPlayerAssign], actionName, isValidData);
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
            var isValidData = Boolean(data && data.playerId && data.amount);
            let userAgent = '';
            socketUtil.emitter(self.socket, dbPlayerInfo.applyBonus, [userAgent, data.playerId, data.amount, data.honoreeDetail, data.bForce, {
                type: "admin",
                name: getAdminName(),
                id: getAdminId()
            }, data.platform, data.withdrawalBank], actionName, isValidData);
        },

        getPlayerBankList: function getPlayerBankList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerBankList, [data.playerObjId, data.platformObjId, data.isMultipleBank], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerTransferErrorLog, [data.playerObjId, data.transferId, data.transferObjId], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbPlatform.pushNotification, [data, data.platform], actionName, isValidData);
        },

        getPlayerPermissionByName: function getPlayerPermissionByName (data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId && data.playerName);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerPermissionByName, [data.playerName, data.platformObjId], actionName, isValidData);
        },

        getPushNotification: function getPushNotification(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlatform.getPushNotification, [data.platformObjId], actionName, isValidData);
        },

        exportShortUrlToExcel: function exportShortUrlToExcel(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlayerInfo.exportShortUrlToExcel, [data.data], actionName, isValidData);
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

        bulkSendSMSToPlayer: function bulkSendSMSToPlayer(data) {
            let actionName = arguments.callee.name;
            let adminObjId = getAdminId();
            let adminName = getAdminName();
            let isValidData = Boolean(data && data.channel != null && data.platformId != null  && data.message && adminObjId && adminName && data.playerIds);
            if (data) {
                data.delay = data.delay || 0;
            }
            socketUtil.emitter(self.socket, dbPlatform.bulkSendSMS, [adminObjId, adminName, data, data.playerIds], actionName, isValidData);
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
        getUsableChannelList: function getUsableChannelList(data) {
            var actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, smsAPI.getUsableChannel_getUsableChannelList, [data], actionName, true);
        },
        vertificationSMSQuery: function vertificationSMSQuery(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlatform.vertificationSMS, [data, data.index, data.limit], actionName, isValidData);
        },
       getExternalUserInfo: function getExternalUserInfo(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlatform.getExternalUserInfo, [data, data.index, data.limit], actionName, isValidData);
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

        requestBankTypeByUserName: function requestBankTypeByUserName(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data.playerId && data.clientType);
            socketUtil.emitter(self.socket, dbPlayerPayment.requestBankTypeByUserName, [data.playerId, data.clientType, null, data.supportMode], actionName, isValidData);
        },

        // Assign TopUp
        getAssignTopupRequestList: function getAssignTopupRequestList(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId != null);
            socketUtil.emitter(self.socket, dbPlayerInfo.getAssignTopupRequestList, [data.playerId], actionName, isValidData);
        },

        cancelAssignTopupRequest: function cancelAssignTopupRequest(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId != null && data.proposalId != null);
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.cancelAssignTopupRequest, [data.playerId, data.proposalId, getAdminName()], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.requestAlipayTopup, [userAgent, data.playerId, data.amount, data.alipayName, data.alipayAccount, data.bonusCode, 'ADMIN',
                getAdminId(), getAdminName(), data.remark, data.createTime, data.realName, null, data.topUpReturnCode, false, null, true, data], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbPlayerTopUpRecord.requestWechatTopup, [!Boolean(data.notUseQR), userAgent, data.playerId, data.amount, data.wechatPayName, data.wechatPayAccount,
                data.bonusCode, 'ADMIN', getAdminId(), getAdminName(), data.remark, data.createTime,null, data.topUpReturnCode, false, null, true, data], actionName, isValidData);
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

        getPlayerCreditsDaily: function getPlayerCreditsDaily(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerCreditsDaily, [data.playerId, data.from, data.to, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getPlayerApiLog: function getPlayerApiLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId && data.startDate && data.endDate);
            socketUtil.emitter(self.socket, dbApiLog.getPlayerApiLog, [data.playerObjId, data.startDate, data.endDate, data.ipAddress, data.action, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getPlayerActionLog: function getPlayerActionLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.startDate && data.endDate);
            socketUtil.emitter(self.socket, dbApiLog.getPlayerActionLog, [data.platform, data.playerObjId, data.playerName, data.startDate, data.endDate, data.ipAddress, data.action, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        getPlayerRewardPointsLog: function getPlayerRewardPointsLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerName);
            socketUtil.emitter(self.socket, dbRewardPointsLog.getPlayerRewardPointsLog, [data.playerName, data.index, data.limit, data.sortCol], actionName, isValidData);
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
            socketUtil.emitter(self.socket, dbPlayerInfo.updatePlayerCredibilityRemark, [data.admin, data.platformObjId, data.playerObjId, data.remarks, data.comment, data.changedRemarks], actionName, isValidData);
        },
        updateBatchPlayerCredibilityRemark: function updateBatchPlayerCredibilityRemark(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.admin && data.platformObjId && data.playerNames && data.remarks);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerCredibilityRemark, [data.admin, data.platformObjId, data.playerNames, data.remarks, data.comment], actionName, isValidData);
        },
        updateBatchPlayerLevel: function updateBatchPlayerLevel(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.admin && data.platformObjId && data.playerNames && data.playerNames.length && data.playerLevelObjId && data.remarks);
            socketUtil.emitter(self.socket, dbPlayerInfo.updateBatchPlayerLevel, [getAdminId(), data.admin, data.platformObjId, data.playerNames, data.playerLevelObjId, data.remarks], actionName, isValidData);
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

        createForbidPromoCodeLog: function createForbidPromoCodeLog(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.adminId && data.forbidPromoCodeNames);
            socketUtil.emitter(self.socket, dbPlayerInfo.createForbidPromoCodeLog, [data.playerId, data.adminId, data.forbidPromoCodeNames, data.remark], actionName, isValidData);
        },

        getForbidRewardLog: function getForbidRewardLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbPlayerInfo.getForbidRewardLog, [data.playerId, data.startTime, data.endTime, index, limit], actionName, isValidData);
        },

        getForbidPromoCodeLog: function getForbidPromoCodeLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.startTime && data.endTime);
            let index = data.index || 0;
            let limit = data.limit || 10;
            socketUtil.emitter(self.socket, dbPlayerInfo.getForbidPromoCodeLog, [data.playerId, data.startTime, data.endTime, index, limit], actionName, isValidData);
        },

        getForbidRewardPointsEventLog: function getForbidRewardPointsEventLog(data) {
        let actionName = arguments.callee.name;
        let isValidData = Boolean(data && data.playerId && data.startTime && data.endTime);
        let index = data.index || 0;
        let limit = data.limit || 10;
        socketUtil.emitter(self.socket, dbPlayerInfo.getForbidRewardPointsEventLog, [data.playerId, data.startTime, data.endTime, index, limit], actionName, isValidData);
        },

        createForbidRewardPointsEventLog: function createForbidRewardPointsEventLog(data){
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.playerId && data.adminId && data.forbidRewardPointsEventNames);
            socketUtil.emitter(self.socket, dbPlayerInfo.createForbidRewardPointsEventLog, [data.playerId, data.adminId, data.forbidRewardPointsEventNames, data.remark], actionName, isValidData);
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

        comparePhoneNum: function comparePhoneNum(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayInputPhone);
            socketUtil.emitter(self.socket, dbPlayerInfo.comparePhoneNum, [data.filterAllPlatform, data.platformObjId, data.arrayInputPhone], actionName, isValidData);
        },

        uploadPhoneFileCSV: function uploadPhoneFileCSV(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayPhoneCSV);
            socketUtil.emitter(self.socket, dbPlayerInfo.uploadPhoneFileCSV, [data.filterAllPlatform, data.platformObjId, data.arrayPhoneCSV], actionName, isValidData);
        },

        uploadPhoneFileTXT: function uploadPhoneFileTXT(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayPhoneTXT);
            socketUtil.emitter(self.socket, dbPlayerInfo.uploadPhoneFileTXT, [data.filterAllPlatform, data.platformObjId, data.arrayPhoneTXT], actionName, isValidData);
        },

        uploadPhoneFileXLS: function uploadPhoneFileXLS(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && typeof(data.filterAllPlatform) === "boolean" && data.platformObjId && data.arrayPhoneXLS);
            socketUtil.emitter(self.socket, dbPlayerInfo.uploadPhoneFileXLS, [data.filterAllPlatform, data.platformObjId, data.arrayPhoneXLS, data.isTSNewList], actionName, isValidData);
        },

        importDiffPhoneNum: function importDiffPhoneNum(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.phoneNumber && data.dxMission);
            socketUtil.emitter(self.socket, dbPlayerInfo.importDiffPhoneNum, [ObjectId(data.platform), data.phoneNumber, ObjectId(data.dxMission)], actionName, isValidData);
        },

        importTSNewList: function importTSNewList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.updateData && data.updateData.platform && data.phoneListDetail && data.updateData.creator && data.updateData.name
                && data.updateData.description && data.updateData.failFeedBackResult && data.updateData.failFeedBackTopic
                && data.updateData.failFeedBackContent && data.updateData.hasOwnProperty("callerCycleCount") && data.updateData.hasOwnProperty("dailyCallerMaximumTask")
                && data.updateData.hasOwnProperty("dailyDistributeTaskHour") && data.updateData.hasOwnProperty("dailyDistributeTaskMinute")
                && data.updateData.hasOwnProperty("dailyDistributeTaskSecond") && data.updateData.distributeTaskStartTime && data.updateData.hasOwnProperty("reclaimDayCount") && !(data.isPhoneTrade && data.isFeedbackPhoneTrade));
            socketUtil.emitter(self.socket, dbPlayerInfo.importTSNewList, [data.phoneListDetail, data.updateData, data.isUpdateExisting, getAdminId(), getAdminName(), data.targetTsPhoneListId, data.isImportFeedback, data.isPhoneTrade, data.isFeedbackPhoneTrade], actionName, isValidData);
        },

        getTsNewListName: function getTsNewListName (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlayerInfo.getTsNewListName, [data.platform], actionName, isValidData);
        },

        downloadTranslationCSV: function downloadTranslationCSV(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlayerInfo.downloadTranslationCSV, [data.platformId], actionName, isValidData);
        },

        modifyPlayerDepositTrackingGroup: function modifyPlayerDepositTrackingGroup(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.playerId);
            let platform = ObjectId(data.platform);
            let playerId = ObjectId(data.playerId);
            let trackingGroup = data.trackingGroup ? ObjectId(data.trackingGroup) : null;
            socketUtil.emitter(self.socket, dbPlayerInfo.modifyPlayerDepositTrackingGroup, [platform, playerId, trackingGroup], actionName, isValidData);
        },

        removePlayerFromDepositTrackingReport: function removePlayerFromDepositTrackingReport(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.playerId);
            let platform = ObjectId(data.platform);
            let playerId = ObjectId(data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.removePlayerFromDepositTrackingReport, [platform, playerId], actionName, isValidData);
        },

        getPlayerDepositTrackingMonthlyDetails: function getPlayerDepositTrackingMonthlyDetails(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.playerId);
            let platform = ObjectId(data.platform);
            let playerId = ObjectId(data.playerId);
            let startTime = data.startTime;
            let endTime = data.endTime;
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDepositTrackingMonthlyDetails, [platform, playerId, startTime, endTime], actionName, isValidData);
        },

        getPlayerDepositTrackingDailyDetails: function getPlayerDepositTrackingDailyDetails(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.playerId && data.date);
            let platform = ObjectId(data.platform);
            let playerId = ObjectId(data.playerId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerDepositTrackingDailyDetails, [platform, playerId, data.date], actionName, isValidData);
        },

        convertRewardPointsToCredit: function convertRewardPointsToCredit(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.convertRewardPointsAmount);
            let userAgent = constPlayerRegistrationInterface.BACKSTAGE;
            socketUtil.emitter(self.socket, dbPlayerRewardPoints.convertRewardPointsToCredit, [data.playerId, data.convertRewardPointsAmount, data.remark, userAgent, getAdminId(), getAdminName()], actionName, isValidData);
        },
        getWithdrawalInfo: function getWithdrawalInfo(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlayerInfo.getWithdrawalInfo, [data.platformId, data.playerId], actionName, isValidData);
        },
        //
        // this.getWithdrawalInfo.onRequest = function (wsFunc, conn, data) {
        //     var isValidData = Boolean(conn.playerId && data.platformId);
        //     WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getWithdrawalInfo, [data.platformId, conn.playerId], isValidData, false, false, true);
        // };


        getCreditDetail: function getCreditDetail(data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            let userAgent = constPlayerRegistrationInterface.BACKSTAGE;
            socketUtil.emitter(self.socket, dbPlayerInfo.getCreditDetail, [data.playerObjId, getAdminId(), getAdminName()], actionName, isValidData);
        },

        getDemoPlayerAnalysis: function getDemoPlayerAnalysis(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.period && data.startDate && data.endDate && data.platformId);
            socketUtil.emitter(self.socket, dbDemoPlayer.getDemoPlayerAnalysis, [ObjectId(data.platformId), new Date(data.startDate), new Date(data.endDate), data.period], actionName, isValidData);
        },
        getDemoPlayerLog: function getDemoPlayerLog(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.period && data.selectedDate && data.platformId && data.status);
            socketUtil.emitter(self.socket, dbDemoPlayer.getDemoPlayerLog, [ObjectId(data.platformId), data.period, data.status, data.selectedDate, data.index, data.limit, data.sortCol], actionName, isValidData);
        },
        getPlayerConsumptionSummary: function getPlayerConsumptionSummary(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId);
            socketUtil.emitter(self.socket, dbPlayerConsumptionDaySummary.getPlayerConsumptionSummary, [data.playerId], actionName, isValidData);
        },

        getPagedSimilarPhoneForPlayers: function getPagedSimilarPhoneForPlayers(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.platformId && data.phoneNumber && data.isRealPlayer);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPagedSimilarPhoneForPlayers, [data.playerId, data.platformId, data.phoneNumber, data.isRealPlayer, data.index, data.limit, data.sortCol, data.admin], actionName, isValidData);
        },

        getPagedSimilarIpForPlayers: function getPagedSimilarIpForPlayers(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerId && data.platformId && data.isRealPlayer);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPagedSimilarIpForPlayers, [data.playerId, data.platformId, data.registrationIp, data.isRealPlayer, data.index, data.limit, data.sortCol, data.admin], actionName, isValidData);
        },

        checkIPArea: function checkIPArea(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlayerInfo.checkIPArea, [data._id], actionName, isValidData);
        },

        checkDuplicatedBankAccount: function checkDuplicatedBankAccount(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.bankAccount && data.platform && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.checkDuplicatedBankAccount, [data.bankAccount, data.platform, data.playerObjId], actionName, isValidData);
        },

        getPlayerCreditByName: function getPlayerCreditByName(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data.playerName && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.getPlayerCreditByName, [data.playerName, data.platformObjId], actionName, isValidData);
        },

        playerCreditClearOut: function playerCreditClearOut(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data.playerName && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.playerCreditClearOut, [data.playerName, data.platformObjId, getAdminName(), getAdminId()], actionName, isValidData);
        },

        clearPlayerXIMAWithdraw: function clearPlayerXIMAWithdraw(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data.playerName && data.platformObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.clearPlayerXIMAWithdraw, [data.playerName, data.platformObjId, getAdminName(), getAdminId()], actionName, isValidData);
        },

        clearPlayerState: function clearPlayerState(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.clearPlayerState, [data.playerObjId], actionName, isValidData);
        },

        unbindPhoneDeviceId: function unbindPhoneDeviceId(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.playerObjId);
            socketUtil.emitter(self.socket, dbPlayerInfo.unbindPhoneDeviceId, [data.playerObjId], actionName, isValidData);
        },

        getBankZoneData: function getBankZoneData(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlayerInfo.getBankZoneData, [data], actionName, isValidData);
        },

        isPhoneNumberExist: function isPhoneNumberExist(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            socketUtil.emitter(self.socket, dbPlayerInfo.isPhoneNumberExist, [data.phoneNumber, data.platformObjId], actionName, isValidData);
        },

        countAppPlayer: function countAppPlayer(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformId && data.startDate && data.endDate && data.playerType && data.deviceType);
            let startTime = data.startDate ? dbUtil.getDayStartTime(data.startDate) : new Date(0);
            let endTime = data.endDate ? dbUtil.getDayEndTime(data.endDate) : new Date();
             socketUtil.emitter(self.socket, dbPlayerInfo.countAppPlayer, [ObjectId(data.platformId), startTime, endTime, data.playerType, data.deviceType, data.domain, data.registrationInterfaceType], actionName, isValidData);
        }
    };
    socketActionPlayer.actions = this.actions;
}

module.exports = socketActionPlayer;
