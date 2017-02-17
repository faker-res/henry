/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var syncDataAPITest = function (service) {
        this._service = service;

        // this.testChannelObjId = null;
        // this.testChannelName = "testProposal";
    };

    var proto = syncDataAPITest.prototype;

    proto.syncProposal = function (callback, requestData) {
        var data = {
                type: "UpdatePlayerInfo",
                platform: "1",
                entryType: 0,
                status: "Success",
                userType: "player",
                data: {loginname: "sawlz14", realName: "justfortest"},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
                // data: {loginname: "sawlz14", updateAmount: 10},
            } || requestData;
        this._service.syncProposal.request(data);
        var self = this;
        this._service.syncProposal.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncPlayerLoginRecord = function (callback, requestData) {
        var data = requestData || {
                "loginTime": "2016-12-06 02:21:15",
                "platform": "4",
                "playerName": "sawlz4"
            };
        this._service.syncPlayerLoginRecord.request(data);
        var self = this;
        this._service.syncPlayerLoginRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncPlayerConsumptionRecord = function (callback, requestData) {
        var data = requestData;
        this._service.syncPlayerConsumptionRecord.request(data);
        var self = this;
        this._service.syncPlayerConsumptionRecord.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncPlayerCreditTransferIn = function (callback, requestData) {
        var data = requestData;
        this._service.syncPlayerCreditTransferIn.request(data);
        var self = this;
        this._service.syncPlayerCreditTransferIn.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };
    proto.syncPlayerCreditTransferOut = function (callback, requestData) {
        var data = requestData;
        this._service.syncPlayerCreditTransferOut.request(data);
        var self = this;
        this._service.syncPlayerCreditTransferOut.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };


    if (isNode) {
        module.exports = syncDataAPITest;
    } else {
        define([], function () {
            return syncDataAPITest;
        });
    }

})();

