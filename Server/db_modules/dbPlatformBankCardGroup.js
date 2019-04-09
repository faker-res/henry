var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var pmsAPI = require('../externalAPI/pmsAPI');
var serverInstance = require("../modules/serverInstance");
const extConfig = require('../config/externalPayment/paymentSystems');
const rp = require('request-promise');
const constAccountType = require('../const/constAccountType');

const RESTUtils = require('../modules/RESTUtils');

var dbPlatformBankCardGroup = {

    /**
     * Create a new bank card group
     * @param {String}  platform - platform ObjId
     * @param {String}  parent -  its parent BankCardGroup ObjId
     * @param {String}  name, code, displayName
     */
    addPlatformBankCardGroup: function (platform, name, code, displayName) {
        var gameGroup = new dbconfig.collection_platformBankCardGroup({
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
    updatePlatformBankCardGroup: function (query, updateData) {
        return dbconfig.collection_platformBankCardGroup.findOneAndUpdate(query, updateData, {upsert: true, new: true});
    },

    /**
     * Update the  bank card group (multiple)
     * @param {Json}  query - queryData
     * @param {Json}  updateData -  updateData
     */
    updatePlatformAllBankCardGroup: function (query, updateData) {
        return dbconfig.collection_platformBankCardGroup.update(query, updateData, {multi: true, new: true});
    },

    /**
     * Get all the bank card groups  by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformBankCardGroup: function (platformId) {
        let topUpSystemConfig;
        let curPlatformId;

        return dbconfig.collection_platform.findOne({_id:platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }

                if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                    // do not sync when using FPMS payment method
                    let query = {
                        platform: platformId,
                        $or: [{isPMS2: false}, {isPMS2: {$exists: false}}]
                    };
                    return  dbconfig.collection_platformBankCardGroup.find(query).lean();
                }

                topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];
                curPlatformId = platformData && platformData.platformId ? platformData.platformId : null;

                return dbPlatformBankCardGroup.syncBankCardGroupData(platformData).then(
                    data => {
                        let matchQuery = {
                            platform: platformId
                        };

                        if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                            matchQuery.isPMS2 = {$exists: true};
                        } else {
                            matchQuery.isPMS2 = {$exists: false};
                        }

                        return dbconfig.collection_platformBankCardGroup.aggregate(
                            {
                                $match: matchQuery
                            }
                        );
                    }
                )
            }
        )

    },

    /**
     * Get all the bank card groups by platformObjId without sync with PMS
     * Since every time when the page load up, it will run the one with sync,
     * it is not necessary to do it multiple times within 5 minutes when admin
     * are changing card groups
     * @param {String}  platform - ObjId of the platform
     */
    getPlatformBankCardGroupLite: (query) => {
        return dbconfig.collection_platformBankCardGroup.find(query).lean();
    },

    /**
     * Get all the games which are unattached to the gameGroup in the platform
     * @param {Json}  query - platform , groupId
     */
    //getGamesNotInBankCardGroup: function (query) {
    //    var gamesId = [];
    //    var resultArr = [];
    //    return dbconfig.collection_platformBankCardGroup.findOne(query)
    //        .then(
    //            data=> {
    //            if (data && data.games) {
    //                gamesId = data.games.map(a=> {
    //                    return a.game.toString();
    //                });
    //                return dbconfig.collection_platformGameStatus.find({platform: query.platform}).populate({
    //                    path: "game",
    //                    model: dbconfig.collection_game
    //                }).exec();
    //            } else
    //                return dbconfig.collection_platformGameStatus.find({platform: query.platform}).populate({
    //                    path: "game",
    //                    model: dbconfig.collection_game
    //                }).exec();
    //        }
    //    )
    //        .then(
    //            games=> {
    //            if (games) {
    //                resultArr = games.filter(game=> {
    //                    if (game && game.game && game._id) {
    //                        return (gamesId.indexOf(game.game._id.toString()) == -1);
    //                    } else return false;
    //                })
    //                return resultArr;
    //            } else return [];
    //        }
    //    );
    //},

    /**
     * Remove/Delete  a group
     * @param {objectId} groupObjId
     */
    removeBankCardGroup: function (groupObjId) {
        return dbconfig.collection_platformBankCardGroup.remove({_id: groupObjId}).exec();
    },

    setPlatformDefaultBankCardGroup: function (platformId, defaultID) {
        return dbconfig.collection_platformBankCardGroup.find({platform: platformId})
            .then(
                data => {
                    if (data) {
                        var allProm = [];
                        for (var i in data) {
                            if (data[i].bDefault && data[i]._id != defaultID) {
                                var prom = dbconfig.collection_platformBankCardGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: false}, {
                                    upsert: true,
                                    new: true
                                });
                                allProm.push(prom);
                            } else if (!data[i].bDefault && data[i]._id == defaultID) {
                                var prom = dbconfig.collection_platformBankCardGroup.findOneAndUpdate({_id: data[i]._id}, {bDefault: true}, {
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
    getAllBankCard: function(platformId){
        let topUpSystemConfig;

        return dbconfig.collection_platform.findOne({platformId:platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }

                topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

                if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                    return dbconfig.collection_platformBankCardList.find(
                        {
                            platformId: platformId,
                            isFPMS: true,
                        }
                    ).lean().then(
                        bankCardListData => {
                            return {data: bankCardListData} // to match existing code format
                        }
                    )
                } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    let reqData = {
                        platformId: platformId,
                        accountType: constAccountType.BANK_CARD
                    };

                    return RESTUtils.getPMS2Services("postBankCardList", reqData);
                } else {
                    return pmsAPI.bankcard_getBankcardList(
                        {
                            platformId: platformId,
                            queryId: serverInstance.getQueryId()
                        }
                    );
                }
            }
        );
    },

    getBankTypeList: function(platformObjId) {
        let topUpSystemConfig;

        return dbconfig.collection_platform.findOne({_id: platformObjId}, {topUpSystemType: 1}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }

                topUpSystemConfig = extConfig && platformData && platformData.topUpSystemType && extConfig[platformData.topUpSystemType];

                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    return RESTUtils.getPMS2Services("postBankTypeList", {});
                }
            }
        );
    },

    /**
     * Get all the banks  which are attached to the  platforBankcardsGroup
     * @param {Json}  query - platform , groupId
     */
    getBanksInPlatformBankcardGroup: function (platformId, groupId) {

        return dbconfig.collection_platform.findOne({platformId: platformId}).then(
            platformData => {

                if (platformData) {

                    return dbconfig.collection_platformBankCardGroup.findOne({
                        platform: platformData._id,
                        groupId: groupId
                    });
                }
                else {

                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(bankGroupData => {

                if (bankGroupData && bankGroupData.banks && bankGroupData.banks.length > 0) {
                    return bankGroupData.banks;
                }
                else return [];
            }
        );
    },

    getIncludedBankCardByBankCardGroup: function (platformId, bankCardGroupId) {
        var allBankCards = [];
        return pmsAPI.bankcard_getBankcardList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data => {
                allBankCards = data.data || [];
                return dbconfig.collection_platformBankCardGroup.findOne({_id: bankCardGroupId})
            }
        ).then(
            data => {
                var banksArr = data.banks || [];
                return allBankCards.filter(a => {
                    return banksArr.indexOf(a.accountNumber) != -1
                })
            })
    },

    getExcludedBankCardByBankCardGroup: function (platformId, bankCardGroupId) {
        var allBankCards = [];
        return pmsAPI.bankcard_getBankcardList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
            }
        ).then(
            data => {
                allBankCards = data.data;
                return dbconfig.collection_platformBankCardGroup.findOne({_id: bankCardGroupId})
            }
        ).then(
            data => {
                var banksArr = data.banks || [];
                return allBankCards.filter(a => {
                    return banksArr.indexOf(a.accountNumber) == -1
                })
            })
    },

    getZoneList: function (provinceId, cityId) {
        if (!provinceId && !cityId) {
            return RESTUtils.getPMS2Services("postProvinceList", {});
            // return pmsAPI.foundation_getProvinceList({});
        } else if (provinceId && !cityId) {
            return RESTUtils.getPMS2Services("postCityList", {provinceId: provinceId});
            // return pmsAPI.foundation_getCityList({provinceId: provinceId});
        } else if (provinceId && cityId) {
            return RESTUtils.getPMS2Services("postDistrictList", {provinceId: provinceId, cityId: cityId});
            // return pmsAPI.foundation_getDistrictList({provinceId: provinceId, cityId: cityId});
        }
    },

    getZone: function (type, data) {
        var a;
        var defer = Q.defer();
        switch (type) {
            case "province":
                a = RESTUtils.getPMS2Services("postProvince", {provinceId: data});
                // a = pmsAPI.foundation_getProvince({provinceId: data});
                break;
            case "city":
                a = RESTUtils.getPMS2Services("postCity", {cityId: data});
                // a = pmsAPI.foundation_getCity({cityId: data});
                break;
            case "district":
                a = RESTUtils.getPMS2Services("postDistrict", {districtId: data});
                // a = pmsAPI.foundation_getDistrict({districtId: data});
                break;
            default:
        }
        // todo: will be replaced by real pmsAPI call once available.
        Q.resolve(a).then(
            data => {
                defer.resolve(data);
            },
            err => {
                var obj = {};
                //obj[type] = {name: data + type + 'name', id: data};
                obj = {name: data + type + 'name', id: data};
                defer.resolve(obj)
            }
        )
        return defer.promise;
    },

    addPlayersToBankCardGroup: function (bankCardGroupObjId, playerObjIds) {
        return dbconfig.collection_players.update(
            {_id: {$in: playerObjIds}},
            {bankCardGroup: bankCardGroupObjId},
            {multi: true}
        );
    },

    addAllPlayersToBankCardGroup: function (bankCardGroupObjId, platformObjId) {
        return dbconfig.collection_players.update({platform: platformObjId}, {bankCardGroup: bankCardGroupObjId}, {multi: true}).then(data => {
            if (data && data.ok) {
                return {platform: platformObjId, bankCardGroup: bankCardGroupObjId, nModified: data.nModified, n: data.n}
            } else {
                return {platform: platformObjId, bankCardGroup: bankCardGroupObjId, error: data};
            }
        });
    },

    deleteBankcard: function (accountNumber) {
        return dbconfig.collection_platformBankCardGroup.update(
            {},
            {$pull: {banks: {$in: [accountNumber]}}},
            {multi: true}
        );
    },

    syncBankCardGroupData: function (platformDataObj) {
        let platformId = null;
        let platformObjId;
        let cardList = [];
        let newCards = [];
        let topUpSystemConfig;
        return Promise.resolve(platformDataObj).then(
            platform => {
                if (platform) {
                    platformId = platform.platformId;
                    platformObjId = platform._id;

                    topUpSystemConfig = extConfig && platform && platform.topUpSystemType && extConfig[platform.topUpSystemType];

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        let reqData = {
                            platformId: platformId,
                            accountType: constAccountType.BANK_CARD
                        };

                        return RESTUtils.getPMS2Services("postBankCardList", reqData);
                    }
                    else {
                        return pmsAPI.bankcard_getBankcardList(
                            {
                                platformId: platform.platformId,
                                queryId: serverInstance.getQueryId()
                            }
                        )
                    }
                }
            }
        ).then(
            data => {
                if (data && data.data) {
                    let cards = data.data;
                    let updateCardProm = [];
                    cardList = cards;

                    let query = {
                        platformId: platformId,
                        $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                    };

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        query.isPMS2 = {$exists: true};
                    } else {
                        query.isPMS2 = {$exists: false};
                    }

                    return dbconfig.collection_platformBankCardList.find(query).lean().then(oldCards => {
                        cards.forEach(card => {
                            if(oldCards && oldCards.length > 0) {
                                let match = false;
                                oldCards.forEach(oldCard => {
                                    if (card.accountNumber == oldCard.accountNumber) {
                                        match = true;
                                    }
                                });
                                if (!match) {
                                    newCards.push(card.accountNumber);
                                }
                            }
                            else if(!oldCards.length && topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2'){
                                newCards.push(card.accountNumber);
                            }

                            if(card && card.accountNumber) {
                                let quota = Number(card.quota);

                                let bankCardQuery = {
                                    accountNumber: card.accountNumber,
                                    platformId: platformId,
                                    $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                                };

                                let updateData =  {
                                    accountNumber: card.accountNumber,
                                    bankTypeId: card.bankTypeId || '',
                                    name: card.name || '',
                                    platformId: card.platformId || '',
                                    quota: isNaN(quota) ? 0 : quota,
                                    maxDepositAmount: card.maxDepositAmount ? card.maxDepositAmount : 0,
                                    status: card.status || '',
                                    provinceName: card.provinceName || '',
                                    cityName: card.cityName || '',
                                    openingPoint: card.openingPoint || '',
                                    level: card.level || ''
                                };

                                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                    bankCardQuery.isPMS2 = {$exists: true};
                                    updateData.isPMS2 = true;
                                } else {
                                    bankCardQuery.isPMS2 = {$exists: false};
                                }

                                updateCardProm.push(
                                    dbconfig.collection_platformBankCardList.findOneAndUpdate(bankCardQuery, updateData, {upsert: true})
                                );
                            }
                        });
                        return Promise.all(updateCardProm);
                    });
                }
            }
        ).then(
            () => {
                let cardNumbers = cardList.map(card => card.accountNumber);
                let bankCardQuery = {
                    platformId: platformId,
                    accountNumber: {$nin: cardNumbers},
                    $or: [{isFPMS: false}, {isFPMS: {$exists: false}}]
                };

                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    bankCardQuery.isPMS2 = {$exists: true};
                } else {
                    bankCardQuery.isPMS2 = {$exists: false};
                }

                return dbconfig.collection_platformBankCardList.find(bankCardQuery).lean().then(
                    deletedCards => {
                        if(deletedCards && deletedCards.length > 0) {
                            let deletedCardNumbers = [];
                            deletedCards.forEach(card => {deletedCardNumbers.push(card.accountNumber);});

                            let deleteBankCardQuery = {
                                platformId: platformId,
                                accountNumber:{'$in': deletedCardNumbers}
                            };

                            if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                deleteBankCardQuery.isPMS2 = {$exists: true};
                            } else {
                                deleteBankCardQuery.isPMS2 = {$exists: false};
                            }

                            return dbconfig.collection_platformBankCardList.remove(deleteBankCardQuery)
                        }
                    }
                )
            }
        ).then(
            () => {
                if(newCards && newCards.length > 0) {
                    let groupQuery;

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        groupQuery = {platform: platformObjId, isPMS2: {$exists: true}};
                    } else {
                        groupQuery = {platform: platformObjId, bDefault: true, isPMS2: {$exists: false}}
                    }

                    return dbconfig.collection_platformBankCardGroup.update(
                        groupQuery,
                        {$addToSet: {banks: {$each: newCards}}}
                    );
                }
            }
        ).then(
            () => {
                if (cardList && cardList.length > 0) {
                    let bankCards = cardList.map(card => card.accountNumber);
                    let bankCardGroupQuery;

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        bankCardGroupQuery = {platform: platformObjId, isPMS2: {$exists: true}};
                    } else {
                        bankCardGroupQuery = {platform: platformObjId, isPMS2: {$exists: false}};
                    }
                    return dbconfig.collection_platformBankCardGroup.update(
                        bankCardGroupQuery,
                        {$pull: {banks: {$nin: bankCards}}},
                        {multi: true}
                    );
                }
            }
        );
    },

    createNewBankCardAcc: function (updateData) {
        return dbconfig.collection_platformBankCardList.findOne({
            platformId: updateData.platformId,
            accountNumber: updateData.accountNumber
        }).lean().then(
            data => {
                if (data) {
                    return Promise.reject({name: "DataError", message: "Account number exists"});
                }

                return dbconfig.collection_platformBankCardList(updateData).save();
            }
        )
    },

    updateBankCardAcc: function (query, updateData) {
        return dbconfig.collection_platformBankCardList.findOneAndUpdate(query, updateData).lean();
    },

    deleteBankCardAcc: function (bankCardObjId) {
        return dbconfig.collection_platformBankCardList.remove({_id: bankCardObjId}).exec();
    },

    // type: 1 - bankcard, 2 - alipay
    getPaymentGroup: function (platformId, type) {
        // debug param, todo :: remove later
        // platformId = "100";
        // delete type;
        return pmsAPI.bankcard_bankCardByGroupReq({platformId: platformId, bankCardType: type}).then(
            data => {
                return data;
            }
        );
    },

    getUserPaymentGroup: function (platformId, playerName, topUpSystemType, accountType) {
        // debug param, todo :: remove later
        // platformId = "100";
        // playerName = "111";
        let topUpSystemConfig;
        let type;

        topUpSystemConfig = extConfig && topUpSystemType && extConfig[topUpSystemType];

        switch (accountType) {
            case "1":
                type = constAccountType.BANK_CARD;
                break;
            case "2":
                type = constAccountType.ALIPAY;
                break;
            case "3":
                type = constAccountType.WECHAT;
                break;
            case "4":
                type = constAccountType.ONLINE;
                break;
        }

        if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
            let options = {
                platformId: platformId,
                userName: playerName,
                accountType: type
            };

            return RESTUtils.getPMS2Services("postPaymentGroupByPlayer", options);
        } else {
            return pmsAPI.bankcard_bankCardByUserReq({platformId: platformId, userName: playerName}).then(
                data => {
                    return data;
                }
            );
        }
    },

    getPMSBankCardGroup: function (platformId, topUpSystemType) {
        let topUpSystemConfig;

        topUpSystemConfig = extConfig && topUpSystemType && extConfig[topUpSystemType];

        if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
            let type = constAccountType.BANK_CARD;

            let options = {
                platformId: platformId,
                accountType: type
            };

            return RESTUtils.getPMS2Services("postPaymentGroup", options);
        }
    },

};

module.exports = dbPlatformBankCardGroup;