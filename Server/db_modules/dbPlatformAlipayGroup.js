var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var pmsAPI = require('../externalAPI/pmsAPI');
var serverInstance = require("../modules/serverInstance");

var dbPlatformAlipayGroup = {

    /**
     * Create a new bank card group
     * @param {String}  platform - platform ObjId
     * @param {String}  name, code, displayName
     */
    addPlatformAlipayGroup: function (platform, name, code, displayName) {
        let newGroup = {
            groupId: name,
            name: name,
            code: code,
            displayName: displayName,
            platform: platform,
        };

        var aliGroup = new dbconfig.collection_platformAlipayGroup(newGroup);
        return aliGroup.save();
    },

    /**
     * Update the  bank card group
     * @param {Json}  query - queryData
     * @param {Json}  updateData -  updateData
     */
    updatePlatformAlipayGroup: function (query, updateData) {
        return dbconfig.collection_platformAlipayGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});
    },

    /**
     * Update the  bank card group (multiple
     * @param {Json}  query - queryData
     * @param {Json}  updateData -  updateData
     */
    updatePlatformAllAlipayGroup: function (query, updateData) {
        return dbconfig.collection_platformAlipayGroup.update(query, updateData, {multi: true, new: true});
    },

    /**
     * Get all the bank card groups  by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformAlipayGroup: function (platformId) {
        return dbconfig.collection_platformAlipayGroup.aggregate(
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
    removeAlipayGroup: function (groupObjId) {
        return dbconfig.collection_platformAlipayGroup.remove({_id: groupObjId}).exec();
    },

    setPlatformDefaultAlipayGroup: function (platformId, defaultID) {
        return dbconfig.collection_platformAlipayGroup.find({platform: platformId})
            .then(
                data=> {
                    if (data) {
                        var allProm = [];
                        for (var i in data) {
                            if (data[i].bDefault && data[i]._id != defaultID) {
                                var prom = dbconfig.collection_platformAlipayGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: false}, {upsert: true, new: true});
                                allProm.push(prom);
                            } else if (!data[i].bDefault && data[i]._id == defaultID) {
                                var prom = dbconfig.collection_platformAlipayGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: true}, {upsert: true, new: true});
                                allProm.push(prom);
                            }
                        }
                        return Q.all(allProm);
                    }
                }
            );
    },

    /**
     * Get all the alipays  which are attached to the  platformAlipayGroup
     * @param {Json}  query - platform , groupId
     */
    getAlipaysInPlatformAlipayGroup: function (platformId, groupId) {

        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {

                if (platformData) {
                    return dbconfig.collection_platformBankCardGroup.findOne({platform: platformData._id, groupId: groupId}).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(alipayGroupData => {

                if (alipayGroupData && alipayGroupData.alipays && alipayGroupData.alipays.length > 0) {
                    return alipayGroupData.banks;
                }
                else return [];
            }
        )
    },

    createNewAlipayAcc: function (updateData) {
        return dbconfig.collection_platformAlipayList.findOne(
            {
                platformId: updateData.platformId,
                accountNumber: updateData.accountNumber
            }
        ).lean().then(
            alipayData => {
                if (alipayData) {
                    return Promise.reject({name: "DataError", message: "Account number exists"});
                }
                return dbconfig.collection_platformAlipayList(updateData).save()
            }
        );
    },

    getAllAlipaysByAlipayGroup: function(platformId){
        return dbconfig.collection_platform.findOne({platformId:platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                if (platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) {
                    return dbconfig.collection_platformAlipayList.find(
                        {
                            platformId: platformId,
                            isFPMS: true,
                        }
                    ).lean().then(
                        alipayListData => {
                            return {data: alipayListData} // to match existing code format
                        }
                    )
                } else {
                    return pmsAPI.alipay_getAlipayList(
                        {
                            platformId: platformId,
                            queryId: serverInstance.getQueryId()
                        }
                    );
                }
            }
        )
    },

    getAllAlipaysByGroupAndPlatformSetting: function (platformId, alipayGroupId) {
        return dbconfig.collection_platform.findOne({platformId:platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                if (platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) {
                    return dbPlatformAlipayGroup.getAllAlipaysByGroupByFPMS(platformData, platformId, alipayGroupId);
                } else {
                    return dbPlatformAlipayGroup.getAllAlipaysByAlipayGroupWithIsInGroup(platformData, platformId, alipayGroupId);
                }
            }
        )
    },

    // get alu pay by group (not using financial points)
    getAllAlipaysByGroupByFPMS: function (platformDataObj, platformId, alipayGroupId) {
        let platformObjId;
        let alipayGroup;
        return Promise.resolve(platformDataObj).then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                platformObjId = platformData._id;
                return dbconfig.collection_platformAlipayGroup.findOne({_id: alipayGroupId}).lean()
            }
        ).then(
            alipayGroupData => {
                if (!alipayGroupData) {
                    return Promise.reject({name: "DataError", message: "Cannot find alipay group"});
                }
                alipayGroup = alipayGroupData;
                return dbconfig.collection_platformAlipayList.find(
                    {
                        platformId: platformId,
                        isFPMS: true,
                    }
                ).lean()
            }
        ).then(
            alipayList => {
                let alipaysGroup = alipayGroup.alipays;
                return alipayList.map(a=> {
                    if (alipaysGroup.indexOf(a.accountNumber) != -1) {
                        //in group
                        a.isInGroup = true;
                    } else {
                        //not in group
                        a.isInGroup = false;
                    }
                    return a;
                })
            }
        )
    },

    getAllAlipaysByAlipayGroupWithIsInGroup: function(platformDataObj, platformId, alipayGroupId){
        let platformObjId = null;
        let alipayList = [];
        let newAlipays = [];
        return Promise.resolve(platformDataObj).then(
            platform => {
                if (platform) {
                    platformObjId = platform._id;
                    return pmsAPI.alipay_getAlipayList(
                        {
                            platformId: platformId,
                            queryId: serverInstance.getQueryId()
                        }
                    )
                }
            }
        ).then(
            data => {
                if (data && data.data) {
                    let alipays = data.data;
                    let updateAlipayProm = [];
                    alipayList = alipays;
                    return dbconfig.collection_platformAlipayList.find(
                        {
                            platformId: platformId,
                            $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                        }
                    ).lean().then(oldAlipays => {
                        alipays.forEach(alipay => {
                            if(oldAlipays && oldAlipays.length > 0) {
                                let match = false;
                                oldAlipays.forEach(oldAlipay => {
                                    if (alipay.accountNumber == oldAlipay.accountNumber) {
                                        match = true;
                                    }
                                });
                                if (!match) {
                                    newAlipays.push(alipay.accountNumber);
                                }
                            }
                            if(alipay && alipay.accountNumber) {
                                let quota = Number(alipay.quota);
                                let singleLimit = Number(alipay.singleLimit);
                                updateAlipayProm.push(
                                    dbconfig.collection_platformAlipayList.findOneAndUpdate(
                                        {
                                            accountNumber: alipay.accountNumber,
                                            platformId: platformId,
                                            $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                                        },
                                        {
                                            accountNumber: alipay.accountNumber,
                                            name: alipay.name || '',
                                            platformId: alipay.platformId || '',
                                            quota: isNaN(quota) ? 0 : quota,
                                            state: alipay.state || '',
                                            singleLimit : isNaN(singleLimit) ? 0 : singleLimit,
                                            bankTypeId: alipay.bankTypeId || ''
                                        },
                                        {upsert: true}
                                    )
                                );
                            }
                        });
                        return Promise.all(updateAlipayProm);
                    });
                }
            }
        ).then(
            () => {
                let alipayAccountNumbers = alipayList.map(alipay => alipay.accountNumber);
                return dbconfig.collection_platformAlipayList.find({platformId: platformId, accountNumber: {$nin: alipayAccountNumbers},  $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]}).lean().then(
                    deletedAlipays => {
                        if(deletedAlipays && deletedAlipays.length > 0) {
                            let deletedAccountNumbers = [];
                            deletedAlipays.forEach(alipay => {deletedAccountNumbers.push(alipay.accountNumber);});
                            return dbconfig.collection_platformAlipayList.remove({platformId: platformId, accountNumber:{'$in': deletedAccountNumbers}})
                        }
                    }
                )
            }
        ).then(
            () => {
                if(newAlipays && newAlipays.length > 0) {
                    return dbconfig.collection_platformAlipayGroup.update(
                        {platform: platformObjId, bDefault: true},
                        {$addToSet: {
                            alipays: {$each: newAlipays}
                        }}
                    );
                }
            }
        ).then(
            () => {
                if (alipayList && alipayList.length > 0) {
                    let alipays = alipayList.map(alipay => alipay.accountNumber);
                    return dbconfig.collection_platformAlipayGroup.update(
                        {platform: platformObjId},
                        {$pull: {alipays: {$nin: alipays}}},
                        {multi: true}
                    );
                }
            }
        ).then(
            () => {
                return dbconfig.collection_platformAlipayGroup.findOne({_id: alipayGroupId})
            }
        ).then(
            data=> {
                var alipaysGroup = data.alipays || [];
                return alipayList.map(a=> {
                     if (alipaysGroup.indexOf(a.accountNumber) != -1) {
                         //in group
                         a.isInGroup = true;
                     } else {
                         //not in group
                         a.isInGroup = false;
                     }
                     return a;
                })
            });
    },

    getIncludedAlipaysByAlipayGroup: function (platformId, alipayGroupId) {
        var allAlipays = [];
        return pmsAPI.alipay_getAlipayList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data=> {
                allAlipays = data.data || [];
                return dbconfig.collection_platformAlipayGroup.findOne({_id: alipayGroupId})
            }
        ).then(
            data=> {
                var alipaysArr = data.alipays || [];
                return allAlipays.filter(a=> {
                    return alipaysArr.indexOf(a.accountNumber) != -1
                })
            })
    },

    getExcludedAlipaysByAlipayGroup: function (platformId, alipayGroupId) {
        var allAlipays = [];
        return pmsAPI.alipay_getAlipayList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data=> {
                allAlipays = data.data || [];
                return dbconfig.collection_platformAlipayGroup.findOne({_id: alipayGroupId})
            }
        ).then(
            data=> {
                var alipaysArr = data.alipays || [];
                return allAlipays.filter(a=> {
                    return alipaysArr.indexOf(a.accountNumber) == -1
                })
            })
    },

    addPlayersToAlipayGroup: function (bankAlipayGroupObjId, playerObjIds) {
        return dbconfig.collection_players.update(
            {_id: {$in: playerObjIds}},
            {alipayGroup: bankAlipayGroupObjId},
            {multi: true}
        );
    },

    addAllPlayersToAlipayGroup: function (bankAlipayGroupObjId, platformObjId) {
        return dbconfig.collection_players.update({platform: platformObjId}, {alipayGroup: bankAlipayGroupObjId}, {multi: true}).then(data => {
            if (data && data.ok) {
                return {platform: platformObjId, alipayGroup: bankAlipayGroupObjId, nModified: data.nModified, n: data.n}
            } else {
                return {platform: platformObjId, alipayGroup: bankAlipayGroupObjId, error: data};
            }
        });
    },

    deleteAlipay: function(accountNumber){
        return dbconfig.collection_platformAlipayGroup.update(
            {},
            {$pull: {alipays: {$in: [accountNumber]}}},
            {multi: true}
        );
    }

};

module.exports = dbPlatformAlipayGroup;