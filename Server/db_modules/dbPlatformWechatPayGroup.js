let dbconfig = require('./../modules/dbproperties');
let Q = require("q");
let pmsAPI = require('../externalAPI/pmsAPI');
let serverInstance = require("../modules/serverInstance");

let dbPlatformWechatPayGroup = {

    /**
     * Create a new wechat pay group
     * @param {String}  platform - platform ObjId
     * @param {String}  name, code, displayName
     * @param {String}  code
     * @param {String}  displayName
     */
    addPlatformWechatPayGroup: function (platform, name, code, displayName) {
        let wechatPayGroup = new dbconfig.collection_platformWechatPayGroup({
            groupId: name,
            name: name,
            code: code,
            displayName: displayName,
            platform: platform,
        });
        return wechatPayGroup.save();
    },

    /**
     * Update the wechat pay group
     * @param query - queryData
     * @param updateData -  updateData
     */
    updatePlatformWechatPayGroup: function (query, updateData) {
        return dbconfig.collection_platformWechatPayGroup.findOneAndUpdate(query, updateData, {
            upsert: true,
            new: true
        });
    },

    /**
     * Get all the wechat pay groups by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformWechatPayGroup: function (platformId) {
        return dbconfig.collection_platformWechatPayGroup.aggregate(
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
    removeWechatPayGroup: function (groupObjId) {
        return dbconfig.collection_platformWechatPayGroup.remove({_id: groupObjId}).exec();
    },

    setPlatformDefaultWechatPayGroup: function (platformId, defaultID) {
        return dbconfig.collection_platformWechatPayGroup.find({platform: platformId})
            .then(
                data => {
                    if (data) {
                        let allProm = [];
                        for (let i in data) {
                            if (data.hasOwnProperty(i)) {
                                if (data[i].bDefault && data[i]._id != defaultID) {
                                    let prom = dbconfig.collection_platformWechatPayGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: false}, {
                                        upsert: true,
                                        new: true
                                    });
                                    allProm.push(prom);
                                } else if (!data[i].bDefault && data[i]._id == defaultID) {
                                    let prom = dbconfig.collection_platformWechatPayGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: true}, {
                                        upsert: true,
                                        new: true
                                    });
                                    allProm.push(prom);
                                }
                            }
                        }
                        return Q.all(allProm);
                    }
                }
            );
    },

    /**
     * Get all the wechats which are attached to the platformWechatPayGroup
     * @param platformId - platform , groupId
     * @param groupId
     */
    getWechatsInPlatformWechatPayGroup: function (platformId, groupId) {
        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_platformWechatPayGroup.findOne({
                        platform: platformData._id,
                        groupId: groupId
                    }).exec();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(wechatPayGroupData => {
                if (wechatPayGroupData && wechatPayGroupData.wechats && wechatPayGroupData.wechats.length > 0) {
                    return wechatPayGroupData.banks;
                }
                else return [];
            }
        )
    },
    getAllWechatpaysByWechatpayGroup: function(platformId){
        return pmsAPI.weChat_getWechatList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        );
    },

    getAllWechatpaysByWechatpayGroupWithIsInGroup: function(platformId, wechatPayGroupId){
        let allWechats = [];
        return pmsAPI.weChat_getWechatList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data => {
                allWechats = data.data || [];
                return dbconfig.collection_platformWechatPayGroup.findOne({_id: wechatPayGroupId})
            }
        ).then(
            data => {
                let wechatsGroup = data.wechats || [];
                return allWechats.map(a=> {
                    if (wechatsGroup.indexOf(a.accountNumber) != -1) {
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

    getIncludedWechatsByWechatPayGroup: function (platformId, wechatPayGroupId) {
        let allWechats = [];
        return pmsAPI.weChat_getWechatList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data => {
                allWechats = data.data || [];
                return dbconfig.collection_platformWechatPayGroup.findOne({_id: wechatPayGroupId})
            }
        ).then(
            data => {
                let wechatsArr = data.wechats || [];
                return allWechats.filter(a => {
                    return wechatsArr.indexOf(a.accountNumber) !== -1
                })
            }
        )
    },

    getExcludedWechatsByWechatPayGroup: function (platformId, wechatPayGroupId) {
        let allWechats = [];
        return pmsAPI.weChat_getWechatList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data => {
                allWechats = data.data || [];
                return dbconfig.collection_platformWechatPayGroup.findOne({_id: wechatPayGroupId})
            }
        ).then(
            data => {
                let wechatsArr = data.wechats || [];
                return allWechats.filter(a => {
                    return wechatsArr.indexOf(a.accountNumber) === -1
                })
            }
        )
    },

    addPlayersToWechatPayGroup: function (bankWechatPayGroupObjId, playerObjIds) {
        return dbconfig.collection_players.update(
            {_id: {$in: playerObjIds}},
            {wechatPayGroup: bankWechatPayGroupObjId},
            {multi: true}
        );
    },
    addAllPlayersToWechatPayGroup: function (weChatGroupObjId, platformObjId) {
        return dbconfig.collection_players.update({platform: platformObjId}, {wechatPayGroup: weChatGroupObjId}, {multi: true}).then(data => {
            if (data && data.ok) {
                return {platform: platformObjId, wechatPayGroup: weChatGroupObjId, nModified: data.nModified, n: data.n}
            } else {
                return {platform: platformObjId, wechatPayGroup: weChatGroupObjId, error: data};
            }
        });
    },

    deleteWechatPay: function (accountNumber) {
        return dbconfig.collection_platformWechatPayGroup.update(
            {},
            {$pull: {wechats: {$in: [accountNumber]}}},
            {multi: true}
        );
    }

};

module.exports = dbPlatformWechatPayGroup;