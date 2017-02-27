/**
 * This module is a singleton.  It holds data about the server running in the current process.
 *
 * Using it means we cannot run two servers in one process.
 *
 * But the advantage is that modules can find the environment they are running in, without having to pass this context down from server.js down to library code.
 *
 * Use it sparingly!  This module encapsulates the code smell in one place (plus wherever it is used).
 */

var serverType;
var webSocketMessageClient;
var cpAPIClient;
var paymentAPIClient;
var smsAPIClient;
var queryId = 0;

var serverInstance = {

    setServerType: function (_serverType) {
        ensureEmpty(serverType);
        serverType = _serverType;
    },

    getServerType: function () {
        return serverType;
    },

    setWebSocketMessageClient: function (_webSocketMessageClient) {
        ensureEmpty(webSocketMessageClient);
        webSocketMessageClient = _webSocketMessageClient;
    },

    getWebSocketMessageClient: function () {
        return webSocketMessageClient;
    },

    getWebSocketServer: function () {
        if(webSocketMessageClient && webSocketMessageClient.getWebSocketServer ){
            return webSocketMessageClient.getWebSocketServer();
        }
    },

    setCPAPIClient: function (client, overwriteAllowed) {
        //ensureEmpty(cpAPIClient, overwriteAllowed);
        cpAPIClient = client;
    },

    getCPAPIClient: function () {
        return cpAPIClient;
    },

    setPaymentAPIClient: function (client, overwriteAllowed) {
        ensureEmpty(paymentAPIClient, overwriteAllowed);
        paymentAPIClient = client;
    },

    getPaymentAPIClient: function () {
        return paymentAPIClient;
    },

    setSMSAPIClient: function (client, overwriteAllowed) {
        //ensureEmpty(cpAPIClient, overwriteAllowed);
        smsAPIClient = client;
    },

    getSMSAPIClient: function () {
        return smsAPIClient;
    },

    getQueryId: function(){
        queryId++;
        return queryId;
    }

};

function ensureEmpty (value, overwriteAllowed) {
    if (value !== undefined && !overwriteAllowed) {
        throw new Error("Attempt to overwrite already set value in serverInstance");
    }
}

module.exports = serverInstance;
