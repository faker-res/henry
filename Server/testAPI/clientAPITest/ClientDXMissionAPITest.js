(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    const testPlayerLoginData = {
        name: "testclientplayer",
        password: "123456",
        lastLoginIp: "192.168.3.22"
    };

    var ClientDXMissionAPITest = function (DXMissionService) {
        console.log('DXMissionService', DXMissionService)
        this.DXMissionService = DXMissionService;
        if (!isNode) {
            // comment out this part for now because it will overrite the loggined user
            // In the browser, do an immediate login with the testPlayerName, in order to get a value for testPlayerId
            // if( !window.testPlayer ){
            //     this.login(function (data) {
            //         var testPlayer = data.data;
            //         if (testPlayer) {
            //             window.testPlayer = testPlayer;
            //             window.testPlayerId = testPlayer.playerId;
            //             window.testPlayerObjId = testPlayer._id;
            //             window.testPlatformId = testPlayer.platform;
            //         } else {
            //             console.warn("Failed to log in testPlayer:", testPlayerLoginData);
            //         }
            //     });
            // }
        }
    };
    var proto = ClientDXMissionAPITest.prototype;
    var platformId = null;
    var smsCode = null;
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


    var date = new Date().getTime();
    var testPlayerObjId = !isNode && window.testPlayerObjId;
    var testPlayerId = !isNode && window.testPlayerId;

    var newTestPlayerObjId = null;
    var newTestPlayerId = null;



    proto.submitDXCode = function (callback, requestData) {
        let data = requestData || {};

        this.DXMissionService.submitDXCode.request(data);
        this.DXMissionService.submitDXCode.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.insertPhoneToTask = function (callback, requestData) {
        let data = requestData || {};

        this.DXMissionService.insertPhoneToTask.request(data);
        this.DXMissionService.insertPhoneToTask.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ClientDXMissionAPITest;
    } else {
        define([], function () {
            return ClientDXMissionAPITest;
        });
    }

})();