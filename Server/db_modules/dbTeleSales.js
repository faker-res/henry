let dbconfig = require('./../modules/dbproperties');
let errorUtils = require('../modules/errorUtils');
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
                            tsAssigneeArr[j].updateObj.tsPhone.push(tsPhoneData[i]._id);
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
                                        tsPhone: ObjectId(tsPhoneUpdate),
                                        assignee: tsAssignee.admin,
                                        endTime: phoneNumberEndTime.endTime,
                                        remindTime: phoneNumberEndTime.endTime
                                    }).save().catch(errorUtils.reportError);
                                });
                                dbconfig.collection_tsPhone.update({_id:{$in: tsAssignee.updateObj.tsPhone}}, {assignee: {$addToSet: tsAssignee.admin} , $inc: {assignTimes: 1}, distributedEndTime: phoneNumberEndTime.startTime}, {multi: true}).catch(errorUtils.reportError);
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
    }
};

module.exports = dbTeleSales;