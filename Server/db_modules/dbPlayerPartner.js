'use strict';

let Q = require("q");
let rsaCrypto = require("../modules/rsaCrypto");

const constServerCode = require('../const/constServerCode');
const constShardKeys = require('../const/constShardKeys');
const constProposalType = require('../const/constProposalType');
const constSMSPurpose = require('../const/constSMSPurpose');
const constProposalStatus = require('../const/constProposalStatus');

let dbConfig = require('../modules/dbproperties');
let dbUtility = require('./../modules/dbutility');
let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
let dbPartner = require('./../db_modules/dbPartner');
let dbProposal = require('./../db_modules/dbProposal');
let dbLogger = require('./../modules/dbLogger');
let dbPlayerMail = require('../db_modules/dbPlayerMail');
let errorUtils = require('./../modules/errorUtils');
let queryPhoneLocation = require('cellocate');

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
                    let pRegisterData = Object.assign({}, registerData);
                    pRegisterData.partnerName = registerData.name;
                    if (!platformObj.requireSMSVerification) {
                        // SMS verification not required
                        let plyProm = dbPlayerInfo.createPlayerInfoAPI(registerData, true);
                        let partnerProm = dbPartner.createPartnerAPI(pRegisterData);
                        return Promise.all([plyProm, partnerProm]);
                    }
                    else {
                        return dbPlayerMail.verifySMSValidationCode(registerData.phoneNumber, platformObj, registerData.smsCode).then(() => {
                            let plyProm = dbPlayerInfo.createPlayerInfoAPI(registerData, true);
                            let partnerProm = dbPartner.createPartnerAPI(pRegisterData);

                            return Promise.all([plyProm, partnerProm]);
                        });
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

    createPlayerPartner: function (registerData) {
        let pRegisterData = Object.assign({}, registerData);
        pRegisterData.partnerName = registerData.name;

        let plyProm = dbPlayerInfo.createPlayerInfo(registerData);
        let partnerProm = dbPartner.createPartner(pRegisterData);

        return Promise.all([plyProm, partnerProm]).then(
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
        );
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
                                dbLogger.logUsedVerificationSMS(verificationSMS.tel, verificationSMS.code);
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
    updatePhoneNumberWithSMS: function (userAgent, platformId, userId, newPhoneNumber, smsCode, targetType) {
        let platformObjId = null;
        let curPhoneNumber = null;
        let newEncrpytedPhoneNumber = null;
        let playerData = null;
        let partnerData = null;
        let platform;
        let verificationSmsDetail;
        let smsLogDetail;
        let phoneProvince, phoneCity, phoneType;
        newPhoneNumber = newPhoneNumber || "";
        // 1. Get current platform detail
        return dbConfig.collection_platform.findOne({
            platformId: platformId,
        }).then(
            platformData => {
                platform = platformData;
                platformObjId = platformData._id;
                if (platformData) {
                    // 2. Get current player and/or partner info
                    let plyProm = dbConfig.collection_players.findOne({
                        platform: platformObjId,
                        playerId: userId
                    }).lean();
                    let partnerProm = dbConfig.collection_partner.findOne({
                        platform: platformObjId,
                        partnerId: userId
                    }).lean();

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
                // block action if it is Demo player
                if (userData && !userData.isRealPlayer && targetType === '2') {
                    return Q.reject({
                        name: "DataError",
                        message: "Demo player cannot perform this action"
                    })
                }
                if (userData) {
                    // 3. Check if number has already registered on platform
                    let promises = [];
                    newEncrpytedPhoneNumber = rsaCrypto.encrypt(String(newPhoneNumber));
                    let oldEnPhoneNumber = rsaCrypto.oldEncrypt(String(newPhoneNumber));

                    let plyProm = dbConfig.collection_players.findOne({
                        platform: platformObjId,
                        phoneNumber: newEncrpytedPhoneNumber,
                        'permission.forbidPlayerFromLogin': false
                    }).lean();
                    let partnerProm = dbConfig.collection_partner.findOne({
                        platform: platformObjId,
                        'permission.forbidPartnerFromLogin': false,
                        $or: [
                            {phoneNumber: newPhoneNumber},
                            {phoneNumber: newEncrpytedPhoneNumber},
                            {phoneNumber: oldEnPhoneNumber}
                        ]
                    }).lean();

                    if (!newPhoneNumber) {
                        plyProm = Promise.resolve();
                        partnerProm = Promise.resolve();
                    }

                    switch (targetType) {
                        case 0:
                            playerData = userData;
                            curPhoneNumber = playerData.phoneNumber;
                            promises.push(Promise.all([plyProm]));
                            if (!newPhoneNumber) {
                                let smsLogProm = dbConfig.collection_smsLog.find({recipientName: playerData.name, purpose: constSMSPurpose.NEW_PHONE_NUMBER}).sort({_id:-1}).limit(1).lean();
                                promises.push(smsLogProm);
                            }
                            break;
                        case 1:
                            partnerData = userData;
                            curPhoneNumber = partnerData.phoneNumber;
                            promises.push(Promise.all([partnerProm]));
                            if (!newPhoneNumber) {
                                let smsLogProm = dbConfig.collection_smsLog.find({recipientName: partnerData.partnerName, purpose: constSMSPurpose.PARTNER_NEW_PHONE_NUMBER}).sort({_id:-1}).limit(1).lean();
                                promises.push(smsLogProm);
                            }
                            break;
                        case 2:
                            playerData = userData[0];
                            partnerData = userData[1];
                            // for player partner, phone number is suppose to be the same
                            curPhoneNumber = playerData.phoneNumber;
                            promises.push(Promise.all([plyProm, partnerProm]));
                            if (!newPhoneNumber) {
                                let smsLogProm = dbConfig.collection_smsLog.find({recipientName: playerData.name, purpose: constSMSPurpose.NEW_PHONE_NUMBER}).sort({_id:-1}).limit(1).lean();
                                promises.push(smsLogProm);
                            }
                            break;
                    }

                    return Promise.all(promises);
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
            async data => {
                if (!data) {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find user"
                    });
                }

                let phoneAlreadyExist = data[0];
                if (phoneAlreadyExist && (phoneAlreadyExist[0] || phoneAlreadyExist[1])) {

                    if (platform.whiteListingPhoneNumbers
                        && platform.whiteListingPhoneNumbers.length > 0
                        && newPhoneNumber
                        && platform.whiteListingPhoneNumbers.indexOf(newPhoneNumber.toString()) > -1) {
                        //bypass error
                    }else {
                        return Q.reject({
                            status: constServerCode.INVALID_PHONE_NUMBER,
                            name: "ValidationError",
                            message: "This phone number is already used. Please insert other phone number."
                        });
                    }
                }

                let verificationPhone = newPhoneNumber ? newPhoneNumber : curPhoneNumber;

                if (!newPhoneNumber) {
                    if (data[1] && data[1][0] && data[1][0].tel) {
                        newPhoneNumber = data[1][0].tel;
                        verificationPhone = data[1][0].tel;
                        newEncrpytedPhoneNumber = rsaCrypto.encrypt(String(data[1][0].tel));

                        if (playerData) {
                            let checkCount = await dbPlayerInfo.isPhoneNumberExist(newPhoneNumber, platformObjId);
                            console.log('checkCount', checkCount);

                            if (checkCount && checkCount.length && checkCount.indexOf(playerData.name) === -1) {
                                if (platform.allowSamePhoneNumberToRegister === true) {
                                    if (checkCount.length > platform.samePhoneNumberRegisterCount) {
                                        return Promise.reject({
                                            status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                                            name: "ValidationError",
                                            message: "This phone number is already used. Please insert other phone number."
                                        })
                                    }
                                } else {
                                    return Promise.reject({
                                        status: constServerCode.PHONENUMBER_ALREADY_EXIST,
                                        name: "ValidationError",
                                        message: "This phone number is already used. Please insert other phone number."
                                    })
                                }
                            }
                        }
                    }
                    else {
                        return Promise.reject({
                            status: constServerCode.INVALID_PHONE_NUMBER,
                            name: "ValidationError",
                            message: "This phone number is already used. Please insert other phone number."
                        });
                    }
                }

                return dbPlayerMail.verifySMSValidationCode(verificationPhone, platform, smsCode);
            }
        ).then(
            result => {
                if (result) {
                    verificationSmsDetail = result;
                    if(verificationSmsDetail.tel && verificationSmsDetail.code){
                        smsLogDetail = {tel: verificationSmsDetail.tel, message: verificationSmsDetail.code};
                    }
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
                    if (newPhoneNumber) {
                        let phoneLocation = queryPhoneLocation(newPhoneNumber);
                        if (phoneLocation) {
                            updateData.phoneProvince = phoneLocation.province;
                            updateData.phoneCity = phoneLocation.city;
                            updateData.phoneType = phoneLocation.sp;
                            phoneProvince = phoneLocation.province;
                            phoneCity = phoneLocation.city;
                            phoneType = phoneLocation.sp;
                        }
                    }
                    let plyProm, partnerProm;

                    if (playerData) {
                        plyProm = dbUtility.findOneAndUpdateForShard(dbConfig.collection_players, queryPlayer, updateData, constShardKeys.collection_players);
                    }

                    if (partnerData) {
                        partnerProm = dbUtility.findOneAndUpdateForShard(dbConfig.collection_partner, queryPartner, updateData, constShardKeys.collection_partner);
                    }

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
        ).then(
            result => {
                // data.data.playerObjId && data.data.playerName && data.data.curData &&
                // data.data.updateData && data.data.updateData.phoneNumber
                let player, partner, playerUpdateData, partnerUpdateData, creator;
                let updatePhoneNumber = newPhoneNumber;
                updatePhoneNumber = updatePhoneNumber.toString();
                let inputDevice = 0;
                switch (targetType) {
                    case 0:
                        inputDevice = dbUtility.getInputDevice(userAgent,false);
                        player = result;
                        playerUpdateData = {
                            isPlayerInit: true,
                            playerObjId: player._id,
                            playerName: player.name,
                            updateData: {
                                phoneNumber: updatePhoneNumber
                            },
                            curData: {
                                phoneNumber: dbUtility.encodePhoneNum(curPhoneNumber)
                            }

                        };
                        if (phoneProvince || phoneCity || phoneType) {
                            playerUpdateData.updateData.phoneProvince = phoneProvince;
                            playerUpdateData.updateData.phoneCity = phoneCity;
                            playerUpdateData.updateData.phoneType = phoneType;
                        }
                        // result.isPlayerInit = true;
                        return dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PLAYER_PHONE, {
                            data: playerUpdateData,
                            inputDevice: inputDevice
                        }, smsLogDetail).catch(errorUtils.reportError);
                        break;
                    case 1:
                        inputDevice = dbUtility.getInputDevice(userAgent,true);
                        partner = result;
                        partnerUpdateData = {
                            isPlayerInit: true,
                            partnerObjId: partner._id,
                            partnerName: partner.partnerName,
                            updateData: {
                                phoneNumber: updatePhoneNumber
                            }

                        };
                        if (phoneProvince || phoneCity || phoneType) {
                            partnerUpdateData.updateData.phoneProvince = phoneProvince;
                            partnerUpdateData.updateData.phoneCity = phoneCity;
                            partnerUpdateData.updateData.phoneType = phoneType;
                        }
                        creator = {type: "partner", name: partner.partnerName, id: partner._id};
                        // result.isPlayerInit = true;
                        return dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PARTNER_PHONE, {data: partnerUpdateData, inputDevice: inputDevice, creator: creator}).catch(errorUtils.reportError);
                        break;
                    case 2:
                        let inputDevicePlayer = dbUtility.getInputDevice(userAgent,false);
                        let inputDevicePartner = dbUtility.getInputDevice(userAgent,true);
                        player = result[0];
                        playerUpdateData = {
                            isPlayerInit: true,
                            playerObjId: player._id,
                            playerName: player.name,
                            updateData: {
                                phoneNumber: updatePhoneNumber
                            }

                        };
                        partner = result[1];
                        partnerUpdateData = {
                            isPlayerInit: true,
                            partnerObjId: partner._id,
                            partnerName: partner.partnerName,
                            updateData: {
                                phoneNumber: updatePhoneNumber
                            }

                        };
                        // result[0].isPlayerInit = true;
                        // result[1].isPlayerInit = true;
                        if (phoneProvince || phoneCity || phoneType) {
                            playerUpdateData.updateData.phoneProvince = phoneProvince;
                            playerUpdateData.updateData.phoneCity = phoneCity;
                            playerUpdateData.updateData.phoneType = phoneType;
                            partnerUpdateData.updateData.phoneProvince = phoneProvince;
                            partnerUpdateData.updateData.phoneCity = phoneCity;
                            partnerUpdateData.updateData.phoneType = phoneType;
                        }
                        dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PARTNER_PHONE, {data: partnerUpdateData, inputDevice: inputDevicePartner}).catch(errorUtils.reportError);
                        return dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PLAYER_PHONE, {data: playerUpdateData, inputDevice: inputDevicePlayer}).catch(errorUtils.reportError);
                        break;
                }
            }
        ).then(
            data=>{
                if(data.status && data.status == constProposalStatus.APPROVED || data.status == constProposalStatus.SUCCESS){

                  let queryPlayer = {
                      platform: platformObjId,
                      playerId: userId
                  };
                  let updateData = {
                      '$set':{'qnaWrongCount.updatePhoneNumber' : 0}
                  };
                  dbUtility.findOneAndUpdateForShard(dbConfig.collection_players, queryPlayer, updateData, constShardKeys.collection_players);
                }
                return true;
            }
        )

        function checkPhoneNumberBindedBefore (inputData, platformObj) {
            return dbConfig.collection_phoneNumberBindingRecord.find({
                platformObjId: platformObj._id,
                phoneNumber: {$in: [
                        rsaCrypto.encrypt(inputData.phoneNumber),
                        rsaCrypto.oldEncrypt(inputData.phoneNumber),
                        rsaCrypto.legacyEncrypt(inputData.phoneNumber)
                    ]}
            }).then(
                cnt => {
                    console.log('checkPhoneNumberBindedBefore cnt', cnt);
                    return cnt;
                }
            );
        }
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
                    //check if bankAccountName in update data is the same as player's real name
                    if (updateData.bankAccountName && updateData.bankAccountName != playerData.realName) {
                        return Q.reject({
                            name: "DataError",
                            code: constServerCode.INVALID_DATA,
                            message: "Bank account name is different from real name"
                        });
                    }
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
                    //check if bankAccountName in update data is the same as player's real name
                    if (updateData.bankAccountName && updateData.bankAccountName != partnerData.realName) {
                        return Q.reject({
                            name: "DataError",
                            code: constServerCode.INVALID_DATA,
                            message: "Bank account name is different from real name"
                        });
                    }
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
                    if (!platformData.requireSMSVerificationForPaymentUpdate) {
                        // SMS verification not required
                        return Q.resolve(true);
                    } else {
                        return dbPlayerMail.verifySMSValidationCode(playerObj.phoneNumber, platformData, updateData.smsCode);
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

                    return Promise.all([plyProm, partnerProm]).then(
                        data => true
                    );
                }
            }
        )
    }
};

module.exports = dbPlayerPartner;
