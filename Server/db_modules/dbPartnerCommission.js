let dbPartnerCommissionFunc = function () {
};
module.exports = new dbPartnerCommissionFunc();

const dbconfig = require('./../modules/dbproperties');

const dbPartnerCommission = {
    getPlatformPartnerCommConfig: (platformObjId) => {
        console.log('platformObjId', platformObjId);
        return dbconfig.collection_platformPartnerCommConfig.find({platform: platformObjId}).lean().then(
            data => {
                console.log('ppcc', data)
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
};




let proto = dbPartnerCommissionFunc.prototype;
proto = Object.assign(proto, dbPartnerCommission);
module.exports = dbPartnerCommission;