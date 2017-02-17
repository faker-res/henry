/******************************************************************
 *        Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var SyncDataService = require("./../../services/migration/MigrationServices").SyncDataService;
var dbMigration = require('./../../db_modules/dbMigration');
var errorUtils = require('./../../modules/errorUtils');
var dbPlayerConsumptionRecord = require('./../../db_modules/dbPlayerConsumptionRecord');
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');

var SyncDataServiceImplement = function () {
    SyncDataService.call(this);
    var self = this;

    this.syncProposal.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.type && data.platform && (data.entryType != null) && data.status && (data.userType != null) && data.data);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.creator = String(data.creator).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.syncProposal, [data.type, data.platform, data.creator, data.creatorType, data.createTime, data.entryType, data.userType, data.status, data.data], isValidData);
    };

    this.syncPlayerLoginRecord.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platform && data.loginTime && data.playerName && data.loginIP);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.syncPlayerLoginRecord, [data], isValidData);
    };

    this.syncPlayerConsumptionRecord.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.userName && data.hasOwnProperty("platformId") && data.hasOwnProperty("providerId") && data.hasOwnProperty("gameId")
            && typeof data.amount === 'number' && data.amount >= 0 && typeof data.validAmount === 'number' && data.validAmount >= 0);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerConsumptionRecord.createExternalPlayerConsumptionRecord, [data], isValidData);
    };

    this.syncPlayerCreditTransferIn.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.userName && data.providerId != null);
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.transferPlayerCreditToProvider, [data.userName, null, data.providerId, -1, null, true], isValidData);
    };

    this.syncPlayerCreditTransferOut.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.userName && data.providerId != null && data.amount != null);
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.transferPlayerCreditFromProvider, [data.userName, null, data.providerId, data.amount, null, null, null, true], isValidData);
    };
};

var proto = SyncDataServiceImplement.prototype = Object.create(SyncDataService.prototype);
proto.constructor = SyncDataServiceImplement;

module.exports = SyncDataServiceImplement;

