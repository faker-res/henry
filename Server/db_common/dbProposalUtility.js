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
    },

    createProposalProcessStep: (proposal, adminObjId, status, memo) => {
        let proposalTypeProm = dbConfig.collection_proposalType.findOne({_id: proposal.type}).populate({
            path: "process",
            model: dbConfig.collection_proposalTypeProcess
        }).lean();
        let adminProm = dbConfig.collection_admin.findOne({_id: adminObjId}).lean();

        return Promise.all([proposalTypeProm, adminProm]).then(
            ([proposalType, admin]) => {
                if (!proposalType || !admin) {
                    return Promise.resolve();
                }

                if (!proposalType.process || !proposalType.process.steps || !proposalType.process.steps.length) {
                    return Promise.resolve();
                }

                let proposalTypeProcessStepId = proposalType.process.steps[0] || ObjectId();

                let proposalProcessStepData = {
                    status,
                    memo,
                    operator: adminObjId,
                    operationTime: new Date(),
                    type: proposalTypeProcessStepId,
                    department: admin.departments && admin.departments[0] || undefined,
                    role: admin.roles && admin.roles[0] || undefined,
                    createTime: new Date()
                };

                let proposalProcessStep = new dbConfig.collection_proposalProcessStep(proposalProcessStepData);
                return proposalProcessStep.save();
            }
        ).then(
            stepObj => {
                if (!stepObj) {
                    return Promise.resolve();
                }

                return dbConfig.collection_proposalProcess.findOneAndUpdate({_id: proposal.process}, {$addToSet: {steps: stepObj._id}}, {new: true}).lean();
            }
        );
    },
};

module.exports = dbProposalUtility;