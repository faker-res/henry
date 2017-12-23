'use strict';

var dbRewardTaskFunc = function () {
};
module.exports = new dbRewardTaskFunc();

const messageDispatcher = require("../modules/messageDispatcher.js");
const SMSSender = require('../modules/SMSSender');

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
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbGameProvider = require('../db_modules/dbGameProvider');
const ObjectId = mongoose.Types.ObjectId;
const dbPlayerUtil = require("../db_common/dbPlayerUtility");

const dbRewardTaskGroup = require('../db_modules/dbRewardTaskGroup');

const dbRewardTask = {

    /**
     * Create a new reward
     * @param {Object} rewardData - The data of the reward. Refer to reward schema.
     * @param adminId
     * @param adminName
     */
    manualCreateRewardTask: function (rewardData, adminId, adminName) {
        return dbRewardTask.checkPlayerRewardTaskStatus(rewardData.playerId).then(
            taskStatus => {
                return dbRewardTask.getPlayerCurRewardTask(rewardData.playerId);
            }
        ).then(data => {
            if (data && !data.platformId.canMultiReward && data.platformId.useLockedCredit) {
                return Q.reject({
                    status: constServerCode.PLAYER_HAS_REWARD_TASK,
                    message: "The player has not unlocked the previous reward task. Not valid for new reward"
                })
            } else {
                //return dbRewardTask.createRewardTask(rewardData);
                //create reward task proposal for player
                return dbProposal.createProposalWithTypeNameWithProcessInfo(rewardData.platformId, constProposalType.ADD_PLAYER_REWARD_TASK, {
                    creator: {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    }, data: rewardData
                });
            }
        })
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
        }).then(
            providerGroup => {
                if (providerGroup) {
                    let updObj = {
                        $inc: {
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
                    } else {
                        updObj.$inc.targetConsumption = rewardData.requiredUnlockAmount;
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
        // Search available reward task group for this reward & this player
        return dbconfig.collection_rewardTaskGroup.findOne({
            platformId: rewardData.platformId,
            playerId: rewardData.playerId,
            providerGroup: null,
            status: {$in: [constRewardTaskStatus.STARTED]}
        }).then(
            providerGroup => {
                if(isNaN(rewardData.applyAmount)) {
                    rewardData.applyAmount = 0;
                }
                if (providerGroup) {
                    let updObj = {
                        $inc: {
                            //rewardAmt: rewardData.initAmount,
                            currentAmt: rewardData.initAmount,
                            forbidWithdrawIfBalanceAfterUnlock:
                                proposalData && proposalData.data && proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                    ? proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                    : 0
                        }
                    };
                    if (rewardData.useConsumption) {
                        updObj.$inc.forbidXIMAAmt = rewardData.requiredUnlockAmount - rewardData.applyAmount;
                    } else {
                        updObj.$inc.targetConsumption = rewardData.requiredUnlockAmount - rewardData.applyAmount;
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
                        //rewardAmt: rewardData.initAmount,
                        rewardAmt: 0,
                        currentAmt: rewardData.initAmount,
                        forbidWithdrawIfBalanceAfterUnlock:
                            proposalData && proposalData.data && proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                ? proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                                : 0
                    };
                    if (rewardData.useConsumption && rewardData.requiredUnlockAmount) {
                        saveObj.forbidXIMAAmt = rewardData.requiredUnlockAmount;
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
                if (rewardData && !rewardData.useLockedCredit) {
                    let amountToUpdate = 0;
                    if (proposalData && proposalData.data) {
                        if (proposalData.data.rewardAmount && proposalData.data.applyAmount) {
                            amountToUpdate = proposalData.data.rewardAmount + proposalData.data.applyAmount;
                        }else if(proposalData.data.rewardAmount)
                        {
                            amountToUpdate = proposalData.data.rewardAmount;

                        }

                        return dbconfig.collection_players.findOne({_id: proposalData.data.playerObjId}).lean().then(
                            playerData => {
                                dbPlayerInfo.changePlayerCredit(proposalData.data.playerObjId, playerData.platform, amountToUpdate, rewardType, proposalData);
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
                            //targetConsumption: -rewardData.applyAmount,
                            //rewardAmt: -rewardData.applyAmount,
                            currentAmt: -rewardData.applyAmount
                            //rewardAmt: rewardData.initAmount,
                            //currentAmt: rewardData.initAmount,
                            // forbidWithdrawIfBalanceAfterUnlock:
                            //     proposalData && proposalData.data && proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                            //         ? proposalData.data.forbidWithdrawIfBalanceAfterUnlock
                            //         : 0
                        }
                    };
    
                    if (rewardData.useConsumption) {
                        updObj.$inc.forbidXIMAAmt = -rewardData.applyAmount;
                    } else {
                        updObj.$inc.targetConsumption = -rewardData.applyAmount;
                    }

                    if(freeProviderGroup.targetConsumption && freeProviderGroup.targetConsumption - rewardData.applyAmount <= 0){
                        updObj.status = constRewardTaskStatus.ACHIEVED;
                    }

                    // There are on-going reward task for this provider group
                    return dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                        _id: freeProviderGroup._id
                    }, updObj);
                }
                // else {
                //     let saveObj = {
                //         platformId: rewardData.platformId,
                //         playerId: rewardData.playerId,
                //         providerGroup: null,
                //         status: constRewardTaskStatus.STARTED,
                //         rewardAmt: 0,
                //         currentAmt: 0,
                //         forbidWithdrawIfBalanceAfterUnlock: 0,
                //         forbidXIMAAmt: 0,
                //         //targetConsumption: -rewardData.applyAmount
                //         targetConsumption: 0
                //     };
                //
                //     // create new reward group
                //     return new dbconfig.collection_rewardTaskGroup(saveObj).save();
                // }
            }
        ).then(
            freeProviderGroup2 => {
                if (freeProviderGroup2) {
                    // Successfully created reward task
                    return freeProviderGroup2;
                }
                else {
                    // Failed create reward task group or increase amount
                    return Q.reject({name: "DBError", message: "Error creating reward task", error: error})
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
        }else{
            return dbRewardTask.getRewardTaskList( query, index, limit, sortCol, useProviderGroup, providerGroups, queryObj);
        }
    },
    getRewardTaskGroupProposal: function (query) {
        let rewardTaskGroup = null;
        var queryObj = {
            playerId: ObjectId(query.playerId),
            providerGroup: query._id,
            status: 'Started'
            // createTime: {
            //     $gte: new Date(query.from),
            //     $lt: new Date(query.to)
            // }
        }

        return dbconfig.collection_rewardTaskGroup.find(queryObj)
            .populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup})
            .then(data => {
                rewardTaskGroup = data[0];
                return data;
            })
            .then(data => {
                var rewardTaskProposalQuery = {
                    'data.playerObjId': ObjectId(query.playerId),
                    'data.platformId': ObjectId(query.platformId),
                    'data.providerGroup': query._id
                }
                return dbconfig.collection_proposal.find(rewardTaskProposalQuery).populate({
                    path: "type",
                    model: dbconfig.collection_proposalType
                }).then(udata => {
                    udata.map(item => {
                        item.data.topUpProposal = item.data ? item.data.topUpProposalId : '';

                        if (item.type.name) {
                            item.data.rewardType = item.type.name;
                        }
                    })

                    let prom = dbRewardTask.getTopUpProposal(udata);

                    return Q.all([prom])
                        .then(result => {
                            result = result[0].map(item => {

                                if (rewardTaskGroup) {
                                    item.data['createTime$'] = item.createTime;
                                    item.data.useConsumption = rewardTaskGroup.useConsumption;
                                    item.data.topUpProposal = item.data ? item.data.topUpProposalId : '';
                                    if (rewardTaskGroup.providerGroup.name) {
                                        item.data.provider$ = rewardTaskGroup.providerGroup.name;
                                    }
                                    return item;
                                }
                            })
                            return result;
                        })
                })
            })

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
                if(query.selectedProviderGroupID){

                    let selectedProviderGroup = providerGroups.filter(item=>{
                        return item._id == query.selectedProviderGroupID
                    })

                    let providers = selectedProviderGroup[0] ?  selectedProviderGroup[0].providers : null;
                    if(providers){
                        queryObj.targetProviders = {$in: providers}
                    }
                    if(query.selectedProviderGroupID == 'free'){
                        queryObj.providerGroup = null;
                    }
                }
                let a, b, c, d, e, f;
                let size;
                let rewardTaskGroupSize;
                let rewardTaskGroupData;
                let rewardTaskSummary;
                let topUpAmountSum;
                a = dbconfig.collection_rewardTask.find(queryObj).count();
                b = dbconfig.collection_rewardTask.find(queryObj).sort(sortCol).skip(index).limit(limit)
                    .populate({path: "targetProviders", model: dbconfig.collection_gameProvider}).lean();

                if (useProviderGroup) {
                    c = dbconfig.collection_rewardTaskGroup.find(queryObj).count();
                    d = dbconfig.collection_rewardTaskGroup.find(queryObj).sort(sortCol).skip(index).limit(limit)
                        .populate({path: "providerGroup", model: dbconfig.collection_gameProviderGroup})
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
                return Q.all([a, b, c, d, e, f]).then(
                    data => {
                        size = data[0];

                        rewardTaskGroupSize = data[2];
                        rewardTaskGroupData = data[3];
                        rewardTaskSummary = data[4][0] ? data[4][0] : [];
                        topUpAmountSum = data[5] ? data[5].topUpAmountSum : 0;
                        let prom = dbRewardTask.getProposalInfo(data[1]);
                        return Q.all([prom])
                            .then(proposalData => {

                                let resultData = [];
                                if(query.selectedProviderGroupID == 'free'){
                                    resultData = rewardTaskGroupData;
                                    resultData.map(item=>{
                                        item.data = {}
                                        item.data.currentAmount = item.currentAmt;
                                        item.data.bonusAmount = item.rewardAmt;
                                        item.data.requiredBonusAmount = item.curConsumption;
                                        item.data.requiredUnlockAmount = item.targetConsumption;
                                        return item;
                                    })
                                }else{
                                    resultData = proposalData[0] || [];
                                }


                                return {
                                    size: size,
                                    data: resultData,
                                    rewardTaskGroupSize: rewardTaskGroupSize,
                                    rewardTaskGroupData: rewardTaskGroupData,
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
        data.map(item => {
            let proposalId = item.data.topUpProposal;
            console.log(proposalId);
            let proposal = dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
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
            prom.push(proposal);
        })
        return Promise.all(prom)
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
                    if (pdata.creator.name) {
                        item.creator = pdata.creator;
                    }
                    if (pdata.data.topUpProposal) {
                        topUpProposal = pdata.data.topUpProposal;
                    }
                    if (pdata.data.topUpAmount) {
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
     * Get total count of specific user's pending proposal
     */

    getPendingRewardTaskCount: function (query, rewardTaskWithProposalList) {
        var deferred = Q.defer();

        dbconfig.collection_proposal
            .find(query)
            .populate({
                path: "type",
                model: dbconfig.collection_proposalType
            })
            .lean().then(
            function (tasks) {
                // if the proposal result is include in the rewardtasklist
                var chosenTask = [];
                tasks.forEach(function (task) {
                    if (task.type) {
                        var tname = task.type.name;
                        if (rewardTaskWithProposalList.indexOf(tname) != -1) {
                            chosenTask.push(task);
                        }
                    }
                });
                deferred.resolve(chosenTask.length);

            }, function (error) {
                deferred.reject({name: "DBError", message: "Error finding player reward task", error: error})
            }
        );
        return deferred.promise;
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
     */
    checkPlayerRewardTaskGroupForConsumption: function (consumptionRecord) {
        let bDirty = false;
        let nonDirtyAmount = 0;
        let createTime = new Date(consumptionRecord.createTime);

        return dbRewardTaskGroup.getPlayerRewardTaskGroup(consumptionRecord.platformId, consumptionRecord.providerId, consumptionRecord.playerId, createTime).then(
            rewardTaskGroup => {
                if (rewardTaskGroup) {
                    rewardTaskGroup.curConsumption += consumptionRecord.validAmount;
                    rewardTaskGroup.currentAmt += consumptionRecord.bonusAmount;
                    let remainingCurConsumption = 0;

                    // Check whether player has lost all credit
                    if (rewardTaskGroup.currentAmt < 1) {
                        rewardTaskGroup.status = constRewardTaskStatus.NO_CREDIT;
                        rewardTaskGroup.unlockTime = createTime;
                    }
                    // Consumption reached
                    else if (rewardTaskGroup.curConsumption >= rewardTaskGroup.targetConsumption + rewardTaskGroup.forbidXIMAAmt) {
                        rewardTaskGroup.status = constRewardTaskStatus.ACHIEVED;
                        rewardTaskGroup.unlockTime = createTime;
                        remainingCurConsumption = rewardTaskGroup.curConsumption - (rewardTaskGroup.targetConsumption + rewardTaskGroup.forbidXIMAAmt);
                    }

                    let updObj = {
                        $inc: {
                            currentAmt: consumptionRecord.bonusAmount,
                            curConsumption: consumptionRecord.validAmount
                        },
                        status: rewardTaskGroup.status,
                        unlockTime: rewardTaskGroup.unlockTime
                    };

                    // let forbidXIMAAmt = rewardTaskGroup.forbidXIMAAmt - rewardTaskGroup.curConsumption;


                    // // XIMA consumption handling
                    // if (forbidXIMAAmt && forbidXIMAAmt > 0) {
                    //     let diffAmt = forbidXIMAAmt - consumptionRecord.validAmount;
                    //     let leftOverAmt = consumptionRecord.validAmount - forbidXIMAAmt;
                    //
                    //     if (diffAmt >= 0) {
                    //         // The XIMA consumption is still sufficient
                    //         updObj.$inc.forbidXIMAAmt = -consumptionRecord.validAmount;
                    //         // Mark this consumption record as dirty
                    //         bDirty = true;
                    //     } else {
                    //         // Insufficient XIMA consumption
                    //         // Add consumption to normal consumption count
                    //         updObj.$inc.forbidXIMAAmt = -rewardTaskGroup.forbidXIMAAmt;
                    //         updObj.$inc.curConsumption = consumptionRecord.validAmount - rewardTaskGroup.forbidXIMAAmt;
                    //         // Return left over amount for XIMA
                    //         nonDirtyAmount = leftOverAmt;
                    //     }
                    // }
                    // else {
                    //     updObj.$inc.curConsumption = consumptionRecord.validAmount;
                    // }

                    if (remainingCurConsumption > 0) {
                        dbRewardTaskGroup.addRemainingConsumptionToFreeAmountRewardTaskGroup(consumptionRecord.platformId, consumptionRecord.playerId, createTime, remainingCurConsumption);
                    }

                    return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                        {_id: rewardTaskGroup._id},
                        updObj,
                        {new: true}
                    );
                } else {
                    return dbRewardTaskGroup.getFreeAmountRewardTaskGroup(consumptionRecord.platformId, consumptionRecord.playerId, createTime).then(
                        freeRewardTaskGroup => {
                            if(freeRewardTaskGroup){
                                freeRewardTaskGroup.curConsumption += consumptionRecord.validAmount ? consumptionRecord.validAmount : 0;

                                freeRewardTaskGroup.currentAmt += consumptionRecord.bonusAmount ? consumptionRecord.bonusAmount : 0;

                                // Check whether player has lost all credit
                                if (freeRewardTaskGroup.currentAmt && freeRewardTaskGroup.currentAmt < 1) {
                                    freeRewardTaskGroup.status = constRewardTaskStatus.NO_CREDIT;
                                    freeRewardTaskGroup.unlockTime = createTime;
                                }
                                // Consumption reached
                                else {
                                    if(freeRewardTaskGroup.hasOwnProperty("targetConsumption") && freeRewardTaskGroup.hasOwnProperty("forbidXIMAAmt")){
                                        if (freeRewardTaskGroup.curConsumption >= freeRewardTaskGroup.targetConsumption + freeRewardTaskGroup.forbidXIMAAmt) {
                                            freeRewardTaskGroup.status = constRewardTaskStatus.ACHIEVED;
                                            freeRewardTaskGroup.unlockTime = createTime;
                                        }
                                    }
                                }

                                let updObj = {
                                    $inc: {
                                        currentAmt: consumptionRecord.bonusAmount ? consumptionRecord.bonusAmount : 0,
                                        curConsumption: consumptionRecord.validAmount ? consumptionRecord.validAmount : 0
                                    },
                                };

                                if(freeRewardTaskGroup.status){
                                    updObj.status = freeRewardTaskGroup.status;
                                }

                                if(freeRewardTaskGroup.unlockTime){
                                    updObj.unlockTime = freeRewardTaskGroup.unlockTime;
                                }

                                return dbconfig.collection_rewardTaskGroup.findOneAndUpdate(
                                    {_id: freeRewardTaskGroup._id},
                                    updObj,
                                    {new: true}
                                );
                            }

                        }
                    );
                }
            }
        ).then(
            updatedData => {
                if (updatedData) {
                    // Transfer amount to player if reward is achieved
                    // Also transfer to player (amount = 0) when reward is no credit
                    if (updatedData.status == constRewardTaskStatus.ACHIEVED || updatedData.status == constRewardTaskStatus.NO_CREDIT) {
                        return dbRewardTask.completeRewardTaskGroup(updatedData, updatedData.status);
                    }
                }
            },
            error => {
                return Q.reject({
                    name: "DBError",
                    message: "Error updating reward task group",
                    error: error
                });
            }
        ).then(
            () => {
                return {
                    bDirty: bDirty,
                    nonDirtyAmount: nonDirtyAmount
                }
            }
        )
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
     * TODO:: WORK IN PROGRESS
     * Add manual unlock support
     * NO_CREDIT will also trigger this function now
     * @param rewardGroupData
     * @param {String} unlockType
     */
    completeRewardTaskGroup: (rewardGroupData, unlockType) => {
        rewardGroupData = JSON.parse(JSON.stringify(rewardGroupData));
        let playerCreditChange;

        // Set transfer amount
        let rewardAmount = rewardGroupData.rewardAmt;

        // Mark the provider group as complete if it is manual unlocked
        let taskGroupProm = Promise.resolve();

        if (unlockType == constRewardTaskStatus.MANUAL_UNLOCK) {
            taskGroupProm = dbconfig.collection_rewardTaskGroup.findOneAndUpdate({
                platformId: rewardGroupData.platformId,
                playerId: rewardGroupData.playerId,
                providerGroup: rewardGroupData.providerGroup
            }, {
                status: constRewardTaskStatus.MANUAL_UNLOCK
            });
        }

        return taskGroupProm.then(() => {
            // Check if player is in game when reward group completed
            if (!rewardGroupData.inProvider) {
                // If player has left game, add the rewardAmt to player's credit
                playerCreditChange = {
                    $inc: {validCredit: rewardAmount}
                };

                return dbRewardTask.findOneAndUpdateWithRetry(
                    dbconfig.collection_players,
                    {_id: rewardGroupData.playerId, platform: rewardGroupData.platformId},
                    playerCreditChange,
                    {new: true}
                ).then(
                    player => {
                        if (player) {
                            let validCredit = player.validCredit;
                            let lockedCredit = player.lockedCredit;
                            let providerCredit = 0, totalCredit = 0;
                            let platformProm = dbconfig.collection_platform.findOne({_id: rewardGroupData.platformId});
                            let providerGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: rewardGroupData.providerGroup})
                                .populate({path: "providers", model: dbconfig.collection_gameProvider});

                            let rewardType = rewardGroupData && rewardGroupData.type ? rewardGroupData.type : "Free amount";

                            dbLogger.createCreditChangeLogWithLockedCredit(rewardGroupData.playerId, rewardGroupData.platformId, rewardAmount, rewardType + ":unlock", player.validCredit, 0, -rewardAmount, null, rewardGroupData);

                            Promise.all([platformProm,providerGroupProm]).then(
                                data => {
                                    let platform = data[0];
                                    let providerGroup = data[1];
                                    let promArr = [];
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
                                        providerCredit += provider ? parseFloat(provider.credit) : 0;
                                    });
                                    totalCredit = validCredit + lockedCredit + providerCredit;

                                    // Set player bonus permission to off if there's still credit available after unlock reward
                                    if (rewardGroupData && rewardGroupData.hasOwnProperty("forbidWithdrawIfBalanceAfterUnlock") && rewardGroupData.forbidWithdrawIfBalanceAfterUnlock <= totalCredit) {
                                        dbPlayerUtil.setPlayerPermission(rewardGroupData.platformId, rewardGroupData.playerId, [["applyBonus", false]]).then(
                                            () => {
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
                            return Q.reject({name: "DataError", message: "Can't update reward task and player credit"});
                        }
                    },
                    error => {
                        console.log("Update player credit failed when complete reward task", error, rewardGroupData);
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
                return true;
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

    getPlatformRewardAnalysis: function (type, period, platformId, startDate, endDate) {
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
        var proms = [];
        var dayStartTime = startDate;
        var getNextDate;
        switch (period) {
            case 'day':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 1));
                }
                break;
            case 'week':
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(newDate.setDate(newDate.getDate() + 7));
                }
                break;
            case 'month':
            default:
                getNextDate = function (date) {
                    var newDate = new Date(date);
                    return new Date(new Date(newDate.setMonth(newDate.getMonth() + 1)).setDate(1));
                }
        }
        return dbconfig.collection_proposalType.findOne({
            platformId: platformId,
            name: type
        }).then(function (data) {
            var typeId = data._id;
            while (dayStartTime.getTime() < endDate.getTime()) {
                var dayEndTime = getNextDate.call(this, dayStartTime);
                var matchObj = {
                    platformId: platformId,
                    loginTime: {$gte: dayStartTime, $lt: dayEndTime},
                    type: typeId
                };
                proms.push(dbconfig.collection_proposal
                    .aggregate(
                        {
                            $match: {
                                'data.platformId': platformId,
                                createTime: {$gte: dayStartTime, $lt: dayEndTime},
                                type: typeId
                            }
                        },
                        {
                            $group: {_id: null, number: {$sum: 1}, amount: {$sum: '$data.rewardAmount'}}
                        }
                    ))
                dayStartTime = dayEndTime;
            }
            return Q.all(proms)
        }).then(data => {
            var i = 0;
            var tempDate = startDate;
            var res = data.map(item => {
                var date = tempDate;
                var obj = {
                    _id: {date: date},
                    number: item[0] ? item[0].number : 0,
                    amount: item[0] ? item[0].amount : 0
                }
                tempDate = getNextDate(tempDate);
                return obj;
            });
            return res;
        });

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

    /**
     * // TODO:: Might need to get oldest reward to update
     * @param playerObjId
     * @returns {*}
     */
    checkPlayerRewardTaskStatus: function (playerObjId) {
        var playerObj = null;
        var taskObj = null;
        return dbconfig.collection_players.findOne({_id: playerObjId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    var providerProm = dbconfig.collection_gameProvider.find({_id: {$in: playerData.platform.gameProviders}}).lean();
                    var taskProm = dbconfig.collection_rewardTask.findOne({
                        playerId: playerObjId,
                        status: constRewardTaskStatus.STARTED,
                        //inProvider: true
                    }).lean();
                    return Q.all([providerProm, taskProm]);
                }
            }
        ).then(
            data => {
                if (data && data[0] && data[0].length > 0 && data[1]) {
                    taskObj = data[1];
                    var proms = data[0].map(
                        provider => dbGameProvider.getPlayerCreditInProvider(playerObj.name,
                            playerObj.platform.platformId, provider.providerId)
                    );
                    return Q.all(proms)
                }
            }
        ).then(
            creditData => {
                if (creditData && taskObj) {
                    var playerCredit = playerObj.lockedCredit + playerObj.validCredit;
                    var totalCredit = 0;
                    creditData.forEach(
                        credit => {
                            var gameCredit = (parseFloat(credit.gameCredit) || 0);
                            totalCredit += gameCredit < 1 ? 0 : gameCredit;
                        });
                    if (totalCredit < 1 && playerCredit < 1 && taskObj.rewardType != constRewardType.FIRST_TOP_UP) {
                        return dbconfig.collection_rewardTask.findOneAndUpdate(
                            {_id: taskObj._id, platformId: taskObj.platformId},
                            {
                                status: constRewardTaskStatus.NO_CREDIT,
                                isUnlock: true,
                                unlockTime: new Date()
                            }
                        );
                    }
                }
            }
        );
    },

    checkPlatformPlayerRewardTask: function (platformObjId) {
        var balancer = new SettlementBalancer();

        return balancer.initConns().then(function () {
            //if there is commission config, start settlement
            var stream = dbconfig.collection_rewardTask.find(
                {
                    platformId: platformObjId,
                    status: constRewardTaskStatus.STARTED,
                    inProvider: true
                }
            ).cursor({batchSize: 100});

            return Q(
                balancer.processStream({
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "checkPlatformPlayersRewardTask", {
                            playerObjIds: playerIdObjs.map(playerIdObj => playerIdObj.playerId)
                        });
                    }
                })
            );
        });
    },

    checkPlatformPlayersRewardTask: function (playerObjIds) {
        var proms = playerObjIds.map(
            playerObjId => dbRewardTask.checkPlayerRewardTaskStatus(playerObjId)
        );
        return Q.all(proms);
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
    }

};

var proto = dbRewardTaskFunc.prototype;
proto = Object.assign(proto, dbRewardTask);

// This make WebStorm navigation work
module.exports = dbRewardTask;
