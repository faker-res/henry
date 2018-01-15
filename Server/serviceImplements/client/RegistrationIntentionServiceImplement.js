const WebSocketUtil = require("./../../server_common/WebSocketUtil");
const RegistrationIntentionService = require("./../../services/client/ClientServices").RegistrationIntentionService;
const dbPlayerRegistrationIntentRecord = require('./../../db_modules/dbPlayerRegistrationIntentRecord');
const constServerCode = require('./../../const/constServerCode');
const localization = require('../../modules/localization').localization;
const constMessageClientTypes = require('./../../const/constMessageClientTypes');
const constProposalStatus = require('./../../const/constProposalStatus');

var RegistrationIntentionServiceImplement = function () {
    RegistrationIntentionService.call(this);
    var self = this;
    //add api handler
    this.add.expectsData = 'name: String, mobile: String, platformId: String';
    this.add.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.name && data.hasOwnProperty("platformId") && data.realName);
        data.ipAddress = conn.upgradeReq.connection.remoteAddress || '';
        var forwardedIp = (conn.upgradeReq.headers['x-forwarded-for'] + "").split(',');
        if (forwardedIp.length > 0 && forwardedIp[0].length > 0) {
            if(forwardedIp[0].trim() != "undefined"){
                data.ipAddress = forwardedIp[0].trim();
            }
        }
        delete data.password;
        delete data.confirmPassword;
        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecordAPI,
            [data, constProposalStatus.PENDING], isValidData, true, false, true
        ).then(
            function (res) {
                if (!conn.captchaCode || (conn.captchaCode && (conn.captchaCode == data.captcha))) {
                    wsFunc.response(conn, {status: constServerCode.SUCCESS, data: res}, data);
                    self.sendMessage(constMessageClientTypes.MANAGEMENT, "management", "notifyRegistrationIntentionUpdate", res);
                } else {
                    wsFunc.response(conn, {
                        status: constServerCode.GENERATE_VALIDATION_CODE_ERROR,
                        errorMessage: localization.translate("Verification code invalid", conn.lang, conn.platformId),
                        data: null
                    }, data);
                }
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
