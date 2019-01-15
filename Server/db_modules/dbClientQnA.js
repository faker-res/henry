'use strict';

var dbClientQnAFunc = function () {
};
module.exports = new dbClientQnAFunc();

const dbutility = require('./../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const constPlayerRegistrationInterface = require('./../const/constPlayerRegistrationInterface');
const constProposalMainType = require('./../const/constProposalMainType');
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
const proposalExecutor = require('../modules/proposalExecutor');

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
    qnaEndMessage: function (title, des, isSuccess, linkage, linkageTitle) {
        return Promise.resolve({
            clientQnAEnd: {
                title: localization.localization.translate(title),
                des: localization.localization.translate(des),
                isSuccess: isSuccess,
                linkage: linkage,
                linkageTitle: linkageTitle
            }
        })
    },

    sendSMSVerificationCode: function (clientQnAData, purpose, isGetSmsCode, inputData) {
        let smsCode = dbutility.generateRandomPositiveNumber(1000, 9999);
        if (clientQnAData && clientQnAData.QnAData && clientQnAData.QnAData.playerId && clientQnAData.QnAData.platformId) {
            if (clientQnAData.type) {
                let smsCountProm = Promise.resolve(true);
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

                if (clientQnAData.QnAData.phoneNumber) {
                    smsCountProm = dbClientQnA.checkSMSSentCountInPastHour(
                        clientQnAData.QnAData.platformId, clientQnAData.QnAData.phoneNumber, purpose)
                }
                return smsCountProm.then(
                    smsCountRes => {
                        if (smsCountRes) {
                            return dbClientQnA.updateClientQnAData(null, clientQnAData.type, updObj, clientQnAData._id).then(
                                () => {
                                    if (isGetSmsCode) {
                                        // based on getSMSCode api
                                        return dbPlayerMail.sendVerificationCodeToNumber(clientQnAData.QnAData.phoneNumber, smsCode, clientQnAData.QnAData.platformId, true, purpose, 0, clientQnAData.QnAData.name, inputData)
                                    } else {
                                        return dbPlayerMail.sendVerificationCodeToPlayer(clientQnAData.QnAData.playerId, smsCode, clientQnAData.QnAData.platformId, true, purpose, 0)
                                    }
                                });
                        } else {
                            return Promise.resolve(false);
                        }
                    }
                )
            }
        }

        return Promise.resolve(false);
    },

    verifyPhoneNumberBySMSCode: function(clientQnAData, code){
        let result = false;
        if(clientQnAData.QnAData.smsCode == code){
            result = true;
        }
        return result;
    },

    checkSMSSentCountInPastHour: function (platformId, telNum, purpose) {
        let pastHour = dbutility.getSGTimeOfPassHours(1);

        return dbconfig.collection_platform.findOne({platformId: platformId}, '_id').lean().then(
            platformData => {
                if (platformData && platformData._id) {
                    return dbconfig.collection_smsLog.find({
                        platform: platformData._id,
                        tel: telNum,
                        purpose: purpose,
                        createTime: {$gte: pastHour.startTime, $lt: pastHour.endTime}
                    }, {_id: 1}).count().then(smsCount => smsCount <= 5);
                }

                return true;
            }
        )
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

    // return reject sms reached max count
    rejectSMSCountMoreThanFiveInPastHour: function () {
        let endTitle = "Failed to retrieve account.";
        let endDes = "Attention: this number is over the excess the limit of sent sms. Please contact cs or open a new account if necessary.";
        return dbClientQnA.qnaEndMessage(endTitle, endDes)
    },

    // return reject player forbid to login
    rejectPlayerForbiddenToLogin: function () {
        let endTitle = "Reset password failed";
        let endDes = "Attention! This player has been forbidden to login";
        return dbClientQnA.qnaEndMessage(endTitle, endDes)
    },
    //endregion

    //region forgot password
    forgotPasswordResendSMSCode: function (platformObjId, inputDataObj, qnaObjId) {
        return dbconfig.collection_clientQnA.findById(qnaObjId).lean().then(
            qnaObj => {
                // Check player send count
                if (qnaObj && qnaObj.QnAData && qnaObj.QnAData.smsCount && qnaObj.QnAData.smsCount >= 5) {
                    return dbClientQnA.forgotPassword2(platformObjId, inputDataObj, qnaObjId);
                } else {
                    return dbClientQnA.sendSMSVerificationCode(qnaObj, constSMSPurpose.RESET_PASSWORD).then(
                        smsRes => {
                            if (!smsRes) {
                                return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
                            }
                        }
                    );
                }
            }
        );
    },

    forgotPassword2_1: function (platformObjId, inputDataObj, qnaObjId) {
        if (!(inputDataObj && inputDataObj.phoneNumber)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }
        let clientQnAObj;
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnAData => {
                if (!(clientQnAData && clientQnAData.playerObjId)) {
                    return Promise.reject({name: "DBError", message: "Cannot find clientQnA"})
                }
                clientQnAObj = clientQnAData;
                let phoneQ = {$in: [rsaCrypto.encrypt(inputDataObj.phoneNumber), rsaCrypto.oldEncrypt(inputDataObj.phoneNumber)]};
                return dbconfig.collection_players.findOne({
                    _id: clientQnAData.playerObjId,
                    phoneNumber: phoneQ
                }).lean();

            }
        ).then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Phone number does not match"})
                }
                if (!clientQnAObj.QnAData) {
                    clientQnAObj.QnAData = {}
                }

                clientQnAObj.QnAData.phoneNumber = inputDataObj.phoneNumber;

                return dbClientQnA.sendSMSVerificationCode(clientQnAObj, constSMSPurpose.RESET_PASSWORD);
            }
        ).then(
            smsRes => {
                if (!smsRes) {
                    return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
                }
                return dbconfig.collection_clientQnATemplate.findOne({
                    processNo: "3_1",
                    type: constClientQnA.FORGOT_PASSWORD
                }).lean();
            }
        );

    },

    forgotPassword3_1: function (platformObjId, inputDataObj, qnaObjId, creator) {
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnAData => {
                if (!(clientQnAData && clientQnAData.playerObjId)) {
                    return Promise.reject({name: "DBError", message: "Cannot find clientQnA"})
                }
                if (!(clientQnAData.QnAData && clientQnAData.QnAData.smsCode == inputDataObj.smsCode)) {
                    return Promise.reject({name: "DBError", message: "Incorrect SMS Validation Code"});
                }

                return dbconfig.collection_clientQnATemplateConfig.findOne({
                    type: constClientQnA.FORGOT_PASSWORD,
                    platform: platformObjId
                }).lean().then(
                    configData => {
                        if (!configData) {
                            return Promise.reject({name: "DBError", message: "Cannot find QnA template config"});
                        }
                        if (!configData.defaultPassword) {
                            return Promise.reject({name: "DBError", message: "Default password not found"});
                        }

                        return dbPlayerInfo.resetPlayerPassword(clientQnAData.playerObjId, configData.defaultPassword, platformObjId, false, null, creator, true).then(
                            () => {
                                let text1 = localization.localization.translate("Your user ID");
                                let text2 = localization.localization.translate("password has been reset to");
                                let text3 = localization.localization.translate(", password will be send to your bound phone number, please enjoy your game!");
                                let endTitle = "Reset password success";
                                let endDes = text1 + " (" + clientQnAData.QnAData.name + ") " + text2 + " {" + configData.defaultPassword + "} " + text3;
                                return dbClientQnA.qnaEndMessage(endTitle, endDes, true);
                            });
                    });

            });
    },

    forgotPassword1: function (platformObjId, inputDataObj) {
        if (!(inputDataObj && inputDataObj.name)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        return dbconfig.collection_players.findOne({platform: platformObjId, name: inputDataObj.name}).populate({
            path: "platform",
            model: dbconfig.collection_platform,
            select: {platformId: 1}
        }).lean().then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }

                if(playerData.permission && playerData.permission.forbidPlayerFromLogin){
                    let endTitle = "Reset password failed";
                    let endDes = "Attention! This player has been forbidden to login";
                    return dbClientQnA.qnaEndMessage(endTitle, endDes)
                }

                let updateObj = {
                    type: constClientQnA.FORGOT_PASSWORD,
                    platformObjId: platformObjId,
                    playerObjId: playerData._id,
                    QnAData: {
                        name: inputDataObj.name,
                        playerId: playerData.playerId,
                        platformId: playerData.platform.platformId
                    }
                };

                if (playerData.platform && playerData.platform.platformId) {
                    updateObj.QnAData.platformId = playerData.platform.platformId;
                }
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
                    return dbPlayerInfo.resetPlayerPassword(clientQnAObj.playerObjId, configData.defaultPassword, platformObjId, false, null, creator, true).then(
                        () => {
                            return dbClientQnA.qnaEndMessage(endTitle, endDes, isPass);
                        });
                } else {
                    return dbconfig.collection_players.findOneAndUpdate({_id: clientQnAObj.playerObjId, platform: platformObjId},{$inc: {"qnaWrongCount.forgotPassword": 1}},{new:true}).lean().then(
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
            platformObjId: platformObjId,
            type: constClientQnA.FORGOT_USER_ID,
            QnAData: {
                phoneNumber: inputDataObj.phoneNumber
            }
        }).save().then(
            qnaData => {
                clientQnAData = qnaData;
                let phoneQ = {$in: [rsaCrypto.encrypt(inputDataObj.phoneNumber), rsaCrypto.oldEncrypt(inputDataObj.phoneNumber)]};

                return dbconfig.collection_players.find({
                    platform: platformObjId,
                    phoneNumber: phoneQ
                }, '_id platform playerId name permission').populate({
                    path: "platform",
                    model: dbconfig.collection_platform,
                    select: {platformId: 1}
                }).sort({lastAccessTime : -1}).lean()
            }
        ).then(
            players => {
                if (players && players.length) {
                    let playerCount = players.length;
                    let countForbidPlayerFromLogin = 0;
                    players = players.filter(item=>{
                        if(item.permission.forbidPlayerFromLogin){
                            countForbidPlayerFromLogin++;
                        };
                        if(!item.permission.forbidPlayerFromLogin){
                            return item;
                        }
                    })

                    if(playerCount > 0 && (playerCount - countForbidPlayerFromLogin ==0 )){
                        throw new Error ("Player is forbidden to login")
                    }

                    // players found
                    playersArr = players;
                    throw new Error ('players found');
                }

                throw new Error('Player not found');
            }
        ).then(
            clientQnA => {
                if (!clientQnA) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }

                clientQnAData = clientQnA;

                // Send verification code
                return dbClientQnA.sendSMSVerificationCode(clientQnAData, constSMSPurpose.INQUIRE_ACCOUNT)
            }
        ).then(
            smsRes => {
                if (smsRes) {
                    let processNo = '2_1';

                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.FORGOT_USER_ID,
                        processNo: processNo
                    }).lean();
                }

                throw new Error ("Max SMS count");
            }
        ).then(
            QnATemplate => {
                if (QnATemplate) {
                    QnATemplate.qnaObjId = clientQnAData._id;
                }
                return QnATemplate;
            }
        ).catch(error => {
            if (error.message === 'Player not found') {
                return dbClientQnA.rejectFailedRetrieveAccount();
            }

            if (error.message === "players found") {
                return dbClientQnA.chooseFromMultipleAccount(clientQnAData, playersArr);
            }

            if (error.message === "Max SMS count") {
                return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
            }

            if (error.message === "Player is forbidden to login") {
                return dbClientQnA.rejectPlayerForbiddenToLogin();
            }
        })
    },

    switchPage: function (platformObjId, inputDataObj){
        //generate clickable button purpose
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
                    return dbPlayerInfo.resetPlayerPassword(qnaObj.QnAData.playerObjId, templateObj.defaultPassword, platformObjId, false, false, null, true);
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

    forgotUserId3_2: function (platformObjId, inputDataObj = {}, qnaObjId) {
        let clientQnAData;
        return dbconfig.collection_clientQnA.findById(qnaObjId).lean().then(
            qnaData => {
                clientQnAData = qnaData;

                if (inputDataObj && inputDataObj.playerObjId) {
                    return dbconfig.collection_players.findById(inputDataObj.playerObjId).populate({
                        path: "platform",
                        model: dbconfig.collection_platform,
                        select: {platformId: 1}
                    }).lean();
                }

                throw new Error('Player not found');
            }
        ).then(
            playerData => {
                if (playerData && playerData.playerId && playerData.platform.platformId) {
                    let updObj = {
                        $set: {
                            'QnAData.playerObjId': playerData._id,
                            'QnAData.playerId': playerData.playerId,
                            'QnAData.playerName': playerData.name,
                            'QnAData.platformId': playerData.platform.platformId,
                        }
                    };

                    // Update clientQnAData
                    // Send verification code
                    return dbClientQnA.updateClientQnAData(null, clientQnAData.type, updObj, clientQnAData._id)
                }
            }
        ).then(
            updatedData => {
                return dbClientQnA.sendSMSVerificationCode(updatedData, constSMSPurpose.INQUIRE_ACCOUNT)
            }
        ).then(
            smsRes => {
                if (smsRes) {
                    let processNo = '2_1';

                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.FORGOT_USER_ID,
                        processNo: processNo
                    }).lean();
                }

                // SMS Count more than 5 times in an hour
                throw new Error ("Max SMS count");
            }
        ).then(
            QnATemplate => {
                if (QnATemplate) {
                    QnATemplate.qnaObjId = clientQnAData._id;
                }
                return QnATemplate;
            }
        ).catch(error => {
            if (error.message === 'Player not found') {
                return dbClientQnA.rejectFailedRetrieveAccount();
            }

            if (error.message === "Max SMS count") {
                return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
            }
        });
    },

    chooseFromMultipleAccount: function (clientQnAData, playersArr) {

        let processNo;
        if(playersArr && playersArr.length == 1){
            processNo = '3_1';
        }else{
            processNo = '3_2';
        }
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
                    return dbClientQnA.sendSMSVerificationCode(qnaObj, constSMSPurpose.INQUIRE_ACCOUNT).then(
                        smsRes => {
                            if (!smsRes) {
                                return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
                            }
                        }
                    );
                }
            }
        );
    },

    successChangePassword: (qnaObj, templateObj) => {
        let endTitle = "Account found. (Password reset)";
        let endDes = localization.localization.translate("The binded account is: ") + qnaObj.QnAData.playerName
            + ", " + localization.localization.translate("Password has reset to: ") + templateObj.defaultPassword
            + ", " + localization.localization.translate("Sent to your phone, enjoy the game.");
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
                if (playerData.permission && playerData.permission.forbidPlayerFromLogin) {
                    return Promise.reject({name: "DBError", message: "Attention! This player has been forbidden to login"})
                }
                let updateObj = {
                    QnAData: {
                        name: inputDataObj.name,
                        platformId: platformData.platformId,
                        playerId: playerData.playerId || '',
                        playerObjId: playerData._id || '',
                        phoneNumber: '',
                        oldPhoneNumber: ''
                    }
                };

                if(platformData.usePhoneNumberTwoStepsVerification){
                    updateObj.QnAData.twoStepsVerification = true;
                }
                return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.UPDATE_PHONE, updateObj)
        }).then(
            clientQnA => {
                clientQnAData = clientQnA;
                if (!clientQnAData) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }

                let processNo;
                if (playerData.phoneNumber && platformData.usePhoneNumberTwoStepsVerification) {
                    processNo = "2_1";
                } else if(playerData.phoneNumber && !platformData.usePhoneNumberTwoStepsVerification) {
                    processNo = "2_1_1";
                } else {
                    let endTitle = "Update phone number failed";
                    let endDes = "Attention! This player does not bind phone number (or inconvenient to receive sms code), cannot verify bank card. Please contact customer service to reset password manually";
                    return dbClientQnA.qnaEndMessage(endTitle, endDes);
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
        let playerData = null;
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
                    return clientQnAData
            }).then(
                () => {
                    return dbconfig.collection_players.findOne({_id: clientQnAData.playerObjId}).lean()
            }).then(
                (player) => {
                    playerData = player;
                    console.log(playerData.phoneNumber);
                    if(playerData.phoneNumber != inputDataObj.phoneNumber){
                        return Promise.reject({name: "DBError", message: "Thats not same phone you are using"})
                    }
                    if(clientQnAData.QnAData.twoStepsVerification){
                        return dbClientQnA.sendSMSVerificationCode(clientQnAData, constSMSPurpose.OLD_PHONE_NUMBER)
                    }else{
                        return {}
                    }
            }).then(smsRes=>{
                    console.log(smsRes);
                    if(smsRes) {
                        let updObj = {
                            $set: {
                                'QnAData.oldPhoneNumber': inputDataObj.phoneNumber
                            }
                        };
                        return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.UPDATE_PHONE, updObj, qnaObjId)
                    }
                    throw new Error ("Max SMS count");
            }).then(
                (clientQnA) => {
                    let processNo = '';
                    if(clientQnA.QnAData.twoStepsVerification){
                        processNo = '3_1';
                    }else{
                        processNo = '4_1';
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
          })
          .catch(error => {
            if (error.message === "Max SMS count") {
                return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
            }else{
                return Promise.reject({name: "DBError", message: localization.localization.translate(error.message) ||''})
            }
          })
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
                                        if (configData && configData.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("updatePhoneNumber") && playerData.qnaWrongCount.updatePhoneNumber > configData.wrongCount) {

                                              let text1 = localization.localization.translate("Attention! this player");
                                              let text2 = localization.localization.translate("times failed security question, please contact customer service to verify this account.");
                                              let endTitle = "Update phone number failed";
                                              let endDes = text1 + " (" + playerData.qnaWrongCount.updatePhoneNumber + ") " + text2;
                                              return dbClientQnA.qnaEndMessage(endTitle, endDes);
                                        } else {
                                            return dbconfig.collection_clientQnATemplate.findOne({
                                                type: constClientQnA.UPDATE_PHONE,
                                                processNo: "3_2"
                                            }).lean();
                                        }
                                    })
                        } else {
                            let endTitle = "Update phone failed";
                            let endDes = "Attention! This player does not bind phone number (or inconvenient to receive sms code), cannot verify bank card. Please contact customer service to reset password manually";
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
                let validateResult = dbClientQnA.verifyPhoneNumberBySMSCode(clientQnAData, inputDataObj.smsCode)
                if(!validateResult){
                    return Promise.reject({name: "DBError", message: "SMS not match"})
                }

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

            let updObj = {
                $set: {
                    'QnAData.oldPhoneNumber': inputDataObj.phoneNumber
                }
            };
            return dbClientQnA.updateClientQnAData(null, constClientQnA.UPDATE_PHONE, updObj, qnaObjId).then(
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
                        'data.playerObjId': playerObjId,
                        type: ObjectId(proposalTypeData._id),
                        $or: [{status: constProposalStatus.APPROVED}, {status: constProposalStatus.SUCCESS}]
                    }).sort({createTime : -1});
                }).then(
                    withdraw=>{
                        lastWithdraw = (withdraw && withdraw.data) ? withdraw.data : { amount : 0};
                        if(lastWithdraw.amount != 0){
                            lastWithdraw.amount = parseInt(lastWithdraw.amount);
                        }
                        console.log(lastWithdraw.amount)
                        return dbconfig.collection_players.findOne({_id: clientQnAData.playerObjId, platform: platformObjId}).lean();
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

                    if (!playerData.bankAccount && inputDataObj.bankAccount == '无'){
                        correctQues.push(questionNo.bankAccount);
                        updateObj["QnAData.bankAccount"] = '';
                    }else if (playerData.bankAccount == inputDataObj.bankAccount) {
                        correctQues.push(questionNo.bankAccount);
                        updateObj["QnAData.bankAccount"] = inputDataObj.bankAccount;
                    } else {
                        inCorrectQues.push(questionNo.bankAccount);
                    }


                    if (lastWithdraw.amount == inputDataObj.amount) {
                        correctQues.push(questionNo.amount);
                        updateObj["QnAData.amount"] = inputDataObj.amount;
                    } else {
                        inCorrectQues.push(questionNo.amount);
                    }

                    return dbconfig.collection_clientQnATemplateConfig.findOne({
                        type: constClientQnA.UPDATE_PHONE,
                        platform: platformObjId
                    }).lean();
                }).then(
                configData => {
                    console.log(configData)
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
                            endTitle = "Update phone number success";
                            endDes = text1 + text2 + " {" + playerObj.phoneNumber + "} ";
                            isPass = true;
                        }
                    }

                    if (!isPass) {

                        return dbconfig.collection_players.findOneAndUpdate({_id: clientQnAData.playerObjId, platform:platformObjId},{$inc: {"qnaWrongCount.updatePhoneNumber": 1}},{new:true}).lean().then(
                            updatedPlayerData => {
                                if (!updatedPlayerData) {
                                    return Promise.reject({name: "DBError", message: "Update player QnA wrong count failed"})
                                }
                                if ((configData.wrongCount && updatedPlayerData.qnaWrongCount.updatePhoneNumber <= configData.wrongCount) || !configData.wrongCount) {
                                    return dbClientQnA.securityQuestionReject(clientQnAData.playerObjId, correctQues, inCorrectQues, "updatePhoneNumber");
                                }
                                let text1 = localization.localization.translate("Attention! this player");
                                let text2 = localization.localization.translate("times failed security question, please contact customer service to verify this account.");
                                endTitle = "Update phone number failed";
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
                    let sendData = {}
                    if(clientQnAData.QnAData && !clientQnAData.QnAData.twoStepsVerification && clientQnAData.QnAData.oldPhoneNumber){
                        sendData.oldPhoneNumber = clientQnAData.QnAData.oldPhoneNumber;
                        sendData.playerId = clientQnAData.QnAData.playerId;
                    }
                    return dbClientQnA.sendSMSVerificationCode(clientQnAData, constSMSPurpose.NEW_PHONE_NUMBER, true, sendData)
                })
            .then(smsData => {
                    if(smsData){
                        let processNo = '5_1';
                        return dbconfig.collection_clientQnATemplate.findOne({
                            type: constClientQnA.UPDATE_PHONE,
                            processNo: processNo
                        }).lean();
                    }
                    throw new Error ("Max SMS count");
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
            .catch(error => {
              if (error.message === "Max SMS count") {
                  return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
              }else{
                  return Promise.reject({name: "DBError", message: error.message ||''})
              }
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

                return dbProposal.rejectPendingProposalIfAvailable(platformObjId, clientQnAData.QnAData.name, constProposalType.UPDATE_PLAYER_PHONE, "; QnA系统取消提案");
            }
        ).then(
            () => {
                let code = inputDataObj.smsCode ? inputDataObj.smsCode : '';
                return dbPlayerPartner.updatePhoneNumberWithSMS(null, clientQnAData.QnAData.platformId, clientQnAData.QnAData.playerId, clientQnAData.QnAData.phoneNumber ,code, 0)

            }).then((data) => {

                let endTitle = "Update phone number success";
                let endDes = "Update phone number success";
                return dbClientQnA.qnaEndMessage(endTitle, endDes);
            },err=>{

                let errorMessage = err.message ? err.message : '';
                return Promise.reject({name: "DBError", message: localization.localization.translate(errorMessage)})
            });
    },

    getOldNumberSMS: function (platformObjId, inputDataObj, qnaObjId) {
        let purpose = constSMSPurpose.OLD_PHONE_NUMBER;
        let isGetSmsCode = false;
        let endTitle = 'Update phone number failed';
        let endDes = 'Attention: this number is over the excess the limit of sent sms. Please contact cs or open a new account if necessary.';
        return dbClientQnA.getSMSVerificationCodeAgain(platformObjId, inputDataObj, qnaObjId, purpose, isGetSmsCode, endTitle, endDes);
    },

    getNewNumberSMS: function (platformObjId, inputDataObj, qnaObjId) {
        let purpose = constSMSPurpose.NEW_PHONE_NUMBER;
        let isGetSmsCode = true;
        let endTitle = 'Update phone number failed';
        let endDes = 'Attention: this number is over the excess the limit of sent sms. Please contact cs or open a new account if necessary.';
        return dbClientQnA.getSMSVerificationCodeAgain(platformObjId, inputDataObj, qnaObjId, purpose, isGetSmsCode, endTitle, endDes, true);
    },

    getSMSVerificationCodeAgain: function (platformObjId, inputDataObj, qnaObjId, purpose, isGetSmsCode, endTitle, endDes, isNewPhoneNumber) {
        return dbconfig.collection_clientQnA.findById(qnaObjId).lean().then(
            qnaObj => {
                // Check player send count
                let sendObj = {};
                if(!qnaObj){
                    return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
                }
                if(qnaObj && qnaObj.QnAData && qnaObj.QnAData.playerId && qnaObj.QnAData.oldPhoneNumber && !qnaObj.QnAData.twoStepsVerification && isNewPhoneNumber){
                    sendObj.playerId = qnaObj.QnAData.playerId;
                    sendObj.oldPhoneNumber = qnaObj.QnAData.oldPhoneNumber
                }
                if (qnaObj && qnaObj.QnAData && qnaObj.QnAData.smsCount && qnaObj.QnAData.smsCount >= 5) {
                    return dbClientQnA.qnaEndMessage(endTitle, endDes);
                } else {
                    return dbClientQnA.sendSMSVerificationCode(qnaObj, purpose, isGetSmsCode, sendObj);
                }
            }
        );
    },

    //endregion

    //region editBankCard
    editBankCard1: (platformObjId, inputDataObj) => {
        let clientQnA = {};
        // pre edit
        if (!inputDataObj || !inputDataObj.name) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        return dbconfig.collection_players.findOne({platform: platformObjId, name: inputDataObj.name}).populate({
            path: "platform",
            model: dbconfig.collection_platform,
            select: {platformId: 1}
        }).lean().then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }
                if (playerData.permission && playerData.permission.forbidPlayerFromLogin) {
                    return Promise.reject({name: "DBError", message: "Attention! This player has been forbidden to login"})
                }

                let updateObj = {
                    QnAData: {
                        name: inputDataObj.name,
                        platformId: playerData.platform && playerData.platform.platformId,
                        playerId: playerData.playerId,
                        playerObjId: playerData._id,
                        platformObjId: playerData._id,
                        phoneNumber: playerData.phoneNumber
                    }
                };
                return dbClientQnA.updateClientQnAData(playerData._id, constClientQnA.EDIT_BANK_CARD, updateObj).catch(errorUtils.reportError);
            }
        ).then(
            clientQnAData => {
                clientQnA = clientQnAData || clientQnA;

                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.EDIT_BANK_CARD,
                    processNo: "2_1"
                }).lean();
            }
        ).then(
            template => {
                if (template) {
                    template.qnaObjId = clientQnA._id;
                }

                return template;
            }
        );
    },

    editBankCard2_1: (platformObjId, inputDataObj, qnaObjId) => {
        let clientQnA, player, platform;

        if (!inputDataObj || !inputDataObj.phoneNumber) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            qnaObj => {
                if (!qnaObj) {
                    return Promise.reject({message: "QnA object not found."});
                }

                clientQnA = qnaObj;

                let playerProm = dbconfig.collection_players.findOne({_id: clientQnA.playerObjId}).lean();
                let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();

                return Promise.all([playerProm, platformProm]);
            }
        ).then(
            data => {
                if (!data || !data[0]) {
                    return Promise.reject({message: "Player not found."});
                }

                if (!data[1]){
                    return Promise.reject({message: "Platform not found."});
                }

                player = data[0];
                platform = data[1];

                if (player.phoneNumber != inputDataObj.phoneNumber) {
                    return Promise.reject({message: "Phone number does not match"});
                }

                // return dbPlayerMail.sendVerificationCodeToPlayer(player.playerId, parseInt(Math.random() * 9000 + 1000), platform.platformId, "", constSMSPurpose.UPDATE_BANK_INFO, constPlayerRegistrationInterface.BACKSTAGE);
                return dbClientQnA.sendSMSVerificationCode(clientQnA, constSMSPurpose.UPDATE_BANK_INFO);
            }
        ).then(
            (smsSendingResult) => {
                if (!smsSendingResult) {
                    return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
                }

                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.EDIT_BANK_CARD,
                    processNo: "3_1"
                }).lean();
            }
        ).then(
            template => {
                if (template) {
                    template.qnaObjId = clientQnA._id;
                }

                return template;
            }
        );
    },

    editBankCard2_2: (platformObjId, inputDataObj, qnaObjId) => {
        let clientQnA;
        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            qnaObj => {
                if (!qnaObj) {
                    return Promise.reject({message: "QnA object not found."});
                }

                clientQnA = qnaObj;

                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.EDIT_BANK_CARD,
                    processNo: "3_2"
                }).lean();
            }
        ).then(
            template => {
                if (template) {
                    template.qnaObjId = clientQnA._id;
                }

                return template;
            }
        );
    },

    editBankCard3_1: (platformObjId, inputDataObj, qnaObjId) => {
        let clientQnA, player, platform;

        if (!inputDataObj || !inputDataObj.code) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            qnaObj => {
                if (!qnaObj) {
                    return Promise.reject({message: "QnA object not found."});
                }

                clientQnA = qnaObj;

                let playerProm = dbconfig.collection_players.findOne({_id: clientQnA.playerObjId}).lean();
                let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();

                return Promise.all([playerProm, platformProm]);
            }
        ).then(
            data => {
                if (!data || !data[0]) {
                    return Promise.reject({message: "Player not found."});
                }

                if (!data[1]){
                    return Promise.reject({message: "Platform not found."});
                }

                player = data[0];
                platform = data[1];

                return dbPlayerMail.verifySMSValidationCode(player.phoneNumber, platform, inputDataObj.code);
            }
        ).then(
            () => {
                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.EDIT_BANK_CARD,
                    processNo: "4_1"
                }).lean();
            }
        ).then(
            template => {
                if (template) {
                    template.qnaObjId = clientQnA._id;
                }

                if (player.bankAccountName && template.answerInput && template.answerInput[0] && template.answerInput[2] && template.answerInput[3] && template.answerInput[4]) {
                    template.answerInput[0].value = player.bankAccountName;
                    template.answerInput[0].disabled = true;
                    template.answerInput[2].value = player.bankName;
                    template.answerInput[3].value = player.bankAccountProvince;
                    template.answerInput[4].value = player.bankAccountCity;
                    template.answerInput[5].value = player.bankAddress;
                }

                return template;
            }
        );
    },

    editBankCard3_2: (platformObjId, inputDataObj, qnaObjId) => {
        let clientQnA, player, platform;
        let correctAnswer = [];
        let wrongAnswer = [];

        if (!inputDataObj || !dbutility.isNumeric(inputDataObj.lastWithdrawalAmount)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"});
        }

        if (!inputDataObj.phoneNumber || inputDataObj.phoneNumber.length !== 11) {
            return Promise.reject({message: "Phone number must be 11 characters."});
        }

        if (inputDataObj.bankAccount && (inputDataObj.bankAccount.length < 15 || inputDataObj.bankAccount.length > 19)) {
            return Promise.reject({message: "Bank account must in between 15 to 19 digits"});
        }

        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            qnaObj => {
                if (!qnaObj) {
                    return Promise.reject({message: "QnA object not found."});
                }

                clientQnA = qnaObj;

                let playerProm = dbconfig.collection_players.findOne({_id: clientQnA.playerObjId}).lean();
                let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();

                return Promise.all([playerProm, platformProm]);
            }
        ).then(
            data => {
                if (!data || !data[0]) {
                    return Promise.reject({message: "Player not found."});
                }

                if (!data[1]){
                    return Promise.reject({message: "Platform not found."});
                }

                player = data[0];
                platform = data[1];

                return dbconfig.collection_proposal.find({
                    mainType: constProposalMainType["PlayerBonus"],
                    "data.playerObjId": player._id,
                    status: constProposalStatus.SUCCESS
                }).sort({createTime: -1}).limit(1);
            }
        ).then(
            bonusProposalArray => {
                let lastWithdrawalAmount = 0;
                if (bonusProposalArray && bonusProposalArray[0] && bonusProposalArray[0].data && bonusProposalArray[0].data.amount) {
                    lastWithdrawalAmount = bonusProposalArray[0].data.amount;
                }
                console.log('lastWithdrawalAmount', lastWithdrawalAmount)

                if (inputDataObj.phoneNumber == player.phoneNumber) {
                    correctAnswer.push(1);
                } else {
                    wrongAnswer.push(1);
                }

                if ((!inputDataObj.bankAccount && !player.bankAccount) || inputDataObj.bankAccount == player.bankAccount) {
                    correctAnswer.push(2);
                } else {
                    wrongAnswer.push(2);
                }


                if (inputDataObj.lastWithdrawalAmount < (lastWithdrawalAmount + 0.99) && inputDataObj.lastWithdrawalAmount > (lastWithdrawalAmount - 0.99)) {
                    correctAnswer.push(3);
                } else {
                    wrongAnswer.push(3);
                }

                if (wrongAnswer.length > 0) {
                    return dbClientQnA.securityQuestionReject(qnaObjId, correctAnswer, wrongAnswer);
                }

                return dbconfig.collection_clientQnATemplate.findOne({
                    type: constClientQnA.EDIT_BANK_CARD,
                    processNo: "4_1"
                }).lean();
            }
        ).then(
            template => {
                if (template) {
                    template.qnaObjId = clientQnA._id;
                }

                if (player.bankAccountName && template.answerInput && template.answerInput[0] && template.answerInput[2] && template.answerInput[3] && template.answerInput[4]) {
                    template.answerInput[0].value = player.bankAccountName;
                    template.answerInput[0].disabled = true;
                    template.answerInput[2].value = player.bankName;
                    template.answerInput[3].value = player.bankAccountProvince;
                    template.answerInput[4].value = player.bankAccountCity;
                    template.answerInput[5].value = player.bankAddress;
                }

                return template;
            }
        );
    },

    editBankCardResendSMSCode: (platformObjId, inputDataObj, qnaObjId) => {
        return dbconfig.collection_clientQnA.findById(qnaObjId).lean().then(
            qnaObj => {
                // Check player send count
                if (qnaObj && qnaObj.QnAData && qnaObj.QnAData.smsCount && qnaObj.QnAData.smsCount >= 5) {
                    return dbClientQnA.editBankCard2_2(platformObjId, inputDataObj, qnaObjId);
                } else {
                    dbClientQnA.sendSMSVerificationCode(qnaObj, constSMSPurpose.UPDATE_BANK_INFO);
                }
            }
        );
    },

    editBankCard4_1: (platformObjId, inputDataObj, qnaObjId, creator) => {
        let clientQnA, player, platform;

        if (!inputDataObj) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        if (!inputDataObj.bankAccountName) {
            return Promise.reject({message: "Please insert bank account name."})
        }

        if (!inputDataObj.bankAccount) {
            return Promise.reject({message: "Please insert bank account."});
        }

        if (inputDataObj.bankAccount.length < 15 || inputDataObj.bankAccount.length > 19) {
            return Promise.reject({message: "Bank account must in between 15 to 19 digits"});
        }

        if (!inputDataObj.bankType) {
            return Promise.reject({message: "Bank Type is a required field."});
        }

        // if (!inputDataObj.bankAccountType) {
        //     return Promise.reject({message: "Bank Account Type is a required field."});
        // }

        if (!inputDataObj.bankCardProvince || !inputDataObj.bankAccountCity) {
            return Promise.reject({message: "Bank city is a required field"});
        }

        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            qnaObj => {
                if (!qnaObj) {
                    return Promise.reject({message: "QnA object not found."});
                }

                clientQnA = qnaObj;

                let playerProm = dbconfig.collection_players.findOne({_id: clientQnA.playerObjId}).lean();
                let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();

                return Promise.all([playerProm, platformProm]);
            }
        ).then(
            data => {
                if (!data || !data[0]) {
                    return Promise.reject({message: "Player not found."});
                }

                if (!data[1]) {
                    return Promise.reject({message: "Platform not found."});
                }

                player = data[0];
                platform = data[1];

                return isExceedSameBankAccount(inputDataObj.bankAccount, platform, player._id);
            }
        ).then(
            exceedSameBankAccount => {
                if (exceedSameBankAccount) {
                    return Promise.reject({message: "The same bank account has been registered, please change a new bank card or contact our cs, thank you!"});
                }

                return dbProposal.rejectPendingProposalIfAvailable(platformObjId, clientQnA.QnAData.name, constProposalType.UPDATE_PLAYER_BANK_INFO, "; QnA系统取消提案");
            }
        ).then(
            () => {
                let proposalData = {
                    creator: creator,
                    platformId: String(platform._id),
                    data: {
                        _id: String(player._id),
                        playerName: player.name,
                        playerId: player.playerId,
                        bankAccountName: inputDataObj.bankAccountName,
                        bankAccount: inputDataObj.bankAccount,
                        bankName: String(inputDataObj.bankType),
                        bankAccountProvince: inputDataObj.bankCardProvince,
                        bankAccountCity: inputDataObj.bankAccountCity,
                        bankAddress: inputDataObj.bankAddress,
                        isIgnoreAudit: true
                    }
                };
                return dbProposal.createProposalWithTypeNameWithProcessInfo(platform._id, constProposalType.UPDATE_PLAYER_BANK_INFO, proposalData);
            }
        ).then(
            () => {
                let endTitle = "Update Bank Detail Succeed";
                let endDes = "";
                return dbClientQnA.qnaEndMessage(endTitle, endDes)
            }
        );
    },

    //endregion

    //region editName
    editName1: function (platformObjId, inputDataObj) {
        if (!(inputDataObj && inputDataObj.name)) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        let QnAConfig = null;

        return dbconfig.collection_clientQnATemplateConfig.findOne({type: constClientQnA.EDIT_NAME, platform: platformObjId}).lean().then(
            retQnAConfig => {

                if (!retQnAConfig) {
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                if (!retQnAConfig.hasOwnProperty("wrongCount")) {
                    return Promise.reject({name: "DBError", message: "Maximum incorrect count is not found"});
                }

                QnAConfig =  retQnAConfig;

                return dbconfig.collection_players.findOne({platform: platformObjId, name: inputDataObj.name}).populate({
                    path: "platform",
                    model: dbconfig.collection_platform,
                    select: {platformId: 1}
                }).lean();
            }
        ).then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }
                if (playerData.permission && playerData.permission.forbidPlayerFromLogin) {
                    return Promise.reject({name: "DBError", message: "Attention! This player has been forbidden to login"})
                }
                // if (QnAConfig && QnAConfig.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("editName") && playerData.qnaWrongCount.editName > QnAConfig.wrongCount){
                //     let endTitle = "Authentification Failed";
                //     let endDes = "Attention! Contact CS for further instruction";
                //     return dbClientQnA.qnaEndMessage(endTitle, endDes);
                // }

                let updateObj = {
                    type: constClientQnA.EDIT_NAME,
                    platformObjId: platformObjId,
                    playerObjId: playerData._id,
                    QnAData: {
                        name: inputDataObj.name,
                        playerId: playerData.playerId
                    }
                };

                if (playerData.platform && playerData.platform.platformId) {
                    updateObj.QnAData.platformId = playerData.platform.platformId;
                }

                return dbconfig.collection_clientQnA(updateObj).save().then(
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

    editName2: function (platformObjId, inputDataObj, qnaObjId) {
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        if (!inputDataObj || !inputDataObj.phoneNumber){
            return Promise.reject({name: "DBError", message: "Phone number is not available"})
        }

        let QnAConfig = null;
        let clientQnAData = null;

        return dbconfig.collection_clientQnATemplateConfig.findOne({type: constClientQnA.EDIT_NAME, platform: platformObjId}).lean().then(
            QnAConfig => {

                if (!QnAConfig) {
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                if (!QnAConfig.hasOwnProperty("wrongCount")) {
                    return Promise.reject({name: "DBError", message: "Maximum incorrect count is not found"});
                }

                return QnAConfig;
            }
        ).then(
            retQnAConfig => {

                if(!retQnAConfig){
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                QnAConfig = retQnAConfig;

                return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
                    clientQnAData => {
                        if (clientQnAData){
                            return clientQnAData
                        }
                        else{
                            return Promise.reject({name: "DBError", message: "Could not find the QnA data"})
                        }
                    }
                )
            }
        ).then(
            retData => {
                if (!retData){
                    return Promise.reject({name: "DBError", message: "clientQnAData is not found"})
                }

                clientQnAData = retData;

                if (retData && retData.playerObjId) {
                    return dbconfig.collection_players.findOne({platform: platformObjId, _id: retData.playerObjId}).lean()
                }
                else{
                    throw new Error('Player not found');
                }

            }
        ).then(
            playerData => {
                if (!playerData){
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }

                //
                // if (QnAConfig.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("editName") && playerData.qnaWrongCount.editName > QnAConfig.wrongCount){
                //     let endTitle = "Authentification Failed";
                //     let endDes = "Attention! Contact CS for further instruction";
                //     return dbClientQnA.qnaEndMessage(endTitle, endDes);
                // }

                let updateObj = {};

                if (inputDataObj.phoneNumber == playerData.phoneNumber){
                    clientQnAData.QnAData.phoneNumber = playerData.phoneNumber;

                    updateObj.QnAData =clientQnAData.QnAData;

                    return dbClientQnA.updateClientQnAData(null, constClientQnA.EDIT_NAME, updateObj, qnaObjId).then(
                        clientQnARecord => {
                            if (!clientQnARecord) {
                                return Promise.reject({name: "DBError", message: "update QnA data failed"})
                            }

                              return dbClientQnA.sendSMSVerificationCode(clientQnARecord, constSMSPurpose.UPDATE_PLAYER_INFO);
                        }
                    )
                }
                else{
                    return Promise.reject({name: "DBError", message: "Phone number does not match"});
                }
            }
        ).then(
            smsRes => {

                if (smsRes){
                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.EDIT_NAME,
                        processNo: "3"
                    }).lean().then(QnATemplate => {
                        if (QnATemplate) {
                            QnATemplate.qnaObjId = qnaObjId;
                        }

                        return QnATemplate;
                    })
                }

                throw new Error("Max SMS count");
            }
        )
    },

    editName3: function (platformObjId, inputDataObj, qnaObjId, creator){
        if (!inputDataObj) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }

        if (!inputDataObj.smsCode ) {
            return Promise.reject({name: "DBError", message: "Invalid SMS code"})
        }

        if ((inputDataObj && inputDataObj.newName && inputDataObj.newName.match(/\d+/g) !== null) || !inputDataObj.newName){
            return Promise.reject({name: "DBError", message: "Invalid real name"})
        }
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        let clientQnAData = null;

        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            clientQnAData => {
                if (clientQnAData && clientQnAData.QnAData) {

                    if (parseInt(clientQnAData.QnAData.smsCode) == parseInt(inputDataObj.smsCode)) {

                        let updateObj = {
                            $set: {
                                'QnAData.newRealName': inputDataObj.newName || null
                            }
                        };
                        let QnAProm = dbClientQnA.updateClientQnAData(null, constClientQnA.EDIT_NAME, updateObj, qnaObjId);
                        let playerProm = dbconfig.collection_players.findOneAndUpdate({
                            platform: platformObjId,
                            _id: clientQnAData.playerObjId
                        }, {$set: {"qnaWrongCount.editName": 0}}).lean();

                        return Promise.all([QnAProm, playerProm]);
                    }
                    else{
                        return Promise.reject({name: "DBError", message: "The SMS code does not match with the distributed SMS code"})
                    }
                }
            }
        ).then(
            data => {
                if (!data && !data[0]) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }

                let retClientQnARecord = data[0];

                clientQnAData = retClientQnARecord;

                return dbconfig.collection_players.findOne({
                    platform: platformObjId,
                    _id: retClientQnARecord.playerObjId
                }).lean();

            }
        ).then(
            playerData => {
                if (!playerData && !playerData.name) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }

                if (playerData.bankAccount) {

                    let phoneNumber = clientQnAData.QnAData && clientQnAData.QnAData.phoneNumber ? clientQnAData.QnAData.phoneNumber : null;
                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.EDIT_NAME,
                        processNo: "4_2"
                    }).lean().then(QnATemplate => {
                        if (QnATemplate) {
                            QnATemplate.qnaObjId = qnaObjId || clientQnAData._id;
                        }

                        if (phoneNumber){
                            QnATemplate.autoRetrive = {phoneNumber: phoneNumber};
                        }

                        return QnATemplate;
                    });
                }
                else {
                    let endTitle = "Editing name is approved"
                    let endDes = "For security issue, please complete the bank information to facilitate withdrawing process";

                    let realNameObj = {
                        playerName: playerData.name,
                        playerObjId: playerData._id,
                        realName: inputDataObj.newName || null,
                        remark: localization.localization.translate("Editing name (Auto)")
                    };

                    let data = {
                        creator: creator,
                        data: realNameObj,
                        platformId: platformObjId,
                    }

                    return dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PLAYER_REAL_NAME, data).then(
                        () => {

                            return dbconfig.collection_clientQnATemplate.findOne({
                                type: constClientQnA.EDIT_NAME,
                                processNo: "4_1"
                            }).lean().then(QnATemplate => {
                                if (QnATemplate) {
                                    QnATemplate.qnaObjId = qnaObjId || clientQnAData._id;
                                }

                                QnATemplate.updateTitle = localization.localization.translate(endTitle);
                                QnATemplate.updateDes = localization.localization.translate(endDes);

                                QnATemplate.updateLinkageTitle = localization.localization.translate("Complete bank account detail");

                                return QnATemplate;
                            });

                        }
                    )
                }
            }
        )
    },

    editName4_1: function (platformObjId, inputDataObj, qnaObjId, creator){
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        let clientQnAData = null;
        return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean().then(
            retClientQnAData => {
                if (retClientQnAData && retClientQnAData.QnAData && retClientQnAData.QnAData.name){

                    clientQnAData = retClientQnAData;
                    let playerName = clientQnAData.QnAData.name;

                    let newRealName = clientQnAData.QnAData && clientQnAData.QnAData.newRealName ? clientQnAData.QnAData.newRealName : null;

                    return dbconfig.collection_clientQnATemplate.findOne({
                        type: constClientQnA.EDIT_NAME,
                        processNo: "5_1"
                    }).lean().then(QnATemplate => {
                        if (QnATemplate) {
                            QnATemplate.qnaObjId = clientQnAData._id;
                        }

                        if (QnATemplate.updateAnswer){
                            QnATemplate.updateAnswer[0].newRealName = newRealName;


                            QnATemplate.updateTitle = "";
                            QnATemplate.updateDes = localization.localization.translate("To facilitate withdrawing process, please complete your bank information else the previous amendment will not be processed");

                            QnATemplate.updateLinkageTitle = localization.localization.translate("SUBMIT");
                        }

                        return QnATemplate;
                    })
                    // return dbconfig.collection_proposal.find({mainType: constProposalMainType["UpdatePlayer"], 'data.playerName': playerName, 'data.platformId': platformObjId, status: {$nin: [constProposalStatus.APPROVE, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]} }).count();
                }
                else{
                    return Promise.reject({name: "DBError", message: "clientQnAData undefined"})
                }
            }
        )
    },

    editName4: function (platformObjId, inputDataObj, qnaObjId, creator) {

        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        let QnAConfig = null;
        let clientQnAData = null;

        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            retClientQnAData => {

                if (!retClientQnAData) {
                    return Promise.reject({name: "DBError", message: "clientQnATemplate is not found"})
                }

                clientQnAData = retClientQnAData;

                return dbconfig.collection_clientQnATemplateConfig.findOne({
                    type: constClientQnA.EDIT_NAME,
                    platform: platformObjId
                }).lean();
            }
        ).then(
            retQnAConfig => {
                if (!retQnAConfig) {
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                QnAConfig = retQnAConfig;

                return dbconfig.collection_players.findOne({platform: platformObjId, _id: clientQnAData.playerObjId}).lean();
            }
        ).then(
            playerData => {
                if (!playerData){
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                if (QnAConfig.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("editName") && playerData.qnaWrongCount.editName > QnAConfig.wrongCount){
                    let endTitle = "Authentification Failed";
                    let endDes = "Attention! Contact CS for further instruction";
                    return dbClientQnA.qnaEndMessage(endTitle, endDes);
                }

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
    },

    editName4_2: function(platformObjId, inputDataObj, qnaObjId){
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        if (!inputDataObj) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        let validateBoolean = true;
        let correctNumArr = [];
        let incorrectNumArr = [];
        let questionNo = {
            phoneNumber: 1,
            bankAccount: 2,
            lastWithdrawalAmount: 3
        };

        let QnAConfig = null;
        let clientQnAData = null;
        // let updateObj = {};
        let updatePlayerObj = {};
        let proposalData = null;
        let playerData = null;

        return dbconfig.collection_clientQnATemplateConfig.findOne({type: constClientQnA.EDIT_NAME, platform: platformObjId}).lean().then(
            retQnAConfig => {

                if (!retQnAConfig) {
                    return Promise.reject({name: "DBError", message: "QnAConfig is not found"})
                }

                QnAConfig = retQnAConfig;

                return dbconfig.collection_clientQnA.findOne({_id: ObjectId(qnaObjId)}).lean();
            }
        ).then(
            retClientQnAData => {

                if(!retClientQnAData){
                    return Promise.reject({name: "DBError", message: "Could not find the QnA data"});
                }

                clientQnAData = retClientQnAData;
                if(retClientQnAData && retClientQnAData.playerObjId){
                    let proposalProm = dbconfig.collection_proposalType.find({platformId: platformObjId, name: constProposalType.PLAYER_BONUS}).then(
                        proposalType => {
                            if (!proposalType) {
                                return Promise.reject({name: "DBError", message: "proposalType is not found"})
                            }

                            return dbconfig.collection_proposal.findOne({'data.playerObjId': ObjectId(retClientQnAData.playerObjId), type: proposalType[0]._id, status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED, constProposalStatus.APPROVE]}}, {'data.amount': 1}).sort({settleTime: -1}).lean();
                        }
                    );

                    let playerProm = dbconfig.collection_players.findOne({platform: platformObjId, _id: retClientQnAData.playerObjId}).lean();

                    return Promise.all([proposalProm, playerProm])
                }
                else{
                    throw new Error('PlayerObjId is not found')
                }
            }
        ).then(
            data => {
                if (!data || data.length != 2){
                    return Promise.reject({name: "DBError", message: "returned data is not found"})
                }

                proposalData = data[0];
                playerData = data[1];

                let lastWithdrawAmount = 0;
                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }

                if (proposalData && proposalData.data && proposalData.data.amount){
                    lastWithdrawAmount = proposalData.data.amount;
                }

                if (!playerData) {
                    return Promise.reject({name: "DBError", message: "Cannot find player"})
                }

                if (QnAConfig.hasOwnProperty("wrongCount") && playerData.qnaWrongCount && playerData.qnaWrongCount.hasOwnProperty("editName") && playerData.qnaWrongCount.editName > QnAConfig.wrongCount){
                    let endTitle = "Authentification Failed";
                    let endDes = "Attention! Contact CS for further instruction";
                    return dbClientQnA.qnaEndMessage(endTitle, endDes);
                }

                // validate the answer
                if (inputDataObj.phoneNumber && inputDataObj.phoneNumber == playerData.phoneNumber){
                    clientQnAData.QnAData.phoneNumber = inputDataObj.phoneNumber.toString();
                    correctNumArr.push(questionNo.phoneNumber);
                }
                else{
                    incorrectNumArr.push(questionNo.phoneNumber);
                }

                if ((inputDataObj.bankAccount && inputDataObj.bankAccount == playerData.bankAccount) || (!inputDataObj.bankAccount && !playerData.bankAccount)) {
                    clientQnAData.QnAData.bankAccount = inputDataObj.bankAccount || null;
                    correctNumArr.push(questionNo.bankAccount);
                }
                else{
                    incorrectNumArr.push(questionNo.bankAccount);
                }

                // cut-off the decimal of the lasst withdrawal amount for the verification
                if (inputDataObj.hasOwnProperty("lastWithdrawalAmount") && inputDataObj.lastWithdrawalAmount < (lastWithdrawAmount + 0.99) && inputDataObj.lastWithdrawalAmount > (lastWithdrawAmount - 0.99)){
                    clientQnAData.QnAData.lastWithdrawalAmount = inputDataObj.lastWithdrawalAmount;
                    correctNumArr.push(questionNo.lastWithdrawalAmount);
                }
                else{
                    incorrectNumArr.push(questionNo.lastWithdrawalAmount);
                }

                if (correctNumArr.length >= (QnAConfig.minQuestionPass || Object.keys(questionNo).length)){
                    updatePlayerObj = {$set: {"qnaWrongCount.editName": 0}};
                }
                else{
                    updatePlayerObj = {$inc: {"qnaWrongCount.editName": 1}};
                    validateBoolean = false;
                }

                return dbClientQnA.updateClientQnAData(null, constClientQnA.EDIT_NAME, clientQnAData, qnaObjId);
            }
        ).then(
            updateClientQnAData => {
                if (!updateClientQnAData) {
                    return Promise.reject({name: "DBError", message: "update QnA data failed"})
                }

                return dbconfig.collection_players.findOneAndUpdate({
                    _id: playerData._id,
                    platform: platformObjId
                }, updatePlayerObj, {new: true}).lean()
            }
        ).then(
            updatedPlayerData => {
                if (!updatedPlayerData) {
                    return Promise.reject({
                        name: "DBError",
                        message: "Update player QnA wrong count failed"
                    });
                }

                if (QnAConfig.hasOwnProperty("wrongCount") && updatedPlayerData.qnaWrongCount && updatedPlayerData.qnaWrongCount.hasOwnProperty("editName") && updatedPlayerData.qnaWrongCount.editName > QnAConfig.wrongCount){
                    let endTitle = "Authentification Failed";
                    let endDes = "Attention! Contact CS for further instruction";
                    return dbClientQnA.qnaEndMessage(endTitle, endDes);
                }
                else {
                    if(!validateBoolean){
                        return dbClientQnA.securityQuestionReject(clientQnAData.playerObjId, correctNumArr, incorrectNumArr, 'editName');
                    }
                    else{
                        let queryObj = {
                            mainType: "UpdatePlayer",
                            'data.playerName': updatedPlayerData.name,
                            'data.platformId': platformObjId,
                            status: {$in: [constProposalStatus.PENDING, constProposalStatus.CSPENDING]}
                        }

                        // checking if there is waiting-approve UPDATE_PLAYER_INFO proposal
                        return dbconfig.collection_proposal.find(queryObj).count().then(
                            retProposalLength => {
                                // cant find related proposal --> go to next step
                                if (retProposalLength == 0){

                                    // get the bank information
                                    let newRealName = clientQnAData.QnAData && clientQnAData.QnAData.newRealName ? clientQnAData.QnAData.newRealName : null;
                                    let bankAccount = updatedPlayerData.bankAccount || null;
                                    let bankName = updatedPlayerData.bankName || null;
                                    // let bankAccountType = updatedPlayerData.bankAccountType || null;
                                    let bankAccountCity = updatedPlayerData.bankAccountCity || null;
                                    let bankAddress = updatedPlayerData.bankAddress || null;
                                    let bankAccountProvince = updatedPlayerData.bankAccountProvince || null;

                                    return dbconfig.collection_clientQnATemplate.findOne({
                                        type: constClientQnA.EDIT_NAME,
                                        processNo: "5_2"
                                    }).lean().then(QnATemplate => {
                                        if (QnATemplate) {
                                            QnATemplate.qnaObjId = clientQnAData._id;
                                        }

                                        if (QnATemplate.updateAnswer){
                                            QnATemplate.updateAnswer[0].newRealName = newRealName;
                                            QnATemplate.updateAnswer[1].bankAccount = bankAccount;
                                            QnATemplate.updateAnswer[2].bankType = bankName;
                                            QnATemplate.updateAnswer[3].bankCardProvince = bankAccountProvince;
                                            QnATemplate.updateAnswer[4].bankAccountCity = bankAccountCity;
                                            QnATemplate.updateAnswer[5].bankAddress = bankAddress;

                                            QnATemplate.updateTitle = localization.localization.translate("Authentification Passed");
                                            QnATemplate.updateDes = localization.localization.translate("To facilitate withdrawing process, please complete your bank information else the previous amendment will not be processed");

                                            QnATemplate.updateLinkageTitle = localization.localization.translate("SUBMIT");
                                        }

                                        return QnATemplate;
                                    })
                                }
                                // if get the related proposal --> return error msg
                                else{
                                    let endTitle = "Editing name failed";
                                    let endDes = "There is still proposal of updating player information has not been approved yet, please contact CS";
                                    return dbClientQnA.qnaEndMessage(endTitle, endDes);
                                }
                            }
                        )

                    }
                }
            }
        )
    },

    editName5_1: function(platformObjId, inputDataObj, qnaObjId, creator){
        if (!inputDataObj) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        if (!inputDataObj.newRealName || (inputDataObj.newRealName && inputDataObj.newRealName.match(/\d+/g) !== null)) {
            return Promise.reject({name: "DBError", message: "Invalid new real name"})
        }

        if (!inputDataObj.bankAccount || !(inputDataObj.bankAccount.length === 16 || inputDataObj.bankAccount.length === 19)){
            return Promise.reject({name: "DBError", message: "Invalid bank account number! Bank account number has to be in 16-digit or 19-digit"})
        }

        if (!inputDataObj.bankType) {
            return Promise.reject({name: "DBError", message: "Invalid bank type"})
        }

        if (!inputDataObj.bankCardProvince) {
            return Promise.reject({name: "DBError", message: "Invalid bank card province"})
        }

        if (!inputDataObj.bankAccountCity) {
            return Promise.reject({name: "DBError", message: "Invalid bank card city"})
        }

        let clientQnA, player, platform;

        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            qnaObj => {
                if (!qnaObj) {
                    return Promise.reject({message: "QnA object not found."});
                }

                clientQnA = qnaObj;

                if (clientQnA.QnAData && clientQnA.QnAData.bankAccount == inputDataObj.bankAccount){
                    return Promise.resolve(true);
                }

                return dbPlayerInfo.checkDuplicatedBankAccount(inputDataObj.bankAccount, platformObjId);
            }
        ).then(
            retMsg => {
                if (retMsg){
                    let playerProm = dbconfig.collection_players.findOne({_id: clientQnA.playerObjId}).lean();
                    let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();

                    return Promise.all([playerProm, platformProm]);
                }
                else{
                    return Promise.reject({name: "DBError", message: "The same bank account has been registered, please change a new bank card or contact our cs."})
                }
            }
        ).then(
            data => {
                if (!data || !data[0]) {
                    return Promise.reject({message: "Player not found."});
                }

                if (!data[1]) {
                    return Promise.reject({message: "Platform not found."});
                }

                player = data[0];
                platform = data[1];

                return dbProposal.rejectPendingProposalIfAvailable(platformObjId, clientQnA.QnAData.name, constProposalType.UPDATE_PLAYER_BANK_INFO, "; QnA系统取消提案");
            }
        ).then(
            ()=> {
                let proposalData = {
                    creator: creator,
                    platformId: String(platform._id),
                    data: {
                        _id: String(player._id),
                        playerName: player.name,
                        playerId: player.playerId,
                        bankAccountName: inputDataObj.newRealName,
                        bankAccount: inputDataObj.bankAccount,
                        bankName: String(inputDataObj.bankType),
                        // bankAccountType: inputDataObj.bankAccountType,
                        bankAccountCity: inputDataObj.bankAccountCity,
                        bankAddress: inputDataObj.bankAddress,
                        bankAccountProvince: inputDataObj.bankCardProvince,
                        remark: localization.localization.translate("Edit bank card (Auto)")
                    },

                };
                return dbProposal.createProposalWithTypeNameWithProcessInfo(platform._id, constProposalType.UPDATE_PLAYER_BANK_INFO, proposalData);
            }
        ).then(
            () => {
                let endTitle = "Editing bank information is successful";
                let endDes = "";
                return dbClientQnA.qnaEndMessage(endTitle, endDes);
            }
        )

    },

    editName5_2: function (platformObjId, inputDataObj, qnaObjId, creator) {
        if (!inputDataObj) {
            return Promise.reject({name: "DBError", message: "Invalid Data"})
        }
        if (!qnaObjId) {
            return Promise.reject({name: "DBError", message: "qnaObjId undefined"})
        }

        if (!inputDataObj.newRealName || (inputDataObj.newRealName && inputDataObj.newRealName.match(/\d+/g) !== null)) {
            return Promise.reject({name: "DBError", message: "Invalid new real name"})
        }

        if (!inputDataObj.bankAccount || !(inputDataObj.bankAccount.length === 16 || inputDataObj.bankAccount.length === 19)){
            return Promise.reject({name: "DBError", message: "Invalid bank account number! Bank account number has to be in 16-digit or 19-digit"})
        }

        if (!inputDataObj.bankType) {
            return Promise.reject({name: "DBError", message: "Invalid bank type"})
        }

        if (!inputDataObj.bankCardProvince) {
            return Promise.reject({name: "DBError", message: "Invalid bank card province"})
        }

        if (!inputDataObj.bankAccountCity) {
            return Promise.reject({name: "DBError", message: "Invalid bank card city"})
        }

        let clientQnA, player, platform;

        return dbconfig.collection_clientQnA.findOne({_id: qnaObjId}).lean().then(
            qnaObj => {
                if (!qnaObj) {
                    return Promise.reject({message: "QnA object not found."});
                }

                clientQnA = qnaObj;

                if (clientQnA.QnAData && clientQnA.QnAData.bankAccount == inputDataObj.bankAccount){
                    return Promise.resolve(true);
                }

                return dbPlayerInfo.checkDuplicatedBankAccount(inputDataObj.bankAccount, platformObjId);
            }
        ).then(
            retMsg => {
                if (retMsg){
                    let playerProm = dbconfig.collection_players.findOne({_id: clientQnA.playerObjId}).lean();
                    let platformProm = dbconfig.collection_platform.findOne({_id: platformObjId}).lean();

                    return Promise.all([playerProm, platformProm]);
                }
                else{
                    return Promise.reject({name: "DBError", message: "The same bank account has been registered, please change a new bank card or contact our cs."})
                }
            }
        ).then(
            data => {
                if (!data || !data[0]) {
                    return Promise.reject({message: "Player not found."});
                }

                if (!data[1]){
                    return Promise.reject({message: "Platform not found."});
                }

                player = data[0];
                platform = data[1];

                let proposalData = {
                    creator: creator,
                    platformId: String(platform._id),
                    data: {
                        _id: String(player._id),
                        playerName: player.name,
                        playerId: player.playerId,
                        bankAccountName: inputDataObj.newRealName,
                        bankAccount: inputDataObj.bankAccount,
                        bankName: String(inputDataObj.bankType),
                        // bankAccountType: inputDataObj.bankAccountType,
                        bankAccountCity: inputDataObj.bankAccountCity,
                        bankAddress: inputDataObj.bankAddress,
                        bankAccountProvince: inputDataObj.bankCardProvince,
                        remark: localization.localization.translate("Edit bank card (Auto)")
                    }
                };
                return dbProposal.createProposalWithTypeNameWithProcessInfo(platform._id, constProposalType.UPDATE_PLAYER_BANK_INFO, proposalData);
            }
        ).then(
            () => {

                let realNameObj = {
                    playerName: player.name,
                    playerObjId: player._id,
                    realName: clientQnA.QnAData && clientQnA.QnAData.newRealName ?  clientQnA.QnAData.newRealName :  inputDataObj.newRealName,
                    remark: localization.localization.translate("Editing name (Auto)")
                };

                let data = {
                    creator: creator,
                    data: realNameObj,
                    platformId: platformObjId,
                };

                return dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PLAYER_REAL_NAME, data)

            }
        ).then(
            () => {
                let endTitle = "Editing name and bank information are successful";
                let endDes = "";
                return dbClientQnA.qnaEndMessage(endTitle, endDes);
            }
        )

    },

    editNameResendSMSCode: function (platformObjId, inputDataObj, qnaObjId) {
        return dbconfig.collection_clientQnA.findById(qnaObjId).lean().then(
            qnaObj => {

                // Check player send count
                if (qnaObj && qnaObj.QnAData && qnaObj.QnAData.smsCount && qnaObj.QnAData.smsCount >= 5) {
                    return dbClientQnA.editName4(platformObjId, inputDataObj, qnaObjId);
                    // return dbClientQnA.rejectFailedRetrieveAccount();
                } else {
                    return dbClientQnA.sendSMSVerificationCode(qnaObj, constSMSPurpose.UPDATE_PLAYER_INFO).then(
                        smsRes => {
                            if (!smsRes) {
                                return dbClientQnA.rejectSMSCountMoreThanFiveInPastHour();
                            }
                        }
                    );
                }
            }
        );
    },

    //endregion
};

function isExceedSameBankAccount(bankAccount, platformData, playerObjId) {
    if (!platformData || !platformData.sameBankAccountCount) {
        return false;
    }

    let query = {
        bankAccount: bankAccount,
        platform: platformData._id,
        'permission.forbidPlayerFromLogin': false
    };

    if (playerObjId) {
        query._id = {$ne: playerObjId};
    }

    return dbconfig.collection_players.find(query, {_id:1}).lean().then(
        bankAccount => {
            let bankAccountCount = bankAccount && bankAccount.length || 0;
            return Boolean(bankAccountCount && bankAccountCount >= platformData.sameBankAccountCount);
        }
    )
}

var proto = dbClientQnAFunc.prototype;
proto = Object.assign(proto, dbClientQnA);

// This make WebStorm navigation work
module.exports = dbClientQnA;
