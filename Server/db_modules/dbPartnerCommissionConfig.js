let dbPartnerCommissionConfigFunc = function () {
};
module.exports = new dbPartnerCommissionConfigFunc();

const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('./../modules/errorUtils');
const math = require('mathjs');
const constServerCode = require('./../const/constServerCode');
const constProposalType = require('./../const/constProposalType');
const dbProposal = require('./../db_modules/dbProposal');

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

    getPartnerCommRate: (partnerObjId) => { // for direct, require main partner's partnerobjid
        return dbconfig.collection_partnerCommissionRateConfig.findOne({partner: partnerObjId}).lean().then(
            config => {
                if (config) {
                    return config;
                }
                return createDefaultPartnerCommRate (partnerObjId);
            }
        )
    },

    getPartnerMultiLvlCommRate: (partnerObjId) => { // for multi, require main partner's partnerobjid
        return dbconfig.collection_partnerMainCommRateConfig.findOne({partner: partnerObjId}).lean().then(
            config => {
                if (config) {
                    return config;
                }
                return createDefaultPartnerCommRate (partnerObjId, true);
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

        let providerArr = providerGroups.map(provider => provider._id);
        providerArr.push(null); // default group
        let defConfigs = await dbconfig.collection_platformPartnerCommConfig.find({
            // provider: providerGroups[i]._id,
            provider: {$in: providerArr},
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

    checkIsCustomizeAllCommValid: async function (partnerObjId, oldConfigArr, newConfigArr) {
        let isUpdateChild = false;
        let compareKey = ["activePlayerValueFrom", "activePlayerValueTo", "playerConsumptionAmountFrom", "playerConsumptionAmountTo"];
        if (oldConfigArr.length != newConfigArr.length) {
            isUpdateChild = true;
        } else {
            if (oldConfigArr.length && newConfigArr.length) {
                if (oldConfigArr.length != newConfigArr.length) {
                    isUpdateChild = true;
                } else {
                    for (let i = 0; i < newConfigArr.length; i++) {
                        let oldCommSett = oldConfigArr[i].commissionSetting;
                        let newCommSett = newConfigArr[i].commissionSetting;
                        if (oldCommSett && newCommSett) {
                            if (oldCommSett.length != newCommSett.length) {
                                isUpdateChild = true;
                                break;
                            } else {
                                for (let j = 0; j < newCommSett.length; j++) {
                                    for (let key in newCommSett[j]) {
                                        if (compareKey.includes(String(key)) && oldCommSett[j][key] != newCommSett[j][key]) {
                                            isUpdateChild = true;
                                            break;
                                        }
                                    }
                                    if (isUpdateChild) {
                                        break;
                                    }
                                }
                            }
                        } else {
                            isUpdateChild = true;
                            break;
                        }
                        if (isUpdateChild) {
                            break;
                        }
                    }
                }

            } else {
                // skip update, no changes has made
                return Promise.reject({name: "DataError", message: "Invalid update data"});
            }
        }

        if (isUpdateChild) {
            return Promise.resolve({isUpdateChild: isUpdateChild});
        }

        let partnerObj = await dbconfig.collection_partner.findOne({_id: partnerObjId}).populate({
            path: "parent",
            model: dbconfig.collection_partner,
            select: "parent"
        }).lean();

        if (!partnerObj) {
            return Promise.reject({name: "DataError", message: "Cannot find partner"});
        }

        let parentObjId;
        let isParentMainPartner = true;
        if (partnerObj.parent) {
            if (partnerObj.parent.parent) {
                isParentMainPartner = false;
            }
            if (partnerObj.parent._id) {
                parentObjId = partnerObj.parent._id;
            }
        }
        return dbPartnerCommissionConfig.checkAllProvidersIsCommRateValid(partnerObjId, oldConfigArr, newConfigArr, isParentMainPartner, parentObjId).then(
            data => {
                if (data && data.isUpdateChild) {
                    isUpdateChild = true;
                }

                return {isUpdateChild: isUpdateChild};
            }
        );

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
        if (!oldConfig.platform || !oldConfig.hasOwnProperty("provider") || !partnerObjId) { // null provider = default commission group
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
    },

    checkIsCustomizeCommValid: async function (partnerObjId, oldConfig, newConfig) {
        let isUpdateChild = false;
        if (oldConfig.commissionSetting && newConfig.commissionSetting) {
            let compareKey = ["activePlayerValueFrom", "activePlayerValueTo", "playerConsumptionAmountFrom", "playerConsumptionAmountTo"];
            if (oldConfig.commissionSetting.length != newConfig.commissionSetting.length) {
                isUpdateChild = true;
            } else {
                for (let i = 0; i < newConfig.commissionSetting.length; i++) {
                    let oldCommSett = oldConfig.commissionSetting[i];
                    let newCommSett = newConfig.commissionSetting[i];
                    for (let key in newCommSett) {
                        if (compareKey.includes(String(key)) && oldCommSett[key] != newCommSett[key]) {
                            isUpdateChild = true;
                            break;
                        }
                    }
                    if (isUpdateChild) {
                        break;
                    }
                }
            }
        }

        if (isUpdateChild) {
            return Promise.resolve({isUpdateChild: isUpdateChild});
        }

        let partnerObj = await dbconfig.collection_partner.findOne({_id: partnerObjId}).populate({
            path: "parent",
            model: dbconfig.collection_partner,
            select: "parent"
        }).lean();

        let isParentMainPartner = true;
        let parentObjId;
        if (!partnerObj) {
            return Promise.reject({name: "DataError", message: "Cannot find partner"});
        }
        if (partnerObj.parent) {
            if (partnerObj.parent.parent) {
                isParentMainPartner = false;
            }
            if (partnerObj.parent._id) {
                parentObjId = partnerObj.parent._id;
            }
        }

        return dbPartnerCommissionConfig.checkIsCommRateValid(partnerObjId, oldConfig, newConfig, isParentMainPartner, parentObjId).then(
            data => {
                if (data && data.isUpdateChild) {
                    isUpdateChild = true;
                }

                return {isUpdateChild: isUpdateChild};
            }
        );

    },

    getChildMainPartner: function (platformObjId, parentObjId, partnerObj) {
        if (partnerObj && String(partnerObj._id) === String(parentObjId)) {
            // prevent potential infinite loop
            return partnerObj;
        }

        return dbconfig.collection_partner.findOne({_id: parentObjId, platform: platformObjId}, {partnerName: 1, parent: 1}).lean().then(
            partner => {
                if (partner) {
                    if (partner.parent) {
                        return dbPartnerCommissionConfig.getChildMainPartner(platformObjId, partner.parent, partner);
                    }
                }
                return partner;
            }
        );
    },

    createUpdatePartnerMainCommRateConfig: function  (query, data) {
        return dbconfig.collection_partnerMainCommRateConfig.findOne({platform: query.platform, partner: null}).lean().then(
            configData => {
                //check if config exist
                if (!configData) {
                    var newCommissionRateConfig = new dbconfig.collection_partnerMainCommRateConfig(data);
                    return newCommissionRateConfig.save();
                }
                else {
                    return dbconfig.collection_partnerMainCommRateConfig.findOneAndUpdate(query, data);
                }
            });
    },

    getPartnerMainCommRateConfig: function (query) {
        return dbconfig.collection_partnerMainCommRateConfig.find(query);
    },

    setDLPartnerCommissionRateAPI: async (currentPartnerId, targetPartnerId, commissionRate) => {
        let output = [];
        let editor = await dbconfig.collection_partner.findOne({partnerId: currentPartnerId}).lean();
        if (!editor) {
            // generally not going to happen unless bug exist
            return Promise.reject({message: "Partner not found"});
        }

        if (!Array.isArray(commissionRate)) {
            return Promise.reject({message: "Commission Rate content unknown"});
        }

        let child = await dbconfig.collection_partner.findOne({partnerId: targetPartnerId, platform: editor.platform, parent: editor._id}).lean();
        if (!child || String(editor.platform) !== String(child.platform)) {
            return Promise.reject({status: constServerCode.PARTNER_NOT_FOUND, message: "Child partner not found."});
        }

        let grandChildrenProm = dbconfig.collection_partner.find({parent: child._id, platform: editor.platform}, {_id: 1}).lean();
        let editorCommConfigProm = dbPartnerCommissionConfig.getPartnerCommConfig(editor._id, editor.commissionType);
        let childCommConfigProm = dbPartnerCommissionConfig.getPartnerCommConfig(child._id, editor.commissionType);
        let providerGroupProm = dbconfig.collection_gameProviderGroup.find({platform: editor.platform}, {providerGroupId: 1, name: 1}).lean();
        let [grandChildren, editorCommConfig, childCommConfig, providerGroups] = await Promise.all([grandChildrenProm, editorCommConfigProm, childCommConfigProm, providerGroupProm]);

        let grandChildrenCommConfig = {};
        for (let i = 0; i < grandChildren.length; i++) {
            let grandChild = grandChildren[i];
            let grandChildCommConfigs = await dbconfig.collection_partnerDownLineCommConfig.find({partner: grandChild._id, commissionType: editor.commissionType}).lean();
            for (let j = 0; j < grandChildCommConfigs.length; j++) {
                let config = grandChildCommConfigs[j];
                if (!config || !config._id) continue;

                let currentGroup = providerGroups.find(group => {
                    return String(group._id) === String(config.provider);
                });
                if (!currentGroup) continue;

                grandChildrenCommConfig[currentGroup.name] = grandChildrenCommConfig[currentGroup.name] || [];
                grandChildrenCommConfig[currentGroup.name].push(config);
            }
        }

        // imo this checking part is unnecessary, but reynold say so
        for (let i = 0; i < commissionRate.length; i++) {
            let groupRate = commissionRate[i];
            if (!groupRate || !groupRate.providerGroupId || !groupRate.providerGroupName || !groupRate.list) {
                return Promise.reject({message: "Commission Rate content unknown"});
            }

            if (groupRate.list.length) {
                for (let j = 0; j < groupRate.list.length; j++) {
                    let requirementRate = groupRate.list[j];
                    let keys = Object.keys(requirementRate);
                    if (
                        !keys.includes("commissionRate") ||
                        !keys.includes("activePlayerValueTo") ||
                        !keys.includes("activePlayerValueFrom") ||
                        !keys.includes("playerConsumptionAmountTo") ||
                        !keys.includes("playerConsumptionAmountFrom")
                    ) {
                        return Promise.reject({message: "Commission Rate content unknown"});
                    }
                }
            }
        }

        // for each rate given, check if its below the max and above the min allowed
        let proposalProms = [];
        for (let i = 0; i < commissionRate.length; i++) {
            let groupRate = commissionRate[i];
            let groupRateList = groupRate && groupRate.list || [];
            if (!groupRateList || !groupRateList.length) continue;

            let group = providerGroups.find(group => String(group.name) === String(groupRate.providerGroupName));
            if (!group) {
                console.log('group rate provider group not found', groupRate);
                continue;
            }

            // console.log("group", group)
            // console.log("groupRate", groupRate)

            // compare with original see if anything change
            // get original

            let originalGroupRate = childCommConfig.find(config => String(config.provider) === String(group._id));
            // console.log('originalGroupRate', group.providerGroupId, originalGroupRate)
            let originalGroupRateList = originalGroupRate && originalGroupRate.commissionSetting || [];
            if (!originalGroupRateList || !originalGroupRateList.length) continue;
            // groupRate.list
            // originalGroupRate.commissionSetting

            // console.log('originalGroupRateList', JSON.stringify(originalGroupRateList, null ,2))
            // console.log('groupRateList', JSON.stringify(groupRateList, null ,2))
            let rateChanged = false;
            for (let j = 0; j < originalGroupRateList.length; j++) {
                let originalRequirementRate = originalGroupRateList[j];
                if (!originalRequirementRate) continue;
                for (let k = 0; k < groupRateList.length; k++) {
                    let updatedRequirementRate = groupRateList[k];
                    if (!updatedRequirementRate || updatedRequirementRate.matched) continue;
                    updatedRequirementRate.activePlayerValueTo = updatedRequirementRate.activePlayerValueTo === "-" ? null : updatedRequirementRate.activePlayerValueTo;
                    updatedRequirementRate.playerConsumptionAmountTo = updatedRequirementRate.playerConsumptionAmountTo === "-" ? null : updatedRequirementRate.playerConsumptionAmountTo;

                    if (
                        String(originalRequirementRate.playerConsumptionAmountFrom) === String(updatedRequirementRate.playerConsumptionAmountFrom) &&
                        String(originalRequirementRate.playerConsumptionAmountTo) === String(updatedRequirementRate.playerConsumptionAmountTo) &&
                        String(originalRequirementRate.activePlayerValueFrom) === String(updatedRequirementRate.activePlayerValueFrom) &&
                        String(originalRequirementRate.activePlayerValueTo) === String(updatedRequirementRate.activePlayerValueTo)
                    ) {
                        // same requirement
                        updatedRequirementRate.matched = true;
                        if (Number(originalRequirementRate.commissionRate) !== Number(updatedRequirementRate.commissionRate)) {
                            // commission rate changed
                            rateChanged = true;
                            originalRequirementRate.changed = true;
                            originalRequirementRate.changeTo = updatedRequirementRate.commissionRate;
                        }
                        break;
                    }
                }
            }

            if (!rateChanged) continue;

            let editorGroupRate = editorCommConfig.find(config => String(config.provider) === String(group._id));
            if (!editorGroupRate) {
                console.error("Parent rate error. Please contact CS. (#01)");
                return Promise.reject({message: "Parent rate error. Please contact CS."});
            }

            let editorGroupRateList = editorGroupRate && editorGroupRate.commissionSetting || [];
            if (!editorGroupRateList || !editorGroupRateList.length || editorGroupRateList.length !== originalGroupRateList.length) {
                console.error("Parent rate error. Please contact CS. (#02)");
                return Promise.reject({message: "Parent rate error. Please contact CS."});
            }

            // find similar rate requirement from editor
            // if not exist, return error
            for (let j = 0; j < originalGroupRateList.length; j++) {
                let originalRequirementRate = originalGroupRateList[j];
                if (!originalRequirementRate) continue;
                let editorRequirementRate = editorGroupRateList[j];
                if (!editorRequirementRate) continue;

                if (!(
                    String(originalRequirementRate.playerConsumptionAmountFrom) === String(editorRequirementRate.playerConsumptionAmountFrom) &&
                    String(originalRequirementRate.playerConsumptionAmountTo) === String(editorRequirementRate.playerConsumptionAmountTo) &&
                    String(originalRequirementRate.activePlayerValueFrom) === String(editorRequirementRate.activePlayerValueFrom) &&
                    String(originalRequirementRate.activePlayerValueTo) === String(editorRequirementRate.activePlayerValueTo)
                )) {
                    console.error("Parent rate error. Please contact CS. (#03)");
                    return Promise.reject({message: "Parent rate error. Please contact CS."});
                }

                if (!originalRequirementRate.changed) continue;

                if (originalRequirementRate.changeTo > math.subtract(editorRequirementRate.commissionRate, 0.01)) {
                    // between parent and child must have 1% different minimum
                    console.log('between parent and child must have 1% different minimum', originalRequirementRate.changeTo, '>', editorRequirementRate.commissionRate , '- 0.01');
                    return Promise.reject({
                        status: constServerCode.PARTNER_RATE_INAPPROPRIATE,
                        message: "You must at least take 1% commission from your lower level partner to earn money."
                    });
                }
            }

            // find highest similar rate requirement from child
            // todo:: debug start from here
            let currentProviderGrandChildren = grandChildrenCommConfig[String(group.name)];
            if (currentProviderGrandChildren && currentProviderGrandChildren.length) {
                let gcRateLists = currentProviderGrandChildren.map(gc => gc && gc.commissionSetting)
                gcRateLists = gcRateLists.filter(requirementList => requirementList && requirementList.length === originalGroupRateList.length);

                for (let j = 0; j < originalGroupRateList.length; j++) {
                    let originalRequirementRate = originalGroupRateList[j];
                    if (!originalRequirementRate) continue;
                    if (!originalRequirementRate.changed) continue;

                    let highestChildRate = gcRateLists.reduce((rate, requirementList) => {
                        let gcRequirementRate = requirementList[j];
                        if (!gcRequirementRate) {
                            return rate;
                        }

                        return Number(gcRequirementRate.commissionRate) > rate ? gcRequirementRate.commissionRate : rate;
                    }, 0);

                    if (originalRequirementRate.changeTo < math.add(highestChildRate, 0.01)) {
                        console.log('child compared too low', originalRequirementRate.changeTo, '<', highestChildRate + 0.01);
                        return Promise.reject({
                            status: constServerCode.PARTNER_RATE_INAPPROPRIATE,
                            message: "Your lower level partner have to at least take 1% commission, the rate inserted is too low for that based on their current commission setting."
                        });
                    }
                }
            }

            let newGroupRate = JSON.parse(JSON.stringify(originalGroupRate));
            if (newGroupRate && newGroupRate.commissionSetting && newGroupRate.commissionSetting.length) {
                newGroupRate.commissionSetting.forEach(requirementRate => {
                    if (requirementRate.changed) {
                        requirementRate.commissionRate = requirementRate.changeTo;
                    }
                });
            }

            let creatorData = {
                type: 'partner',
                name: editor.partnerName,
                id: editor._id
            };

            let proposalData ={
                creator: creatorData,
                platformObjId: editor.platform,
                partnerObjId: child._id,
                partnerName: child.partnerName,
                parentObjId: editor._id,
                isUpdateChild: true,
                settingObjId: originalGroupRate._id,
                commissionType: editor.commissionType,
                isMultiLevel: true,
                oldRate: originalGroupRate,
                newRate: newGroupRate,
                remark: "代理设置下级佣金",
            };

            let prom = await dbProposal.createProposalWithTypeName(editor.platform, constProposalType.CUSTOMIZE_PARTNER_COMM_RATE, {
                creator: creatorData,
                data: proposalData
            });

            let outputData = groupRate;
            if (outputData && outputData.list && outputData.list.length) {
                outputData.list.forEach(requirementRate => {
                    delete requirementRate.matched;
                });
            }
            output.push(outputData);
            proposalProms.push(prom);
        }
        if (proposalProms.length === 0) {
            return Promise.reject({message: "There is no relevant commission to update"});
        }

        let result = await Promise.all(proposalProms);

        return output;
    },
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
                    // let originalRate = commSetting.commissionRate;
                    commSetting.commissionRate = 0;
                    // if (commSetting.commissionRate < 0) {
                    //     commSetting.commissionRate = originalRate;
                    // }
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
    if (chainArray.find(chain=> String(chain._id) === String(parentObjId)) || chainArray.length > 200) {
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

function createDefaultPartnerCommRate (partnerObjId, isMulti) {
    let partner;
    let commRateSchema = isMulti ? dbconfig.collection_partnerMainCommRateConfig : dbconfig.collection_partnerCommissionRateConfig;

    return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
        partnerData => {
            if (!partnerData) {
                return Promise.reject({message: "partner not found"});
            }

            partner = partnerData;

            return commRateSchema.findOne({platform: partner.platform, partner: null}).lean();
        }
    ).then(
        defaultConfig => {
            if (!defaultConfig) {
                return null;
            }

            let defaultConfigClone = JSON.parse(JSON.stringify(defaultConfig));
            delete defaultConfigClone._id;
            defaultConfigClone.partner = partner._id;

            return commRateSchema(defaultConfigClone).save();
        }
    ).then(
        () => {
            return commRateSchema.findOne({partner: partnerObjId}).lean();
        }
    );
}


let proto = dbPartnerCommissionConfigFunc.prototype;
proto = Object.assign(proto, dbPartnerCommissionConfig);
module.exports = dbPartnerCommissionConfig;