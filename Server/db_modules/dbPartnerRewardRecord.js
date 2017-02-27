/**
 * Created by hninpwinttin on 1/2/16.
 */
var dbconfig = require('./../modules/dbproperties');

var dbPartnerRewardRecord = {


    /**
     * Create a the information of a partner summary of the week
     * @param {json} data - The data of the partner user's level. Refer to PartnerLevel schema.
     */
    createPartnerRewardRecord: function (partnerRewardRecordData) {
        var partnerRewardRecord = new dbconfig.collection_partnerRewardRecord(partnerRewardRecordData);
        return partnerRewardRecord.save();
    },
    /**
     * Get the information of a partner reward Record by  _id
     * @param {String} query - Query string
     */
    getPartnerWeekSummary: function (query) {
        return dbconfig.collection_partnerRewardRecord.findOne(query).exec();
    }

};
module.exports = dbPartnerRewardRecord;