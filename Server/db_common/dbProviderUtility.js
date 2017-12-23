const dbconfig = require('./../modules/dbproperties');

const dbProviderUtility = {
    getProvidersDetailInProviderGroup: (providerGroupObjId) => {
        return dbconfig.collection_gameProviderGroup.findOne({_id: providerGroupObjId})
            .populate({path: "providers", model: dbconfig.collection_gameProvider}).lean()
    }
};

module.exports = dbProviderUtility;