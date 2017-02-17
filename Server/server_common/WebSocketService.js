/******************************************************************
 *         Fantasy Player Management System
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

//客户端与服务端通信规则:
// 使用Json对象进行传输,
    // {"service": "aService", "functionName": "get", "status:": "200/404", "data": null}

var rootObj = {};

(function() {
    var proto;

///-----------------------WebSocketService  Start-------------------------------
    /**
     * 封装一组WebSocket相关的服务接口, 其下包含N个WebSocketFunction
     * @param {String} serviceName
     * @constructor
     */
    var WebSocketService = function (serviceName) {
        if (!serviceName)
            throw "Invalid Service Name";
        this.name = serviceName;
        this._functions = [];
        this._connOpts = {mask: false, binary: false, compress: false};
        this._connection = null;
        //WebSocket server
        this._wss = null;
    };

    proto = WebSocketService.prototype;

    /**
     * 设置WebSocket连接
     * @param {WebSocket} connection
     */
    proto.setConnection = function (connection) {
        this._connection = connection;
    };

    /**
     * 获取Service的WebSocket连接
     * @returns {null|WebSocket|*}
     */
    proto.getConnection = function () {
        return this._connection;
    };

    /**
     * Set WebSocket Server
     * @param {WebSocket} connection
     */
    proto.setWebSocketServer = function (wss) {
        this._wss = wss;
    };

    /**
     * 向服务端发送请求数据
     * @param {String} funcName
     * @param {Object} data
     * @private
     */
    proto._sendRequest = function (funcName, data) {
        if (!funcName || !this._connection)
            return;
        var packageData = {service: this.name, functionName: funcName, data: data};
        //console.log("_sendRequest:", packageData);
        this._connection.send(JSON.stringify(packageData));
    };

    /**
     * 向客户端发送响应
     * @param {WebSocket} conn
     * @param {String} funcName
     * @param {Object} data
     * @private
     */
    proto._sendResponse = function (conn, funcName, data, requestData) {
        if (!funcName || !conn)
            return;
        var packageData = {service: this.name, functionName: funcName, data: data};
        if( requestData && requestData.hasOwnProperty("requestId") ){
            packageData.requestId = requestData.requestId;
        }
        var res = JSON.stringify(packageData);
        //console.log("server _sendResponse:", res);
        try {
            conn.send(res);
        } catch (e) {
            // This happens quite often with clients who disconnect before we can send a response
            // We turn it into a small log, rather than throw it as a big unexpected error.
            console.log("Could not send to client:", e);
        }
    };

    /**
     * Notify client
     * @param {WebSocket} conn
     * @param {String} funcName
     * @param {Object} data
     * @private
     */
    proto._notify = function (conn, funcName, data) {
        this._sendResponse(conn, funcName, data);
    };

    /**
     * Broadcast client
     * @param {String} funcName
     * @param {Object} data
     * @private
     */
    proto._broadcast = function (funcName, data) {
        if (!funcName || !this._wss || !this._wss.broadcast)
            return;
        var packageData = {service: this.name, functionName: funcName, data: data};
        this._wss.broadcast(JSON.stringify(packageData));
    };

    /**
     * 向Service添加一个WebSocket function.
     * @param {WebSocketFunction} wsFunc
     */
    proto.addFunction = function (wsFunc) {
        if (!wsFunc || !wsFunc.name)
            throw "Invalid WebSocket function.";

        var functions = this._functions;
        var oldFunction = this.getFunction(wsFunc.name);
        if (oldFunction) {
            //warning.
            console.warn("override a function:" + wsFunc.name);
            var oldIdx = functions.indexOf(oldFunction);
            functions.splice(oldIdx, 1);
            oldFunction.setService(null);
        }
        wsFunc.setService(this);
        functions.push(wsFunc);
    };

    /**
     * 查询Function名称
     * @param {String} functionName
     * @returns {*}
     */
    proto.getFunction = function (functionName) {
        var functions = this._functions;
        for (var i = 0; i < functions.length; i++) {
            if (functionName == functions[i].name)
                return functions[i];
        }
        return null;
    };

    /**
     * 从Service中删除一个function
     * @param {String|WebSocketFunction} wsFunc
     */
    proto.removeFunction = function (wsFunc) {
        if (!wsFunc)
            return;
        var functions = this._functions;
        var oldIdx;
        if (typeof wsFunc === "string") {
            var selFunction = this.searchFunction(wsFunc);
            if (selFunction) {
                oldIdx = functions.indexOf(selFunction);
                functions.splice(oldIdx, 1);
                selFunction.setService(null);
            }
        } else {
            oldIdx = functions.indexOf(wsFunc);
            if (oldIdx > -1) {
                functions.splice(oldIdx, 1);
                wsFunc.setService(null);
            }
        }
    };


    /**
     * Send a message to message server
     * @param {String} type
     * @param {String} service
     * @param {String} functionName
     * @param {JSON} data
     */
    proto.sendMessage = function(type, service, functionName, data){
        this._wss.sendMessage(type, service, functionName, data);
    };

    rootObj.WebSocketService = WebSocketService;

///--------------------------WebSocketService end--------------------------------

///--------------------------WebSocketFunction start-----------------------------
    /**
     * 封装一个WebSocket功能.
     * @param {String} functionName
     * @constructor
     */
    var WebSocketFunction = function (functionName) {
        this.name = functionName;
        this._service = null;
    };

    proto = WebSocketFunction.prototype;

    /**
     * 设置Function的父Service.
     * @param service
     */
    proto.setService = function (service) {
        this._service = service;
    };

    /**
     * 获取Function所属的Service.
     * @returns {null|*}
     */
    proto.getService = function () {
        return this._service;
    };

    /**
     * Async function 服务端默认响应. 服务端无进行实现时,发向客户端发送未实现的消息
     * @param {WebSocketAsyncFunction} wsFunc 相关的function, 本可用this来获取,但可能会存在bind上下文的情况,所以提供一个参数
     * @param {WebSocket} conn
     * @param {Object} data
     */
    proto.onRequest = function (wsFunc, conn, data) {
        //the default implement.
        if (!wsFunc)
            return;

        var service = wsFunc.getService();
        var message = "The function " + service.name + "." + wsFunc.name + " is not implemented.";
        //console.log(message, data);
        wsFunc.response(conn, message);
    };

    rootObj.WebSocketFunction = WebSocketFunction;
    ///------------------------------WebSocketFunction end------------------------------

    ///------------------------------WebSocketAsyncFunction start-----------------------

    /**
     * 异步WebSocket功能.
     * 为客户端提供API让其能request, 可以设置onResponse 或 addListener 来监听响应, 也可以用once来设置响应
     * 服务端可以设置onRequest来响应客户端的请求, 用response来向客户端发送响应
     * @param {String} functionName
     * @param {Boolean} [clientFunc=false] 是否为客户端函数
     * @constructor
     */
    var WebSocketAsyncFunction = function (functionName, clientFunc) {
        WebSocketFunction.call(this, functionName);

        this._syncKey = null;
        this._requestListeners = [];
        this._requestListenersOnce = [];
        //synchronous once listeners key map, key is used for synchronization
        this._requestListenersOnceSync= {};
        this.clientFunction = clientFunc == null ? false : clientFunc;
    };

    proto = WebSocketAsyncFunction.prototype = Object.create(WebSocketFunction.prototype);
    proto.constructor = WebSocketAsyncFunction;

    /**
     * 向服务端发送请求
     * @param {String} data
     * @returns {proto}
     */
    proto.request = function (data) {
        if (!this._service)
            return this;         //invalid service

        this._service._sendRequest(this.name, data);
        return this;
    };

    /**
     * 添加function的response监听器
     * @param {function} listener
     */
    proto.addListener = function (listener) {
        if (!listener)
            return;
        this._requestListeners.push(listener);
    };

    /**
     * 清除response监听器
     * @param {function} listener
     */
    proto.removeListener = function (listener) {
        if (!listener)
            return;
        var listeners = this._requestListeners;
        var oldIdx = listeners.indexOf(listener);
        listeners.splice(oldIdx, 1);
    };

    /**
     * 清除所有response监听器
     */
    proto.removeAllListeners = function () {
        this._requestListeners.length = 0;
    };

    /**
     * 添加一次性Response监听器
     * @param listener
     */
    proto.once = function (listener) {
        if (!listener)
            return;
        this._requestListenersOnce.push(listener);
    };

    /**
     * Add synchronous once event listener
     * @param listener
     */
    proto.onceSync = function (key, listener) {
        if (!listener)
            return;
        this._requestListenersOnce.push(listener);
    };

    proto.dispatchResponse = function (data) {
        if (!data)
            return;
        var listeners = this._requestListeners, listenersOnce = this._requestListenersOnce, i, len; //是否分前后顺序
        for (i = 0, len = listeners.length; i < len; i++) {
            if (listeners[i] && typeof listeners[i] === "function")
                listeners[i](data);
        }

        for (i = 0, len = listenersOnce.length; i < len; i++) {
            if (listenersOnce[i] && typeof listenersOnce[i] === "function")
                listenersOnce[i](data);
        }
        listenersOnce.length = 0;
    };

    /**
     * 服务端向客户端发送响应的API
     * @param {WebSocket} conn
     * @param {*} data
     * @returns {WebSocketAsyncFunction}
     */
    proto.response = function (conn, data, requestData) {
        if (!this._service)
            return this;         //invalid service

        this._service._sendResponse(conn, this.name, data, requestData);
        return this;
    };

    rootObj.WebSocketAsyncFunction = WebSocketAsyncFunction;
    ///--------------------------WebSocketAsyncFunction End ------------------------------


    ///-------------------------WebSocketOneWayFunction Start ---------------------------
    /**
     * 单向WebSocket功能, 客户端只需向服务端发送消息,不需关注其响应.
     * 向客户端可通过request, 向服务端发送消息
     * 服务端可以设置onRequest来响应客户端的请求.
     * @param {String} functionName
     * @constructor
     */
    var WebSocketOneWayFunction = function (functionName) {
        WebSocketFunction.call(this, functionName);
    };

    proto = WebSocketOneWayFunction.prototype = Object.create(WebSocketFunction.prototype);
    proto.constructor = WebSocketOneWayFunction;

    /**
     * 向服务端发送消息
     * @param {*} data
     * @returns {proto}
     */
    proto.request = function(data){
        if (!this._service)
            return this;         //invalid service
        this._service._sendRequest(this.name, data);
        return this;
    };

    rootObj.WebSocketOneWayFunction = WebSocketOneWayFunction;
    ///------------------------WebSocketOneWayFunction End -------------------------------

    ///------------------------WebSocketNotification Start-----------------------------
    /**
     * WebSocket通知服务. 用于向客户端发送服务的推送消息.
     * 客户端可以设置onNotify 或 addListener来监听通知消息
     * 服务端可以通过response 来向客户端发送消息
     * @param {String} functionName
     * @constructor
     */
    var WebSocketNotification = function (functionName) {
        WebSocketAsyncFunction.call(this, functionName);
    };
    proto = WebSocketNotification.prototype = Object.create(WebSocketAsyncFunction.prototype);
    proto.constructor = WebSocketNotification;

    /**
     * Notify client
     * @param {*} data
     * @returns {proto}
     */
    proto.notify = function (data) {
        if (!this._service)
            return this;         //invalid service
        //todo::broadcast or alternative???
        this._service._broadcast(this.name, data);
        return this;
    };

    rootObj.WebSocketNotification = WebSocketNotification;
    ///------------------------WebSocketNotification End ---------------------------------

    ///------------------------------WebSocketSyncFunction start-----------------------

    /**
     * Synchronized WebSocket service function.
     * @param {String} functionName
     * @param {Array} keys to generate sync key
     * @constructor
     */
    var WebSocketSyncFunction = function (functionName, keys) {
        WebSocketFunction.call(this, functionName);
        this.isSync = true;
        //array of response fields to generate sync key
        this._syncKeys = keys;
        this._requestListeners = [];
        //synchronous once listeners key map, key is used for synchronization
        this._requestListenersOnceSync= {};
    };

    proto = WebSocketSyncFunction.prototype = Object.create(WebSocketFunction.prototype);
    proto.constructor = WebSocketSyncFunction;

    proto.appendSyncKey = function(data, keyValue){
        if( data && this._syncKeys && this._syncKeys.length == 1 && data[this._syncKeys[0]] === undefined ){
            data[this._syncKeys[0]] = keyValue;
        }
        return data;
    };

    proto.generateSyncKey = function(data){
        if( !data || !this._syncKeys )
            return;
        var key = "";
        for(var i = 0; i < this._syncKeys.length; i++){
            key += String(data[this._syncKeys[i]]);
        }
        return key;
    };

    /**
     * 向服务端发送请求
     * @param {String} data
     * @returns {proto}
     */
    proto.request = function (data) {
        if (!this._service)
            return this;         //invalid service

        this._service._sendRequest(this.name, data);
        return this;
    };

    /**
     * 添加function的response监听器
     * @param {function} listener
     */
    proto.addListener = function (listener) {
        if (!listener)
            return;
        this._requestListeners.push(listener);
    };

    /**
     * 清除response监听器
     * @param {function} listener
     */
    proto.removeListener = function (listener) {
        if (!listener)
            return;
        var listeners = this._requestListeners;
        var oldIdx = listeners.indexOf(listener);
        listeners.splice(oldIdx, 1);
    };

    /**
     * 清除所有response监听器
     */
    proto.removeAllListeners = function () {
        this._requestListeners.length = 0;
    };

    /**
     * Add synchronous once event listener
     * @param listener
     */
    proto.onceSync = function (key, listener) {
        if (!listener)
            return;
        //send null to prev listener
        if(!this._requestListenersOnceSync[key]){
            this._requestListenersOnceSync[key] = [];
        }
        this._requestListenersOnceSync[key].push(listener);
    };

    proto.dispatchResponse = function (data) {
        if (!data)
            return;
        var listeners = this._requestListeners, listenersOnce = this._requestListenersOnce, i, len; //是否分前后顺序
        for (i = 0, len = listeners.length; i < len; i++) {
            if (listeners[i] && typeof listeners[i] === "function")
                listeners[i](data);
        }

        var key = this.generateSyncKey(data);
        if( key ){
            if( this._requestListenersOnceSync[key] ) {
                for( var i = 0; i < this._requestListenersOnceSync[key].length; i++ ){
                    this._requestListenersOnceSync[key][i](data);
                }
                delete this._requestListenersOnceSync[key];
            }
            // else{
            //     console.log("Incorrect response data", data, key);
            // }
        }
    };

    /**
     * 服务端向客户端发送响应的API
     * @param {WebSocket} conn
     * @param {*} data
     * @returns {WebSocketAsyncFunction}
     */
    proto.response = function (conn, data) {
        if (!this._service)
            return this;         //invalid service

        this._service._sendResponse(conn, this.name, data);
        return this;
    };

    rootObj.WebSocketSyncFunction = WebSocketSyncFunction;
    ///--------------------------WebSocketAsyncFunction End ------------------------------

})();

if(typeof module !== "undefined" && module.exports) {
    module.exports = rootObj;
}else if(typeof define !== "undefined" && define.amd) {
    define([], function () {
        return rootObj;
    });
}