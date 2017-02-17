/******************************************************************
 *        Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var ProposalService = require("./../../services/migration/MigrationServices").ProposalService;
var dbMigration = require('./../../db_modules/dbMigration');
var errorUtils = require('./../../modules/errorUtils');

var ProposalServiceImplement = function () {
    ProposalService.call(this);
    var self = this;

    this.createProposal.expectsData = 'type: ?, platform: String, entryType: String?, status: ?, userType: String?, data: ?';
    this.createProposal.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.type && data.platform && (data.entryType != null) && data.status && (data.userType != null) && data.data);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        data.creator = String(data.creator).toLowerCase();
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createProposal, [data.type, data.platform, data.creator, data.creatorType, data.createTime, data.entryType, data.userType, data.status, data.data], isValidData);
    };

};

var proto = ProposalServiceImplement.prototype = Object.create(ProposalService.prototype);
proto.constructor = ProposalServiceImplement;

module.exports = ProposalServiceImplement;

