'use strict';

var dbTeleSalesFunc = function () {
};
module.exports = new dbTeleSalesFunc();

let dbconfig = require('./../modules/dbproperties');
let errorUtils = require('../modules/errorUtils');
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var Q = require("q");
const constSystemParam = require('../const/constSystemParam');
const rsaCrypto = require("../modules/rsaCrypto");
const dbUtility = require('./../modules/dbutility');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constTsPhoneListStatus = require('../const/constTsPhoneListStatus');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const ObjectId = mongoose.Types.ObjectId;
const dbPlayerMail = require("../db_modules/dbPlayerMail");
const dbProposal = require("../db_modules/dbProposal");
const smsAPI = require('../externalAPI/smsAPI');
const dbLogger = require('./../modules/dbLogger');

let dbTeleSales = {
    getAllTSPhoneList: function (platformObjId) {
        return dbconfig.collection_tsPhoneList.find({platform: platformObjId}).lean();
    },

    getOneTsNewList: function (query) {
        return dbconfig.collection_tsPhoneList.findOne(query).lean();
    },

    getAdminPhoneList: function (query, index, limit, sortObj) {
        limit = limit ? limit : 10;
        index = index ? index : 0;

        let phoneListProm = Promise.resolve();
        if (query.phoneListName && query.phoneListName.length) {
            phoneListProm = dbconfig.collection_tsPhoneList.find({name: {$in: query.phoneListName}, assignees: query.admin, platform: query.platform}, {_id: 1}).lean();
        }

        return phoneListProm.then(
            phoneListData => {
                let phoneListQuery = {
                    platform: query.platform,
                    assignee: query.admin,
                    registered: false
                }

                if (phoneListData && phoneListData.length && query.phoneListName && query.phoneListName.length) {
                    phoneListQuery.tsPhoneList = {$in: phoneListData.map(phoneList => phoneList._id)}
                }

                phoneListQuery["$and"] = [{startTime: {$lt: new Date()}}, {endTime: {$gte: new Date()}}];
                if (query.resultName && query.resultName.length) {
                    phoneListQuery.resultName = {$in: query.resultName};
                }

                if (query.feedbackStart && query.feedbackEnd) {
                    phoneListQuery["$and"].push({$or: {lastFeedbackTime: {$gte: query.feedbackStart, $lt: query.feedbackEnd}}});
                }
                if (query.distributeStart && query.distributeEnd) {
                    phoneListQuery["$and"].push({startTime: {$gte: query.distributeStart, $lt: query.distributeEnd}})
                }



                if (query.hasOwnProperty("reclaimDays") && query.reclaimDays != null) {
                    let countReclaimDate = dbUtility.getNdaylaterFromSpecificStartTime(query.reclaimDays + 1, new Date());
                    let reclaimDate =dbUtility.getTargetSGTime(countReclaimDate);
                    switch (query.reclaimDayOperator) {
                        case '<=':
                            phoneListQuery["$and"].push({endTime: {$lte: reclaimDate.endTime}});
                            break;
                        case '>=':
                            phoneListQuery["$and"].push({endTime: {$gte: reclaimDate.startTime}});
                            break;
                        case '=':
                            phoneListQuery["$and"].push({endTime: {$gte: reclaimDate.startTime, $lte: reclaimDate.endTime}});
                            break;
                        case 'range':
                            if (query.hasOwnProperty("reclaimDaysTwo") && query.reclaimDaysTwo != null) {
                                let countReclaimDate2 = dbUtility.getNdaylaterFromSpecificStartTime(query.reclaimDaysTwo + 1, new Date());
                                let reclaimDate2 = dbUtility.getTargetSGTime(countReclaimDate2);
                                phoneListQuery["$and"].push({endTime: {$gte: reclaimDate.startTime, $lte: reclaimDate2.endTime}});
                            }
                            break;
                    }
                }

                if (query.hasOwnProperty("feedbackTimes") && query.feedbackTimes != null) {
                    let feedbackTimes = query.feedbackTimes;
                    switch (query.feedbackTimesOperator) {
                        case '<=':
                            phoneListQuery.feedbackTimes = {$lte: feedbackTimes};
                            break;
                        case '>=':
                            phoneListQuery.feedbackTimes = {$gte: feedbackTimes};
                            break;
                        case '=':
                            phoneListQuery.feedbackTimes = feedbackTimes;
                            break;
                        case 'range':
                            if (query.hasOwnProperty("feedbackTimesTwo") && query.feedbackTimesTwo != null) {
                                phoneListQuery.feedbackTimes = {
                                    $gte: feedbackTimes,
                                    $lte: query.feedbackTimesTwo
                                };
                            }
                            break;
                    }
                }

                if (query.hasOwnProperty("assignTimes") && query.assignTimes != null) {
                    let assignTimes = query.assignTimes;
                    switch (query.assignTimesOperator) {
                        case '<=':
                            phoneListQuery.assignTimes = {$lte: assignTimes};
                            break;
                        case '>=':
                            phoneListQuery.assignTimes = {$gte: assignTimes};
                            break;
                        case '=':
                            phoneListQuery.assignTimes = assignTimes;
                            break;
                        case 'range':
                            if (query.hasOwnProperty("assignTimesTwo") && query.assignTimesTwo != null) {
                                phoneListQuery.assignTimes = {
                                    $gte: assignTimes,
                                    $lte: query.assignTimesTwo
                                };
                            }
                            break;
                    }
                }

                if (query.isFilterDangerZone) {
                    phoneListQuery.isInDangerZone = false;
                }

                let tsDistributePhoneCountProm = dbconfig.collection_tsDistributedPhone.find(phoneListQuery).count();
                let tsDistributePhoneProm = dbconfig.collection_tsDistributedPhone.find(phoneListQuery).sort(sortObj).skip(index).limit(limit)
                    .populate({path: 'tsPhoneList', model: dbconfig.collection_tsPhoneList, select: "name"})
                    .populate({path: 'tsPhone', model: dbconfig.collection_tsPhone}).lean();

                return Promise.all([tsDistributePhoneCountProm, tsDistributePhoneProm]);
            }
        ).then(
            ([tsDistributePhoneCount, tsDistributePhone]) => {
                if (tsDistributePhone && tsDistributePhone.length) {
                    tsDistributePhone.forEach(distributePhone => {
                        if (distributePhone.tsPhone.phoneNumber) {
                            distributePhone.tsPhone.phoneNumber = rsaCrypto.decrypt(distributePhone.tsPhone.phoneNumber)
                        }
                    })
                }
                return {data: tsDistributePhone, size: tsDistributePhoneCount};
            }
        )
    },

    getAdminPhoneReminderList: function (query, index, limit, sortObj) {
        limit = limit ? limit : 10;
        index = index ? index : 0;

        return dbconfig.collection_tsDistributedPhone.aggregate([
            {
                $match: {
                    platform: ObjectId(query.platform),
                    assignee: ObjectId(query.admin),
                    remindTime: {$lte: new Date()},
                    startTime: {$lt: new Date()},
                    endTime: {$gte: new Date()}
                }
            },
            {
                $group: {
                    _id: null,
                    distributedPhoneIds: {$addToSet:{ $cond: [{$or: [ {$lt: [ "$lastFeedbackTime", "$remindTime" ]}, {$eq: ["$lastFeedbackTime", null]} ]}, "$_id", "$null"]}}
                }
            }
        ]).read("secondaryPreferred").then(
            data => {
                if (!(data && data.length)) {
                    return [0, []];
                }
                let tsDistributedPhoneObjId = data.map(tsDistributedPhone => tsDistributedPhone.distributedPhoneIds);
                let phoneListQuery = {_id: {$in: tsDistributedPhoneObjId}};
                let tsDistributePhoneCountProm = dbconfig.collection_tsDistributedPhone.find(phoneListQuery).count();
                let tsDistributePhoneProm = dbconfig.collection_tsDistributedPhone.find(phoneListQuery).sort(sortObj).skip(index).limit(limit)
                    .populate({path: 'tsPhoneList', model: dbconfig.collection_tsPhoneList, select: "name"})
                    .populate({path: 'tsPhone', model: dbconfig.collection_tsPhone}).lean();

                return Promise.all([tsDistributePhoneCountProm, tsDistributePhoneProm]);

            }
        ).then(
            ([tsDistributePhoneCount, tsDistributePhone]) => {
                if (tsDistributePhone && tsDistributePhone.length) {
                    tsDistributePhone.forEach(distributePhone => {
                        if (distributePhone.tsPhone.phoneNumber) {
                            distributePhone.tsPhone.phoneNumber = rsaCrypto.decrypt(distributePhone.tsPhone.phoneNumber)
                        }
                    })
                }
                return {data: tsDistributePhone, size: tsDistributePhoneCount};
            }
        );
    },

    createTsPhonePlayerFeedback: function (inputData) {
        return dbconfig.collection_tsPhoneFeedback.find({tsPhone: inputData.tsPhone}).lean().then(
            tsFeedbackData => {
                let playerFeedbackProm = [];
                let curFeedBack = dbconfig.collection_playerFeedback(inputData).save();
                playerFeedbackProm.push(curFeedBack);
                if (tsFeedbackData && tsFeedbackData.length) {
                    tsFeedbackData.forEach(tsFeedback => {
                        tsFeedback.playerId = inputData.playerId;
                        let saveObj = {
                            playerId: inputData.playerId,
                            platform: tsFeedback.platform,
                            createTime: tsFeedback.createTime,
                            adminId: tsFeedback.adminId,
                            content: tsFeedback.content,
                            result: tsFeedback.result,
                            resultName: tsFeedback.resultName,
                            topic: tsFeedback.topic
                        }
                        playerFeedbackProm.push(dbconfig.collection_playerFeedback(saveObj).save())
                    })
                }
                return Promise.all(playerFeedbackProm);
            }
        ).then(
            () => {
                return dbTeleSales.createTsPhoneFeedback(inputData);
                // return addTsFeedbackCount(inputData);
            }
        );
    },

    createTsPhoneFeedback: function (inputData) {

        let isSuccessFeedback = false;

        return dbconfig.collection_platform.findOne({_id: inputData.platform}, {definitionOfAnsweredPhone: 1}).lean().then(
            platformData => {
                if (platformData && platformData.definitionOfAnsweredPhone
                    && platformData.definitionOfAnsweredPhone.length && platformData.definitionOfAnsweredPhone.indexOf(inputData.result) > -1) {
                    isSuccessFeedback = true;
                }
                inputData.isSuccessful = isSuccessFeedback;

                return dbconfig.collection_tsPhoneFeedback(inputData).save();
            }
        ).then(
            (feedbackData) => {
                if (!feedbackData) {
                    return Promise.reject({name: "DataError", message: "fail to save feedback data"});
                }

                return dbconfig.collection_tsDistributedPhone.findOneAndUpdate({
                    tsPhone: inputData.tsPhone,
                    assignee: inputData.adminId,
                    platform: inputData.platform
                }, {
                    $inc: {feedbackTimes: 1},
                    lastFeedbackTime: new Date(),
                    isUsed: true,
                    isSucceedBefore: isSuccessFeedback,
                    resultName: inputData.resultName
                }, {new: true}).lean();
            }
        ).then(
            tsDistributedPhoneData => {
                if (!tsDistributedPhoneData) {
                    return Promise.reject({name: "DataError", message: "fail to update tsDistributedPhone data"});
                }
                return addTsFeedbackCount(inputData, isSuccessFeedback);
            }
        );
    },

    getTsPhoneFeedback: function (query) {
        return dbconfig.collection_tsPhoneFeedback.find(query)
            .populate({path: "adminId", model: dbconfig.collection_admin}).lean();
    },

    searchTsSMSLog: function (data, index, limit) {
        if (data) {
            index = index || 0;
            limit = limit || constSystemParam.MAX_RECORD_NUM;
            var query = {
                tsDistributedPhone: data.tsDistributedPhone,
                status: data.status === 'all' ? undefined : data.status,
                type: {$nin: ["registration"]}
            };
            if (data.isAdmin && !data.isSystem) {
                query.adminName = {$exists: true, $ne: null};
            } else if (data.isSystem && !data.isAdmin) {
                query.adminName = {$eq: null};
            }

            if (data.platformId) {
                query.platformId = data.platformId;
            }
            // Strip any fields which have value `undefined`
            query = JSON.parse(JSON.stringify(query));
            addOptionalTimeLimitsToQuery(data, query, 'createTime');
            var a = dbconfig.collection_smsLog.find(query).sort({createTime: -1}).skip(index).limit(limit);
            var b = dbconfig.collection_smsLog.find(query).count();
            return Promise.all([a, b]).then(
                result => {
                    if(result[0].length > 0){
                        result[0] = excludeTelNum(result[0]);
                    }
                    return {data: result[0], size: result[1]};
                }
            )
        }
    },

    getTSPhoneListName: function (query) {
        return dbconfig.collection_tsPhoneList.distinct("name", query);
    },

    getActivePhoneListNameForAdmin: function (platformObjId, adminId) {
        return dbconfig.collection_tsDistributedPhone.distinct("tsPhoneList", {startTime: {$lte: new Date()}, endTime:{$gte: new Date()}, platform: platformObjId, assignee: adminId}).then(
            tsPhoneListObjIds => {
                if (!tsPhoneListObjIds) {
                    return [];
                }
                let proms = [];

                tsPhoneListObjIds.map(tsPhoneListObjId => {
                    let prom = dbconfig.collection_tsPhoneList.findOne({_id: tsPhoneListObjId}, {name: 1}).lean();
                    proms.push(prom);
                });

                return Promise.all(proms);
            }
        ).then(
            tsPhoneLists => {
                return tsPhoneLists.map(tsPhoneList => tsPhoneList.name);
            }
        );
    },

    getTsPhoneListRecyclePhone: function (inputData) {
        return dbconfig.collection_tsPhone.find({
            platform: inputData.platform,
            tsPhoneList: inputData.tsPhoneList,
            $or: [{isUsed: false}, {isSucceedBefore: true, registered: false}]
        }).lean();
    },

    getRecycleBinTsPhoneList: function (platform, startTime, endTime, status, name, index, limit, sortCol) {
        if(!platform){
            return;
        }

        let sendQuery = {
            platform: platform,
            status: {$in: [constTsPhoneListStatus.PERFECTLY_COMPLETED, constTsPhoneListStatus.FORCE_COMPLETED, constTsPhoneListStatus.DECOMPOSED]},
            recycleTime: {
                $gte: startTime,
                $lt: endTime
            },
        };

        if (status) {
            sendQuery.status = {$in: status};
        }

        if (name) {
            sendQuery.name = {$in: name};
        }

        let phoneListResult = dbconfig.collection_tsPhoneList.find(sendQuery).skip(index).limit(limit).sort(sortCol).lean();
        let totalPhoneListResult = dbconfig.collection_tsPhoneList.find(sendQuery).count();
        return Promise.all([phoneListResult, totalPhoneListResult]).then(
            result => {
                if(result && result.length > 0){
                    // count total valid player
                    if (result[0] && result[0].length) {
                        dbconfig.collection_partnerLevelConfig.findOne({platform: platform}).lean().then(
                            partnerLevelConfigData => {
                                if (!partnerLevelConfigData) {
                                    return Promise.reject({name: "DataError", message: "Cannot find active player"});
                                }
                                let promArr = [];
                                result[0].forEach(phoneList => {
                                    let updateProm = dbconfig.collection_players.find({
                                        tsPhoneList: phoneList._id,
                                        platform: platform,
                                        topUpTimes: {$gte: partnerLevelConfigData.validPlayerTopUpTimes},
                                        topUpSum: {$gte: partnerLevelConfigData.validPlayerTopUpAmount},
                                        consumptionTimes: {$gte: partnerLevelConfigData.validPlayerConsumptionTimes},
                                        consumptionSum: {$gte: partnerLevelConfigData.validPlayerConsumptionAmount},
                                    }).count().then(
                                        playerCount => {
                                            return dbconfig.collection_tsPhoneList.update({_id: phoneList._id}, {totalValidPlayer: playerCount});
                                        }
                                    );
                                    promArr.push(updateProm);
                                });
                                return Promise.all(promArr);
                            }
                        ).catch(errorUtils.reportError);
                    }

                    return {data: result[0], size: result[1]};
                }
            }
        )
    },

    getTsDistributedPhoneDetail: (distributedPhoneObjId) => {
        let tsDistributedPhone;
        return dbconfig.collection_tsDistributedPhone.findOne({_id: distributedPhoneObjId}).lean().then(
            dPhoneData => {
                if (!dPhoneData) {
                    return Promise.reject({message: "Phone detail not found"});
                }
                tsDistributedPhone = dPhoneData;

                let tsPhoneProm = dbconfig.collection_tsPhone.findOne({_id: tsDistributedPhone.tsPhone}).lean();
                let tsAssigneeProm = dbconfig.collection_tsAssignee.findOne({admin: tsDistributedPhone.assignee, tsPhoneList: tsDistributedPhone.tsPhoneList}).lean();
                let feedbackProm = dbconfig.collection_tsPhoneFeedback.find({tsPhone: tsDistributedPhone.tsPhone}).populate({path: "adminId", model: dbconfig.collection_admin}).lean();
                let tsPhoneListProm = dbconfig.collection_tsPhoneList.findOne({_id: tsDistributedPhone.tsPhoneList}).lean();

                return Promise.all([tsPhoneProm, tsAssigneeProm, feedbackProm, tsPhoneListProm]);
            }
        ).then(
            ([tsPhone, tsAssignee, feedbacks, tsPhoneList]) => {
                if (!tsPhone) {
                    return Promise.reject({message: "tsPhone not found"});
                }
                if (!tsAssignee) {
                    return Promise.reject({message: "tsAssignee not found"});
                }
                if (!tsPhoneList) {
                    return Promise.reject({message: "tsPhoneList not found"});
                }
                tsDistributedPhone.tsPhone = tsPhone;
                tsDistributedPhone.assignee = tsAssignee;
                tsDistributedPhone.feedbacks = feedbacks;
                tsDistributedPhone.tsPhoneList = tsPhoneList;
                tsDistributedPhone.tsPhone.phoneNumber = rsaCrypto.decrypt(tsDistributedPhone.tsPhone.phoneNumber);

                return tsDistributedPhone;
            }
        );
    },

    distributePhoneNumber: function (inputData) {
        console.log("tsListObjId", inputData.tsListObjId);
        console.log("tsListPlatform", inputData.platform);
        if (!(inputData.tsListObjId && inputData.platform)) {
            return Promise.reject({name: "DataError", message: "Invalid data"});
        }

        let distributeStatus;
        let totalAssignee;
        let tsPhoneListObj;
        let tsAssigneeArr;
        let totalDistributed = 0;

        return dbconfig.collection_tsPhoneList.findOne({
            _id: inputData.tsListObjId,
            status: {$in: [constTsPhoneListStatus.PRE_DISTRIBUTION, constTsPhoneListStatus.DISTRIBUTING, constTsPhoneListStatus.NOT_ENOUGH_CALLER]}
        }).lean().then(
            tsPhoneListData => {
                if (!tsPhoneListData) {
                    return Promise.reject({name: "DataError", message: "Cannot find tsPhoneList"});
                }
                tsPhoneListObj =  tsPhoneListData;
                return dbconfig.collection_tsAssignee.find({
                    platform: inputData.platform,
                    tsPhoneList: inputData.tsListObjId,
                    status: 1
                }).lean();
            }
        ).then(
            tsAssigneeData => {
                if (!(tsAssigneeData && tsAssigneeData.length)) {
                    return Promise.reject({name: "DataError", message: "Cannot find tsAssignee"});
                }
                tsAssigneeArr = tsAssigneeData;
                totalAssignee = tsAssigneeData.length;

                return dbconfig.collection_tsPhone.find({
                    tsPhoneList: tsPhoneListObj._id,
                    platform: inputData.platform,
                    registered: false,
                    // assignTimes: {$lt: tsPhoneListObj.callerCycleCount},
                    $and:[{$or: [{distributedEndTime: null}, {distributedEndTime: {$lt: new Date()}}]}, {$or: [{assignTimes: {$lt: tsPhoneListObj.callerCycleCount}}, {assignTimes: {$eq: 0}}]}]
                    // $or: [{distributedEndTime: null}, {distributedEndTime: {$lt: new Date()}}]
                }).sort({assignTimes: 1, createTime: 1}).lean();
            }
        ).then(
            tsPhoneData => {
                if (!(tsPhoneData && tsPhoneData.length)) {
                    return true; // bypass distribute phone, check and update phonelist only
                    // return Promise.reject({name: "DataError", message: "Cannot find tsPhone"});
                }
                tsPhoneData = JSON.parse(JSON.stringify(tsPhoneData));

                let reclaimTime = dbUtility.getNdaylaterFromSpecificStartTime(tsPhoneListObj.reclaimDayCount, new Date());
                let phoneNumberEndTime =dbUtility.getTargetSGTime(reclaimTime);
                let phoneNumberStartTime = dbUtility.getTargetSGTime(new Date()).startTime;
                phoneNumberStartTime.setHours(tsPhoneListObj.dailyDistributeTaskHour);
                phoneNumberStartTime.setMinutes(tsPhoneListObj.dailyDistributeTaskMinute);
                phoneNumberStartTime.setSeconds(tsPhoneListObj.dailyDistributeTaskSecond);
                let totalPhoneAdded = 0;
                let promArr = [];
                function sortAssigneePhoneCount(a, b) {
                    let aTsPhone = a.updateObj && a.updateObj.tsPhone && a.updateObj.tsPhone.length || 0;
                    let bTsPhone = b.updateObj && b.updateObj.tsPhone && b.updateObj.tsPhone.length || 0;
                    return aTsPhone - bTsPhone;
                }

                if (tsPhoneListObj.hasOwnProperty("callerCycleCount") && (totalAssignee >= tsPhoneListObj.callerCycleCount)) {
                    for (let i = 0; i < tsPhoneData.length; i++) {
                        if (totalPhoneAdded >= tsPhoneListObj.dailyCallerMaximumTask) {
                            break;
                        }
                        for (let j = 0; j < tsAssigneeArr.length; j++) {
                            if (!tsPhoneData[i].assignee || tsPhoneData[i].assignee.indexOf(String(tsAssigneeArr[j].admin)) == -1) {
                                if (!tsAssigneeArr[j].updateObj) {
                                    tsAssigneeArr[j].updateObj = {
                                        tsPhone: []
                                    };
                                }
                                totalPhoneAdded++;
                                tsAssigneeArr[j].updateObj.tsPhone.push({
                                    tsPhoneObjId: tsPhoneData[i]._id,
                                    assignTimes: tsPhoneData[i].assignTimes
                                });
                                tsAssigneeArr.sort(sortAssigneePhoneCount);
                                break;
                            }
                        }
                    }

                    tsAssigneeArr.forEach(tsAssignee => {
                        let assignedCount = 0;
                        if (tsAssignee.updateObj && tsAssignee.updateObj.tsPhone && tsAssignee.updateObj.tsPhone.length) {
                            assignedCount = tsAssignee.updateObj.tsPhone.length;
                            distributeStatus = constTsPhoneListStatus.DISTRIBUTING;
                            let distributeListSaveData = {
                                platform: inputData.platform,
                                tsPhoneList: inputData.tsListObjId,
                                assignee: tsAssignee.admin
                            };
                            let distributedPhoneListProm = dbconfig.collection_tsDistributedPhoneList.findOneAndUpdate(
                                distributeListSaveData, distributeListSaveData, {upsert: true, new: true}).lean().then(
                                distributedPhoneListData => {
                                    tsAssignee.updateObj.tsPhone.forEach(tsPhoneUpdate => {
                                        let dangerZoneList = tsPhoneListObj.dangerZoneList || [];
                                        let isInDangerZone = false;

                                        dangerZoneList.map(dangerZone => {
                                            if (dangerZone.province == tsPhoneUpdate.province && dangerZone.city == tsPhoneUpdate.city) {
                                                isInDangerZone = true;
                                            }
                                        });

                                        if (!tsPhoneUpdate.assignTimes) {
                                            totalDistributed++;
                                        }

                                        dbconfig.collection_tsDistributedPhone({
                                            platform: inputData.platform,
                                            tsPhoneList: inputData.tsListObjId,
                                            tsDistributedPhoneList: distributedPhoneListData._id,
                                            tsPhone: ObjectId(tsPhoneUpdate.tsPhoneObjId),
                                            province: tsPhoneUpdate.province,
                                            city: tsPhoneUpdate.city,
                                            isInDangerZone: isInDangerZone,
                                            assignTimes: (tsPhoneUpdate.assignTimes + 1) || 1,
                                            assignee: tsAssignee.admin,
                                            startTime: phoneNumberStartTime,
                                            endTime: phoneNumberEndTime.endTime,
                                            remindTime: phoneNumberEndTime.endTime
                                        }).save().catch(errorUtils.reportError);
                                    });

                                    dbconfig.collection_tsPhone.update({_id: {$in: tsAssignee.updateObj.tsPhone.map(tsPhone => tsPhone.tsPhoneObjId)}}, {
                                        $addToSet: {assignee: tsAssignee.admin},
                                        $inc: {assignTimes: 1},
                                        distributedEndTime: phoneNumberEndTime.endTime
                                    }, {multi: true}).catch(errorUtils.reportError);
                                    if (assignedCount) {
                                        dbconfig.collection_tsAssignee.findOneAndUpdate({_id: tsAssignee._id}, {$inc: {assignedCount: assignedCount}}).lean().catch(errorUtils.reportError);
                                    }
                                })

                            promArr.push(distributedPhoneListProm);
                        }
                    });
                } else {
                    distributeStatus = constTsPhoneListStatus.NOT_ENOUGH_CALLER;
                }

                return Promise.all(promArr);
            }
        ).then(
            () => {
                if (distributeStatus) {
                    return true;
                } else {

                    return dbconfig.collection_tsPhone.find({
                        tsPhoneList: tsPhoneListObj._id,
                        platform: inputData.platform,
                        registered: false,
                        $or: [{assignTimes: {$lt: tsPhoneListObj.callerCycleCount}}, {assignTimes: {$gte: tsPhoneListObj.callerCycleCount}, $or: [{distributedEndTime: {$gte: new Date()}},{distributedEndTime: null}]}]
                    }).count().then(
                        unfinishedTsPhone => {
                            if (!unfinishedTsPhone) {
                                return dbconfig.collection_tsPhone.find({tsPhoneList: tsPhoneListObj._id, platform: inputData.platform, isUsed: false}).count().then(
                                    notUsedCount => {
                                        if (notUsedCount) {
                                            distributeStatus = constTsPhoneListStatus.HALF_COMPLETE;
                                        } else {
                                            distributeStatus = constTsPhoneListStatus.PERFECTLY_COMPLETED;
                                        }
                                    }
                                )
                            }
                        }
                    )

                }
            }
        ).then(
            () => {
                let updateObj = {
                    $inc: {totalDistributed: totalDistributed},
                    status: distributeStatus
                }
                if (distributeStatus == constTsPhoneListStatus.HALF_COMPLETE || distributeStatus == constTsPhoneListStatus.PERFECTLY_COMPLETED) {
                    updateObj.recycleTime = new Date();
                }
                return dbconfig.collection_tsPhoneList.findOneAndUpdate({_id: tsPhoneListObj._id}, updateObj).lean();
            }
        );
    },

    updateTsPhoneDistributedPhone: function (query, updateData) {
        return dbconfig.collection_tsDistributedPhone.findOneAndUpdate(query, updateData).lean();
    },

    getTsDistributedPhoneReminder: function (platform, assignee) {
        return dbconfig.collection_tsDistributedPhone.aggregate([
            {
                $match: {
                    platform: ObjectId(platform),
                    assignee: ObjectId(assignee),
                    remindTime: {$lte: new Date()},
                    startTime: {$lt: new Date()},
                    endTime: {$gte: new Date()}
                }
            },
            {
                $group: {
                    _id: null,
                    count: {$sum:{ $cond: [{$or: [ {$lt: [ "$lastFeedbackTime", "$remindTime" ]}, {$eq: ["$lastFeedbackTime", null]} ]}, 1, 0]}}
                }
            }
        ]).read("secondaryPreferred").then(
            data => {
                return data && data[0] && data[0].count || 0;
            }
        );
    },

    getTsPhoneImportRecord: function (query) {
       return  dbconfig.collection_tsPhoneImportRecord.find(query).sort({importTime: 1}).lean();
    },

    updateTsPhoneList: function (query, updateData) {
        return dbconfig.collection_tsPhoneList.findOneAndUpdate(query, updateData).lean().then(
            tsPhoneOldData => {
                if (tsPhoneOldData) {
                    let tsPhoneQuery = {
                        tsPhoneList: tsPhoneOldData._id
                    }
                    if (tsPhoneOldData.dangerZoneList && tsPhoneOldData.dangerZoneList.length && updateData.dangerZoneList && !updateData.dangerZoneList.length) {
                        // delete danger zone in tsPhone
                        dbconfig.collection_tsDistributedPhone.update(
                            tsPhoneQuery, {isInDangerZone: false}, {multi: true}).catch(errorUtils.reportError);
                    } else if (!(tsPhoneOldData.dangerZoneList && tsPhoneOldData.dangerZoneList.length) && updateData.dangerZoneList && updateData.dangerZoneList.length) {
                        // add danger zone in tsPhone
                        tsPhoneQuery.$or = [];
                        for (let i = 0; i < i < updateData.dangerZoneList.length; i++) {
                            if (updateData.dangerZoneList[i].city && updateData.dangerZoneList[i].province) {
                                tsPhoneQuery.$or.push({city: updateData.dangerZoneList[i].city, province: updateData.dangerZoneList[i].province})
                            }
                        }
                        if (tsPhoneQuery.$or.length) {
                            dbconfig.collection_tsDistributedPhone.update(
                                tsPhoneQuery, {isInDangerZone: true}, {multi: true}).catch(errorUtils.reportError);
                        }
                    } else if (tsPhoneOldData.dangerZoneList && tsPhoneOldData.dangerZoneList.length && updateData.dangerZoneList && updateData.dangerZoneList.length) {
                        let addedZone = [];
                        let deletedZone = [];
                        let compareCity;
                        let compareProvince;
                        function findDangerZone (item) {
                            return item.city == compareCity && item.province == compareProvince;
                        }
                        updateData.dangerZoneList.forEach(inputZone => {
                            compareCity = inputZone.city;
                            compareProvince = inputZone.province;
                            if (compareCity && compareProvince && !tsPhoneOldData.dangerZoneList.find(findDangerZone)){
                                addedZone.push({city: compareCity, province: compareProvince});
                            }
                        });

                        compareCity = "";
                        compareProvince = "";

                        tsPhoneOldData.dangerZoneList.forEach(oriZone => {
                            compareCity = oriZone.city;
                            compareProvince = oriZone.province;
                            if (compareCity && compareProvince && !updateData.dangerZoneList.find(findDangerZone)){
                                deletedZone.push({city: compareCity, province: compareProvince});
                            }
                        });

                        if (addedZone.length) {
                            dbconfig.collection_tsDistributedPhone.update(
                                {
                                    tsPhoneList: tsPhoneOldData._id,
                                    $or: addedZone
                                }, {isInDangerZone: true}, {multi: true}).catch(errorUtils.reportError);
                        }
                        if (deletedZone.length) {
                            dbconfig.collection_tsDistributedPhone.update(
                                {
                                    tsPhoneList: tsPhoneOldData._id,
                                    $or: deletedZone
                                }, {isInDangerZone: false}, {multi: true}).catch(errorUtils.reportError);
                        }

                    }

                }
                return tsPhoneOldData;
            }
        )
    },

    getTsAssignees: function(tsPhoneListObjId){
        let query = {
            tsPhoneList: tsPhoneListObjId
        };

        return dbconfig.collection_tsAssignee.find(query).then(assignees=>assignees);
    },

    getTsAssigneesCount: function(query){
        return dbconfig.collection_tsAssignee.find(query).count();
    },

    updateTsAssignees: (platformObjId, tsPhoneListObjId, assignees) => {
        if(assignees && assignees.length > 0) {
            let updateOrAddProm = [];
            assignees.forEach(assignee => {
                updateOrAddProm.push(
                    dbconfig.collection_admin.findOne({adminName: assignee.adminName}).lean().then(admin => {
                        let updateData = {
                            platform: assignee.platform || platformObjId,
                            tsPhoneList: assignee.tsPhoneList || tsPhoneListObjId,
                            adminName: assignee.adminName,
                            admin: assignee.admin || admin._id,
                            status: assignee.status,
                            createTime: assignee.createTime || new Date
                        };
                        let updateQuery = {
                            tsPhoneList: tsPhoneListObjId,
                            admin: admin._id
                        };
                        return dbconfig.collection_tsAssignee.findOneAndUpdate(updateQuery, updateData, {upsert: true});
                    })
                )
            });
            return Promise.all(updateOrAddProm);
        }
    },

    removeTsAssignees: (platformObjId, tsPhoneListObjId, adminNames) => {
        if(adminNames && adminNames.length > 0) {
            let removeProm = [];
            adminNames.forEach(adminName => {
                removeProm.push(
                    dbconfig.collection_tsAssignee.remove({
                        platform: platformObjId,
                        tsPhoneList: tsPhoneListObjId,
                        adminName: adminName
                    })
                )
            });
            return Promise.all(removeProm);
        }
    },

    updateTsPhoneListStatus: (tsPhoneList, status) => {
        return dbconfig.collection_tsPhoneList.findOneAndUpdate({_id: tsPhoneList}, {status: status}).lean();
    },

    forceCompleteTsPhoneList: (tsPhoneList) => {
        return dbconfig.collection_tsPhoneList.findOneAndUpdate({_id: tsPhoneList, status: {$ne: constTsPhoneListStatus.FORCE_COMPLETED}}, {status: constTsPhoneListStatus.FORCE_COMPLETED, recycleTime: new Date()}).lean().then(
            tsPhoneListData => {
                dbconfig.collection_tsPhone.update(
                    {
                        tsPhoneList: tsPhoneList,
                        registered: false,
                        distributedEndTime: {$gte: new Date()}
                    }, {distributedEndTime: new Date()}, {multi: true}).catch(errorUtils.reportError);
                dbconfig.collection_tsDistributedPhone.update(
                    {
                        tsPhoneList: tsPhoneList,
                        registered: false,
                        endTime: {$gte: new Date()}
                    }, {endTime: new Date()}, {multi: true}).catch(errorUtils.reportError);
                return tsPhoneListData;
            }
        )
    },

    decomposeTsPhoneList: (sourceTsPhoneListName, tsPhones) => {
        let promArr = [];
        let sourceTsPhoneList = tsPhones[0].tsPhoneList;
        if (!sourceTsPhoneList) {
            return;
        }
        dbconfig.collection_tsPhoneList.findOneAndUpdate({_id: sourceTsPhoneList}, {status: constTsPhoneListStatus.DECOMPOSED}).lean().catch(errorUtils.reportError);
        tsPhones.forEach(
            tsPhone => {
                let tsPhoneQuery = dbconfig.collection_tsPhoneFeedback.findOne({
                    platform: tsPhone.platform,
                    tsPhone: tsPhone._id,
                    isSuccessful: true
                }).sort({createTime: -1}).lean().then(
                    tsPhoneFeedbackData => {
                        let saveObj = {
                            encodedPhoneNumber: dbUtility.encodePhoneNum(rsaCrypto.decrypt(tsPhone.phoneNumber)),
                            sourcePlatform: tsPhone.platform,
                            sourceTsPhone: tsPhone._id,
                            sourceTsPhoneList: tsPhone.tsPhoneList,
                            sourceTsPhoneListName: sourceTsPhoneListName
                        };

                        if (tsPhoneFeedbackData) {
                            saveObj.lastSuccessfulFeedbackTime = tsPhoneFeedbackData.createTime || "";
                            saveObj.lastSuccessfulFeedbackTopic = tsPhoneFeedbackData.topic || "";
                            saveObj.lastSuccessfulFeedbackContent = tsPhoneFeedbackData.content || "";
                        }
                        return dbconfig.collection_tsPhoneTrade(saveObj).save()
                    }).catch(errorUtils.reportError);
                promArr.push(tsPhoneQuery);
            }
        )
        return Promise.all(promArr);
    },

    getDistributionDetails: (platformObjId, tsPhoneListObjId, adminNames) => {
        let distributionDetails = [];
        let phoneListProm = dbconfig.collection_tsPhoneList.findOne({_id: tsPhoneListObjId});
        let assigneeProm = dbconfig.collection_tsAssignee.find({
            platform: platformObjId,
            tsPhoneList: tsPhoneListObjId,
            adminName: {
                $in: adminNames
            }
        });

        return Promise.all([phoneListProm, assigneeProm]).then(data => {
            let phoneList = data[0];
            let assignees = data[1];

            if(assignees && assignees.length > 0 && phoneList) {

                //count total valid player
                dbconfig.collection_partnerLevelConfig.findOne({platform: platformObjId}).lean().then(
                    partnerLevelConfigData => {
                        if (!partnerLevelConfigData) {
                            return Promise.reject({name: "DataError", message: "Cannot find active player"});
                        }
                        let promArr = [];
                        assignees.forEach(assignee => {
                        let updateProm = dbconfig.collection_players.find({
                            tsPhoneList: phoneList._id,
                            tsAssignee: assignee.admin,
                            platform: platformObjId,
                            topUpTimes: {$gte: partnerLevelConfigData.validPlayerTopUpTimes},
                            topUpSum: {$gte: partnerLevelConfigData.validPlayerTopUpAmount},
                            consumptionTimes: {$gte: partnerLevelConfigData.validPlayerConsumptionTimes},
                            consumptionSum: {$gte: partnerLevelConfigData.validPlayerConsumptionAmount},
                        }).count().then(
                            playerCount => {
                                return dbconfig.collection_tsAssignee.update({_id: assignee._id}, {effectivePlayerCount: playerCount});
                            }
                        );
                        promArr.push(updateProm);
                        });
                        return Promise.all(promArr);
                    }
                ).catch(errorUtils.reportError);

                let totalDistributed = phoneList.totalDistributed;
                let totalUsed = phoneList.totalUsed;
                let totalSuccess = phoneList.totalSuccess;
                assignees.forEach(assignee => {
                    let assigneeDistributionDetail = {
                        adminName: assignee.adminName,
                        distributedCount: assignee.assignedCount,
                        fulfilledCount: assignee.phoneUsedCount,
                        successCount: assignee.successfulCount,
                        registeredCount: assignee.registrationCount,
                        topUpCount: assignee.singleTopUpCount,
                        multipleTopUpCount: assignee.multipleTopUpCount,
                        validPlayerCount: assignee.effectivePlayerCount,
                        currentListSize: assignee.holdingCount
                    };
                    distributionDetails.push(assigneeDistributionDetail);
                });
                return {
                    distributionDetails: distributionDetails,
                    totalDistributed: totalDistributed,
                    totalFulfilled: totalUsed,
                    totalSuccess: totalSuccess
                };
            }
            return null;
        });
    },

    getTsWorkloadReport: (platformObjId, phoneListObjIds, startTime, endTime, adminObjIds) => {
        let definitionOfAnsweredPhone = [];
        //filter away empty values
        adminObjIds = adminObjIds.filter(function (adminObjId) {
            return adminObjId != null && adminObjId != '';
        });
        phoneListObjIds = phoneListObjIds.filter(function (phoneListObjId) {
            return phoneListObjId != null && phoneListObjId != '';
        });

        return dbconfig.collection_platform.findOne({_id : platformObjId}).then(platform => {
            if(platform && platform.definitionOfAnsweredPhone) {
                definitionOfAnsweredPhone = platform.definitionOfAnsweredPhone;
            }
            let distributedPhoneQuery = {
                platform: platformObjId,
                startTime: {$gte: startTime, $lte: endTime}
            };
            let phoneFeedbackQuery = {
                platform: platformObjId,
                createTime: {$gte: startTime, $lte: endTime}
            };
            if(phoneListObjIds.length > 0) {
                distributedPhoneQuery.tsPhoneList = {$in: phoneListObjIds};
                phoneFeedbackQuery.tsPhoneList = {$in: phoneListObjIds};
            }
            if(adminObjIds.length > 0) {
                distributedPhoneQuery.assignee = {$in: adminObjIds};
                phoneFeedbackQuery.adminId = {$in: adminObjIds};
            }

            let distributedPhoneProm = dbconfig.collection_tsDistributedPhone.find(distributedPhoneQuery).populate({
                path: "tsPhoneList", model: dbconfig.collection_tsPhoneList
            }).populate({
                path: "assignee", model: dbconfig.collection_admin
            }).lean();
            let phoneFeedbackProm = dbconfig.collection_tsPhoneFeedback.find(phoneFeedbackQuery).populate({
                path: "tsPhoneList", model: dbconfig.collection_tsPhoneList
            }).populate({
                path: "adminId", model: dbconfig.collection_admin
            }).lean();

            return Promise.all([distributedPhoneProm, phoneFeedbackProm]).then(data => {
                let distributedData = data[0];
                let phoneFeedbackData = data[1];
                let workloadData = {};

                if(distributedData && distributedData.length > 0 && phoneFeedbackData && phoneFeedbackData.length > 0) {
                    distributedData.forEach(item => {
                        if(item.assignee._id && !workloadData[item.assignee._id]) {
                            workloadData[item.assignee._id] = {};
                        }
                        if(item.tsPhoneList._id && !workloadData[item.assignee._id][item.tsPhoneList._id]) {
                            workloadData[item.assignee._id][item.tsPhoneList._id] = {
                                adminId: item.assignee._id,
                                adminName: item.assignee.adminName,
                                phoneListObjId: item.tsPhoneList._id,
                                phoneListName: item.tsPhoneList.name,
                                distributed:0,
                                fulfilled:0,
                                success:0,
                                registered:0
                            };
                        }
                        workloadData[item.assignee._id][item.tsPhoneList._id].distributed++;
                    });
                    phoneFeedbackData.forEach(item => {
                        if(item.adminId._id && !workloadData[item.adminId._id]) {
                            workloadData[item.adminId._id] = {};
                        }
                        if(item.tsPhoneList._id && !workloadData[item.adminId._id][item.tsPhoneList._id]) {
                            workloadData[item.adminId._id][item.tsPhoneList._id] = {
                                adminId: item.adminId._id,
                                adminName: item.adminId.adminName,
                                phoneListObjId: item.tsPhoneList._id,
                                phoneListName: item.tsPhoneList.name,
                                distributed:0,
                                fulfilled:0,
                                success:0,
                                registered:0
                            };
                        }
                        workloadData[item.adminId._id][item.tsPhoneList._id].fulfilled++;
                        if(definitionOfAnsweredPhone.length > 0 && definitionOfAnsweredPhone.indexOf(item.result) > -1) {
                            workloadData[item.adminId._id][item.tsPhoneList._id].success++;
                        }
                        if(item.registered) {
                            workloadData[item.adminId._id][item.tsPhoneList._id].registered++;
                        }
                    });
                }
                return workloadData;
            })
        });
    },

    manualExportDecomposedPhones: (sourcePlatform, sourceTopicName, exportCount, targetPlatform, phoneTradeObjIdArr, adminInfo) => {
        if (String(sourcePlatform) === String(targetPlatform)) { // export to own platform, skip proposal
            return dbTeleSales.exportDecomposedPhones(phoneTradeObjIdArr, targetPlatform, exportCount);
        }

        let platform;
        return dbconfig.collection_platform.findOne({_id: targetPlatform}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({message: "Platform not found."});
                }
                platform = platformData;

                // export to other platform, proposal required

                let proposalData = {
                    exportTargetDepartmentId: platform.platformId,
                    exportTargetDepartmentName: platform.name,
                    exportWhiteListCount: exportCount,
                    sourceTsPhoneType: sourceTopicName,
                    exportTargetPlatformObjId: platform._id,
                };

                let newProposal = {
                    creator: adminInfo,
                    data: proposalData,
                    entryType: constProposalEntryType.ADMIN,
                    userType: constProposalUserType.SYSTEM_USERS,
                };
                newProposal.inputDevice = dbUtility.getInputDevice(userAgent, false, adminInfo);

                return dbProposal.createProposalWithTypeName(ObjectId(sourcePlatform), constProposalType.MANUAL_EXPORT_TS_PHONE, newProposal);
            }
        ).then(
            proposalData => {
                if (!proposalData || !proposalData.proposalId) {
                    return Promise.reject({message: "Operation failed"});
                }

                let proposalId = proposalData.proposalId;
                return dbTeleSales.setTradeProposalId(phoneTradeObjIdArr, proposalId, exportCount);
            }
        );
    },

    setTradeProposalId: (phoneTradeObjIdArr, proposalId, exportCount) => {
        if (exportCount && exportCount < phoneTradeObjIdArr.length) {
            phoneTradeObjIdArr = dbUtility.shuffleArray(phoneTradeObjIdArr);
        }

        let length = exportCount ? Math.min(phoneTradeObjIdArr.length, exportCount) : phoneTradeObjIdArr.length;

        let proms = [];
        for (let i = 0; i < length; i++) {
            let phoneTradeObjId = phoneTradeObjIdArr[i];
            let prom = dbconfig.collection_tsPhoneTrade.findOneAndUpdate({_id: phoneTradeObjId, targetPlatform: null}, {proposalId}, {new: true}).lean().catch(err => {
                console.log("set phoneTrade proposalId failed", phoneTradeObjId, proposalId, err);
            });

            proms.push(prom);
        }

        return Promise.all(proms);
    },

    exportDecomposedPhones: (phoneTradeObjIdArr, targetPlatform, exportCount) => {
        return dbconfig.collection_platform.findOne({_id: targetPlatform}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({message: "Platform not found."});
                }

                if (exportCount && exportCount < phoneTradeObjIdArr.length) {
                    phoneTradeObjIdArr = dbUtility.shuffleArray(phoneTradeObjIdArr);
                }

                let length = exportCount ? Math.min(phoneTradeObjIdArr.length, exportCount) : phoneTradeObjIdArr.length;

                let proms = [];
                for (let i = 0; i < length; i++) {
                    let phoneTradeObjId = phoneTradeObjIdArr[i];
                    let prom = dbTeleSales.exportDecomposedPhone(phoneTradeObjId, targetPlatform).catch(err => {
                        console.log("export decomposed failed", phoneTradeObjId, err);
                    });

                    proms.push(prom);
                }

                return Promise.all(proms);
            }
        );
    },

    exportDecomposedPhone: (tsPhoneTradeObjId, targetPlatform) => {
        return dbconfig.collection_tsPhoneTrade.findOne({_id: tsPhoneTradeObjId}).lean().then(
            tsPhoneTrade => {
                if (!tsPhoneTrade) {
                    return Promise.reject({message: "tsPhoneTrade not found."});
                }
                if (tsPhoneTrade.targetPlatform) {
                    return Promise.reject({message: "This number had been traded."});
                }

                return dbconfig.collection_tsPhoneTrade.findOneAndUpdate({_id: tsPhoneTrade._id, targetPlatform: null}, {targetPlatform, tradeTime: new Date()}, {new: true}).lean();
            }
        );
    },

    bulkSendSmsToFailCallee: (adminObjId, adminName, data, tsPhoneDetails) => {
        let proms = [];
        if (tsPhoneDetails && tsPhoneDetails.length) {
            tsPhoneDetails.map(tsPhone => {
                let clonedData = Object.assign({}, data);
                clonedData.tsPhoneId = tsPhone.tsPhoneId;
                clonedData.tsDistributedPhone = tsPhone.tsDistributedPhoneId;
                clonedData.encodedPhoneNumber = tsPhone.encodedPhoneNumber;
                let prom = dbTeleSales.sendSMS(adminObjId, adminName, clonedData).catch(error => {
                    console.error("Sms failed for tsPhoneId:", tsPhone.tsPhoneId, "- error:", error);
                    errorUtils.reportError(error);
                    return {tsPhone, error}
                });

                proms.push(prom);
            });
        }

        return Promise.resolve(proms);
    },

    sendSMS: function (adminObjId, adminName, data) {

        return dbconfig.collection_tsPhone.findOne({_id: ObjectId(data.tsPhoneId)}).then(
            tsPhoneData => {
                if (!tsPhoneData || !tsPhoneData.phoneNumber) {
                    return Q.reject({message: "Error when finding phone number", data: data});
                }

                if (tsPhoneData.phoneNumber && tsPhoneData.phoneNumber.length > 20) {
                    try {
                        tsPhoneData.phoneNumber = rsaCrypto.decrypt(tsPhoneData.phoneNumber);
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                var sendObj = {
                    tel: tsPhoneData.phoneNumber,
                    channel: data.channel,
                    platformId: data.platformId,
                    message: data.message,
                    delay: data.delay
                };
                var recipientName = data.encodedPhoneNumber;

                return dbPlayerMail.isFilteredKeywordExist(data.message, data.platformId, "sms", data.channel).then(
                    exist => {
                        if (exist) {
                            return Promise.reject({errorMessage: "Content consist of sensitive keyword."});
                        }

                        return smsAPI.sending_sendMessage(sendObj).then(
                            retData => {
                                dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, tsPhoneData.platform, 'success');
                                return retData;
                            },
                            retErr => {
                                dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, tsPhoneData.platform, 'failure', retErr);
                                return Q.reject({message: retErr, data: data});
                            }
                        );
                    }
                );
            }
        );
    },

    searchTrashClassificationTrade: (platformObjId, phoneLists, topic, startTime, endTime, index, limit) => {
        let query = {
            sourcePlatform: platformObjId,
            decomposeTime: {
                $gte: startTime,
                $lte: endTime
            },
            targetPlatform: null
        };
        if(phoneLists && phoneLists.length > 0) {
            query.sourceTsPhoneListName = {$in: phoneLists};
        }
        if(topic == "noFeedbackTopic") {
            query['$or'] = [
                {lastSuccessfulFeedbackTopic: {$exists: false}},
                {lastSuccessfulFeedbackTopic: null}
            ];
        } else if(topic && topic != 'noClassification') {
            query.lastSuccessfulFeedbackTopic = topic;
        }
        console.log("query", query);
        console.log("index", index);
        console.log("limit", limit);
        let dataProm = dbconfig.collection_tsPhoneTrade.find(query).skip(index).limit(limit).sort({decomposeTime: -1}).lean();
        let sizeProm = dbconfig.collection_tsPhoneTrade.count(query).lean();
        return Promise.all([dataProm, sizeProm]).then(data => {
            return {data: data[0], size: data[1]};
        });
    },

    updateTsPhoneListDecomposedTime: (tsPhoneListObjId) => {
        return dbconfig.collection_tsPhoneList.findOneAndUpdate({_id: tsPhoneListObjId}, {decomposedTime: new Date(Date.now())}, {new: true}).lean();
    },
  
    getTrashClassification: function (platformObjId) {
        let noClassificationCountProm = dbconfig.collection_tsPhoneTrade.find({sourcePlatform: {$exists: true}, sourcePlatform: ObjectId(platformObjId), targetPlatform: null}, {_id: 1}).lean();
        let noFeedbackTopicCountProm = dbconfig.collection_tsPhoneTrade.find({
            sourcePlatform: ObjectId(platformObjId),
            $or: [
                {lastSuccessfulFeedbackTopic: {$exists: false}},
                {lastSuccessfulFeedbackTopic: {$exists: true, $eq: null}},
                {lastSuccessfulFeedbackTopic: {$exists: true, $eq: ''}}
            ],
            targetPlatform: null
        }, {_id: 1}).lean();
        let feedbackTopicCountProm = dbconfig.collection_tsPhoneTrade.aggregate(
            {
                $match: {
                    lastSuccessfulFeedbackTopic: {$exists: true, $ne: ''},
                    sourcePlatform: ObjectId(platformObjId),
                    targetPlatform: null
                }
            }, {
                $group: {
                    _id: "$lastSuccessfulFeedbackTopic",
                    count: {$sum: 1}
                }
            }
        ).read("secondaryPreferred");

        return Promise.all([noClassificationCountProm, noFeedbackTopicCountProm, feedbackTopicCountProm]).then(
            data => {
                let trashClassificationList = [];
                if (data) {
                    if (data[0]) {
                        trashClassificationList.push({name: 'noClassification', size: data[0].length});
                    }

                    if (data[1]) {
                        trashClassificationList.push({name: 'noFeedbackTopic', size: data[1].length});
                    }

                    if (data[2] && data[2].length > 0) {
                        data[2].forEach(feedbackCount => {
                            if (feedbackCount && feedbackCount._id) {
                                trashClassificationList.push({name: feedbackCount._id, size: feedbackCount.count});
                            }
                        })
                    }
                }

                return trashClassificationList;
            }
        );
    },

    getCountDecompositionList: function (platformObjId) {
        return dbconfig.collection_tsPhoneTrade.find({
            targetPlatform: ObjectId(platformObjId),
            tradeTime: {$exists: true},
            $and: [
                {
                    $or: [
                        {targetTsPhone: {$exists: false}},
                        {targetTsPhone: {$exists: true, $eq: null}}
                    ]
                },
                {
                    $or: [
                        {proposalId: {$exists: false}},
                        {proposalId: {$exists: true, $eq: null}}
                    ]
                }
            ]
        }).count();
    },

    getTsPhone: function (query) {
       return dbconfig.collection_tsPhone.find(query).lean()
    },

    getDecomposedNewPhoneRecord: function (platformObjId, startTime, endTime, index, limit, sortCol) {

        let query = {
            tradeTime: {$gte: new Date(startTime), $lte: new Date(endTime)},
            targetPlatform: ObjectId(platformObjId),
            $and: [
                {
                    $or: [
                        {targetTsPhone: {$exists: false}},
                        {targetTsPhone: {$exists: true, $eq: null}}
                    ]
                },
                {
                    $or: [
                        {proposalId: {$exists: false}},
                        {proposalId: {$exists: true, $eq: null}}
                    ]
                }
            ]

        };

        let countProm = dbconfig.collection_tsPhoneTrade.find(query).count();
        let decomposedNewPhoneProm = dbconfig.collection_tsPhoneTrade.find(query, {
            sourceTsPhone: 1,
            tradeTime: 1,
            encodedPhoneNumber: 1,
            lastSuccessfulFeedbackTime: 1,
            lastSuccessfulFeedbackTopic: 1,
            lastSuccessfulFeedbackContent: 1
        }).sort(sortCol).skip(index).limit(limit);

        return Promise.all([countProm, decomposedNewPhoneProm]).then(
            data => {
                if (data) {
                    let count = data[0] ? data[0] : 0;
                    let decomposedNewPhoneData = data[1] ? data[1] : [];

                    return {data: decomposedNewPhoneData, size: count};
                }
            }
        );
    },

    dailyTradeTsPhone: function () {
        let platformsArr;

        return dbconfig.collection_tsPhoneTrade.distinct("sourcePlatform", {targetPlatform: null}).then(
            platformIds => {
                return dbconfig.collection_platform.find({
                    _id: {$in: platformIds},
                    phoneWhiteListExportMaxNumber: {$gte: 1}
                }, {phoneWhiteListExportMaxNumber: 1}).lean();
            }
        ).then(
            platformData => {
                if (!(platformData && platformData.length >= 2)) {
                    // must have 2 platforms available in order to swap phone number
                    return Promise.resolve("No platform to swap");
                }
                platformsArr = JSON.parse(JSON.stringify(platformData));
                getAllTradeablePhone (platformsArr);
            }
        )
    },

    tsPhoneCheckIsExistsAllPlatform: function(platformObjIds, tsPhonesTrade) {
        let promArr = [];
        tsPhonesTrade.forEach(tsPhoneTrade => {
            let checkPhoneProm;
            if (!(tsPhoneTrade && tsPhoneTrade.sourceTsPhone && tsPhoneTrade.sourceTsPhone.phoneNumber)) {
                checkPhoneProm= Promise.resolve(tsPhoneTrade);
            } else {
                let queryPlatformIds;
                if (tsPhoneTrade.sourceTsPhone && tsPhoneTrade.sourceTsPhone.platform) {
                    queryPlatformIds = platformObjIds.filter(platform => String(platform) != String(tsPhoneTrade.sourceTsPhone.platform));
                } else {
                    queryPlatformIds = platformObjIds;
                }

                checkPhoneProm = dbconfig.collection_players.find({
                    platform: {$in: queryPlatformIds},
                    phoneNumber: tsPhoneTrade.sourceTsPhone.phoneNumber
                }, {platform: 1}).lean().then(
                    playersData => {
                        if (playersData && playersData.length) {
                            let existsPlatform = [];
                            playersData.forEach(
                                player => {
                                    existsPlatform.push(String(player.platform));
                                }
                            )
                            tsPhoneTrade.tradeablePlatform = queryPlatformIds.filter(platform => !existsPlatform.includes(String(platform)));
                        } else {
                            tsPhoneTrade.tradeablePlatform = queryPlatformIds;
                        }
                        return dbconfig.collection_tsPhone.find({
                            platform: {$in: queryPlatformIds},
                            phoneNumber: tsPhoneTrade.sourceTsPhone.phoneNumber
                        }, {platform: 1}).lean();
                    }
                ).then(
                    tsPhonesData => {
                        if (tsPhonesData && tsPhonesData.length) {
                            let existsPlatform = [];
                            tsPhonesData.forEach(
                                tsPhone => {
                                    existsPlatform.push(String(tsPhone.platform));
                                }
                            )
                            tsPhoneTrade.tradeablePlatform = queryPlatformIds.filter(platform => !existsPlatform.includes(String(platform)));
                        } else {
                            tsPhoneTrade.tradeablePlatform = queryPlatformIds;
                        }
                        return tsPhoneTrade;
                    }
                )
            }
            promArr.push(checkPhoneProm);
        });

        return Promise.all(promArr);
    },

    filterExistingPhonesForDecomposedPhones: function(phoneArr, targetPlatformObjId) {
        return dbconfig.collection_players.find({
            platform: targetPlatformObjId,
            phoneNumber: {$in:phoneArr}
        }).then(players => {
            players.forEach(player=>{
                if(phoneArr.indexOf(player.phoneNumber) > -1){
                    phoneArr.splice(phoneArr.indexOf(player.phoneNumber),1);
                }
            });
            return dbconfig.collection_tsPhone.find({
                platform: targetPlatformObjId,
                phoneNumber: {$in:phoneArr}
            });
        }).then(phones=>{
            phones.forEach(phone=>{
                if(phoneArr.indexOf(phone.phoneNumber) > -1){
                    phoneArr.splice(phoneArr.indexOf(phone.phoneNumber),1);
                }
            });
            return phoneArr;
        })
    }

};

function isStillTradeAble(platformsArr,platformTsPhoneTrade) {
    if (!platformsArr || !platformTsPhoneTrade) {
        return false;
    }
    let tradeablePlatformCount = 0;
    let isHavePhoneLeft = false;
    for (let i = 0; i < platformsArr.length; i++) {
        let platform = platformsArr[i];
        if (platform.phoneWhiteListExportMaxNumber) {
            tradeablePlatformCount++;
        }
        if(tradeablePlatformCount >= 2) {
            break;
        }
    }

    for (let key in platformTsPhoneTrade) {
        if (platformTsPhoneTrade[key].length) {
            isHavePhoneLeft = true;
            break;
        }
    }

    return Boolean(tradeablePlatformCount >= 2 && isHavePhoneLeft);
}

function getAllTradeablePhone (platformsArr, recursiveCount) {
    recursiveCount = recursiveCount || 50;
    if (recursiveCount <= 0) {
        return Promise.reject({name: "DataError", message: "getAllTradeablePhone reach max recursive count"});
    }
    platformsArr = dbUtility.shuffleArray(platformsArr);
    let promArr = [];
    let tsPhoneTradeArr = [];

    for (let i = 0; i < platformsArr.length; i++) {
        let prom = dbconfig.collection_tsPhoneTrade.find({sourcePlatform: platformsArr[i]._id, targetPlatform: null}, {sourceTsPhone: 1})
            .populate({path: "sourceTsPhone", model: dbconfig.collection_tsPhone, select: "phoneNumber platform"})
            .sort({decomposeTime: 1})
            .limit(platformsArr[i].phoneWhiteListExportMaxNumber || 1).lean();

        let stream = prom.cursor({batchSize: 100});
        let balancer = new SettlementBalancer();

        let balanceProm = balancer.initConns().then(function () {
            return Q(
                balancer.processStream(
                    {
                        stream: stream,
                        batchSize: constSystemParam.BATCH_SIZE,
                        makeRequest: function (tsPhonesTrade, request) {
                            request("player", "tsPhoneCheckIsExistsAllPlatform", {
                                platformObjIds: platformsArr.map(platform => platform._id),
                                tsPhonesTrade: tsPhonesTrade,
                            });
                        },
                        processResponse: function (record) {
                            tsPhoneTradeArr = tsPhoneTradeArr.concat(record.data);
                        }
                    }
                )
            );
        });
        promArr.push(balanceProm);
    }

    return Promise.all(promArr).then(
        () => {
            if (!(platformsArr && platformsArr.length && tsPhoneTradeArr && tsPhoneTradeArr.length)) {
                return Promise.resolve(false);
            }
            return tradePhoneForEachPlatform (platformsArr, tsPhoneTradeArr);
        }
    ).then(
        (resData) => {
            if (isStillTradeAble() && resData) {
                getAllTradeablePhone (platformsArr, recursiveCount--);
            }
        }
    );
}

function tradePhoneForEachPlatform (platformsArr, tsPhoneTradeArr) {
    // if (!(platformsArr && platformsArr.length && tsPhoneTradeArr && tsPhoneTradeArr.length)) {
    //     return Promise.reject({name: "DataError", message: "Invalid Data to trade phone numbers"});
    // }
    let platformTsPhoneTrade = {};
    let promArr = [];

    for(let i = 0; i < tsPhoneTradeArr.length; i++) {
        if (tsPhoneTradeArr[i].tradeablePlatform && tsPhoneTradeArr[i].sourceTsPhone && tsPhoneTradeArr[i].sourceTsPhone.platform) {
            if (!platformTsPhoneTrade[tsPhoneTradeArr[i].sourceTsPhone.platform]) {
                platformTsPhoneTrade[tsPhoneTradeArr[i].sourceTsPhone.platform] = [];
            }
            platformTsPhoneTrade[tsPhoneTradeArr[i].sourceTsPhone.platform].push(tsPhoneTradeArr[i])
        }
    }

    platformsArr.forEach(platform => {
        if ((platformTsPhoneTrade[platform._id] && platformTsPhoneTrade[platform._id].length || 0) < platform.phoneWhiteListExportMaxNumber) {
            platform.phoneWhiteListExportMaxNumber = platformTsPhoneTrade[platform._id] && platformTsPhoneTrade[platform._id].length || 0;
        }
    });

    for (let key in platformTsPhoneTrade) {
        for (let k = platformTsPhoneTrade[key].length - 1; k >=0; k--) {
            let tsPhoneTradeSender = platformTsPhoneTrade[key][k];
            for (let j = platformsArr.length - 1; j >= 0; j--) {
                if (String(platformsArr[j]._id) == String(key) || !platformTsPhoneTrade[platformsArr[j]._id] || !platformTsPhoneTrade[platformsArr[j]._id].length) {
                    // skip if own platform / no phoneTrade in the platform
                    continue;
                }

                if (tsPhoneTradeSender.tradeablePlatform.includes(String(platformsArr[j]._id)) && platformsArr[j].phoneWhiteListExportMaxNumber) {
                    for (let l = platformTsPhoneTrade[platformsArr[j]._id].length - 1; l >= 0; l--) {
                        let tsPhoneTradeReceiver = platformTsPhoneTrade[platformsArr[j]._id][l];
                        if (tsPhoneTradeReceiver.tradeablePlatform.includes(String(key))) {
                            promArr.push(dbconfig.collection_tsPhoneTrade.findOneAndUpdate({_id: tsPhoneTradeSender._id}
                            , {
                                    targetPlatform: platformsArr[j]._id,
                                    tradeTime: new Date()
                                }).lean().catch(errorUtils.reportError))

                            promArr.push(dbconfig.collection_tsPhoneTrade.findOneAndUpdate({_id: tsPhoneTradeReceiver._id}
                                , {
                                    targetPlatform: key,
                                    tradeTime: new Date()
                                }).lean().catch(errorUtils.reportError))

                            platformTsPhoneTrade[key].splice(k, 1);
                            platformTsPhoneTrade[platformsArr[j]._id].splice(l, 1);
                            platformsArr[j].phoneWhiteListExportMaxNumber--;

                            if (platformsArr[j].phoneWhiteListExportMaxNumber <= 0) {
                                platformsArr.splice(j, 1)
                            }
                            break;
                        }
                    }
                }
            }
            if (!(platformsArr && platformsArr.length >= 2)) {
                // must have 2 platforms to swap phone numbers
                break;
            }
        }
        if (!(platformsArr && platformsArr.length >=2)) {
            // must have 2 platforms to swap phone numbers
            break;
        }
    }
    return Promise.all(promArr);
}

function addTsFeedbackCount (feedbackObj, isSucceedBefore = false) {
    // let isSucceedBefore = false;
    return dbconfig.collection_tsPhone.findOneAndUpdate({_id: feedbackObj.tsPhone}, {
        isUsed: true,
        isSucceedBefore: isSucceedBefore
    }).lean().then(
        tsPhoneData => {
            if (!(tsPhoneData && tsPhoneData.tsPhoneList)) {
                return Promise.reject({name: "DataError", message: "Cannot find tsPhone"});
            }
            let promArr = [];
            let updatePhoneListObj = {
                $inc: {}
            };
            let updateAssigneeObj = {
                $inc: {}
            };
            if (!tsPhoneData.isUsed) {
                updatePhoneListObj["$inc"].totalUsed = 1;
                updateAssigneeObj["$inc"].phoneUsedCount = 1;
            }
            if (!tsPhoneData.isSucceedBefore && isSucceedBefore) {
                updatePhoneListObj["$inc"].totalSuccess = 1;
                updateAssigneeObj["$inc"].successfulCount = 1;
            }
            if (tsPhoneData.tsPhoneList && (updatePhoneListObj["$inc"].totalUsed  || updatePhoneListObj["$inc"].totalSuccess)) {
                promArr.push(dbconfig.collection_tsPhoneList.findOneAndUpdate({_id: tsPhoneData.tsPhoneList}, updatePhoneListObj).lean());
                promArr.push(dbconfig.collection_tsAssignee.findOneAndUpdate({
                    admin: feedbackObj.adminId,
                    tsPhoneList: tsPhoneData.tsPhoneList
                }, updateAssigneeObj).lean());
            }
            return Promise.all(promArr);
        }
    );
}

function addOptionalTimeLimitsToQuery(data, query, fieldName) {
    var createTimeQuery = {};
    if (!data.startTime && !data.endTime) {
        createTimeQuery = undefined;
    } else {
        if (data.startTime) {
            createTimeQuery.$gte = new Date(data.startTime);
        }
        if (data.endTime) {
            createTimeQuery.$lt = new Date(data.endTime);
        }
    }
    if (createTimeQuery) {
        query[fieldName] = createTimeQuery;
    }
}

function excludeTelNum(data){
    // mask tel number
    data = data.map(item=>{
        if(item.tel){
            item.tel = dbUtility.encodePhoneNum(item.tel);
        }
        if(item.error && item.error.tel){
            item.error.tel = dbUtility.encodePhoneNum(item.error.tel);
        }
        return item;
    })
    return data;
}

var proto = dbTeleSalesFunc.prototype;
proto = Object.assign(proto, dbTeleSalesFunc);

// This make WebStorm navigation work
module.exports = dbTeleSales;