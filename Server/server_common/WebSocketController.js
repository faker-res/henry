/******************************************************************
 *        Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

//todo:: to be replaced by WebSocketServer 应该改名叫WebSocketServer

var WebSocketServer = require("ws").Server;

/**
 * 用于封装WebSocket, 可用于注册Service, 并将收到的消息分发给对应的Service.
 *
 * @param {Number} port 监听端口
 * @constructor
 */
var WebSocketController = function(port){
    this._services = [];

    this.port = port;

    this._connection = null;
};

var proto = WebSocketController.prototype;

//客户端与服务端通信规则:
// 使用Json对象进行传输,
// {"service": "aService", "functionName": "get", "data": null}
proto._dispatch = function(conn, message){
    //在此对数据进行分发
    var serviceName = message["service"], funcName = message["functionName"];
    if(!serviceName|| !funcName){
        console.log("invalid function", message, serviceName, funcName);
        return;
    }

    var service = this.getService(serviceName);
    if(service){
        var wsFunc = service.getFunction(funcName);
        if(wsFunc && wsFunc.onRequest)
            wsFunc.onRequest(wsFunc, conn, message["data"]);
    }
};


//运行监听器
proto.run = function(){
    if(this._connection){
        console.log("The server is running.");
        return;
    }

    var conn = new WebSocketServer({port: this.port});
    var self = this;

    //ws server broadcast function
    conn.broadcast = function broadcast(data) {
        conn.clients.forEach(function each(client) {
            client.send(data);
        });
    };

    conn.on("connection", function(ws){
        //连接时进行验证
        console.log("A new connection is coming.");
        //add ws to array
        ws.on("message", function(message,flags){
            //需注意Socket的 4k上限 经测试,该版本已无限制,或许是text类型的原因.
            if(!message){
                return;
            }
            //todo::make sure the message can be parsed here
            var messageObj = JSON.parse(message);
            self._dispatch(ws, messageObj);
        });

        ws.on("close", function(code, message){
            console.log("Close the connection");
        });

        //todo::test code
        conn.broadcast("test broadcast");
    });
};

/**
 * 给控制器加入WebSocketService
 * @param {WebSocketService} service
 */
proto.addService = function(service){
    var services = this._services;
    if(!service || services.indexOf(service) > -1)
        return;

    var oldService = this.getService(service.name);
    if(oldService){
        //注销已注册的Service.
        var oldIdx = services.indexOf(oldService);
        services.splice(oldIdx,1);
        oldService.unregister();
    }

    //add
    services.push(service);
};

/**
 * 通过Service name 得到Service.
 * @param {String} serviceName
 * @returns {WebSocketService}
 */
proto.getService = function(serviceName){
    var services = this._services;
    for( var i = 0; i < services.length; i++){
        if(services[i].name === serviceName)
            return services[i];
    }
};

proto.clearService = function(){
    this._services.length = 0;
};

module.exports = WebSocketController;