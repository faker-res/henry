// Mocha usually displays good error reports when presented with a Javascript Error, either through `done(err)` or
// promise rejection.
//
// However it does not display good reports in the following situations:
//
//   - Functions which reject with plain objects instead of Errors.
//
//     In the case of promises, mocha only displays the 'message' string, and does not display the associated error
//     or data.  In both promise and done cases, mocha will not report stack traces deeper inside the object.
//
//   - Mongoose validation failures, which hide the failure reasons in `err.errors` but do not offer any explanation in
//     the top error message that mocha displays.
//
// So here we wrap all tests passed to mocha's 'it' function, so we can intercept errors before they reach mocha, and
// in the cases listed above we will pre-emptively log more useful information.
//
// This will save us from having to manually log errors in every test in our test suite.  We can just pass them
// directly to mocha as is the norm.
//
// This could also have been achieved using a custom reporter for mocha.  The advantage of this approach is that it
// works automatically (provided it is require-d) without needing to be called from the command line.

function improveMochaReporting () {

    // If we are not running inside the mocha test framework, then abort early, for efficiency
    if (!global.it) {
        return;
    }

    var errorUtils = require('../modules/errorUtils');
    var colors = require('colors/safe');

    function considerReportingError (error) {
        if (!error) return;
        // If it is an Error, then mocha will probably report it just fine, so we don't need to.
        // Except in the case of a mongoose validation error, which we detect by the array at .errors.
        if (!(error instanceof Error) || (error && error.errors)) {
            console.log('');
            console.error(colors.red('Test failed with reason:'));
            errorUtils.reportError(error);
            console.log('');
        }
    }

    function wrapMochaIt (originalIt) {
        var wrappedIt = function (title, originalTest) {
            var wrappedTest;

            // I originally tried solving both situations with one function, but had trouble when actual errors were
            // thrown, even if I set wrappedTest.length = originalTest.length
            // So now we create a different function for each situation.
            if (originalTest.length === 0) {
                // Test does not accept done argument, so it probably returns a promise
                wrappedTest = function () {
                    var returnValue = originalTest.call(this);

                    // Wrap the returned promise with improved error logging
                    if (returnValue && typeof returnValue.catch === 'function') {
                        returnValue = returnValue.catch(
                            function (error) {
                                considerReportingError(error);
                                throw error;
                            }
                        );
                    }

                    return returnValue;
                };
            }
            else if (originalTest.length === 1) {
                // Test accepts the done argument
                wrappedTest = function (originalDone) {
                    // Wrap the done function with improved error logging
                    var wrappedDone = function (error) {
                        considerReportingError(error);
                        return originalDone.apply(this, arguments);
                    };

                    return originalTest.call(this, wrappedDone);
                };
            }
            else {
                console.warn(`[improveMochaReporting] I do not know how to wrap test with ${originalTest.length} arguments.`);
                wrappedTest = originalTest;
            }

            return originalIt.call(this, title, wrappedTest);
        };

        return wrappedIt;
    }

    if (global.it && !global.it._reportingImproved) {
        global.it = wrapMochaIt(global.it);
        global.it._reportingImproved = true;
        console.log("(Enhanced mocha error reporting enabled.)")
    }

}

// Due to Node's module caching, this file only runs once per runtime.
// However mocha may run multiple test scripts, with a fresh `global.it` each time.
// So to ensure global.it gets wrapped for every test script, we return a function here which should be called by every test script.
// Note it is not enough to call improveMochaReporting() from within a module which all test scripts depend on, because again we will suffer from the caching problem.
// Unless we include the call inside a function which is executed by every test script.
module.exports = improveMochaReporting;

// However, just in case we were required without being called (e.g. by older test scripts), we can run once initially.
//improveMochaReporting();