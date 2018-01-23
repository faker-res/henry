var dbConfig = require('./../modules/dbproperties');
var Q = require("q");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbutility = require('./../modules/dbutility');
const constMessageType = require("../const/constMessageType");
var dbSmsGroup = {
    getPlatformSmsGroups: (platformObjId) => {
        return dbConfig.collection_smsGroup.find({
            platformObjId: platformObjId
        }).lean();
    },

    deletePlatformSmsGroup: (smsGroupObjId) => {
        return dbConfig.collection_smsGroup.findOne({
            _id: smsGroupObjId
        }).then(
            smsGroup =>{
                // remove sms setting under this group
                return dbConfig.collection_smsGroup.remove({
                    smsParentSmsId: smsGroup.smsId
                }).then(
                    () => {
                        return dbConfig.collection_smsGroup.remove({
                            _id: smsGroupObjId
                        });
                    }
                );

            }
        );

    },

    addNewSmsGroup: (platformObjId) => {
        let smsGroupRecord = new dbConfig.collection_smsGroup({
            smsParentSmsId: -1,
            platformObjId: platformObjId,
            smsName: '新的分组'
        });
        return smsGroupRecord.save();
    },

    updatePlatformSmsGroups: (platformObjId, smsGroups) => {
        let inGroupSmsTypesName = smsGroups.map(smsGroup => smsGroup.smsName);
        // remove smsGroup that no longer in group
        dbConfig.collection_smsGroup.find({
            platformObjId: platformObjId,
            smsParentSmsId: {$ne: -1}
        }).then(
            smsGroupsBeforeUpdate =>{
                let smsGroupBeforeUpdateNames = smsGroupsBeforeUpdate.map(smsGroupsBeforeUpdate => smsGroupsBeforeUpdate.smsName);
                let noInGroupSmsTypesName = dbutility.difArrays(inGroupSmsTypesName, smsGroupBeforeUpdateNames);
                dbConfig.collection_smsGroup.remove({
                    smsName: {$in: noInGroupSmsTypesName},
                    platformObjId: platformObjId,
                    smsParentSmsId: {$ne: -1}
                }).exec();
            }
        );

        smsGroups.forEach(smsGroup => {
            delete smsGroup.__v;
            delete smsGroup._id;

            // mongoose upsert wont trigger pre save function, so use if here, if not update with upsert is enough
            if (!smsGroup.smsId) {
                let smsGroupRecord = new dbConfig.collection_smsGroup(smsGroup);
                smsGroupRecord.save();
            } else {
                dbConfig.collection_smsGroup.update(
                    {smsId: smsGroup.smsId, platformObjId: ObjectId(platformObjId)},
                    {$set: smsGroup},
                    {upsert: true}
                ).exec();
            }
        });


    },
};
module.exports = dbSmsGroup;