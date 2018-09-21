var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbUtility = require('./../modules/dbutility');
var errorUtils = require("./../modules/errorUtils.js");
const ObjectId = mongoose.Types.ObjectId;

var dbThemeControl = {

    saveThemeSetting: function (data) {

        var themeSetting = new dbconfig.collection_themeSetting(data);
        return themeSetting.save();
    },

    getAllThemeSetting: function(){
        return dbconfig.collection_themeSetting.find({}).lean();
    },

    updateThemeSetting: function(data){

        let queryObj = {};
        let updateObj;

        if (!data || !data.updateData){
            return Promise.reject({
                name: "DataError",
                message: "data is not found"
            })
        }

        let updateProm = [];

        if(data.updateData.length > 0){
            data.updateData.forEach(
                item => {
                    if (item._id){
                        queryObj._id = ObjectId(item._id)
                        delete item._id;
                    }
                    else{
                        return Promise.reject({
                            name: "DataError",
                            message: "_id is not found"
                        })
                    }

                    updateObj = item;

                    updateProm.push(dbconfig.collection_themeSetting.findOneAndUpdate(queryObj, updateObj, {new: true}).lean());
                }
            )
        }

        return Promise.all(updateProm).then(
            retData => {

                if (data.deletedThemeStyleIds && data.deletedThemeStyleIds.length > 0){
                    let deleteProm = [];
                    data.deletedThemeStyleIds.forEach(
                        id =>{
                            deleteProm.push(dbconfig.collection_themeSetting.remove({_id: ObjectId(id)}))
                        }
                    );

                    return Promise.all(deleteProm);
                }
                else{
                    return retData;
                }
            }
        );
    },

    deleteThemeSetting: function(data){
        return dbconfig.collection_themeSetting.remove(data).lean();
    },

    checkThemeSettingFromPlatform: function(data){

        let query = {};
        if (data.type == 'player'){
            if (data._id){
                query['playerThemeSetting.themeStyleId'] = data._id;
            }
            if (data.themeId){
                query['playerThemeSetting.themeId'] = data.themeId;
            }
            return dbconfig.collection_platform.find(query,{platformId: 1, name: 1, playerThemeSetting: 1}).populate({path: "playerThemeSetting.themeStyleId", model: dbconfig.collection_themeSetting}).lean();
        }
        else if(data.type == 'partner'){
            if (data._id){
                query['partnerThemeSetting.themeStyleId'] = data._id;
            }
            if (data.themeId){
                query['partnerThemeSetting.themeId'] = data.themeId;
            }
            return dbconfig.collection_platform.find(query,{platformId: 1, name: 1, partnerThemeSetting: 1}).populate({path: "partnerThemeSetting.themeStyleId", model: dbconfig.collection_themeSetting}).lean();

        }
        else{
            return Promise.reject({
                name: "DataError",
                message: "type is not found"
            })
        }


    },


};

module.exports = dbThemeControl;