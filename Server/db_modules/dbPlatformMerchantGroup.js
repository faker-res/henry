/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var pmsAPI = require('../externalAPI/pmsAPI');
var serverInstance = require("../modules/serverInstance");

var dbPlatformMerchantGroup = {

    /**
     * Create a new bank card group
     * @param {String}  platform - platform ObjId
     * @param {String}  name, code, displayName
     */
    addPlatformMerchantGroup: function (platform, name, code, displayName) {
        var gameGroup = new dbconfig.collection_platformMerchantGroup({
            groupId: name,
            name: name,
            code: code,
            displayName: displayName,
            platform: platform,
        });
        return gameGroup.save();
    },

    /**
     * Update the  bank card group
     * @param {Json}  query - queryData
     * @param {Json}  updateData -  updateData
     */
    updatePlatformMerchantGroup: function (query, updateData) {
        return dbconfig.collection_platformMerchantGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});
    },

    /**
     * Get all the bank card groups  by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformMerchantGroup: function (platformId) {
        return dbPlatformMerchantGroup.syncMerchantGroupData(platformId).then(
            data => dbconfig.collection_platformMerchantGroup.aggregate(
                {
                    $match: {
                        platform: platformId
                    }
                }
            )
        );
    },

    /**
     * Remove/Delete  a group and its all children
     * @param {objectId} groupObjId
     */
    removeMerchantGroup: function (groupObjId) {
        return dbconfig.collection_platformMerchantGroup.remove({_id: groupObjId}).exec();
    },

    setPlatformDefaultMerchantGroup: function (platformId, defaultID) {
        return dbconfig.collection_platformMerchantGroup.find({platform: platformId})
            .then(
                data=> {
                    if (data) {
                        var allProm = [];
                        for (var i in data) {
                            if (data[i].bDefault && data[i]._id != defaultID) {
                                var prom = dbconfig.collection_platformMerchantGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: false}, {
                                    upsert: true,
                                    new: true
                                });
                                allProm.push(prom);
                            } else if (!data[i].bDefault && data[i]._id == defaultID) {
                                var prom = dbconfig.collection_platformMerchantGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: true}, {
                                    upsert: true,
                                    new: true
                                });
                                allProm.push(prom);
                            }
                        }
                        return Q.all(allProm);
                    }
                }
            );
    },

    /**
     * Get all the merchants  which are attached to the  platformMerchantGroup
     * @param {Json}  query - platform , groupId
     */
    getMerchantsInPlatformMerchantGroup: function (platformId, groupId) {

        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {

                if (platformData) {
                    return dbconfig.collection_platformBankCardGroup.findOne({
                        platform: platformData._id,
                        groupId: groupId
                    }).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(merchantGroupData => {

                if (merchantGroupData && merchantGroupData.merchants && merchantGroupData.merchants.length > 0) {
                    return merchantGroupData.banks;
                }
                else return [];
            }
        )
    },

    getIncludedMerchantsByMerchantGroup: function (platformId, merchantGroupId) {
        var allMerchants = [];
        return pmsAPI.merchant_getMerchantList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data=> {
                allMerchants = data.merchants || [];
                return dbconfig.collection_platformMerchantGroup.findOne({_id: merchantGroupId})
            }
        ).then(
            data=> {
                var merchantsArr = data.merchants || [];
                return allMerchants.filter(a=> {
                    return merchantsArr.indexOf(a.merchantNo) != -1
                })
            })
    },

    getExcludedMerchantsByMerchantGroup: function (platformId, merchantGroupId) {
        var allMerchants = [];
        return pmsAPI.merchant_getMerchantList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data=> {
                allMerchants = data.merchants || [];
                return dbconfig.collection_platformMerchantGroup.findOne({_id: merchantGroupId})
            }
        ).then(
            data=> {
                var merchantsArr = data.merchants || [];
                return allMerchants.filter(a=> {
                    return merchantsArr.indexOf(a.merchantNo) == -1
                })
            })
    },

    addPlayersToMerchantGroup: function (bankMerchantGroupObjId, playerObjIds) {
        return dbconfig.collection_players.update(
            {_id: {$in: playerObjIds}},
            {merchantGroup: bankMerchantGroupObjId},
            {multi: true}
        );
    },

    deleteMerchant: function (merchantNo) {
        return dbconfig.collection_platformMerchantGroup.update(
            {},
            {$pull: {merchants: {$in: [merchantNo]}}},
            {multi: true}
        );
    },

    syncMerchantGroupData: function (platformObjId) {
        var platformId = null;
        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platform => {
                if (platform) {
                    platformId = platform.platformId;
                    return pmsAPI.merchant_getMerchantList(
                        {
                            platformId: platform.platformId,
                            queryId: serverInstance.getQueryId()
                        }
                    )
                }
            }
        ).then(
            data => {
                if (data && data.merchants && data.merchants.length > 0) {
                    var merchants = data.merchants.map(merchant => merchant.merchantNo);
                    return dbconfig.collection_platformMerchantGroup.update(
                        {platform: platformObjId},
                        {$pull: {merchants: {$nin: merchants}}},
                        {multi: true}
                    );
                }
            }
        );
    }

};

module.exports = dbPlatformMerchantGroup;