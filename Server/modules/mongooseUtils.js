/**
 * Wrapper to assist with insert or upsert of multiple documents of the same type.
 * Will automatically flush for you.
 *
 * When auto-flushing is enabled (the default), the caller should wait for the promise returned from each `insert()` or
 * `upsert()` to resolve.  It will usually resolve immediately, but when auto-flushing does occur it will wait for the
 * `execute()` to complete.
 *
 * Continuing to insert or upsert a huge number of documents without waiting on the promise will risk filling up the
 * caller's memory!  (Specifically in environments where the Node process can create documents faster than Mongo can
 * accept them.)
 *
 * Alternatively, the caller can ignore the returned promises, if instead they:
 *
 * - Disable auto-flushing by calling `setAutoFlush(false)`
 * - Call `considerFlush()` or `flush()` at least once every 500 records or so.
 * - Wait for *that* returned promise to resolve.
 *
 * This method might be minutely faster because there will be fewer cycles spent dealing with promises.  But when using
 * `flush()` this module really offers nothing beyond creating your own UnorderedBulkOp.
 *
 * Whichever method is used, `done()` should be called at the end of the process, to flush any queued documents.
 *
 * @param model
 * @param maxBatchSize
 */
function bulkOperationWrapper (model, maxBatchSize) {
    maxBatchSize = maxBatchSize || 1000;

    const OK = Promise.resolve(true);

    var autoFlush = true;

    var bulk = model.collection.initializeUnorderedBulkOp();
    var queued = 0;

    /**
     * Enables or disabled auto-flush.
     *
     * Disabling auto-flush off will allow you to control when flushing occurs, and when the promise that waits for the
     * execute to complete will be returned.
     */
    function setAutoFlush (val) {
        autoFlush = val;
    }

    // Actually if you need to do many creates, you can just use Mongoose's Model.insertMany
    function insert (documentData) {
        bulk.insert(documentData);
        return increment();
    }

    function upsert (match, update) {
        // The update() below used to be updateOne().  Hopefully update() will work reasomably well!
        bulk.find(match).upsert().updateOne(update);
        return increment();
    }

    /**
     * @returns {Promise}
     */
    function increment () {
        queued++;
        if (autoFlush) {
            return considerFlush();
        }
    }

    function considerFlush () {
        if (queued >= maxBatchSize) {
            return flush();
        } else {
            return OK;
        }
    }

    /**
     * @returns {Promise}
     */
    function flush (skipReset) {
        if (queued === 0) {
            // Avoid "MongoError: Invalid Operation, No operations in bulk" if we have nothing added to this bulk yet.
            return OK;
        }
        // console.log("[log] (mongooseUtils.js:bulkOperationWrapper:flush) Flushing %s records for %s", queued, model.collection.name);
        var promise = bulk.execute();
        if (!skipReset) {
            queued = 0;
            bulk = model.collection.initializeUnorderedBulkOp();
        }
        // @todo We could allow a limited number of uncompleted bulks (e.g. 3), so the caller can continue generating
        //       documents while the other bulks are still being processed by mongo.  We may wish to delay the next bulk
        //       until the previous one has finished.  This should not apply when flush() was called directly.
        return promise;
    }

    // Flushes the current batch, does not prepare for a new one.  After this the instance should no longer be used.
    function done () {
        return flush(true);
    }

    return {
        setAutoFlush: setAutoFlush,
        insert: insert,
        upsert: upsert,
        considerFlush: considerFlush,
        flush: flush,
        done: done,
    };
}

var mongooseUtils = {
    bulkOperationWrapper: bulkOperationWrapper
};

module.exports = mongooseUtils;