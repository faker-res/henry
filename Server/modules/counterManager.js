var dbConnections = require('./../modules/dbConnections');
var counterModel = dbConnections.counterModel;

var counterManager = {

    /**
     * Increments the DB counter and returns the latest value for the caller to use.
     *
     * @param {String} counterName
     * @returns {Promise}
     */
    incrementAndGetCounter: function incrementAndGetCounter (counterName) {
        return counterModel.findByIdAndUpdate(
            { _id: counterName },
            { $inc: {seq: 1} },
            { upsert: true, new: true }
        ).then(
            counterDoc => counterDoc.seq
        );
    },

    /**
     * Generates a mongoose middleware function which, if the document is new, will increment a DB counter and then set the document's property.
     *
     * @param {String} counterName
     * @param {String} [propertyName] - Optional, defaults to the counterName
     * @returns {Function} - Mongoose middleware function for use as a pre-save hook.
     */
    incrementCounterAndSetPropertyIfNew: function incrementCounterAndSetPropertyIfNew (counterName, propertyName) {
        // Usually the document property will have the same name as the counter.
        propertyName = propertyName || counterName;

        return function (next) {
            var document = this;

            if (!document.isNew) {
                next();
                return;
            }

            if (document[propertyName]) {
                next(new Error("New document should not have its " + propertyName + " field set!"));
                return;
            }

            counterManager.incrementAndGetCounter(counterName).then(
                function (counterVal) {
                    document[propertyName] = counterVal;
                    next();
                }
            ).catch(
                function (err) {
                    next(err);
                }
            );
        };
    }

};

module.exports = counterManager;