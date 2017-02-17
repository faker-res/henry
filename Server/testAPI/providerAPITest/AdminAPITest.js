/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var AdminAPITest = function (service) {
        this._service = service;

        //this.testRecordId = null;

    };
    var proto = AdminAPITest.prototype;
    var testApiUserObjId = null;
    var testApiUserId = null;


    if (isNode) {

        var dbApiUser = require('./../../db_modules/db-api-user');

        var Q = require("q");

        proto.initGetAPIUser = function (callback, requestData) {
            var deferred = Q.defer();
            dbApiUser.getApiUserInfo({
                    name: "testClientApiUsername"
                }
            ).then(
                function (data) {
                    testApiUserObjId = data._id;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting api user", error: error});
                }
            );
            return deferred.promise;
        };
    }

    proto.login = function (callback, requestData) {

        var data = requestData || {};
        this._service.login.request(data);
        this._service.login.once(function (data) {

           //testApiUserObjId = data && data.data ? data.data._id : null;
           //testApiUserId = data && data.data ? data.data.apiUserId : null;

            if (typeof callback === "function") {
                console.log("data", data);
                callback(data);
            }
        });
    };


    if (isNode) {
        module.exports = AdminAPITest;
    } else {
        define([], function () {
            return AdminAPITest;
        });
    }

})();