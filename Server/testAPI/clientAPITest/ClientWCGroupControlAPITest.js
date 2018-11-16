(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientWCGroupControlAPITest = function (WCGroupControlService) {
        console.log('WCGroupControlService', WCGroupControlService)
        this._service = WCGroupControlService;
        if (!isNode) {
        }
    };
    var proto = ClientWCGroupControlAPITest.prototype;
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

    proto.sendWCGroupControlSessionToFPMS = function (callback, requestData) {
        this._service.sendWCGroupControlSessionToFPMS.request(requestData);
        this._service.sendWCGroupControlSessionToFPMS.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.sendWechatConversationToFPMS = function (callback, requestData) {
        this._service.sendWechatConversationToFPMS.request(requestData);
        this._service.sendWechatConversationToFPMS.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ClientWCGroupControlAPITest;
    } else {
        define([], function () {
            return ClientWCGroupControlAPITest;
        });
    }

})();