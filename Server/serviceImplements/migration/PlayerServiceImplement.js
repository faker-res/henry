"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PlayerService = require("./../../services/migration/MigrationServices").PlayerService;
var dbMigration = require('./../../db_modules/dbMigration');
var errorUtils = require('./../../modules/errorUtils');

var PlayerServiceImplement = function () {
    PlayerService.call(this);
    var self = this;

    this.createPlatform.expectsData = 'name: String';
    this.createPlatform.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlatform, [data], isValidData);
    };

    this.createPlayer.expectsData = 'name: String, platform: String';
    this.createPlayer.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.platform);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayer, [data], isValidData);
    };

    this.createPlayerTopUpRecord.expectsData = 'playerName: String, platform: String, topUpType: ?';
    this.createPlayerTopUpRecord.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.topUpType
            && data.amount && typeof data.amount === 'number' && data.amount > 0);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerTopUpRecord, [data], isValidData);
    };

    this.createPlayerConsumptionRecord.expectsData = 'playerName: String, platform: String, game: ?, provider: ?, amount: Number, validAmount: Number';
    this.createPlayerConsumptionRecord.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.game && data.provider && data.amount != null
            && typeof data.amount === 'number' && typeof data.validAmount === 'number');
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerConsumptionRecord, [data], isValidData);
    };

    this.createPlayerFeedback.expectsData = 'playerName: String, platform: String, content: ?, result: ?, creator: ?';
    this.createPlayerFeedback.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.content && data.result && data.creator);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        data.creator = String(data.creator).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerFeedback, [data], isValidData);
    };

    this.createPlayerRewardTask.expectsData = 'playerName: String, platform: String';
    this.createPlayerRewardTask.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        data.rewardType = data.type;
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerRewardTask, [data], isValidData);
    };

    this.createPlayerCreditChangeLog.expectsData = 'playerName: String, platform: String';
    this.createPlayerCreditChangeLog.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerCreditChangeLog, [data], isValidData);
    };

    this.createPlayerClientSourceLog.expectsData = 'playerName: String, platformId: String';
    this.createPlayerClientSourceLog.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platformId);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerClientSourceLog, [data], isValidData);
    };

    this.createPlayerLoginRecord.expectsData = 'playerName: String, platform: String, loginTime: ?';
    this.createPlayerLoginRecord.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.loginTime);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerLoginRecord, [data], isValidData);
    };

    this.createPlayerCreditTransferLog.expectsData = 'playerName: String, platform: String, type: ?, transferId: ?, providerCode: ?, amount: Number|String, createTime: Date';
    this.createPlayerCreditTransferLog.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.type && data.transferId && data.providerCode && data.amount && data.createTime);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPlayerCreditTransferLog, [data], isValidData);
    };

    this.addPlayerPartner.expectsData = 'playerName: String, platform: String, partnerName: String';
    this.addPlayerPartner.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.partnerName);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.addPlayerPartner, [data], isValidData);
    };

    this.addPlayerReferral.expectsData = 'playerName: String, platform: String, referralName: String';
    this.addPlayerReferral.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.referralName);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.addPlayerReferral, [data], isValidData);
    };

    this.updateLastPlayedProvider.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.providerId);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.updateLastPlayedProvider, [data], isValidData);
    };

    this.updatePlayerCredit.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.validCredit != null);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.updatePlayerCredit, [data], isValidData);
    };

    this.updatePlayerLevel.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.levelName != null);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.updatePlayerLevel, [data], isValidData);
    };

    this.updatePlayer.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.playerName && data.platform && data.updateData != null);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.playerName = String(data.playerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.updatePlayer, [data], isValidData);
    };

};

var proto = PlayerServiceImplement.prototype = Object.create(PlayerService.prototype);
proto.constructor = PlayerServiceImplement;

module.exports = PlayerServiceImplement;

