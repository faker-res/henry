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

    getPartnerCommConfig: (partnerObjId, commissionType, isSkipUpdate) => {
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
                    return getDownLineCommConfig(partner._id, partner.platform, parentData._id, commissionType, isSkipUpdate);
                }
                else {
                    return getMainCommConfig(partner._id, partner.platform, commissionType, isSkipUpdate);
                }
            }
        )
    },

    getPartnerParentChain: (partnerObjId) => {
        // it will return an array of partners' obj id
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

    updateMainPartnerCommissionData: async function (parentObjId, partnerObjId, platformObjId, commissionType)/*(partnerObjId, platformObjId, commissionType, isSkipUpdate)*/ {
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
                updateDownLineCommConfig(partnerObjId, platformObjId, commissionType, defConfigs);
            }
    }
};

function clearParent (partnerObjId, platformObjId) {
    return dbconfig.collection_partner.findOneAndUpdate({_id: partnerObjId, platform: platformObjId}, {$unset: {parent: ""}}, {new:true}).lean();
}

async function updateDownLineCommConfig (parentObjId, platformObjId, commissionType, commConfigObj)/*(partnerObjId, platformObjId, parentObjId, commissionType, isSkipUpdate)*/ {
    // if (!parentObjId && !commConfigObj) {
    if (!parentObjId || !commConfigObj || !commConfigObj.length) {
        return;
    }

    let partnersObj = await dbconfig.collection_partner.find({parent: parentObjId}, {_id: 1, commissionType: 1}).lean();
    if (!partnersObj || !partnersObj.length) {
        return;
    }

    dbconfig.collection_partner.update({_id: {$in: partnersObj.map(partner => partner._id)}}, {commissionType: commissionType}, {multi: true}).catch(errorUtils.reportError);

    let commConfigData = JSON.parse(JSON.stringify(commConfigObj));

    commConfigData = commConfigData.map(commConfig => {
        commConfig.commissionSetting = commConfig.commissionSetting.map(commSetting => {
            commSetting.commissionRate -= 0.01;
            if (commSetting.commissionRate < 0.01) {
                commSetting.commissionRate = 0.01;
            }
            return commSetting;
        })
        return commConfig;
    });

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

        updateDownLineCommConfig(partner._id, platformObjId, commissionType, commConfigData);
    })

}

function getMainCommConfig (partnerObjId, platformObjId, commissionType, isSkipUpdate) {
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

            let proms = [];

            for (let i = 0; i < providerGroups.length; i++) {
                if (!providerGroups[i] || !providerGroups[i]._id) {
                    continue;
                }
                let config = configData.find((config) => {
                    return config.provider && String(config.provider) == String(providerGroups[i]._id);
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
                delete defConfig.__v;
                delete defConfig._id;
                defConfig.partner = partnerObjId;
                dbconfig.collection_partnerMainCommConfig.findOneAndUpdate({platform: platformObjId, partner:partnerObjId, provider: defConfig.provider}, defConfig, {upsert: true, new: true}).lean().catch(errorUtils.reportError);
                configs.push(defConfig);
            }

            return configs;
        }
    );
}

function getDownLineCommConfig (partnerObjId, platformObjId, parentObjId, commissionType, isSkipUpdate) {
    let configs = [], providerGroups = [];
    let configProm = dbconfig.collection_partnerDownLineCommConfig.find({platform: platformObjId, partner: partnerObjId, commissionType}).lean();
    let providerGroupProm = dbconfig.collection_gameProviderGroup.find({platform: platformObjId} , {_id: 1}).lean();

    return Promise.all([configProm, providerGroupProm]).then(
        ([configData, providerGroupData]) => {
            if (!providerGroupData || !providerGroupData.length) {
                return [];
            }

            configData = configData || [];

            providerGroups = providerGroupData;

            let proms = [];

            for (let i = 0; i < providerGroups.length; i++) {
                if (!providerGroups[i] || !providerGroups[i]._id) {
                    continue
                }
                let config = configData.find((config) => {
                    return config.provider && String(config.provider) == String(providerGroups[i]._id);
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
                    // this means platform haven't properly set default commission
                    continue;
                }
                delete defConfig._id;
                defConfig.partner = partnerObjId;
                dbconfig.collection_partnerDownLineCommConfig.findOneAndUpdate({platform: platformObjId, partner:partnerObjId, provider: defConfig.provider}, defConfig, {upsert: true, new: true}).lean().catch(errorUtils.reportError);
                configs.push(defConfig);
            }

            return configs;
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
                chainArray.push(String(partner._id));
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