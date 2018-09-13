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

    getAllThemeSetting: function(data){
        return dbconfig.collection_themeSetting.find(data).lean();
    },

    updateThemeSetting: function(data){

        let queryObj = {};
        let updateObj;

        if (!data){
            return Promise.reject({
                name: "DataError",
                message: "data is not found"
            })
        }

        let updateProm = [];

        if(data.length > 0){
            data.forEach(
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

        return Promise.all(updateProm);
    },

    deleteThemeSetting: function(data){
        return dbconfig.collection_themeSetting.remove(data).lean();
    },


};

module.exports = dbThemeControl;