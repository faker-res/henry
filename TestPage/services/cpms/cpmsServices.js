(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var rootObj = {};

    //create and add async function to WebSocketService
    var addServiceFunctions = function (sinonet, service, functionNames) {
        for (var i = 0; i < functionNames.length; i++) {
            service[functionNames[i]] = new sinonet.WebSocketAsyncFunction(functionNames[i]);
            service.addFunction(service[functionNames[i]]);
        }
    };

    //create and add sync function to WebSocketService
    var addServiceSyncFunctions = function (sinonet, service, functionNames, keys) {
        for (var i = 0; i < functionNames.length; i++) {
            service[functionNames[i]] = new sinonet.WebSocketSyncFunction(functionNames[i], keys);
            service.addFunction(service[functionNames[i]]);
        }
    };

    var defineConnectionService = function (sinonet) {
        var ConnectionService = function (connection) {
            sinonet.WebSocketService.call(this, "connection", connection);

            //define functions
            var functionNames = [
                "login",
                "heartBeat"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        ConnectionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConnectionService.prototype.constructor = ConnectionService;

        rootObj.ConnectionService = ConnectionService;
    };

    var definePlayerService = function (sinonet) {
        var PlayerService = function (connection) {
            sinonet.WebSocketService.call(this, "player", connection);

            //define functions
            var functionNames = [
                "addPlayer",
                "addTestPlayer",
                "getLoginURL",
                "getTestLoginURL",
                "getTestLoginURLWithOutUser",
                "getConsumptionRecords",
                "getTransferRecords",
                "queryCredit",
                "queryCreditByPlatformId",
                "checkUserOnline",
                "getGameUserInfo",
                "modifyGamePassword",
                "grabPlayerTransferRecords",
                "syncPlatforms",
                "getCreditLog",
                "getGamePassword"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["username", "platformId", "providerId"]);

            var functionNames1 = [
                "transferIn",
                "transferOut",
            ];
            addServiceSyncFunctions(sinonet, this, functionNames1, ["username", "platformId", "providerId", "transferId"]);
        };

        PlayerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlayerService.prototype.constructor = PlayerService;

        rootObj.PlayerService = PlayerService;
    };

    var defineGameService = function (sinonet) {
        var GameService = function (connection) {
            sinonet.WebSocketService.call(this, "game", connection);
            //define functions
            var functionNames = [
                "updateImageUrl"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["platformId", "gameId", "gameName"]);
        };
        GameService.prototype = Object.create(sinonet.WebSocketService.prototype);
        GameService.prototype.constructor = GameService;
        rootObj.GameService = GameService;
    };

    var defineConsumptionService = function (sinonet) {
        var ConsumptionService = function (connection) {
            sinonet.WebSocketService.call(this, "consumption", connection);
            //define functions
            var functionNames = [
                "getConsumptionSummary",
                "reSendConsumption"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["platformId"]);
        };
        ConsumptionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConsumptionService.prototype.constructor = ConsumptionService;
        rootObj.ConsumptionService = ConsumptionService;
    };

    if (isNode) {
        var sinonet = require("./../../server_common/WebSocketService");
        definePlayerService(sinonet);
        defineConnectionService(sinonet);
        defineGameService(sinonet);
        defineConsumptionService(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function (sinonet) {
            defineConnectionService(sinonet);
            definePlayerService(sinonet);
            defineGameService(sinonet);
            defineConsumptionService(sinonet);
            return rootObj;
        });
    }
})();
