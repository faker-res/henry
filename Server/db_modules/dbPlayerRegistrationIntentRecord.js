var dbconfig = require('./../modules/dbproperties');
var dbUtil = require('./../modules/dbutility');
var constShardKeys = require('../const/constShardKeys');
var constSystemParam = require('../const/constSystemParam');
var Q = require("q");

var dbPlayerRegistrationIntentRecord = {

    /**
     * create top up intent record
     * @param {Json} data
     */
    createPlayerRegistrationIntentRecordAPI: function (data) {
        var deferred = Q.defer();
        if (data && data.platformId) {
            dbconfig.collection_platform.findOne({platformId: data.platformId}).then(
                function (plat) {
                    if (plat && plat._id) {
                        data.platformId = plat._id;
                        deferred.resolve(dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecord(data));
                    } else {
                        deferred.reject({name: "DataError", message: "Platform does not exist"});
                    }
                },
                function (err) {
                    deferred.reject({name: "DataError", message: "Error in getting platform ID", error: err});
                }
            );
        } else {
            deferred.reject({name: "DataError", message: "Incomplete input data"});
        }
        return deferred.promise;
    },
    createPlayerRegistrationIntentRecord: function (data) {
        if(data){
            data.operationList=['Add registration intention'];
        }
        var newRecord = new dbconfig.collection_playerRegistrationIntentRecord(data);
        return newRecord.save();
    },

    /**
     * Update a playerRegIntentRecord information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerRegistrationIntentRecord: function (query, updateData) {
        if( query && query._id && query.creatTime ){
            return dbconfig.collection_playerRegistrationIntentRecord.findOneAndUpdate(query, updateData, {new: true});
        } else{
            return dbUtil.findOneAndUpdateForShard(
                dbconfig.collection_playerRegistrationIntentRecord,
                query, updateData,
                constShardKeys.collection_playerRegistrationIntentRecord
            )
        }
    },
    /**
     * Get playerRegIntentRecord information
     * @param {String}  query - The query string
     */
    getPlayerRegistrationIntentRecord: function (query) {
        var d = new Date(Date.now() - 60 * 60 * 1000);
        query.createTime = {$gt: d.toISOString()};
        return dbconfig.collection_playerRegistrationIntentRecord.find(query).sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM);

    },

    /**
     * Delete playerRegIntentRecord information
     * @param {String}  - ObjectId of the playerLoginRecord
     */
    deletePlayerRegistrationIntentRecord: function (playerRegIntentRecordId) {
        return dbconfig.collection_playerRegistrationIntentRecord.remove({_id: playerRegIntentRecordId});
    }

};

module.exports = dbPlayerRegistrationIntentRecord;
