"use strict";

/*
 * Common functions for creating websocket services, and calling them.
 *
 * For connecting and logging in, see services.js
 */

// If we want to separate buildWSClient from WebSocketServer, e.g. for use in client code, we could extract it to a separate module.

var WebSocketClient = require('../server_common/WebSocketClient');
var WebSocketServer = require('../server_common/WebSocketServer');

function buildWSClient (services) {
    var Client = function (url) {
        WebSocketClient.call(this, url);

        services.forEach(
            Service => this.addService(new Service())
        );
    };

    var proto = Client.prototype = Object.create(WebSocketClient.prototype);
    proto.constructor = Client;

    return Client;
}

function buildWSServer (services, useSSL) {
    var Server = function(port){
        WebSocketServer.call(this, port);

        services.forEach(
            Service => this.addService(new Service())
        );
    };

    Server.prototype = Object.create(WebSocketServer.prototype);
    Server.prototype.constructor = Server;

    return Server;
}

function callAPI (client, serviceName, funcName, data) {
    /*
    return new Q.Promise(
        (resolve, reject) => {
            var service = client.getService(serviceName);
            if (!service) {
                reject(Error("Service is not defined: " + serviceName));
                return;
            }
            var apiFunction = service[funcName];
            if (!apiFunction) {
                reject(Error("No such api function: " + funcName));
                return;
            }
            apiFunction.request(data);
            // @todo When apiFunction.isSync, should use .generateSynKey() and call .onceSync()
            apiFunction.once(
                (data) => {
                    if (data.status === 200) {
                        resolve(data.data);
                    } else {
                        reject(Error(`Error ${data.status} during call to ${serviceName}/${funcName}: ${data.errorMessage || JSON.stringify(data)}`));
                    }
                }
            );
        }
    );
    */
    return client.callAPIOnce(serviceName, funcName, data);
}

module.exports = {
    buildWSClient: buildWSClient,
    buildWSServer: buildWSServer,
    callAPI: callAPI
};