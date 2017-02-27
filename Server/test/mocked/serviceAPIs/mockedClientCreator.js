"use strict";

var Q = require("q");

function createMockedClient (spec, clientName) {
    if (!spec) {
        throw Error("Asked to create mockedClient without a spec");
    }
    if (!clientName) {
        throw Error("Asked to create mockedClient without a clientName");
    }

    return {
        isOpen: () => true,

        callAPIOnce: function (serviceName, funcName, data) {
            return Q.resolve().then(
                () => {
                    const service = spec[serviceName];
                    if (!service) {
                        throw Error(`No such mocked service.  Please create it: ${clientName}:${serviceName}`);
                    }
                    const func = service[funcName];
                    if (!func) {
                        throw Error(`No such mocked function.  Please create it: ${clientName}:${serviceName}/${funcName}`);
                    }

                    return func(data);
                }
            );
        },

        startHeartBeat: () => undefined,

        hasMockedFunction: function (serviceName, funcName) {
            return Boolean(spec[serviceName] && spec[serviceName][funcName]);
        }
    };
}

module.exports = {
    createMockedClient: createMockedClient
};