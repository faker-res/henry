(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    const testPlayerLoginData = {
        name: "testclientplayer",
        password: "123456",
        lastLoginIp: "192.168.3.22"
    };

    var ClientPartnerAPITest = function (partnerService) {
        this.partnerService = partnerService;
    };

    var proto = ClientPartnerAPITest.prototype;
    var platformId = null;
    var smsCode = null;

    var date = new Date().getTime();
    var testPlayerObjId = !isNode && window.testPlayerObjId;
    var testPlayerId = !isNode && window.testPlayerId;

    proto.register = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.register.request(data);
        this.partnerService.register.once(callback);
    };

    proto.isValidUsername = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.isValidUsername.request(data);
        this.partnerService.isValidUsername.once(callback);
    };

    proto.captcha = function (callback, requestData) {
        this.partnerService.captcha.request();
        this.partnerService.captcha.once(callback);
    };

    proto.login = function (callback, requestData) {
        var data = requestData || testPlayerLoginData;

        if (!isNode) {
            console.log("Not node");
            document.cookie = "partnerName=" + data.partnerName;
            document.cookie = "partnerPassword=" + data.password;
        //    document.cookie = "expires=" + date + (5 * 60 * 60 * 1000);
        }
        this.partnerService.login.request(data);
        this.partnerService.login.once(function (data) {
            testPlayerObjId = data && data.data ? data.data._id : null;
            testPlayerId = data && data.data ? data.data.playerId : null;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.logout = function (callback, requestData) {
        let data = requestData || {};
        this.partnerService.logout.request(data);
        this.partnerService.logout.once(callback);
    };

    proto.authenticate = function (callback, requestData) {
        let data = requestData || {};
        this.partnerService.authenticate.request(data);
        this.partnerService.authenticate.once(callback);
    };

    proto.authenticatePlayerPartner = function (callback, requestData) {
        let data = requestData || {};
        this.partnerService.authenticatePlayerPartner.request(data);
        this.partnerService.authenticatePlayerPartner.once(callback);
    };

    proto.updatePassword = function (callback, requestData) {
        var data = requestData || {partnerId: testPlayerId, oldPassword: "123456", newPassword: "654321"};
        this.partnerService.updatePassword.request(data);
        this.partnerService.updatePassword.once(callback);
    };

    proto.fillBankInformation = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.fillBankInformation.request(data);
        this.partnerService.fillBankInformation.once(callback);
    };

    proto.getStatistics = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getStatistics.request(data);
        this.partnerService.getStatistics.once(callback);
    };

    proto.getPlayerSimpleList = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getPlayerSimpleList.request(data);
        this.partnerService.getPlayerSimpleList.once(callback);
    };

    proto.getDomainList = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getDomainList.request(data);
        this.partnerService.getDomainList.once(callback);
    };

    proto.bindPartnerPlayer = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.bindPartnerPlayer.request(data);
        this.partnerService.bindPartnerPlayer.once(callback);
    };

    proto.applyBonus = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.applyBonus.request(data);
        this.partnerService.applyBonus.once(callback);
    };

    proto.get = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.get.request(data);
        this.partnerService.get.once(callback);
    };

    proto.getPartnerChildrenReport = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getPartnerChildrenReport.request(data);
        this.partnerService.getPartnerChildrenReport.once(callback);
    };

    proto.getPartnerPlayerRegistrationReport = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getPartnerPlayerRegistrationReport.request(data);
        this.partnerService.getPartnerPlayerRegistrationReport.once(callback);
    };

    proto.getBonusRequestList = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getBonusRequestList.request(data);
        this.partnerService.getBonusRequestList.once(callback);
    };

    proto.cancelBonusRequest = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.cancelBonusRequest.request(data);
        this.partnerService.cancelBonusRequest.once(callback);
    };

    proto.getPartnerPlayerPaymentReport = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getPartnerPlayerPaymentReport.request(data);
        this.partnerService.getPartnerPlayerPaymentReport.once(callback);
    };

    proto.getPartnerCommission = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getPartnerCommission.request(data);
        this.partnerService.getPartnerCommission.once(callback);
    };

    proto.getPartnerCommissionValue = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getPartnerCommissionValue.request(data);
        this.partnerService.getPartnerCommissionValue.once(callback);
    };

    proto.getPartnerPlayerRegistrationStats = function (callback, requestData) {
        var data = requestData || {};
        this.partnerService.getPartnerPlayerRegistrationStats.request(data);
        this.partnerService.getPartnerPlayerRegistrationStats.once(callback);
    };

    proto.getSMSCode = function (callback, requestData) {
        let data = requestData || {
                phoneNumber: 97787654
            };
        this.partnerService.getSMSCode.request(data);
        this.partnerService.getSMSCode.once(function (data) {
            smsCode = data.data;
            if (typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.updatePhoneNumberWithSMS = function (callback, requestData) {
        let data = requestData || {};
        this.partnerService.updatePhoneNumberWithSMS.request(data);
        this.partnerService.updatePhoneNumberWithSMS.once(callback);
    };

    if (isNode) {
        module.exports = ClientPartnerAPITest;
    } else {
        define([], function () {
            return ClientPartnerAPITest;
        });
    }

})();