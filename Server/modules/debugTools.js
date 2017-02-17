var dbDebugToolFunc = function () {
};
module.exports = new dbDebugToolFunc();

var realConsole = console;

var DebugTools = {

    //todo::use false for all debug options by default, only enable it when debugging for local or development env
    defaultOptions: {
        enhanceConsoleLog: false,

        listenForUnhandledRejections: true,
        reportLongStackTraces: true,
        promisesAlwaysRejectWithError: false,

        // @todo These next two should be enabled by default, because they are good at catching developer mistakes early
        //       Existing projects which do not want to use them, should disable them when calling DebugTools.init()
        mongooseForceStrictSchemas: false,
        mongooseMakeFieldsRequiredByDefault: false,   // @todo
        mongooseLogEachQuery: false,
        mongooseCountQueries: false,
        mongooseCountQueriesInterval: 1000,
        mongooseCountQueriesMinQueriesForLog: 10,

        logAllFunctionCalls: false,
        logSetTimeouts: false,
        warnAboutUnclosedWebSocketClients: false,

        checkForMemoryLeaks: false,
        logMemoryUsage: false,
        // Diffing two subsequent heaps will show which type of object is causing the memory leak.
        // But heap snapshots and especially diffing will lock up the process.  So not recommended for production!
        performHeapDiffWhenLeakIsDetected: false,
        assumeLeakWhenMemReaches: 2048,
    },

    developmentOptions: {
        enhanceConsoleLog: true,
        mongooseCountQueriesInterval: 2000,
        mongooseCountQueriesMinQueriesForLog: 100,
        warnAboutUnclosedWebSocketClients: true,
        performHeapDiffWhenLeakIsDetected: true,
    },

    init: function (_options) {
        var options = Object.assign({}, DebugTools.defaultOptions, _options || {});



        var promiseDebugging = require('./promiseDebugging');

        // This config object could be deprecated.  We can auto-detect which promise libs are present.
        var pdConfig = {
            Q: true,
            BlueBird: false,
            global: true,
            mongoose: false
        };

        if (options.listenForUnhandledRejections) {
            promiseDebugging.listenForUnhandledRejections(pdConfig);
        }

        // Displays the location of each line printed on console.log
        if (options.enhanceConsoleLog) {
            require('./contrib/enhance_console_log');
        }

        // Log every module function that is called (almost a full function trace)
        // BUG: If you use this *and* enhance_console_log, but enhance_console_log is required *after* this, then we exceed maximum stack size (infloop).
        if (options.logAllFunctionCalls) {
            DebugTools.wrapAllModulesWithLogging();
        }

        // Logs the queries that Mongoose sends to Mongo  (A bit noisy!  Does not log response data.)
        if (options.mongooseLogEachQuery) {
            require('mongoose').set('debug', true);
        }

        // Watches the requests and responses of mongoose queries so it can display the number of active (pending) queries.
        // We could also use this to log response data if we wanted to.
        if (options.mongooseCountQueries) {
            // We could record and clear the member names (maybe also stack query object) of all called queries, so we can display the details of queries which did not return.

            var queriesMade = 0;
            var queriesFinished = 0;

            var logQueryState = function () {
                var activeQueries = queriesMade - queriesFinished;
                if (activeQueries >= options.mongooseCountQueriesMinQueriesForLog) {
                    console.info("Mongoose queries completed: %s / %s Active: %s", queriesFinished, queriesMade, activeQueries);
                }
            };

            var NativeCollection = require('mongoose/lib/drivers/node-mongodb-native/collection.js');
            var driver = NativeCollection.prototype;
            for (var prop in driver) {
                // Not all members of the driver are query functions.  Some we should ignore.
                var skip = prop === 'addQueue'  || prop === 'doQueue' || prop[0] === '$';
                if (skip) {
                    continue;
                }
                var member = driver[prop];
                if (typeof member === 'function') {
                    //console.log(`Wrapping driver.${prop}`);
                    var wrappedFunc = (function(originalFunc){
                        return function () {
                            var returnVal;
                            var lastArgument = arguments[arguments.length - 1];
                            var looksLikeCallback = typeof lastArgument === 'function';
                            if (looksLikeCallback) {
                                var originalCallback = lastArgument;
                                var newArgs = Array.prototype.splice.call(arguments, 0);
                                var wrappedCallback = function () {
                                    queriesFinished++;
                                    return originalCallback.apply(this, arguments);
                                };
                                newArgs[newArgs.length - 1] = wrappedCallback;
                                returnVal = originalFunc.apply(this, newArgs);
                            } else {
                                // With the driver we are currently wrapping, I think only callbacks are used, never promises, so this code could be removed.
                                var returnedVal = originalFunc.apply(this, arguments);
                                var looksLikePromise = returnedVal && typeof returnedVal.then === 'function';
                                if (looksLikePromise) {
                                    returnVal = returnedVal.then(
                                        result => {
                                            queriesFinished++;
                                            //logQueryState();
                                            return result;
                                        },
                                        error => {
                                            queriesFinished++;
                                            //logQueryState();
                                            throw error;
                                        }
                                    );
                                } else {
                                    returnVal = returnedVal;
                                }
                            }
                            if (looksLikeCallback || looksLikePromise) {
                                queriesMade++;
                                //logQueryState();
                            }
                            return returnVal;
                        };
                    }(member));
                    driver[prop] = wrappedFunc;
                }
            }

            var queriesMadePrevious = 0;
            var queriesFinishedPrevious = 0;
            setInterval(function () {
                if (queriesMade !== queriesMadePrevious || queriesFinished !== queriesFinishedPrevious) {
                    logQueryState();
                }
                queriesMadePrevious = queriesMade;
                queriesFinishedPrevious = queriesFinished;
            }, options.mongooseCountQueriesInterval);
        }

        // Shows long stack-traces (where a promise was initialised from) but has a performance overhead.
        //require('./promiseDebugging').setDefaults();
        if (options.reportLongStackTraces) {
            promiseDebugging.reportLongStackTraces(pdConfig);
        }

        // Provides long stack traces for all callbacks, not just promises
        // Does a better job on mongoose queries than promiseDebugging does, but it is a bit verbose!
        if (moduleIsAvailable('longjohn')) {
            var longjohn = require('longjohn');

            longjohn.async_trace_limit = 15;
            longjohn.empty_frame = 'Called from:';
        }

        // Provides shorter stack traces by removing uninteresting Node-core frames
        if (moduleIsAvailable('clarify')) {
            require('clarify');
        }

        if (options.promisesAlwaysRejectWithError) {
            promiseDebugging.alwaysRejectWithError();
        }

        if (options.mongooseForceStrictSchemas) {
            // This tool will warn us if we try to create documents with fields not in the schema.
            // Mongoose's default behaviour is to ignore (drop) fields which are not in the schema.
            // Warning can help development by informing us when we perform queries with mistakes or typos.
            // But at present it breaks our tests, because they pass some unspecified fields.
            var mongoose = require('mongoose');
            var originalSchema = mongoose.Schema;
            var wrappedSchema = function (definition, options) {
                options = options || {};
                options.strict = 'throw';
                return originalSchema.call(mongoose, definition, options);
            };
            Object.assign(wrappedSchema, originalSchema);
            Object.setPrototypeOf(wrappedSchema, Object.getPrototypeOf(originalSchema));
            mongoose.Schema = wrappedSchema;
        }

        // @consider: Monkey-patch mongo to warn if we query a model for fields which don't exist.  (E.g. we query on 'platform' but the schema specified 'platformId'.)

        // Look out for memory leaks.  If a leak is detected, try to find out what classes are growing in number.
        if (options.checkForMemoryLeaks && moduleIsAvailable('memwatch-next')) {
            console.log(`Watching for memory leaks with memwatch-next`);

            var startTime = Date.now();
            var secondsFromStart = () => '[' + roundNum((Date.now() - startTime) / 1000) + ']';
            var roundNum = num => num.toFixed(3);

            var memwatch = require('memwatch-next');

            var leakDetected = false;
            var heapDiff;

            memwatch.on('leak', function (info) {
                console.warn("Possible memory leak detected:", info);
                leakDetected = true;
                // We leave it to the 'stats' event to snapshot and diff heaps
                // We don't do it here because it can be a very long time between two 'leak' events, resulting in large and different heaps.
            });

            // When the memory is large (1GB) the diff takes too long, locking up the server.
            // The heap snapshot takes about 8 seconds, the diff takes about 50 seconds.
            // A better approach might be to save the two heap snapshots to a file, and diff them later.

            memwatch.on('stats', function (d) {
                // Garbage collection has just been performed.  This is a good time to check memory usage, or take heap snapshots.
                if (options.logMemoryUsage) {
                    console.log(secondsFromStart(), "Memory usage post-gc:", roundNum(d.current_base / 1024 / 1024), 'MB');
                }

                if (options.performHeapDiffWhenLeakIsDetected) {
                    // This 'stats' event is fired after every GC, but the 'leak' event is fired before it.
                    // After a leak is detected, we will start a heapDiff, and after the next GC we immediately diff it.
                    if (leakDetected) {
                        if (!heapDiff) {
                            console.warn(secondsFromStart(), "Starting a HeapDiff...");
                            heapDiff = new memwatch.HeapDiff();
                            console.warn(secondsFromStart(), "Heap snapshot captured.");
                        } else {
                            console.warn(secondsFromStart(), "Diffing heap against last...");
                            var diff = heapDiff.end();
                            console.warn(secondsFromStart(), "HeapDiff reports:", diff);
                            // Node cuts off the details of the diff logged above, showing them as "[object Object]", so we show the details like this...
                            var details = diff.change.details.filter(dt => dt.size_bytes > 0);
                            details.sort((a,b) => b.size_bytes - a.size_bytes);
                            details = details.slice(0, 5);
                            console.warn("HeapDiff change details:\n", details);
                            heapDiff = null;
                            // Wait for the next detection before doing another heapDiff
                            // @todo Uncomment this!
                            //leakDetected = false;
                        }
                    }
                }

                // Sometimes memwatch does not detect a leak because Node is performing GC in pairs, and the second in some pairs reduce the memory usage, invalidating memwatch's condition of 5 post-GC increases.
                // So we will also trigger a leak detection event if memory usage goes over some threshold.
                if (options.assumeLeakWhenMemReaches && d.current_base > options.assumeLeakWhenMemReaches * 1024 * 1024) {
                    var reason = `Triggering leak manually because mem usage ${roundNum(d.current_base / 1024)} GB > ${roundNum(options.assumeLeakWhenMemReaches / 1024)} GB`;
                    memwatch.emit('leak', {growth: d.current_base, reason: reason});
                }
            });

            // The heap can be significantly larger in the middle of runtime.
            // It's not an accurate measure of memory usage, because there could be a lot of unreferenced objects which could be collected on the next sweep.
            // That is why we prefer to use the memwatch 'stats' event, which gets called just after GC.
            //setInterval(function () {
            //   console.log(secondsFromStart(), "Memory usage runtime:", roundNum(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
            //}, 5000);

            const generateTestLeak = false;

            if (generateTestLeak) {
                // Test it
                console.warn("GENERATING A TEST MEMORY LEAK!");
                var bucket = [];

                // setInterval(() => {
                //    for (var i = 0; i < 1000; i++) {
                //        bucket.push(new Date());
                //        bucket.push(new WeakMap());
                //        bucket.push({});
                //        bucket.push("A long string long long long long long long long long long long long long " + i);
                //    }
                // }, 100);

                setInterval(function () {
                   for (var i = 0; i < 1000; i++) {
                       var str = i.toString() + " on a stick, short and stout!";
                       bucket.push(str);
                   }
                }, 100);
            }

        }

        if (options.logSetTimeouts) {
            var originalSetTimeout = setTimeout;
            var wrappedSetTimeout = function () {
                console.log('setTimeout called', new Error().stack.split('\n')[2].trim());
                return originalSetTimeout.apply(this, arguments);
            };
            global.setTimeout = wrappedSetTimeout;
        }

        // The unclosed WebSocket check was primarily for the botRunner.
        // In fact some of our servers want their sockets to remain open, even if they are idle.
        const longLastingSocketsIsNormal = process.argv[1] && (
               process.argv[1].match('/app.js$')
            || process.argv[1].match('/clientAPIServer.js$')
            || process.argv[1].match('/paymentAPIServer.js$')
            || process.argv[1].match('/providerAPIServer.js$')
        );

        if (options.warnAboutUnclosedWebSocketClients && !longLastingSocketsIsNormal) {
            var WebSocketClient = require('../server_common/WebSocketClient');

            var checkIdle = function () {
                if (Date.now() > this.__lastActivity + 1000 * 60 * 10) {
                    if (this.isOpen()) {
                        //todo::maybe enable this log only for bot testing later, because now for external api server connection, we want to keep the connection open all the time
                        //console.warn(`This WebSocketClient (${this.url}) has not been used for ${( (Date.now() - this.__lastActivity) / 1000 / 60 ).toFixed(1)} minutes but is still open.  Remember to call .disconnect() on WebSocketClients when you are finished with them.`);
                        // If we don't clear the timer, the warning will continue to be emitted every 2 minutes, as long as the socket stays open.
                        //clearInterval(this.__checkIdleTimer);
                    } else {
                        // WebSocket is idle and closed.  It is possible that it closed unexpectedly, since disconnect() was not called.  We don't know from here whether the unexpected disconnect was handled properly or not.
                        // CONSIDER: We could just stay silent when this happens.
                        console.log("A WebSocketClient closed earlier without a direct call to disconnect().  Perhaps the remote end disconnected, or the connection timed out.  Hopefully it was handled well.");
                        // Assuming this socket has now been abandoned by the app, we should clear our timer to allow GC.
                        clearInterval(this.__checkIdleTimer);
                    }
                }
            };

            var originalConnect = WebSocketClient.prototype.connect;
            var wrappedConnect = function () {
                this.__lastActivity = Date.now();
                // If this is a reconnect, there may be an existing timer.  Clear it if so.
                clearTimeout(this.__checkIdleTimer);
                this.__checkIdleTimer = setInterval(checkIdle.bind(this), 1000 * 60 * 2);
                return originalConnect.apply(this, arguments);
            };
            WebSocketClient.prototype.connect = wrappedConnect;

            var originalDispatch = WebSocketClient.prototype._dispatch;
            var wrappedDispatch = function () {
                this.__lastActivity = Date.now();
                return originalDispatch.apply(this, arguments);
            };
            WebSocketClient.prototype._dispatch = wrappedDispatch;

            var originalDisconnect = WebSocketClient.prototype.disconnect;
            var wrappedDisconnect = function () {
                clearInterval(this.__checkIdleTimer);
                return originalDisconnect.apply(this, arguments);
            };
            WebSocketClient.prototype.disconnect = wrappedDisconnect;
        }

    },

    /**
     * Replaces all functions in the given object with wrapped copies which perform some logging, but otherwise run as usual.
     *
     * It is very easy to use, just drop this line into the bottom of your file (and check the require path):
     *
     *     require('../modules/debugTools').wrapFunctionsWithLogging(module.exports);
     *
     * @param obj {Object | Array}
     * @returns {Object | Array} the original object
     *
     * Beware: Cannot log arguments if they cannot be JSONed.
     */
    wrapFunctionsWithLogging: function (obj, moduleName) {
        // @todo When there are circular references in the modules, we might get passed an empty obj here.
        //       In such cases we may wish to delay the wrapping.
        //       Unless we can change how we are called, so we are guaranteed to see the finished module.
        var props = Object.keys(obj);
        if (props.length === 0) {
            //console.log("No properties in module " + moduleName);
        }

        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }
            var fn = obj[key];
            if (typeof fn === 'function') {
                (function (originalFn) {
                    // @todo Check if it has already been wrapped
                    var fnName = originalFn.name || key;
                    //console.log("Wrapping %s.%s()", moduleName, fnName);

                    var wrappedFn = function () {
                        var argsArray = [].slice.call(arguments);
                        var argsAsStrings;
                        try {
                            argsAsStrings = argsArray.map(function (arg) {
                                if (arg === undefined) {
                                    return 'undefined';
                                }
                                try {
                                    return JSON.stringify(arg);
                                } catch (e) {
                                    return "[unable_to_stringify]";
                                }
                            });
                        } catch (e) {
                            argsAsStrings = '[failed]';
                        }
                        //var depth = new Error().stack.split('\n').length;
                        var depth = (new Error().stack.match(/\n/g) || []).length;
                        var indentStr = new Array(depth + 1).join('>');
                        var argsString = argsAsStrings.join(', ');
                        if (argsString.length > 500 - 3) {
                            argsString = argsString.substring(0, 500 - 3) + '...';
                        }
                        realConsole.log(indentStr + ' ' + moduleName + ':' + fnName + '(' + argsString + ')');
                        // We could also log the context object (this).
                        return originalFn.apply(this, arguments);
                    };

                    //if (Object.keys(originalFn).length > 0) {
                    //    console.log("Object.keys(%s):", originalFn.name, Object.keys(originalFn));
                    //}

                    // Try to make the wrapped function act as closely as possible to the original function
                    Object.assign(wrappedFn, originalFn);
                    wrappedFn.name = originalFn.name;
                    wrappedFn.length = originalFn.length;
                    // Constructor is supposed to live in the prototype
                    //wrappedFn.constructor = originalFn.constructor;
                    wrappedFn.prototype = originalFn.prototype;
                    wrappedFn.__proto__ = originalFn.__proto__;
                    //wrappedFn.super = originalFn.super;
                    //wrappedFn._super = originalFn._super;

                    // Flag it
                    // wrappedFn._wrappedByDebugTools = true;

                    // Replace the original!
                    obj[key] = wrappedFn;
                }(fn));
            }
        }

        // A constructor/class may have a prototype
        var prototype = obj && obj.prototype;
        if (prototype) {
            // @todo Check if it has already been wrapped
            //console.log("Descending into prototype:", prototype.constructor && prototype.constructor.name);
            DebugTools.wrapFunctionsWithLogging(prototype, moduleName + '.prototype');
        }

        // An object/module may have a proto
        var proto = Object.getPrototypeOf(obj);
        if (proto) {
            // @todo Check if it has already been wrapped
            //console.log("Descending into proto:", proto.constructor && proto.constructor.name);
            DebugTools.wrapFunctionsWithLogging(proto, moduleName + '.__proto__');
        }

        return obj;
    },

    // Some assistance: http://stackoverflow.com/questions/27948300/override-the-require-function
    // @todo We could try this method to prevent wrapping the same module twice: https://github.com/boblauer/mock-require/blob/21dedf1eb3ccbc3ce2d6c01e38dd888d8df61d89/index.js#L9-L15
    //       That would be preferable to adding our own _wrappedByDebugTools property to each module.
    // @todo We could also try overriding Module._load instead of Module.prototype.require, like they did in mock-require.
    // Proxyquire overrides the require of a given module: https://github.com/thlorenz/proxyquire/blob/master/lib/proxyquire.js
    wrapAllModulesWithLogging: function () {
        // var originalRequire = Module.prototype.require;
        // Module.prototype.require = function (path) {
        //     var module = originalRequire.apply(this, arguments);
        //     if (typeof module === 'object' && !module._wrappedByDebugTools) {
        //         var wrapThis = path.match(/\//) && !path.match(/^\//);
        //         if (wrapThis) {
        //             realConsole.log("* Wrapping module: " + path);
        //             DebugTools.wrapFunctionsWithLogging(module, path);
        //             Object.defineProperty(module, '_wrappedByDebugTools', {
        //                 value: true,
        //                 enumerable: false
        //             });
        //         } else {
        //             realConsole.log("  Skipping module: " + path);
        //         }
        //     }
        //     return module;
        // };

        var originalLoader = Module._load;
        var alreadyLoaded = {};
        Module._load = function (request, parent) {
            var fullFilePath = getFullPath(request, parent.filename);

            var module = originalLoader.apply(this, arguments);

            if (typeof module === 'object' && !alreadyLoaded[fullFilePath]) {
                alreadyLoaded[fullFilePath] = true;

                var wrapThis = fullFilePath.match("/");
                if (fullFilePath.match("/node_modules/")) {
                    wrapThis = false;
                }
                if (fullFilePath.match("/schema/")) {
                    wrapThis = false;
                }
                if (fullFilePath.match("server_common/WebSocketService")) {
                    wrapThis = false;
                }
                if (fullFilePath.match(/\/dbproperties\.js$/)) {
                    wrapThis = false;
                }
                if (fullFilePath.match(/\/debugTools\.js$/)) {
                    wrapThis = false;
                }
                if (fullFilePath.match(/\/sunlogger\.js$/)) {
                    wrapThis = false;
                }
                if (fullFilePath.match(/\/promiseDebugging\.js$/)) {
                    wrapThis = false;
                }
                // Was spamming getFunctionName()
                if (fullFilePath.match(/utils\.js$/)) {
                    wrapThis = false;
                }
                // Sometimes we get an error from util.inherits() in winston/lib/winston/transports/http.js
                //if (fullFilePath.match(/http.js$/)) {
                //    wrapThis = false;
                //}
                if (wrapThis) {
                    //realConsole.log("* Wrapping module: " + fullFilePath);
                    //var moduleDisplayName = request.replace(/.*\//, '');
                    // Keep one '/' so we can see the name of the parent folder
                    var moduleDisplayName = '<' + request.replace(/.*\/(.*\/.*)/, '$1') + '>';
                    DebugTools.wrapFunctionsWithLogging(module, moduleDisplayName);
                } else {
                    //realConsole.log("  Skipping module: " + fullFilePath);
                }
            }

            return module;
        };
    },

    listFunctionsInObject: function listFunctionsInObject (obj, minimal) {
        for (var prop in obj) {
            var val = obj[prop];
            if (typeof val === 'function') {
                if (minimal) {
                    console.log(':: %s(%s)', prop, val.length);
                }
                else {
                    console.log(':: %s: %s %s', prop, val.toString().split('\n')[0].replace(/\s*{.*/, ''), val.length);
                }
            }
        }
    },
};

var Module = require('module');

var dirname = require('path').dirname;
var join    = require('path').join;

// From: https://github.com/boblauer/mock-require/blob/21dedf1eb3ccbc3ce2d6c01e38dd888d8df61d89/index.js
function getFullPath(path, calledFrom) {
    var resolvedPath;
    try {
        resolvedPath = require.resolve(path);
    } catch(e) { }

    var isExternal = /[/\\]node_modules[/\\]/.test(resolvedPath);
    var isSystemModule = resolvedPath === path;
    if (isExternal || isSystemModule) {
        return resolvedPath;
    }

    var isLocalModule = /^\.{1,2}[/\\]/.test(path);
    if (!isLocalModule) {
        return path;
    }

    var localModuleName = join(dirname(calledFrom), path);
    try {
        return Module._resolveFilename(localModuleName);
    } catch (e) {
        if (isModuleNotFoundError(e)) { return localModuleName; }
        else { throw e; }
    }
}

function isModuleNotFoundError(e){
    return e.code && e.code === 'MODULE_NOT_FOUND'
}

function moduleIsAvailable (path) {
    try {
        require.resolve(path);
        return true;
    } catch (e) {
        return false;
    }
}

var proto = dbDebugToolFunc.prototype;
proto = Object.assign(proto, DebugTools);

// This make WebStorm navigation work
module.exports = DebugTools;
