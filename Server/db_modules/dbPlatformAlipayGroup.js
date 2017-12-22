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
        var aliGroup = new dbconfig.collection_platformAlipayGroup({
            groupId: name,
            name: name,
            code: code,
            displayName: displayName,
            platform: platform,
        });
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
    getAllAlipaysByAlipayGroup: function(platformId){
        return pmsAPI.alipay_getAlipayList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        );
    },

    getAllAlipaysByAlipayGroupWithIsInGroup: function(platformId, alipayGroupId){
        let allAlipays = [];
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
                var alipaysGroup = data.alipays || [];
                return allAlipays.map(a=> {
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