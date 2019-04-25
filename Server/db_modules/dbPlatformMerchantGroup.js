var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var pmsAPI = require('../externalAPI/pmsAPI');
var serverInstance = require("../modules/serverInstance");
const extConfig = require('../config/externalPayment/paymentSystems');
const rp = require('request-promise');
const constAccountType = require('../const/constAccountType');

const RESTUtils = require('../modules/RESTUtils');

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
        return gameGroup.save().catch(function (err) {
            let message = '';
            if (err) {
                if (err.code == '11000') {
                    message = "This Key is Exist，Please Choose Another Name";
                } else {
                    message = err.errmsg ? err.errmsg : "";
                }
                return Q.reject({name: "DataError", message: message});
            }
        })
    },

    /**
     * Update the  bank card group
     * @param {Json}  query - queryData
     * @param {Json}  updateData -  updateData
     */
    updatePlatformMerchantGroup: function (query, data) {
        let updateData = {};
        let merchantNo = data.data.merchantNo ? data.data.merchantNo : [];
        let merchantNames = data.data.merchantNames ? data.data.merchantNames : [];
        if (data.type == 'addToSet') {
            updateData = {
                '$addToSet': {
                    merchants: {$each: merchantNo},
                    merchantNames: {$each: merchantNames}
                }
            }
        } else if (data.type == 'pull') {
            updateData = {
                '$pull': {
                    merchants: {$in: merchantNo},
                    merchantNames: {$in: merchantNames},
                }
            }
        }
        return dbconfig.collection_platformMerchantGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});
    },
    updatePlatformMerchantGroupInfo: function (query, updateData) {
        return dbconfig.collection_platformMerchantGroup.findOneAndUpdate(query, updateData, {
            upsert: true,
            new: true
        }).then(data => {
        }, err => {
            let message = '';
            if (err) {
                if (err.code == '11000') {
                    message = "This Key is Exist，Please Choose Another Name";
                } else {
                    message = err.errmsg ? err.errmsg : "";
                }
                return Q.reject({name: "DataError", message: message});
            }
        })
    },
    /**
     * Get all the bank card groups  by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformMerchantGroup: function (platformId) {
        let topUpSystemConfig;

        return dbconfig.collection_platform.findOne({_id: platformId}, {topUpSystemType: 1}).lean().then(
            platformData => {
                if (platformData) {
                    topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

                    let matchQuery = {
                        platform: platformId
                    };

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        matchQuery.isPMS2 = {$exists: true};
                    } else {
                        matchQuery.isPMS2 = {$exists: false};
                    }

                    return dbPlatformMerchantGroup.syncMerchantGroupData(platformId).then(
                        data => {
                            return dbconfig.collection_platformMerchantGroup.aggregate(
                                {
                                    $match: matchQuery
                                }
                            )
                        },
                        error => {
                            return dbconfig.collection_platformMerchantGroup.aggregate(
                                {
                                    $match: matchQuery
                                }
                            )
                        }
                    );
                }
            }
        )

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
        let allMerchants = [];

        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {
                if (platformData) {
                    return RESTUtils.getPMS2Services("postMerchantList", {platformId: platformId}, platformData.topUpSystemType);
                }
                else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
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

    getMerchantsByMerchantGroup: function (platformId, merchantGroupId) {
        let allMerchants = [];
        let topUpSystemConfig;

        return dbconfig.collection_platform.findOne({platformId: platformId}, {topUpSystemType: 1, platformId: 1}).lean().then(
            platformData => {
                if (platformData) {
                    topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

                    return getMerchantList(platformId, platformData.topUpSystemType);

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            data=> {
                allMerchants = data.merchants || [];
                return dbconfig.collection_platformMerchantGroup.findOne({_id: merchantGroupId})
            }
        ).then(
            data=> {
                let merchantsArr = data.merchantNames || [];
                let query = {
                    platformId: platformId,
                    customizeRate: {$exists: true}
                };

                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    query.isPMS2 = {$exists: true};
                } else {
                    query.isPMS2 = {$exists: false};
                }

                for (let i = 0; i < allMerchants.length; i++) {

                    if (merchantsArr.indexOf(allMerchants[i].name || allMerchants[i].Name) != -1) {
                        allMerchants[i].isIncluded = true;
                    } else {
                        allMerchants[i].isIncluded = false;
                    }
                }

                return dbconfig.collection_platformMerchantList.find(query);
            }
        ).then(
            customizeRateMerchantListData => {
                if (customizeRateMerchantListData && customizeRateMerchantListData.length > 0) {
                    for (let x = 0, len = customizeRateMerchantListData.length; x < len; x++) {
                        let customizeRateMerchant = customizeRateMerchantListData[x];

                        if (customizeRateMerchant && customizeRateMerchant.name && customizeRateMerchant.customizeRate) {
                            for (let i = 0; i < allMerchants.length; i++) {

                                if (allMerchants[i] && (allMerchants[i].name || allMerchants[i].Name) && (allMerchants[i].name || allMerchants[i].Name) == customizeRateMerchant.name) {
                                    allMerchants[i].customizeRate = customizeRateMerchant.customizeRate;
                                }
                            }
                        }
                    }
                }
                return allMerchants;
            }
        )
    },

    getExcludedMerchantsByMerchantGroup: function (platformId, merchantGroupId) {
        var allMerchants = [];
        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {
                if (platformData) {
                    return RESTUtils.getPMS2Services("postMerchantList", {platformId: platformId}, platformData.topUpSystemType);
                }
                else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
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

    addAllPlayersToMerchantGroup: function (bankMerchantGroupObjId, platformObjId) {
        return dbconfig.collection_players.update({platform: platformObjId}, {merchantGroup: bankMerchantGroupObjId}, {multi: true}).then(data => {
            if (data && data.ok) {
                return {platform: platformObjId, merchantGroup: bankMerchantGroupObjId, nModified: data.nModified, n: data.n}
            } else {
                return {platform: platformObjId, merchantGroup: bankMerchantGroupObjId, error: data};
            }
        });
    },

    deleteMerchant: function (merchantNo) {
        // return dbconfig.collection_platformMerchantGroup.update(
        //     {},
        //     {$pull: {merchants: {$in: [merchantNo]}}},
        //     {multi: true}
        // );
        return Promise.resolve(true);
    },

    syncMerchantGroupData: function (platformObjId) {
        let platformId = null;
        let merchantList = [];
        let newMerchants = [];
        let newMerchantNames = [];
        let topUpSystemConfig;
        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platform => {
                if (platform) {
                    platformId = platform.platformId;

                    topUpSystemConfig = extConfig && platform && platform.topUpSystemType && extConfig[platform.topUpSystemType];

                    return getMerchantList(platformId, platform.topUpSystemType);

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            data => {
                if (data && data.merchants) {
                    let merchants = data.merchants;
                    let updateMerchantProm = [];
                    merchantList = merchants;

                    let query = {
                        platformId: platformId
                    };

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        query.isPMS2 = {$exists: true};
                    } else {
                        query.isPMS2 = {$exists: false};
                    }

                    return dbconfig.collection_platformMerchantList.find(query).lean().then(oldMerchants => {
                        merchants.forEach(merchant => {
                            if(oldMerchants && oldMerchants.length > 0) {
                                let merchantNumberMatch = false;
                                let merchantNameMatch = false;
                                oldMerchants.forEach(oldMerchant => {
                                    if (merchant.merchantNo == oldMerchant.merchantNo) {
                                        merchantNumberMatch = true;
                                    }
                                    if (merchant.name == oldMerchant.name || merchant.Name == oldMerchant.name) {
                                        merchantNameMatch = true;
                                    }
                                });

                                if (!merchantNumberMatch) {
                                    newMerchants.push(merchant.merchantNo);
                                }
                                if (!merchantNameMatch) {
                                    newMerchantNames.push(merchant.name || merchant.Name);
                                }
                            }
                            if(merchant && merchant.merchantNo && (merchant.name || merchant.Name)) {
                                let permerchantLimits = Number(merchant.permerchantLimits);
                                let transactionForPlayerOneDay = Number(merchant.transactionForPlayerOneDay);
                                let permerchantminLimits = Number(merchant.permerchantminLimits);
                                let merchantQuery = {
                                    merchantNo: merchant.merchantNo,
                                    name: merchant.name || merchant.Name,
                                    platformId: platformId
                                };

                                let updateData = {
                                    merchantNo: merchant.merchantNo,
                                    name: merchant.name || merchant.Name || '',
                                    topupType: merchant.topupType || '',
                                    targetDevices: merchant.targetDevices || '',
                                    merchantUse: merchant.merchantUse || '',
                                    merchantTypeId: merchant.merchantTypeId || '',
                                    remark: merchant.remark || '',
                                    platformId: merchant.platformId || '',
                                    permerchantLimits: isNaN(permerchantLimits) ? 0 : permerchantLimits,
                                    transactionForPlayerOneDay: isNaN(transactionForPlayerOneDay) ? 0 : transactionForPlayerOneDay,
                                    permerchantminLimits: isNaN(permerchantminLimits) ? 0 : permerchantminLimits,
                                    status: merchant.status || '',
                                    rate: merchant.rate || 0
                                };

                                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                    merchantQuery.isPMS2 = {$exists: true};
                                    updateData.isPMS2 = true;
                                } else {
                                    merchantQuery.isPMS2 = {$exists: false};
                                }

                                updateMerchantProm.push(
                                    dbconfig.collection_platformMerchantList.findOneAndUpdate(
                                        merchantQuery,
                                        updateData,
                                        {upsert: true}
                                    )
                                );
                            }
                        });
                        return Promise.all(updateMerchantProm);
                    });
                }
            }
        ).then(
            () => {
                let merchantNumbers = merchantList.map(merchant => merchant.merchantNo);
                let deleteMerchantQuery = {
                    platformId: platformId,
                    merchantNo: {$nin: merchantNumbers}
                };

                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    deleteMerchantQuery.isPMS2 = {$exists: true};
                } else {
                    deleteMerchantQuery.isPMS2 = {$exists: false};
                }

                return dbconfig.collection_platformMerchantList.find(deleteMerchantQuery).lean().then(
                    deletedMerchants => {
                        if(deletedMerchants && deletedMerchants.length > 0) {
                            let deletedMerchantNumbers = [];
                            deletedMerchants.forEach(merchant => {deletedMerchantNumbers.push(merchant.merchantNo);});
                            let deleteMerchantNumberQuery = {
                                platformId: platformId,
                                'merchantNo':{'$in': deletedMerchantNumbers}
                            };

                            if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                deleteMerchantNumberQuery.isPMS2 = {$exists: true};
                            } else {
                                deleteMerchantNumberQuery.isPMS2 = {$exists: false};
                            }

                            return dbconfig.collection_platformMerchantList.remove(deleteMerchantNumberQuery);
                        }
                    }
                )
            }
        ).then(
            () => {
                if(newMerchants && newMerchants.length > 0 || newMerchantNames && newMerchantNames.length > 0) {
                    let groupQuery;

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        groupQuery = {platform: platformObjId, isPMS2: {$exists: true}};
                    } else {
                        groupQuery = {platform: platformObjId, bDefault: true, isPMS2: {$exists: false}}
                    }

                    return dbconfig.collection_platformMerchantGroup.update(
                        groupQuery,
                        {$addToSet: {
                            merchants: {$each: newMerchants},
                            merchantNames: {$each: newMerchantNames}
                        }}
                    );
                }
            }
        ).then(
            () => {
                if (merchantList && merchantList.length > 0) {
                    let merchants = merchantList.map(merchant => merchant.merchantNo);
                    let merchantNames = merchantList.map(merchant => merchant.name || merchant.Name);
                    let groupQuery;

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        groupQuery = {platform: platformObjId, isPMS2: {$exists: true}};
                    } else {
                        groupQuery = {platform: platformObjId, isPMS2: {$exists: false}};
                    }
                    return dbconfig.collection_platformMerchantGroup.update(
                        groupQuery,
                        {$pull: {
                            merchants: {$nin: merchants},
                            merchantNames: {$nin: merchantNames},
                        }},
                        {multi: true}
                    );
                }
            }
        );
    },

    getMerchantNBankCard:function(platformId){
        let merchantsList;
        let bankCardList;
        let weChatList;
        let aliPayList;

        return dbconfig.collection_platform.findOne({platformId: platformId}, {topUpSystemType: 1, platformId: 1}).lean().then(
            platformData => {
                if (platformData) {

                    let bankcardListOptions = {
                        platformId: platformId,
                        accountType: constAccountType.BANK_CARD
                    };

                    let alipayListOptions = {
                        platformId: platformId,
                        accountType: constAccountType.ALIPAY
                    };

                    let wechatpayListOptions = {
                        platformId: platformId,
                        accountType: constAccountType.WECHAT
                    };

                    merchantsList = RESTUtils.getPMS2Services("postMerchantList", {platformId: platformId}, platformData.topUpSystemType);
                    bankCardList = RESTUtils.getPMS2Services("postBankCardList", bankcardListOptions, platformData.topUpSystemType);
                    aliPayList = RESTUtils.getPMS2Services("postBankCardList", alipayListOptions, platformData.topUpSystemType);
                    weChatList = RESTUtils.getPMS2Services("postBankCardList", wechatpayListOptions, platformData.topUpSystemType);

                    return Q.all([merchantsList, bankCardList, weChatList, aliPayList]).then(
                        data=>{
                            let bankcard = [];
                            // bankcard
                            if (data[1] && data[1].data.length > 0) {
                                data[1].data.map(card => {
                                    card.merchantNo = card.accountNumber;
                                    card.name = card.accountNumber + '('+ card.name + ')';
                                    card.merchantTypeId = '9999';
                                    card.merchantTypeName = "Bankcard";
                                })
                            }
                            if (data[2] && data[2].data.length > 0) {
                                data[2].data.map(card => {
                                    card.merchantNo = card.accountNumber;
                                    card.name = card.accountNumber + '(' + card.name + ')';
                                    card.merchantTypeId = '9998';
                                    card.merchantTypeName = "WechatCard";
                                })
                            }
                            if (data[3] && data[3].data.length > 0) {
                                data[3].data.sort((a,b)=>{ return a.line - b.line})
                                data[3].data = dbPlatformMerchantGroup.addLineCategory(data[3]);
                            }

                            let result = {}
                            if(!data[0].merchants){
                                data[0].merchants = []
                            }
                            result.merchants = data[0].merchants.concat(data[1].data).concat(data[2].data).concat(data[3].data);
                            return result
                        })
                }
            }
        )
    },
    addLineCategory: function(data){
        let result = [];
        let uniqueLine = [];
        let uniqueObj = {};

        for(var i = 1; i < 4; i++) {
            //insert a "select all (same) line" object, ex: 支付宝线路1(包含不存在的卡)
            // forloop 1-3 ,is because pms wont keep every card forever, if it dont have return any card in 1 kind of "line",
            // we will unable to create the query condition at frontend (ex: 线路3), cause data which with same "line" type will become unsearchable.
            // so, we hardcode only 3 type of "线路", which is 1,2,3
            let str = i.toString();
            let category = dbPlatformMerchantGroup.getAlipayLineAcc(str, 1);
            result.push(category);
        }

        for(var k = 1; k < 4; k++) {
            //insert a "select all (same) line" object, ex: 支付宝线路1(全部) .. forloop 1-3. reason same with above.
            let str = k.toString();
            let category = dbPlatformMerchantGroup.getAlipayLineAcc(str, 2);
            result.push(category);
        }

        if(data && data.data && data.data.length > 0){
            data.data.forEach(card => {
                card.merchantNo = card.accountNumber;
                card.name = card.accountNumber + '(' + card.name + ')' + ' -- ' + card.line;
                card.merchantTypeId = '9997';
                card.merchantTypeName = "AliPayAcc";
                result.push(card);
            })
        }
        return result;
    },
    getAlipayLineAcc: function (no, type) {
        let name = "MMM4-line"+no;
        let lineAcc = {
            accountNumber:"MMM4-line"+no,
            bankTypeId:"170",
            merchantTypeId:"9997",
            merchantTypeName:"AliPayAcc",
            minDepositAmount:1,
            name: name,
            singleLimit:0,
            state:"NORMAL",
        }
        if(type == 1){
            // the query will not contain alipay acc , it search by field -- "line" (because specific alipay acc will not always exist).
            lineAcc.includesAllCards = true;
            lineAcc.merchantNo = "MMM-all"+no;
            lineAcc.lineGroup = no;
        } else if (type == 2) {
            // we create a category to display alipay proposal when alipay card is exist( which means the query will contain alipay acc).
            lineAcc.category = true;
            lineAcc.merchantNo = "MMM4-line"+no;
            lineAcc.line = no;
        };
        return lineAcc;
    },
    syncMerchantNoScript:function(platformObjId){
        var allMerchants = [];
        return dbconfig.collection_platform.findOne({'_id': platformObjId}).then(
            platformData => {
                return RESTUtils.getPMS2Services("postMerchantList", {platformId: platformData.platformId}, platformData.topUpSystemType);
            }
        ).then(
            data => {
                allMerchants = data.merchants || [];
                return dbconfig.collection_platformMerchantGroup.find({platform: platformObjId})
            }
        ).then(data => {
            let merchantGroupData = data && data ? data : [];
            let proms = [];
            merchantGroupData.forEach(item => {
                let merchantNames = [];
                allMerchants.forEach(merchant => {
                    if (item.merchants.includes(merchant.merchantNo)) {
                        merchantNames.push(merchant.name);
                    }
                })
                let query = {'groupId': item.groupId, 'platform': platformObjId};
                let updateData = {
                    '$addToSet': {
                        'merchantNames': {$each: merchantNames}
                    }
                }
                let prom = dbconfig.collection_platformMerchantGroup.findOneAndUpdate(query, updateData, {
                    upsert: true,
                    new: true
                });
                proms.push(prom)
            })
            return Promise.all(proms).then(result => {
                return result;
            })
        })
    },
    updateCustomizeRatePlatformMerchantList: function (platformId, name, merchantNo, customizeRate) {
        let topUpSystemConfig;

        return dbconfig.collection_platform.findOne({_id: platformId}, {platformId: 1, topUpSystemType: 1}).lean().then(
            platformData => {
                if (platformData && platformData.platformId) {

                    topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

                    let updateQuery = {
                        merchantNo: merchantNo,
                        name: name,
                        platformId: platformData.platformId
                    };

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        updateQuery.isPMS2 = {$exists: true};
                    } else {
                        updateQuery.isPMS2 = {$exists: false};
                    }

                    return dbconfig.collection_platformMerchantList.findOneAndUpdate(updateQuery,
                        {
                            customizeRate: customizeRate
                        },
                        {new: true}
                    );
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        );
    },
    getPlatformMerchantList: function (platformId) {
        let topUpSystemConfig;

        return dbconfig.collection_platform.findOne({_id: platformId}, {topUpSystemType: 1, platformId: 1}).lean().then(
            platformData => {
                if (platformData && platformData.platformId) {
                    topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

                    let query = {
                        platformId: platformData.platformId
                    }

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        query.isPMS2 = {$exists: true};
                    } else {
                        query.isPMS2 = {$exists: false};
                    }

                    return dbconfig.collection_platformMerchantList.find(query).lean();
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        );
    },

    getMerchantTypeList: function (platformObjId) {
        return RESTUtils.getPMS2Services("postMerchantTypeList", {});
    },

    getPMSMerchantGroup: function (platformId, topUpSystemType) {
        let topUpSystemConfig;

        topUpSystemConfig = extConfig && topUpSystemType && extConfig[topUpSystemType];

        if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
            let type = constAccountType.ONLINE

            let options = {
                platformId: platformId,
                accountType: type
            };

            return RESTUtils.getPMS2Services("postPaymentGroup", options);
        }
    },

    getServiceChargeSetting: function (platformObjId) {
        return dbconfig.collection_platform.findOne(
            {
                _id: platformObjId
            },
            {
                pmsServiceCharge: 1,
                fpmsServiceCharge: 1
            }
        ).lean();
    },

    updateServiceChargeSetting: function (platformObjId, pmsServiceChargeRate, fpmsServiceChargeRate) {
        return dbconfig.collection_platform.findOneAndUpdate(
            {
                _id: platformObjId
            },
            {
                pmsServiceCharge: pmsServiceChargeRate,
                fpmsServiceCharge: fpmsServiceChargeRate
            },
            {new: true}
        );
    },

    getMerchantListByPlatformId: function(platformId) {
        let paymentSystemId;
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData && platformData.topUpSystemType) {
                    paymentSystemId = platformData.topUpSystemType;
                }

                return RESTUtils.getPMS2Services("postMerchantList", {platformId: platformId}, paymentSystemId);
            }
        )

    }
};

function getMerchantList(platformId, paymentSystemId) {
    return RESTUtils.getPMS2Services("postMerchantList", {platformId: platformId}, paymentSystemId);
}

module.exports = dbPlatformMerchantGroup;
