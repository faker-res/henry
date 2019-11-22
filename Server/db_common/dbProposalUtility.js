const constProposalStatus = require('./../const/constProposalStatus');
var dbUtility = require('./../modules/dbutility');
var constRewardType = require("./../const/constRewardType");
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

    getProposalDataOfTypeByPlatforms: (platformList, proposalType, proposalQuery, fields = {}) => {
        let query = {
            name: proposalType
        };

        if (platformList) {
            query.platformId = platformList
        }

        return dbConfig.collection_proposalType.find(query).lean().then(
            proposalType => {
                proposalQuery.type = {$in: proposalType.map(item => { return item._id})};

                return dbConfig.collection_proposal.find(proposalQuery, fields).populate(
                    {path: "process", model: dbConfig.collection_proposalProcess}
                ).populate(
                    {path: "data.platformId", model: dbConfig.collection_platform}
                ).lean();
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

    calculateProposalsTotalAmount: (proposalArr) => {
        let totalAmount = 0;
        let playerSet = new Set();

        proposalArr.forEach(p => {
            if (p.data) {
                if (p.data.amount) {
                    totalAmount += Number(p.data.amount);
                }

                if (p.data.rewardAmount) {
                    totalAmount += Number(p.data.rewardAmount);
                }

                if (p.data.updateAmount) {
                    totalAmount += Number(p.data.updateAmount);
                }

                if (p.data.negativeProfitAmount) {
                    totalAmount += Number(p.data.negativeProfitAmount);
                }

                if (p.data.commissionAmount) {
                    totalAmount += Number(p.data.commissionAmount);
                }

                if (p.data.playerObjId) {
                    playerSet.add(p.data.playerObjId);
                }
            }
        });

        let retObj = {
            totalAmount: totalAmount,
            totalProps: proposalArr.length,
            playerSet: [...playerSet]
        };

        return Promise.resolve(retObj);
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
    checkRestrictionOnDeviceForApplyReward: (intervalTime, player, rewardEvent, retentionApplicationDate) => {
        console.log('JY check checkRestrictionOnDeviceForApplyReward intervalTime ==>', intervalTime);
        let intervalTimeForLoginMode3 = null;

        let orArray = [{'data.playerObjId': player._id}];
        if (player.lastLoginIp) {
            orArray.push({'data.lastLoginIp': player.lastLoginIp})
        }
        if (player.phoneNumber) {
            orArray.push({'data.phoneNumber': player.phoneNumber})
        }
        if (player.deviceId) {
            orArray.push({'data.deviceId': player.deviceId})
        }

        let matchQuery = {
            "data.eventId": rewardEvent._id,
            "status": {$in: [constProposalStatus.APPROVED, constProposalStatus.APPROVE, constProposalStatus.SUCCESS]},
            $or: orArray
        };

        //get the interval time for loginMode 3
        if (retentionApplicationDate) {
            intervalTimeForLoginMode3 = getIntervalForPlayerLoginMode3(rewardEvent, retentionApplicationDate);
            console.log("checking intervalTimeForLoginMode3", intervalTimeForLoginMode3)
        }

        if(rewardEvent.type && rewardEvent.type.name && rewardEvent.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP ){
            if (intervalTime) {
                matchQuery['data.retentionApplicationDate'] = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
            }
            if (rewardEvent.condition && rewardEvent.condition.definePlayerLoginMode && rewardEvent.condition.definePlayerLoginMode == 3 && retentionApplicationDate &&
                intervalTimeForLoginMode3 && intervalTimeForLoginMode3.endTime > new Date()) {
                matchQuery['data.retentionApplicationDate'] = {
                    $gte: intervalTimeForLoginMode3.startTime,
                    $lte: intervalTimeForLoginMode3.endTime
                };
            }
        }
        else{
            if (intervalTime) {
                matchQuery.createTime = {$gte: intervalTime.startTime, $lte: intervalTime.endTime};
            }
        }

        console.log('checking matchQuery', matchQuery)

        return dbConfig.collection_proposal.find(
            matchQuery,
            {
                createTime: 1,
                status: 1,
                'data.playerObjId': 1,
                'data.eventId': 1,
                'data.lastLoginIp': 1,
                'data.phoneNumber': 1,
                'data.deviceId': 1,
                _id: 0
            }
        ).lean().read("secondaryPreferred").then(
            countReward => {
                console.log('countReward', countReward)

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

        function getIntervalForPlayerLoginMode3 (rewardEvent, retentionApplicationDate) {
            let startDate = dbUtility.getTargetSGTime(retentionApplicationDate).startTime;
            let endDate = null;
            let intervalTime = {};

            if (rewardEvent.condition.interval) {
                switch (rewardEvent.condition.interval) {
                    case "2":
                        endDate = dbUtility.getNdaylaterFromSpecificStartTime(7, startDate);
                        intervalTime.startTime  = startDate;
                        intervalTime.endTime = endDate;
                        break;
                    case "3":
                        if (isNewDefineHalfMonth){
                            endDate = dbUtility.getNdaylaterFromSpecificStartTime(15, startDate);
                            intervalTime.startTime  = startDate;
                            intervalTime.endTime = endDate;
                        }
                        else{
                            endDate = dbUtility.getNdaylaterFromSpecificStartTime(14, startDate);
                            intervalTime.startTime  = startDate;
                            intervalTime.endTime = endDate;
                        }
                        break;
                    case "4":
                        endDate = dbUtility.getNdaylaterFromSpecificStartTime(30, startDate);
                        intervalTime.startTime  = startDate;
                        intervalTime.endTime = endDate;
                        break;
                    case "6":
                        intervalTime = retentionApplicationDate ? dbUtility.getLastMonthSGTImeFromDate(retentionApplicationDate) : dbUtility.getLastMonthSGTime();
                        break;
                    default:
                        if (rewardEvent.validStartTime && rewardEvent.validEndTime) {
                            intervalTime = {startTime: rewardEvent.validStartTime, rewardEvent: eventData.validEndTime};
                        }
                        break;
                }
            }

            if (intervalTime && intervalTime.startTime && intervalTime.endTime){
                return intervalTime
            }
            else{
                return Promise.reject({
                    name: "DataError",
                    message: "cannot get the interval time for player retention reward with login mode = 3"
                })
            }
        }

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