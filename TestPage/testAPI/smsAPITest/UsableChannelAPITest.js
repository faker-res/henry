(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var UsableChannelAPITest = function (service) {
        this._service = service;

    };
    var testPlatformId = null;
    var proto = UsableChannelAPITest.prototype;

    if (isNode)     {
        var dbPlatform = require('./../../db_modules/dbPlatform');

        dbPlatform.getPlatform({
                name: "testClientPlatform"  // get Platform
            }
        ).then(
            function (data) {
                testPlatformId = data.platformId;
            },
            function (error) {
                // deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
            }
        );
    }

    proto.getUsableChannelList = function (callback, requestData) {
        let data = requestData || {
            platformId: testPlatformId
        };
        this._service.getUsableChannelList.request(data);
        this._service.getUsableChannelList.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = UsableChannelAPITest;
    } else {
        define([], function () {
            return UsableChannelAPITest;
        });
    }

})();
