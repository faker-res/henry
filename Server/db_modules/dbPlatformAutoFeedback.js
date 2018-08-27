var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var SettlementBalancer = require('../settlementModule/settlementBalancer');
var moment = require('moment-timezone');
var constSystemParam = require('../const/constSystemParam');
var mongoose = require('mongoose');
const dbutility = require('./../modules/dbutility');
const dbProposal = require('./../db_modules/dbProposal');
const constPlayerFeedbackResult = require('./../const/constPlayerFeedbackResult');
const constProposalEntryType = require('./../const/constProposalEntryType');
const constProposalUserType = require('./../const/constProposalUserType');
const constProposalType = require ('./../const/constProposalType');
const constServerCode = require ('./../const/constServerCode');
const constProposalStatus = require ('./../const/constProposalStatus');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;

let dbPlatformAutoFeedback = {

    createAutoFeedback: function (autoFeedbackData) {
        console.log(autoFeedbackData);
        autoFeedbackData.enabled = autoFeedbackData.defaultStatus.toString().toLowerCase() === "active";
        return dbconfig.collection_autoFeedback(autoFeedbackData).save().then(
            data => {
                console.log(data);
                if(data) {
                    return JSON.parse(JSON.stringify(data));
                }
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error creating auto feedback.", error: error});
            }
        );
    },

    updateAutoFeedback: function (autoFeedbackData) {
        console.log(autoFeedbackData);
        return dbconfig.collection_autoFeedback.update(
            {
                _id: autoFeedbackData._id,
            },
            autoFeedbackData,
            {multi: true}
        ).then(
            data => {
                console.log(data);
                if(data) {
                    return JSON.parse(JSON.stringify(data));
                }
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error updating auto feedback.", error: error});
            }
        );
    },

    getAutoFeedback: function (query) {
        console.log(query);
        if(query.createTimeStart) {
            query.createTime = {$gte: query.createTimeStart};
            delete query.createTimeStart;
        }
        if(query.createTimeEnd) {
            query.createTime = {$lte: query.createTimeEnd};
            delete query.createTimeEnd;
        }
        console.log(query);
        return dbconfig.collection_autoFeedback.find(query).sort({createTime:-1}).lean().then(autoFeedbacks => {
            console.log(autoFeedbacks);
            return autoFeedbacks;
        });
    },

    executeAutoFeedback: function () {
        let query = {
            missionStartTime: {$lte: new Date()},
            missionEndTime: {$gte: new Date()},
            enabled: true,
        };
        return dbPlatformAutoFeedback.getAutoFeedback(query).then(autoFeedbacks => {
            autoFeedbacks.forEach(feedback => {
                let platformObjId = feedback.platformObjId;
                // let platformObjId = feedback.platformObjId;
            })
        })
    }
};

module.exports = dbPlatformAutoFeedback;
