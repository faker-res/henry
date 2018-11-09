var dbConfig = require('./../modules/dbproperties');
var dbutility = require('./../modules/dbutility');

var dbDepositGroup = {
    getDepositGroups: () => {
        return dbConfig.collection_depositGroup.find({
        }).lean();
    },

    addNewDepositGroup: () => {
        let depositGroupRecord = new dbConfig.collection_depositGroup({
            depositParentDepositId: -1,
            depositName: '新的分组'
        });
        return depositGroupRecord.save();
    },

    updateDepositGroups: (depositGroups) => {
        let inGroupDepositTypesName = depositGroups.map(depositGroup => depositGroup.depositName);
        // remove depositGroup that no longer in group
        dbConfig.collection_depositGroup.find({
            depositParentDepositId: {$ne: -1}
        }).then(
            depositGroupsBeforeUpdate =>{
                let depositGroupBeforeUpdateNames = depositGroupsBeforeUpdate.map(depositGroupsBeforeUpdate => depositGroupsBeforeUpdate.depositName);
                let noInGroupDepositTypesName = dbutility.difArrays(inGroupDepositTypesName, depositGroupBeforeUpdateNames);
                dbConfig.collection_depositGroup.remove({
                    depositName: {$in: noInGroupDepositTypesName},
                    depositParentDepositId: {$ne: -1}
                }).exec();
            }
        );

        depositGroups.forEach(depositGroup => {
            delete depositGroup.__v;
            delete depositGroup._id;

            // mongoose upsert wont trigger pre save function, so use if here, if not update with upsert is enough
            if (!depositGroup.depositId) {
                let depositGroupRecord = new dbConfig.collection_depositGroup(depositGroup);
                depositGroupRecord.save();
            } else {
                dbConfig.collection_depositGroup.update(
                    {depositId: depositGroup.depositId, topUpTypeId: depositGroup.topUpTypeId, topUpMethodId: depositGroup.topUpMethodId},
                    {$set: depositGroup},
                    {upsert: true}
                ).exec();
            }
        });
    },

    deleteDepositGroup: (depositGroupObjId) => {
        return dbConfig.collection_depositGroup.findOne({
            _id: depositGroupObjId
        }).then(
            depositGroup => {
                return dbConfig.collection_depositGroup.remove({
                    depositParentDepositId: depositGroup.depositId
                }).then(
                    () => {
                        return dbConfig.collection_depositGroup.remove({
                            _id: depositGroupObjId
                        });
                    }
                )
            }
        );
    },
};
module.exports = dbDepositGroup;