'use strict';

var dbClientQnAFunc = function () {
};
module.exports = new dbClientQnAFunc();

const dbutility = require('./../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbconfig = require('./../modules/dbproperties');
const dbPlayerMail = require('./../db_modules/dbPlayerMail');
const dbProposal = require('./../db_modules/dbProposal');
const constClientQnA = require('./../const/constClientQnA');
const constServerCode = require('./../const/constServerCode');
const constSMSPurpose = require('./../const/constSMSPurpose');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalType = require('../const/constProposalType');
const errorUtils = require('../modules/errorUtils');
const localization = require("../modules/localization");
const pmsAPI = require('../externalAPI/pmsAPI');
const Q = require("q");
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const rsaCrypto = require("../modules/rsaCrypto");

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

    sendSMSVerificationCode: function (clientQnAData, purpose) {
        let smsCode = dbutility.generateRandomPositiveNumber(1000, 9999);

        if (clientQnAData && clientQnAData.QnAData && clientQnAData.QnAData.playerId && clientQnAData.QnAData.platformId) {
            if (clientQnAData.type) {
                let updObj = {
                    $set: {
                        'QnAData.smsCode': smsCode
                    }
                };

                if (clientQnAData && clientQnAData.QnAData && !clientQnAData.QnAData.smsCount) {
                    updObj.$set['QnAData.smsCount'] = 1;
                    updObj.$set['QnAData.firstSMSTime'] = new Date();
                } else {
                    updObj.$inc = {'QnAData.smsCount': 1};
                }

                return dbClientQnA.updateClientQnAData(null, clientQnAData.type, updObj, clientQnAData._id).then(
                    dbPlayerMail.sendVerificationCodeToPlayer(clientQnAData.QnAData.playerId, smsCode, clientQnAData.QnAData.platformId, true, purpose, 0)
                );
            }
        }

        return Promise.resolve(false);
    },

    // return reject security question when show for the first time
    rejectSecurityQuestionFirstTime: function () {
        let endTitle = "Operation failed";
        let endDes = "Security question exceed maximum wrong count, this account has been banned from being modified automatically, please contact customer service";
        return dbClientQnA.qnaEndMessage(endTitle, endDes)
    },

    // return reject can't find user account
    rejectFailedRetrieveAccount: function () {
        let endTitle = "Failed to retrieve account.";
        let endDes = "Attention: Player has no binded phone number or not able to receive SMS code. Please open a new account if necessary.";
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
    forgotUserID1_1: function (platformObjId, inputDataObj) {
        let playerData, clientQnAData;

        if (!(inputDataObj && inputDataObj.phoneNumber)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        return dbconfig.collection_players.findOne({
            platform: platformObjId,
            phoneNumber: rsaCrypto.encrypt(inputDataObj.phoneNumber)
        }, '_id platform playerId').populate({
            path: "platform",
            model: dbconfig.collection_platform,
            select: {platformId: 1}
        }).lean().then(
            player => {
                if (player && player._id) {
                    playerData = player;

                    let updateObj = {
                        QnAData: {
                            playerId: playerData.playerId,
                            phoneNumber: inputDataObj.phoneNumber,
                        }
                    };

                    if (playerData.platform && playerData.platform.platformId) {
                        updateObj.QnAData.platformId = playerData.platform.platformId;
                    }

                    return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.FORGOT_USER_ID, updateObj)
                } else {
                    throw new Error('Player not found');
                }
            }
        ).then(
            clientQnA => {
                if (!clientQnA) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }

                clientQnAData = clientQnA;

                // Send verification code
                dbClientQnA.sendSMSVerificationCode(clientQnAData, constSMSPurpose.AUTOQA_FORGOT_USER_ID)
                    .catch(errorUtils.reportError);

                let processNo = '2_1';

                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.FORGOT_USER_ID,
                    processNo: processNo
                }).lean();
            }
        ).then(
            QnATemplate => {
                if (QnATemplate) {
                    QnATemplate.qnaObjId = clientQnAData._id;
                }
                return QnATemplate;
            }
        ).catch(
            error => {
                return dbClientQnA.rejectFailedRetrieveAccount();
            }
        )
    },

    forgotUserID2_1: function (platformObjId, inputDataObj) {

    },

    resendSMSVerificationCode: function (platformObjId, inputDataObj, qnaObjId) {
        return dbconfig.collection_clientQnA.findById(qnaObjId).lean().then(
            qnaObj => {
                // Check player send count
                if (qnaObj && qnaObj.QnAData && qnaObj.QnAData.smsCount && qnaObj.QnAData.smsCount >= 5) {
                    return dbClientQnA.rejectFailedRetrieveAccount();
                } else {
                    dbClientQnA.sendSMSVerificationCode(qnaObj, constSMSPurpose.AUTOQA_FORGOT_USER_ID);
                }
            }
        );
    },
    //endregion

    //region updatePhoneNumber
    updatePhoneNumber1: function(platformObjId, inputDataObj){
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
                return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.UPDATE_PHONE, updateObj).then(
                    clientQnAData => {
                        if (!clientQnAData) {
                            return Promise.reject({name: "DBError", message: "update QnA data failed"})
                        }

                        if (playerData.phoneNumber) {
                            let processNo;
                            if (playerData.phoneNumber) {
                                processNo = "2_1";
                            }
                            return dbconfig.collection_clientQnATemplate.findOne({
                                type: constClientQnA.UPDATE_PHONE,
                                processNo: processNo
                            }).lean().then(
                                QnATemplate => {
                                    if (QnATemplate) {
                                        QnATemplate.qnaObjId = clientQnAData._id;
                                    }
                                    if (QnATemplate && QnATemplate.isSecurityQuestion) {
                                        return dbconfig.collection_clientQnATemplateConfig.findOne({
                                            type: constClientQnA.UPDATE_PHONE,
                                            platform: platformObjId}).lean().then(
                                            configData=> {
                                                if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") &&  clientQnAData.totalWrongCount > configData.wrongCount) {
                                                    return dbClientQnA.rejectSecurityQuestionFirstTime()
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
                            let endTitle = "Update Phone failed";
                            let endDes = "Attention! This player does not bind phone number (or inconvenient to receive sms code), cannot verify bank card. Please contact customer service to reset password manually";
                            return dbClientQnA.qnaEndMessage(endTitle, endDes)
                        }
                    });
            }
        )
    },

    updatePhoneNumber2_1: function (platformObjId, inputDataObj, qnaObjId) {
      
        if (!(inputDataObj && inputDataObj.phoneNumber)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }


        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
        clientQnA=>{

            if (!clientQnA) {
                return Promise.reject({name: "DBError", message: "update QnA data failed"})
            }
            let clientQnAData = clientQnA;
            // Send verification code
            dbClientQnA.sendSMSVerificationCode(clientQnAData, constSMSPurpose.OLD_PHONE_NUMBER)
                .catch(errorUtils.reportError);

            let processNo = '3_1';

            return dbconfig.collection_clientQnATemplate.findOne({
                type: constClientQnA.UPDATE_PHONE,
                processNo: processNo
            }).lean().then(
                QnATemplate => {
                    if (QnATemplate) {
                        QnATemplate.qnaObjId = clientQnAData._id;
                    }
                    if (QnATemplate && QnATemplate.isSecurityQuestion) {
                        return dbconfig.collection_clientQnATemplateConfig.findOne({
                            type: constClientQnA.UPDATE_PHONE,
                            platform: platformObjId}).lean().then(
                            configData=> {
                                if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") &&  clientQnAData.totalWrongCount > configData.wrongCount) {
                                    return dbClientQnA.rejectSecurityQuestionFirstTime()
                                } else {
                                    return QnATemplate;
                                }
                            }
                        )
                    }
                    return QnATemplate;
                }
            );
        })
    },
    updatePhoneNumber3_1: function (platformObjId, inputDataObj, qnaObjId) {


    },
    //endregion

    //region editBankCard
    //endregion

    //region editName
    editName1: function (platformObjId, inputDataObj) {
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
                return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.EDIT_NAME, updateObj).then(
                    clientQnAData => {
                        if (!clientQnAData) {
                            return Promise.reject({name: "DBError", message: "update QnA data failed"})
                        }

                        if (playerData.phoneNumber) {
                            return dbconfig.collection_clientQnATemplate.findOne({
                                type: constClientQnA.EDIT_NAME,
                                processNo: "2"
                            }).lean().then( QnATemplate => {
                                if (QnATemplate){
                                    // QnATemplate.playerName = inputDataObj.name;
                                    QnATemplate.qnaObjId = clientQnAData._id;
                                }

                                return QnATemplate;
                            })
                        } else {
                            let endTitle = "Edit name failed";
                            let endDes = "Attention! This player does not have the registered phone number (or inconvenient to receive sms code). Please contact customer service to change the name manually";
                            return dbClientQnA.qnaEndMessage(endTitle, endDes);
                        }
                    }
                )
            }
        )
    },

    editName2: function (platformObjId, inputDataObj, qnaObjId, type) {
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        if (!inputDataObj || !inputDataObj.phoneNumber){
            return Promise.reject({name: "DBError", message: "Phone number is not available"})
        }
        let playerObjId = null;
        let validateBoolean = true;

        return dbconfig.collection_clientQnATemplateConfig.findOne({type: type, platform: platformObjId}).lean().then(
            QnAConfig => {

                if (!QnAConfig) {
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
                    clientQnAData => {
                        if (clientQnAData){
                            return clientQnAData
                        }
                        else{
                            return Promise.reject({name: "DBError", message: "Could not find the QnA data"})
                        }
                    }
                ).then( retData => {
                    if (retData && retData.playerObjId){

                        if (retData.hasOwnProperty("totalWrongCount") && retData.totalWrongCount > QnAConfig.wrongCount){
                            let endTitle = "Authentification Failed";
                            let endDes = "Attention! Contact CS for further instruction";
                            return dbClientQnA.qnaEndMessage(endTitle, endDes);
                        }

                        return dbconfig.collection_players.findOne({platform: platformObjId, _id: retData.playerObjId}).lean().then(
                            playerData => {

                                if (!playerData) {
                                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                                }

                                let updateObj = {};

                                if (inputDataObj.phoneNumber == playerData.phoneNumber){
                                    retData.QnAData.phoneNumber = rsaCrypto.encrypt(playerData.phoneNumber);

                                    updateObj.QnAData =retData.QnAData;
                                    // reset the wrongCount when succuess
                                    updateObj.totalWrongCount = 0;

                                    // send sms
                                }
                                else{
                                    updateObj.totalWrongCount = retData.totalWrongCount ? retData.totalWrongCount + 1: 1;
                                    validateBoolean = false;
                                }

                                return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.EDIT_NAME, updateObj).then(
                                    clientQnARecord => {
                                        if (!clientQnARecord) {
                                            return Promise.reject({name: "DBError", message: "update QnA data failed"})
                                        }

                                        if(!validateBoolean){
                                            return Promise.reject({name: "DataError", message: "The phone number is not matched with the registered phone number"})
                                        }
                                        else{
                                            return dbconfig.collection_clientQnATemplate.findOne({
                                                type: constClientQnA.EDIT_NAME,
                                                processNo: "3"
                                            }).lean().then(QnATemplate => {
                                                if (QnATemplate) {
                                                    QnATemplate.qnaObjId = clientQnARecord._id;
                                                }

                                                return QnATemplate;
                                            })
                                        }

                                    }
                                )}
                        )
                    }
                })


            }
        )
    },

    editName4_2: function(platformObjId, inputDataObj, qnaObjId){
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        let playerObjId = null;

        return dbconfig.collection_clientQnATemplateConfig.findOne({type: constClientQnA.EDIT_NAME, platform: platformObjId}).lean().then(
            QnAConfig => {

                if (!QnAConfig) {
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
                    clientQnAData => {
                        if (clientQnAData){
                            if (clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > QnAConfig.wrongCount){
                                let endTitle = "Authentification Failed";
                                let endDes = "Attention! Contact CS for further instruction";
                                return dbClientQnA.qnaEndMessage(endTitle, endDes);
                            }

                            // reset the wrongCount
                            return dbClientQnA.updateClientQnAData(qnaObjId, constClientQnA.EDIT_NAME, {totalWrongCount: 0}).then(
                                () => {
                                    return dbconfig.collection_clientQnATemplate.findOne({
                                        type: constClientQnA.EDIT_NAME,
                                        processNo: "4_2"
                                    }).lean().then(QnATemplate => {
                                        if (QnATemplate) {
                                            QnATemplate.qnaObjId = clientQnAData._id;
                                        }

                                        return QnATemplate;
                                    })
                                }
                            )
                        }
                        else{
                            return Promise.reject({name: "DBError", message: "Could not find the QnA data"})
                        }
                    }
                )
            }
        )
    },

    editName3: function (platformObjId, inputDataObj, qnaObjId, type){

    },
    //endregion
};

var proto = dbClientQnAFunc.prototype;
proto = Object.assign(proto, dbClientQnA);

// This make WebStorm navigation work
module.exports = dbClientQnA;
