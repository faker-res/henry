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
};

module.exports = dbPartnerFeedback;