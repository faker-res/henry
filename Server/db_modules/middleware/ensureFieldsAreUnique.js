function oneOfTheFieldsHasChanged (fields, document) {
    /*
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (document.isModified(field)) {
            return true;
        }
    }
    return false;
    */

    return fields.some(
        field => document.isModified(field)
    );
}

/**
 * Creates a mongoose middleware function that checks to see if one or more of the given properties in the document already exist in the collection.
 * Fails if an identical field is found in the DB (in any document other than the one we are comparing against, which may already be in the collection).
 * @param {Array<String>} fields
 * @returns {Function} middleware function
 */
module.exports = function ensureUnique (fields) {
    return function (next) {
        try {
            const document = this;

            var needToCheck = document.isNew || oneOfTheFieldsHasChanged(fields, document);

            if (needToCheck) {

                const model = document.constructor;
                const collection = document.collection;

                if (!model) {
                    return next(new Error("Cannot check uniqueness because document's model is unknown."));
                }

                // For speed, we want to check all fields in one query
                // fieldQueries might look like: [ {playerId: 54}, {name: 'Steven OrcKiller'} ]
                const fieldQueries = fields.map(
                    function (field) {
                        const check = {};
                        check[field] = document[field];
                        return check;
                    }
                );

                model.find({
                    $and: [
                        {$or: fieldQueries},
                        {
                            _id: {$ne: document._id}
                        }
                    ]
                }, function (err, hits) {
                    if (err) return next(err);

                    if (hits.length === 0) {
                        next();
                    } else {
                        // Which fields were matched?
                        const matchingFields = [];
                        hits.forEach(hit => {
                            fields.forEach(field => {
                                if (document[field] == hit[field]) {
                                    matchingFields.push(field);
                                }
                            });
                        });

                        next(new Error("One or more " + collection.name + " documents already exist with matching field(s): " + matchingFields.join(", ")));
                    }
                });

            } else {
                next();
            }
        } catch (e) {
            next(e);
        }
    };
};