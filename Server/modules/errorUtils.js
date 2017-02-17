var dbMigration = require('./../db_modules/dbMigration');

var errorUtils = {

    reportError: function (error) {
        console.error(Date(), error);
        if (!error) {
            return;
        }

        logErrorDetails(error);
        // The originating error may be wrapped inside an object
        if (error.error) {
            logErrorDetails(error.error);
        }
        // or occasionally inside two objects!
        if (error.error && error.error.error) {
            logErrorDetails(error.error.error);
        }
        // Just to be safe let's also check depth 3
        if (error.error && error.error.error && error.error.error.error) {
            logErrorDetails(error.error.error.error);
        }
        // and depth 4
        if (error.error && error.error.error && error.error.error.error && error.error.error.error.error) {
            logErrorDetails(error.error.error.error.error);
        }
        // Yes I have even seen errors at depth 5!
        if (error.error && error.error.error && error.error.error.error && error.error.error.error.error && error.error.error.error.error.error) {
            logErrorDetails(error.error.error.error.error.error);
        }
        // and depth 6
        if (error.error && error.error.error && error.error.error.error && error.error.error.error.error && error.error.error.error.error.error && error.error.error.error.error.error.error) {
            logErrorDetails(error.error.error.error.error.error.error);
        }

        function logErrorDetails(error) {
            // Mongoose validation failure reasons are hidden in here
            // ( Alternatively they can be seen from log(''+error) but curiously not from log(error) or log(error.message) )
            if (error.errors) {
                console.error(error.errors);
            }
            if (error.stack) {
                console.error("stack:", error.stack);
            }
        }
    },

    /**
     * Reports the error, and returns a promise which rejects with the error.
     *
     * Useful in the case when you want to log an error, but you also want to pass it back to the caller:
     *
     *     return somePromise
     *       .then(handleResult)
     *       .catch(errorUtils.reportAndReject);
     *
     * @param error
     * @returns {Promise}
     */
    reportAndReject: function (error) {
        reportError(error);
        return Promise.reject(error);
    },

    /**
     * Some objects cannot be stringified, for example if they contain circular references.
     * This function will stringify the given object if possible, but if not it will just return the object again.
     * @param obj
     * @returns {string|object}
     */
    stringifyIfPossible: function (obj) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
        }
        return obj;
    },

    logMigrationDataInvalidError: function (svc, data) {
        // errorHandler always returns a rejected promise, but we don't want to pass it anywhere
        // We catch it to avoid "unhandle rejection" messages
        dbMigration.errorHandler(svc._service.name, svc.name, data, "Data Invalid").catch(
            err => {}
        );
    }

};

Object.assign(module.exports, errorUtils);
