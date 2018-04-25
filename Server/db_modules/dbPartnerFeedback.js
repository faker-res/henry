let dbconfig = require('./../modules/dbproperties');
let Q = require("q");
let SettlementBalancer = require('../settlementModule/settlementBalancer');
let moment = require('moment-timezone');
let constSystemParam = require('../const/constSystemParam');
let mongoose = require('mongoose');
let constPartnerFeedbackResult = require('./../const/constPartnerFeedbackResult');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;

let dbPartnerFeedback = {

    /**
     * Create a new partner feedback
     * @param {json} partnerFeedbackData - The data of the partner feedback. Refer to partnerFeedback schema.
     */
    createPartnerFeedback: function (partnerFeedbackData) {
        //increase partner feedback count
        let deferred = Q.defer();
        let partnerFeedback = new dbconfig.collection_partnerFeedback(partnerFeedbackData);
        let feedbackProm = partnerFeedback.save();

        let noMoreFeedback = partnerFeedbackData.result === constPartnerFeedbackResult.LAST_CALL ? true : false;
        let partnerProm = dbconfig.collection_partner.findOneAndUpdate(
            {_id: partnerFeedbackData.partnerId, platform: partnerFeedbackData.platform},
            {$inc: {feedbackTimes: 1}, lastFeedbackTime: partnerFeedbackData.createTime, noMoreFeedback: noMoreFeedback}
        );

        Q.all([feedbackProm, partnerProm]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    deferred.resolve(data[0]);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create partner feedback."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating partner feedback.", error: error});
            }
        );

        return deferred.promise;
    },

    getPartnerFeedbackReport: function (query, index, limit, sortCol) {
        sortCol = sortCol || {createTime: -1};
        index = index || 0;
        limit = Math.min(limit, constSystemParam.REPORT_MAX_RECORD_NUM);

        if (query.startTime && query.endTime) {
            query.createTime = {$gte: query.startTime, $lt: query.endTime};
            delete  query.startTime;
            delete  query.endTime;
        }
        return Q.resolve().then(data => {
            if (query.playerName) {
                return dbconfig.collection_players.findOne({name: query.playerName, platform: query.platform}).then(
                    player => {
                        if (player) {
                            query.partnerId = player._id;
                            // query.platform = query.platform;
                            delete  query.playerName;
                            return query;
                        } else {
                            return {unknown: false}
                        }
                    }
                )
            } else {
                return query;
            }
        }).then(queryData => {
            let a = dbconfig.collection_partnerFeedback.find(queryData)
                .sort(sortCol).skip(index).limit(limit)
                .populate({path: "partnerId", model: dbconfig.collection_players})
                .populate({path: "adminId", model: dbconfig.collection_admin}).exec();
            let b = dbconfig.collection_partnerFeedback.find(queryData).count();
            return Q.all([a, b]);
        }).then(
            data => {
                return {data: data[0], size: data[1]}
            }
        )
    },


//PartnerFeedbackResult
    /**
     * Create a new PartnerFeedbackResult
     * @param {json} partnerFeedbackResultData - The data of the PartnerFeedbackResult. Refer to PartnerFeedbackResult schema.
     */
    createPartnerFeedbackResult: function (partnerFeedbackResultData) {
        let partnerFeedbackResult = new dbconfig.collection_partnerFeedbackResult(partnerFeedbackResultData);
        return partnerFeedbackResult.save();
    },

    /**
     * Update a PartnerFeedbackResult information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePartnerFeedbackResult: function (query, updateData) {
        return dbconfig.collection_partnerFeedbackResult.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PartnerFeedbackResult information
     * @param {String}  query - The query string
     */
    getPartnerFeedbackResult: function (query) {
        return dbconfig.collection_partnerFeedbackResult.find(query);
    },

    /**
     * Delete PartnerFeedbackResult information
     * @param {String} partnerFeedbackResultObjId - ObjectId of the PartnerFeedbackResult
     */
    deletePartnerFeedbackResult: function (partnerFeedbackResultObjId) {
        return dbconfig.collection_partnerFeedbackResult.remove({_id: partnerFeedbackResultObjId});
    },

    /**
     * Get the information of all the partner feedback results
     */
    getAllPartnerFeedbackResults: function () {
        return dbconfig.collection_partnerFeedbackResult.find().exec();
    },


//PartnerFeedbackTopic
    /**
     * Create a new PartnerFeedbackTopic
     * @param {json} partnerFeedbackTopicData - The data of the PartnerFeedbackTopic. Refer to PartnerFeedbackTopic schema.
     */
    createPartnerFeedbackTopic: function (partnerFeedbackTopicData) {
        let partnerFeedbackTopic = new dbconfig.collection_partnerFeedbackTopic(partnerFeedbackTopicData);
        return partnerFeedbackTopic.save();
    },

    /**
     * Update a PartnerFeedbackTopic information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePartnerFeedbackTopic: function (query, updateData) {
        return dbconfig.collection_partnerFeedbackTopic.findOneAndUpdate(query, updateData);
    },

    /**
     * Get PartnerFeedbackTopic information
     * @param {String}  query - The query string
     */
    getPartnerFeedbackTopic: function (query) {
        return dbconfig.collection_partnerFeedbackTopic.find(query);
    },

    /**
     * Delete PartnerFeedbackTopic information
     * @param {String} partnerFeedbackTopicObjId - ObjectId of the PartnerFeedbackTopic
     */
    deletePartnerFeedbackTopic: function (partnerFeedbackTopicObjId) {
        return dbconfig.collection_partnerFeedbackTopic.remove({_id: partnerFeedbackTopicObjId});
    },

    /**
     * Get the information of all the partner feedback topics
     */
    getAllPartnerFeedbackTopics: function () {
        return dbconfig.collection_partnerFeedbackTopic.find().exec();
    },
};

module.exports = dbPartnerFeedback;