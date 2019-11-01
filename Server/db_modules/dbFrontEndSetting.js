var dbConfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var dbFrontEndSetting = {

    updateRegistrationCategoryForFrontEndDisplay: async (categoryObjId, platformObjId)  => {
        if (categoryObjId && platformObjId){
            let updateProm = [];
            let categoryList = await dbConfig.collection_frontEndRegistrationGuidanceCategory.find({platformObjId: ObjectId(platformObjId), status: 1}).lean();

            if (categoryList && categoryList.length){
                categoryList.forEach(
                    categoryObj => {
                        if (categoryObj && categoryObj._id && categoryObj._id.toString() == categoryObjId.toString()){
                            updateProm.push(dbConfig.collection_frontEndRegistrationGuidanceCategory.findOneAndUpdate({_id: ObjectId(categoryObj._id)}, {defaultShow: true}).lean())
                        }
                        else{
                            updateProm.push(dbConfig.collection_frontEndRegistrationGuidanceCategory.findOneAndUpdate({_id: ObjectId(categoryObj._id)}, {defaultShow: false}).lean())
                        }
                    }
                );

                return Promise.all(updateProm);
            }
        }
    },

    updateSelectedCategoryForFrontEndDisplay: async (categoryObjId, platformObjId)  => {
        if (categoryObjId && platformObjId){
            let updateProm = [];
            let categoryList = await dbConfig.collection_frontEndRewardCategory.find({platformObjId: ObjectId(platformObjId), status: 1}).lean();

            if (categoryList && categoryList.length){
                categoryList.forEach(
                    categoryObj => {
                        if (categoryObj && categoryObj._id && categoryObj._id.toString() == categoryObjId.toString()){
                            updateProm.push(dbConfig.collection_frontEndRewardCategory.findOneAndUpdate({_id: ObjectId(categoryObj._id)}, {defaultShow: true}).lean())
                        }
                        else{
                            updateProm.push(dbConfig.collection_frontEndRewardCategory.findOneAndUpdate({_id: ObjectId(categoryObj._id)}, {defaultShow: false}).lean())
                        }
                    }
                );

                return Promise.all(updateProm);
            }
        }
    },

    updateRegistrationGuidanceSetting: (dataList, deletedList, deletedCategoryList) => {
        let prom = [];
        if (dataList && dataList.length){
            dataList.forEach(
                data => {
                    if (data && data._id){
                        let updateQuery = {
                            categoryObjId: data.categoryObjId,
                            isVisible: data.isVisible,
                            displayOrder: data.displayOrder || 1,
                            orderNumber: data.orderNumber || 1,
                        };
                        prom.push(getAndUpdateSetting (ObjectId(data._id), updateQuery))
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
                        prom.push(getAndUpdateSetting (ObjectId(data), updateQuery))

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
                        prom.push(getAndUpdateCategory (ObjectId(data), updateQuery))

                    }
                }
            )
        }

        return Promise.all(prom);

        function getAndUpdateSetting (eventObjectId, updateQuery) {
            return dbConfig.collection_frontEndRegistrationGuidanceSetting.findOneAndUpdate({_id: eventObjectId}, updateQuery).lean();
        }

        function getAndUpdateCategory (eventObjectId, updateQuery) {
            let updateProm = [];
            return dbConfig.collection_frontEndRegistrationGuidanceCategory.findOneAndUpdate({_id: eventObjectId}, updateQuery).lean().then(
                category => {
                    if (category && category._id && category.platformObjId){
                        let platformObjId = category.platformObjId;
                        let categoryObjId =  category._id;
                        return dbConfig.collection_frontEndRegistrationGuidanceSetting.find({platformObjId: ObjectId(platformObjId), status: 1, categoryObjId: ObjectId(categoryObjId)}).lean().then(
                            rewardList => {
                                if (rewardList && rewardList.length){
                                    rewardList.forEach(
                                        reward => {
                                            if (reward && reward._id){
                                                updateProm.push(dbConfig.collection_frontEndRegistrationGuidanceSetting.findOneAndUpdate({_id: reward._id}, {status: 2}).lean())
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

    getFrontEndRegistrationGuidanceSetting: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndRegistrationGuidanceSetting.find({platformObjId: ObjectId(platformObjId), status: 1}).sort({displayOrder: 1}).lean();
        }

        return prom;
    },

    saveFrontEndRegistrationGuidanceSetting: (data) => {
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
                return dbConfig.collection_frontEndRegistrationGuidanceSetting.findOneAndUpdate({_id: ObjectId(eventObjId)}, data).lean();
            } else {
                let record = new dbConfig.collection_frontEndRegistrationGuidanceSetting(data);
                return record.save();
            }
        }
    },

    saveFrontEndRegistrationGuidanceCategory: (platformObjId, categoryName, categoryObjId, displayFormat) => {
        if (categoryObjId && categoryName){
            return dbConfig.collection_frontEndRegistrationGuidanceCategory.findOneAndUpdate({_id: ObjectId(categoryObjId)}, {categoryName: categoryName, displayFormat: displayFormat}, {new: true}).lean();
        }
        else if (platformObjId && categoryName){
            let dataObj ={
                platformObjId: ObjectId(platformObjId),
                categoryName: categoryName,
                displayFormat: displayFormat
            };
            let record = new dbConfig.collection_frontEndRegistrationGuidanceCategory(dataObj);
            return record.save();
        }
    },

    getRegistrationGuidanceCategory: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndRegistrationGuidanceCategory.find({platformObjId: ObjectId(platformObjId), status: 1}).lean();
        }

        return prom;
    },

    updateScriptSetting: (dataList, deletedList) => {
        let prom = [];
        if (dataList && dataList.length){
            dataList.forEach(
                data => {
                    if (data && data._id){
                        let updateQuery = {
                            title: data.title || null,
                            instructions: data.instructions || null,
                            isVisible: data.isVisible
                        };
                        prom.push(getAndUpdateScriptSetting (ObjectId(data._id), updateQuery))
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
                        prom.push(getAndUpdateScriptSetting (ObjectId(data), updateQuery))
                    }
                }
            )
        }

        return Promise.all(prom);

        function getAndUpdateScriptSetting (eventObjectId, updateQuery) {
            return dbConfig.collection_frontEndScriptDescription.findOneAndUpdate({_id: eventObjectId}, updateQuery).lean();
        }
    },

    saveFrontEndScriptSetting: (data) => {
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
                return dbConfig.collection_frontEndScriptDescription.findOneAndUpdate({_id: ObjectId(eventObjId)}, data).lean();
            } else {
                let record = new dbConfig.collection_frontEndScriptDescription(data);
                return record.save();
            }
        }
    },

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

    saveFrontEndRewardCategory: (platformObjId, categoryName, categoryObjId, displayFormat) => {
        if (categoryObjId && categoryName){
            return dbConfig.collection_frontEndRewardCategory.findOneAndUpdate({_id: ObjectId(categoryObjId)}, {categoryName: categoryName, displayFormat: displayFormat}, {new: true}).lean();
        }
        else if (platformObjId && categoryName){
            let dataObj ={
                platformObjId: ObjectId(platformObjId),
                categoryName: categoryName,
                displayFormat: displayFormat
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
                            orderNumber: data.orderNumber || 1,
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
                            device: data.device,
                        };

                        if (data && data.displayOrder) {
                            updateQuery.displayOrder = data.displayOrder;
                        }
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

    updateFrontEndGameSetting: (dataList, deletedList) => {
        let prom = [];
        if (dataList && dataList.length){
            dataList.forEach(
                data => {
                    if (data && data._id){
                        let updateQuery = {
                            device: data.device,
                            displayOrder: data.displayOrder || 1,
                        };
                        prom.push(getAndUpdateGameSetting (ObjectId(data._id), updateQuery))
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
                        prom.push(getAndUpdateGameSetting (ObjectId(data), updateQuery))
                    }
                }
            )
        }

        return Promise.all(prom);

        function getAndUpdateGameSetting (eventObjectId, updateQuery) {
            return dbConfig.collection_frontEndGameSetting.findOneAndUpdate({_id: eventObjectId}, updateQuery).lean();
        }
    },

    getFrontEndGameSettingByObjId: (gameSettingObjId) => {
        if (gameSettingObjId){
            return dbConfig.collection_frontEndGameSetting.findOne({_id: ObjectId(gameSettingObjId)}).lean();
        }
    },

    saveFrontEndGameSetting: (gameSettingObj) => {
        if (gameSettingObj && gameSettingObj._id){
            let dataObjId = gameSettingObj._id;
            delete gameSettingObj._id;

            if (gameSettingObj.hasOwnProperty('__v')){
                delete gameSettingObj.__v;
            }
            return dbConfig.collection_frontEndGameSetting.findOneAndUpdate(
                {_id: dataObjId},
                gameSettingObj,
                {new: true});
        }
        else{
            let record = new dbConfig.collection_frontEndGameSetting(gameSettingObj);
            return record.save();
        }
    },

    getFrontEndGameSetting: (platformObjId) => {
        if (platformObjId){
            return dbConfig.collection_frontEndGameSetting.find({platformObjId: ObjectId(platformObjId), status: 1}).sort({displayOrder: 1}).lean();
        }
    },

    getFrontEndPopUpAdvertisementSetting: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndPopUpAdvertisementSetting.find({platformObjId: ObjectId(platformObjId), status: 1, device: {$exists: true}}).sort({displayOrder: 1}).lean();
        }

        return prom;
    },

    getFrontEndScriptSetting: (platformObjId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            prom = dbConfig.collection_frontEndScriptDescription.find({platformObjId: ObjectId(platformObjId), status: 1}).lean();
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

        if (data.subPlatformId){
            newSetting.subPlatformId = data.subPlatformId;
        }

        let record = new dbConfig.collection_frontEndPartnerSkinSetting(newSetting);
        return record.save();
    },

    getSkinSetting: (platformObjId) => {
        return dbConfig.collection_frontEndSkinSetting.find({platformObjId: ObjectId(platformObjId)}).lean();
    },

    getPartnerSkinSetting: (platformObjId, subPlatformId) => {
        let query = {
            platformObjId: ObjectId(platformObjId)
        }

        if (subPlatformId && subPlatformId != ""){
            query.subPlatformId = Number(subPlatformId);
        }
        else{
            query.subPlatformId = {$exists: false};
        }
        return dbConfig.collection_frontEndPartnerSkinSetting.find(query).lean();
    },

    removeSkinSetting: (skinSettingObjId) => {
        return dbConfig.collection_frontEndSkinSetting.remove({_id: ObjectId(skinSettingObjId)}).exec();
    },

    removePartnerSkinSetting: (skinSettingObjId) => {
        return dbConfig.collection_frontEndPartnerSkinSetting.remove({_id: ObjectId(skinSettingObjId)}).lean();
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

            if (data.subPlatformId){
                delete data.subPlatformId;
            }
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

    getPartnerUrlConfig: (platformObjId, subPlatformId) => {
        let query = {
            platformObjId: ObjectId(platformObjId)
        }

        if (subPlatformId && subPlatformId != ""){
            query.subPlatformId = Number(subPlatformId);
        }
        else{
            query.subPlatformId = {$exists: false};
        }
        return dbConfig.collection_frontEndPartnerUrlConfiguration.findOne(query).lean();
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

                if (data.subPlatformId){
                    delete data.subPlatformId;
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

    getCarouselSetting: (platformObjId, isPartner, subPlatformId) => {
        let prom =  Promise.resolve();
        if (platformObjId){
            let query = {
                platformObjId: ObjectId(platformObjId),
                status: 1
            };

            if (subPlatformId && subPlatformId != ""){
                query.subPlatformId = Number(subPlatformId);
            }
            else{
                query.subPlatformId = {$exists: false}
            }
            if (isPartner){
                prom = dbConfig.collection_frontEndPartnerCarouselConfiguration.find(query).sort({displayOrder: 1}).lean();
            }
            else{
                prom = dbConfig.collection_frontEndCarouselConfiguration.find(query).sort({displayOrder: 1}).lean();
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

    savePopUpInFirstPageSetting: async (data) => {
        if (data){
            if (data._id){
                let eventObjId = data._id;
                delete data._id;
                if (data.$$hashKey) {
                    delete data.$$hashKey;
                }
                if(data.hasOwnProperty("__v")){
                    delete data.__v;
                }
                return dbConfig.collection_frontEndPopUpSetting.findOneAndUpdate({_id: ObjectId(eventObjId)}, data, {new: true}).lean();
            }
            else{
                let record = new dbConfig.collection_frontEndPopUpSetting(data);
                return record.save();
            }
        }
    },
};

module.exports = dbFrontEndSetting;