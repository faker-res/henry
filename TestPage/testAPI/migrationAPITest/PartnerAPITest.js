(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var partnerAPITest = function (service) {
        this._service = service;
    };

    var proto = partnerAPITest.prototype;
    
    proto.create = function (callback, requestData) {
        var data = {
            platform: requestData.platform,
            partnerName: requestData.partnerName,
            password: requestData.password,
            realName: requestData.realName,
            // downline pass to remark (on hold)
            credits: requestData.credits,
            registrationTime: requestData.registrationTime,
            lastAccessTime: requestData.lastAccessTime,
            loginTimes: requestData.loginTimes,
            permission: {
                applyBonus: document.getElementById("permissionApplyBonus").checked,
                forbidPartnerFromLogin: document.getElementById("permissionForbidPartnerLogin").checked,
                disableCommSettlement: document.getElementById("permissionDisableCommSettlement").checked,
            },
            phoneNumber: requestData.phoneNumber,
            email: requestData.email,
            wechat: requestData.wechat,
            qq: requestData.qq,
            bankName: requestData.bankName,
            bankAccountName: requestData.bankAccountName,
            bankAccountType: requestData.bankAccountType,
            bankAccountProvince: requestData.bankAccountProvince,
            bankAccountCity: requestData.bankAccountCity,
            bankAccount: requestData.bankAccount,
            bankAddress: requestData.bankAddress,
            commissionType: requestData.commissionType,
            // not on excel
            partnerLevel: requestData.partnerLevel,
            internetBanking: requestData.internetBanking,
            totalReferrals: requestData.totalReferrals,
            parent: requestData.parent
        };
        this._service.create.request(data);
        var self = this;
        this._service.create.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createPartnerLoginRecord = function (callback, requestData) {
        var data = requestData;
        this._service.createPartnerLoginRecord.request(data);
        var self = this;
        this._service.createPartnerLoginRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.updatePartner = function (callback, requestData) {
        var data = {
            partnerName: "vincep",
            platform: 1,
            updateData: {
                parentName: "vincep3",
                credits: 100,
                totalReferrals: 12
            }
        };
        this._service.updatePartner.request(data);
        var self = this;
        this._service.updatePartner.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = partnerAPITest;
    } else {
        define([], function () {
            return partnerAPITest;
        });
    }

})();


