const Q = require("q");

const dbOperations = {
    findOneAndUpdateWithRetry: function (model, query, update, options) {
        const maxAttempts = 4;
        const delayBetweenAttempts = 500;

        const attemptUpdate = (currentAttemptCount) => {
            return model.findOneAndUpdate(query, update, options).catch(
                error => {
                    if (currentAttemptCount >= maxAttempts) {
                        // This is a bad situation, so we log a lot to help debugging
                        console.log(`Update attempt ${currentAttemptCount}/${maxAttempts} failed.  query=`, query, `update=`, update, `error=`, error);
                        return Q.reject({
                            name: 'DBError',
                            message: "Failed " + currentAttemptCount + " attempts to findOneAndUpdate",
                            //collection: '...',
                            query: query,
                            update: update,
                            error: error
                        });
                    }

                    console.log(`Update attempt ${currentAttemptCount}/${maxAttempts} failed with "${error}", retrying...`);
                    return Q.delay(delayBetweenAttempts).then(
                        () => attemptUpdate(currentAttemptCount + 1)
                    );
                }
            );
        };

        return attemptUpdate(1);
    },

    removeWithRetry: (model, query) => {
        const maxAttempts = 4;
        const delayBetweenAttempts = 500;

        const attemptRemove = (currentAttemptCount) => {
            return model.remove(query).catch(
                error => {
                    if (currentAttemptCount >= maxAttempts) {
                        // This is a bad situation, so we log a lot to help debugging
                        console.log(`Remove attempt ${currentAttemptCount}/${maxAttempts} failed.  query=`, query, `error=`, error);
                        return Q.reject({
                            name: 'DBError',
                            message: "Failed " + currentAttemptCount + " attempts to findOneAndUpdate",
                            //collection: '...',
                            query: query,
                            error: error
                        });
                    }

                    console.log(`Remove attempt ${currentAttemptCount}/${maxAttempts} failed with "${error}", retrying...`);
                    return Q.delay(delayBetweenAttempts).then(
                        () => attemptRemove(currentAttemptCount + 1)
                    );
                }
            );
        };

        return attemptRemove(1);
    }
};

module.exports = dbOperations;