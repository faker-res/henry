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

    distributePhoneNumber: function (inputData) {
        console.log("tsListObjId", inputData.tsListObjId);
        console.log("tsListPlatform", inputData.platform);
        if (!(inputData.tsListObjId && inputData.platform)) {
            return Promise.reject({name: "DataError", message: "Invalid data"});
        }

        let totalAssignee;
        let totalPhoneNumber;
        let tsPhoneListObj;
        let tsAssigneeArr;
        let eachAssigneePhoneCount = [];

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
                    $or: [{distributedEndTime: null}, {distributedEndTime: {$gt: new Date()}}]
                }).sort({assignTimes: 1}).limit(tsPhoneListObj.dailyCallerMaximumTask).lean();
            }
        ).then(
            tsPhoneData => {
                if (!(tsPhoneData && tsPhoneData.length)) {
                    return Promise.reject({name: "DataError", message: "Cannot find tsPhone"});
                }
                totalPhoneNumber = tsPhoneData.length;
                let phoneCountEachAssignee = Math.floor(totalPhoneNumber / totalAssignee);
                let phoneCountLeft = totalPhoneNumber % totalAssignee;

                for (let i = 0; i < totalAssignee; i++) {
                    eachAssigneePhoneCount[i] = phoneCountEachAssignee;
                    if (phoneCountLeft) {
                        eachAssigneePhoneCount[i] ++;
                        phoneCountLeft --;
                    }
                }

                let promArr = [];
                let reclaimTime = dbUtility.getNdaylaterFromSpecificStartTime(tsPhoneListObj.reclaimDayCount, new Date())
                let phoneNumberEndTime =dbUtility.getTargetSGTime(reclaimTime);
                tsAssigneeArr.forEach(
                    (assignee, index) => {
                        if (eachAssigneePhoneCount[index]) {
                            let distributedPhoneListProm = dbconfig.collection_tsDistributedPhoneList({
                                platform: inputData.platform,
                                tsPhoneList: inputData.tsListObjId,
                                assignee: assignee.admin
                            }).save().then(
                                distributedPhoneListData => {
                                    let eachAssigneePhoneCountCopy = JSON.parse(JSON.stringify(eachAssigneePhoneCount));
                                    eachAssigneePhoneCountCopy.length = index;
                                    let startIndex = eachAssigneePhoneCountCopy.reduce((sum, value) => sum + value, 0);
                                    let phoneNumArr = [];
                                    for (let j = startIndex; j < startIndex + eachAssigneePhoneCount[index]; j++) {
                                        phoneNumArr.push(tsPhoneData[j]._id);
                                        dbconfig.collection_tsDistributedPhone({
                                            platform: inputData.platform,
                                            tsPhoneList: inputData.tsListObjId,
                                            tsDistributedPhoneList: distributedPhoneListData._id,
                                            tsPhone: tsPhoneData[j]._id,
                                            assignee: assignee.admin,
                                            endTime: phoneNumberEndTime.endTime
                                        }).save().catch(errorUtils.reportError);
                                    }
                                    dbconfig.collection_tsPhone.update({_id:{$in: phoneNumArr}}, {$inc: {assignTimes: 1}, distributedEndTime: phoneNumberEndTime.startTime}, {multi: true}).catch(errorUtils.reportError);
                                }
                            );
                            promArr.push(distributedPhoneListProm);
                        }
                    }
                )
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