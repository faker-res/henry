'use strict';

var dbClientQnAFunc = function () {
};
module.exports = new dbClientQnAFunc();

const dbutility = require('./../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbconfig = require('./../modules/dbproperties');

const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbPlayerMail = require('./../db_modules/dbPlayerMail');
const dbPlayerPartner = require('./../db_modules/dbPlayerPartner');
const dbProposal = require('./../db_modules/dbProposal');
const constClientQnA = require('./../const/constClientQnA');
const constServerCode = require('./../const/constServerCode');
const constSMSPurpose = require('./../const/constSMSPurpose');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalType = require('../const/constProposalType');
const constProposalStatus = require("../const/constProposalStatus");
const errorUtils = require('../modules/errorUtils');
const localization = require("../modules/localization");
const pmsAPI = require('../externalAPI/pmsAPI');
const Q = require("q");
const rsaCrypto = require("../modules/rsaCrypto");

var dbClientQnA = {
    //region common function
    getClientQnATemplateConfig: function (type, platformObjId) {
        return dbconfig.collection_clientQnATemplateConfig.findOne({type: type, platform: platformObjId}).lean();
    },

    getClientQnASecurityQuesConfig: function (type, platformObjId) {
        platformObjId = ObjectId(platformObjId);
        let securityQuesProm = dbconfig.collection_clientQnATemplate.findOne({type: type, isSecurityQuestion: true}).lean();
        let templateConfigProm = dbClientQnA.getClientQnATemplateConfig(type, platformObjId);
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
        return dbconfig.collection_clientQnA.findOneAndUpdate(qnaQuery, updateObj, {upsert: true, new: true}).lean();
    },

    // determine which answer is wrong (return this function if security question does not pass)
    securityQuestionReject: function (playerObjId, correctQuesArr, incorrectQuesArr, wrongCountKey) {
        let returnObj = {
            correctAns: correctQuesArr,
            incorrectAns: incorrectQuesArr
        }
        return dbconfig.collection_players.findOne({_id: ObjectId(playerObjId)}).lean().then(
            playerData => {
                returnObj.totalWrongCount = playerData && playerData.qnaWrongCount[wrongCountKey]? playerData.qnaWrongCount[wrongCountKey]: 0;
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

    sendSMSVerificationCode: function (clientQnAData, purpose, isGetSmsCode) {
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
                  ()=>{
                    if(isGetSmsCode){
                        // based on getSMSCode api
                        dbPlayerMail.sendVerificationCodeToNumber(clientQnAData.QnAData.phoneNumber, smsCode, clientQnAData.QnAData.platformId, true, purpose, 0)
                    }else{
                        dbPlayerMail.sendVerificationCodeToPlayer(clientQnAData.QnAData.playerId, smsCode, clientQnAData.QnAData.platformId, true, purpose, 0)
                    }

                });
            }
        }

        return Promise.resolve(false);
    },

    verifyPhoneNumberBySMSCode:function(clientQnAData, code){
        console.log(clientQnAData.QnAData)
        code = code.toString()
        return dbPlayerMail.verifyPhoneNumberBySMSCode(clientQnAData.QnAData.playerId, code)
        .then(data=>{
            return Promise.resolve();
        },err=>{
            return Promise.reject({name: "DBError", message: err.message})
        })
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

    forgotPassword2_1: function () {

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
                    type: constClientQnA.FORGOT_PASSWORD,
                    platformObjId: platformObjId,
                    playerObjId: playerData._id,
                    QnAData: {name: inputDataObj.name}
                };

                return dbconfig.collection_clientQnA(updateObj).save().then(
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
                                                if (configData && configData.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("forgotPassword") &&  playerData.qnaWrongCount.forgotPassword > configData.wrongCount) {
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
                                        if (configData && configData.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("forgotPassword") && playerData.qnaWrongCount.forgotPassword > configData.wrongCount) {
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
        let isPass = false; // is security question pass
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


                if (correctQues && correctQues.length && correctQues.indexOf(questionNo.bankAccount) != -1) {
                    if (!configData.defaultPassword) {
                        return Promise.reject({name: "DBError", message: "Default password not found"});
                    }
                    if (!configData.hasOwnProperty("minQuestionPass")) {
                        return Promise.reject({name: "DBError", message: "Minimum correct answer has not config"});
                    }
                    if (correctQues.length >= configData.minQuestionPass ) {
                        let text1 = localization.localization.translate("Your user ID");
                        let text2 = localization.localization.translate("password has been reset to");
                        let text3 = localization.localization.translate(", password will be send to your bound phone number, please enjoy your game!");
                        endTitle = "Reset password success";
                        endDes = text1 + " (" + playerObj.name + ") " + text2 + " {" + configData.defaultPassword + "} " + text3;
                        isPass = true;
                    }
                }

                if (isPass) {
                    dbPlayerInfo.resetPlayerPassword(clientQnAObj.playerObjId, configData.defaultPassword, platformObjId, false, null, creator, true).catch(errorUtils.reportError);
                    return dbClientQnA.qnaEndMessage(endTitle, endDes, isPass);
                } else {
                    return dbconfig.collection_players.findOneAndUpdate({_id: clientQnAObj.playerObjId},{$inc: {"qnaWrongCount.forgotPassword": 1}},{new:true}).lean().then(
                        updatedPlayerData => {
                            if (!updatedPlayerData) {
                                return Promise.reject({name: "DBError", message: "Update player QnA wrong count  failed"})
                            }
                            if ((configData.wrongCount && updatedPlayerData.qnaWrongCount.forgotPassword <= configData.wrongCount) || !configData.wrongCount) {
                                return dbClientQnA.securityQuestionReject(clientQnAObj.playerObjId, correctQues, inCorrectQues, "forgotPassword");
                            }
                            let text1 = localization.localization.translate("Attention! this player");
                            let text2 = localization.localization.translate("times failed security question, please contact customer service to verify this account.");
                            endTitle = "Reset password failed";
                            endDes = text1 + " (" + updatedPlayerData.qnaWrongCount.forgotPassword + ") " + text2;
                            return dbClientQnA.qnaEndMessage(endTitle, endDes, isPass);
                        }
                    );
                }
            }
        );
    },

    //endregion

    //region forgotUserID
    forgotUserID1_1: function (platformObjId, inputDataObj) {
        let playerData, clientQnAData;
        let playersArr = [];

        if (!(inputDataObj && inputDataObj.phoneNumber)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        // Create a QnA object at first
        return new dbconfig.collection_clientQnA({
            type: constClientQnA.FORGOT_USER_ID,
            QnAData: {
                phoneNumber: inputDataObj.phoneNumber
            }
        }).save().then(
            qnaData => {
                clientQnAData = qnaData;

                return dbconfig.collection_players.find({
                    platform: platformObjId,
                    phoneNumber: rsaCrypto.encrypt(inputDataObj.phoneNumber)
                }, '_id platform playerId name').populate({
                    path: "platform",
                    model: dbconfig.collection_platform,
                    select: {platformId: 1}
                }).lean()
            }
        ).then(
            players => {
                if (players && players.length) {
                    // One player found
                    if (players.length === 1) {
                        playerData = players[0];

                        let updateObj = {
                            QnAData: {
                                playerObjId: playerData._id,
                                playerId: playerData.playerId,
                                playerName: playerData.name
                            }
                        };

                        if (playerData.platform && playerData.platform.platformId) {
                            updateObj.QnAData.platformId = playerData.platform.platformId;
                        }

                        return dbClientQnA.updateClientQnAData(null, constClientQnA.FORGOT_USER_ID, updateObj, clientQnAData._id)
                    }

                    // Multiple players found
                    playersArr = players;
                    throw new Error ('Multiple players found');
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
                if (error.message === 'Player not found') {
                    return dbClientQnA.rejectFailedRetrieveAccount();
                }

                if (error.message === "Multiple players found") {
                    return dbClientQnA.chooseFromMultipleAccount(clientQnAData, playersArr);
                }
            }
        )
    },

    forgotUserID2_1: function (platformObjId, inputDataObj = {}, qnaObjId) {
        let qnaObj, templateObj;

        return dbconfig.collection_clientQnA.findById(qnaObjId).lean().then(
            qnaData => {
                if (qnaData && qnaData.QnAData && qnaData.QnAData.smsCode && qnaData.QnAData.smsCode == inputDataObj.smsCode) {
                    qnaObj = qnaData;
                    return dbClientQnA.getClientQnATemplateConfig(qnaObj.type, platformObjId)
                }
            }
        ).then(
            templateData => {
                if (templateData && templateData.defaultPassword && qnaObj && qnaObj.QnAData && qnaObj.QnAData.playerObjId) {
                    templateObj = templateData;
                    return dbPlayerInfo.resetPlayerPassword(qnaObj.playerObjId, templateObj.defaultPassword, platformObjId, false, false, null, true);
                }
            }
        ).then(
            data => {
                if (data) {
                    return dbClientQnA.successChangePassword(qnaObj, templateObj)
                }
            }
        )
    },

    chooseFromMultipleAccount: function (clientQnAData, playersArr) {
        console.log('chooseFromMultipleAccount', playersArr);
        let processNo = '3_2';

        return dbconfig.collection_clientQnATemplate.findOne({
            type: constClientQnA.FORGOT_USER_ID,
            processNo: processNo
        }).lean().then(
            QnATemplate => {
                if (QnATemplate) {
                    QnATemplate.qnaObjId = clientQnAData._id;
                    QnATemplate.data = playersArr;
                }

                return QnATemplate;
            }
        )
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

    successChangePassword: (qnaObj, templateObj) => {
        let endTitle = "Account found. (Password reset)";
        let endDes = localization.localization.translate("The binded account is: ") + qnaObj.QnAData.playerName
            + ", " + localization.localization.translate("Password has reset to: ") + templateObj.defaultPassword
            + ", " + localization.localization.translate("Please login to change password immediately.");
        return dbClientQnA.qnaEndMessage(endTitle, endDes, true)
    },
    //endregion

    //region updatePhoneNumber
    updatePhoneNumber1: function (platformObjId, inputDataObj) {
        let clientQnAData = null;
        let playerData = null;
        let platformData = null;

        if (!(inputDataObj && inputDataObj.name)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        return dbconfig.collection_platform.findOne({
            _id: platformObjId
        })
      .then(platform => {
          if (!platform) {
              return Promise.reject({name: "DBError", message: "Platform not exist"})
          }
          platformData = platform;
          return dbconfig.collection_players.findOne({platform: platformObjId, name: inputDataObj.name}).lean()
      }).then(
            player => {
                playerData = player;
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }
                let updateObj = {
                    QnAData: {
                        name: inputDataObj.name,
                        platformId: platformData.platformId,
                        playerId: playerData.playerId || '',
                        playerObjId: playerData._id || '',
                        phoneNumber: ''

                    }
                };
                return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.UPDATE_PHONE, updateObj)
        }).then(
            clientQnA => {
                clientQnAData = clientQnA;
                if (!clientQnAData) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }

                let processNo;
                if (playerData.phoneNumber) {
                    processNo = "2_1";
                } else {
                    let endTitle = "Update Phone failed";
                    let endDes = "Attention! This player does not bind phone number (or inconvenient to receive sms code), cannot verify bank card. Please contact customer service to reset password manually";
                    return dbClientQnA.qnaEndMessage(endTitle, endDes)
                }

                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.UPDATE_PHONE,
                    processNo: processNo
                }).lean()
        }).then(
            QnATemplate => {
                if (QnATemplate) {
                    QnATemplate.qnaObjId = clientQnAData._id;
                }
                if (QnATemplate && QnATemplate.isSecurityQuestion) {
                    return dbconfig.collection_clientQnATemplateConfig.findOne({
                        type: constClientQnA.UPDATE_PHONE,
                        platform: platformObjId
                    }).lean().then(
                        configData => {
                            if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > configData.wrongCount) {
                                return dbClientQnA.rejectSecurityQuestionFirstTime()
                            } else {
                                return QnATemplate;
                            }
                        }
                    )
                }
                return QnATemplate;
        });

    },

    updatePhoneNumber2_1: function (platformObjId, inputDataObj, qnaObjId, creator) {
        let clientQnAData = null;
        if (!(inputDataObj && inputDataObj.phoneNumber)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean()
            .then(
                clientQnA => {

                    if (!clientQnA) {
                        return Promise.reject({name: "DBError", message: "update QnA data failed"})
                    }
                    clientQnAData = clientQnA;
                    return dbClientQnA.sendSMSVerificationCode(clientQnAData, constSMSPurpose.OLD_PHONE_NUMBER)

            }).then(
                smsResult => {

                    let processNo = '3_1';

                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.UPDATE_PHONE,
                        processNo: processNo
                    }).lean()
           }).then(
                QnATemplate => {
                    if (QnATemplate) {
                        QnATemplate.qnaObjId = clientQnAData._id;
                    }
                    if (QnATemplate && QnATemplate.isSecurityQuestion) {
                        return dbconfig.collection_clientQnATemplateConfig.findOne({
                            type: constClientQnA.UPDATE_PHONE,
                            platform: platformObjId
                        }).lean().then(
                            configData => {
                                if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > configData.wrongCount) {
                                    return dbClientQnA.rejectSecurityQuestionFirstTime()
                                } else {
                                    return QnATemplate;
                                }
                            }
                        )
                    }
                    return QnATemplate;
          });
    },
    updatePhoneNumber3: function (platformObjId, inputDataObj, qnaObjId, creator) {
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

                        if (playerData.phoneNumber) {
                            return dbconfig.collection_clientQnATemplateConfig.findOne({
                                type: constClientQnA.UPDATE_PHONE,
                                platform: platformObjId}).lean().then(
                                    configData => {
                                        if (configData && configData.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("updatePhoneNumber") && playerData.qnaWrongCount.forgotPassword > configData.wrongCount) {
                                            return dbClientQnA.rejectSecurityQuestionFirstTime();
                                        } else {
                                            return dbconfig.collection_clientQnATemplate.findOne({
                                                type: constClientQnA.UPDATE_PHONE,
                                                processNo: "3_2"
                                            }).lean();
                                        }
                                    })
                        } else {
                            let endTitle = "Update phone failed";
                            let endDes = "Attention! This player does not bind phone number (or inconvenient to receive sms code). Please contact customer service to reset password manually";
                            return dbClientQnA.qnaEndMessage(endTitle, endDes)
                        }
                    }
                )
            });
    },
    updatePhoneNumber3_1: function (platformObjId, inputDataObj, qnaObjId, creator) {
        let clientQnAData = null;
        if (!(inputDataObj && inputDataObj.smsCode)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnA => {

                if (!clientQnA) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }
                clientQnAData = clientQnA;
                return dbClientQnA.verifyPhoneNumberBySMSCode(clientQnAData, inputDataObj.smsCode)

            }).then(() => {

                let processNo = '4_1';
                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.UPDATE_PHONE,
                    processNo: processNo
                }).lean()

            }).then(
                QnATemplate => {
                    if (QnATemplate) {
                        QnATemplate.qnaObjId = clientQnAData._id;
                    }
                    if (QnATemplate && QnATemplate.isSecurityQuestion) {
                        return dbconfig.collection_clientQnATemplateConfig.findOne({
                            type: constClientQnA.UPDATE_PHONE,
                            platform: platformObjId
                        }).lean().then(
                            configData => {
                                if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > configData.wrongCount) {
                                    return dbClientQnA.rejectSecurityQuestionFirstTime()
                                } else {
                                    return QnATemplate;
                                }
                            }
                        )
                    }
                    return QnATemplate;
            });
    },
    updatePhoneNumber3_2: function (platformObjId, inputDataObj, qnaObjId, creator) {

            if (!qnaObjId) {
                return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
            }

            let playerObj;
            let isPass = false; // is security question pass
            let correctQues = [];
            let inCorrectQues = [];
            let updateObj = {};
            let clientQnAData;
            let questionNo = {
                phoneNumber: 1,
                bankAccount: 2,
                amount: 3
            };
            let lastWithdraw;

            return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
                clientQnAObj => {
                    clientQnAData = clientQnAObj;
                    if (!(clientQnAData && clientQnAData.playerObjId)) {
                        return Promise.reject({name: "DBError", message: "Cannot find clientQnA"})
                    }
                    return dbconfig.collection_proposalType.findOne({
                        platformId: platformObjId,
                        name: constProposalType.PLAYER_BONUS
                    })
                }).then(
                proposalTypeData =>{
                    let playerObjId = clientQnAData.playerObjId || '';
                    return dbconfig.collection_proposal.findOne({
                        'data.playerObjId': ObjectId(playerObjId),
                        type: ObjectId(proposalTypeData._id),
                        $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}]
                    }).sort({createTime : -1});
                }).then(
                    withdraw=>{
                        console.log(withdraw);
                        if(!withdraw){
                            return Promise.reject({name: "DBError", message: "Cannot Found Withdraw"});
                        }
                        lastWithdraw = (withdraw && withdraw.data) ? withdraw.data : null;
                        return dbconfig.collection_players.findOne({_id: clientQnAData.playerObjId}).lean();
                }).then(
                playerData => {
                    if (!playerData) {
                        return Promise.reject({name: "DBError", message: "Cannot find player"})
                    }
                    playerObj = playerData;

                    if (playerData.phoneNumber &&  playerData.phoneNumber == inputDataObj.phoneNumber) {
                        correctQues.push(questionNo.phoneNumber);
                        updateObj["QnAData.phoneNumber"] = inputDataObj.phoneNumber;
                    } else {
                        inCorrectQues.push(questionNo.phoneNumber);
                    }


                    if (playerData.bankAccount && playerData.bankAccount.slice(-4) == inputDataObj.bankAccount) {
                        correctQues.push(questionNo.bankAccount);
                        updateObj["QnAData.bankAccount"] = inputDataObj.bankAccount;
                    } else {
                        inCorrectQues.push(questionNo.bankAccount);
                    }


                    if (lastWithdraw.amount && lastWithdraw.amount == inputDataObj.amount) {
                        correctQues.push(questionNo.amount);
                        updateObj["QnAData.amount"] = inputDataObj.amount;
                    } else {
                        inCorrectQues.push(questionNo.amount);
                    }

                    return dbconfig.collection_clientQnATemplateConfig.findOne({
                        type: constClientQnA.UPDATE_PHONE,
                        platform: Object(platformObjId)
                    }).lean();
                }).then(
                configData => {
                    if (!configData) {
                        return Promise.reject({name: "DBError", message: "Cannot find QnA template config"});
                    }

                    let endTitle;
                    let endDes;


                    if (correctQues && correctQues.length && correctQues.indexOf(questionNo.bankAccount) != -1) {

                        if (!configData.hasOwnProperty("minQuestionPass")) {
                            return Promise.reject({name: "DBError", message: "Minimum correct answer has not config"});
                        }
                        if (correctQues.length >= configData.minQuestionPass ) {
                            let text1 = localization.localization.translate("Your Phone Number");
                            let text2 = localization.localization.translate("has been reset to");
                            endTitle = "Reset password success";
                            endDes = text1 + text2 + " {" + playerObj.phoneNumber + "} ";
                            isPass = true;
                        }
                    }

                    if (!isPass) {

                        return dbconfig.collection_players.findOneAndUpdate({_id: clientQnAData.playerObjId},{$inc: {"qnaWrongCount.updatePhoneNumber": 1}},{new:true}).lean().then(
                            updatedPlayerData => {
                                if (!updatedPlayerData) {
                                    return Promise.reject({name: "DBError", message: "Update player QnA wrong count  failed"})
                                }
                                if ((configData.wrongCount && updatedPlayerData.qnaWrongCount.updatePhoneNumber <= configData.wrongCount) || !configData.wrongCount) {
                                    return dbClientQnA.securityQuestionReject(clientQnAObj.playerObjId, correctQues, inCorrectQues, "updatePhoneNumber");
                                }
                                let text1 = localization.localization.translate("Attention! this player");
                                let text2 = localization.localization.translate("times failed security question, please contact customer service to verify this account.");
                                endTitle = "Change phone number failed";
                                endDes = text1 + " (" + updatedPlayerData.qnaWrongCount.updatePhoneNumber + ") " + text2;
                                return dbClientQnA.qnaEndMessage(endTitle, endDes, isPass);
                            }
                        );
                    } else {
                        let processNo = '4_1';
                        return dbconfig.collection_clientQnATemplate.findOne({
                            type: constClientQnA.UPDATE_PHONE,
                            processNo: processNo
                        }).lean()
                    }
                  }).then(
                      QnATemplate => {
                          if (QnATemplate) {
                              QnATemplate.qnaObjId = clientQnAData._id;
                          }
                          if (QnATemplate && QnATemplate.isSecurityQuestion) {
                              return dbconfig.collection_clientQnATemplateConfig.findOne({
                                  type: constClientQnA.UPDATE_PHONE,
                                  platform: platformObjId
                              }).lean().then(
                                  configData => {
                                      if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > configData.wrongCount) {
                                          return dbClientQnA.rejectSecurityQuestionFirstTime()
                                      } else {
                                          return QnATemplate;
                                      }
                                  }
                              )
                          }
                          return QnATemplate;
                  });
    },

    updatePhoneNumber4_1: function (platformObjId, inputDataObj, qnaObjId, creator) {

        let clientQnAData = null;
        if (!(inputDataObj && inputDataObj.newPhoneNumber)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        let updObj = {
            $set: {
                'QnAData.phoneNumber':  inputDataObj.newPhoneNumber
            }
        };
        return dbClientQnA.updateClientQnAData(null, constClientQnA.UPDATE_PHONE, {$set:{'QnAData.phoneNumber':  inputDataObj.newPhoneNumber}}, qnaObjId)
            .then(
                clientQnA => {
                    if (!clientQnA) {
                        return Promise.reject({name: "DBError", message: "update QnA data failed"})
                    }
                    clientQnAData = clientQnA;
                    return dbClientQnA.sendSMSVerificationCode(clientQnAData, constSMSPurpose.NEW_PHONE_NUMBER, true)
                })
            .then(smsData => {

                    let processNo = '5_1';
                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.UPDATE_PHONE,
                        processNo: processNo
                    }).lean()
                },err=>{
                    if(err){
                        return Promise.reject({name: "DBError", message: err.errMsg})
                    }
            })
            .then(
                QnATemplate => {
                    if (QnATemplate) {
                        QnATemplate.qnaObjId = clientQnAData._id;
                    }
                    if (QnATemplate && QnATemplate.isSecurityQuestion) {
                        return dbconfig.collection_clientQnATemplateConfig.findOne({
                            type: constClientQnA.UPDATE_PHONE,
                            platform: platformObjId
                        }).lean().then(
                            configData => {
                                if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > configData.wrongCount) {
                                    return dbClientQnA.rejectSecurityQuestionFirstTime()
                                } else {
                                    return QnATemplate;
                                }
                            }
                        )
                    }
                    return QnATemplate;
            })
    },
    updatePhoneNumber5_1: function (platformObjId, inputDataObj, qnaObjId, creator) {
        let clientQnAData = null;
        if (!(inputDataObj && inputDataObj.smsCode)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnA => {

                if (!clientQnA) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }

                clientQnAData = clientQnA;
                let code = inputDataObj.smsCode ? inputDataObj.smsCode : '';
                return dbPlayerPartner.updatePhoneNumberWithSMS(null, clientQnAData.QnAData.platformId, clientQnAData.QnAData.playerId, clientQnAData.QnAData.phoneNumber ,code, 0)

            }).then(() => {

                let processNo = '6_1';
                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.UPDATE_PHONE,
                    processNo: processNo
                }).lean()

            }).then(
                QnATemplate => {
                    if (QnATemplate) {
                        QnATemplate.qnaObjId = clientQnAData._id;
                    }
                    if (QnATemplate && QnATemplate.isSecurityQuestion) {
                        return dbconfig.collection_clientQnATemplateConfig.findOne({
                            type: constClientQnA.UPDATE_PHONE,
                            platform: platformObjId
                        }).lean().then(
                            configData => {
                                if (configData && configData.hasOwnProperty("wrongCount") && clientQnAData.hasOwnProperty("totalWrongCount") && clientQnAData.totalWrongCount > configData.wrongCount) {
                                    return dbClientQnA.rejectSecurityQuestionFirstTime()
                                } else {
                                    return QnATemplate;
                                }
                            }
                        )
                    }
                    return QnATemplate;
            });
    },
    updatePhoneNumber6_1: function (platformObjId, inputDataObj, qnaObjId, creator) {
        let clientQnAData = null;
        return clientQnAData;
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
