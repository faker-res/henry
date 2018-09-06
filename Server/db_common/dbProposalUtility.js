const constProposalStatus = require('./../const/constProposalStatus');

const dbConfig = require('./../modules/dbproperties');

const dbProposalUtility = {
    getProposalDataOfType: (platformObjId, proposalType, proposalQuery, fields = {}) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: proposalType
        }).lean().then(
            proposalType => {
                proposalQuery.type = proposalType._id;

                return dbConfig.collection_proposal.find(proposalQuery, fields).populate(
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
    },

    getTotalRewardAmtFromProposal: (platformObjId, playerObjId, startTime, endTime) => {
        let returnAmt = 0;

        return dbConfig.collection_proposal.find({
            mainType: "Reward",
            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            createTime: {$gte: startTime, $lte: endTime},
            'data.platformId': platformObjId,
            'data.playerObjId': playerObjId
        }).lean().then(
            props => {
                if (props && props.length > 0) {
                    props.forEach(prop => {
                        if (prop.data.rewardAmount && prop.data.rewardAmount > 0) {
                            returnAmt += prop.data.rewardAmount;
                        }
                    })
                }

                return returnAmt;
            }
        )
    }
};

module.exports = dbProposalUtility;