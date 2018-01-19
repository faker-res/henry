const dbConfig = require('./../modules/dbproperties');

const dbProposalUtility = {
    getProposalDataOfType: (platformObjId, proposalType, proposalQuery) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: proposalType
        }).lean().then(
            proposalType => {
                proposalQuery.type = proposalType._id;

                return dbConfig.collection_proposal.find(proposalQuery).populate(
                    {path: "process", model: dbConfig.collection_proposalProcess}
                ).lean();
            }
        )
    },

    getOneProposalDataOfType: (platformObjId, proposalType, proposalQuery) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: proposalType
        }).lean().then(
            proposalType => {
                proposalQuery.type = proposalType._id;

                return dbConfig.collection_proposal.findOne(proposalQuery).lean();
            }
        )
    }
};

module.exports = dbProposalUtility;