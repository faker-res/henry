let dbconfig = require('./../modules/dbproperties');
let Q = require("q");
let pmsAPI = require('../externalAPI/pmsAPI');
let serverInstance = require("../modules/serverInstance");

let dbPlatformQuickPayGroup = {

    /**
     * Create a new bank card group
     * @param {String}  platform - platform ObjId
     * @param {String}  name, code, displayName
     */
    addPlatformQuickPayGroup: function (platform, name, code, displayName) {
        let QuickPayGroup = new dbconfig.collection_platformQuickPayGroup({
            groupId: name,
            name: name,
            code: code,
            displayName: displayName,
            platform: platform,
        });
        return QuickPayGroup.save();
    },

    /**
     * Update the  bank card group
     * @param {Json}  query - queryData
     * @param {Json}  updateData -  updateData
     */
    updatePlatformQuickPayGroup: function (query, updateData) {
        return dbconfig.collection_platformQuickPayGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});
    },

    /**
     * Get all the bank card groups  by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformQuickPayGroup: function (platformId) {
        return dbconfig.collection_platformQuickPayGroup.aggregate(
            {
                $match: {
                    platform: platformId
                }
            }
        ).exec();
    },

    /**
     * Remove/Delete  a group and its all children
     * @param {objectId} groupObjId
     */
    removeQuickPayGroup: function (groupObjId) {
        return dbconfig.collection_platformQuickPayGroup.remove({_id: groupObjId}).exec();
    },

    setPlatformDefaultQuickPayGroup: function (platformId, defaultID) {
        return dbconfig.collection_platformQuickPayGroup.find({platform: platformId})
            .then(
                data=> {
                    if (data) {
                        let allProm = [];
                        for (let i in data) {
                            if (data[i].bDefault && data[i]._id != defaultID) {
                                let prom = dbconfig.collection_platformQuickPayGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: false}, {upsert: true, new: true});
                                allProm.push(prom);
                            } else if (!data[i].bDefault && data[i]._id == defaultID) {
                                let prom = dbconfig.collection_platformQuickPayGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: true}, {upsert: true, new: true});
                                allProm.push(prom);
                            }
                        }
                        return Q.all(allProm);
                    }
                }
            );
    },

    /**
     * Get all the quickPays which are attached to the platformQuickPayGroup
     * @param {Json}  query - platform , groupId
     */
    getQuickPaysInPlatformQuickPayGroup: function (platformId, groupId) {

        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {

                if (platformData) {
                    return dbconfig.collection_platformBankCardGroup.findOne({platform: platformData._id, groupId: groupId}).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(QuickPayGroupData => {

                if (QuickPayGroupData && QuickPayGroupData.quickpays && QuickPayGroupData.quickpays.length > 0) {
                    return QuickPayGroupData.banks;
                }
                else return [];
            }
        )
    },

    getIncludedQuickPaysByQuickPayGroup: function (platformId, QuickPayGroupId) {
        let allQuickPays = [];
        return pmsAPI.quickPayment_getQuickPaymentList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data=> {
                allQuickPays = data.data || [];
                return dbconfig.collection_platformQuickPayGroup.findOne({_id: QuickPayGroupId})
            }
        ).then(
            data=> {
                let QuickPaysArr = data.quickpays || [];
                return allQuickPays.filter(a=> {
                    return QuickPaysArr.indexOf(a.accountNumber) != -1
                })
            })
    },

    getExcludedQuickPaysByQuickPayGroup: function (platformId, QuickPayGroupId) {
        let allQuickPays = [];
        return pmsAPI.quickPayment_getQuickPaymentList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data=> {
                allQuickPays = data.data || [];
                return dbconfig.collection_platformQuickPayGroup.findOne({_id: QuickPayGroupId})
            }
        ).then(
            data=> {
                let QuickPaysArr = data.quickpays || [];
                return allQuickPays.filter(a=> {
                    return QuickPaysArr.indexOf(a.accountNumber) == -1
                })
            })
    },

    addPlayersToQuickPayGroup: function (bankQuickPayGroupObjId, playerObjIds) {
        return dbconfig.collection_players.update(
            {_id: {$in: playerObjIds}},
            {quickPayGroup: bankQuickPayGroupObjId},
            {multi: true}
        );
    },

    addAllPlayersToQuickPayGroup: function (bankQuickPayGroupObjId, platformObjId) {
        return dbconfig.collection_players.update({platform: platformObjId}, {quickPayGroup: bankQuickPayGroupObjId}, {multi: true}).then(data => {
            if (data && data.ok) {
                return {platform: platformObjId, quickPayGroup: bankQuickPayGroupObjId, nModified: data.nModified, n: data.n}
            } else {
                return {platform: platformObjId, quickPayGroup: bankQuickPayGroupObjId, error: data};
            }
        });
    },

    deleteQuickPay: function(accountNumber){
        return dbconfig.collection_platformQuickPayGroup.update(
            {},
            {$pull: {quickpays: {$in: [accountNumber]}}},
            {multi: true}
        );
    }

};

module.exports = dbPlatformQuickPayGroup;