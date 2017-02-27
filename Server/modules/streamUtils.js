const EventEmitter = require('events');
const util = require('util');

/**
 * Provide a stream of batched inputs.
 * @param {{QueryStream}} inputStream - A mongoose QueryStream.  (Might also work on Node streams.)
 * @param {{Number}} maxBatchSize - Batches of this size will be emitted (even if we have to wait).  Only the last batch might be smaller.
 * @returns {{Stream}} - Something that looks like a mongoose QueryStream.  It will emit arrays of data from the inputStream.
 *
 * Note: This stream starts flowing immediately.  That means you should assign a listener for 'data' events before the next tick, or you may miss seeing some of the input items.
 *
 * Note: Current implementation can emit 'data', 'end' and 'error' events, but never 'close' events.
 *
 * Note: The 'end' event is fired immediately after the last batch is emitted.  It does not wait for the next requested read from the stream.
 *       If you process the batches asynchronously, the 'end' event will fire before you have finished processing.
 *
 *       We could introduce `this.isEnded = true;` to help consumers with this.
 */
function BatchedStream (inputStream, maxBatchSize) {
    EventEmitter.call(this);

    var self = this;

    // The next batch of data.  Do not hold onto a reference to this, because we will give it to the stream listener.
    var batch = [];

    // This is not actually a Node Stream, but it looks/acts a little bit like one.
    Object.assign(self, {

        pause: function () {
            inputStream.pause();
            return this;
        },

        resume: function () {
            inputStream.resume();
            return this;
        },

        // close and destroy are common methods for NodeJS streams, but not officially documented

        close: function () {
            inputStream.close();
        },

        destroy: function () {
            inputStream.destroy();
        }

    });

    function startFlowing() {
        inputStream.on('data', processData);
        inputStream.on('end', function () {
            if (batch.length > 0) {
                sendBatch();
            }
            self.emit('end');
        });
        inputStream.on('error', function (err) {
            self.emit('error', err);
        });
    }

    function processData(data) {
        batch.push(data);
        if (batch.length >= maxBatchSize) {
            sendBatch();
        }
    }

    function sendBatch() {
        // We don't want to send our private internal batch array, because we are about to clear it.
        // But cloning it would not be efficient.  (Two copies in memory at once.)
        // So, we do send our internal array, but then we discard it, replacing it with an empty array.
        var batchToSend = batch;
        batch = [];
        // console.log(new Date() + " Sending batch length ", batchToSend.length);
        self.emit('data', batchToSend);
    }

    startFlowing();
}
util.inherits(BatchedStream, EventEmitter);

function batchStream (inputStream, maxBatchSize) {
    return new BatchedStream(inputStream, maxBatchSize);
}

/**
 * Processes a stream sequentially.
 * @param {Readable<T>} stream
 * @param {function(<T>):Promise} processOne Called with one stream item, should return a promise. The next item will not be processed until the returned promise resolves.
 * @returns {Promise<Number>} Resolves with the number of items processed, when the stream has emptied *and* all the items have been processed.
 */
function processStream (stream, processOne) {
    /*
    return new Promise(function (resolve, reject) {
        // We require two conditions to be sure that the processing is complete
        var streamIsEnded = false;
        var anItemIsProcessing = false;

        var itemsProcessed = 0;

        stream.on('data', function (data) {
            // This will prevent more 'data' events from firing, until resume() is called.
            stream.pause();
            anItemIsProcessing = true;
            processOne(data).then(
                function () {
                    itemsProcessed++;
                    anItemIsProcessing = false;
                    stream.resume();
                    checkForCompletion();
                }
            ).catch(reject);
        });

        stream.on('end', function () {
            streamIsEnded = true;
            checkForCompletion();
        });

        function checkForCompletion() {
            if (streamIsEnded && !anItemIsProcessing) {
                resolve(itemsProcessed);
            }
        }

        stream.on('error', reject);
    });
    */

    // processStreamConcurrently with 1 worker is almost identical to the above

    return processStreamConcurrently(stream, 1, processOne);
}

/**
 * Splits the stream into batches, and then calls processBatch to process each batch sequentially.
 *
 * @param {Readable<T>} stream
 * @param {Number} batchSize
 * @param {function([<T>]):Promise} processBatch
 * @returns {Promise<Number>} Resolves with the number of batches processed.
 */
function processStreamInBatches (stream, batchSize, processBatch) {
    var batchedStream = batchStream(stream, batchSize);
    return processStream(batchedStream, processBatch);
}

/**
 * Splits the stream into batches, which are processed in sequence.  Within a batch, all items are processed in parallel, using the processOne function.
 * So the batches themselves are not run in parallel, the contents of each batch are run in parallel!
 *
 * This is not optimal, because each batch does not start until all items in the previous batch are processed.  Hence there is likely to will some idle resources at the end of each batch (and a little at the beginning).  But if batch sizes are large, at least that can be minimized.
 * Ideally we would have a system with parallel workers, where one new micro job is started each time a running job ends.  promiseUtils.eachConcurrently and SettlementBalancer use this approach.
 *
 * @deprecated Instead of this function, you can use processStreamInConcurrentBatches with maxWorkers=1
 *
 * @param {Readable<T>} stream
 * @param {Number} batchSize
 * @param {function(<T>):Promise} processOne
 * @returns {Promise<Number>} Resolves with the number of batches processed.
 */
function processStreamInParallelizedBatches (stream, batchSize, processOne) {
    var processBatch = function (batch) {
        var proms = batch.map(processOne);
        return Promise.all(proms);
    };

    return processStreamInBatches(stream, batchSize, processBatch);
}

/**
 * Calls processOne on each item in the stream, running maxWorkers such processes in parallel at a time.
 *
 * @param {Readable<T>} stream
 * @param {Number} maxWorkers
 * @param {function(<T>):Promise} processOne
 * @returns {Promise<Number>} Resolves with the number of batches processed.
 */
function processStreamConcurrently (stream, maxWorkers, processOne) {
    return new Promise(function (resolve, reject) {
        // We require two conditions to be sure that the processing is complete
        var streamIsEnded = false;
        var activeWorkers = 0;

        var itemsProcessed = 0;

        stream.on('data', function (data) {
            activeWorkers++;
            if (activeWorkers >= maxWorkers) { // should never be greater than
                // This will prevent more 'data' events from firing, until resume() is called.
                stream.pause();
            }
            processOne(data).then(function () {
                activeWorkers--;
                if (activeWorkers < maxWorkers) { // should be always true
                    stream.resume();
                }
                itemsProcessed++;
                checkForCompletion();
            }).catch(reject);
        });

        stream.on('end', function () {
            streamIsEnded = true;
            checkForCompletion();
        });

        function checkForCompletion() {
            if (streamIsEnded && activeWorkers === 0) {
                resolve(itemsProcessed);
            }
        }

        stream.on('error', reject);
    });
}

function processStreamInConcurrentBatches (stream, batchSize, maxWorkers, processOne) {
    var batchedStream = batchStream(stream, batchSize);

    var processBatch = function (batch) {
        var proms = batch.map(processOne);
        return Promise.all(proms);
    };

    return processStreamConcurrently(batchedStream, maxWorkers, processBatch);
}

var streamUtils = {
    batchStream: batchStream,
    processStream: processStream,
    processStreamInBatches: processStreamInBatches,
    //processStreamInParallelizedBatches: processStreamInParallelizedBatches,
    processStreamConcurrently: processStreamConcurrently,
    processStreamInConcurrentBatches: processStreamInConcurrentBatches
};

module.exports = streamUtils;