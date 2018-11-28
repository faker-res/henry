let dbconfig = require('./../modules/dbproperties');
let errorUtils = require('../modules/errorUtils');
const rsaCrypto = require("../modules/rsaCrypto");
const dbUtility = require('./../modules/dbutility');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const ObjectId = mongoose.Types.ObjectId;

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
                    phoneListQuery["$and"].push({$or: [{lastFeedbackTime: null}, {lastFeedbackTime: {$gte: query.feedbackStart, $lt: query.feedbackEnd}}]});
                }
                if (query.distributeStart && query.distributeEnd) {
                    phoneListQuery["$and"].push({startTime: {$gte: query.distributeStart, $lt: query.distributeEnd}})
                }



                if (query.hasOwnProperty("reclaimDays") && query.reclaimDays != null) {
                    let countReclaimDate = dbUtility.getNdaylaterFromSpecificStartTime(query.reclaimDays + 1, new Date());
                    let reclaimDate =dbUtility.getTargetSGTime(countReclaimDate);
                    switch (query.reclaimDayOperator) {
                        case '<=':
                            phoneListQuery["$and"].push({endTime: {$lte: reclaimDate.startTime}});
                            break;
                        case '>=':
                            phoneListQuery["$and"].push({endTime: {$gte: reclaimDate.startTime}});
                            break;
                        case '=':
                            phoneListQuery["$and"].push({endTime: reclaimDate.startTime});
                            break;
                        case 'range':
                            if (query.hasOwnProperty("reclaimDaysTwo") && query.reclaimDaysTwo != null) {
                                let countReclaimDate2 = dbUtility.getNdaylaterFromSpecificStartTime(query.reclaimDaysTwo + 1, new Date());
                                let reclaimDate2 = dbUtility.getTargetSGTime(countReclaimDate2);
                                phoneListQuery["$and"].push({endTime: {$gte: reclaimDate.startTime, $lte: reclaimDate2.startTime}});
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
                let tsDistributePhoneProm = dbconfig.collection_tsDistributedPhone.find(phoneListQuery).sort(sortObj).sort(sortObj).skip(index).limit(limit)
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
                    _id: "$_id"
                }
            }
        ]).read("secondaryPreferred").then(
            data => {
                if (!(data && data.length)) {
                    return [];
                }
                let tsDistributedPhoneObjId = data.map(tsDistributedPhone => tsDistributedPhone._id);
                let phoneListQuery = {_id: {$in: tsDistributedPhoneObjId}};
                let tsDistributePhoneCountProm = dbconfig.collection_tsDistributedPhone.find(phoneListQuery).count();
                let tsDistributePhoneProm = dbconfig.collection_tsDistributedPhone.find(phoneListQuery).sort(sortObj).sort(sortObj).skip(index).limit(limit)
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
        return dbconfig.collection_tsPhoneFeedback(inputData).save().then(
            (feedbackData) => {
                if (!feedbackData) {
                    return Promise.reject({name: "DataError", message: "fail to save feedback data"});
                }

                return dbconfig.collection_platform.findOne({_id: inputData.platform}, {definitionOfAnsweredPhone: 1}).lean();
            }
        ).then(
            platformData => {
                if (platformData && platformData.definitionOfAnsweredPhone
                    && platformData.definitionOfAnsweredPhone.length && platformData.definitionOfAnsweredPhone.indexOf(inputData.result) > -1) {
                    isSuccessFeedback = true;
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

        let totalAssignee;
        let tsPhoneListObj;
        let tsAssigneeArr;
        let totalDistributed = 0;

        return dbconfig.collection_tsPhoneList.findOne({_id: inputData.tsListObjId}).then(
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
                    assignTimes: {$lt: tsPhoneListObj.callerCycleCount},
                    $or: [{distributedEndTime: null}, {distributedEndTime: {$lt: new Date()}}]
                }).sort({assignTimes: 1, createTime: 1}).lean();
            }
        ).then(
            tsPhoneData => {
                if (!(tsPhoneData && tsPhoneData.length)) {
                    return Promise.reject({name: "DataError", message: "Cannot find tsPhone"});
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
                            totalPhoneAdded ++;
                            tsAssigneeArr[j].updateObj.tsPhone.push({tsPhoneObjId: tsPhoneData[i]._id, assignTimes: tsPhoneData[i].assignTimes});
                            tsAssigneeArr.sort(sortAssigneePhoneCount);
                            break;
                        }
                    }
                }

                tsAssigneeArr.forEach(tsAssignee => {
                    let assignedCount = 0;
                    if (tsAssignee.updateObj && tsAssignee.updateObj.tsPhone && tsAssignee.updateObj.tsPhone.length) {
                        assignedCount =  tsAssignee.updateObj.tsPhone.length;
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

                                dbconfig.collection_tsPhone.update({_id:{$in: tsAssignee.updateObj.tsPhone.map(tsPhone => tsPhone.tsPhoneObjId)}}, {$addToSet: {assignee: tsAssignee.admin} , $inc: {assignTimes: 1}, distributedEndTime: phoneNumberEndTime.endTime}, {multi: true}).catch(errorUtils.reportError);
                                if (assignedCount) {
                                    dbconfig.collection_tsAssignee.findOneAndUpdate({_id: tsAssignee._id}, {$inc: {assignedCount: assignedCount}}).lean().catch(errorUtils.reportError);
                                }
                            })

                        promArr.push(distributedPhoneListProm);
                    }
                });

                return Promise.all(promArr);
            }
        ).then(
            () => {
                return dbconfig.collection_tsPhoneList.findOneAndUpdate({_id: tsPhoneListObj._id}, {$inc: {totalDistributed: totalDistributed}}).lean();
            }
        );

        return inputData;
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
        return dbconfig.collection_tsPhoneList.findOneAndUpdate(query, updateData).lean()
    },

    getTsAssignees: function(tsPhoneListObjId){
        let query = {
            tsPhoneList: tsPhoneListObjId
        };

        return dbconfig.collection_tsAssignee.find(query).then(assignees=>assignees);
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
    }
};

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

module.exports = dbTeleSales;