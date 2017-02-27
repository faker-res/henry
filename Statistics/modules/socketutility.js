var socketUtility = {

    /**
     * Common function to emit socket event after db operation
     * @param {Object} socket - The socket object
     * @param {function} dbCall - Function for db operation
     * @param {array} args - array for dbCall function arguments
     * @param {String} event - emit event name / socket action name
     * @param {Boolean} isValidData - flag for data validation
     */
    emitter: function (socket, dbCall, args, event, isValidData) {

        var isValid = typeof isValidData === "undefined" ? true : isValidData;
        if (socket && dbCall && args && event) {
            if (isValid) {
                dbCall.apply(null, args).then(
                    function (result) {
                        socket.emit(("_" + event), {success: true, data: result});
                    },
                    function (err) {
                        log.conLog.error(event + " error", err);
                        socket.emit(("_" + event), {success: false, error: err});
                    }
                );
            }
            else {
                socket.emit(event, {
                    success: false,
                    error: {name: "DataError", message: "Incorrect data!"}
                });
            }
        }

    },

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

};

module.exports = socketUtility;