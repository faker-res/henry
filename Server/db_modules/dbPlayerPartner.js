'use strict';

let Q = require("q");
let rsaCrypto = require("../modules/rsaCrypto");

const constServerCode = require('../const/constServerCode');
const constShardKeys = require('../const/constShardKeys');

let dbConfig = require('../modules/dbproperties');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbPartner = require('./../db_modules/dbPartner');
let dbUtility = require('./../modules/dbutility');

let dbPlayerPartner = {
    createPlayerPartnerAPI: registerData => {
        let platformObj;

        return dbConfig.collection_platform.findOne({
            platformId: registerData.platformId
        }).lean().then(
            platformData => {
                platformObj = platformData;

                // Check if platform exist
                if (!platformData) {
                    return Q.reject({
                        status: constServerCode.INVALID_PLATFORM,
                        name: "DBError",
                        message: "Platform does not exist"
                    });
                }

                // Check if referral exist
                if (registerData.referral) {
                    let referralName = platformData.prefix + registerData.referral;

                    return dbConfig.collection_players.findOne({
                        name: referralName.toLowerCase(),
                        platform: platformData._id
                    }).lean();
                }
                else {
                    return true;
                }
            }
        ).then(
            referralData => {
                if (referralData) {
                    // Referral is valid
                    // Check if platform sms verification is required
                    if (!platformObj.requireSMSVerification) {
                        // SMS verification not required
                        let plyProm = dbPlayerInfo.createPlayerInfoAPI(registerData);
                        let pRegisterData = Object.assign({}, registerData);
                        let partnerProm = dbPartner.createPartnerAPI(pRegisterData);
                        return Promise.all([plyProm, partnerProm]);
                    }
                    else {
                        let smsProm = dbConfig.collection_smsVerificationLog.findOne({
                            platformId: registerData.platformId,
                            tel: registerData.phoneNumber
                        }).sort({createTime: -1});

                        return smsProm.then(
                            verificationSMS => {
                                // Check verification SMS code
                                if ((registerData.captcha && !registerData.smsCode) || (verificationSMS && verificationSMS.code && verificationSMS.code === registerData.smsCode)) {
                                    verificationSMS = verificationSMS || {};
                                    return dbConfig.collection_smsVerificationLog.remove({
                                        _id: verificationSMS._id
                                    }).then(
                                        retData => {
                                            let plyProm = dbPlayerInfo.createPlayerInfoAPI(registerData);
                                            let partnerProm = dbPartner.createPartnerAPI(registerData);

                                            return Promise.all([plyProm, partnerProm]);
                                        }
                                    );
                                }
                                else {
                                    // Verification code is invalid
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
                else {
                    // Invalid referral
                    return Q.reject({
                        status: constServerCode.INVALID_REFERRAL,
                        name: "ValidationError",
                        message: "Invalid referral"
                    });
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
    },

    /**
     * Steps:
     *  1. Get current platform detail
     *  2. Get current player info
     *  3. Check if number has already registered on platform
     *  4. Check if smsCode is matched
     *  5. Update player data
     * @param platformId
     * @param userId - playerId or partnerId
     * @param newPhoneNumber
     * @param smsCode
     * @param targetType - 0: Player, 1: Partner, 2: Player Partner
     */
    updatePhoneNumberWithSMS: function (platformId, userId, newPhoneNumber, smsCode, targetType) {
        let platformObjId = null;
        let curPhoneNumber = null;
        let newEncrpytedPhoneNumber = null;
        let playerData = null;
        let partnerData = null;

        // 1. Get current platform detail
        return dbConfig.collection_platform.findOne({
            platformId: platformId,
        }).then(
            platformData => {
                platformObjId = platformData._id;
                if (platformData) {
                    // 2. Get current player and/or partner info
                    let plyProm = dbConfig.collection_players.findOne({
                        platform: platformObjId,
                        playerId: userId
                    });
                    let partnerProm = dbConfig.collection_partner.findOne({
                        platform: platformObjId,
                        partnerId: userId
                    });

                    switch (targetType) {
                        case 0:
                            return plyProm;
                        case 1:
                            return partnerProm;
                        case 2:
                            let _playerData = null;
                            return plyProm.then(
                                playerData => {
                                    _playerData = playerData;
                                    return dbConfig.collection_partner.findOne({player: playerData._id}).lean();
                                }
                            ).then(
                                partnerData => [_playerData, partnerData]
                            )
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find platform"
                    });
                }
            }
        ).then(
            userData => {
                if (userData) {
                    // 3. Check if number has already registered on platform
                    newEncrpytedPhoneNumber = rsaCrypto.encrypt(String(newPhoneNumber));

                    let plyProm = dbConfig.collection_players.findOne({
                        platform: platformObjId,
                        phoneNumber: newEncrpytedPhoneNumber
                    });
                    let partnerProm = dbConfig.collection_partner.findOne({
                        platform: platformObjId,
                        $or: [
                            {phoneNumber: newPhoneNumber},
                            {phoneNumber: newEncrpytedPhoneNumber}
                        ]
                    });

                    switch (targetType) {
                        case 0:
                            playerData = userData;
                            curPhoneNumber = playerData.phoneNumber;
                            return plyProm;
                        case 1:
                            partnerData = userData;
                            curPhoneNumber = partnerData.phoneNumber;
                            return partnerProm;
                        case 2:
                            playerData = userData[0];
                            partnerData = userData[1];
                            // for player partner, phone number is suppose to be the same
                            curPhoneNumber = playerData.phoneNumber;
                            return Promise.all([plyProm, partnerProm]);
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find user"
                    });
                }
            }
        ).then(
            playerData => {
                if (!playerData || (!playerData[0] && !playerData[1])) {
                    // 4. Check if smsCode is matched
                    return dbConfig.collection_smsVerificationLog.findOne({
                        platformObjId: platformObjId,
                        tel: curPhoneNumber
                    }).sort({createTime: -1}).then(
                        verificationSMS => {
                            // Check verification SMS code
                            if (verificationSMS && verificationSMS.code && verificationSMS.code == smsCode) {
                                verificationSMS = verificationSMS || {};
                                return dbConfig.collection_smsVerificationLog.remove(
                                    {_id: verificationSMS._id}
                                ).then(
                                    () => {
                                        return Q.resolve(true);
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
                else {
                    return Q.reject({
                        status: constServerCode.INVALID_PHONE_NUMBER,
                        name: "ValidationError",
                        message: "Phone number already registered on platform"
                    });
                }
            }
        ).then(
            result => {
                if (result) {
                    let queryPlayer = {
                        platform: platformObjId,
                        playerId: playerData ? playerData.playerId : null
                    };
                    let queryPartner = {
                        platform: platformObjId,
                        partnerId: partnerData ? partnerData.partnerId : null
                    };
                    let updateData = {
                        phoneNumber: newEncrpytedPhoneNumber
                    };
                    let plyProm = dbUtility.findOneAndUpdateForShard(dbConfig.collection_players, queryPlayer, updateData, constShardKeys.collection_players);
                    let partnerProm = dbUtility.findOneAndUpdateForShard(dbConfig.collection_partner, queryPartner, updateData, constShardKeys.collection_partner);

                    switch (targetType) {
                        case 0:
                            return plyProm;
                        case 1:
                            return partnerProm;
                        case 2:
                            return Promise.all([plyProm, partnerProm]);
                    }
                }
            }
        );
    },

    /**
     * Steps:
     *  1. Get player info
     *  2. Get partner info
     *  3. Get platform info
     *  4. Check if platform sms verification is required
     *  5. Update player and partner data
     * @param playerQuery
     * @param updateData
     */
    updatePaymentInfo: function (playerQuery, updateData) {
        let playerObj = null;
        let partnerQuery = null;
        // 1. Get player info
        return dbConfig.collection_players.findOne(playerQuery).lean().then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;

                    // 2. Get partner info
                    return dbConfig.collection_partner.findOne({player: playerData._id}).lean();
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find player"
                    })
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    partnerQuery = {
                        _id: partnerData._id,
                        platform: partnerData.platform
                    };
                    // Check whether player and partner queried is from same platform
                    if (String(playerObj.platform) == String(partnerData.platform)) {
                        // 3. Get platform info
                        return dbConfig.collection_platform.findOne({
                            _id: playerObj.platform
                        }).lean();
                    }
                    else {
                        return Q.reject({
                            name: "DataError",
                            code: constServerCode.DATA_INVALID,
                            message: "Player and partner does not match"
                        });
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find partner"
                    });
                }
            }
        ).then(
            platformData => {
                if (platformData) {
                    // 4. Check if platform sms verification is required
                    if (!platformData.requireSMSVerification) {
                        // SMS verification not required
                        return Q.resolve(true);
                    } else {
                        // Check verification SMS match
                        return dbConfig.collection_smsVerificationLog.findOne({
                            platformObjId: playerObj.platform,
                            tel: playerObj.phoneNumber
                        }).sort({createTime: -1}).then(
                            verificationSMS => {
                                // Check verification SMS code
                                if (verificationSMS && verificationSMS.code && verificationSMS.code == updateData.smsCode) {
                                    verificationSMS = verificationSMS || {};
                                    return dbConfig.collection_smsVerificationLog.remove(
                                        {_id: verificationSMS._id}
                                    ).then(
                                        () => {
                                            return Q.resolve(true);
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
                else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find platform"
                    })
                }
            }
        ).then(
            isVerified => {
                if (isVerified) {
                    // 5. Update player and partner data
                    let plyProm = dbUtility.findOneAndUpdateForShard(dbConfig.collection_players, playerQuery, updateData, constShardKeys.collection_players);
                    let partnerProm = dbUtility.findOneAndUpdateForShard(dbConfig.collection_partner, partnerQuery, updateData, constShardKeys.collection_partner);

                    return Promise.all([plyProm, partnerProm]);
                }
            }
        )
    }
};

module.exports = dbPlayerPartner;
