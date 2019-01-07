(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ClientAuctionAPITest = function (auctionService) {
        this._service = auctionService;
        if (!isNode) {
        }
    };
    var proto = ClientAuctionAPITest.prototype;
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

    proto.isQualify = function (callback, requestData) {
        this._service.isQualify.request(requestData);
        this._service.isQualify.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.bidAuctionItem = function (callback, requestData) {
        this._service.bidAuctionItem.request(requestData);
        this._service.bidAuctionItem.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };


    if (isNode) {
        module.exports = ClientAuctionAPITest;
    } else {
        define([], function () {
            return ClientAuctionAPITest;
        });
    }

})();