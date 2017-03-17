/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var partnerAPITest = function (service) {
        this._service = service;
    };

    var proto = partnerAPITest.prototype;
    
    proto.create = function (callback, requestData) {
        var data = requestData;
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


