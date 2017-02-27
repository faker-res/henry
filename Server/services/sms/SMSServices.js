/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

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

    var defineSendingService = function(sinonet){
        var SendingService = function(connection){
            sinonet.WebSocketService.call(this, "sending", connection);

            //define functions
            var functionNames = [
                "sendMessage"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["tel"]);
        };

        SendingService.prototype = Object.create(sinonet.WebSocketService.prototype);
        SendingService.prototype.constructor = SendingService;

        rootObj.SendingService = SendingService;
    };

    var definePlatformService = function(sinonet){
        var PlatformService = function(connection){
            sinonet.WebSocketService.call(this, "platform", connection);

            //define functions
            var functionNames = [
                "syncData"
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        PlatformService.prototype = Object.create(sinonet.WebSocketService.prototype);
        PlatformService.prototype.constructor = PlatformService;

        rootObj.PlatformService = PlatformService;
    };

    var defineChannelService = function(sinonet){
        var ChannelService = function(connection){
            sinonet.WebSocketService.call(this, "channel", connection);

            //define functions
            var functionNames = [
                "getChannelList"
            ];
            addServiceSyncFunctions(sinonet, this, functionNames, ["queryId"]);
        };

        ChannelService.prototype = Object.create(sinonet.WebSocketService.prototype);
        ChannelService.prototype.constructor = ChannelService;

        rootObj.ChannelService = ChannelService;
    };

    if(isNode){
        var sinonet = require("./../../server_common/WebSocketService");
        defineSendingService(sinonet);
        defineConnectionService(sinonet);
        definePlatformService(sinonet);
        defineChannelService(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function(sinonet){
            defineConnectionService(sinonet);
            defineSendingService(sinonet);
            definePlatformService(sinonet);
            defineChannelService(sinonet);
            return rootObj;
        });
    }
})();