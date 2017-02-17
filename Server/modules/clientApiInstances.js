"use strict";

var env = require("../config/env").config();

const Q = require("q");
const services = require("./services.js");
const serverInstance = require("./serverInstance.js");

const mockedClientCreator = require('../test/mocked/serviceAPIs/mockedClientCreator');

const mockedContentProviderAPIClientSpec = require('../test/mocked/serviceAPIs/mockedContentProviderAPIClientSpec');
const mockedPaymentApiClientSpec = require('../test/mocked/serviceAPIs/mockedPaymentAPIClientSpec');
const mockedSMSApiClientSpec = require('../test/mocked/serviceAPIs/mockedSMSAPIClientSpec');


/**
 * This module creates the requested API client and stores it in the serverInstance.
 * If no preference is given, it decides whether to create a real or mocked client.  (See `createMockedClients` below.)
 *
 * It actually calls services.get___ when it needs to create a real client.
 *
 * Modes:
 *
 *   - real: Create the normal client that really connects to the remote API server
 *
 *   - logged: Use the real client, but also log all requests and responses on the console
 *
 *   - mock: Use a mock client with mocked responses
 *
 *   - compare: Use the real client, but compare it against the mock.
 *              Only log when the real client performs an API call which does not yet exist in the mock
 *              This is useful for completing mocks.
 *
 * If no mode is specified, it will use the `defaultMode` specified below.
 */

// Options

const createMockedClients = ( env.mode == "qa" );

const defaultMode = createMockedClients ? 'mock' : 'real';

// Watches calls to the live API, and logs if the mocked function for that call is missing.
// Overrides env.disable* and other options.  Use temporarily during development.
const compareRealAndMocked = false;


// Specification

const apis = {
    ContentProviderAPI: {
        real: services.getContentProviderAPIClient,
        mock: mockedContentProviderAPIClientSpec,
        store: serverInstance.setCPAPIClient,
        disabled: env.disableCPAPI
    },

    PaymentAPI: {
        real: services.getPaymentManagementClient,
        mock: mockedPaymentApiClientSpec,
        store: serverInstance.setPaymentAPIClient,
        disabled: env.disablePaymentAPI
    },

    SMSAPI: {
        real: services.getSMSAPIClient,
        mock: mockedSMSApiClientSpec,
        store: serverInstance.setSMSAPIClient,
        disabled: env.disableSMSAPI
    }
};


/**
 * @param client
 * @param [mockedClient] - Optional: If provided, logs will only be produced for function calls which have not yet been mocked.
 * @returns {*} - the client with logging functionality added
 */
function logThisClient (apiName, client, mockedClient) {
    // @todo For wider compatibility, we may want to intercept .request and .dispatch instead of .callAPIOnce

    var originalCallAPIOnce = client.callAPIOnce;
    var wrappedCallAPIOnce = function (serviceName, funcName, data) {
        let logThisCall = true;
        if (mockedClient) {
            logThisCall = false;
            if (!mockedClient.hasMockedFunction(serviceName, funcName)) {
                console.warn("[logged_client] Mocked client does not have this function!  You may want to add it.");
                logThisCall = true;
            }
        }
        logThisCall && console.log(`[logged_client] Calling: ${serviceName}:${funcName} with data:`, data);
        return originalCallAPIOnce.call(this, serviceName, funcName, data).then(
            response => {
                //logThisCall && console.log(`[logged_client] Response:`, response);
                // This form is easy to copy-paste into the mock spec script
                logThisCall && console.log(`[logged_client] Mock for api ${apiName}:\n${serviceName}: {\n ${funcName}: data => (`, response, `),\n},`);
                return response;
            },
            error => {
                logThisCall && console.log(`[logged_client] Error response:`, error);
                throw error;
            }
        );
    };
    client.callAPIOnce = wrappedCallAPIOnce;

    return client;
}

/**
 * Allows us to throw an error from an expression.
 * @param message
 */
function throwError (message) {
    throw new Error(message);
}

/**
 *
 * @param apiName
 * @param mode {String} Can be 'real', 'logged', 'compare' or 'mock'
 */
function createAPIClientInMode (apiName, mode) {
    var apiSpec = apis[apiName] || throwError("No such api: " + apiName);
    return createAPIConnectionInMode(apiName, mode).then(
        client => apiSpec.store(client, true)
    );
}

/**
 *
 * @param apiName
 * @param mode {String} Can be 'real', 'logged', 'compare' or 'mock'
 */
function createAPIConnectionInMode (apiName, mode) {
    mode = mode || defaultMode;
    if (mode === 'mocked') {
        mode = 'mock';
    }

    var apiSpec = apis[apiName] || throwError("No such api: " + apiName);

    if (apiSpec.disabled) {
        mode = 'mock';
    }

    if (compareRealAndMocked) {
        mode = 'compare';
    }

    // Choose whether to create a real client or a mocked client, or both (for 'compare' mode).
    const realClientProm = (mode === 'real' || mode === 'logged' || mode === 'compare') && apiSpec.real();
    const mockedClient   = (mode === 'mock' || mode === 'compare') && mockedClientCreator.createMockedClient(apiSpec.mock, apiName);

    const finalClientProm =
        mode === 'real' ? realClientProm
            : mode === 'mock' ? Q.resolve(mockedClient)
                : mode === 'logged' || mode === 'compare' ? realClientProm.then(client => logThisClient(apiName, client, mockedClient))
                    : throwError("No such mode: " + mode);

    console.log("Using " + mode + " connection for " + apiName);

    return finalClientProm;
}

const clientApiInstances = {
    // An example of the common functionality:
    //createPaymentAPI: () => services.getPaymentManagementClient().then( client => serverInstance.setPaymentAPIClient(client) ),

    createPaymentAPI: mode => createAPIClientInMode('PaymentAPI', mode),
    createPaymentAPIReal: () => createAPIClientInMode('PaymentAPI', 'real'),
    createPaymentAPIMocked: () => createAPIClientInMode('PaymentAPI', 'mock'),
    createPaymentAPILogged: () => createAPIClientInMode('PaymentAPI', 'logged'),
    createPaymentAPICompare: () => createAPIClientInMode('PaymentAPI', 'compare'),

    // We do not create real connection at the moment: their service is in maintenance!
    createContentProviderAPI: mode => createAPIClientInMode('ContentProviderAPI', mode),
    createContentProviderAPIReal: () => createAPIClientInMode('ContentProviderAPI', 'real'),
    createContentProviderAPIMocked: () => createAPIClientInMode('ContentProviderAPI', 'mock'),
    createContentProviderAPILogged: () => createAPIClientInMode('ContentProviderAPI', 'logged'),
    createContentProviderAPICompare: () => createAPIClientInMode('ContentProviderAPI', 'compare'),

    createSMSAPI: mode => createAPIClientInMode('SMSAPI', mode),

    createAPIConnectionInMode: createAPIConnectionInMode
};

module.exports = clientApiInstances;