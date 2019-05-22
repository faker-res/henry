var dbConfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

var dbFrontEndSetting = {
    saveSkinSetting: (data) => {
        if (data){
            let newSetting = {
                platformObjId: ObjectId(data.platform),
                device: data.device,
                name: data.name,
                url: data.url
            };

            let record = new dbConfig.collection_frontEndSkinSetting(newSetting);
            return record.save();
        }
    },

    getSkinSetting: (platformObjId) => {
        return dbConfig.collection_frontEndSkinSetting.find({platformObjId: ObjectId(platformObjId)}).lean();
    },

    removeSkinSetting: (skinSettingObjId) => {
        return dbConfig.collection_frontEndSkinSetting.remove({_id: ObjectId(skinSettingObjId)}).exec();
    },
};

module.exports = dbFrontEndSetting;