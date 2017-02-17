/******************************************************************
 *        Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

"use strict";

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var AdminService = require("./../../services/migration/MigrationServices").AdminService;
var dbMigration = require('./../../db_modules/dbMigration');
var errorUtils = require('./../../modules/errorUtils');

var AdminServiceImplement = function () {
    AdminService.call(this);
    var self = this;

    this.createDepartment.expectsData = 'name: String';
    this.createDepartment.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }

        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createDepartment, [data], isValidData);
    };

    this.createUser.expectsData = 'name: String, department: String';
    this.createUser.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.department);
        if (!isValidData) {
            errorUtils.logMigrationDataInvalidError(this, data);
        }
        WebSocketUtil.performAction(conn, wsFunc, data, dbMigration.createUser, [data], isValidData);
    };

};

var proto = AdminServiceImplement.prototype = Object.create(AdminService.prototype);
proto.constructor = AdminServiceImplement;

module.exports = AdminServiceImplement;

