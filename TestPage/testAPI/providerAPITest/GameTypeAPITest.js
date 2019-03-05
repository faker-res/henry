(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var GameTypeAPITest = function (service) {
        this._service = service;
        //this.testGameTypeId = null;
    };

    var date = new Date().getTime();
    var proto = GameTypeAPITest.prototype;
    var testGameTypeCode = null;
    var providerId = null;

    if (isNode) {
        var dbGameType = require('./../../db_modules/dbGameType');
        var Q = require('q');

        proto.initGetGameTypes = function (callback, requestData) {
            var deferred = Q.defer();
            dbGameType.getAllGameTypes()
                .then(
                    function (data) {
                        providerId = data[0].providerId;
                        deferred.resolve(data[0]);
                    },
                    function (error) {
                        deferred.reject({name: "DBError", message: "Error in getting provider", error: error});
                    }
                );
            return deferred.promise;
        };
    }

    proto.add = function (callback, requestData) {
        var data = requestData ||
            {
                code: "testCode" + date,
                name: "testGameType" + date,
                description: "this game type is ..."
            };
        this._service.add.request(data);
        var self = this;
        this._service.add.once(function (data) {
            if (data.status == '200') {
                testGameTypeCode = data.data.code;
                if (!isNode) {
                    window.testGameTypeCode = testGameTypeCode;
                }
            }
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.update = function (callback, requestData) {
        var data = requestData ||
            {
                code: testGameTypeCode,
                name: "newTestGameType" + date,
                description: "Games all about ..."
            };
        this._service.update.request(data);
        this._service.update.once(callback);
    };

    proto.modifyCode = function (callback, requestData) {
        var data = requestData ||
            {
                oldCode: testGameTypeCode,
                newCode: "newTestCode" + date
            };
        this._service.modifyCode.request(data);
        this._service.modifyCode.once(callback);
    };

    proto.delete = function (callback, requestData) {
        var data = requestData || {code: testGameTypeCode};
        this._service.delete.request(data);
        this._service.delete.once(callback);
    };

    proto.syncData = function (callback, requestData) {
        var data = requestData || {
                gameTypeUpdates: [
                    {
                        code: testGameTypeCode,
                        name: "newName" + date
                    },
                    {
                        code: testGameTypeCode,
                        description: "New description ..."
                    }
                ]
            };
        this._service.syncData.request(data);
        this._service.syncData.once(callback);
    };

    proto.getGameTypeList = function (callback, requestData) {
        var data = requestData || {};
        this._service.getGameTypeList.request(data);
        this._service.getGameTypeList.once(callback);
    };

    if (isNode) {
        module.exports = GameTypeAPITest;
    } else {
        define([], function () {
            return GameTypeAPITest;
        });
    }
})();