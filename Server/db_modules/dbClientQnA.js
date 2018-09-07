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
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');

var dbClientQnA = {
    //region common function
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
    getClientQnAProcessStep: function (platformObjId, type, processNo, inputDataObj, isAlternative, qnaObjId, creator) {
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
                    return dbClientQnA[actionString](platformObjId, inputDataObj, qnaObjId, creator);
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
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnAData => {
                returnObj.totalWrongCount = clientQnAData && clientQnAData.totalWrongCount? clientQnAData.totalWrongCount: 0;
                return Promise.reject(returnObj)
            });
    },

    // return qna end message
    qnaEndMessage: function (title, des, isSuccess) {
        return Promise.resolve({
            clientQnAEnd: {
                title: localization.localization.translate(title),
                des: localization.localization.translate(des),
                isSuccess: isSuccess
            }
        })
    },

    // return reject security question when show for the first time
    rejectSecurityQuestionFirstTime: function () {
        let endTitle = "Operation failed";
        let endDes = "Security question exceed maximum wrong count, this account has been banned from being modified automatically, please contact customer service";
        return dbClientQnA.qnaEndMessage(endTitle, endDes)
    },
    //endregion

    //region forgot password
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
                                    if (QnATemplate && QnATemplate.isSecurityQuestion) {
                                        return dbconfig.collection_clientQnATemplateConfig.findOne({
                                            type: constClientQnA.FORGOT_PASSWORD,
                                            platform: platformObjId}).lean().then(
                                            configData=> {
                                                if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") &&  clientQnAData.totalWrongCount > configData.wrongCount) {
                                                    return dbClientQnA.rejectSecurityQuestionFirstTime();
                                                } else {
                                                    return QnATemplate;
                                                }
                                            }
                                        )
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

    forgotPassword2: function (platformObjId, inputDataObj, qnaObjId) {
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnAData => {
                if (!(clientQnAData && clientQnAData.playerObjId)) {
                    return Promise.reject({name: "DBError", message: "Cannot find clientQnA"})
                }

                return dbconfig.collection_players.findOne({_id: clientQnAData.playerObjId}).lean().then(
                    playerData => {
                        if (!playerData) {
                            return Promise.reject({name: "DBError", message: "Cannot find player"})
                        }

                        if (playerData.bankAccount) {
                            return dbconfig.collection_clientQnATemplateConfig.findOne({
                                type: constClientQnA.FORGOT_PASSWORD,
                                platform: platformObjId}).lean().then(
                                    configData => {
                                        if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > configData.wrongCount) {
                                            return dbClientQnA.rejectSecurityQuestionFirstTime();
                                        } else {
                                            return dbconfig.collection_clientQnATemplate.findOne({
                                                type: constClientQnA.FORGOT_PASSWORD,
                                                processNo: "2_2"
                                            }).lean();
                                        }
                                    })
                        } else {
                            let endTitle = "Reset password failed";
                            let endDes = "Attention! This player does not bind phone number (or inconvenient to receive sms code), cannot verify bank card. Please contact customer service to reset password manually";
                            return dbClientQnA.qnaEndMessage(endTitle, endDes)
                        }
                    }
                )
            });
    },

    forgotPassword2_2: function (platformObjId, inputDataObj, qnaObjId, creator) {
        if (!(inputDataObj && inputDataObj.bankAccount)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        let playerObj;
        let correctQues = [];
        let inCorrectQues = [];
        let updateObj = {};
        let clientQnAObj;
        let questionNo = {
            bankAccount: 1,
            bankAccountName: 2,
            bankCardCity: 3,
            bankName: 4
        };

        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnAData => {
                if (!(clientQnAData && clientQnAData.playerObjId)) {
                    return Promise.reject({name: "DBError", message: "Cannot find clientQnA"})
                }
                clientQnAObj = clientQnAData;
                return dbconfig.collection_players.findOne({_id: clientQnAData.playerObjId}).lean();
            }).then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }
                playerObj = playerData;
                if (playerData.bankAccount && playerData.bankAccount.slice(-4) == inputDataObj.bankAccount) {
                    correctQues.push(questionNo.bankAccount);
                    updateObj["QnAData.bankAccount"] = inputDataObj.bankAccount;
                } else {
                    inCorrectQues.push(questionNo.bankAccount);
                }

                if (playerData.bankAccountName && inputDataObj.bankCardName && playerData.bankAccountName == inputDataObj.bankCardName) {
                    correctQues.push(questionNo.bankAccountName);
                    updateObj["QnAData.bankCardName"] = inputDataObj.bankCardName;
                } else {
                    inCorrectQues.push(questionNo.bankAccountName);
                }

                if (playerData.bankAccountCity && inputDataObj.bankCardCity && playerData.bankAccountCity == inputDataObj.bankCardCity) {
                    correctQues.push(questionNo.bankCardCity);
                    updateObj["QnAData.bankCardCity"] = inputDataObj.bankCardCity;
                } else {
                    inCorrectQues.push(questionNo.bankCardCity);
                }

                if (playerData.bankName && inputDataObj.bankName && playerData.bankName == inputDataObj.bankName) {
                    correctQues.push(questionNo.bankName);
                    updateObj["QnAData.bankName"] = inputDataObj.bankName;
                } else {
                    inCorrectQues.push(questionNo.bankName);
                }

                return dbconfig.collection_clientQnATemplateConfig.findOne({
                    type: constClientQnA.FORGOT_PASSWORD,
                    platform: platformObjId
                }).lean();
            }).then(
            configData => {
                if (!configData) {
                    return Promise.reject({name: "DBError", message: "Cannot find QnA template config"});
                }

                let endTitle;
                let endDes;
                let isPass = false;

                if (correctQues && correctQues.length && configData.hasOwnProperty("minQuestionPass") &&
                    correctQues.length >= configData.minQuestionPass && correctQues.indexOf(questionNo.bankAccount) != -1) {
                    if (!configData.defaultPassword) {
                        return Promise.reject({name: "DBError", message: "Default password not found"});
                    }
                    let text1 =  localization.localization.translate("Your user ID");
                    let text2 =  localization.localization.translate("password has been reset to");
                    let text3 =  localization.localization.translate(", password will be send to your bound phone number, please enjoy your game!");
                    endTitle = "Reset password success";
                    endDes = text1 +" (" + playerObj.name + ") " + text2 + " {" + configData.defaultPassword + "} " + text3;
                    isPass = true;
                } else {
                    updateObj["$inc"] = {totalWrongCount: 1};
                }

                return dbClientQnA.updateClientQnAData(null, constClientQnA.FORGOT_PASSWORD, updateObj, qnaObjId).then(
                    updatedClientQnA => {
                        if (!updatedClientQnA) {
                            return Promise.reject({name: "DBError", message: "Update QnA data failed"})
                        }

                        if (!isPass && ((configData.wrongCount && updatedClientQnA.totalWrongCount <= configData.wrongCount) || !configData.wrongCount)) {
                            return dbClientQnA.securityQuestionReject(qnaObjId, correctQues, inCorrectQues);
                        }

                        if (isPass) {
                            dbPlayerInfo.resetPlayerPassword(clientQnAObj.playerObjId, configData.defaultPassword, platformObjId, false, null, creator, true).catch(errorUtils.reportError);
                        } else {
                            let text1 = localization.localization.translate("Attention! this player");
                            let text2 = localization.localization.translate("times failed security question, please contact customer service to verify this account.");
                            endTitle = "Reset password failed";
                            endDes = text1 + " (" + updatedClientQnA.totalWrongCount + ") " + text2;
                        }

                        return dbClientQnA.qnaEndMessage(endTitle, endDes, isPass);
                    });

            }
        );
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
