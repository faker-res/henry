let dbPartnerCommissionConfigFunc = function () {
};
module.exports = new dbPartnerCommissionConfigFunc();

const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('./../modules/errorUtils');

const dbPartnerCommissionConfig = {
    getPlatformPartnerCommConfig: (platformObjId) => {
        console.log('platformObjId', platformObjId);
        return dbconfig.collection_platformPartnerCommConfig.find({platform: platformObjId}).lean().then(
            data => {
                return data;
            }
        )
    },

    updatePlatformPartnerCommConfig: (platformObjId, commissionType, providerObjId, commissionSetting) => {
        return dbconfig.collection_platformPartnerCommConfig.findOneAndUpdate({
            platform: platformObjId,
            commissionType: commissionType,
            provider: providerObjId
        }, {
            commissionSetting: commissionSetting
        }, {
            upsert: true,
            new: true
        }).lean();
    },

    getPartnerCommConfig: (partnerObjId, commissionType, isSkipUpdate, isGetDefault) => {
        // return current partner commission config, if not exist, create new base on parent/platform default base on provider
        // if still not exist, return empty array (or not included if individual provider group config not exist)
        let partner;
        return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
            partnerData => {
                if (!partnerData) {
                    return Promise.reject({message: "Partner not found"});
                }
                partner = partnerData;

                if (partner.parent && String(partner.parent).length == 24) {
                    return dbconfig.collection_partner.findOne({_id: partner.parent}, {_id: 1}).lean();
                }
            }
        ).then(
            parentData => {
                if (partner.parent && !parentData) {
                    clearParent(partner._id, partner.platform).catch(errorUtils.reportError);
                }

                if (parentData) {
                    return getDownLineCommConfig(partner._id, partner.platform, parentData._id, commissionType, isSkipUpdate, isGetDefault);
                }
                else {
                    return getMainCommConfig(partner._id, partner.platform, commissionType, isSkipUpdate, isGetDefault);
                }
            }
        )
    },

    getPartnerParentChain: (partnerObjId) => {
        // it will return an array of partners object
        // the first one will always be the partnerObjId inserted
        // the following will the parent of previous partner
        // the last one will always be the main partner that does not have parent
        return getPartnerParentChain(partnerObjId);
    },

    getPartnerCommRate: (partnerObjId) => {
        return dbconfig.collection_partnerMainCommRateConfig.findOne({partner: partnerObjId}).lean().then(
            config => {
                if (config) {
                    return config;
                }
                return createDefaultPartnerCommRate (partnerObjId);
            }
        )
    },

    assignPartnerMultiLvlComm: async function (proposalData, removedChildPartnerArr, newChildPartnerArr) {
        if (!(proposalData && proposalData.data && proposalData.data.partnerObjId && proposalData.data.commissionType
            && proposalData.data.platformId && (removedChildPartnerArr.length || newChildPartnerArr.length))) {
            return Q.reject({name: "DataError", message: "Invalid proposal data"});
        }


        if (newChildPartnerArr.length) {
            let query = {
                partnerName: {$in: newChildPartnerArr},
                platform: proposalData.data.platformId
            };

            let partnerObjs = await dbconfig.collection_partner.find(query, {_id: 1}).lean();
            if (!(partnerObjs && partnerObjs.length)) {
                return Promise.reject({name: "DataError", message: "Cannot find partner"});
            }
            let parentCommConfig = await dbPartnerCommissionConfig.getPartnerCommConfig(proposalData.data.partnerObjId, proposalData.data.commissionType, false, true);
            if (!(parentCommConfig && parentCommConfig.length)) {
                return Promise.reject({name: "DataError", message: "Cannot find commission config"});
            }

            partnerObjs.map(partner => {
                dbconfig.collection_partnerMainCommConfig.remove({
                    partner: partner._id,
                    platform: proposalData.data.platformId
                }).catch(errorUtils.reportError);
            });

            updateDownLineCommConfig(proposalData.data.partnerObjId, proposalData.data.platformId, proposalData.data.commissionType, parentCommConfig, true, partnerObjs);
        }

        if (removedChildPartnerArr.length) {
            if (proposalData.data.updateChildPartnerHeadCount == 0) {
                dbconfig.collection_partnerDefDownLineCommConfig.remove({
                    partner: proposalData.data.partnerObjId,
                    platform: proposalData.data.platformId
                }).catch(errorUtils.reportError);
            }

            let query = {
                partnerName: {$in: removedChildPartnerArr},
                platform: proposalData.data.platformId
            };

            let partnerObjs = await dbconfig.collection_partner.find(query, {_id: 1, parent: 1}).lean();
            if (!(partnerObjs && partnerObjs.length)) {
                return Promise.reject({name: "DataError", message: "Cannot find partner"});
            }

            partnerObjs.map(partner => {
                dbconfig.collection_partnerDownLineCommConfig.remove({
                    platform: proposalData.data.platformId,
                    partner: partner._id,
                }).then(
                    () => {
                        return dbPartnerCommissionConfig.getPartnerCommConfig(partner._id, proposalData.data.commissionType, false, true);
                    }
                ).then(
                    commConfig => {
                        updateDownLineCommConfig(partner._id, proposalData.data.platformId, proposalData.data.commissionType, commConfig, true);
                    }
                ).catch(errorUtils.reportError);
            });
        }

    },

    updateMainPartnerCommissionData: async function (parentObjId, partnerObjId, platformObjId, commissionType) {
        let providerGroups = await dbconfig.collection_gameProviderGroup.find({platform: platformObjId}, {_id: 1}).lean();
        if ((!providerGroups && providerGroups.length)) {
            return;
        }

        if (parentObjId) { // checking - only update main partner commission
            return;
        }
        let defConfigs = await dbconfig.collection_platformPartnerCommConfig.find({
            // provider: providerGroups[i]._id,
            provider: {$in: providerGroups.map(provider => provider._id)},
            platform: platformObjId,
            commissionType
        }).lean();

        if (defConfigs && defConfigs.length) {
            for (let i = 0; i < defConfigs.length; i++) {
                let defConfig = defConfigs[i];

                if (!defConfig) {
                    // this means platform haven't properly set default commission
                    continue;
                }
                delete defConfig.__v;
                delete defConfig._id;
                defConfig.partner = partnerObjId;
                dbconfig.collection_partnerMainCommConfig.findOneAndUpdate({
                    platform: platformObjId,
                    partner: partnerObjId,
                    provider: defConfig.provider
                }, defConfig, {upsert: true, new: true}).lean().catch(errorUtils.reportError);
            }
            updateDownLineCommConfig(partnerObjId, platformObjId, commissionType, defConfigs, true);
        }
    },

    resetPartnerMultiLvlCommissionData: async function (proposalData) {
        let queryConfig = {
            platform: proposalData.data.platformObjId,
            commissionType: proposalData.data.commissionType,
            // provider: oldConfig.provider,
            // partner: proposalData.data.partnerObjId
        };


        let defCommConfig;
        let updateSchema;
        if (proposalData.data.parentObjId) {
            queryConfig.partner = proposalData.data.parentObjId;
            defCommConfig = await dbconfig.collection_partnerDefDownLineCommConfig.find(queryConfig).lean();
            updateSchema = dbconfig.collection_partnerDownLineCommConfig;
        } else {
            defCommConfig = await dbconfig.collection_platformPartnerCommConfig.find(queryConfig).lean();
            updateSchema = dbconfig.collection_partnerMainCommConfig;
        }

        if (!(defCommConfig && defCommConfig.length)) {
            return;
        }

        for (let i = 0; i < defCommConfig.length; i++) {
            delete defCommConfig[i].__v;
            delete defCommConfig[i]._id;

            defCommConfig[i].partner = proposalData.data.partnerObjId;

            updateSchema.findOneAndUpdate({
                platform: defCommConfig[i].platform,
                partner: defCommConfig[i].partner,
                provider: defCommConfig[i].provider
            }, defCommConfig[i]).lean().catch(errorUtils.reportError);
        }

        updateDownLineCommConfig(proposalData.data.partnerObjId, proposalData.data.platformObjId, proposalData.data.commissionType, defCommConfig, true);

    },

    resetAllPartnerCustomizedCommissionRate: async function (platformObjId, commissionType, isMultiLevelCommission) {
        if (isMultiLevelCommission) {
            let partnerObj = await dbconfig.collection_partner.find({parent: null, platform: platformObjId}, {parent: 1}).lean();

            if (!(partnerObj && partnerObj.length)) {
                return;
            }

            let queryConfig = {
                platform: platformObjId,
                commissionType: commissionType,
            };

            let defaultConfigProm = await dbconfig.collection_platformPartnerCommConfig.find(queryConfig).lean();

            if (!(defaultConfigProm && defaultConfigProm.length)) {
                return;
            }

            partnerObj.map(
                partner => {
                    for (let i = 0; i < defaultConfigProm.length; i++) {
                        delete defaultConfigProm[i].__v;
                        delete defaultConfigProm[i]._id;

                        defaultConfigProm[i].partner = partner._id;

                        dbconfig.collection_partnerMainCommConfig.findOneAndUpdate({
                            platform: defaultConfigProm[i].platform,
                            partner: defaultConfigProm[i].partner,
                            provider: defaultConfigProm[i].provider
                        }, defaultConfigProm[i]).lean().catch(errorUtils.reportError);
                    }

                    updateDownLineCommConfig(partner._id, platformObjId, commissionType, defaultConfigProm, true);
                })
        } else {

            dbconfig.collection_partnerCommissionConfig.remove({
                partner: {"$exists" : true},
                platform: platformObjId,
                commissionType: commissionType,
            }).catch(errorUtils.reportError);

        }
    },

    updatePartnerMultiLvlCommissionConfig: (proposalData) => {
        let qObj = {
            platform: proposalData.data.newRate.platform,
            provider: proposalData.data.newRate.provider,
            partner: proposalData.data.partnerObjId
        };

        if (proposalData.data.isRevert) {
            // multi level cannot reset by this action
            // if (proposalData.data.parentObjId) {
            //     return dbconfig.collection_partnerDownLineCommConfig.findOneAndRemove(qObj)
            // } else {
            //     return dbconfig.collection_partnerMainCommConfig.findOneAndRemove(qObj)
            // }
        } else {
            proposalData.data.newRate.partner = proposalData.data.partnerObjId;
            delete proposalData.data.newRate._id;
            delete proposalData.data.newRate.__v;

            if (proposalData.data.parentObjId) {
                return dbconfig.collection_partnerDownLineCommConfig.findOneAndUpdate(qObj, proposalData.data.newRate, {
                    new: true,
                    upsert: true
                }).lean().then(
                    data => {
                        if (proposalData.data.isUpdateChild) {
                            updateDownLineCommConfig(qObj.partner, qObj.platform, proposalData.data.commissionType, [data], true);
                        }
                        return data;
                    }
                )
            } else {
                return dbconfig.collection_partnerMainCommConfig.findOneAndUpdate(qObj, proposalData.data.newRate, {
                    new: true,
                    upsert: true
                }).lean().then(
                    data => {
                        if (proposalData.data.isUpdateChild) {
                            updateDownLineCommConfig(qObj.partner, qObj.platform, proposalData.data.commissionType, [data], true);
                        }
                        return data;
                    }
                )
            }
        }
    },

    updateAllMultiLvlCustomizeCommissionRate: function (proposalData) {
        let proms = [];

        if (proposalData && proposalData.data && proposalData.data.newConfigArr && proposalData.data.newConfigArr.length > 0) {
            proposalData.data.newConfigArr.forEach(newConfig => {
                if (newConfig) {
                    let qObj = {
                        platform: newConfig.platform,
                        provider: newConfig.provider,
                        // commissionType: newConfig.commissionType,
                        partner: proposalData.data.partnerObjId
                    };

                    newConfig.partner = proposalData.data.partnerObjId;
                    delete newConfig._id;
                    delete newConfig.__v;



                    if (proposalData.data.parentObjId) {
                        let prom = dbconfig.collection_partnerDownLineCommConfig.findOneAndUpdate(qObj, newConfig, {
                            new: true,
                            upsert: true
                        }).lean().then(
                            data => {
                                if (proposalData.data.isUpdateChild) {
                                    updateDownLineCommConfig(qObj.partner, qObj.platform, newConfig.commissionType, [data], true);
                                }
                                return data;
                            }
                        )
                        proms.push(prom);
                    } else {
                        let prom = dbconfig.collection_partnerMainCommConfig.findOneAndUpdate(qObj, newConfig, {
                            new: true,
                            upsert: true
                        }).lean().then(
                            data => {
                                if (proposalData.data.isUpdateChild) {
                                    updateDownLineCommConfig(qObj.partner, qObj.platform, newConfig.commissionType, [data], true);
                                }
                                return data;
                            }
                        )
                        proms.push(prom);
                    }



                    // proms.push(dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(qObj, newConfig, {
                    //     new: true,
                    //     upsert: true
                    // }))
                }
            });

            return Promise.all(proms).then(
                data => {
                    return data;
                },
                error => {
                    return error;
                }
            )
        }
    },

    checkAllProvidersIsCommRateValid: async function (partnerObjId, oldConfigArr, newConfigArr, isParentMainPartner, parentObjId) {
        let childPartnerObjs = await dbconfig.collection_partner.find({parent: partnerObjId}, {_id: 1}).lean();
        let promArr = [];
        let isUpdateChild = false;
        for (let i = 0; i < newConfigArr.length; i++) {
            promArr.push(dbPartnerCommissionConfig.checkIsCommRateValid(partnerObjId, oldConfigArr[i], newConfigArr[i], isParentMainPartner, parentObjId, childPartnerObjs));
        }
        return Promise.all(promArr).then(
            data => {
                if (data && data.length) {
                    for (let j = 0; j < data.length; j++) {
                        if (data[j] && data[j].isUpdateChild) {
                            isUpdateChild = true;
                            break;
                        }
                    }
                }
                return {isUpdateChild: isUpdateChild};
            }
        )

    },


    /**
     *
     * @param partnerObjId
     * @param oldConfig
     * @param newConfig
     * @param isParentMainPartner - is partner's parent top level of partner
     * @param parentObjId
     * @returns {Promise}
     */
    checkIsCommRateValid: async function (partnerObjId, oldConfig, newConfig, isParentMainPartner, parentObjId, childPartnerObjs) {
        if (!oldConfig.platform || !oldConfig.hasOwnProperty("provider")) { // null provider = default commission group
            return Promise.reject({name: "DataError", message: "Invalid update data"});
        }
        let childPartner;
        if (childPartnerObjs) {
            childPartner = childPartnerObjs;
        } else {
            childPartner = await dbconfig.collection_partner.find({parent: partnerObjId}, {_id: 1}).lean();
        }
        let commConfigData = [];
        if (childPartner && childPartner.length) {
            let query = {
                platform: oldConfig.platform,
                provider: oldConfig.provider,
                partner: {$in: childPartner.map(partner => partner._id)}
            };
            commConfigData = await dbconfig.collection_partnerDownLineCommConfig.find(query).lean();
        }
        if (parentObjId) {
            let parentConfigData;
            let queryConfig = {
                platform: oldConfig.platform,
                provider: oldConfig.provider,
                partner: parentObjId
            };
            if (isParentMainPartner) {
                parentConfigData = await dbconfig.collection_partnerMainCommConfig.find(queryConfig).lean();
            } else {
                parentConfigData = await dbconfig.collection_partnerDownLineCommConfig.find(queryConfig).lean();
            }
            if (parentConfigData && parentConfigData.length) {
                parentConfigData = parentConfigData.map(
                    parentConfig => {
                        parentConfig.isHigherPartner = true;
                        return parentConfig;
                    }
                )
                commConfigData = commConfigData.concat(parentConfigData);
            }
        }
        if (commConfigData && commConfigData.length) {
            for (let j = 0; j < commConfigData.length; j++) {
                let commConfig = commConfigData[j].commissionSetting;
                if (!commConfig) {
                    continue;
                }

                if (commConfig.length != newConfig.commissionSetting.length) {
                    return Promise.resolve({isUpdateChild: true});
                    // commission config suppose to be same when update commissioin 1 by 1
                }

                for (let k = 0; k < commConfig.length; k++) {
                    if (commConfigData[j].isHigherPartner) {
                        if (commConfig[k]["commissionRate"] < newConfig.commissionSetting[k]["commissionRate"]) {
                            return Promise.reject({
                                name: "DataError",
                                message: "Commission rate cannot higher than parent partner"
                            });
                        }
                    } else {
                        if (commConfig[k]["commissionRate"] > newConfig.commissionSetting[k]["commissionRate"]) {
                            return Promise.reject({
                                name: "DataError",
                                message: "Commission rate cannot lower than child partner"
                            });
                        }
                    }
                }
            }
        }
    }
};

function clearParent (partnerObjId, platformObjId) {
    return dbconfig.collection_partner.findOneAndUpdate({_id: partnerObjId, platform: platformObjId}, {$unset: {parent: ""}}, {new:true}).lean();
}

async function updateDownLineCommConfig (parentObjId, platformObjId, commissionType, commConfigObj, isResetCommission, partnersObjArr) {
    // if (!parentObjId && !commConfigObj) {
    if (!parentObjId || !commConfigObj || !commConfigObj.length) {
        return;
    }

    let partnersObj;
    if (partnersObjArr && partnersObjArr.length) {
        partnersObj = partnersObjArr;
    } else {
        partnersObj = await dbconfig.collection_partner.find({parent: parentObjId}, {_id: 1, commissionType: 1}).lean();
    }

    if (!partnersObj || !partnersObj.length) {
        return;
    }

    dbconfig.collection_partner.update({_id: {$in: partnersObj.map(partner => partner._id)}}, {commissionType: commissionType}, {multi: true}).catch(errorUtils.reportError);

    let commConfigData = JSON.parse(JSON.stringify(commConfigObj));

    if (isResetCommission) {
        commConfigData = commConfigData.map(commConfig => {
            if (commConfig.commissionSetting) {
                commConfig.commissionSetting = commConfig.commissionSetting.map(commSetting => {
                    let originalRate = commSetting.commissionRate;
                    commSetting.commissionRate -= 0.01;
                    if (commSetting.commissionRate < 0) {
                        commSetting.commissionRate = originalRate;
                    }
                    return commSetting;
                })
            }
            return commConfig;
        });
    }

    partnersObj.map(partner=> {
        for (let i = 0; i < commConfigData.length; i++) {
            let commConfig =  JSON.parse(JSON.stringify(commConfigData[i]));

            if (!commConfig) {
                // this means platform haven't properly set default commission
                continue;
            }
            delete commConfig._id;
            delete commConfig.__v;
            let defCommConfig =  JSON.parse(JSON.stringify(commConfig));
            defCommConfig.partner = parentObjId;
            commConfig.partner = partner._id;

            dbconfig.collection_partnerDefDownLineCommConfig.findOneAndUpdate({
                platform: platformObjId,
                partner: parentObjId,
                provider: defCommConfig.provider
            }, defCommConfig, {upsert: true, new: true}).lean().catch(errorUtils.reportError);

            dbconfig.collection_partnerDownLineCommConfig.findOneAndUpdate({
                platform: platformObjId,
                partner: partner._id,
                provider: commConfig.provider
            }, commConfig, {upsert: true, new: true}).lean().catch(errorUtils.reportError);
        }

        updateDownLineCommConfig(partner._id, platformObjId, commissionType, commConfigData, isResetCommission);
    })

}

function getMainCommConfig (partnerObjId, platformObjId, commissionType, isSkipUpdate, isGetDefault) {
    let configs = [], providerGroups = [];
    let configProm = dbconfig.collection_partnerMainCommConfig.find({platform: platformObjId, partner: partnerObjId, commissionType}).lean();
    let providerGroupProm = dbconfig.collection_gameProviderGroup.find({platform: platformObjId} , {_id: 1}).lean();

    return Promise.all([configProm, providerGroupProm]).then(
        ([configData, providerGroupData]) => {
            if (!providerGroupData || !providerGroupData.length) {
                return [];
            }

            configData = configData || [];

            providerGroups = providerGroupData;

            if (isGetDefault) {
                providerGroups.push({
                    _id: null,
                    name: "default",
                    providers: null
                })
            }


            let proms = [];
            for (let i = 0; i < providerGroups.length; i++) {
                if ((!providerGroups[i] || !providerGroups[i]._id) && !(providerGroups[i] && providerGroups[i].name == "default")) {
                    continue;
                }
                let config = configData.find((config) => {
                    return String(config.provider) == String(providerGroups[i]._id);
                });

                if (config) {
                    configs.push(config);
                }
                else {
                    let prom = dbconfig.collection_platformPartnerCommConfig.findOne({provider: providerGroups[i]._id, platform: platformObjId, commissionType}).lean();
                    proms.push(prom);
                }
            }

            return Promise.all(proms);
        }
    ).then(
        defConfigs => {
            if (!defConfigs || !defConfigs.length || isSkipUpdate) {
                return configs;
            }

            for (let i = 0; i < defConfigs.length; i++) {
                let defConfig = defConfigs[i];

                if (!defConfig) {
                    // this means platform haven't properly set default commission
                    continue;
                }
                delete defConfig._id;
                delete defConfig.__v;
                defConfig.partner = partnerObjId;
                let updateProm = dbconfig.collection_partnerMainCommConfig.findOneAndUpdate({platform: platformObjId, partner:partnerObjId, provider: defConfig.provider}, defConfig, {upsert: true, new: true}).lean().catch(errorUtils.reportError);
                configs.push(updateProm);
            }

            return Promise.all(configs);
        }
    );
}


function getDownLineCommConfig (partnerObjId, platformObjId, parentObjId, commissionType, isSkipUpdate, isGetDefault) {
    let configs = [], providerGroups = [];
    let configProm = dbconfig.collection_partnerDownLineCommConfig.find({partner: partnerObjId, commissionType}).lean();
    let providerGroupProm = dbconfig.collection_gameProviderGroup.find({platform: platformObjId} , {_id: 1}).lean();

    return Promise.all([configProm, providerGroupProm]).then(
        ([configData, providerGroupData]) => {
            if (!providerGroupData || !providerGroupData.length) {
                return [];
            }

            configData = configData || [];

            providerGroups = providerGroupData;

            if (isGetDefault) {
                providerGroups.push({
                    _id: null,
                    name: "default",
                    providers: null
                })
            }

            let proms = [];

            for (let i = 0; i < providerGroups.length; i++) {
                if ((!providerGroups[i] || !providerGroups[i]._id) && !(providerGroups[i] && providerGroups[i].name == "default")) {
                    continue
                }
                let config = configData.find((config) => {
                    return String(config.provider) == String(providerGroups[i]._id);
                });

                if (config) {
                    configs.push(config);
                }
                else {
                    let prom = dbconfig.collection_partnerDefDownLineCommConfig.findOne({provider: providerGroups[i]._id, platform: platformObjId, partner: parentObjId, commissionType}).lean();
                    proms.push(prom);
                }
            }

            return Promise.all(proms);
        }
    ).then(
        defConfigs => {
            if (!defConfigs || !defConfigs.length || isSkipUpdate) {
                return configs;
            }

            for (let i = 0; i < defConfigs.length; i++) {
                let defConfig = defConfigs[i];

                if (!defConfig) {
                    continue;
                }
                delete defConfig._id;
                delete defConfig.__v;
                defConfig.partner = partnerObjId;
                let updateProm = dbconfig.collection_partnerDownLineCommConfig.findOneAndUpdate({platform: platformObjId, partner:partnerObjId, provider: defConfig.provider}, defConfig, {upsert: true, new: true}).lean().catch(errorUtils.reportError);
                configs.push(updateProm);
            }

            return Promise.all(configs);
        }
    );
}

function getPartnerParentChain (parentObjId, chainArray) {
    chainArray = chainArray || [];
    if (chainArray.includes(String(parentObjId)) || chainArray.length > 200) {
        // prevent potential infinite loop
        return chainArray;
    }

    return dbconfig.collection_partner.findOne({_id: parentObjId}).lean().then(
        partner => {
            if (partner) {
                chainArray.push(partner);
                if (partner.parent) {
                    return getPartnerParentChain(partner.parent, chainArray);
                }
            }
            return chainArray;
        }
    );
}

function createDefaultPartnerCommRate (partnerObjId) {
    let partner;
    return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
        partnerData => {
            if (!partnerData) {
                return Promise.reject({message: "partner not found"});
            }

            partner = partnerData;

            return dbconfig.collection_partnerCommissionRateConfig.findOne({platform: partner.platform, partner: null}).lean();
        }
    ).then(
        defaultConfig => {
            if (!defaultConfig) {
                return null;
            }

            let defaultConfigClone = JSON.parse(JSON.stringify(defaultConfig));
            delete defaultConfigClone._id;
            defaultConfigClone.partner = partner._id;

            return dbconfig.collection_partnerMainCommRateConfig(defaultConfigClone).save();
        }
    ).then(
        () => {
            return dbconfig.collection_partnerMainCommRateConfig.findOne({partner: partnerObjId}).lean();
        }
    );
}


let proto = dbPartnerCommissionConfigFunc.prototype;
proto = Object.assign(proto, dbPartnerCommissionConfig);
module.exports = dbPartnerCommissionConfig;