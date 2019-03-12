let dbconfig = require('./../modules/dbproperties');
let Q = require("q");
let pmsAPI = require('../externalAPI/pmsAPI');
let serverInstance = require("../modules/serverInstance");
const extConfig = require('../config/externalPayment/paymentSystems');
const rp = require('request-promise');
const constAccountType = require('../const/constAccountType');

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
     * Update the wechat pay group (multiple)
     * @param query - queryData
     * @param updateData -  updateData
     */
    updatePlatformAllWechatPayGroup: function (query, updateData) {
        return dbconfig.collection_platformWechatPayGroup.update(query, updateData, {
            multi: true,
            new: true
        });
    },

    /**
     * Get all the wechat pay groups by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformWechatPayGroup: function (platformId) {
        let topUpSystemConfig;
        let platformName;

        return dbconfig.collection_platform.findOne({_id: platformId}, {topUpSystemType: 1, platformId: 1, name: 1}).lean().then(
            platformData => {
                if (platformData) {
                    topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];
                    platformName = platformData && platformData.name ? platformData.name : null;

                    return addDefaultWechatPayGroup(topUpSystemConfig, platformId, platformName).then(
                        () => {
                            let matchQuery = {
                                platform: platformId
                            };

                            if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                matchQuery.isPMS2 = {$exists: true};
                            } else {
                                matchQuery.isPMS2 = {$exists: false};
                            }

                            return dbconfig.collection_platformWechatPayGroup.aggregate(
                                {
                                    $match: matchQuery
                                }
                            ).exec();
                        }
                    );
                }
            }
        );
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

    createNewWechatpayAcc: function (updateData) {
        return dbconfig.collection_platformWechatPayList.findOne(
            {
                platformId: updateData.platformId,
                accountNumber: updateData.accountNumber
            }
        ).lean().then(
            wechatpayData => {
                if (wechatpayData) {
                    return Promise.reject({name: "DataError", message: "Account number exists"});
                }
                return dbconfig.collection_platformWechatPayList(updateData).save()
            }
        );
    },

    getAllWechatpaysByWechatpayGroup: function(platformId){
        let topUpSystemConfig;

        return dbconfig.collection_platform.findOne({platformId:platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }

                topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

                if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                    return dbconfig.collection_platformWechatPayList.find(
                        {
                            platformId: platformId,
                            isFPMS: true,
                        }
                    ).lean().then(
                        wechatpatListData => {
                            return {data: wechatpatListData}; // to match existing code format
                        }
                    )
                } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    let options = {
                        method: 'POST',
                        uri: topUpSystemConfig.bankCardListAPIAddr,
                        body: {
                            platformId: platformId,
                            accountType: constAccountType.WECHAT
                        },
                        json: true
                    };

                    return rp(options).then(function (data) {
                        console.log('wechatlist success', data);
                        return data;
                    }, error => {
                        console.log('wechatlist failed', error);
                        throw error;
                    });
                } else {
                    return pmsAPI.weChat_getWechatList(
                        {
                            platformId: platformId,
                            queryId: serverInstance.getQueryId()
                        }
                    )
                }
            }
        )
    },

    getAllWechatpaysByGroupAndPlatformSetting: function (platformId, wechatPayGroupId) {
        return dbconfig.collection_platform.findOne({platformId:platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }

                if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                    return dbPlatformWechatPayGroup.getAllWechatpaysByGroupByFPMS(platformData, platformId, wechatPayGroupId);
                } else {
                    return dbPlatformWechatPayGroup.getAllWechatpaysByWechatpayGroupWithIsInGroup(platformData, platformId, wechatPayGroupId);
                }
            }
        )
    },

    // get alu pay by group (not using financial points)
    getAllWechatpaysByGroupByFPMS: function (platformDataObj, platformId, wechatPayGroupId) {
        let platformObjId;
        let wechatpayGroup;
        return Promise.resolve(platformDataObj).then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                platformObjId = platformData._id;
                return dbconfig.collection_platformWechatPayGroup.findOne({_id: wechatPayGroupId}).lean()
            }
        ).then(
            wechatpayGroupData => {
                if (!wechatpayGroupData) {
                    return Promise.reject({name: "DataError", message: "Cannot find alipay group"});
                }
                wechatpayGroup = wechatpayGroupData;
                return dbconfig.collection_platformWechatPayList.find(
                    {
                        platformId: platformId,
                        isFPMS: true,
                    }
                ).lean()
            }
        ).then(
            wechatList => {
                let wechatsGroup = wechatpayGroup.wechats;
                return wechatList.map(a=> {
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

    getAllWechatpaysByWechatpayGroupWithIsInGroup: function(platformDataObj, platformId, wechatPayGroupId){
        let platformObjId = null;
        let wechatList = [];
        let newWechats = [];
        let topUpSystemConfig;
        return Promise.resolve(platformDataObj).then(
            platform => {
                if (platform) {
                    platformObjId = platform._id;

                    topUpSystemConfig = extConfig && platform && platform.topUpSystemType && extConfig[platform.topUpSystemType];

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        let options = {
                            method: 'POST',
                            uri: topUpSystemConfig.bankCardListAPIAddr,
                            body: {
                                platformId: platformId,
                                accountType: constAccountType.WECHAT
                            },
                            json: true
                        };

                        return rp(options).then(function (data) {
                            console.log('wechatlist success', data);
                            return data;
                        }, error => {
                            console.log('wechatlist failed', error);
                            throw error;
                        });
                    } else {
                        return pmsAPI.weChat_getWechatList(
                            {
                                platformId: platformId,
                                queryId: serverInstance.getQueryId()
                            }
                        );
                    }

                }
            }
        ).then(
            data => {
                if (data && data.data) {
                    let wechats = data.data;
                    let updateWechatProm = [];
                    wechatList = wechats;

                    let query = {
                        platformId: platformId,
                        $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                    };

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        query.isPMS2 = {$exists: true};
                    } else {
                        query.isPMS2 = {$exists: false};
                    }

                    return dbconfig.collection_platformWechatPayList.find(query).lean().then(oldWechats => {
                        wechats.forEach(wechat => {
                            if(oldWechats && oldWechats.length > 0) {
                                let match = false;
                                oldWechats.forEach(oldWechat => {
                                    if (wechat.accountNumber == oldWechat.accountNumber) {
                                        match = true;
                                    }
                                });
                                if (!match) {
                                    newWechats.push(wechat.accountNumber);
                                }
                            } else if (!oldWechats.length && topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                newWechats.push(wechat.accountNumber);
                            }

                            if(wechat && wechat.accountNumber) {
                                let quota = Number(wechat.quota);
                                let singleLimit = Number(wechat.singleLimit);
                                let wechatPayQuery = {
                                    accountNumber: wechat.accountNumber,
                                    platformId: platformId,
                                    $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                                };
                                let updateData = {
                                    accountNumber: wechat.accountNumber,
                                    name: wechat.name || '',
                                    platformId: wechat.platformId || '',
                                    quota: isNaN(quota) ? 0 : quota,
                                    state: wechat.state || '',
                                    singleLimit : isNaN(singleLimit) ? 0 : singleLimit,
                                    bankTypeId: wechat.bankTypeId || '',
                                    nickName: wechat.nickName || ''
                                };

                                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                    wechatPayQuery.isPMS2 = {$exists: true};
                                    updateData.isPMS2 = true;
                                } else {
                                    wechatPayQuery.isPMS2 = {$exists: false};
                                }

                                updateWechatProm.push(
                                    dbconfig.collection_platformWechatPayList.findOneAndUpdate(
                                        wechatPayQuery,
                                        updateData,
                                        {upsert: true}
                                    )
                                );
                            }
                        });
                        return Promise.all(updateWechatProm);
                    });
                }
            }
        ).then(
            () => {
                let wechatAccountNumbers = wechatList.map(wechat => wechat.accountNumber);
                let wechatpayQuery = {
                    platformId: platformId,
                    accountNumber: {$nin: wechatAccountNumbers},
                    $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                };

                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    wechatpayQuery.isPMS2 = {$exists: true};
                } else {
                    wechatpayQuery.isPMS2 = {$exists: false};
                }

                return dbconfig.collection_platformWechatPayList.find(wechatpayQuery).lean().then(
                    deletedWechats => {
                        if(deletedWechats && deletedWechats.length > 0) {
                            let deletedAccountNumbers = [];
                            deletedWechats.forEach(wechat => {deletedAccountNumbers.push(wechat.accountNumber);});
                            let deleteWechatPayQuery = {
                                platformId: platformId,
                                accountNumber:{'$in': deletedAccountNumbers}
                            };

                            if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                deleteWechatPayQuery.isPMS2 = {$exists: true};
                            } else {
                                deleteWechatPayQuery.isPMS2 = {$exists: false};
                            }

                            return dbconfig.collection_platformWechatPayList.remove(deleteWechatPayQuery)
                        }
                    }
                )
            }
        ).then(
            () => {
                if(newWechats && newWechats.length > 0) {
                    let groupQuery;

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        groupQuery = {platform: platformObjId, isPMS2: {$exists: true}};
                    } else {
                        groupQuery = {platform: platformObjId, bDefault: true, isPMS2: {$exists: false}}
                    }

                    return dbconfig.collection_platformWechatPayGroup.update(
                        groupQuery,
                        {$addToSet: {
                            wechats: {$each: newWechats}
                        }}
                    );
                }
            }
        ).then(
            () => {
                if (wechatList && wechatList.length > 0) {
                    let wechats = wechatList.map(wechat => wechat.accountNumber);
                    let wechatPayGroupQuery;

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        wechatPayGroupQuery = {platform: platformObjId, isPMS2: {$exists: true}};
                    } else {
                        wechatPayGroupQuery = {platform: platformObjId, isPMS2: {$exists: false}};
                    }
                    return dbconfig.collection_platformWechatPayGroup.update(
                        wechatPayGroupQuery,
                        {$pull: {wechats: {$nin: wechats}}},
                        {multi: true}
                    );
                }
            }
        ).then(
            () => {
                return dbconfig.collection_platformWechatPayGroup.findOne({_id: wechatPayGroupId})
            }
        ).then(
            data => {
                let wechatsGroup = data.wechats || [];
                return wechatList.map(a=> {
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
    },

    updateWechatPayAcc: function (query, updateData) {
        return dbconfig.collection_platformWechatPayList.findOneAndUpdate(query, updateData).lean();
    },

    deleteWechatPayAcc: function (WechatPayObjId) {
        return dbconfig.collection_platformWechatPayList.remove({_id: WechatPayObjId}).exec();
    }
};

function addDefaultWechatPayGroup(topUpSystemConfig, platformObjId, platformName) {
    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
        return dbconfig.collection_platformWechatPayGroup.findOne({platform: platformObjId, isPMS2: {$exists: true}}).lean().then(
            pms2WechatPayGroupExists => {
                if (!pms2WechatPayGroupExists && platformName) {
                    let defaultStr = "PMS2DefaultGroup" + platformName;
                    let groupData = {
                        groupId: defaultStr,
                        name: defaultStr,
                        code: defaultStr,
                        displayName: defaultStr,
                        platform: platformObjId,
                        isPMS2: true
                    };

                    let wechatPayGroup = new dbconfig.collection_platformWechatPayGroup(groupData);

                    return wechatPayGroup.save();
                } else {
                    return Promise.resolve(true);
                }
            }
        );
    } else {
        return Promise.resolve(true);
    }
}

module.exports = dbPlatformWechatPayGroup;