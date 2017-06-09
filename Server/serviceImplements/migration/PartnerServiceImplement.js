"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PartnerService = require("./../../services/migration/MigrationServices").PartnerService;
var dbMigration = require('./../../db_modules/dbMigration');
var errorUtils = require('./../../modules/errorUtils');

var PartnerServiceImplement = function () {
    PartnerService.call(this);
    var self = this;

    this.create.expectsData = 'partnerName: String, platform: String';
    this.create.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerName && data.platform != null);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPartner, [data], isValidData);
    };

    this.createPartnerLoginRecord.expectsData = 'partnerName: String, platform: String, loginTime: ?';
    this.createPartnerLoginRecord.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerName && data.platform != null && data.loginTime);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.partnerName = String(data.partnerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createPartnerLoginRecord, [data], isValidData);
    };

    this.updatePartner.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.partnerName && data.platform != null && data.updateData);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.partnerName = String(data.partnerName).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.updatePartner, [data], isValidData);
    };

};

var proto = PartnerServiceImplement.prototype = Object.create(PartnerService.prototype);
proto.constructor = PartnerServiceImplement;

module.exports = PartnerServiceImplement;

