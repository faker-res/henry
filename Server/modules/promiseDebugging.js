// @todo: Disable some of the features when process.NODE_ENV !== 'development'
//        How about when it is undefined?  (Common for dev machines.)  What will it be when live?
//        Or perhaps this should just be decided by the caller.

"use strict";

function setDefaults (config) {
    config = config || {
        Q: true,
        BlueBird: false,
        global: true,
        mongoose: true
    };
    reportLongStackTraces(config);
    listenForUnhandledRejections(config);
}

function reportLongStackTraces (config) {

    if (config.BlueBird) {
        const Promise = require("bluebird");

        Promise.config({
            longStackTraces: true
        });
    }

    if (config.Q) {
        const Q = require("q");

        Q.longStackSupport = true;
    }

    // Monkey patch to get long stack traces from ES6 Promises.
    if (config.global) {
        // We will stop adding earlier promises when the number of lines in the stack trace reaches this length.
        var longStackHistoryLimit = 100;

        const theGlobal = typeof window === 'object' ? window : global;

        const realPromiseConstructor = theGlobal.Promise;

        const wrappedPromiseConstructor = function (resolve, reject, progress) {
            const originalPromiseInstance = new realPromiseConstructor(resolve, reject, progress);

            // Who called us?  Let's store it.
            const stackWhenCalled = new Error().stack;

            const wrappedPromiseInstance = originalPromiseInstance.catch(err => {
                try {
                    err.stack = err.stack || "";
                    const linesInStack = (err.stack.match(/\n/) || []).length;
                    if (linesInStack < longStackHistoryLimit) {
                        err.stack += '\nDuring promise started:\n' + stackWhenCalled.split('\n').slice(2).join('\n');
                    }
                } catch (e) {
                    console.error("promiseDebugging.reportLongStackTraces had difficulty adding to the stack:", e);
                }
                return realPromiseConstructor.reject(err);
            });
            return wrappedPromiseInstance;
        };

        Object.setPrototypeOf(wrappedPromiseConstructor, realPromiseConstructor);

        theGlobal.Promise = wrappedPromiseConstructor;
    }

    // Get long stack traces from mongoose 4 promises.
    if (config.mongoose) {
        const mongoose = require('mongoose');

        // I tried wrapping the mpromise Promise constructor, similarly to the ES6 wrapper above.
        // But then mongoose promises didn't resolve or reject!
        // mongoose.Promise = wrappedMPromiseConstructor;

        // But either of the following work fine, provided one of them was enabled in the config
        if (false && config.Q) {
            mongoose.Promise = require('q').Promise;
        } else if (config.global) {
            mongoose.Promise = Promise;
        }
    }
}

function listenForUnhandledRejections (config) {

    // BlueBird (NOT YET TESTED):
    if (config.BlueBird) {
        const Promise = require("bluebird");

        // Apparently automatically enabled in development environments anyway: http://bluebirdjs.com/docs/api/promise.config.html
        Promise.config({
            warnings: true
        });
    }

    // Q:
    if (config.Q) {
        const Q = require("q");

        setInterval(() => {
            const unhandledReasons = Q.getUnhandledReasons();
            if (unhandledReasons.length > 0) {
                console.error("~~ Q found an unhandled rejection!  Please return your promise, or add a catch(). ~~");
                unhandledReasons.forEach(function (reason) {
                    console.error(JSON.stringify(reason));
                });

                // Don't print these same rejections again
                Q.resetUnhandledRejections();
            }
        }, 1000);
    }

    // NodeJS
    if (config.global) {
        if (typeof process === 'object' && typeof process.on === 'function') {
            process.on('unhandledRejection', (error, promise) => {
                console.error("== Node found an unhandled rejection!  Please return your promise, or add a catch(). ==");
                console.error(error && error.stack || error);
            });
        }
    }

}

// @todo Optionally, we could warn the developer when promises are rejected without an error, if the house policy is to always reject with an error.
function alwaysRejectWithError () {
    // If you have code which rejects but does not reject with an error, it can be difficult to see where
    // the rejection originated, and it will also stop longStackTraces from being built.
    //
    // To resolve that, we can intercept whenever a rejection is made with a non-error as the reason, and
    // replace that reason with an error.

    var allPromiseLibraries = [typeof Promise === 'undefined' ? null : Promise, maybeRequire('q'), maybeRequire('Q'), maybeRequire('bluebird')];
    allPromiseLibraries.forEach(function (P) {
        if (P && P.reject) {
            var originalReject = P.reject;
            P.reject = function (reason) {
                var improvedReason = turnReasonIntoError(reason);
                return originalReject.call(this, improvedReason);
            };
        }

        // In the Q library at least, Q.defer().reject() does not call the above, so we must also wrap
        // defer() to ensure their rejections are also processed.
        if (P && P.defer) {
            var originalDefer = P.defer;
            P.defer = function () {
                var deferred = originalDefer.apply(this, arguments);
                var originalReject = deferred.reject;
                deferred.reject = function (reason) {
                    var improvedReason = turnReasonIntoError(reason);
                    return originalReject.call(this, improvedReason);
                };
                return deferred;
            };
        }
    });

    function turnReasonIntoError (reason) {
        var err = (reason instanceof Error) ? reason : new Error(stringifyObject(reason));

        // Copy any properties from the original reason object into the error object, so it can act more-or-less the same
        if (typeof reason === 'object') {
            Object.assign(err, reason);
        }

        // Make it appear as if the error originated from the line that called P.reject() by removing the
        // lines that shows the error was created inside this file.
        //
        // We call it not only on new errors, but also if the reason is already an error.  Doing this can
        // remove wrappedDefer from the stack, if long stack-traces has added it to the stack after the
        // error was created.

        try { err.stack = err.stack.replace(/^ *at .*promiseDebugging.*\n/mg, ''); } catch (e) { }

        return err;
    }
}

function maybeRequire (path) {
    try {
        var module = require(path);
        return module;
    } catch (e) {
        return null;
    }
}

function stringifyObject (obj) {
    try {
        //return JSON.stringify(obj);
        //return JSON.stringify(obj, null, 2);
        return JSON.stringify(obj, null, 1).replace(/\n\s*/mg, ' ');
        //return require('util').format(obj);
    } catch (e) {
        return '' + obj;
    }
}

module.exports = {
    setDefaults: setDefaults,
    reportLongStackTraces: reportLongStackTraces,
    listenForUnhandledRejections: listenForUnhandledRejections,
    alwaysRejectWithError: alwaysRejectWithError,
};
