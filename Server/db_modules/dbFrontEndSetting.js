var dbConfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var dbFrontEndSetting = {

    saveFrontEndPopUpAdvSetting: (data) => {
        if (data) {
            if (data._id) {
                let eventObjId = data._id;
                delete data._id;
                if (data.$$hashKey) {
                    delete data.$$hashKey;
                }
                if (data.hasOwnProperty("__v")) {
                    delete data.__v;
                }
                return dbConfig.collection_frontEndPopUpAdvertisementSetting.findOneAndUpdate({_id: ObjectId(eventObjId)}, data).lean();
            } else {
                let record = new dbConfig.collection_frontEndPopUpAdvertisementSetting(data);
                return record.save();
            }
        }
    },

    saveFrontEndRewardSetting: (data) => {
        if (data) {
            if (data._id) {
                let eventObjId = data._id;
                delete data._id;
                if (data.$$hashKey) {
                    delete data.$$hashKey;
                }
                if (data.hasOwnProperty("__v")) {
                    delete data.__v;
                }
                return dbConfig.collection_frontEndRewardSetting.findOneAndUpdate({_id: ObjectId(eventObjId)}, data).lean();
            } else {
                let record = new dbConfig.collection_frontEndRewardSetting(data);
                return record.save();
            }
        }
    },

    saveFrontEndRewardCategory: (platformObjId, categoryName) => {
        if (platformObjId && categoryName){
            let dataObj ={
                platformObjId: ObjectId(platformObjId),
                categoryName: categoryName
            }
            let record = new dbConfig.collection_frontEndRewardCategory(dataObj);
            return record.save();
        }
    },

    updateRewardSetting: (dataList, deletedList, deletedCategoryList) => {
        let prom = [];
        if (dataList && dataList.length){
            dataList.forEach(
                data => {
                    if (data && data._id){
                        let updateQuery = {
                            categoryObjId: data.categoryObjId,
                            isVisible: data.isVisible,
                            displayOrder: data.displayOrder || 1,
                        };
                        prom.push(getAndUpdateRewardSetting (ObjectId(data._id), updateQuery))
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
                        prom.push(getAndUpdateRewardSetting (ObjectId(data), updateQuery))

                    }
                }
            )
        }

        if (deletedCategoryList && deletedCategoryList.length){
            deletedCategoryList.forEach(
                data => {
                    if (data) {
                        let updateQuery = {
                            status: 2,
                        };
                        prom.push(getAndUpdateRewardCategory (ObjectId(data), updateQuery))

                    }
                }
            )
        }

        return Promise.all(prom);

        function getAndUpdateRewardSetting (eventObjectId, updateQuery) {
            return dbConfig.collection_frontEndRewardSetting.findOneAndUpdate({_id: eventObjectId}, updateQuery).lean();
        }

        function getAndUpdateRewardCategory (eventObjectId, updateQuery) {
            let updateProm = [];
            return dbConfig.collection_frontEndRewardCategory.findOneAndUpdate({_id: eventObjectId}, updateQuery).lean().then(
                category => {
                    if (category && category._id && category.platformObjId){
                        let platformObjId = category.platformObjId;
                        let categoryObjId =  category._id;
                        return dbConfig.collection_frontEndRewardSetting.find({platformObjId: ObjectId(platformObjId), status: 1, categoryObjId: ObjectId(categoryObjId)}).lean().then(
                            rewardList => {
                                if (rewardList && rewardList.length){
                                    rewardList.forEach(
                                        reward => {
                                            if (reward && reward._id){
                                                updateProm.push(dbConfig.collection_frontEndRewardSetting.findOneAndUpdate({_id: reward._id}, {status: 2}).lean())
                                            }
                                        }
                                    )
                                }
                                return Promise.all(updateProm)
                            }
                        )
                    }
                }
            )
        }
    },

    getFrontEndRewardSetting: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndRewardSetting.find({platformObjId: ObjectId(platformObjId), status: 1}).sort({displayOrder: 1}).lean();
        }

        return prom;
    },

    getFrontEndRewardCategory: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndRewardCategory.find({platformObjId: ObjectId(platformObjId), status: 1}).lean();
        }

        return prom;
    },

    updatePopUpAdvertisementSetting: (dataList, deletedList) => {
        let prom = [];
        if (dataList && dataList.length){
            dataList.forEach(
                data => {
                    if (data && data._id){
                        let updateQuery = {
                            isVisible: data.isVisible,
                            displayOrder: data.displayOrder
                        };
                        prom.push(dbConfig.collection_frontEndPopUpAdvertisementSetting.findOneAndUpdate({_id: ObjectId(data._id)}, updateQuery).lean())
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
                        prom.push(dbConfig.collection_frontEndPopUpAdvertisementSetting.findOneAndUpdate({_id: ObjectId(data)}, updateQuery).lean())
                    }
                }
            )
        }

        return Promise.all(prom);
    },

    getFrontEndPopUpAdvertisementSetting: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndPopUpAdvertisementSetting.find({platformObjId: ObjectId(platformObjId), status: 1}).sort({displayOrder: 1}).lean();
        }

        return prom;
    },

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

    savePartnerSkinSetting: (data) => {
        let newSetting = {
            platformObjId: ObjectId(data.platform),
            device: data.device,
            name: data.name,
            url: data.url
        };

        let record = new dbConfig.collection_frontEndPartnerSkinSetting(newSetting);
        return record.save();
    },

    getSkinSetting: (platformObjId) => {
        return dbConfig.collection_frontEndSkinSetting.find({platformObjId: ObjectId(platformObjId)}).lean();
    },

    getPartnerSkinSetting: (platformObjId) => {
        return dbConfig.collection_frontEndPartnerSkinSetting.find({platformObjId: ObjectId(platformObjId)}).lean();
    },

    removeSkinSetting: (skinSettingObjId) => {
        return dbConfig.collection_frontEndSkinSetting.remove({_id: ObjectId(skinSettingObjId)}).exec();
    },

    removePartnerSkinSetting: (skinSettingObjId) => {
        return dbConfig.collection_frontEndPartnerSkinSetting.remove({_id: ObjectId(skinSettingObjId)}).exec();
    },

    saveUrlConfig: (data) => {
        if (data && data._id){
            let dataObjId = data._id;
            delete data._id;
            return dbConfig.collection_frontEndUrlConfiguration.findOneAndUpdate(
                {_id: dataObjId},
                data,
                {new: true});
        }
        else{
            let record = new dbConfig.collection_frontEndUrlConfiguration(data);
            return record.save();
        }
    },

    savePartnerUrlConfig: (data) => {
        if (data && data._id){
            let dataObjId = data._id;
            delete data._id;
            return dbConfig.collection_frontEndPartnerUrlConfiguration.findOneAndUpdate(
                {_id: dataObjId},
                data,
                {new: true});
        }
        else{
            let record = new dbConfig.collection_frontEndPartnerUrlConfiguration(data);
            return record.save();
        }
    },

    getUrlConfig: (platformObjId) => {
        return dbConfig.collection_frontEndUrlConfiguration.findOne({platformObjId: ObjectId(platformObjId)}).lean();
    },

    getPartnerUrlConfig: (platformObjId) => {
        return dbConfig.collection_frontEndPartnerUrlConfiguration.findOne({platformObjId: ObjectId(platformObjId)}).lean();
    },

    saveCarouselSetting: (data) => {
        if (data){
            let isPartner = false;
            if (data.hasOwnProperty("isPartnerForCarouselConfiguration")){
                isPartner = data.isPartnerForCarouselConfiguration;
                delete data.isPartnerForCarouselConfiguration;
            }
            if (data._id){
                let carouselObjId = data._id;
                delete data._id;

                if (data.$$hashKey) {
                    delete data.$$hashKey;
                }

                if(data.hasOwnProperty("__v")){
                    delete data.__v;
                }

                if (isPartner){
                    return dbConfig.collection_frontEndPartnerCarouselConfiguration.findOneAndUpdate({_id: ObjectId(carouselObjId)}, data).lean();
                }
                return dbConfig.collection_frontEndCarouselConfiguration.findOneAndUpdate({_id: ObjectId(carouselObjId)}, data).lean();
            }
            else{
                let record;
                if (isPartner){
                    record = new dbConfig.collection_frontEndPartnerCarouselConfiguration(data);
                }
                else{
                    record = new dbConfig.collection_frontEndCarouselConfiguration(data);
                }
                return record.save();
            }
        }
    },

    getCarouselSetting: (platformObjId, isPartner) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            if (isPartner){
                prom = dbConfig.collection_frontEndPartnerCarouselConfiguration.find({platformObjId: ObjectId(platformObjId), status: 1}).sort({displayOrder: 1}).lean();
            }
            else{
                prom = dbConfig.collection_frontEndCarouselConfiguration.find({platformObjId: ObjectId(platformObjId), status: 1}).sort({displayOrder: 1}).lean();
            }
        }

        return prom;
    },

    updateCarouselSetting: (dataList, deletedList, isPartner) => {
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

                        if (isPartner){
                            prom.push(getAndUpdatePartnerCarouselSetting(ObjectId(data._id), updateQuery))
                        }
                        else{
                            prom.push(getAndUpdateCarouselSetting(ObjectId(data._id), updateQuery))
                        }
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

                        if (isPartner){
                            prom.push(getAndUpdatePartnerCarouselSetting(ObjectId(data), updateQuery))
                        }
                        else{
                            prom.push(getAndUpdateCarouselSetting(ObjectId(data), updateQuery))
                        }

                    }
                }
            )
        }

        return Promise.all(prom);

        function getAndUpdateCarouselSetting (carouselObjId, updateQuery) {
            return dbConfig.collection_frontEndCarouselConfiguration.findOneAndUpdate({_id: carouselObjId}, updateQuery).lean();
        }

        function getAndUpdatePartnerCarouselSetting (carouselObjId, updateQuery) {
            return dbConfig.collection_frontEndPartnerCarouselConfiguration.findOneAndUpdate({_id: carouselObjId}, updateQuery).lean();
        }
    },
};

module.exports = dbFrontEndSetting;