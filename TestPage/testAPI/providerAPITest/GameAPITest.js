(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var GameAPITest = function (service) {
        this._service = service;
        //this.testGameId = null;
    };

    var date = new Date().getTime();
    var proto = GameAPITest.prototype;
    var testGameId = null;
    var providerId = null;
    var code = null;
    if (isNode) {

        var dbGameProvider = require('./../../db_modules/dbGameProvider');

        var Q = require('q');

        proto.initGetProvider = function (callback, requestData) {
            var deferred = Q.defer();
            dbGameProvider.getAllGameProviders()
                .then(
                    function (data) {
                        providerId = data[0].providerId;
                        code = code;
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
        //todo:: update test data here
        var data = requestData ||
            {
                name: "testGame" + date,
                providerCode: providerId,
                gameId: "testGame" + date
            };
        this._service.add.request(data);
        var self = this;
        this._service.add.once(function (data) {
            if (data.status == '200') {
                testGameId = data.data.gameId;
                if (!isNode) {
                    window.testGameId = testGameId;
                }
            }
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

//update
    proto.update = function (callback, requestData) {
        var data = requestData ||
            {
                name: "testGame" + date,
                code: code,
                gameId: testGameId,
                description: "This is a test game.",
                title: 'title',
                type: "action",
                showPriority: 1000
            };
        this._service.update.request(data);
        var self = this;
        this._service.update.once(function (data) {

            //self.testGameId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };


    proto.changeStatus = function (callback, requestData) {
        var data = requestData || {
                gameId: testGameId,
                code: code,
                status: "Enable"
            };
        this._service.changeStatus.request(data);
        var self = this;
        this._service.changeStatus.once(function (data) {
            //self.testGameId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };


    proto.delete = function (callback, requestData) {
        var data = requestData || {gameId: testGameId};
        this._service.delete.request(data);
        var self = this;
        this._service.delete.once(function (data) {
            //self.testGameId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.modifyCode = function (callback, requestData) {
        var data = requestData || {gameId: testGameId};
        this._service.modifyCode.request(data);
        var self = this;
        this._service.modifyCode.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncData = function (callback, requestData) {
        var data = requestData || {
                "games":[
                    {"bigShow":"http://www.meitu.com/con/cc.png","code":"lfzt","description":"龙飞在天是一款网络在线游戏",
                        "gameId":1,"type":1,"name":"龙飞在天","providerId":"1","showPriority":1,
                        "smallShow":"http://www.meitu.com/con/cc.png","status":1,"title":""}
                ]
            };
        this._service.syncData.request(data);
        var self = this;
        this._service.syncData.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncWebp = function (callback, requestData) {
        var data = requestData || {
                "games":[
                    {
                        "gameId": "001E1A76-F730-4287-A915-51F9DC7E192CWW",
                        "webp": "/cpms/baibo/PT/test.webp"
                    }
                ]
            };
        this._service.syncWebp.request(data);
        var self = this;
        this._service.syncWebp.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };



    proto.getGameList = function (callback, requestData) {
        var data = requestData || {_id: providerId};
        this._service.getGameList.request(data);
        this._service.getGameList.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.syncGameImage = function(callback, requestData) {
        var data = requestData ||
            {
                "games": [{
                    "platformId": 1,
                    "gameId": "01A61989-4B4B-4205-BF97-1D6F4364E657",
                    "imgAddr": "http://images.pms8.me/cpms/1eadb799-fc30-4230-adcb-38d6ba1863ab.png"
                }, {
                    "platformId": 2,
                    "gameId": "01A61989-4B4B-4205-BF97-1D6F4364E657",
                    "imgAddr": "http://images.pms8.me/cpms/510613c4-5103-497d-8a5e-a5ff8d679468.png"
                }, {
                    "platformId": 7,
                    "gameId": "01538B18-C522-4E1C-B9AA-FD1199726008",
                    "imgAddr": "http://images.pms8.me/cpms/62584ee1-d5b7-47ca-9b21-2c000c9734f1.jpg"
                }]
            };
        this._service.syncGameImage.request(data);
        var self = this;
        this._service.syncGameImage.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = GameAPITest;
    } else {
        define([], function () {
            return GameAPITest;
        });
    }
})();
