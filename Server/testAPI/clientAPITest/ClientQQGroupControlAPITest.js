(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientQQGroupControlAPITest = function (QQGroupControlService) {
        console.log('QQGroupControlService', QQGroupControlService)
        this._service = QQGroupControlService;
        if (!isNode) {
        }
    };
    var proto = ClientQQGroupControlAPITest.prototype;
    var platformId = null;

    if (isNode) {

        var dbPlatform = require('./../../db_modules/dbPlatform');

        var Q = require('q');

        proto.initGetPlatform = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlatform.getPlatform({
                    name: "testClientPlatform"  // get Platform
                }
            ).then(
                function (data) {
                    platformId = data.platformId;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };

    }

    proto.sendQQGroupControlSessionToFPMS = function (callback, requestData) {
        this._service.sendQQGroupControlSessionToFPMS.request(requestData);
        this._service.sendQQGroupControlSessionToFPMS.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.sendQQConversationToFPMS = function (callback, requestData) {
        this._service.sendQQConversationToFPMS.request(requestData);
        this._service.sendQQConversationToFPMS.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.bindPlayerQQInfo = function (callback, requestData) {
        this._service.bindPlayerQQInfo.request(requestData);
        this._service.bindPlayerQQInfo.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ClientQQGroupControlAPITest;
    } else {
        define([], function () {
            return ClientQQGroupControlAPITest;
        });
    }

})();