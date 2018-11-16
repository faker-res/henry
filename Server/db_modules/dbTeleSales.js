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
        limit = limit ? limit : 20;
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
                    .populate({path: 'tsPhone', model: dbconfig.collection_tsPhone, select: "phoneNumber assignTimes"}).lean();

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
                let tsAssigneeProm = dbconfig.collection_tsAssignee.findOne({_id: tsDistributedPhone.assignee}).lean();
                let feedbackProm = dbconfig.collection_tsPhoneFeedback.find({tsPhone: tsDistributedPhone.tsPhone}).lean();

                return Promise.all([tsPhoneProm, tsAssigneeProm, feedbackProm]);
            }
        ).then(
            ([tsPhone, tsAssignee, feedbacks]) => {
                if (!tsPhone) {
                    return Promise.reject({message: "tsPhone not found"});
                }
                if (!tsAssignee) {
                    return Promise.reject({message: "tsAssignee not found"});
                }
                tsDistributedPhone.tsPhone = tsPhone;
                tsDistributedPhone.assignee = tsAssignee;
                tsDistributedPhone.feedbacks = feedbacks;

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
                    $or: [{distributedEndTime: null}, {distributedEndTime: {$gt: new Date()}}]
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
                    if (totalPhoneAdded >= tsPhoneData.dailyCallerMaximumTask) {
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
                    if (tsAssignee.updateObj && tsAssignee.updateObj.tsPhone && tsAssignee.updateObj.tsPhone.length) {
                        let distributeListSaveData = {
                            platform: inputData.platform,
                            tsPhoneList: inputData.tsListObjId,
                            assignee: tsAssignee.admin
                        }
                        let distributedPhoneListProm = dbconfig.collection_tsDistributedPhoneList.findOneAndUpdate(
                            distributeListSaveData, distributeListSaveData, {upsert: true, new: true}).lean().then(
                            distributedPhoneListData => {
                                tsAssignee.updateObj.tsPhone.forEach(tsPhoneUpdate => {
                                    dbconfig.collection_tsDistributedPhone({
                                        platform: inputData.platform,
                                        tsPhoneList: inputData.tsListObjId,
                                        tsDistributedPhoneList: distributedPhoneListData._id,
                                        tsPhone: ObjectId(tsPhoneUpdate.tsPhoneObjId),
                                        assignTimes: (tsPhoneUpdate.assignTimes + 1) || 1,
                                        assignee: tsAssignee.admin,
                                        startTime: phoneNumberStartTime,
                                        endTime: phoneNumberEndTime.endTime,
                                        remindTime: phoneNumberEndTime.endTime
                                    }).save().catch(errorUtils.reportError);
                                });
                                dbconfig.collection_tsPhone.update({_id:{$in: tsAssignee.updateObj.tsPhone.map(tsPhone => tsPhone.tsPhoneObjId)}}, {$addToSet: {assignee: tsAssignee.admin} , $inc: {assignTimes: 1}, distributedEndTime: phoneNumberEndTime.endTime}, {multi: true}).catch(errorUtils.reportError);
                            })
                        promArr.push(distributedPhoneListProm);
                    }
                });

                return Promise.all(promArr);
            }
        )

        return inputData;
    },

    getTsPhoneImportRecord: function (query) {
       return  dbconfig.collection_tsPhoneImportRecord.find(query).sort({importTime: 1}).lean();
    },

    updateTsPhoneList: function (query, updateData) {
        return dbconfig.collection_tsPhoneList.findOneAndUpdate(query, updateData).lean()
    },
};

module.exports = dbTeleSales;