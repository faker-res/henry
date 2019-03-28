const constProposalStatus = require('./../const/constProposalStatus');

const dbConfig = require('./../modules/dbproperties');
const rsaCrypto = require('./../modules/rsaCrypto');

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

    // check the next proposal (either top up or withdrawal) after applying promo code
    getNextProposalRecord: (platformObjId, proposalType, proposalQuery) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: proposalType
        }).lean().then(
            proposalType => {
                if (proposalType && proposalType._id) {
                    proposalQuery.$or = [{type: proposalType._id}, {mainType: "TopUp"}];

                    return dbConfig.collection_proposal.findOne(proposalQuery).lean();
                }
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

    // region Proposal check

    // check reward apply restriction on ip, phone and IMEI
    checkRestrictionOnDeviceForApplyReward: (intervalTime, player, rewardEvent) => {
        return dbConfig.collection_proposal.aggregate(
            {
                $match: {
                    "createTime": {$gte: intervalTime.startTime, $lte: intervalTime.endTime},
                    "data.eventId": rewardEvent._id,
                    "status": {$in: [constProposalStatus.APPROVED, constProposalStatus.APPROVE, constProposalStatus.SUCCESS]},
                    $or: [
                        {'data.playerObjId': player._id},
                        {'data.lastLoginIp': player.lastLoginIp},
                        {'data.phoneNumber': player.phoneNumber},
                        {'data.deviceId': player.deviceId},
                    ]
                }
            },
            {
                $project: {
                    createTime: 1,
                    status: 1,
                    'data.playerObjId': 1,
                    'data.eventId': 1,
                    'data.lastLoginIp': 1,
                    'data.phoneNumber': 1,
                    'data.deviceId': 1,
                    _id: 0
                }
            }
        ).read("secondaryPreferred").then(
            countReward => {

                let samePlayerHasReceived = false;
                let sameIPAddressHasReceived = false;
                let samePhoneNumHasReceived = false;
                let sameDeviceIdHasReceived = false;
                let samePlayerId = 0;
                let sameIPAddress = 0;
                let samePhoneNum = 0;
                let sameDeviceId = 0;

                // check playerId
                if (countReward && countReward.length) {
                    for (let i = 0; i < countReward.length; i++) {
                        // check if same player  has already received this reward
                        if (player._id.toString() === countReward[i].data.playerObjId.toString()) {
                            samePlayerId++;
                        }

                        if (player.lastLoginIp !== '' && rewardEvent.condition.checkSameIP && player.lastLoginIp === countReward[i].data.lastLoginIp) {
                            sameIPAddress++;
                        }

                        if (rewardEvent.condition.checkSamePhoneNumber && player.phoneNumber === countReward[i].data.phoneNumber) {
                            samePhoneNum++;
                        }

                        if (rewardEvent.condition.checkSameDeviceId &&  countReward[i].data.deviceId && player.deviceId && player.deviceId === countReward[i].data.deviceId) {
                            sameDeviceId++;
                        }
                    }

                    if (samePlayerId >= 1) {
                        samePlayerHasReceived = true;
                    }
                    if (sameIPAddress >= 1) {
                        sameIPAddressHasReceived = true;
                    }
                    if (samePhoneNum >= 1) {
                        samePhoneNumHasReceived = true;
                    }
                    if (sameDeviceId >= 1) {
                        sameDeviceIdHasReceived = true;
                    }
                }

                let resultArr = {
                    samePlayerHasReceived: samePlayerHasReceived,
                    sameIPAddressHasReceived: sameIPAddressHasReceived,
                    samePhoneNumHasReceived: samePhoneNumHasReceived,
                    sameDeviceIdHasReceived: sameDeviceIdHasReceived
                };

                return resultArr;
            }
        );
    },

    isLastTopUpProposalWithin30Mins: (proposalType, platformObjId, playerObj) => {
        if(proposalType && platformObjId && playerObj){
            return dbConfig.collection_proposalType.findOne({name: proposalType, platformId: platformObjId}).then(
                proposalType => {
                    if(proposalType && proposalType._id){
                        return dbConfig.collection_proposal.find({type: proposalType._id, 'data.playerObjId': playerObj._id}).limit(1).sort({_id: -1});
                    }else{
                        return Promise.resolve(true);
                    }
                }
            ).then(
                proposalData => {
                    let currentDate = new Date();
                    if (proposalData && proposalData.length > 0 && proposalData[0].createTime) {
                        let diff =(currentDate.getTime() - proposalData[0].createTime.getTime()) / 1000;
                        diff /= 60;
                        let diffInMin = Math.abs(Math.round(diff));

                        if(diffInMin <= 30){
                            return proposalData;
                        }
                    }

                    return Promise.resolve(true);
                }
            )
        } else {
            return Promise.resolve(true);
        }
    }

    // endregion
};

module.exports = dbProposalUtility;