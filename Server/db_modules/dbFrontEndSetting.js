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

    saveCarouselSetting: (data) => {
        if (data){
            if (data._id){
                let carouselObjId = data._id;
                delete data._id;

                if (data.$$hashKey) {
                    delete data.$$hashKey;
                }

                if(data.hasOwnProperty("__v")){
                    delete data.__v;
                }

                return dbConfig.collection_frontEndCarouselConfiguration.findOneAndUpdate({_id: ObjectId(carouselObjId)}, data).lean();
            }
            else{
                let record = new dbConfig.collection_frontEndCarouselConfiguration(data);
                return record.save();
            }
        }
    },

    getCarouselSetting: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndCarouselConfiguration.find({platformObjId: ObjectId(platformObjId), status: 1}).sort({displayOrder: 1}).lean();
        }

        return prom;
    },

    updateCarouselSetting: (dataList, deletedList) => {
        let prom = [];
        if (dataList && dataList.length){
            dataList.forEach(
                data => {
                    if (data && data._id){
                        let updateQuery = {
                            device: data.device,
                            isVisible: data.isVisible
                        };

                        if (data && data.displayOrder) {
                            updateQuery.displayOrder = data.displayOrder;
                        }

                        prom.push(getAndUpdateCarouselSetting(ObjectId(data._id), updateQuery))
                    }
                }
            )
        }

        if (deletedList && deletedList.length){
            deletedList.forEach(
                data => {
                    if (data) {
                        let updateQuery = {
                            status: 2,
                        };
                        prom.push(getAndUpdateCarouselSetting(ObjectId(data), updateQuery))
                    }
                }
            )
        }

        return Promise.all(prom);

        function getAndUpdateCarouselSetting (carouselObjId, updateQuery) {
            return dbConfig.collection_frontEndCarouselConfiguration.findOneAndUpdate({_id: carouselObjId}, updateQuery).lean();
        }
    },
};

module.exports = dbFrontEndSetting;