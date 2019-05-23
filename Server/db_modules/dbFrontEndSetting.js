var dbConfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var dbFrontEndSetting = {
    saveSkinSetting: (data) => {
        let newSetting = {
            platformObjId: ObjectId(data.platform),
            device: data.device,
            name: data.name,
            url: data.url
        };

        let record = new dbConfig.collection_frontEndSkinSetting(newSetting);
        return record.save();
    },

    getSkinSetting: (platformObjId) => {
        return dbConfig.collection_frontEndSkinSetting.find({platformObjId: ObjectId(platformObjId)}).lean();
    },

    removeSkinSetting: (skinSettingObjId) => {
        return dbConfig.collection_frontEndSkinSetting.remove({_id: ObjectId(skinSettingObjId)}).exec();
    },

    getSkinSettingByPC: (platformObjId) => {
        return dbConfig.collection_frontEndSkinSetting.find({platformObjId: ObjectId(platformObjId), device: 1}).lean();
    },

    getSkinSettingByAPP: (platformObjId) => {
        return dbConfig.collection_frontEndSkinSetting.find({platformObjId: ObjectId(platformObjId), device: 2}).lean();
    },

    getSkinSettingByH5: (platformObjId) => {
        return dbConfig.collection_frontEndSkinSetting.find({platformObjId: ObjectId(platformObjId), device: 3}).lean();
    },

    saveUrlConfig: (data) => {
        return dbConfig.collection_frontEndUrlConfiguration.findOne({platformObjId: ObjectId(data.platform)}).lean().then(
            urlConfigData => {
                if (urlConfigData && urlConfigData._id) {
                    let updateData = Object.assign({}, data);

                    delete updateData.platform;

                    return dbConfig.collection_frontEndUrlConfiguration.findOneAndUpdate(
                        {_id: urlConfigData._id, platformObjId: urlConfigData.platformObjId},
                        updateData,
                        {new: true});
                } else {
                    let newSetting = {
                        platformObjId: ObjectId(data.platform),
                        websiteTitle: data.websiteTitle,
                        websiteName: data.websiteName,
                        androidAppUrl: data.androidAppUrl,
                        iosAppUrl: data.iosAppUrl,
                        metaKeyword: data.metaKeyword,
                        metaDescription: data.metaDescription,
                        horizontalScreenStyleFileUrl: data.horizontalScreenStyleFileUrl,
                        faviconUrl: data.faviconUrl,
                        websiteLogo: data.websiteLogo,
                        pcSkin: data.pcSkin,
                        h5Skin: data.h5Skin,
                        appSkin: data.appSkin
                    };

                    let record = new dbConfig.collection_frontEndUrlConfiguration(newSetting);
                    return record.save();
                }
            }
        );
    },

    getUrlConfig: (platformObjId) => {
        return dbConfig.collection_frontEndUrlConfiguration.findOne({platformObjId: ObjectId(platformObjId)}).lean();
    },
};

module.exports = dbFrontEndSetting;