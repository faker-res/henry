'use strict';

let Q = require("q");

let constServerCode = require('../const/constServerCode');

let dbConfig = require('../modules/dbproperties');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbPartner = require('./../db_modules/dbPartner');


let dbPlayerPartner = {
    createPlayerPartnerAPI:
        registerData => {
            return dbConfig.collection_platform.findOne({
                platformId: registerData.platformId
            }).lean().then(
                platformData => {
                    // Check if platform sms verification is required
                    if (!platformData.requireSMSVerification) {
                        // SMS verification not required
                        let plyProm = dbPlayerInfo.createPlayerInfoAPI(registerData);
                        let partnerProm = dbPartner.createPartnerAPI(registerData);

                        return Promise.all([plyProm, partnerProm]);
                    } else {
                        let smsProm = dbConfig.collection_smsVerificationLog.findOne({
                            platformId: registerData.platformId,
                            tel: registerData.phoneNumber
                        }).sort({createTime: -1});

                        return smsProm.then(
                            verificationSMS => {
                                // Check verification SMS code
                                if ( (registerData.captcha && !registerData.smsCode) || (verificationSMS && verificationSMS.code && verificationSMS.code === registerData.smsCode)) {
                                    let plyProm = dbPlayerInfo.createPlayerInfoAPI(registerData);
                                    let partnerProm = dbPartner.createPartnerAPI(registerData);
                                    verificationSMS = verificationSMS || {};
                                    return dbConfig.collection_smsVerificationLog.remove(
                                        {_id: verificationSMS._id}
                                    ).then(
                                        data => {
                                            return Promise.all([plyProm, partnerProm]);
                                        }
                                    )
                                }
                                else {
                                    return Q.reject({
                                        status: constServerCode.VALIDATION_CODE_INVALID,
                                        name: "ValidationError",
                                        message: "Invalid SMS Validation Code"
                                    });
                                }
                            }
                        )
                    }
                }
            ).then(
                promsData => {
                    //todo:: add the binding later
                    // return dbPartner.bindPartnerPlayer(promsData[1].partnerId, promsData[0].name).then(
                    //     () => {
                    //         return promsData;
                    //     }
                    // )
                    return promsData;
                }
            ).catch(
                error => {
                    return Q.reject({
                        status: constServerCode.DB_ERROR,
                        name: "DBError",
                        message: error.message
                    });
                }
            )
        },

    loginPlayerPartnerAPI:
        (loginData, ua) => {
            let plyProm = dbPlayerInfo.playerLogin(loginData, ua);
            let partnerProm = dbPartner.partnerLoginAPI(loginData, ua);

            return Promise.all([plyProm, partnerProm])
            .catch(
                error => {
                    return Q.reject({
                        status: constServerCode.DB_ERROR,
                        name: "DBError",
                        message: error.message
                    });
                }
            )
        },

    logoutPlayerPartnerAPI:
        (logoutData) => {
            let plyProm = dbPlayerInfo.playerLogout(logoutData);
            let partnerProm = dbPartner.partnerLogout(logoutData);

            return Promise.all([plyProm, partnerProm])
            .catch(
                error => {
                    return Q.reject({
                        status: constServerCode.DB_ERROR,
                        name: "DBError",
                        message: error.message
                    });
                }
            )
        },

    getPlayerPartnerAPI:
        data => {
            let plyProm = dbPlayerInfo.getPlayerInfoAPI({playerId: data.playerId});
            let partnerProm = dbPartner.getPartner({partnerId: data.partnerId});

            return Promise.all([plyProm, partnerProm])
            .catch(
                error => {
                    return Q.reject({
                        status: constServerCode.DB_ERROR,
                        name: "DBError",
                        message: error.message
                    });
                }
            )
        },

    authenticatePlayerPartner:
        (playerId, partnerId, token, playerIp, conn) => {
            let plyProm = dbPlayerInfo.authenticate(playerId, token, playerIp, conn);
            let partnerProm = dbPartner.authenticate(partnerId, token, playerIp, conn);

            return Promise.all([plyProm, partnerProm])
            .catch(
                error => {
                    return Q.reject({
                        status: constServerCode.DB_ERROR,
                        name: "DBError",
                        message: error.message
                    });
                }
            )
        }
};

module.exports = dbPlayerPartner;
