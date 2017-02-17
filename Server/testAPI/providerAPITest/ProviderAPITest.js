/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ProviderAPITest = function (service) {
        this._service = service;

        //this.testRecordId = null;
    };
    var date = new Date().getTime();
    var proto = ProviderAPITest.prototype;
    var testRecordId = null;

    proto.add = function (callback, requestData) {
        //todo:: update test data here

        var data = requestData ||
            {
                name: "testProvider" + date,
                code: "AA"
            };
        this._service.add.request(data);
        var self = this;
        this._service.add.once(function (data) {
            if (data.status == '200') {
                if (!isNode) {
                    window.testProviderId = testRecordId;
                }
            }
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    //update
    proto.update = function (callback, requestData) {
        data = requestData ||
            {
                providerId: testRecordId,
                name: "provider name",
                code: "provider code"
            };
        this._service.update.request(data);
        var self = this;
        this._service.update.once(function (redata) {
            //self.testRecordId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(redata);

            }
        });
    };


    proto.changeStatus = function (callback, requestData) {
        var data = requestData || {
                _id: testRecordId,
                status: 1
            };
        this._service.changeStatus.request(data);
        var self = this;
        this._service.changeStatus.once(function (data1) {
            //self.testRecordId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data1);
            }
        });
    };


    proto.delete = function (callback, requestData) {
        var data = requestData || {_id: testRecordId};
        this._service.delete.request(data);
        var self = this;
        this._service.delete.once(function (data) {
            //self.testRecordId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);

            }
        });
    };

    proto.getProviderList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getProviderList.request(data);
        this._service.getProviderList.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);

            }
        });
    };

    proto.modifyCode = function(callback, requestData) {
        var data = requestData || {};
        this._service.modifyCode.request(data);
        var self = this;
        this._service.modifyCode.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncData = function(callback, requestData) {
        var data = requestData ||
            {
                // providers: [
                //     {code: 123, name: "testp1"},
                //     {code: 1234, name: "testp2"}
                // ]
            };
        this._service.syncData.request(data);
        var self = this;
        this._service.syncData.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ProviderAPITest;
    } else {
        define([], function () {
            return ProviderAPITest;
        });
    }

})();