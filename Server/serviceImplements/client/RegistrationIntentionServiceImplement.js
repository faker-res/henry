/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var RegistrationIntentionService = require("./../../services/client/ClientServices").RegistrationIntentionService;
var dbPlayerRegistrationIntentRecord = require('./../../db_modules/dbPlayerRegistrationIntentRecord');
var constServerCode = require('./../../const/constServerCode');
var constMessageClientTypes = require('./../../const/constMessageClientTypes');

var RegistrationIntentionServiceImplement = function () {
    RegistrationIntentionService.call(this);
    var self = this;
    //add api handler
    this.add.expectsData = 'name: String, mobile: String, platformId: String';
    this.add.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.mobile && data.hasOwnProperty("platformId"));
        data.ipAddress = conn.upgradeReq.headers['x-real-ip'] || conn.upgradeReq.connection.remoteAddress;
        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI,
            [data], isValidData, true, false, true
        ).then(
            function (res) {
                wsFunc.response(conn, {status: constServerCode.SUCCESS, data: res}, data);
                self.sendMessage(constMessageClientTypes.MANAGEMENT, "management", "notifyRegistrationIntentionUpdate", res);
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    //update api handler
    this.update.expectsData = 'id: ObjectId';
    this.update.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.id);
        WebSocketUtil.performAction(
            conn, wsFunc, data, dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecord,
            [{_id: data.id}, data], isValidData, false, false, true
        );
    };

};

var proto = RegistrationIntentionServiceImplement.prototype = Object.create(RegistrationIntentionService.prototype);
proto.constructor = RegistrationIntentionServiceImplement;

module.exports = RegistrationIntentionServiceImplement;
