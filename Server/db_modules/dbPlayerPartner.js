'use strict';

let Q = require("q");

const constServerCode = require('../const/constServerCode');

let dbConfig = require('../modules/dbproperties');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbPartner = require('./../db_modules/dbPartner');

let dbPlayerPartner = {
    createPlayerPartnerAPI: registerData => {
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
                            if ((registerData.captcha && !registerData.smsCode) || (verificationSMS && verificationSMS.code && verificationSMS.code === registerData.smsCode)) {
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
                let playerData = promsData[0];
                let partnerData = promsData[1];

                return dbConfig.collection_partner.findOneAndUpdate(
                    {_id: partnerData._id, platform: partnerData.platform},
                    {player: playerData._id},
                    {new: true}
                ).lean().then(
                    partnerData => [promsData[0], partnerData]
                )
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

    loginPlayerPartnerAPI: (loginData, ua) => {
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

    loginPlayerPartnerWithSMSAPI: (loginData, ua) => {
        let isSMSVerified = false;
        let rejectMsg = {
            status: constServerCode.VALIDATION_CODE_INVALID,
            name: "ValidationError",
            message: "Invalid SMS Validation Code"
        };

        // Check matched verification code
        let smsProm = dbConfig.collection_smsVerificationLog.findOne({
            platformId: loginData.platformId,
            tel: loginData.phoneNumber
        }).sort({createTime: -1});

        return smsProm.then(
            verificationSMS => {
                // Check verification SMS code
                if (verificationSMS && verificationSMS.code) {
                    if (verificationSMS.code == loginData.smsCode) {
                        // Verified
                        return dbConfig.collection_smsVerificationLog.remove(
                            {_id: verificationSMS._id}
                        ).then(
                            data => {
                                isSMSVerified = true;
                                let plyProm = dbPlayerInfo.playerLoginWithSMS(loginData, ua, isSMSVerified);
                                let partnerProm = dbPartner.partnerLoginWithSMSAPI(loginData, ua, isSMSVerified);

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
                        )
                    }
                    else {
                        // Not verified
                        if (verificationSMS.loginAttempts >= 10) {
                            // Safety - remove sms verification code after 10 attempts to prevent brute force attack
                            return dbConfig.collection_smsVerificationLog.remove(
                                {_id: verificationSMS._id}
                            ).then(() => {
                                return Q.reject(rejectMsg);
                            });
                        }
                        else {
                            return dbConfig.collection_smsVerificationLog.findOneAndUpdate(
                                {_id: verificationSMS._id},
                                {$inc: {loginAttempts: 1}}
                            ).then(() => {
                                return Q.reject(rejectMsg);
                            });
                        }
                    }
                }
                else {
                    return Q.reject(rejectMsg);
                }
            }
        )
    },

    logoutPlayerPartnerAPI: (logoutData) => {
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

    getPlayerPartnerAPI: data => {
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

    authenticatePlayerPartner: (playerId, partnerId, token, playerIp, conn) => {
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
    },

    updatePasswordPlayerPartner: (playerId, partnerId, oldPassword, newPassword, smsCode) => {
        let plyProm = dbPlayerInfo.updatePassword(playerId, oldPassword, newPassword, smsCode);
        let partnerProm = dbPartner.updatePassword(partnerId, oldPassword, newPassword, smsCode);

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
