'use strict';

var dbRewardTaskFunc = function () {
};
module.exports = new dbRewardTaskFunc();

const messageDispatcher = require("../modules/messageDispatcher.js");
const SMSSender = require('../modules/SMSSender');
var constProposalStatus = require('./../const/constProposalStatus');
var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var constRewardType = require('./../const/constRewardType');
var constRewardDataSource = require('./../const/constRewardDataSource');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var constPlayerCreditChangeType = require('./../const/constPlayerCreditChangeType');
const constPlayerSMSSetting = require("./../const/constPlayerSMSSetting");
var constServerCode = require('../const/constServerCode');
var dbLogger = require("./../modules/dbLogger");
var constSystemParam = require('../const/constSystemParam');
var constShardKeys = require("../const/constShardKeys");
var constProposalType = require("../const/constProposalType");
var dbUtil = require("../modules/dbutility.js");
var errorUtils = require("../modules/errorUtils.js");
var cpmsAPI = require("../externalAPI/cpmsAPI");
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbGameProvider = require('../db_modules/dbGameProvider');
const dbEmailAudit = require('../db_modules/dbEmailAudit');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerUtil = require("../db_common/dbPlayerUtility");
const dbRewardUtil = require("../db_common/dbRewardUtility");

const dbRewardTaskGroup = require('../db_modules/dbRewardTaskGroup');

const dbRewardTask = {
    /**
     * Create a new reward
     * @param {Object} rewardData - The data of the reward. Refer to reward schema.
     * @param adminId
     * @param adminName
     */
    manualCreateReward: async (rewardData, adminId, adminName) => {
        let proposal = await dbProposal.createProposalWithTypeNameWithProcessInfo(
            rewardData.platformId,
            constProposalType.ADD_PLAYER_REWARD_TASK,
            {
                creator: {
                    type: 'admin',
                    name: adminName,
                    id: adminId
                },
                data: rewardData
            }
        );

        if (rewardData && rewardData.eventCode === "manualReward") {
            dbEmailAudit.sendAuditManualRewardEmail(proposal);
        }

        return proposal;
    },

    /**
     *
     * @param rewardData
     */
    createRewardTask: (rewardData) => {
        let deferred = Q.defer();
        rewardData.bonusAmount = rewardData.initAmount;
        let rewardTask = new dbconfig.collection_rewardTask(rewardData);
        let taskProm = rewardTask.save();
        let playerProm = {validCredit: 0};

        dbconfig.collection_platform.findOne({_id: rewardData.platformId}).lean().then(
            platformData => {
                if (rewardData.useLockedCredit) {
                    if (platformData.canMultiReward) {
                        // Player's locked credit will increase from current lockedAmount
                        playerProm = dbconfig.collection_players.findOneAndUpdate(
                            {_id: rewardData.playerId, platform: rewardData.platformId},
                            {$inc: {lockedCredit: rewardData.initAmount}}
                        ).exec();
                    }
                    else {
                        playerProm = dbconfig.collection_players.findOneAndUpdate(
                            {_id: rewardData.playerId, platform: rewardData.platformId},
                            {lockedCredit: rewardData.initAmount}
                        ).exec();
                    }
                }
                return Promise.all([taskProm, playerProm]);
            }
        ).then(
            data => {
                if (data && data[0] && data[1]) {
                    if (rewardData.useLockedCredit) {
                        dbLogger.createCreditChangeLogWithLockedCredit(
                            rewardData.playerId, rewardData.platformId, 0, rewardData.rewardType,
                            data[1].validCredit, rewardData.currentAmount, rewardData.currentAmount, null, data[0]);
                    }
                    deferred.resolve(data[0]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Cannot create reward task"});
                }
            },
            error => {
                deferred.reject({name: "DBError", message: "Error creating reward task", error: error});
            }
        );
        return deferred.promise;
    },

    createRewardTaskWithProviderGroup: (rewardData, proposalData) => {
        // Search available reward task group for this reward & this player
        return dbconfig.collection_rewardTaskGroup.findOne({
            platformId: rewardData.platformId,
            playerId: rewardData.playerId,
            providerGroup: rewardData.providerGroup,
            status: {$in: [constRewardTaskStatus.STARTED]}
        }).lean().then(
            providerGroup => {
                if (providerGroup) {
                    let updObj = {
                        proposalId: proposalData.proposalId,
                        lastProposalId: proposalData._id,
                        $inc: {
                            initAmt: rewardData.initAmount,
                            rewardAmt: rewardData.initAmount,
                            currentAmt: rewardData.initAmount,
                            forbidWithdrawIfBalanceAfterUnlock:
                                proposalData && proposalData.data && proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                    ? proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                    : 0
                        }
                    };

                    if (rewardData.useConsumption) {
                        updObj.$inc.forbidXIMAAmt = rewardData.requiredUnlockAmount;
                        if (providerGroup.hasOwnProperty('remainingForbidXIMAAmt')){
                            updObj.$inc.remainingForbidXIMAAmt = rewardData.requiredUnlockAmount;
                        }
                    } else {
                        updObj.$inc.targetConsumption = rewardData.requiredUnlockAmount;
                    }

                    // There are on-going reward task for this provider group
                    return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                        _id: providerGroup._id
                    }, updObj, {new: true});
                }
                else {
                    let saveObj = {
                        initAmt: rewardData.initAmount,
                        platformId: rewardData.platformId,
                        playerId: rewardData.playerId,
                        lastProposalId: proposalData._id,
                        providerGroup: rewardData.providerGroup,
                        status: constRewardTaskStatus.STARTED,
                        rewardAmt: rewardData.initAmount,
                        currentAmt: rewardData.initAmount,
                        forbidWithdrawIfBalanceAfterUnlock:
                            proposalData && proposalData.data && proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                ? proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                : 0
                    };

                    if (rewardData.useConsumption && rewardData.requiredUnlockAmount) {
                        saveObj.forbidXIMAAmt = rewardData.requiredUnlockAmount;
                        // new field for XIMA purpose
                        saveObj.remainingForbidXIMAAmt = rewardData.requiredUnlockAmount;
                    } else {
                        saveObj.targetConsumption = rewardData.requiredUnlockAmount;
                    }

                    // create new reward group
                    return new dbconfig.collection_rewardTaskGroup(saveObj).save();
                }
            }
        ).then(
            providerGroup2 => {
                if (providerGroup2) {
                    let eventName = proposalData && proposalData.data && proposalData.data.eventName ? proposalData.data.eventName : "";
                    if (!eventName && proposalData && proposalData.data && proposalData.data.rewardType) {
                        eventName = proposalData.data.rewardType;
                    }

                    // Create credit change log for this reward
                    dbLogger.createCreditChangeLogWithLockedCredit(rewardData.playerId, rewardData.platformId, 0, eventName, 0, rewardData.initAmount, rewardData.initAmount, null, proposalData.data);

                    // Successfully created reward task
                    return providerGroup2;
                }
                else {
                    // Failed create reward task group or increase amount
                    return Q.reject({name: "DBError", message: "Error creating reward task", error: error})
                }
            }
        )
    },

    insertConsumptionValueIntoFreeAmountProviderGroup: (rewardData, proposalData, rewardType) => {
        let consumptionAmt = 0;

        // Search available reward task group for this reward & this player
        return dbconfig.collection_rewardTaskGroup.findOne({
            platformId: rewardData.platformId,
            playerId: rewardData.playerId,
            providerGroup: null,
            status: {$in: [constRewardTaskStatus.STARTED]}
        }).lean().then(
            providerGroup => {
                if(isNaN(rewardData.applyAmount)) {
                    rewardData.applyAmount = 0;
                }

                if (providerGroup) {
                    let updObj = {
                        proposalId: proposalData.proposalId,
                        lastProposalId: proposalData._id,
                        $inc: {
                            initAmt: proposalData.data.rewardAmount,
                            currentAmt: proposalData.data.rewardAmount,
                            forbidWithdrawIfBalanceAfterUnlock:
                                proposalData && proposalData.data && proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                    ? proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                    : 0
                        }
                    };

                    // Added special handling for promo code type 1 - not deducting apply amount
                    if (proposalData.data.isDynamicRewardAmount === false
                        || (proposalData.data.promoCodeTypeValue && proposalData.data.promoCodeTypeValue == 1)) {
                        consumptionAmt = rewardData.requiredUnlockAmount;
                    } else {
                        let amount = rewardData.actualAmount ? rewardData.actualAmount : rewardData.applyAmount;
                        consumptionAmt = rewardData.requiredUnlockAmount - amount;
                    }

                    // Make sure required consumption is not negative
                    if (consumptionAmt < 0) { consumptionAmt = 0; }

                    if (rewardData.useConsumption) {
                        if(rewardType == constRewardType.PLAYER_TOP_UP_RETURN_GROUP && proposalData.data.isDynamicRewardAmount) {
                            updObj.$inc.forbidXIMAAmt = rewardData.requiredUnlockAmount;
                            updObj.$inc.targetConsumption = -rewardData.applyAmount;
                            if (providerGroup.hasOwnProperty('remainingForbidXIMAAmt')){
                                updObj.$inc.remainingForbidXIMAAmt = rewardData.requiredUnlockAmount;
                            }
                        } else {
                            updObj.$inc.forbidXIMAAmt = consumptionAmt;
                            if (providerGroup.hasOwnProperty('remainingForbidXIMAAmt')){
                                updObj.$inc.remainingForbidXIMAAmt = consumptionAmt;
                            }
                        }
                    } else {
                        updObj.$inc.targetConsumption = consumptionAmt;
                    }
                    // There are on-going reward task for this provider group
                    return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                        _id: providerGroup._id
                    }, updObj);
                }
                else {
                    let saveObj = {
                        platformId: rewardData.platformId,
                        playerId: rewardData.playerId,
                        providerGroup: null,
                        lastProposalId: proposalData._id,
                        status: constRewardTaskStatus.STARTED,
                        initAmt: rewardData.initAmount,
                        rewardAmt: 0,
                        currentAmt: rewardData.initAmount,
                        forbidWithdrawIfBalanceAfterUnlock:
                            proposalData && proposalData.data && proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                ? proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                : 0
                    };
                    if (rewardData.useConsumption && rewardData.requiredUnlockAmount) {
                        saveObj.forbidXIMAAmt = rewardData.requiredUnlockAmount;
                        saveObj.remainingForbidXIMAAmt = rewardData.requiredUnlockAmount;
                    } else {
                        saveObj.targetConsumption = rewardData.requiredUnlockAmount;
                    }

                    if (!rewardData.requiredUnlockAmount) {
                        return saveObj;
                    }

                    // create new reward group
                    return new dbconfig.collection_rewardTaskGroup(saveObj).save();
                }
            }
        ).then(
            providerGroup2 => {
                if (providerGroup2) {
                    // Successfully created reward task
                    return providerGroup2;
                }
                else {
                    // Failed create reward task group or increase amount
                    return Q.reject({name: "DBError", message: "Error creating reward task", error: error})
                }
            }
        ).then(
            (returnData) => {
                console.log("check CR useLockedCredit", rewardData)
                if (rewardData && !rewardData.useLockedCredit) {
                    let amountToUpdate = 0;
                    if (proposalData && proposalData.data) {
                        // if (proposalData.data.isDynamicRewardAmount === false) {
                        //     amountToUpdate = proposalData.data.rewardAmount;
                        // } else if (proposalData.data.rewardAmount && proposalData.data.applyAmount) {
                        //     amountToUpdate = proposalData.data.rewardAmount; //+ proposalData.data.applyAmount;
                        // } else if (proposalData.data.rewardAmount) {
                        //     amountToUpdate = proposalData.data.rewardAmount;
                        // }
                        amountToUpdate = rewardData.initAmount;

                        return dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).lean().then(
                            playerData => {
                                return dbPlayerInfo.changePlayerCredit(proposalData.data.playerObjId, playerData.platform, amountToUpdate, rewardType, proposalData);
                            }
                        ).then(
                            () => {
                                return returnData;
                            }
                        );
                    }
                }
            }
        )
    },

    deductTargetConsumptionFromFreeAmountProviderGroup: (rewardData, proposalData) => {
        // Search available reward task group for this reward & this player
        console.log('LK checking deduct free amount data--', rewardData.playerId);
        return dbconfig.collection_rewardTaskGroup.findOne({
            platformId: rewardData.platformId,
            playerId: rewardData.playerId,
            providerGroup: null,
            status: {$in: [constRewardTaskStatus.STARTED]}
        }).then(
            freeProviderGroup => {
                if (freeProviderGroup) {
                    let updObj = {
                        $inc: {
                            currentAmt: -rewardData.applyAmount,
                            initAmt: -rewardData.applyAmount
                        }
                    };

                    if (rewardData.useConsumption) {
                        updObj.$inc.forbidXIMAAmt = -rewardData.applyAmount;
                    } else {
                        updObj.$inc.targetConsumption = -rewardData.applyAmount;
                    }
                    console.log('LK checking RTG detail--', freeProviderGroup.targetConsumption + "/" + freeProviderGroup.curConsumption);
                    // if(freeProviderGroup.targetConsumption && freeProviderGroup.targetConsumption - rewardData.applyAmount <= 0){
                    if(freeProviderGroup.targetConsumption && freeProviderGroup.curConsumption >= (freeProviderGroup.targetConsumption + freeProviderGroup.forbidXIMAAmt - rewardData.applyAmount)){
                        updObj.status = constRewardTaskStatus.ACHIEVED;
                    }

                    console.log('LK checking RTG update obj--', updObj);
                    // There are on-going reward task for this provider group
                    return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                        _id: freeProviderGroup._id
                    }, updObj);
                }
            }
        ).then(
            freeProviderGroup2 => {
                if (freeProviderGroup2) {
                    // Successfully created reward task
                    return freeProviderGroup2;
                }
            }
        )
    },

    /**
     * Get one reward task
     * @param {String} query - The query String.
     */
    getRewardTask: function (query) {
        return dbconfig.collection_rewardTask
            .findOne(query)
            .exec();
    },
    getPlayerRewardTask: function (query, index, limit, sortCol, useProviderGroup) {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'createTime': -1};
        let result = null;
        let providerGroups = [];
        var queryObj = {
            playerId: ObjectId(query.playerId),
            createTime: {
                $gte: new Date(query.from),
                $lt: new Date(query.to)
            }
        }
        if (query.topUpProposalId) {
            queryObj = {playerId: ObjectId(query.playerId)};
            return dbRewardTask.getRewardProposalId(query, index, limit, sortCol, useProviderGroup, providerGroups, queryObj);
        } else {
            return dbRewardTask.getRewardTaskList( query, index, limit, sortCol, useProviderGroup, providerGroups, queryObj);
        }
    },
    getPlayerRewardTaskUnlockedRecord: function (query) {
        let index = query.index || 0;
        let limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, query.limit);
        let sortCol = query.sortCol || {'unlockTime': -1};
        let result = null;
        let providerGroups = [];
        var queryObj = {
            playerId: ObjectId(query.playerId),
            unlockTime: {
                $gte: new Date(query.startTime),
                $lt: new Date(query.endTime)
            }
        }

        let a = dbconfig.collection_rewardTaskGroupUnlockedRecord.find(queryObj).count();
        let b = dbconfig.collection_rewardTaskGroupUnlockedRecord.find(queryObj).sort(sortCol).skip(index).limit(limit).lean();
        return Promise.all([a,b]).then(result => {
            return result;
        })

    },
    getRewardTaskGroupProposal: function (query) {
        let rewardTaskGroup = null;
        let sortCol = query.sortCol || {"createTime": 1};
        let rewardTaskProposalQuery = {};

        let queryObj = {
            playerId: ObjectId(query.playerId),
            providerGroup: query._id,
            status: 'Started',
            createTime: {
                $gte: new Date(query.from),
                $lt: new Date(query.to)
            }
        };

        return dbconfig.collection_rewardTaskGroup.find(queryObj)
            .populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup}).lean()
            .then(data => {
                rewardTaskGroup = data[0];
                console.log("checking rewardTaskGroup", rewardTaskGroup)
                let createTime = data[0].createTime ? data[0].createTime :null;
                if (!createTime) {
                    createTime = new Date(query.from);
                }

                let lastSecond = new Date(createTime);
                lastSecond.setSeconds(lastSecond.getSeconds()-1);
                rewardTaskProposalQuery = {
                    'data.playerObjId': {$in: [ObjectId(query.playerId), String(query.playerId)]},
                    settleTime: {
                        $gte: new Date(lastSecond),
                        $lt: new Date(query.to)
                    },
                    mainType: {$in: ["TopUp","Reward"]},
                    status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                };

                if (!query._id) {
                    rewardTaskProposalQuery.$or = [
                        {'data.providerGroup': {$exists: true, $eq: null}},
                        {'data.providerGroup': {$exists: true, $size: 0}},
                        {'data.providerGroup': {$exists: false}},
                        {'data.providerGroup': ""},
                    ]
                } else {
                    rewardTaskProposalQuery['data.providerGroup'] = {$in: [ObjectId(query._id), String(query._id)]};
                }
                console.log("checking rewardTaskProposalQuery", rewardTaskProposalQuery)
                return dbconfig.collection_proposal.find(rewardTaskProposalQuery).populate({
                    path: "type",
                    model: dbconfig.collection_proposalType
                }).lean().sort(sortCol);
            }).then(udata => {
                console.log("checking udata.length", udata.length || 0)
                udata.map(item => {
                    if(!item.data.topUpProposal) {
                        item.data.topUpProposal = item.data ? item.data.topUpProposalId : '';
                    }

                    if (item.type.name) {
                        item.data.rewardType = item.type.name;
                    }
                });

                let prom = dbRewardTask.getTopUpProposal(udata);
                let propCount = dbconfig.collection_proposal.aggregate({
                        $match: rewardTaskProposalQuery
                    },
                    {
                        $group: {
                            '_id': null,
                            bonusAmountSum: {$sum: "$data.rewardAmount"},
                            requiredBonusAmountSum: {$sum: "$data.spendingAmount"},
                            currentAmountSum: {$sum: "$data.rewardAmount"},
                        }
                    });
                return Q.all([prom, propCount]);
            }).then(result => {
                result[0].map(item => {
                    if (rewardTaskGroup) {
                        item.data['createTime$'] = item.createTime;
                        // item.data.useConsumption = rewardTaskGroup.useConsumption;
                        if(!item.data.topUpProposal) {
                            item.data.topUpProposal = item.data ? item.data.topUpProposalId : '';
                        }
                        item.data.curConsumption = rewardTaskGroup.curConsumption;
                        if (rewardTaskGroup.providerGroup) {
                            item.data.provider$ = rewardTaskGroup.providerGroup ? rewardTaskGroup.providerGroup.name :"" ;
                        }
                        if(!query._id){

                            item.data.topUpProposalId = item.data ? item.data.proposalId : '';
                            item.data.bonusAmount = 0;
                            item.data.currentAmount = item.data.currentAmt;
                            item.data.requiredBonusAmount = 0;
                            item.data['provider$'] = 'LOCAL_CREDIT'
                        }
                        item.data.topUpAmount= 0;
                        if (item.data) {
                            if(typeof item.data.actualAmountReceived != "undefined"){
                                item.data.topUpAmount = item.data.actualAmountReceived;
                            }else{
                                item.data.topUpAmount = item.data.topUpRecordId && item.data.applyAmount ? item.data.applyAmount:item.data.amount? item.data.amount : 0;
                            }
                        }
                        if(rewardTaskGroup.providerGroup === ''){
                            item.data.providerGroup = null;
                        }
                        return item;
                    }
                });

                return {
                    size: result[0] ? result[0].length : 0,
                    data: result[0] ? result[0] : [],
                    summary: result[1][0] ? result[1][0] : {}
                };
            });
    },
    getRewardTasksRecord: function (rewards, rewardTaskGroup, proposalData) {
        if (!rewards && !rewardTaskGroup) {
            return Q.reject("Record is not found");
        }

        let totalAmount = rewardTaskGroup.currentAmt - rewardTaskGroup.initAmt; // for winlost count
        let totalConsumption = rewardTaskGroup.curConsumption;

        let usedTopUp = [];
        let proposalProm = [];

        // remove the latest top up/ reward record for the case of platform.autoUnlockWhenInitAmtLessThanLostThreshold
        if (proposalData && proposalData.proposalId){
            rewards = rewards.filter(item => proposalData.proposalId != item.proposalId);
        }

        rewards.forEach(item => {
            item.topUpProposal = item.data.topUpProposalId ? item.data.topUpProposalId : item.data.topUpProposal;

            let requiredUnlockedConsumption = item.data.actualAmountReceived ? item.data.actualAmountReceived :  item.data.amount ?  item.data.amount : item.data.spendingAmount || item.data.requiredUnlockAmount; // amount from topUp Type; spendingAmount from reward Type
            let applyAmount = item.data.applyAmount || item.data.amount;
            let bonusAmount = item.data.rewardAmount;
            let requiredUnlockedAmount = bonusAmount ? bonusAmount : (applyAmount || 0);

            if (item.data.isDynamicRewardAmount || (item.data.promoCodeTypeValue && item.data.promoCodeTypeValue == 3) || item.data.limitedOfferObjId) {
                requiredUnlockedAmount = (applyAmount || 0) + (bonusAmount || 0);
                usedTopUp.push(item.topUpProposal)
            }

            // check if consumption reached unlocked limit
            if (totalConsumption >= requiredUnlockedConsumption){
                item.data.consumptionProgress = requiredUnlockedConsumption;
                //totalConsumption -= requiredUnlockedConsumption;
            }
            else{
                item.data.consumptionProgress = totalConsumption;
                totalConsumption = 0;
            }

            // check if amount reached unlocked limit
            if(totalAmount <= -requiredUnlockedAmount){
                item.data.bonusProgress = -requiredUnlockedAmount;
                totalAmount -= -requiredUnlockedAmount;
            }
            else{
                item.data.bonusProgress = totalAmount;
                totalAmount = 0;
            }

            proposalProm.push(dbconfig.collection_proposal.findOneAndUpdate({_id: ObjectId(item._id), createTime: item.createTime}, {'data.bonusProgress': item.data.bonusProgress, 'data.consumptionProgress': item.data.consumptionProgress}, {new: true}).exec());
        });

        return Promise.all(proposalProm).then( (a) => {
            if (usedTopUp.length > 0) {
                rewards = rewards.filter(rewardItem => {

                    if (usedTopUp.indexOf(rewardItem.proposalId) < 0) {
                        return rewardItem;
                    }

                });
            }

            return rewards;
        })

    },
    updateUnlockedRewardTasksRecord: function (rewards, status, playerId, platformId) {

        let proms = [];
        if (rewards && rewards.length > 0){
            rewards.forEach( rewardTask => {

                let applyAmount = rewardTask.data.applyAmount || rewardTask.data.amount;
                let bonusAmount = rewardTask.data.rewardAmount;

                let targetAmount = bonusAmount || 0;
                if (rewardTask.data.isDynamicRewardAmount || (rewardTask.data.promoCodeTypeValue && rewardTask.data.promoCodeTypeValue == 3) || rewardTask.data.limitedOfferObjId) {
                    targetAmount = (applyAmount || 0) + (bonusAmount || 0);
                }

                let sendData = {
                    platformId: platformId,
                    playerId: playerId,
                    unlockTime: new Date(),
                    creator: {
                        type: "System",
                        name: "System",
                    },
                    rewardTask: {
                        type: rewardTask.type.name,
                        id: rewardTask.type._id,
                    },
                    currentConsumption: rewardTask.data.consumptionProgress,
                    maxConsumption: rewardTask.data.amount ? rewardTask.data.amount : rewardTask.data.spendingAmount || rewardTask.data.requiredUnlockAmount,
                    currentAmount: rewardTask.data.bonusProgress,
                    targetAmount: targetAmount,
                    topupAmount: rewardTask.data.topUpAmount,
                    proposalId: rewardTask._id,
                    proposalNumber: rewardTask.proposalId || rewardTask.data.proposalId,
                    topupProposalNumber: rewardTask.data.topUpProposalId ? rewardTask.data.topUpProposalId : rewardTask.data.topUpProposal,
                    bonusAmount: bonusAmount || 0,
                    applyAmount: applyAmount || 0,
                    targetProviderGroup: rewardTask.data.provider$,
                    status: status,
                    useConsumption: rewardTask.data.useConsumption,
                    inProvider: rewardTask.inProvider,
                    isUnlock: true

                };
                proms.push(dbRewardTaskGroup.createRewardTaskGroupUnlockedRecord(sendData));
            })
        }

        return Promise.all(proms);

    },
    getRewardTaskGroupProposalById: function (query) {

        return dbconfig.collection_rewardTaskGroup.find(
            {
                status: constRewardTaskStatus.STARTED,
                playerId: ObjectId(query.playerObjId),
                platformId: ObjectId(query.platformId),

            }
        ).populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup}).lean().then(
            rewardTaskGroups => {
                return dbRewardTask.unlockPlatformProviderGroup(rewardTaskGroups, ObjectId(query.playerObjId));
            }
        );
    },
    unlockPlatformProviderGroup: (rewardTaskGroup, playerObjId) => {
        let promsArr = [];
        let promTaskGroup = [];
        rewardTaskGroup.forEach(reward => {
            promsArr.push(dbRewardTask.unlockRewardTaskInRewardTaskGroup(reward, playerObjId).catch(errorUtils.reportError));
        });

        return Promise.all(promsArr).then( promArr => {
            return [promArr, rewardTaskGroup];
        })
    },

    unlockRewardTaskInRewardTaskGroup: function (reward, playerObjId) {
        let sortCol = {"createTime": 1};
        let rewardTaskProposalQuery = {};


            let createTime = reward.createTime ? reward.createTime :null;
            if (!createTime) {
                return Q.reject({
                    name: "DataError",
                    message: "createTime is not available"
                });
            }

            let lastSecond = new Date(createTime);
            lastSecond.setSeconds(lastSecond.getSeconds()-1);


            rewardTaskProposalQuery = {
                'data.playerObjId': {$in: [ObjectId(playerObjId), String(playerObjId)]},
                settleTime: {
                    $gte: new Date(lastSecond),
                    $lt: new Date()
                },
                mainType: {$in: ["TopUp","Reward"]},
                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
            };

            if (!reward.providerGroup) {
                rewardTaskProposalQuery.$or = [
                    {'data.providerGroup': {$exists: true, $eq: null}},
                    {'data.providerGroup': {$exists: true, $size: 0}},
                    {'data.providerGroup': {$exists: false}},
                    {'data.providerGroup': ""},
                ]
            }
            else if (reward.providerGroup._id) {
                rewardTaskProposalQuery['data.providerGroup'] = {$in: [ObjectId(reward.providerGroup._id), String(reward.providerGroup._id)]};
            }
            else{
                rewardTaskProposalQuery['data.providerGroup'] = {$in: [ObjectId(reward.providerGroup), String(reward.providerGroup)]};
            }

            return dbconfig.collection_proposal.find(rewardTaskProposalQuery).populate({
                path: "type",
                model: dbconfig.collection_proposalType
            }).lean().sort(sortCol).then(udata => {
                if (udata) {
                    udata.map(item => {
                        if (!item.data.topUpProposal) {
                            item.data.topUpProposal = item.data ? item.data.topUpProposalId : '';
                        }

                        if (item.type.name) {
                            item.data.rewardType = item.type.name;
                        }
                    });

                    return dbRewardTask.getTopUpProposal(udata);
                }
                else{
                    return Promise.reject({
                        name: "DBError",
                        message: "could not get the proposal data"
                    })
                }
            }).then(result => {

                if (result && result.length){
                    result.map(item => {
                        if (reward) {
                            item.data['createTime$'] = item.createTime;

                            if(!item.data.topUpProposal) {
                                item.data.topUpProposal = item.data ? item.data.topUpProposalId : '';
                            }
                            item.data.curConsumption = reward.curConsumption;
                            if (reward.providerGroup) {
                                item.data.provider$ = reward.providerGroup ? reward.providerGroup.name :"" ;
                            }
                            else{

                                item.data.topUpProposalId = item.data ? item.data.proposalId : '';
                                item.data.bonusAmount = 0;
                                item.data.currentAmount = item.data.currentAmt;
                                item.data.requiredBonusAmount = 0;
                                item.data['provider$'] = 'LOCAL_CREDIT'
                            }
                            item.data.topUpAmount= 0;
                            if (item.data) {
                                item.data.topUpAmount = item.data.topUpRecordId && item.data.applyAmount ? item.data.applyAmount:item.data.amount? item.data.amount : 0;
                            }
                            if(reward.providerGroup === ''){
                                item.data.providerGroup = null;
                            }
                            return item;
                        }
                    });

                }
                return result ? result : []

            });
    },

    getRewardProposalId: function(query, index, limit, sortCol, useProviderGroup, providerGroups, queryObj){
        let topUpProposal = null;
        let rewardTaskGroupSize;
        let rewardTaskGroupData;
        let rewardTaskData;
        let rewardTask = null;
        let proposal = null;
        let creator = null;
        let isTopUpInProposal = false;
        let topUpProposalId = null;
        // let rewardTaskSummary;

        return dbconfig.collection_proposal.findOne({'proposalId':query.topUpProposalId})
            .then(data=>{
                    topUpProposal = data;
                    if(data.data.topUpProposalId){
                        isTopUpInProposal = true;
                        topUpProposalId = data.proposalId;
                        topUpProposal.data.amount = data.data.topUpAmount;
                    }
                    return data;
            })
            .then(data=>{

                return dbconfig.collection_proposal.findOne({'data.topUpProposal':query.topUpProposalId})
                    .populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup})
                    .then(data=>{
                        if(data){
                            proposal = data.data;
                            if(isTopUpInProposal){
                                queryObj.proposalId = topUpProposalId;
                            }else{
                                queryObj.proposalId = data.proposalId;
                            }
                            creator = data.creator;
                            return dbconfig.collection_rewardTask.find(queryObj)
                        }
                    })
            })
            .then(rewardTask=>{
                rewardTaskData = rewardTask[0] ?  rewardTask[0] :[];
                console.log(rewardTaskData);
                return {
                    size: rewardTaskData.length,
                    data: [rewardTaskData],
                    rewardTaskGroupSize: 1,
                    rewardTaskGroupData: [],
                    summary: {},
                    topUpAmountSum:topUpProposal.data ?topUpProposal.data.amount:0,
                    topUpProposal:topUpProposal.proposalId,
                    proposal:proposal,
                    creator:creator
                }
            })
    },

    getRewardTaskList: function(query, index, limit, sortCol, useProviderGroup, providerGroups, queryObj){
        return dbGameProvider.getPlatformProviderGroup(query.platformId).then(
            data => {
                providerGroups = data;
            }
        ).then(
            data => {
                if (query.unlockStatus) {
                    if (query.unlockStatus == 'Started') {
                        queryObj.status = 'Started'
                    } else if (query.unlockStatus == 'Done') {
                        queryObj.status = {$ne: 'Started'}
                    } else {
                        // query all result;
                    }
                }
                if (query.topUpProposalId) {
                    queryObj.topUpProposal = query.topUpProposalId;
                }
                if (query.rewardProposalId) {
                    queryObj.proposalId = query.rewardProposalId;
                }

                if (query.selectedProviderGroupID) {
                    let selectedProviderGroup = providerGroups.filter(item=>{
                        return item._id.toString() == query.selectedProviderGroupID.toString()
                    });

                    let providers = selectedProviderGroup[0] ?  selectedProviderGroup[0].providers : null;
                    if(providers){
                        queryObj.targetProviders = {$in: providers}
                    }


                    if(query.selectedProviderGroupID == 'free'){
                        queryObj.providerGroup = null;
                    }

                }

                let rewardTaskQuery = JSON.parse(JSON.stringify(queryObj));
                delete rewardTaskQuery.targetProviders;
                if (query.selectedProviderGroupID && query.selectedProviderGroupID.length === 24) {
                    rewardTaskQuery.providerGroup = query.selectedProviderGroupID
                }

                let a, b, c, d, e, f, g;
                let size;
                let rewardTaskGroupSize;
                let rewardTaskGroupData;
                let rewardTaskSummary;
                let topUpAmountSum;
                let displayRewardTaskGroup;
                a = dbconfig.collection_rewardTask.find(rewardTaskQuery).count();
                b = dbconfig.collection_rewardTask.find(rewardTaskQuery).sort(sortCol).skip(index).limit(limit)
                    .populate({path: "targetProviders", model: dbconfig.collection_gameProvider}).lean();

                if (useProviderGroup) {
                    let rewardTaskGroupData;


                    let rewardGroupQuery = JSON.parse(JSON.stringify(rewardTaskQuery));
                    if(query.selectedProviderGroupID == 'free'){
                        delete rewardGroupQuery.providerGroup;
                    }
                    c = dbconfig.collection_rewardTaskGroup.find(rewardGroupQuery).count();

                    d = dbconfig.collection_rewardTaskGroup.find(rewardGroupQuery).sort(sortCol).skip(index).limit(limit)
                        .populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup})
                        .then(
                            res => {
                                rewardTaskGroupData = res;
                                if (res && res.length > 0) {
                                    let validCreditPromArr = [];

                                    rewardTaskGroupData.map(grp => {
                                        if (!grp.providerGroup) {
                                            validCreditPromArr.push(dbPlayerUtil.getPlayerValidCredit(query.playerId).then(validCredit => grp.currentAmt = validCredit));
                                        }
                                    });

                                    return Promise.all(validCreditPromArr);
                                }
                            }
                        ).then(() => rewardTaskGroupData);
                }
                // get the sum amount to display the below of table
                e = dbconfig.collection_rewardTask.aggregate({
                        $match: queryObj
                    },
                    {
                        $group: {
                            '_id': null,
                            bonusAmountSum: {$sum: "$bonusAmount"},
                            requiredBonusAmountSum: {$sum: "$requiredBonusAmount"},
                            currentAmountSum: {$sum: "$currentAmount"},
                        }
                    });
                f = dbRewardTask.getTopUpAmountSum(queryObj, sortCol);

                // if status use $ne = status , then the rewardGroup will disappear
                let displayRewardGroupQuery = JSON.parse(JSON.stringify(queryObj));
                delete displayRewardGroupQuery.status;
                if(query.selectedProviderGroupID == 'free'){
                    delete displayRewardGroupQuery.providerGroup;
                }
                g = dbconfig.collection_rewardTaskGroup.find(displayRewardGroupQuery).populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup})


                return Q.all([a, b, c, d, e, f, g]).then(
                    data => {
                        size = data[0];

                        rewardTaskGroupSize = data[2];
                        rewardTaskGroupData = data[3];
                        rewardTaskSummary = data[4][0] ? data[4][0] : [];
                        topUpAmountSum = data[5] ? data[5].topUpAmountSum : 0;
                        displayRewardTaskGroup = data[6] ? data[6] : [];
                        let prom = dbRewardTask.getProposalInfo(data[1]);
                        return Q.all([prom])
                            .then(proposalData => {

                                let resultData = [];
                                if(query.selectedProviderGroupID == 'free' || useProviderGroup){

                                    resultData = rewardTaskGroupData;
                                    resultData.map(item=>{
                                        item.data = {};
                                        item.data.currentAmount = item.currentAmt;
                                        item.data.bonusAmount = item.rewardAmt;
                                        item.data.requiredBonusAmount = item.curConsumption;
                                        item.data.requiredUnlockAmount = item.targetConsumption;
                                        return item;
                                    })
                                }else{
                                    resultData = proposalData[0] || [];
                                }

                                if(!query.showProposal && useProviderGroup){
                                    resultData = [];
                                }

                                return {
                                    size: size,
                                    data: resultData,
                                    rewardTaskGroupSize: rewardTaskGroupSize,
                                    rewardTaskGroupData: rewardTaskGroupData,
                                    displayRewardTaskGroup : displayRewardTaskGroup,
                                    summary: rewardTaskSummary,
                                    topUpAmountSum:topUpAmountSum
                                }

                            })
                    }
                )
            }
        )

    },
    getTopUpAmountSum: function(queryObj,sortCol){
        let prom = [];
        let topUpAmountSum = 0;
        return dbconfig.collection_rewardTask.find(queryObj) //.sort(sortCol)
            .then(data=> {
                let proposalResult = dbRewardTask.getProposalInfo(data);
                return Q.all([proposalResult])
            })
            .then(pData=>{
                pData[0].map(item=>{
                        if(item.topUpAmount){
                            topUpAmountSum += item.topUpAmount;
                        }
                    })
                return {topUpAmountSum}
            })

    },
    getTopUpProposal:function(data){
        let prom = [];
        let topUpRecordObjIdArr = [];
        let topUpRecordIdArr = [];
        let rewardProposalProm = Promise.resolve();
        let excludedTopUpProposalList = [];
        let allProposalList;

        data.map(item => {
            // this is for promoCode
            let proposalId = item.data.topUpProposal || item.data.topUpProposalId;
            // this is for reward proposal
            let topUpRecordId = item.data.topUpRecordId ? item.data.topUpRecordId : null;
            let proposal = Promise.resolve(item);

            // exclude top up proposal from the checking
            if (proposalId || topUpRecordId){
                let sendQuery = {};
                if (topUpRecordId) {
                    sendQuery = {_id: topUpRecordId};
                } else {
                    sendQuery = {proposalId: proposalId};
                }

                proposal = dbconfig.collection_proposal.findOne(sendQuery).then(
                    pdata => {
                        if (pdata) {
                            if (pdata.creator.name) {
                                item.creator = pdata.creator;
                            }
                            if (pdata.data.amount) {
                                item.data.topUpAmount = pdata.data.amount;
                            }
                        }
                        return item;
                    },
                    error => {
                        console.log(error);
                    }
                )
            }
            else{
                // gather all the top up record for further checking if has been applied in type C reward
                if (item && item.proposalId && item._id){
                    topUpRecordIdArr.push(item.proposalId)
                    topUpRecordObjIdArr.push(ObjectId(item._id))
                }
            }

            prom.push(proposal);
        })

        return Promise.all(prom).then(
            proposalList => {
                allProposalList = proposalList;

                if (topUpRecordIdArr && topUpRecordIdArr.length && topUpRecordObjIdArr && topUpRecordObjIdArr.length){
                    let query = {
                       $or: [{'data.topUpRecordId': {$in: topUpRecordObjIdArr}}, {'data.topUpProposal': {$in: topUpRecordIdArr}}, {'data.topUpProposalId': {$in: topUpRecordIdArr}}]
                    }
                    // to get the reward proposal that consumed the top up proposal
                    rewardProposalProm = dbconfig.collection_proposal.find(query).lean();
                }
                return rewardProposalProm
            }
        ).then(
            rewardProposalList => {
                if (rewardProposalList && rewardProposalList.length) {
                    rewardProposalList.forEach(
                        rewardProposal => {
                            if (rewardProposal && (rewardProposal.data.topUpProposalId || rewardProposal.data.topUpProposal) && rewardProposal.data.isDynamicRewardAmount || (rewardProposal.data.promoCodeTypeValue && rewardProposal.data.promoCodeTypeValue == 3) || rewardProposal.data.limitedOfferObjId) {
                                let proposalId = rewardProposal.data.topUpProposalId || rewardProposal.data.topUpProposal;
                                if (proposalId){
                                    excludedTopUpProposalList.push(proposalId)
                                }
                            }
                        }
                    )

                    if (excludedTopUpProposalList && excludedTopUpProposalList.length && allProposalList && allProposalList.length) {
                        // get rid of unnecessary topup proposal
                        allProposalList = allProposalList.filter(item => {
                            for (let i = 0; i < excludedTopUpProposalList.length; i++) {
                                if (excludedTopUpProposalList.indexOf(item.proposalId) < 0) {
                                    return item;
                                }
                            }
                        });
                    }

                }

                return allProposalList
            }
        )
    },
    getProposalInfo: function (data) {
        let prom = [];
        let topUpAmountSum = 0;
        let topUpAmount = 0;
        let count = 0;
        data.map(item => {
            let proposalId = item.proposalId;
            let topUpProposal = null;
            let proposal = dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
                pdata => {
                    if (!pdata) {
                        return {};
                    }
                    if (pdata.creator && pdata.creator.name) {
                        item.creator = pdata.creator;
                    }
                    if (pdata.data && pdata.data.topUpProposal) {
                        topUpProposal = pdata.data.topUpProposal;
                    }
                    if (pdata.data && pdata.data.topUpAmount) {
                        topUpAmount = pdata.data.topUpAmount;
                    }
                    return item;
                },
                error => {
                    console.log(error);
                }
            ).then(
                data => {

                    if (topUpProposal) {
                        return dbconfig.collection_proposal.findOne({proposalId: topUpProposal})
                    } else {
                        return item;
                    }
                }
            )
                .then(
                    topup => {
                        // calculate the sum of topUp
                        if (topup) {
                            if (topup.proposalId) {
                                item.topUpProposal = topup.proposalId;
                            }
                            if (topup.data) {
                                item.topUpAmount = topup.data.amount;
                                topUpAmountSum += item.topUpAmount;
                            } else {
                                item.topUpAmount = topUpAmount ? topUpAmount : '';
                            }

                        }
                        return item;
                    })
            prom.push(proposal);
        });
        return Promise.all(prom)
    },

    /**
     * TODO: (DEPRECATING) To change to getPlayerAllRewardTask after implement multiple player reward tasks
     * Get player's current reward task
     * @param {String} is player Object Id
     */
    getPlayerCurRewardTask: function (playerId) {
        return dbconfig.collection_rewardTask.findOne({
            playerId: playerId,
            status: constRewardTaskStatus.STARTED
        }).populate({
            path: "platformId",
            model: dbconfig.collection_platform
        }).exec();
    },

    /**
     * Get player's all available reward task
     * @param {String} playerId player Object Id
     */
    getPlayerAllRewardTask: function (playerId) {
        return dbconfig.collection_rewardTask.find({
            playerId: playerId,
            status: constRewardTaskStatus.STARTED
        }).sort({createdTime: 1}).lean().exec();
    },

    /**
     * Get player's current reward task
     * @param {JSON} is player Object Id
     */
    getPlayerCurRewardTaskByPlayerId: function (query) {
        var deferred = Q.defer();

        dbconfig.collection_players.findOne(query).then(
            function (data) {
                if (data) {
                    var playerObjId = data._id;
                    return dbconfig.collection_rewardTask.findOne(({
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    })).populate({
                        path: "targetProviders",
                        model: dbconfig.collection_gameProvider
                    }).populate({
                        path: "eventId",
                        model: dbconfig.collection_rewardEvent
                    }).lean();
                }
                else {
                    deferred.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "No player found matching query"
                    });
                }

            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting reward task", error: error});
            }
        ).then(function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting reward task", error: error});
            });
        return deferred.promise;
    },


    /**
     * Created: 20170612
     * Purpose: Get player reward tasks by player object id
     * @param query
     */
    getPlayerAllRewardTaskDetailByPlayerObjId: (query) => {
        return dbconfig.collection_players.findOne(query).then(
            playerData => {
                if (playerData) {
                    let playerObjId = playerData._id;

                    return dbconfig.collection_rewardTask.find({
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED
                    }).populate({
                        path: "targetProviders",
                        model: dbconfig.collection_gameProvider
                    }).populate({
                        path: "eventId",
                        model: dbconfig.collection_rewardEvent
                    }).lean();
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "No player found matching query"
                    });
                }

            },
            error => Q.reject({name: "DBError", message: "Error in getting reward task", error: error})
        ).then(
            rewardTasks => rewardTasks,
            error => Q.reject({name: "DBError", message: "Error in getting reward task", error: error})
        );
    },

    /**
     * Update reward task
     * @param {String} query - The query String.
     * @param {Json} updateData - The update data.
     */
    updateRewardTask: function (query, updateData) {
        //return dbconfig.collection_rewardTask.findOneAndUpdate(query, updateData).exec();
        return dbUtil.findOneAndUpdateForShard(dbconfig.collection_rewardTask, query, updateData, constShardKeys.collection_rewardTask);
    },

    /**
     * Remove reward tasks by id
     * @param {String} query - The query String.
     */
    removeRewardTasksById: function (ids) {
        return dbconfig.collection_rewardTask.remove({_id: {$in: ids}}).exec();
    },

    /**
     * check and update player's reward task info when player consume credit
     * @param {ObjectId} playerId - The player id.
     * @param {Object} consumptionRecord - consumptionRecord object
     */
    checkPlayerRewardTaskForConsumption: function (consumptionRecord) {
        let deferred = Q.defer();
        let bDirty = false;
        let bTaskAchieved = false;
        let createTime = new Date(consumptionRecord.createTime);

        // Starting from multiple reward, the oldest reward task will be taken to use
        dbconfig.collection_rewardTask.find(
            {
                playerId: consumptionRecord.playerId,
                status: constRewardTaskStatus.STARTED,
                createTime: {$lt: createTime},
                $or: [
                    {$and: [{targetEnable: true}, {$or: [{targetProviders: consumptionRecord.providerId}, {targetProviders: []}]}]},
                    {$and: [{targetEnable: false}, {targetProviders: {$not: {$elemMatch: {$eq: consumptionRecord.providerId}}}}]}
                ],
                // $
                // $or: [{targetGames: consumptionRecord.gameId}, {targetGames: []}],
                isUnlock: false
            }
        ).sort({createTime: 1}).limit(1).lean().then(
            tasks => {
                let taskData = tasks ? tasks[0] : null;
                return taskData ? taskData : false;
            },
            error => {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding consecutive top up reward task.",
                    error: error
                });
            }
        ).then(
            function (taskData) {
                if (taskData) {
                    taskData.unlockedAmount += (taskData.requiredBonusAmount > 0 ? 0 : consumptionRecord.validAmount);
                    taskData.bonusAmount += consumptionRecord.bonusAmount;
                    taskData.unlockedBonusAmount += (taskData.requiredBonusAmount > 0 ? consumptionRecord.bonusAmount : 0);

                    let bAchieved = false;
                    //for first top up reward, even after there is no credit left, still need to check consumption amount later
                    if (taskData.bonusAmount < 1 && taskData.rewardType != constRewardType.FIRST_TOP_UP) {
                        taskData.isUnlock = true;
                        taskData.unlockTime = createTime;
                        taskData.status = constRewardTaskStatus.NO_CREDIT;
                    }
                    //check player registration reward task
                    else if (taskData.unlockedBonusAmount >= taskData.requiredBonusAmount && taskData.requiredBonusAmount > 0) {
                        taskData.isUnlock = true;
                        taskData.status = constRewardTaskStatus.ACHIEVED;
                        taskData.unlockTime = createTime;
                        bAchieved = true;
                    }
                    else if (taskData.unlockedAmount >= taskData.requiredUnlockAmount && taskData.requiredUnlockAmount > 0) {
                        taskData.isUnlock = true;
                        taskData.status = constRewardTaskStatus.ACHIEVED;
                        taskData.unlockTime = createTime;
                        bAchieved = true;
                    }

                    return dbconfig.collection_rewardTask.findOneAndUpdate(
                        {_id: taskData._id, platformId: taskData.platformId},
                        {
                            $inc: {
                                unlockedAmount: (taskData.requiredBonusAmount > 0 ? 0 : consumptionRecord.validAmount),
                                bonusAmount: consumptionRecord.bonusAmount,
                                unlockedBonusAmount: (taskData.requiredBonusAmount > 0 ? consumptionRecord.bonusAmount : 0),
                            },
                            isUnlock: taskData.isUnlock,
                            status: taskData.status,
                            unlockTime: taskData.unlockTime
                        }
                    ).lean().then(
                        newTaskData => {
                            var proms = [];
                            if (!newTaskData.isUnlock && bAchieved) {
                                bTaskAchieved = true;
                                proms.push(Q.resolve(taskData));
                            }
                            else {
                                proms.push(Q.resolve(taskData));
                            }
                            if (newTaskData.useConsumption && (bTaskAchieved || !bAchieved)) {
                                bDirty = true;
                                proms.push(dbconfig.collection_playerConsumptionRecord.findOneAndUpdate(
                                    {_id: consumptionRecord._id, createTime: consumptionRecord.createTime},
                                    {
                                        bDirty: true,
                                        usedType: taskData.rewardType,
                                        $push: {usedEvent: taskData.eventId},
                                        usedTaskId: taskData._id
                                    }
                                ));
                            }
                            return Q.all(proms);
                        }
                    );
                }
                else {
                    return [true];
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error finding consecutive top up reward task.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data[0]) {
                    //if reward task is unlocked and it is ACHIEVED, give the reward task reward to player
                    //if (data[0].isUnlock && data[0].status == constRewardTaskStatus.ACHIEVED) {
                    if (bTaskAchieved) {
                        if (data[0].requiredBonusAmount > 0) {
                            //transfer player credit out if it is player registration reward task
                            return dbconfig.collection_players.findOne({_id: consumptionRecord.playerId}).populate(
                                {path: "lastPlayedProvider", model: dbconfig.collection_gameProvider}
                            ).lean().then(
                                playerObj => {
                                    if (playerObj && playerObj.lastPlayedProvider) {
                                        return dbPlayerInfo.transferPlayerCreditFromProvider(playerObj.playerId, null, playerObj.lastPlayedProvider.providerId, -1, null, null, data[0].requiredBonusAmount);
                                    }
                                    else {
                                        return dbRewardTask.completeRewardTask(data[0]);
                                    }
                                }
                            );
                        }
                        else {
                            return dbRewardTask.completeRewardTask(data[0]);
                        }
                    }
                    else {
                        return bDirty;
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't update reward task and consumption record"});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error updating reward task and consumption record",
                    error: error
                });
            }
        ).then(
            function (data) {
                //check consumption record create time with last reward task
                if (!bDirty) {
                    dbconfig.collection_rewardTask.find(
                        {
                            playerId: consumptionRecord.playerId,
                            status: constRewardTaskStatus.NO_CREDIT,
                            isUnlock: true,
                            createTime: {$lt: createTime},
                            unlockTime: {$gte: createTime}
                        }
                    ).sort({unlockTime: -1}).lean().then(
                        noCreditTask => {
                            if (noCreditTask && noCreditTask[0] && noCreditTask[0].useConsumption) {
                                deferred.resolve(true);
                            }
                            else {
                                deferred.resolve(false);
                            }
                        }
                    );
                }
                else {
                    deferred.resolve(bDirty);
                }

            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error completing reward task", error: error});
            }
        // ).then(() => {
        //     return dbRewardTaskGroup.getFreeAmountRewardTaskGroup(consumptionRecord.platformId, consumptionRecord.playerId, createTime).then(
        //         freeRewardTaskGroup => {
        //             freeRewardTaskGroup.curConsumption += consumptionRecord.validAmount;
        //             freeRewardTaskGroup.currentAmt += consumptionRecord.bonusAmount;
        //
        //             // Check whether player has lost all credit
        //             if (freeRewardTaskGroup.currentAmt < 1) {
        //                 freeRewardTaskGroup.status = constRewardTaskStatus.NO_CREDIT;
        //                 freeRewardTaskGroup.unlockTime = createTime;
        //             }
        //             // Consumption reached
        //             else if (freeRewardTaskGroup.curConsumption >= freeRewardTaskGroup.targetConsumption + freeRewardTaskGroup.forbidXIMAAmt) {
        //                 freeRewardTaskGroup.status = constRewardTaskStatus.ACHIEVED;
        //                 freeRewardTaskGroup.unlockTime = createTime;
        //             }
        //
        //             let updObj = {
        //                 $inc: {
        //                     currentAmt: consumptionRecord.bonusAmount,
        //                     curConsumption: consumptionRecord.validAmount
        //                 },
        //                 status: freeRewardTaskGroup.status,
        //                 unlockTime: freeRewardTaskGroup.unlockTime
        //             };
        //
        //             return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
        //                 {_id: freeRewardTaskGroup._id},
        //                 updObj,
        //                 {new: true}
        //             );
        //         });
        // }).then(
        //     updatedData => {
        //         if (updatedData) {
        //             // Transfer amount to player if reward is achieved
        //             if (updatedData.status == constRewardTaskStatus.ACHIEVED) {
        //                 return dbRewardTask.completeRewardTaskGroup(updatedData);
        //             }
        //         }
        //     },
        //     error => {
        //         return Q.reject({
        //             name: "DBError",
        //             message: "Error updating reward task group",
        //             error: error
        //         });
        //     }
        );

        return deferred.promise;
    },

    /**
     *
     * @param consumptionRecord
     * @param platformObj
     */
    checkPlayerRewardTaskGroupForConsumption: function (consumptionRecord, platformObj) {
        let nonDirtyAmount = consumptionRecord.validAmount ? consumptionRecord.validAmount : 0;
        let createTime = new Date(consumptionRecord.createTime);

        // Recursive update RTG to prevent overflow of curConsumption
        return findAndUpdateRTG(consumptionRecord, createTime, platformObj, constSystemParam.UPDATE_RECURSE_MAX_RETRY).then(
            res => {
                if (res) {
                    if (res.remainingCurConsumption || res.remainBonusAmt) {
                        // RTG has fulfilled, if there's amount overflowed, add to free amount consumption
                        dbRewardTaskGroup.addRemainingConsumptionToFreeAmountRewardTaskGroup(
                            consumptionRecord.platformId,
                            consumptionRecord.playerId,
                            createTime,
                            res.remainingCurConsumption,
                            res.remainBonusAmt
                        ).catch(errorUtils.reportError);
                        // Assume overflow amount is valid for consumption return
                        // // p/s: this norDirtyAmount will always be replaced with the XIMAAmt at the bottom, so I commented it out
                        // nonDirtyAmount = res.remainingCurConsumption;
                    }

                    // Available XIMA Amt
                    if (Number.isFinite(res.XIMAAmt)) {
                        nonDirtyAmount = res.XIMAAmt;
                    }

                    return res;
                }
            },
            error => {
                return Promise.reject({
                    name: "DBError",
                    message: "Error updating reward task group",
                    error: error
                });
            }
        ).then(
            updatedObj => {
                if (updatedObj && updatedObj.statusChange && updatedObj.updatedData) {
                    // Transfer amount to player if reward is achieved
                    // Also transfer to player (amount = 0) when reward is no credit
                    return dbRewardTask.completeRewardTaskGroup(updatedObj.updatedData, updatedObj.updatedData.status);

                }
            }
        ).then(() => nonDirtyAmount)
    },

    /**
     * apply for manual unlock reward task
     * @param data
     * @param adminId
     * @param adminName
     */
    manualUnlockRewardTask: function (data, adminId, adminName) {
        let taskData = data[0];

        if (taskData) {
            let platformId = taskData.platformId;
            let proposalData = Object.assign({}, taskData);

            proposalData.playerObjId = taskData.playerId;
            proposalData.amount = Number(taskData.currentAmount);

            //check reward task status here
            return dbconfig.collection_rewardTask.findOne({_id: taskData._id}).lean().then(
                rewardTask => {
                    if (rewardTask && rewardTask.status == constRewardTaskStatus.STARTED) {
                        return dbProposal.createProposalWithTypeName(platformId, constProposalType.MANUAL_UNLOCK_PLAYER_REWARD,
                            {creator: {type: 'admin', name: adminName, id: adminId}, data: proposalData});
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Invalid reward task data or status"});
                    }
                }
            );
        } else {
            return Q.reject({name: "DataError", message: "Cannot find player or payment channel"});
        }
    },

    /**
     * complete a reward task and give the reward amount to player
     * @param {Object} taskData - reward task object
     */
    completeRewardTask: function (taskData) {
        let updateData = {};
        let inputCreditChange;
        return new Promise((resolve, reject) => {
            // Check that we have the input we need to proceed
            if (!taskData._id) {
                return Q.reject({
                    name: "DataError",
                    message: "Cannot update task with no _id: " + JSON.stringify(taskData)
                });
            }
            if (!taskData.platformId) {
                return Q.reject({
                    name: "DataError",
                    message: "Cannot update task with no platformId: " + JSON.stringify(taskData)
                });
            }

            let bUpdateProposal = false;
            let originalStatus = taskData.status;
            let rewardAmount = taskData.currentAmount;

            if (taskData.requiredBonusAmount > 0 && rewardAmount > taskData.requiredBonusAmount) {
                rewardAmount = taskData.requiredBonusAmount;
            }
            taskData.status = constRewardTaskStatus.COMPLETED;
            const taskProm = dbRewardTask.findOneAndUpdateWithRetry(
                dbconfig.collection_rewardTask,
                {_id: taskData._id, platformId: taskData.platformId},
                {status: constRewardTaskStatus.COMPLETED}
            );

            //if reward task if player top up return, increase the daily amount
            // if (taskData.type == constRewardType.PLAYER_TOP_UP_RETURN) {
            //     updateData.$inc.dailyTopUpIncentiveAmount = taskData.currentAmount;
            // }
            //if reward task if player top up reward, check max reward amount
            // if (taskData.type == constRewardType.PLAYER_TOP_UP_REWARD && taskData.currentAmount > taskData.maxRewardAmount) {
            //     bUpdateProposal = true;
            //     rewardAmount = taskData.maxRewardAmount;
            //     updateData.$inc = {validCredit: taskData.maxRewardAmount};
            // }

            dbconfig.collection_platform.findOne({_id: taskData.platformId}).lean().then(
                platformData => {
                    if (platformData.canMultiReward) {
                        // Changed from update lockedCredit from 0 to -rewardAmount
                        updateData = {
                            $inc: {validCredit: rewardAmount, lockedCredit: -rewardAmount},
                        };

                        if (taskData.inProvider) {
                            inputCreditChange = {
                                $inc: {_inputCredit: taskData.initAmount}
                            }
                        }
                    }
                    else {
                        updateData = {
                            $inc: {validCredit: rewardAmount},
                            lockedCredit: 0
                        };
                    }

                    return taskProm;
                }
            ).then(
                rewardTask => {
                    // This is the old document we have replaced. If the old document had already been marked as completed by another process, then we will not proceed.
                    if (rewardTask && rewardTask.status != constRewardTaskStatus.COMPLETED) {
                        if (inputCreditChange) {
                            // If there are other tasks available increase the _inputCredit so the amount that will moved to validCredit when transfer out will increase
                            return dbRewardTask.updateWithRetry(
                                dbconfig.collection_rewardTask,
                                {
                                    playerId: taskData.playerId,
                                    platformId: taskData.platformId,
                                    status: constRewardTaskStatus.STARTED
                                },
                                inputCreditChange,
                                {multi: true}
                            ).then(
                                () => {
                                    if (taskData.useLockedCredit) {
                                        return dbRewardTask.findOneAndUpdateWithRetry(
                                            dbconfig.collection_players,
                                            {_id: taskData.playerId, platform: taskData.platformId},
                                            updateData,
                                            {new: true}
                                        );
                                    }
                                    else {
                                        return true;
                                    }
                                },
                                error => {
                                    console.log(error);
                                    return false;
                                }
                            )
                        } else {
                            if (taskData.useLockedCredit) {
                                return dbRewardTask.findOneAndUpdateWithRetry(
                                    dbconfig.collection_players,
                                    {_id: taskData.playerId, platform: taskData.platformId},
                                    updateData,
                                    {new: true}
                                );
                            }
                            else {
                                return true;
                            }
                        }
                    }
                    else {
                        reject({name: "DataError", message: "Incorrect reward task status"});
                    }
                },
                error => {
                    console.log("Update reward task to complete failed", error, rewardTask);
                    reject({name: "DataError", message: "Fail to update reward task", error: error});
                }
            ).then(
                data => {
                    if (data) {
                        if (taskData.useLockedCredit) {
                            dbLogger.createCreditChangeLogWithLockedCredit(taskData.playerId, taskData.platformId, rewardAmount, taskData.type + ":unlock", data.validCredit, 0, -rewardAmount, null, taskData);
                        }
                        resolve(taskData.currentAmount);
                    }
                    else {
                        reject({name: "DataError", message: "Can't update reward task and player credit"});
                    }
                },
                error => {
                    console.log("Update player credit failed when complete reward task", error, taskData);
                    reject({
                        name: "DBError",
                        message: "Error updating reward task and player credit",
                        error: error
                    });
                }
            );
        })
    },

    /**
     * Add manual unlock support
     * NO_CREDIT will also trigger this function now
     * @param rewardGroupData (It could bind with EBET wallet data when necessary)
     * @param {String} unlockType
     */
    completeRewardTaskGroup: (rewardGroupData, unlockType) => {
        rewardGroupData = JSON.parse(JSON.stringify(rewardGroupData));
        let playerCreditChange;

        // Set transfer amount
        let rewardAmount = rewardGroupData.rewardAmt;

        // Mark the provider group as complete if it is manual unlocked
        let taskGroupProm = Promise.resolve(rewardGroupData);

        let prohibitWithdrawal = function (player) {
            if (player) {
                let validCredit = player.validCredit;
                let lockedCredit = player.lockedCredit;
                let providerCredit = 0, totalCredit = 0;
                let platformProm = dbconfig.collection_platform.findOne({_id: rewardGroupData.platformId});
                let providerGroupProm;

                if(rewardGroupData.providerGroup) {
                    providerGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: rewardGroupData.providerGroup})
                        .populate({path: "providers", model: dbconfig.collection_gameProvider});
                } else {
                    providerGroupProm = dbconfig.collection_platform.findOne({_id: rewardGroupData.platformId})
                        .populate({path: "gameProviders", model: dbconfig.collection_gameProvider})
                        .then(
                            platform => {
                                if(platform) {
                                    return {providers: platform.gameProviders};
                                }
                            }
                        );
                }

                Promise.all([platformProm,providerGroupProm]).then(
                    data => {
                        let platform = data[0];
                        let providerGroup = data[1];
                        let promArr = [];
                        let cpmsAPI = require("../externalAPI/cpmsAPI");

                        if(providerGroup && providerGroup.providers && providerGroup.providers.length > 0) {
                            providerGroup.providers.forEach(provider => {
                                if(provider) {
                                    promArr.push(
                                        cpmsAPI.player_queryCredit(
                                            {
                                                username: player.name,
                                                platformId: platform.platformId,
                                                providerId: provider.providerId
                                            }
                                        ).then(
                                            data => data,
                                            error => {
                                                return {credit: 0};
                                            }
                                        )
                                    );
                                }
                            });
                        }
                        return Promise.all(promArr);
                    }
                ).then(
                    (queryResult) => {
                        queryResult.forEach(provider => {
                            if(provider && provider.hasOwnProperty("credit")) {
                                providerCredit += !isNaN(provider.credit) ? parseFloat(provider.credit) : 0;
                            }
                        });
                        totalCredit = validCredit + lockedCredit + providerCredit;

                        console.log("checking ---YH rewardGroupData.forbidWithdrawIfBalanceAfterUnlock", rewardGroupData && rewardGroupData.forbidWithdrawIfBalanceAfterUnlock ? rewardGroupData.forbidWithdrawIfBalanceAfterUnlock :  "null")
                        console.log("checking ---YH totalCredit", player.name, validCredit, lockedCredit, providerCredit);

                        // Set player bonus permission to off if there's still credit available after unlock reward
                        if (rewardGroupData
                            && rewardGroupData.hasOwnProperty("forbidWithdrawIfBalanceAfterUnlock")
                            && rewardGroupData.forbidWithdrawIfBalanceAfterUnlock > 0
                            && rewardGroupData.forbidWithdrawIfBalanceAfterUnlock <= totalCredit) {
                            dbPlayerUtil.setPlayerPermission(rewardGroupData.platformId, rewardGroupData.playerId, [["applyBonus", false]]).then(
                                updatePlayerInfo => {
                                    if (updatePlayerInfo && updatePlayerInfo.permission && updatePlayerInfo.permission.applyBonus){
                                        console.log("checking--- yH playerInfo-permission", updatePlayerInfo.permission.applyBonus)
                                    }
                                    return dbconfig.collection_proposal.findOne({_id: rewardGroupData.lastProposalId})
                                }
                            ).then(
                                proposal => {
                                    let proposalId = proposal ? proposal.proposalId : "unknown ID";
                                    let remark = "优惠提案："+proposalId+"（流水解锁馀额高于"+rewardGroupData.forbidWithdrawIfBalanceAfterUnlock+"元）";
                                    let oldPermissionObj = {applyBonus: player.permission.applyBonus};
                                    let newPermissionObj = {applyBonus: false};
                                    dbPlayerUtil.addPlayerPermissionLog(null, rewardGroupData.platformId, rewardGroupData.playerId, remark, oldPermissionObj, newPermissionObj);
                                }
                            ).catch(errorUtils.reportError);
                        }
                    },
                    error => {console.log(error);}
                );
            }
            else {
                return Q.reject({name: "DataError", message: "Can't proceed with player prohibit withdrawal"});
            }
        };

        if (unlockType === constRewardTaskStatus.MANUAL_UNLOCK) {
            taskGroupProm = dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                // platformId: rewardGroupData.platformId,
                // playerId: rewardGroupData.playerId,
                // providerGroup: rewardGroupData.providerGroup
                _id: rewardGroupData._id,
                status: constRewardTaskStatus.STARTED
            }, {
                status: constRewardTaskStatus.MANUAL_UNLOCK
            }, {new: true}).lean();
        }

        return taskGroupProm.then(RTG => {
            if (RTG) {
                // Check if player is in game when reward group completed
                // Move balance in RTG to free credit when RTG became no credit
                // Move balance when RTG achieved, as there may be no transfer out action and credit will lost
                if (!RTG.inProvider || unlockType === constRewardTaskStatus.NO_CREDIT || unlockType === constRewardTaskStatus.ACHIEVED) {
                    // If player has left game, add the rewardAmt to player's credit
                    playerCreditChange = {
                        $inc: {validCredit: rewardAmount}
                    };

                    return dbRewardTask.findOneAndUpdateWithRetry(
                        dbconfig.collection_players,
                        {_id: RTG.playerId, platform: RTG.platformId},
                        playerCreditChange,
                        {new: true}
                    ).then(
                        player => {
                            if (player) {
                                let rewardType = RTG && RTG.type ? RTG.type : "Free amount";

                                console.log("checking unlockedType --- yH", unlockType, RTG);
                                dbLogger.createCreditChangeLogWithLockedCredit(RTG.playerId, RTG.platformId, rewardAmount, rewardType + ":unlock", player.validCredit, 0, -rewardAmount, null, RTG);

                                prohibitWithdrawal(player);
                            }
                            else {
                                return Q.reject({name: "DataError", message: "Can't update reward task and player credit"});
                            }
                        },
                        error => {
                            console.log("Update player credit failed when complete reward task", error, RTG);
                            return Q.reject({
                                name: "DBError",
                                message: "Error updating reward task and player credit",
                                error: error
                            });
                        }
                    );
                } else {
                    // Do nothing first if player is still in game
                    // This will be triggered again when player transfer out
                    dbconfig.collection_players.findOne({
                        _id: RTG.playerId,
                        platform: RTG.platformId
                    }).then(
                        player => {
                            if (player) {
                                prohibitWithdrawal(player);
                            } else {
                                //
                            }
                        }
                    );
                }
            }
        });
    },

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

    updateWithRetry: function (model, query, update, options) {
        const maxAttempts = 4;
        const delayBetweenAttempts = 500;

        const attemptUpdate = (currentAttemptCount) => {
            return model.update(query, update, options).catch(
                error => {
                    if (currentAttemptCount >= maxAttempts) {
                        // This is a bad situation, so we log a lot to help debugging
                        console.log(`Update attempt ${currentAttemptCount}/${maxAttempts} failed.  query=`, query, `update=`, update, `error=`, error);
                        return Q.reject({
                            name: 'DBError',
                            message: "Failed " + currentAttemptCount + " attempts to update",
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

    getPlatformRewardAnalysis: function (type, period, platformId, startDate, endDate, eventName) {
        //refractorTime
        // var options = {};
        // switch (period) {
        //     case 'day':
        //         options.date = {$dateToString: {format: "%Y-%m-%d", date: "$createTime"}};
        //         break;
        //     case 'week':
        //         options.week = {$floor: {$divide: [{$subtract: ["$createTime", startTime]}, 604800000]}};
        //         break;
        //     case 'month':
        //     default:
        //         options.year = {$year: "$createTime"};
        //         options.month = {$month: "$createTime"};
        // }
        // return dbconfig.collection_proposalType.findOne({
        //     platformId: platformId,
        //     name: type
        // }).then(
        //     function (data) {
        //         var typeId = data._id;
        //         return dbconfig.collection_proposal
        //             .aggregate(
        //                 {
        //                     $match: {
        //                         'data.platformId': platformId,
        //                         createTime: {$gte: startTime, $lt: endTime},
        //                         type: typeId
        //                     }
        //                 },
        //                 {
        //                     $group: {_id: options, number: {$sum: 1}, amount: {$sum: '$data.rewardAmount'}}
        //                 }
        //             ).exec()
        //     })
        // var proms = [];
        // var dayStartTime = startDate;
        // var getNextDate;
        // switch (period) {
        //     case 'day':
        //         getNextDate = function (date) {
        //             var newDate = new Date(date);
        //             return new Date(newDate.setDate(newDate.getDate() + 1));
        //         }
        //         break;
        //     case 'week':
        //         getNextDate = function (date) {
        //             var newDate = new Date(date);
        //             return new Date(newDate.setDate(newDate.getDate() + 7));
        //         }
        //         break;
        //     case 'month':
        //     default:
        //         getNextDate = function (date) {
        //             var newDate = new Date(date);
        //             return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
        //         }
        // }
        // return dbconfig.collection_proposalType.findOne({
        //     platformId: platformId,
        //     name: type
        // }).then(function (data) {
        //     var typeId = data._id;
        //     while (dayStartTime.getTime() < endDate.getTime()) {
        //         var dayEndTime = getNextDate.call(this, dayStartTime);
        //         var matchObj = {
        //             platformId: platformId,
        //             loginTime: {$gte: dayStartTime, $lt: dayEndTime},
        //             type: typeId
        //         };
        //         proms.push(dbconfig.collection_proposal
        //             .aggregate(
        //                 {
        //                     $match: {
        //                         'data.platformId': platformId,
        //                         createTime: {$gte: dayStartTime, $lt: dayEndTime},
        //                         type: typeId
        //                     }
        //                 },
        //                 {
        //                     $group: {_id: null, number: {$sum: 1}, amount: {$sum: '$data.rewardAmount'}}
        //                 }
        //             ))
        //         dayStartTime = dayEndTime;
        //     }
        //     return Q.all(proms)
        // }).then(data => {
        //     var i = 0;
        //     var tempDate = startDate;
        //     var res = data.map(item => {
        //         var date = tempDate;
        //         var obj = {
        //             _id: {date: date},
        //             number: item[0] ? item[0].number : 0,
        //             amount: item[0] ? item[0].amount : 0
        //         }
        //         tempDate = getNextDate(tempDate);
        //         return obj;
        //     });
        //     return res;
        // });

        return dbconfig.collection_proposalType.findOne({
            platformId: platformId,
            name: type

        }).then(data => {
            let query = {
                'data.platformId': platformId,
                type: data._id,
                settleTime: {$gte: startDate, $lt: endDate},
                "data.eventName": eventName,
                status: {$in: [constProposalStatus.APPROVE, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
            };

            return dbconfig.collection_proposal.find(query);

        })

    },

    getPlatformRewardPageReport: function (constType, platformId, startTime, endTime, index, limit, sortCol, evnetId) {
        index = Math.min(index, constSystemParam.REPORT_MAX_RECORD_NUM);
        limit = limit || 10;
        sortCol = sortCol || {"createTime": -1};
        var matchObj = constType ? {
            platformId: platformId,
            type: constType,
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
            eventId: evnetId
        } : {
            platformId: platformId,
            createTime: {
                $gte: startTime,
                $lt: endTime
            }
        }

        var a = dbconfig.collection_rewardTask.find(matchObj).sort(sortCol).skip(index).limit(limit)
            .populate({path: "playerId", model: dbconfig.collection_players})
            .populate({path: "data.playerId", model: dbconfig.collection_players});
        var b = dbconfig.collection_rewardTask.find(matchObj).count();
        var c = dbconfig.collection_rewardTask.aggregate(
            {$match: matchObj}, {
                $group: {
                    _id: null,
                    unlockedAmountSum: {$sum: "$unlockedAmount"},
                    currentAmountSum: {$sum: "$currentAmount"}
                }
            })
        return Q.all([a, b, c]).then(
            data => {
                var summaryObj = data[2] ? data[2][0] : {};
                return {data: data[0], size: data[1], summary: summaryObj};
            }
        )
    },

    fixPlayerRewardAmount: function (playerId) {
        let playerObj = null;
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform}
            ).lean().then(
                playerData => {
                    if (playerData) {
                        playerObj = playerData;

                        if (!playerObj.platform.canMultiReward) {
                            return dbconfig.collection_rewardTask.findOne(
                                {playerId: playerData._id, status: constRewardTaskStatus.STARTED}
                            ).lean();
                        }
                        else {
                            return false;
                        }
                    }
                    else {
                        return Q.reject({name: "DataError", message: "Can not find player"});
                    }
                }
            ).then(
                taskData => {
                    if (taskData) {
                        return Q.reject({name: "DataError", message: "Reward task is not completed"});
                    }
                    else {
                        if (playerObj.lockedCredit >= 1) {
                            playerObj.validCredit += playerObj.lockedCredit;
                            return dbconfig.collection_players.findOneAndUpdate({
                                _id: playerObj._id,
                                platform: playerObj.platform
                            }, {
                                $inc: {validCredit: playerObj.lockedCredit},
                                lockedCredit: 0
                            }).then(() => {
                                playerObj.fixedStatus = 'fixed';
                                playerObj.lockedCredit = 0;
                                return playerObj;
                            });
                        } else {
                            playerObj.fixedStatus = 'unnecessary';
                            return playerObj;
                        }
                    }
                }
            );
    },

    createRewardTaskForProposal: (proposalData, taskData, deferred, rewardType, resolveValue) => {
        let rewardTask;
        //check if player object id is in the proposal data
        if (!(proposalData && proposalData.data && proposalData.data.playerObjId)) {
            deferred.reject({name: "DBError", message: "Invalid reward proposal data"});
            return;
        }

        // Add proposalId in reward data
        taskData.proposalId = proposalData.proposalId;

        //check if player has reward task and if player's platform support multi reward
        dbconfig.collection_rewardTask.findOne(
            {playerId: proposalData.data.playerObjId, status: constRewardTaskStatus.STARTED, useLockedCredit: true}
        ).populate(
            {path: "platformId", model: dbconfig.collection_platform}
        ).lean().then(
            curTask => {
                if (!curTask || (curTask && curTask.platformId && curTask.platformId.canMultiReward)) {
                    return;
                }
                else {
                    return Q.reject({name: "DBError", message: "Player already has reward task ongoing"});
                }
            }
        ).then(
            () => dbRewardTask.createRewardTask(taskData).then(
                data => rewardTask = data
            ).catch(
                error => Q.reject({
                    name: "DBError",
                    message: "Error creating reward task for " + rewardType,
                    error: error
                })
            )
        ).then(
            () => {
                if (!taskData.useLockedCredit) {
                    return dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).lean().then(
                        playerData => {
                            dbPlayerInfo.changePlayerCredit(proposalData.data.playerObjId, playerData.platform, proposalData.data.rewardAmount, rewardType, proposalData);
                        }
                    );
                }
            }
        ).then(
            //() => createRewardLogForProposal(taskData.rewardType, proposalData)
            () => {
                SMSSender.sendByPlayerObjId(proposalData.data.playerObjId, constPlayerSMSSetting.APPLY_REWARD);
                //send message if there is any template created for this reward
                return messageDispatcher.dispatchMessagesForPlayerProposal(proposalData, rewardType, {
                    rewardTask: taskData
                });
            }
        ).then(
            function () {
                deferred.resolve(resolveValue || rewardTask);
            },
            function (error) {
                deferred.reject(error);
            }
        );
    },

    getConsumptionReturnPeriodTime: (period) => dbRewardUtil.getConsumptionReturnPeriodTime(period),
    getConsumptionReturnCurrentPeriodTime: (period) => dbRewardUtil.getConsumptionReturnCurrentPeriodTime(period),

};

function findAndUpdateRTG (consumptionRecord, createTime, platform, retryCount) {
    // Check recursive limit
    if (retryCount == 0) {
        // This consumption record didn't make it to RTG
        console.log('findAndUpdateRTG retry 0', consumptionRecord);
        return false;
    }

    // Debug negative RTG curConsumption
    if (consumptionRecord && consumptionRecord.validAmount && consumptionRecord.validAmount < 0) {
        console.log('findAndUpdateRTG has negative!', consumptionRecord.validAmount, consumptionRecord._id)
    }

    let consumptionAmt = consumptionRecord.validAmount, bonusAmt = consumptionRecord.bonusAmount;
    let remainBonusAmt = 0, remainingCurConsumption = 0, XIMAAmt = 0;
    let nonXIMAAmt = 0;

    return dbRewardTaskGroup.getPlayerRewardTaskGroup(consumptionRecord.platformId, consumptionRecord.providerId, consumptionRecord.playerId, createTime).then(
        rewardTaskGroup => {
            if (rewardTaskGroup) {
                console.log("checking PATH 1: With RTG Group")
                let consumptionOffset = isNaN(platform.autoApproveConsumptionOffset) ? 0 : platform.autoApproveConsumptionOffset;

                // Deny happening of negative RTG curConsumption
                let rtgConsumption = rewardTaskGroup.curConsumption > 0 ? rewardTaskGroup.curConsumption : 0;
                let currentConsumption = rtgConsumption + consumptionRecord.validAmount + consumptionOffset;
                let targetConsumption = rewardTaskGroup.targetConsumption + rewardTaskGroup.forbidXIMAAmt;
                let currentDifference = (rewardTaskGroup.targetConsumption + rewardTaskGroup.forbidXIMAAmt) - rtgConsumption;

                console.log("checking in this currentConsumption", currentConsumption)
                console.log("checking in this targetConsumption", targetConsumption)
                // Check if consumption has reached
                if (currentConsumption > targetConsumption) {
                    // Consumption reached
                    // Case 1: 50 + 45 + 5 >= 100, consumptionAmt = 100 - 50 = 50, remainingCurConsumption = 45 - 50 = -5, 5 will be deducted from free amount consumption
                    //     to compensate an early achieved RTG
                    // Case 2: 50 + 50 + 5 >= 100, consumptionAmt = 100 - 50 = 50, remainingCurConsumption = 50 - 50 = 0
                    // Case 3: 50 + 55 + 5 >= 100, consumptionAmt = 100 - 50 = 50, remainingCurConsumption = 55 - 50 = 5, 5 will be increased to free amount consumption
                    console.log("checking in this currentDifference", currentDifference)
                    console.log("checking in this consumptionRecord.validAmount", consumptionRecord.validAmount)
                    if (currentDifference < consumptionRecord.validAmount && currentDifference > 0) {
                        consumptionAmt = currentDifference;
                        remainingCurConsumption = consumptionRecord.validAmount - consumptionAmt;
                        console.log("checking in this remainingCurConsumption", remainingCurConsumption)
                    }
                }

                // Check if bonusAmount has exceed the amount availalble in this RTG
                // Current amount in RTG should not be less than 0
                let currentAmt = rewardTaskGroup.currentAmt;
                let amtToDeduct = 0;

                if (currentAmt > 0 && currentAmt + bonusAmt < 0) {
                    amtToDeduct = -rewardTaskGroup.currentAmt;
                    remainBonusAmt = bonusAmt - amtToDeduct;
                } else {
                    amtToDeduct = bonusAmt;
                }

                let rewardTaskUnlockedProgress;
                let statusChange = false;
                let updObj = {
                    $inc: {
                        currentAmt: amtToDeduct,
                        curConsumption: consumptionAmt
                    }
                };

                console.log("LH Check RTG unlock 0-------------", currentAmt);
                console.log("LH Check RTG unlock 0.1-------------", bonusAmt);
                console.log("LH Check RTG unlock 0.2-------------", remainBonusAmt);
                console.log("LH Check RTG unlock 0.3-------------", updObj);

                console.log('LK checking RTG"s player"s id --', consumptionRecord.playerId);
                return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                    {_id: rewardTaskGroup._id},
                    updObj,
                    {new: true}
                ).populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup}).lean().then(
                    async updatedRTG => {
                        // RTG updated successfully
                        if (updatedRTG) {
                            console.log('LK checking updatedRTG --', updatedRTG.status);
                            // update the locked reward tasks
                            rewardTaskUnlockedProgress = dbRewardTask.unlockRewardTaskInRewardTaskGroup(updatedRTG, updatedRTG.playerId).then( rewards => {
                                if (rewards){

                                    return dbRewardTask.getRewardTasksRecord(rewards, updatedRTG);
                                }
                            });

                            updatedRTG.targetConsumption = updatedRTG.targetConsumption || 0;
                            updatedRTG.forbidXIMAAmt = updatedRTG.forbidXIMAAmt || 0;
                            // Check boundary case - RTG still overflow, try again
                            // retryCount > 1 to bypass condition below: fixed reward task not achieve when updatedRTG.curConsumption > updatedRTG.targetConsumption + updatedRTG.forbidXIMAAmt
                            if ( (updatedRTG.curConsumption > updatedRTG.targetConsumption + updatedRTG.forbidXIMAAmt && retryCount > 1)
                            // Status changed before we change them
                            || updatedRTG.status != constRewardTaskStatus.STARTED) {
                                // Revert this operation and try again
                                return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                    {_id: updatedRTG._id},
                                    {
                                        $inc: {
                                            currentAmt: -amtToDeduct,
                                            curConsumption: -consumptionAmt
                                        }
                                    }
                                ).then(() => false);
                            }

                            // Concurrent check passed
                            // Get the most accurate curConsumption
                            let beforeConsumption = updatedRTG.curConsumption - consumptionAmt;
                            console.log("checking Path 1: consumptionAmt",  consumptionAmt)
                            console.log("checking Path 1: beforeConsumption",  beforeConsumption)
                            console.log("checking Path 1: updatedRTG.curConsumption",  updatedRTG.curConsumption)
                            console.log("checking Path 1: updatedRTG.forbidXIMAAmt",  updatedRTG.forbidXIMAAmt)
                            console.log("checking Path 1: updatedRTG.remainingForbidXIMAAmt",  updatedRTG.remainingForbidXIMAAmt)
                            console.log("checking Path 1: updatedRTG.hasOwnProperty('remainingForbidXIMAAmt')",  updatedRTG.hasOwnProperty("remainingForbidXIMAAmt"))

                            // Check returnable amount
                            // if there is exist of "remainingForbidXIMAAmt" in RTG meaning is a new start with new logic for XIMA
                            if (updatedRTG && updatedRTG.hasOwnProperty("remainingForbidXIMAAmt")){
                                console.log("checking using new logic: remainingForbidXIMAAmt", updatedRTG.remainingForbidXIMAAmt)
                                // Debug negative RTG curConsumption
                                if (updatedRTG && updatedRTG.remainingForbidXIMAAmt && updatedRTG.remainingForbidXIMAAmt < 0) {
                                    console.log('updatedRTG.remainingForbidXIMAAmt has negative!', updatedRTG.remainingForbidXIMAAmt, updatedRTG._id)
                                }

                                if (consumptionRecord && updatedRTG.remainingForbidXIMAAmt &&  updatedRTG.remainingForbidXIMAAmt > 0 && consumptionRecord.validAmount){
                                    // if the validAmount from consumption record exceeds the remainingForbidXIMAAmt; the balance will update to validAmount in consumptionSummary
                                    if (consumptionRecord.validAmount >= updatedRTG.remainingForbidXIMAAmt){
                                        XIMAAmt = consumptionRecord.validAmount - updatedRTG.remainingForbidXIMAAmt;
                                        nonXIMAAmt = updatedRTG.remainingForbidXIMAAmt;
                                    }
                                    else{
                                        // if there is no enough valid credit for the forbidXIMAAmt, all the valid credit will be used up for the forbidXIMAAmt; readyXIMAAmt = 0;
                                        XIMAAmt = 0;
                                        nonXIMAAmt = consumptionRecord.validAmount;
                                    }

                                    // update the RTG by reducing the remainingForbidXIMAAmt
                                    let rtgProm = dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                        {_id: updatedRTG._id},
                                        {
                                            $inc: {
                                                remainingForbidXIMAAmt: -nonXIMAAmt
                                            }
                                        }
                                    ).lean();

                                    let checkSummary = await rtgProm;
                                    console.log("checking checkSummary", checkSummary);
                                }
                                else{
                                    // if the forbidXIMAAmt has been cleared, all the validCredit will go to XIMAAmt
                                    XIMAAmt = consumptionRecord.validAmount
                                }
                            }
                            else{
                                console.log("checking using back old logic")
                                // use back the old logic until a new RTG forms
                                if (updatedRTG.forbidXIMAAmt && beforeConsumption < updatedRTG.forbidXIMAAmt) {
                                    if (updatedRTG.curConsumption > rewardTaskGroup.forbidXIMAAmt) {
                                        // Example: 20 - (2640 - 2635) = 15, 15 is available for XIMA
                                        console.log("checking pATH 1: if 1st case")
                                        XIMAAmt = consumptionRecord.validAmount - (updatedRTG.forbidXIMAAmt - beforeConsumption);
                                    } else {
                                        console.log("checking pATH 1: if 1st else case")
                                        // Still in the range of forbidXIMAAmt
                                    }
                                } else {
                                    console.log("checking pATH 1: else case")
                                    // No forbidXIMAAmt or curConsumption already over forbidXIMAAmt
                                    XIMAAmt = consumptionRecord.validAmount;
                                }
                            }

                            console.log("checking Path 1: XIMA amount", XIMAAmt );
                            let statusUpdObj = {
                                unlockTime: createTime
                            };

                            console.log("LH Check RTG unlock 1-------------", updatedRTG, updatedRTG._id);
                            console.log("LH Check RTG unlock 1.1-------------", updatedRTG.currentAmt, updatedRTG._id);
                            console.log("LH Check RTG unlock 2-------------", platform.autoApproveLostThreshold);

                            // Check whether player has lost all credit
                            if (updatedRTG.currentAmt <= platform.autoApproveLostThreshold) {
                                statusUpdObj.status = constRewardTaskStatus.NO_CREDIT;
                            }

                            console.log("LH Check RTG unlock 3-------------", currentConsumption, updatedRTG._id);
                            console.log("LH Check RTG unlock 4-------------", targetConsumption, updatedRTG._id);

                            if (currentConsumption >= targetConsumption) {
                                statusUpdObj.status = constRewardTaskStatus.ACHIEVED;
                            }

                            if (statusUpdObj.status) {
                                console.log('LK checking updated RTG status--', statusUpdObj.status);
                                // update the rewardTaskGroupUnlockRecord
                               let updateProm = dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                   {_id: updatedRTG._id, status: constRewardTaskStatus.STARTED},
                                   statusUpdObj,
                                   {new: true}
                               );

                               console.log("LH Check RTG unlock 5-------------", statusUpdObj);
                               console.log("LH Check RTG unlock 6-------------", updatedRTG.playerId);
                               return Promise.all([rewardTaskUnlockedProgress, updateProm]).then(


                                // return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                //     {_id: updatedRTG._id, status: constRewardTaskStatus.STARTED},
                                //     statusUpdObj,
                                //     {new: true}
                                // ).then(
                                    res => {
                                        console.log("LH Check RTG unlock 7-------------", res[1]);
                                        if (res[1]) {
                                            dbRewardTask.completeRewardTaskGroup(res[1], res[1].status).catch(errorUtils.reportError);
                                            console.log("checking---UnlockedRewardTasksRecord", res[0] || "could not find the record");
                                            if (res[0]){
                                                console.log("yH checking---unlockedRTG-status", statusUpdObj.status)
                                                console.log("yH checking---unlockedRTG-playerId", updatedRTG.playerId)
                                                dbRewardTask.updateUnlockedRewardTasksRecord(res[0], statusUpdObj.status, updatedRTG.playerId, updatedRTG.platformId).catch(errorUtils.reportError);
                                            }

                                            return res[1];
                                        }

                                        // The status change is not updated, try again
                                        return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                            {_id: updatedRTG._id},
                                            {
                                                $inc: {
                                                    currentAmt: -amtToDeduct,
                                                    curConsumption: -consumptionAmt
                                                }
                                            }
                                        ).then(() => {
                                            console.log("debug RTG2", consumptionRecord.playerId, retryCount);
                                            return false;
                                        });
                                    }
                                )
                            }
                        }
                        console.log("Chekcing Path 1: XIMA final amount", XIMAAmt)
                        return updatedRTG
                    }
                ).then(
                    res => {
                        if (res) {
                            return {
                                updatedData: res,
                                remainingCurConsumption: remainingCurConsumption,
                                remainBonusAmt: remainBonusAmt,
                                XIMAAmt: XIMAAmt,
                                statusChange: statusChange
                            }
                        } else {
                            return findAndUpdateRTG (consumptionRecord, createTime, platform, retryCount - 1);
                        }
                    }
                );
            } else {
                console.log("checking PATH 2: Without RTG Group")
                return {
                    updatedData: false,
                    XIMAAmt: consumptionAmt
                }
            }
        }
    )
}

var proto = dbRewardTaskFunc.prototype;
proto = Object.assign(proto, dbRewardTask);

// This make WebStorm navigation work
module.exports = dbRewardTask;
