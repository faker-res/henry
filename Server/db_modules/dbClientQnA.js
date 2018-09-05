'use strict';

var dbClientQnAFunc = function () {
};
module.exports = new dbClientQnAFunc();

const dbutility = require('./../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbconfig = require('./../modules/dbproperties');
const dbProposal = require('./../db_modules/dbProposal');
const constClientQnA = require('./../const/constClientQnA');
const constServerCode = require('./../const/constServerCode');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalType = require('../const/constProposalType');
const errorUtils = require('../modules/errorUtils');
const localization = require("../modules/localization");
const pmsAPI = require('../externalAPI/pmsAPI');
const Q = require("q");

var dbClientQnA = {
    //region forgot password
    getClientQnASecurityQuesConfig: function (type, platformObjId) {
        platformObjId = ObjectId(platformObjId);
        let securityQuesProm = dbconfig.collection_clientQnATemplate.findOne({type: type, isSecurityQuestion: true}).lean();
        let templateConfigProm = dbconfig.collection_clientQnATemplateConfig.findOne({type: type, platform: platformObjId}).lean();
        return Promise.all([securityQuesProm,templateConfigProm])

    },

    editClientQnAConfig: function (type, platformObjId, updateObj) {
        platformObjId = ObjectId(platformObjId);
        let updateData = {};
        if (updateObj && updateObj.hasOwnProperty("minQuestionPass")) {
            updateData.minQuestionPass = updateObj.minQuestionPass;
        }
        if (updateObj && updateObj.hasOwnProperty("wrongCount")) {
            updateData.wrongCount = updateObj.wrongCount;
        }
        if (updateObj && updateObj.hasOwnProperty("defaultPassword")) {
            updateData.defaultPassword = updateObj.defaultPassword;
        }
        return dbconfig.collection_clientQnATemplateConfig.findOneAndUpdate({
                type: type,
                platform: platformObjId
            },
            updateData, {upsert: true, new: true})
    },

    getClientQnAProcessStep: function (platformObjId, type, processNo, inputDataObj, isAlternative) {
        platformObjId = ObjectId(platformObjId);
        let QnAQuery = {
            type: type
        }
        if (processNo) {
            processNo = String(processNo);
            QnAQuery.processNo = processNo;
        }
        return dbconfig.collection_clientQnATemplate.findOne(QnAQuery).sort({processNo: 1}).lean().then(
            QnATemplate => {
                if (!QnATemplate) {
                    return Q.reject({name: "DBError", message: "Cannot find QnA template"});
                }

                if (processNo) {
                    let actionString = "";
                    if (isAlternative && QnATemplate.alternativeQuestion && QnATemplate.alternativeQuestion.action) {
                        actionString = QnATemplate.alternativeQuestion.action;
                    } else if (QnATemplate.action) {
                        actionString = QnATemplate.action;
                    }
                    return dbClientQnA[actionString](platformObjId, inputDataObj);
                }

                return QnATemplate;
            }
        );
    },

    // save input data from each step
    updateClientQnAData: function (playerObjId, type, updateObj) {
        return dbconfig.collection_clientQnA.findOneAndUpdate(
            {
                playerObjId: playerObjId,
                type: type
            },
            updateObj,{upsert: true}).lean()
    },

    forgotPassword1_2: function () {
        let QnAQuery = {
            type: constClientQnA.FORGOT_PASSWORD,
            processNo: "2"
        }
        return dbconfig.collection_clientQnATemplate.findOne(QnAQuery).lean();
    },

    forgotPassword1: function (platformObjId, inputDataObj) {
        if (!(inputDataObj && inputDataObj.name)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        return dbconfig.collection_players.findOne({platform: platformObjId, name: inputDataObj.name}).lean().then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }

                let updateObj = {
                    QnAData: {name: inputDataObj.name}
                };
                dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.FORGOT_PASSWORD, updateObj).catch(errorUtils.reportError);

                if (playerData.phoneNumber) {
                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.FORGOT_PASSWORD,
                        processNo: "2_1"
                    }).lean();
                } else if (playerData.bankAccount) {
                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.FORGOT_PASSWORD,
                        processNo: "2_2"
                    }).lean()
                    //     .then(
                    //     QnATemplate => {
                    //         return pmsAPI.foundation_getProvinceList({});
                    //     }
                    // );
                } else {
                    return Promise.resolve({
                        clientQnAEnd: {
                            title: localization.localization.translate("Reset password failed"),
                            des: localization.localization.translate("Attention! This player does not bind phone number (or inconvenient to receive sms code), cannot verify bank card. Please contact customer service to reset password manually")
                        }
                    })
                }

            }
        )
        // let QnAQuery = {
        //     type: constClientQnA.FORGOT_PASSWORD,
        //     processNo: "2"
        // }
        // return dbconfig.collection_clientQnATemplate.findOne(QnAQuery).lean();

    },
    //endregion

    //region forgotUserID
    //endregion

    //region updatePhoneNumber
    //endregion

    //region editBankCard
    //endregion

    //region editName
    //endregion
};

var proto = dbClientQnAFunc.prototype;
proto = Object.assign(proto, dbClientQnA);

// This make WebStorm navigation work
module.exports = dbClientQnA;
