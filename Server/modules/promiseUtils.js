/**
 * Executes the given promise generator on each item in the array, in sequence (not in parallel).
 *
 * This should be equivalent to Bluebird's Promise.each.
 *
 * @param {[Promise|*]} array An array or a promise of an array, containing a mix of promises and values.
 * @param {function(*, Number, Number):(Promise|*)} promiseGenerator A function which takes one of the array items, and returns either a promise or a value.  The second and third arguments are the index in the resolved array, and the length of the resolved array.
 * @returns {Promise}
 *
 * @example:
 * // Given an array of functions that generate promises, call each function and resolve each generated promise in turn.
 * return promiseUtils.each(promiseGenerators, pg => pg() );
 *
 * @example:
 * // Given an array of records, process each record in turn, by calling processRecord(records[i]) which should return a promise.
 * return promiseUtils.each(records, processRecord);
 */
function each(array, promiseGenerator) {
    // array may or may not be a promise
    return Promise.resolve(array).then(function (resolvedArray) {
        var lastPromise = Promise.resolve(true);
        resolvedArray.forEach(function (item, index) {
            lastPromise = lastPromise.then(function () {
                // Each array item may or may not be a promise
                return Promise.resolve(item).then(function (resolvedItem) {
                    return promiseGenerator(resolvedItem, index, resolvedArray.length);
                });
            });
        });
        return lastPromise;
    }).then(function () {
        return array;
    });
}

/**
 * Repeatedly calls doNext() while conditionFn returns true or something truthy.
 * Runs maxConcurrent doNext() promises in parallel, starting a new one each time a running one resolves.
 *
 * Example:
 *     var toProcess = new Array(2000).fill(true);
 *     function slowProcess (item) {
 *         return promiseUtils.delay(100);
 *     }
 *     whileConcurrently(
 *         () => toProcess.length > 0,
 *         () => slowProcess( toProcess.pop() ),
 *         20
 *     );
 *
 * @param {function():boolean} conditionFn - Indicates whether there is more work to do or not.  Synchronous
 * @param {function():Promise<*>} doNext - Starts the next piece of work, resolving when complete
 * @param {Number} maxConcurrent - The number of promises that should be resolved in parallel
 * @returns {Promise}
 *
 * See also: https://github.com/azproduction/promise-queue
 */
function whileConcurrently (conditionFn, doNext, maxConcurrent) {
    maxConcurrent = maxConcurrent || 20;

    var startWorker = function () {
        var workRemains = conditionFn();
        return workRemains ? doNext().then(startWorker) : Promise.resolve();
    };

    var workers = [];
    for (var i = 0; i < maxConcurrent; i++) {
        workers.push( startWorker() );
    }

    return Promise.all(workers);
}

/**
 * Process a list of items in parallel, but with a limit.
 *
 * @param {[<X|function():Promise>]} list - List of input data.  If mapFn is not provided, list items should be functions that return promises
 * @param {Number} maxConcurrent - The number of promises that should be resolved in parallel
 * @param {function(X, Number, Number):Promise<*>} [mapFn] - Optional function that takes a list item and returns a promise.  The function is also passed the item index and the length of the list, as second and third arguments, to match with Bluebird's Promise.each().
 * @returns {Promise}
 */
function eachConcurrently (list, maxConcurrent, mapFn) {
    mapFn = mapFn || ( x => x() );
    var i = 0;
    return whileConcurrently(
        () => i < list.length,
        () => mapFn(list[i++], i - 1, list.length),
        maxConcurrent
    );
}

var promiseUtils = {
    each: each,

    whileConcurrently: whileConcurrently,
    eachConcurrently: eachConcurrently,

    delay: function (ms) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, ms);
        });
    }
};

module.exports = promiseUtils;
