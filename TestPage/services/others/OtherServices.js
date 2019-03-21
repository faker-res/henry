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

    var defineOtherService = function(sinonet){
        var OtherServices = function(connection){
            sinonet.WebSocketService.call(this, "others", connection);

            //define functions
            var functionNames = [
                "encryptMessage",
            ];
            addServiceFunctions(sinonet, this, functionNames);
        };

        OtherServices.prototype = Object.create(sinonet.WebSocketService.prototype);
        OtherServices.prototype.constructor = OtherServices;

        rootObj.OtherServices = OtherServices;
    };

    if(isNode){
        var sinonet = require("./../../server_common/WebSocketService");
        defineOtherService(sinonet);
        module.exports = rootObj;
    } else {
        define(["common/WebSocketService"], function(sinonet){
            defineOtherService(sinonet);
            return rootObj;
        });
    }
})();