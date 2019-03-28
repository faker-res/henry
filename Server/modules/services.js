var env = require("../config/env").config();
var serviceUtils = require('./serviceUtils');
var Q = require("q");

var ProviderServices = require('../services/provider/ProviderServices');
var PaymentServices = require('../services/payment/PaymentServices');
var ClientServices = require('../services/client/ClientServices');
var PaymentManagementServices = require("../services/pms/PaymentManagementServices");
var cpmsServices = require("../services/cpms/cpmsServices");
var smsServices = require("../services/sms/SMSServices");

/**
 *
 * @param {Array} serverURL
 * @param {Array} services
 * @param {String} [loginData.role]
 * @param {String} [loginData.name] - Required for payment login (See payment/ConnectionServiceImplement.js)
 * @param {String} [loginData.userName] - Required for provider login (See provider/ConnectionServiceImplement.js)
 * @param {String} [loginData.password]
 * @param {Object} [options]
 * @param {boolean} [options.autoReconnect] - Defaults to true
 *
 * @returns {Promise.<WebSocketClient>}
 */
function connectToServer (serverURL, services, loginData, options) {
    return new Promise(function (resolve, reject) {
        options = options || {};

        if (options.autoReconnect === undefined) {
            options.autoReconnect = false;
        }

        if (!serverURL) {
            throw Error("No serverURL provided for web socket connection");
        }

        let Client = serviceUtils.buildWSClient(services);

        openNewConnection(0);

        // In case the initial connect fails:
        if (options.autoReconnect) {
            startCheckingTimer(12000);
        }

        function openNewConnection (idx) {
            let url = serverURL[idx];

            if (url) {
                let client = new Client(url);
                client.connect();

                // We need to add fresh event listeners every time we connect, because client.connect() always creates a new underlying WebSocket.
                client.addEventListener("open", () => {
                    console.log(`Connected to ${url}`);
                    if (loginData) {
                        // We start a promise chain here because serviceUtils.callAPI() can occasionally throw a 'not opened' Error.
                        // (This might happen if a connection successfully establishes *after* the timeout, in which case `client` is now the new (establishing) connection, not this one which has just opened.)
                        Promise.resolve().then(
                            () => {
                                // Try to log in
                                var prom =
                                    client.getService("connection") && client.getService("connection").login ? serviceUtils.callAPI(client, 'connection', 'login', loginData)
                                        : client.getService("player") ? serviceUtils.callAPI(client, 'player', 'login', loginData)
                                        : Q.reject("Could not find service with which to log in.");
                                return prom;
                            }
                        ).then(
                            () => {
                                console.log(`Logged in as ${loginData.userName || loginData.name} to ${serverURL}`);
                                resolve(client)
                            }
                        ).catch(error => {
                            console.log(`Log in to ${serverURL} failed!`);
                            reject(error);
                        });
                    } else {
                        // No login was requested
                        resolve(client);
                    }
                });

                client.addEventListener("close", () => {
                    console.log("Disconnected from " + url);
                    // We don't know if this happened because we asked the socket to close, or because the network went down, or because the server restarted.
                    if (options.autoReconnect) {
                        startCheckingTimer(1000);
                    }
                });

                client.addEventListener("error", (err) => {
                    console.log("Error connect from " + url);
                    console.log('err', err);
                    if (idx + 1 < serverURL.length) {
                        console.log(`Connecting next url`);
                        openNewConnection(idx + 1);
                    } else {
                        if (options.autoReconnect) {
                            startCheckingTimer(1000, client);
                        }
                    }
                });
            } else {
                // Empty serverURL array
                throw Error("Empty serverURL array");
            }
        }

        var checkConnectionTimer = null;

        function startCheckingTimer (ms, client, url) {
            if (checkConnectionTimer) {
                // We don't need to start a timer, because there is already a timer doing the checking for us.
                // (This might happen if a connection successfully establishes *after* the timeout, so two connections are opened, and then both disconnect.)
                return;
            }
            checkConnectionIn(ms, client, url);
        }

        function checkConnectionIn (ms, client, url) {
            if (client) {
                checkConnectionTimer = setTimeout(function () {
                    if (client.isOpen()) {
                        // The connection has been established.  We can stop checking it now.  If it disconnects in future, the 'close' event will start checking again.
                        checkConnectionTimer = null;
                        return;
                    }
                    console.log("Reconnecting to " + url);
                    try {
                        // If an existing client is trying to connect, we tell it to abort, because we are going to create a new client.
                        // This should prevent the conditions above where two clients establish.
                        // However it could trigger a close event so we still need the check to prevent two timers from running.
                        client._connection.close();
                        // This won't work if the connection is connecting but not connected.  We only call it for debugTools tracking.
                        client.disconnect();
                    } catch (e) {}
                    openNewConnection(0);
                    // Allow at least 10 seconds for the connection to establish before checking again
                    if (ms < 10000) {
                        ms = 10000;
                    }
                    // Check again later if the reconnect was successful.  If not, retry.  Back off slowly.
                    checkConnectionIn(ms);
                }, ms);
            }
        }
    });
}

function allServicesIn (CollectionOfServices) {
    return Object.keys(CollectionOfServices).map(key => CollectionOfServices[key]);
}

function getProviderClient (userLoginData, options) {
    return connectToServer([env.providerAPIServerUrl], allServicesIn(ProviderServices), userLoginData, options);
}

function getPaymentClient (userLoginData, options) {
    return connectToServer([env.paymentAPIServerUrl], allServicesIn(PaymentServices), userLoginData, options);
}

function getClientClient (playerLoginData, options) {
    return connectToServer([env.clientAPIServerUrl], allServicesIn(ClientServices), playerLoginData, options);
}

function getContentProviderAPIClient (options) {
    if (env.disableCPAPI) {
        throw Error("You may not create this client: CPAPI is disabled.");
    }
    let selectedCpAPIUrl = [];
    if (options && options.platformId && env && env.cpAPIUrlList){
        if (env.cpAPIUrlList && env.cpAPIUrlList[options.platformId]) {
            selectedCpAPIUrl.push(env.cpAPIUrlList[options.platformId]);
        }

        if (env.cpAPIUrlList2 && env.cpAPIUrlList2[options.platformId]) {
            selectedCpAPIUrl.push(env.cpAPIUrlList2[options.platformId]);
        }
    }

    // choose the default url if there is not matching url
    if (env.cpAPIUrl){
        selectedCpAPIUrl.push(env.cpAPIUrl);
    }
    if (env.cpAPIUrl2){
        selectedCpAPIUrl.push(env.cpAPIUrl2);
    }

    return connectToServer(selectedCpAPIUrl, allServicesIn(cpmsServices), null, options);
}

function getContentProviderAPIClientForGame (options) {
    if (env.disableCPAPI) {
        throw Error("You may not create this client: CPAPI is disabled.");
    }
    //var loginData = { userName: 'admin', password: 'cpmsmon' };
    console.log("LH check updateImageUrl ------------1", env);
    console.log("LH check updateImageUrl ------------2", env.cpAPIUrlForGame);
    return connectToServer([env.cpAPIUrlForGame], allServicesIn(cpmsServices), null, options);
}

function getPaymentManagementClient (options) {
    if (env.disablePaymentAPI) {
        throw Error("You may not create this client: PaymentAPI is disabled.");
    }
    var loginData =  { name: 'testApiUser', password: '123' };
    return connectToServer([env.paymentAPIUrl], allServicesIn(PaymentManagementServices), loginData, options);
}

function getSMSAPIClient (options) {
    if (env.disableSMSAPI) {
        throw Error("You may not create this client: SMSAPI is disabled.");
    }
    //var loginData =  { name: 'testApiUser', password: '123' };
    // options = options || {autoReconnect: true};
    return connectToServer([env.smsAPIUrl], allServicesIn(smsServices), null, options);
}

module.exports = {
    getProviderClient: getProviderClient,
    getPaymentClient: getPaymentClient,
    getClientClient: getClientClient,
    getPaymentManagementClient: getPaymentManagementClient,
    getContentProviderAPIClient: getContentProviderAPIClient,
    getContentProviderAPIClientForGame: getContentProviderAPIClientForGame,
    getSMSAPIClient: getSMSAPIClient,
    callAPI: serviceUtils.callAPI
};
