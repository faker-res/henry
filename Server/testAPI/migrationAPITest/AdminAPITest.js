/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var adminAPITest = function (service) {
        this._service = service;
    };

    var proto = adminAPITest.prototype;

    proto.createDepartment = function (callback, requestData) {
        var data = requestData;
        this._service.createDepartment.request(data);
        var self = this;
        this._service.createDepartment.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.createUser = function (callback, requestData) {
        var data = requestData;
        this._service.createUser.request(data);
        var self = this;
        this._service.createUser.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };


    if (isNode) {
        module.exports = adminAPITest;
    } else {
        define([], function () {
            return adminAPITest;
        });
    }

})();

