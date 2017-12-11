var roleChecker = require('./roleChecker');
var dblog = require('./dbLogger');
var constSystemLogLevel = require('../const/constSystemLogLevel');
var WebSocketUtil = require("../server_common/WebSocketUtil.js");
var errorUtils = require("./errorUtils.js");
var MongooseError = require('mongoose').Error;
var Q = require('q');

var socketUtility = {

    /**
     * Common function to emit socket event after db operation
     * @param {Socket} socket - The socket object
     * @param {Function} dbCall - Function for db operation
     * @param {Array} args - array for dbCall function arguments
     * @param {String} event - emit event name / socket action name
     * @param {Boolean} isValidData - flag for data validation
     */
    emitter: function (socket, dbCall, args, event, isValidData) {
        //check if admin user has the permission for this socket action
        roleChecker.isValid(socket, event).then(
            function (isAllowed) {
                //if admin user has the permission for this socket action
                if (isAllowed) {
                    socketUtility.emitterWithoutRoleCheck(socket, dbCall, args, event, isValidData);
                }
            }
        ).catch(console.error.bind(console));
    },

    /**
     * Common function to emit socket event after db operation without check user's role permissions
     * @param {Object} socket - The socket object
     * @param {function} dbCall - Function for db operation
     * @param {array} args - array for dbCall function arguments
     * @param {String} event - emit event name / socket action name
     * @param {Boolean} isValidData - flag for data validation
     */
    emitterWithoutRoleCheck: function (socket, dbCall, args, event, isValidData) {
        let isValid = typeof isValidData === "undefined" ? true : isValidData;

        if (socket && dbCall && args && event) {
            if (isValid) {
                // Any synchronous error thrown here, e.g. `throw Error()`, will be thrown up to our caller,
                // without sending a proper response to the client.

                // To avoid that, we wrap this call to dbCall in a .then() so that, if it does immediately throw a
                // synchronous Error, that error will be handled by the .catch(), the same as for asynchronous errors.
                // So the client will always receive a response as expected (with `success: false` in this case).

                // Handle synchronous errors the same as asynchronous errors
                let logData = {
                    adminName: socket.decoded_token.adminName,
                    action: event,
                    data: args,
                    level: constSystemLogLevel.ACTION
                };
                console.log("action request: ", logData);
                Q.resolve().then(
                    function () {
                        return dbCall.apply(null, args)
                    }
                ).then(
                    function (result) {
                        socket.emit(("_" + event), {success: true, data: result});

                        dblog.createSystemLog(logData);
                    }
                ).catch(
                    function (err) {
                        // Validation errors are something non-critical which the caller can deal with, so we
                        // don't need to log them on the server, as long as we pass the error back to the client.
                        // All other errors we should log!
                        // The advantage is that we keep the logs clean.  The disadvantage is that we won't see a stack trace for validation errors.
                        let muteLog = err instanceof MongooseError.ValidationError || err.error instanceof MongooseError.ValidationError;
                        let shouldLog = !muteLog;

                        if (shouldLog) {
                            console.log(new Date() + " Error while handling socket request '" + event + "' with arguments:", args, err);
                            errorUtils.reportError(err);
                        }

                        // This code detects any runtime errors and converts them into "Sinonet error objects", determining the appropriate name (type) from the error itself.
                        // The same process is not used in WebSocketUtility.responsePromise at this time - currently that function always responds with `status: 400` when an error occurs.
                        if (err instanceof Error) {
                            // This is not a Sinonet error object, but an actual Javascript error.
                            // That means it doesn't have its name set, so we should give it a name here, before we emit it.
                            if (err instanceof MongooseError.ValidationError) {
                                // Validation errors are not explained in err.message but they are explained in err.toString().
                                err = {name: 'DataError', message: '' + err, error: err};
                            }
                            else if (err instanceof MongooseError) {
                                err = {name: 'DBError', message: '' + err, error: err};
                            }
                            else {
                                // If it wasn't the input data and it wasn't the database, then it must be some code that exploded!
                                err = {name: 'SystemError', message: '' + err, error: err};
                            }
                        }

                        socket.emit(("_" + event), {success: false, error: err});

                        let logData = {
                            adminName: socket.decoded_token.adminName,
                            action: event,
                            data: args,
                            error: "" + err,
                            level: constSystemLogLevel.ERROR
                        };
                        dblog.createSystemLog(logData);
                    }
                ).catch(
                    // Just in case something goes wrong in the error handler above
                    errorUtils.reportError
                );
            }
            else {
                socket.emit(("_" + event), {
                    success: false,
                    error: {name: "DataError", message: "Incorrect data!"}
                });
                var logData = {
                    adminName: socket.decoded_token.adminName,
                    action: event,
                    data: args,
                    error: "Incorrect data!",
                    level: constSystemLogLevel.ERROR
                };
                dblog.createSystemLog(logData);
            }
        }
    }
    ,

    /**
     * Common function to emit socket event after db operation
     * @param {Object} socket - The socket object
     * @param {String} event - emit event name
     */
    emitDataError: function (socket, event) {
        socket.emit(event, {
            success: false,
            error: {name: "DataError", message: "Incorrect data!"}
        });
    }
    ,

    notifyClientsPermissionUpdate: function (socketIO) {
        socketIO.sockets.emit("PermissionUpdate");
    }
};

module.exports = socketUtility;