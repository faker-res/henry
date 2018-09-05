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

    /**
     * getClientQnAProcessStep
     * @param qnaObjId = objId for clientQnA.js - pass this ID throughout whole process to retrieve data from db
     */
    getClientQnAProcessStep: function (platformObjId, type, processNo, inputDataObj, isAlternative, qnaObjId) {
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
                    return dbClientQnA[actionString](platformObjId, inputDataObj, qnaObjId);
                }

                return QnATemplate;
            }
        );
    },

    // save input data from each step
    updateClientQnAData: function (playerObjId, type, updateObj, qnaObjId) {
        if (!playerObjId && !qnaObjId) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        let qnaQuery = {
            type: type
        }
        if (playerObjId) {
            qnaQuery.playerObjId = ObjectId(playerObjId);
        } else if (qnaObjId) {
            qnaQuery._id = ObjectId(qnaObjId);
        }
        return dbconfig.collection_clientQnA.findOneAndUpdate(qnaQuery, updateObj,{upsert: true, new: true}).lean();
    },

    // determine which answer is wrong (return this function if security question does not pass)
    securityQuestionReject: function (qnaObjId, correctQuesArr, incorrectQuesArr) {
        let returnObj = {
            correctAns: correctQuesArr,
            incorrectAns: incorrectQuesArr
        }
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).then(
            clientQnAData => {
                if (clientQnAData) {
                    returnObj.totalWrongCount = clientQnAData.totalWrongCount
                }
                return Promise.reject(returnObj)
            });
    },

    // return qna end message
    qnaEndMessage: function (title, des) {
        return Promise.resolve({
            clientQnAEnd: {
                title: localization.localization.translate(title),
                des: localization.localization.translate(des)
            }
        })
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
                return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.FORGOT_PASSWORD, updateObj).then(
                    clientQnAData => {
                        if (!clientQnAData) {
                            return Promise.reject({name: "DBError", message: "update QnA data failed"})
                        }

                        if (playerData.phoneNumber || playerData.bankAccount) {
                            let processNo;
                            if (playerData.phoneNumber) {
                                processNo = "2_1";
                            } else if (playerData.bankAccount) {
                                processNo = "2_2";
                            }
                            return dbconfig.collection_clientQnATemplate.findOne({
                                type: constClientQnA.FORGOT_PASSWORD,
                                processNo: processNo
                            }).lean().then(
                                QnATemplate => {
                                    if (QnATemplate) {
                                        QnATemplate.qnaObjId = clientQnAData._id;
                                    }
                                    return QnATemplate;
                                }
                            );
                        } else {
                            let endTitle = "Reset password failed";
                            let endDes = "Attention! This player does not bind phone number (or inconvenient to receive sms code), cannot verify bank card. Please contact customer service to reset password manually";
                            return dbClientQnA.qnaEndMessage(endTitle, endDes)
                        }
                    });
            }
        )
    },

    forgotPassword2_2: function (platformObjId, inputDataObj, qnaObjId) {
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

       return dbClientQnA.securityQuestionReject(qnaObjId, [1,2],[3,4]);//test only - incomplete
    }
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
