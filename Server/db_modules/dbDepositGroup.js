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
        let proms = [];
        let inGroupDepositTypesId = []

        depositGroups.forEach(depositGroup => {
            if (depositGroup && depositGroup.depositId) {
                inGroupDepositTypesId.push(depositGroup.depositId);
            }
        });

        return dbConfig.collection_depositGroup.find({depositId: {$nin: inGroupDepositTypesId}}).lean().then(
            notInGroupDepositData => {

                if (notInGroupDepositData && notInGroupDepositData.length > 0) {
                    let notInGroupDepositTypesId = notInGroupDepositData.map(depositGroup => depositGroup.depositId);

                    // remove depositGroup that no longer in group
                    proms.push(dbConfig.collection_depositGroup.remove({depositId: {$in: notInGroupDepositTypesId}}).exec());
                }

                depositGroups.forEach(depositGroup => {
                    delete depositGroup.__v;
                    delete depositGroup._id;

                    if (!depositGroup.depositId) {
                        proms.push(new dbConfig.collection_depositGroup(depositGroup).save());
                    } else {
                        let newDepositGroup = {
                            depositId: depositGroup.depositId,
                            topUpTypeId: depositGroup.topUpTypeId
                        };

                        if (depositGroup && depositGroup.topUpMethodId) {
                            newDepositGroup.topUpMethodId = depositGroup.topUpMethodId;
                        }

                        proms.push(dbConfig.collection_depositGroup.update(
                            newDepositGroup,
                            {$set: depositGroup},
                            {upsert: true}
                        ).exec());
                    }
                });

                return Promise.all(proms);
            }
        )
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