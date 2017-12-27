(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);
    var Q, WebSocket;

    if (isNode) {
        Q = require("q");
        WebSocket = require("ws");
    }

    /**
     * 用于封装WebSocket client,
     * @param {String} url
     * @constructor
     */
    var WebSocketClient = function (url) {
        //
        this.url = url;
        this._services = [];

        this._connection = null;
        this._requestId = 0;

        this._heartBeatInterval = null;
    };

    var proto = WebSocketClient.prototype;

    proto.getRequestId = function () {
        this._requestId++;
        return this._requestId;
    };

    proto.startHeartBeat = function () {
        if (this._heartBeatInterval) {
            clearInterval(this._heartBeatInterval);
        }
        var self = this;
        this._heartBeatInterval = setInterval(
            function () {
                if (self.isOpen()) {
                    var beat = {
                        service: "connection",
                        functionName: "heartBeat",
                        data: {currentTime: new Date().getTime()}
                    };
                    //console.log(beat);
                    self._connection.send(JSON.stringify(beat));
                }
            }, 15 * 1000
        );
    },

    proto.connect = function () {
        var conn = new WebSocket(this.url);
        this._connection = conn;
        //for debug
        var self = this;
        // conn.onopen = function(){
        //     //conn.setKeepAlive(true);
        //     console.log("opened the connection");
        //     self.startHeartBeat();
        // };
        conn.onmessage = this._messageHandler.bind(this);
        var services = this._services;
        for (var i = 0; i < services.length; i++) {
            services[i].setConnection(conn);
        }

        var self = this;
        conn.onclose = function(event){
            //console.log("Web socket client connection closed!", event.target._events);
            if (self._heartBeatInterval) {
                clearInterval(self._heartBeatInterval);
            }
            //self._connection = null;
            //self.reconnect.bind(self)();
        };

        conn.onerror = function (error) {
            //console.error("Web socket client connection error!", error);
            // self._connection = null;
            // self.reconnect.bind(self)();
            if (self._heartBeatInterval) {
                clearInterval(self._heartBeatInterval);
            }
        };
    };

    /*
     * reconnect to message server
     */
    proto.reconnect = function () {
        var self = this;
        setTimeout(
            function () {
                if (!self._connection || self._connection.readyState != WebSocket.OPEN) {
                    self.connect();
                }
            }, 1000
        );

    };

    //check if ws connection is open
    proto.isOpen = function () {
        return this._connection ? this._connection.readyState == 1 : false;
    };

    proto.disconnect = function () {
        if (this.isOpen()) {
            this._connection.close();
        }
    };

    proto._messageHandler = function (message, flags) {
        //check if str can be parsed by JSON
        var IsJsonString = function (str) {
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        };

        if (!message || !message.data)
            return;
        //todo::temp function, add json parse check later
        //var messageData = message.data.replace(/'/g, '"');
        var messageData = message.data;
        //console.log("client _messageHandler:", messageData);
        if (IsJsonString(messageData)) {
            var data = JSON.parse(messageData);
            this._dispatch(data);
        }
    };

    proto._dispatch = function (dataObj) {
        //在此对数据进行分发
        var serviceName = dataObj["service"], funcName = dataObj["functionName"];
        if (!serviceName || !funcName) {
            console.log("No such service or function", serviceName, funcName, dataObj);
            return;
        }

        var service = this.getService(serviceName);
        if (service) {
            var wsFunc = service.getFunction(funcName);
            if (wsFunc) //async function
                wsFunc.dispatchResponse(dataObj["data"]);
        }
    };

    proto.addEventListener = function (eventType, handler) {
        if (!this._connection)
            return;
        this._connection.addEventListener(eventType, handler);
    };

    proto.getConnectionStatus = function () {
        if (!this._connection)
            return -1;       //not initial status
        return this._connection.readyState;
    };

    proto.addService = function (service) {
        var services = this._services;
        if (!service || services.indexOf(service) > -1)
            return;

        var oldService = this.getService(service.name);
        if (oldService) {
            //注销已注册的Service.
            var oldIdx = services.indexOf(oldService);
            services.splice(oldIdx, 1);
            //todo::add unregister function to WebSocketService
            oldService.unregister();
        }

        //add
        services.push(service);
    };

    proto.getService = function (serviceName) {
        var services = this._services;
        for (var i = 0; i < services.length; i++) {
            if (services[i].name === serviceName)
                return services[i];
        }
    };

    proto.callAPIOnce = function (serviceName, funcName, data) {
        var deferred = Q.defer();
        var service = this.getService(serviceName, true);
        if (service) {
            var wsFunc = service[funcName];
            if (wsFunc) {
                if (wsFunc.isSync) {
                    //append request id if needed
                    data = wsFunc.appendSyncKey(data, this.getRequestId());
                    // console.log("callAPIOnce:", data);
                    wsFunc.request(data);
                    var key = wsFunc.generateSyncKey(data);
                    wsFunc.onceSync(key, function (res) {
                        if (res && res.status == 200) {
                            var resObj = Object.assign({}, res);
                            delete resObj.status;
                            delete resObj.errorMsg;
                            deferred.resolve(resObj);
                        }
                        else {
                            //delete res.status;
                            res.errorMessage = res.errorMessage || res.errorMsg;
                            deferred.reject(res);
                            // Probably not a good idea for production: If we try to store an Error object in the DB logs, it will become {}
                            //deferred.reject(Error(`Error ${res.status} during call to ${serviceName}/${funcName} req: ${JSON.stringify(data)} res: ${JSON.stringify(res)}`));
                        }
                    });
                }
                else {
                    // console.log("callAPIOnce:", data);
                    wsFunc.request(data);
                    wsFunc.once(function (res) {
                        if (res && res.status == 200) {
                            var resObj = Object.assign({}, res);
                            delete resObj.status;
                            delete resObj.errorMsg;
                            deferred.resolve(resObj);
                        }
                        else {
                            //delete res.status;
                            res.errorMessage = res.errorMessage || res.errorMsg;
                            deferred.reject(res);
                            // Probably not a good idea for production: If we try to store an Error object in the DB logs, it will become {}
                            //deferred.reject(Error(`Error ${res.status} during call to ${serviceName}/${funcName} req: ${JSON.stringify(data)} res: ${JSON.stringify(res)}`));
                        }
                    });
                }
                //if there is no response after 30 seconds, consider request time out
                setTimeout(
                    function () {
                        deferred.reject({
                            status: 430,
                            errorMessage: "Service:" + serviceName + " functionName:" + funcName + " Request timeout!"
                        });
                    }, 60*1000//1 minute timeout
                );
            }
            else {
                deferred.reject({name: "APIError", message: "Invalid func name: " + funcName + " in service " + serviceName});
            }
        }
        else {
            deferred.reject({name: "APIError", message: "Invalid service name: " + serviceName});
        }
        return deferred.promise;
    };

    if (isNode) {
        module.exports = WebSocketClient;
    } else {
        define([], function () {
            return WebSocketClient;
        });
    }
})();