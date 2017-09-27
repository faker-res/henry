(function(){
    var isNode = (typeof module !== 'undefined' && module.exports);

    var rootObj = {};

    //create and add async function to WebSocketService
    var addServiceFunctions = function(sinonet, service, functionNames){
        for( var i = 0; i < functionNames.length; i++ ){
            service[functionNames[i]] = new sinonet.WebSocketAsyncFunction(functionNames[i]);
            service.addFunction(service[functionNames[i]]);
        }
    };

    //create and add sync function to WebSocketService
    var addServiceSyncFunctions = function(sinonet, service, functionNames, keys){
        for( var i = 0; i < functionNames.length; i++ ){
            service[functionNames[i]] = new sinonet.WebSocketSyncFunction(functionNames[i], keys);
            service.addFunction(service[functionNames[i]]);
        }
    };

    var defineConnectionService = function(sinonet){
        var ConnectionService = function(connection){
            sinonet.WebSocketService.call(this, "connection", connection);

            //define functions
            this.login = new sinonet.WebSocketAsyncFunction("login");
            this.addFunction(this.login);

            this.heartBeat = new sinonet.WebSocketAsyncFunction("heartBeat");
            this.addFunction(this.heartBeat);
        };

        ConnectionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConnectionService.prototype.constructor = ConnectionService;

        rootObj.ConnectionService = ConnectionService;
    };

    var defineAdminService = function(sinonet){
        var AdminService = function(connection){
            sinonet.WebSocketService.call(this, "user", connection);

            //define functions
            this.login = new sinonet.WebSocketAsyncFunction("login");
            this.addFunction(this.login);
        };

        AdminService.prototype = Object.create(sinonet.WebSocketService.prototype);
        AdminService.prototype.constructor = AdminService;

        rootObj.AdminService = AdminService;
    };

    var defineProviderService = function(sinonet){
        var ProviderService = function(connection){
            sinonet.WebSocketService.call(this, "provider", connection);

            //define functions
            this.add = new sinonet.WebSocketAsyncFunction("add");
            this.addFunction(this.add);

            this.update = new sinonet.WebSocketAsyncFunction("update");
            this.addFunction(this.update);

            this.delete = new sinonet.WebSocketAsyncFunction("delete");
            this.addFunction(this.delete);

            this.changeStatus = new sinonet.WebSocketAsyncFunction("changeStatus");
            this.addFunction(this.changeStatus);

            this.getProviderList = new sinonet.WebSocketAsyncFunction("getProviderList");
            this.addFunction(this.getProviderList);

            this.modifyCode = new sinonet.WebSocketAsyncFunction("modifyCode");
            this.addFunction(this.modifyCode);

            this.syncData = new sinonet.WebSocketAsyncFunction("syncData");
            this.addFunction(this.syncData);


        };

        ProviderService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ProviderService.prototype.constructor = ProviderService;

        rootObj.ProviderService = ProviderService;
    };

    var defineGameTypeService = function(sinonet){
        var GameTypeService = function(connection){
            sinonet.WebSocketService.call(this, "gameType", connection);

            //define functions
            this.add = new sinonet.WebSocketAsyncFunction("add");
            this.addFunction(this.add);

            this.update = new sinonet.WebSocketAsyncFunction("update");
            this.addFunction(this.update);

            this.modifyCode = new sinonet.WebSocketAsyncFunction("modifyCode");
            this.addFunction(this.modifyCode);

            this.delete = new sinonet.WebSocketAsyncFunction("delete");
            this.addFunction(this.delete);

            this.syncData = new sinonet.WebSocketAsyncFunction("syncData");
            this.addFunction(this.syncData);

            this.getGameTypeList = new sinonet.WebSocketAsyncFunction("getGameTypeList");
            this.addFunction(this.getGameTypeList);
        };

        GameTypeService.prototype = Object.create(sinonet.WebSocketService.prototype);
        GameTypeService.prototype.constructor = GameTypeService;

        rootObj.GameTypeService = GameTypeService;
    };

    var defineGameService = function(sinonet){
        var GameService = function(connection){
            sinonet.WebSocketService.call(this, "game", connection);

            //define functions
            this.add = new sinonet.WebSocketAsyncFunction("add");
            this.addFunction(this.add);

            this.update = new sinonet.WebSocketAsyncFunction("update");
            this.addFunction(this.update);

            this.delete = new sinonet.WebSocketAsyncFunction("delete");
            this.addFunction(this.delete);

            this.changeStatus = new sinonet.WebSocketAsyncFunction("changeStatus");
            this.addFunction(this.changeStatus);

            this.modifyCode = new sinonet.WebSocketAsyncFunction("modifyCode");
            this.addFunction(this.modifyCode);

            this.syncData = new sinonet.WebSocketAsyncFunction("syncData");
            this.addFunction(this.syncData);

            this.getGameList = new sinonet.WebSocketAsyncFunction("getGameList");
            this.addFunction(this.getGameList);

            this.syncGameImage = new sinonet.WebSocketAsyncFunction("syncGameImage");
            this.addFunction(this.syncGameImage);
        };

        GameService.prototype = Object.create(sinonet.WebSocketService.prototype);
        GameService.prototype.constructor = GameService;

        rootObj.GameService = GameService;
    };

    var defineConsumptionService = function(sinonet){
        var ConsumptionService = function(connection){
            sinonet.WebSocketService.call(this, "consumption", connection);

            //define functions
            this.addMissingConsumption = new sinonet.WebSocketAsyncFunction("addMissingConsumption");
            this.addFunction(this.addMissingConsumption);

            //define functions
            this.addConsumption = new sinonet.WebSocketAsyncFunction("addConsumption");
            this.addFunction(this.addConsumption);

            //define functions
            this.addConsumptionList = new sinonet.WebSocketAsyncFunction("addConsumptionList");
            this.addFunction(this.addConsumptionList);

            //define client functions
            this.transferIn = new sinonet.WebSocketAsyncFunction("transferIn", true);
            this.addFunction(this.transferIn);

            this.transferOut = new sinonet.WebSocketAsyncFunction("transferOut", true);
            this.addFunction(this.transferOut);

            this.updateTransferProgress = new sinonet.WebSocketAsyncFunction("updateTransferProgress", true);
            this.addFunction(this.updateTransferProgress);

            this.correctConsumptionList = new sinonet.WebSocketAsyncFunction("correctConsumptionList");
            this.addFunction(this.correctConsumptionList);

            this.updateConsumption = new sinonet.WebSocketAsyncFunction("updateConsumption");
            this.addFunction(this.updateConsumption);
        };

        ConsumptionService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ConsumptionService.prototype.constructor = ConsumptionService;

        rootObj.ConsumptionService = ConsumptionService;
    };

    var definePlatformService = function(sinonet){
        var PlatformService = function(connection){
            sinonet.WebSocketService.call(this, "platform", connection);

            //define functions
            var functionNames = [
                "getPlatformList",
                "getPlatform",
                "addProvider",
                "removeProvider",
                "syncProviders",
                "isUserExist",
                "getConsumptionIncentivePlayer",
                "getPlayerInfoByName",
                "verifyUserPassword"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlatformService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlatformService.prototype.constructor = PlatformService;

        rootObj.PlatformService = PlatformService;
    };

    var definePlayerService = function(sinonet){
        var PlayerService = function(connection){
            sinonet.WebSocketService.call(this, "player", connection);

            //define functions
            var functionNames = [
                "addPlayer",
                "addTestPlayer",
                "getLoginURL",
                "getTestLoginURL",
                "getConsumptionRecords",
                "getTransferRecords",
                "queryCredit",
                "transferIn",
                "transferOut",
                "checkUserOnline",
                "getGameUserInfo",
                "modifyGamePassword",
                "grabPlayerTransferRecords"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["username", "platformCode", "providerCode"]);
        };

        PlayerService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlayerService.prototype.constructor = PlayerService;

        rootObj.Player = PlayerService;
    };

    if(isNode){
        var sinonet = require("./../../server_common/WebSocketService");

        defineAdminService(sinonet);
        defineConnectionService(sinonet);
        defineProviderService(sinonet);
        defineGameService(sinonet);
        defineGameTypeService(sinonet);
        defineConsumptionService(sinonet);
        definePlatformService(sinonet);
        definePlayerService(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function(sinonet){

            defineAdminService(sinonet);
            defineConnectionService(sinonet);
            defineProviderService(sinonet);
            defineGameService(sinonet);
            defineGameTypeService(sinonet);
            defineConsumptionService(sinonet);
            definePlatformService(sinonet);
            definePlayerService(sinonet);
            return rootObj;
        });
    }
})();