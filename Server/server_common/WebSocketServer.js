/******************************************************************
 *        Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
//Server side only

var ws = require("ws");
//var errorUtils = require("../modules/errorUtils.js");

//客户端与服务端通信规则:
// 使用Json对象进行传输,
// {"service": "aService", "functionName": "get", "data": null}

/**
 * 用于封装WebSocket, 可用于注册Service, 并将收到的消息分发给对应的Service.
 * @param {Number} port 监听端口
 * @constructor
 */
var WebSocketServer = function (port) {
    //server services
    this._services = [];
    //client services to call client api
    this._clientServices = [];
    //todo::remove clients
    this._clients = [];
    this.port = port;
    //todo::remove connection
    this._connection = null;
    //websocket server
    this._wss = null;
    //if need authentication for connection
    this._needAuth = false;
    //message web socket client
    this._messageClient = null;
};

var proto = WebSocketServer.prototype;

/**
 * Set message web socket client
 */
proto.setMessageClient = function (client) {
    this._messageClient = client;
};

proto.getMessageClient = function () {
    return this._messageClient;
};

/**
 * Set server authentication flag
 */
proto.setAuth = function (bAuth) {
    this._needAuth = bAuth;
};

/**
 * Handle server received message
 * Dispatch message data to correspoding service and function
 */
proto._dispatch = function (conn, message, bClient) {
    //在此对数据进行分发
    var serviceName = message["service"], funcName = message["functionName"];
    if (!serviceName || !funcName) {
        console.log("No such service or function", serviceName, funcName);
        console.log("Called from:", new Error().stack);
        return;
    }
    var bClient = false;
    var service = this.getService(serviceName);
    if (!service) {
        service = this.getService(serviceName, true);
        bClient = service ? true : false;
    }

    if (service) {
        var wsFunc = service.getFunction(funcName);
        //在此进行验证.
        if (wsFunc) {
            message["data"] = message["data"] || {};
            if (bClient) {
                wsFunc.dispatchResponse(message["data"]);
            }
            else {
                if (message.hasOwnProperty("requestId")) {
                    message["data"].requestId = message["requestId"];
                }
                // If a bug in a wsFunc causes an Error to be thrown before the request is passed to WebSocketUtil,
                // then that Error will crash the server!  To avoid that, we will catch any errors here.
                try {
                    wsFunc.onRequest(wsFunc, conn, message["data"]);
                } catch (err) {
                    console.error("Error while initiating wsFunc:", message, err);
                    //errorUtils.reportError(err);
                    // It would be appropriate to inform the client of the failure, rather than leave them guessing.
                    //WebSocketUtil.errorResponse(conn, wsFunc, message.data, err);
                }
            }
        }
    }

};


/**
 * 运行服务器
 */
proto.run = function () {
    if (this._wss) {
        console.log("The server is running.");
        return;
    }

    this._wss = new ws.Server({port: this.port});
    var self = this;
    //ws server broadcast function
    this._wss.broadcast = function broadcast(data) {
        self._wss.clients.forEach(function each(client) {
            client.send(data);
        });
    };

    //check if str can be parsed by JSON
    var IsJsonString = function (str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    };

    this._wss.on("connection", function (ws) {         //连接时进行验证
        console.log("A new connection is coming.");
        //if need authentication for this connection, set the isAuth to false
        //检测socket链接是否需要验证
        ws.isAuth = !self._needAuth;
        ws.noOfAttempt = -1;
        self.addClient(ws);
        //add ws to array
        ws.on("message", function (message, flags) {   //需注意Socket的 4k上限
            console.log("server message: ", message);
            if (!message || !IsJsonString(message))
                return;
            message = JSON.parse(message);

            self._dispatch(ws, message);
        });

        ws.on("close", function (code, message) {
            console.log("Close the connection", code, message);
            self.removeClient(ws);
        });

        //todo::test code
        //self._wss.broadcast(JSON.stringify({test:"broadcast"}));

        //update service wss
        for (service of self._services) {
            service.setWebSocketServer(self);
        }
    });
};

/**
 * 给控制器加入WebSocketService
 * @param {WebSocketService} service
 */
proto.addService = function (service, bClient) {
    var services = bClient ? this._clientServices : this._services;
    if (!service || services.indexOf(service) > -1)
        return;

    var oldService = this.getService(service.name, bClient);
    if (oldService) {
        //注销已注册的Service.
        var oldIdx = services.indexOf(oldService);
        services.splice(oldIdx, 1);
        oldService.unregister();
    }

    services.push(service);

    service.setWebSocketServer(this._wss);

};

/**
 * 通过Service name 得到Service.
 * @param {String} serviceName
 * @returns {WebSocketService}
 */
proto.getService = function (serviceName, bClient) {
    var services = bClient ? this._clientServices : this._services;
    for (var i = 0; i < services.length; i++) {
        if (services[i].name === serviceName)
            return services[i];
    }
};

proto.addClient = function (socket) {
    if (!socket)
        return;

    var clients = this._clients;
    if (clients.indexOf(socket) > -1)
        clients.push(ws);
};

proto.removeClient = function (socket) {
    if (socket)
        return;

    var clients = this._clients;
    var idx = clients.indexOf(socket);
    if (idx === -1)
        return;
    clients.splice(idx, 1);
};

//通知类API主要用于聊天. 以及一些站内消息
/**
 * 向所有已连接的客户端发送实时广播
 * @param {Object} data
 */
proto.broadcast = function (data) {

};


proto.broadcastToCertified = function (data) {

};

/**
 * Send a message to message server
 * @param {String} type
 * @param {String} service
 * @param {String} functionName
 * @param {JSON} data
 */
proto.sendMessage = function (type, service, functionName, data) {
    this._messageClient.sendMessage(type, service, functionName, data);
};

/**
 * 清除所有的服务.
 */
proto.clearService = function () {
    this._services.length = 0;
};

module.exports = WebSocketServer;