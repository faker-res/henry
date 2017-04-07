var env = require("../config/settlementEnv").config();
var SettlementServices = require("../settlementService/SettlementServices");
var WebSocketClient = require("../server_common/WebSocketClient");
var streamUtils = require('../modules/streamUtils');

var defaultOptions = {
    // This ensures the remote server always has work to do.
    // We will make this many requests to each client in parallel.
    // When one response comes back, we will send a new request.
    maximumRequestPerClient: 10
};

var Client = function (url) {
    WebSocketClient.call(this, url);

    var playerService = new SettlementServices.PlayerService();
    this.addService(playerService);
};
Client.prototype = Object.create(WebSocketClient.prototype);

var SettlementBalancer = function (config) {
    //all services
    this._services = [];
    //all connections
    this._conns = [];

    //todo::remove connection
    this._connection = null;

    config = config || {};
    for (var k in defaultOptions) {
        if (typeof config[k] === 'undefined') {
            config[k] = defaultOptions[k];
        }
    }
    this._config = config;
};

var proto = SettlementBalancer.prototype;

//create connections to all settlement ws server
proto.initConns = function () {

    //create connections to all web socket servers and processes
    for (var i = 0; i < env.wss.length; i++) {
        for (var j = 0; j < env.numOfProcess; j++) {
            this._conns.push(new Client(env.wss[i]));
        }
    }
    var proms = this._conns.map(function (client) {
        client.connect();
        return new Promise(function (resolve, reject) {
            client.addEventListener("open", resolve);
            client.addEventListener("error", function (error) {
                error.message += " (initiated by SettlementBalancer::initConns)";
                reject(error);
            });
        });
    });
    return Promise.all(proms);
};

proto.request = function (serviceName, functionName, params) {
    var client = this._conns[Math.floor(this._conns.length * Math.random())];

    return new Promise(function (resolve, reject) {
        var service = client.getService(serviceName);

        service[functionName].request(params);
        service[functionName].once(function (data) {
            clearTimeout(timer);
            resolve(data);
        });

        // If there is no response within a given time, reject the promise
        var timer = setTimeout(function () {
            var errorMessage = `Request to ${serviceName}:${functionName} timed out.`;
            reject(Error(errorMessage));
        }, 10 * 60 * 1000);
    });
};

proto.pipeStreamTo = function (stream, prepareRequest, processResponse) {
    var config = this._config;

    var totalActiveRequests = 0;
    var totalCompletedRequests = 0;
    // ready as in "I am ready to process another request"
    var readyClients = this._conns.slice(0);
    readyClients.forEach(function (client) {
        client.activeRequests = 0;
        client.processedRequests = 0;
    });

    var streamEnded = false;
    var ignoring = false;

    return new Promise(function (resolve, reject) {
        readyClients.forEach(function (client) {
            client.addEventListener('close', function (closeEvent) {
                reject(new Error('Client closed while streaming.  (Probably one of the settlement servers crashed or restarted.)'));
            });
        });

        stream.on('data', function (data) {
                if (ignoring) {
                    return;
                }
                // console.log(JSON.stringify(readyClients.map(function (client) { return { url: client.url, activeRequests: client.activeRequests, processedRequests: client.processedRequests }; })));
                if (readyClients.length === 0) {
                    throw new Error("BUG: No idle clients.  Stream should have been paused.");
                }
                var client = readyClients.pop();
                client.activeRequests++;
                totalActiveRequests++;
                if (client.activeRequests < config.maximumRequestPerClient) {
                    readyClients.unshift(client);
                }
                if (readyClients.length === 0) {
                    stream.pause();
                }
                prepareRequest(data, function (serviceName, functionName, params) {
                    var service = client.getService(serviceName);
                    service[functionName].request(params);
                    //service[functionName].once(handleResponse);
                    //service[functionName].
                    if (service[functionName]._requestListeners.length <= 0) {
                        service[functionName].addListener(handleResponse);
                    }
                });
                function handleResponse(responseData) {
                    processResponse(responseData);
                    if (client.activeRequests === config.maximumRequestPerClient) {
                        readyClients.unshift(client);
                    }
                    client.activeRequests--;
                    client.processedRequests++;
                    totalActiveRequests--;
                    totalCompletedRequests++;
                    // console.log("Client %s responded with:", client.url, responseData);
                    // console.log("now total: %s active: %s process: %d", client.url, client.activeRequests, totalActiveRequests, totalCompletedRequests);
                    if (responseData.errorMessage) {
                        // reject(responseData);
                        reject(Error("Client responded with error: " + JSON.stringify(responseData)));
                        // CONSIDER: It might be better to reject with a node-custom-error
                        //reject(SinoError("Client responded with error", responseData));

                        // After an error, we will not process the rest of the stream.  So we either need to close or drain the stream.
                        // http://stackoverflow.com/questions/19277094/how-to-close-a-readable-stream-before-end
                        // The methods close() and destroy() do exist in node streams, but they are not documented.  (destroy is probably ok.)
                        //stream.close();
                        //stream.destroy();
                        // This won't drain the input stream, so it might stay open for a long time.  (Probably not a good idea!)
                        //stream.pause();
                        // Drain the input stream.  (Safe, but takes longer than immediately closing it.)
                        ignoring = true;
                        stream.resume();

                        checkForCompletion();
                    } else {
                        // We usually see ended=true, closed=false, because batchedStream fires 'end' immediately after emitting the last batch.
                        stream.resume();
                        checkForCompletion();
                    }
                }
            })
            .on('error', reject)
            .on('end', function () {
                streamEnded = true;
                // This check is needed if the stream had no input at all.
                checkForCompletion();
            })
            // Apparently 'close' only gets fired in case of an error (in which case 'error' should have been called before it anyway): http://maxogden.com/node-streams.html
            .on('close', reject);

        function checkForCompletion() {
            if (totalActiveRequests === 0 && streamEnded) {
                endPiping();
            }
        }

        function endPiping() {
            // console.log("Finally: " + JSON.stringify(readyClients.map(function (client) { return { url: client.url, activeRequests: client.activeRequests, processedRequests: client.processedRequests }; })));
            // console.log("Distribution of processed requests: " + JSON.stringify(readyClients.map(function (client) { return client.processedRequests; })));
            resolve(totalCompletedRequests);
        }
    });
};

proto.close = function close() {
    // Cleanup connections and services, destroy clients
    this._conns.forEach(
        (client) => client.disconnect()
    );
};

// Convenience function
// @param {Stream} options.stream - The stream of input data (typically a mongoose QueryStream)
// @param {Stream} options.batchSize - If provided, the input stream will be batched into arrays of this size (or less in the final call).  'makeRequest' will be passed an array instead of individual objects
// @param {Function} options.makeRequest - Passed an 'inputData' object and a 'request' function, makeRequest should prepare the request data and call the 'request' function to perform the request.
// @param {Function} options.processResponse - Optional function to call after each request completes.
// @returns {Promise} - A promise which will resolve when all the requests have completed.  The balancer will have closed its connections and should be discarded.
proto.processStream = function processStream(options) {

    var balancer = this;

    return new Promise(function (resolve, reject) {

        var stream = options.stream;

        if (options.batchSize) {
            stream = streamUtils.batchStream(stream, options.batchSize);
        }

        balancer.pipeStreamTo(stream,
            options.makeRequest,
            function (response) {
                if (typeof response === "string") {
                    // We often get a string back during development, which says: "Invalid Data"
                    reject({
                        name: "DBError",
                        message: "SettlementBalancer received unexpected string: " + response
                    });
                } else {
                    if (options.processResponse) {
                        options.processResponse(response);
                    }
                }
            }
        ).then(resolve).catch(reject).then(
            function (foo) {
                // Cleanup regardless whether the promise resolved or rejected
                balancer.close();
            }
        );

    });

};

module.exports = SettlementBalancer;
