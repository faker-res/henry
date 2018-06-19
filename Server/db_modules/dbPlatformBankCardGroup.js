var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var pmsAPI = require('../externalAPI/pmsAPI');
var serverInstance = require("../modules/serverInstance");

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
     * Get all the bank card groups  by platformObjId
     * @param {String}  platformId - ObjId of the platform
     */
    getPlatformBankCardGroup: function (platformId) {
        return dbPlatformBankCardGroup.syncBankCardGroupData(platformId).then(
            data => dbconfig.collection_platformBankCardGroup.aggregate(
                {
                    $match: {
                        platform: platformId
                    }
                }
            )
        )
    },

    /**
     * Get all the bank card groups by platformObjId without sync with PMS
     * Since every time when the page load up, it will run the one with sync,
     * it is not necessary to do it multiple times within 5 minutes when admin
     * are changing card groups
     * @param {String}  platform - ObjId of the platform
     */
    getPlatformBankCardGroupLite: (platform) => {
        return dbconfig.collection_platformBankCardGroup.find({platform}).lean();
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
        var allBankCards = [];
        return pmsAPI.bankcard_getBankcardList(
            {
                platformId: platformId,
                queryId: serverInstance.getQueryId()
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
            return pmsAPI.foundation_getProvinceList({});
        } else if (provinceId && !cityId) {
            return pmsAPI.foundation_getCityList({provinceId: provinceId});
        } else if (provinceId && cityId) {
            return pmsAPI.foundation_getDistrictList({provinceId: provinceId, cityId: cityId});
        }
    },

    getZone: function (type, data) {
        var a;
        var defer = Q.defer();
        switch (type) {
            case "province":
                a = pmsAPI.foundation_getProvince({provinceId: data});
                break;
            case "city":
                a = pmsAPI.foundation_getCity({cityId: data});
                break;
            case "district":
                a = pmsAPI.foundation_getDistrict({districtId: data});
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
                obj[type] = {name: data + type + 'name', id: data};
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

    syncBankCardGroupData: function (platformObjId) {
        let platformId = null;
        let cardList = [];
        let newCards = [];
        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platform => {
                if (platform) {
                    platformId = platform.platformId;
                    return pmsAPI.bankcard_getBankcardList(
                        {
                            platformId: platform.platformId,
                            queryId: serverInstance.getQueryId()
                        }
                    )
                }
            }
        ).then(
            data => {
                if (data && data.data) {
                    let cards = data.data;
                    let updateCardProm = [];
                    cardList = cards;
                    return dbconfig.collection_platformBankCardList.find({platformId: platformId}).lean().then(oldCards => {
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
                            if(card && card.accountNumber) {
                                let quota = Number(card.quota);
                                updateCardProm.push(
                                    dbconfig.collection_platformBankCardList.findOneAndUpdate(
                                        {
                                            accountNumber: card.accountNumber
                                        },
                                        {
                                            accountNumber: card.accountNumber,
                                            bankTypeId: card.bankTypeId || '',
                                            name: card.name || '',
                                            platformId: card.platformId || '',
                                            quota: isNaN(quota) ? 0 : quota,
                                            status: card.status || '',
                                            provinceName: card.provinceName || '',
                                            cityName: card.cityName || '',
                                            openingPoint: card.openingPoint || '',
                                            level: card.level || ''
                                        },
                                        {upsert: true}
                                    )
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
                return dbconfig.collection_platformBankCardList.find({accountNumber: {$nin: cardNumbers}}).lean().then(
                    deletedCards => {
                        if(deletedCards && deletedCards.length > 0) {
                            let deletedCardNumbers = [];
                            deletedCards.forEach(card => {deletedCardNumbers.push(card.accountNumber);});
                            return dbconfig.collection_platformBankCardList.remove({'accountNumber':{'$in': deletedCardNumbers}})
                        }
                    }
                )
            }
        ).then(
            () => {
                if(newCards && newCards.length > 0) {
                    return dbconfig.collection_platformBankCardGroup.update(
                        {platform: platformObjId, bDefault: true},
                        {$addToSet: {banks: {$each: newCards}}}
                    );
                }
            }
        ).then(
            () => {
                if (cardList && cardList.length > 0) {
                    let bankCards = cardList.map(card => card.accountNumber);
                    return dbconfig.collection_platformBankCardGroup.update(
                        {platform: platformObjId},
                        {$pull: {banks: {$nin: bankCards}}},
                        {multi: true}
                    );
                }
            }
        );
    },


};

module.exports = dbPlatformBankCardGroup;