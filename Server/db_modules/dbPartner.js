var dbPartnerFunc = function () {
};
module.exports = new dbPartnerFunc();

var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var bcrypt = require('bcrypt');
const constSystemParam = require('../const/constSystemParam');
const constShardKeys = require('../const/constShardKeys');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbUtil = require('../modules/dbutility');
var dataUtils = require("../modules/dataUtils.js");
var mongoose = require('mongoose');
var md5 = require('md5');
var constServerCode = require('../const/constServerCode');
var geoip = require('geoip-lite');
var dbProposal = require('../db_modules/dbProposal');
var dbAutoProposal = require('../db_modules/dbAutoProposal');
var constProposalType = require('../const/constProposalType');
var constPlayerTopUpTypes = require('../const/constPlayerTopUpType');
var jwt = require('jsonwebtoken');
var errorUtils = require("../modules/errorUtils.js");
var pmsAPI = require("../externalAPI/pmsAPI.js");
var dbLogger = require("./../modules/dbLogger");
var constProposalMainType = require('../const/constProposalMainType');
let rsaCrypto = require("../modules/rsaCrypto");
let dbutility = require("./../modules/dbutility");
let dbPlayerMail = require("../db_modules/dbPlayerMail");
var localization = require("../modules/localization");
const translate = localization.localization.translate;
var serverInstance = require("../modules/serverInstance");
var ObjectId = mongoose.Types.ObjectId;
const dbLargeWithdrawal = require("../db_modules/dbLargeWithdrawal");
// db_common
const dbPropUtil = require("../db_common/dbProposalUtility");

let env = require('../config/env').config();

let SettlementBalancer = require('../settlementModule/settlementBalancer');

const constPlayerLevelPeriod = require('../const/constPlayerLevelPeriod');
const constPartnerBillBoardMode = require('../const/constPartnerBillBoardMode');
const constPartnerBillBoardPeriod = require('../const/constPartnerBillBoardPeriod');
const constPartnerCommissionPeriod = require('../const/constPartnerCommissionPeriod');
const constPartnerCommissionType = require('../const/constPartnerCommissionType');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constPartnerCommissionSettlementMode = require('../const/constPartnerCommissionSettlementMode');
const constPartnerStatus = require('../const/constPartnerStatus');
const constCrewDetailMode = require('../const/constCrewDetailMode');
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
const constPartnerCommissionLogStatus = require("../const/constPartnerCommissionLogStatus");


let dbPartner = {

    createPartnerAPI: function (partnerData, bypassSMSVerify) {
        let platformData;
        return dbconfig.collection_platform.findOne({platformId: partnerData.platformId}).then(
            platformDataResult => {
                platformData = platformDataResult;
                if (platformData) {
                    if(partnerData.phoneNumber && platformData.blackListingPhoneNumbers){
                        let indexNo = platformData.blackListingPhoneNumbers.findIndex(p => p == partnerData.phoneNumber);
                        if(indexNo != -1){
                            return Q.reject({name: "DataError", message: localization.localization.translate("Registration failed, phone number is invalid")});
                        }
                    }

                    if(partnerData.phoneNumber && partnerData.phoneNumber.toString().length != 11){
                        return Q.reject({
                            name: "DataError",
                            message: localization.localization.translate("phone number is invalid")
                        });
                    }

                    // *** new logic:(based on platform setting)
                    // sms(require)                                => verifySMS -> sms correct / incorrect
                    // sms(not require) && captchaCode (correct)   => return true
                    // sms(not require) && captchaCode (incorrect) => invalid image
                    if (partnerData.parent) {
                        return true
                    }
                    else if (platformData.partnerRequireSMSVerification) {
                        return dbPlayerMail.verifySMSValidationCode(partnerData.phoneNumber, platformData, partnerData.smsCode, partnerData.partnerName, true);
                    }
                    else if (!platformData.partnerRequireSMSVerification && bypassSMSVerify) {
                        return true;
                    }
                    else if (!platformData.partnerRequireSMSVerification && !bypassSMSVerify) {
                        console.log('invalid captcha')
                        return Q.reject({
                            status: constServerCode.GENERATE_VALIDATION_CODE_ERROR,
                            name: "ValidationError",
                            message: "Invalid image captcha"
                        });
                    }
                    else{
                        // display if anything out of the scope.
                        console.log('=mark=debug=', partnerData, platformData.partnerRequireSMSVerification, bypassSMSVerify);
                    }
                } else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            () => {
                if (platformData) {
                    partnerData.platform = platformData._id;
                    partnerData.isNewSystem = true;
                    // attach platform prefix to player name if available
                    // if (platformData.partnerPrefix) {
                    //     partnerData.partnerName = platformData.partnerPrefix + partnerData.partnerName;
                    // }
                    let phoneNumber = (partnerData.phoneNumber) || '';
                    if (platformData.whiteListingPhoneNumbers
                        && platformData.whiteListingPhoneNumbers.length > 0
                        && partnerData.phoneNumber
                        && platformData.whiteListingPhoneNumbers.indexOf(partnerData.phoneNumber) > -1)
                        return {isPhoneNumberValid: true};

                    if(phoneNumber){


                        if (platformData.partnerAllowSamePhoneNumberToRegister === true) {
                            return dbPartner.isExceedPhoneNumberValidToRegister({
                                phoneNumber: {$in: [rsaCrypto.encrypt(phoneNumber), rsaCrypto.oldEncrypt(phoneNumber)]},
                                platform: partnerData.platform
                            }, platformData.partnerSamePhoneNumberRegisterCount);
                            // return {isPhoneNumberValid: true};
                        } else {
                            return dbPartner.isPhoneNumberValidToRegister({
                                phoneNumber: {$in: [rsaCrypto.encrypt(phoneNumber), rsaCrypto.oldEncrypt(phoneNumber)]},
                                platform: partnerData.platform
                            });
                        }
                    }else{
                          return {isPhoneNumberValid: true};
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            (data) => {
                if (data.isPhoneNumberValid) {
                    if(platformData.partnerDefaultCommissionGroup != constPartnerCommissionType.OPTIONAL_REGISTRATION && partnerData.commissionType){
                        delete partnerData.commissionType;
                    }

                    if (partnerData.parent) {
                        return dbconfig.collection_partner.findOne({partnerName: partnerData.parent}).lean().then(
                            parentData => {
                                if (parentData) {
                                    partnerData.parent = parentData._id;
                                    return dbPartner.createPartnerWithParent(partnerData);
                                }
                                else {
                                    return Q.reject({
                                        name: "DataError",
                                        message: "Cannot find parent partner"
                                    });
                                }
                            }
                        );
                    }
                    else {
                        return dbPartner.createPartner(partnerData);
                    }
                } else {
                    return Q.reject({
                        name: "DataError",
                        message: "Phone number already exists"
                    });
                }
            }
        );
    },

    /**
     * Create a new partner
     * @param {json} partnerdata - The data of the partner user. Refer to Partner schema.
     */
    createPartner: function (partnerdata, bFromBI) {
        let deferred = Q.defer();

        let platformData = null;
        let partnerLevel = null;
        let pPrefix = null;
        let pName = null;

        if (!partnerdata.platform) {
            return Q.reject({
                name: "DataError",
                message: "You did not provide the 'platform' (ObjectId) field for the new partner"
            });
        }

        partnerdata.isNewSystem = true;

        // Partner name should be alphanumeric and max 15 characters
        let alphaNumRegex = /^([0-9]|[a-z])+([0-9a-z]+)$/i;
        if (!partnerdata.partnerName.match(alphaNumRegex)) {
            // ignore for unit test
            if (env.mode !== "local" && env.mode !== "qa") {
                return Q.reject({
                    status: constServerCode.PARTNER_NAME_INVALID,
                    name: "DBError",
                    message: "Username should be alphanumeric and within 20 characters"
                });
            }
        }

        dbconfig.collection_platform.findOne({_id: partnerdata.platform}).then(
            function (platform) {
                if (platform) {
                    platformData = platform;
                    pPrefix = platformData.partnerPrefix;

                    if (platformData.partnerDefaultCommissionGroup && !partnerdata.commissionType) {
                        partnerdata.commissionType = platformData.partnerDefaultCommissionGroup;
                    }
                    // attach platform prefix to partner name if available
                    // if (platform.partnerPrefix) {
                    //     partnerdata.partnerName = platform.partnerPrefix + partnerdata.partnerName;
                    // }
                    pName = partnerdata.partnerName;

                    if ((platformData.partnerNameMaxLength > 0 && partnerdata.partnerName.length > platformData.partnerNameMaxLength) || (platformData.partnerNameMinLength > 0 && partnerdata.partnerName.length < platformData.partnerNameMinLength)) {
                        return {isPartnerNameValid: false};
                    } else {
                        return {isPartnerNameValid: true};
                    }
                } else {
                    deferred.reject({
                        name: "DBError",
                        message: "No such platform"
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Error when finding platform",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data.isPartnerNameValid) {
                    // check partner name must start with prefix
                    if (!pPrefix || pName.indexOf(pPrefix) === 0) {
                        return {isPartnerPrefixValid: true};
                    } else {
                        return {isPartnerPrefixValid: false};
                    }
                } else {
                    return deferred.reject({name: "DBError", message: localization.localization.translate("Partner name should be between ") + platformData.partnerNameMinLength + " - " + platformData.partnerNameMaxLength + localization.localization.translate(" characters."),});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Partner name should be between " + platformData.partnerNameMinLength + " - " + platformData.partnerNameMaxLength + " characters.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data.isPartnerPrefixValid) {
                    if ((platformData.partnerPasswordMaxLength > 0 && partnerdata.password.length > platformData.partnerPasswordMaxLength) || (platformData.partnerPasswordMinLength > 0 && partnerdata.password.length < platformData.partnerPasswordMinLength)) {
                        return {isPartnerPasswordValid: false};
                    } else {
                        return {isPartnerPasswordValid: true};
                    }
                } else {
                    return deferred.reject({name: "DBError", message: localization.localization.translate("Partner name should use ") + pPrefix + localization.localization.translate(" as prefix.")});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Partner name should use " + pPrefix + " as prefix.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data.isPartnerPasswordValid) {
                    let phoneNumber = (partnerdata.phoneNumber) || '';
                    if (platformData.whiteListingPhoneNumbers
                        && platformData.whiteListingPhoneNumbers.length > 0
                        && partnerdata.phoneNumber
                        && platformData.whiteListingPhoneNumbers.indexOf(partnerdata.phoneNumber) > -1)
                        return {isPhoneNumberValid: true};

                    if (phoneNumber) {
                        if (platformData.partnerAllowSamePhoneNumberToRegister === true) {
                            return dbPartner.isExceedPhoneNumberValidToRegister({
                                phoneNumber: {$in: [rsaCrypto.encrypt(phoneNumber), rsaCrypto.oldEncrypt(phoneNumber)]},
                                platform: partnerdata.platform
                            }, platformData.partnerSamePhoneNumberRegisterCount);
                            // return {isPhoneNumberValid: true};
                        } else {
                            return dbPartner.isPhoneNumberValidToRegister({
                                phoneNumber: {$in: [rsaCrypto.encrypt(phoneNumber), rsaCrypto.oldEncrypt(phoneNumber)]},
                                platform: partnerdata.platform
                            });
                        }
                    } else {
                        return {isPhoneNumberValid: true};
                    }
                } else {
                    return deferred.reject({name: "DBError", message: localization.localization.translate("Partner password should be between ") + platformData.partnerPasswordMinLength + " - " + platformData.partnerPasswordMaxLength + localization.localization.translate(" characters.")});
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Partner password should be between " + platformData.partnerPasswordMinLength + " - " + platformData.partnerPasswordMaxLength + " characters.",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data.isPhoneNumberValid || bFromBI) {
                    return dbPartner.isPartnerNameValidToRegister({
                        partnerName: partnerdata.partnerName,
                        realName: partnerdata.realName,
                        platform: partnerdata.platform
                    });
                } else {
                    deferred.reject({
                        name: "DBError",
                        message: "Phone number already exists"
                    });
                }
            },
            function (error) {
                deferred.reject({
                    name: "DBError",
                    message: "Phone number already exists",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data.isPartnerNameValid) {
                    // If level was provided then use that, otherwise select the first level on the platform
                    return partnerdata.level && mongoose.Types.ObjectId.isValid(partnerdata.level) ? Q.resolve(partnerdata.level) : dbconfig.collection_partnerLevel.findOne({
                        platform: partnerdata.platform,
                        value: partnerdata.level || 0
                    });
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Username already exists"
                    });
                    return Promise.reject(new Error());
                }
            },
            function (error) {
                deferred.reject({
                    name: "DataError",
                    message: "Error in checking partner name validity",
                    error: error
                });
                return Promise.reject(new Error());
            }
        ).then(
            level => {
                partnerLevel = level;

                if(partnerdata.bindPlayer){
                    return dbconfig.collection_players.findOne({name: partnerdata.bindPlayer}).then(
                        playerData => {
                            if(playerData){
                                return playerData._id;
                            }else{
                                deferred.reject({
                                    name: "DataError",
                                    message: "Player not exists"
                                });
                                return Promise.reject(new Error());
                            }
                        },
                        error => {
                            deferred.reject({
                                name: "DataError",
                                message: "Error in checking player name validity",
                                error: error
                            });
                            return Promise.reject(new Error());
                        }
                    )
                }

                return;

            }
        ).then(playerId => {
                return dbPartner.createPartnerDomain(partnerdata).then(
                    () => {
                        // determine registrationInterface
                        if (partnerdata.domain && partnerdata.domain.indexOf('fpms8') !== -1) {
                            partnerdata.registrationInterface = constPlayerRegistrationInterface.BACKSTAGE;
                        }
                        else if (partnerdata.userAgent && partnerdata.userAgent[0]) {
                            let userAgent = partnerdata.userAgent[0];
                            if (userAgent.browser.indexOf("WebKit") !== -1 || userAgent.browser.indexOf("WebView") !== -1) {
                                if (partnerdata.partner) {
                                    partnerdata.registrationInterface = constPlayerRegistrationInterface.APP_AGENT;
                                }
                                else {
                                    partnerdata.registrationInterface = constPlayerRegistrationInterface.APP_PLAYER;
                                }
                            }
                            else if (userAgent.os.indexOf("iOS") !== -1 || userAgent.os.indexOf("ndroid") !== -1 || userAgent.browser.indexOf("obile") !== -1) {
                                if (partnerdata.partner) {
                                    partnerdata.registrationInterface = constPlayerRegistrationInterface.H5_AGENT;
                                }
                                else {
                                    partnerdata.registrationInterface = constPlayerRegistrationInterface.H5_PLAYER;
                                }
                            }
                            else {
                                if (partnerdata.partner) {
                                    partnerdata.registrationInterface = constPlayerRegistrationInterface.WEB_AGENT;
                                }
                                else {
                                    partnerdata.registrationInterface = constPlayerRegistrationInterface.WEB_PLAYER;
                                }
                            }
                        }
                        else {
                            partnerdata.registrationInterface = constPlayerRegistrationInterface.BACKSTAGE;
                        }

                        if (partnerdata.registrationInterface !== constPlayerRegistrationInterface.BACKSTAGE) {
                            partnerdata.loginTimes = 1;
                        }

                        if(playerId){
                            partnerdata.player = playerId;
                        }

                        let partner = new dbconfig.collection_partner(partnerdata);
                        partner.level = partnerLevel;
                        partner.partnerName = partnerdata.partnerName.toLowerCase();
                        return partner.save();
                    },
                    function (error) {
                        deferred.reject({
                            name: "DataError",
                            message: "Partner domain have been used",
                            error: error
                        });
                    }
                );
            }, function (error) {
                deferred.reject({
                    name: "DataError",
                    message: "Error in getting partner level",
                    error: error
                });
            }
        ).then(
            function (data) {
                if (data && data.lastLoginIp) {
                    dbPartner.updateGeoipws(data._id, data.platform, data.lastLoginIp);
                }
                deferred.resolve(data);
            },
            function (error) {
                console.log(error)
                deferred.reject({
                    name: "DataError",
                    message: "Error in creating partner",
                    error: error
                });
            }
        );
        return deferred.promise;
    },

    isValidPartnerName: function (inputData) {
        var platformData = null;
        return dbconfig.collection_platform.findOne({platformId: inputData.platformId}).then(
            platform => {
                if (platform) {
                    platformData = platform;
                    let pName = inputData.name;
                    let pPrefix = platformData.partnerPrefix;

                    if ((platformData.partnerNameMaxLength > 0 && pName.length > platformData.partnerNameMaxLength) || (platformData.partnerNameMinLength > 0 && pName.length < platformData.partnerNameMinLength)) {
                        return Q.reject({name: "DBError", message: localization.localization.translate("Partner name should be between ") + platformData.partnerNameMinLength + " - " + platformData.partnerNameMaxLength + localization.localization.translate(" characters."),});
                    }

                    // check partner name must start with prefix
                    if (pName.indexOf(pPrefix) !== 0) {
                        return Q.reject({name: "DataError", message: localization.localization.translate("Partner name should use ") + platformData.partnerPrefix + localization.localization.translate(" as prefix.")});
                    }

                    return dbconfig.collection_partner.findOne({partnerName: inputData.name}).lean()
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            partner => {
                if (partner) {
                    return {isPlayerNameValid: false};
                }
                else {
                    return {isPlayerNameValid: true};
                    // inputData.name = platformData.prefix + inputData.name;
                    // inputData.name = inputData.name.toLowerCase();
                    // return dbPlayerInfo.isPlayerNameValidToRegister({name: inputData.name, platform: platformData._id});
                }
            }
        );
    },

    updateGeoipws: function (partnerObjId, platformObjId, ip) {
        var ipData = dbUtil.getIpLocationByIPIPDotNet(ip);
        if(ipData){
            return dbconfig.collection_partner.findOneAndUpdate(
                {_id: partnerObjId, platform: platformObjId},
                ipData
            ).then();
        }
    },

    createPartnerDomain: function (partnerData) {
        return Q.resolve().then(
            () => {
                if (partnerData && partnerData.ownDomain && Array.isArray(partnerData.ownDomain) && partnerData.ownDomain.length > 0) {
                    let proms = partnerData.ownDomain.map(
                        domain => new dbconfig.collection_partnerOwnDomain({name: domain}).save()
                    );
                    return Q.all(proms);
                }
            }
        )
    },

    updatePartnerDomain: function (partnerObjId, newDomains) {
        var newElements = [];
        var removedElements = [];
        var partnerObj = null;

        return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;
                    newElements = dbUtil.difArrays(partnerData.ownDomain, newDomains);
                    removedElements = dbUtil.difArrays(newDomains, partnerData.ownDomain);
                    if (newElements && newElements.length > 0) {
                        var newProms = newElements.map(ele => new dbconfig.collection_partnerOwnDomain({name: ele}).save());
                        return Promise.all(newProms);
                    }
                }
                else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Cannot find partner"
                    });
                }
            }
        ).then(
            () => {
                return dbconfig.collection_partner.findOneAndUpdate(
                    {_id: partnerObj._id, platform: partnerObj.platform},
                    {ownDomain: newDomains}
                );
            }
        ).then(
            () => {
                if (removedElements && removedElements.length > 0) {
                    var remProms = removedElements.map(ele => dbconfig.collection_partnerOwnDomain.remove({name: ele}));
                    return Promise.all(remProms);
                }
            }
        );
    },

    /**
     * Create a new partner with parent
     * @param {json} data - The data of the partner user. Refer to Partner schema.
     */
    createPartnerWithParent: function (partnerdata) {
        var deferred = Q.defer();
        var partnerData = null;

        if (!partnerdata.parent) {
            deferred.reject({
                name: "DataError",
                message: "You did not provide the 'parent' (ObjectId) field for the new child partner"
            });
            return;
        }
        dbconfig.collection_partner.findOne({partnerName: partnerdata.partnerName.toLowerCase()}).then(
            function (data) {
                if (!data) {
                    return dbconfig.collection_partner.findOne({_id: partnerdata.parent});
                } else {
                    deferred.reject({
                        name: "DataError",
                        message: "Username already exists"
                    });
                }
            }, function (error) {
                deferred.reject({
                    name: "DataError",
                    message: "Error in checking partner name validity",
                    error: error
                });
            }
        ).then(
            function (parentObj) {
                if (parentObj) {
                    return dbPartner.createPartnerDomain(partnerdata).then(
                        () => {
                            partnerdata.depthInTree = parentObj.depthInTree + 1;
                            // Create the new partner (the child)
                            partnerdata.partnerName = partnerdata.partnerName.toLowerCase();
                            return dbPartner.createPartner(partnerdata);
                        },
                        error => {
                            deferred.reject({
                                name: "DataError",
                                message: "Partner domain have been used",
                                error: error
                            });
                        }
                    );
                }
            }
        ).then(
            function (data) {
                if (data) {
                    partnerData = data;
                    // Update the parent
                    return dbconfig.collection_partner.update(
                        {_id: partnerdata.parent},
                        {$addToSet: {children: partnerData._id}}
                    ).exec();
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create new partner."});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating new partner.", error: error});
            }
        ).then(
            function (data) {
                deferred.resolve(partnerData);
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error updating new partner.", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Get the information of the partner by partnerName or _id
     * @param {String} query - Query string
     */
    getPartner: function (query) {
        var deferred = Q.defer();
        var apiData = null;
        dbconfig.collection_partner.findOne(query).populate({
            path: "level",
            model: dbconfig.collection_partnerLevel
        }).populate({
            path: "player",
            model: dbconfig.collection_players
        }).lean().then(
            function (data) {
                if (data) {
                    // data.fullPhoneNumber = data.phoneNumber;
                    data.phoneNumber = dbUtil.encodePhoneNum(data.phoneNumber);
                    data.email = dbUtil.encodeEmail(data.email);
                    if (data.bankAccount) {
                        data.bankAccount = dbUtil.encodeBankAcc(data.bankAccount);
                    }
                    apiData = data;

                    var a, b, c;

                    a = apiData.bankAccountProvince ? pmsAPI.foundation_getProvince({
                        provinceId: apiData.bankAccountProvince,
                        queryId: serverInstance.getQueryId()
                    }) : true;
                    b = apiData.bankAccountCity ? pmsAPI.foundation_getCity({
                        cityId: apiData.bankAccountCity,
                        queryId: serverInstance.getQueryId()
                    }) : true;
                    c = apiData.bankAccountDistrict ? pmsAPI.foundation_getDistrict({
                        districtId: apiData.bankAccountDistrict,
                        queryId: serverInstance.getQueryId()
                    }) : true;

                    return Q.all([a, b, c]);
                }
                deferred.resolve(data);
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Error in getting partner data", error: err})
            }
        ).then(
            zoneData => {
                apiData.bankAccountProvinceId = apiData.bankAccountProvince;
                apiData.bankAccountCityId = apiData.bankAccountCity;
                apiData.bankAccountDistrictId = apiData.bankAccountDistrict;
                if (zoneData && zoneData[0]) {
                    apiData.bankAccountProvince = zoneData[0].province ? zoneData[0].province.name : apiData.bankAccountProvince;
                    apiData.bankAccountCity = zoneData[1].city ? zoneData[1].city.name : apiData.bankAccountCity;
                    apiData.bankAccountDistrict = zoneData[2].district ? zoneData[2].district.name : apiData.bankAccountDistrict;
                }
                deferred.resolve(apiData);
            },
            zoneError => {
                deferred.resolve(false);
            }
        );
        return deferred.promise;
    },

    /**
     * Get the information of the partner by query
     * @param {String} query - Query string
     */
    getPartnerByQuery: function (query) {
        return dbconfig.collection_partner.find(query);
    },

    /**
     * Get the information of the partner by partnerName or _id
     * @param {String} query - Query string
     */
    getPartners: function (ids) {
        return dbconfig.collection_partner.find({_id: {$in: ids}}).populate({
            path: "level",
            model: dbconfig.collection_partnerLevel
        }).exec();
    },

    /**
     * Get all partner
     */
    getAllPartner: function () {
        return dbconfig.collection_partner.find({}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    checkDuplicatedPartnerBankAccount: function (bankAccount, platform) {

        let sameBankAccountCountProm = dbconfig.collection_partner.find({
            bankAccount: bankAccount,
            platform: ObjectId(platform),
            'permission.forbidPartnerFromLogin': false
        }).lean().count();

        let platformProm =  dbconfig.collection_platform.findOne({
            _id: ObjectId(platform)
        });

        return Promise.all([sameBankAccountCountProm, platformProm]).then(
            data => {
                if (!data){
                    return Promise.reject({
                        name: "DataError",
                        message: "data is not found"
                    })
                }

                if (!data[1]){
                    return Promise.reject({
                        name: "DataError",
                        message: "platform data is not found"
                    })
                }

                let sameBankAccountCount = data[0] || 0;
                let platformData = data[1];

                if (platformData.partnerSameBankAccountCount && sameBankAccountCount >= platformData.partnerSameBankAccountCount){
                    return Promise.resolve(false)
                }
                return Promise.resolve(true);
            }
        )
    },

    /**
     * Search the information of the partner by partnerName or _id
     * @param {String} query - Query string
     */
    searchPartnerUser: function (partnerdata) {
        //suppress the sensitive fields in query response (Projection Fields)
        var limitFields = {};
        limitFields['password'] = 0;
        limitFields['salt'] = 0;
        return dbconfig.collection_partner.find(partnerdata, limitFields).limit(constSystemParam.MAX_RECORD_NUM)
            .populate({path: "level", model: dbconfig.collection_partnerLevel}).exec();
    },

    /**
     * Update partnerInfo by partnerName or _id of the Partner schema
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePartner: function (query, updateData) {
        var result = '';
        var arr = [];
        if (updateData && updateData.ownDomain && updateData.ownDomain.length > 0) {
            arr.push(dbPartner.updatePartnerDomain(data._id, updateData.ownDomain));
        }
        return Q.all(arr).then(
            () => dbUtil.findOneAndUpdateForShard(dbconfig.collection_partner, query, updateData, constShardKeys.collection_partner)
        );
    },

    /**
     * Delete partnerInfo by object _id of the partnerInfo schema
     * @param {array}  partnerObjIds - The object _ids of the Partner
     */
    deletePartners: function (partnerObjIds) {
        dbconfig.collection_partnerOwnDomain.remove({
            partner: {$in: partnerObjIds}
        }).exec();
        return dbconfig.collection_partner.remove({_id: {$in: partnerObjIds}}).exec();
    },
    /**
     * Get Partners by objectId of platform schema
     *
     */
    getPartnersByPlatform: function (data) {
        var query = {};
        var count = 0;
        query.platform = mongoose.Types.ObjectId(data.platformId);
        for(var k in data){
            if(k!="limit" && k!="index" && k!="pageObj" && k!="sortCol"&& k!="platformId"){

                if(k=="status"){
                    data["status"] = parseInt(data["status"]);
                }
                if(k=="level"){
                    data["level"] = mongoose.Types.ObjectId(data["level"]);
                }
                if(k=="player"){
                    data["player"] = mongoose.Types.ObjectId(data["player"]);
                }
                query[k]= data[k];
            }
        }
        count = dbconfig.collection_partner.find( query ).count();
        if(data.sortCol){
            //if there is sorting parameter
            var detail = dbconfig.collection_partner.aggregate([
                {$match: query},
                {$project:{ childrencount: {$size: { "$ifNull": [ "$children", [] ] }},"partnerId":1, "partnerName":1 ,"realName":1, "phoneNumber":1, "status":1, "parent":1, "totalReferrals":1, "credits":1, "registrationTime":1, "level":1, "lastAccessTime":1, "lastLoginIp":1,"_id":1, "validReward":1, "player":1}},
                {$sort:data.sortCol},
                {$skip:data.index},
                {$limit:data.limit}
            ]).then(
            aggr => {
                var retData = [];
                for (var index in aggr) {
                    var prom = dbPartner.getPartnerItem(aggr[index]._id , aggr[index].childrencount);
                    retData.push(prom);
                }
                return Q.all(retData);
            }).then(
                partners => {
                    let partnerList = partners ? JSON.parse(JSON.stringify(partners)) : [];

                    return rearrangePartnerDetail(partnerList, data.platformId);
                },
                error => {
                    Q.reject({name: "DBError", message: "Error finding partners.", error: error});
                }
            );
        }else{
            //if there is not sorting parameter
            var detail = dbconfig.collection_partner.aggregate([
                {$match: query},
                {$project:{ childrencount: {$size: { "$ifNull": [ "$children", [] ] }},"partnerId":1, "partnerName":1 ,"realName":1, "phoneNumber":1, "status":1, "parent":1, "totalReferrals":1, "credits":1, "registrationTime":1, "level":1, "lastAccessTime":1, "lastLoginIp":1,"_id":1, "validReward":1, "player":1}},
                {$skip:data.index},
                {$limit:data.limit}
            ]).then(
            aggr => {
                var retData = [];
                for (var index in aggr) {
                    var prom = dbPartner.getPartnerItem(aggr[index]._id , aggr[index].childrencount);
                    retData.push(prom);
                }
                return Q.all(retData);
            }).then(
                partners => {
                    let partnerList = partners ? JSON.parse(JSON.stringify(partners)) : [];

                    return rearrangePartnerDetail(partnerList, data.platformId);
                },
                error => {
                    Q.reject({name: "DBError", message: "Error finding partners.", error: error});
                }
            );

        }
        return Q.all([count, detail]).then( function(data){
            return {size:data[0],data:data[1]}
        })
    },

    /*
     * search partners by platformId and advanced query
     * @param - data {json} can include  one or more of the following fields
     *  {  bankAccount , partnerName, partnerId, level }
     */
    getPartnersByAdvancedQuery: function (platformId, query, index, limit, sortObj) {
        let partnerInfo;

        query.platform  = mongoose.Types.ObjectId(platformId);

        if (query && query.phoneNumber) {
            query.phoneNumber = {$in: [rsaCrypto.encrypt(query.phoneNumber), rsaCrypto.oldEncrypt(query.phoneNumber),query.phoneNumber]};
        }

        if (query && query.registrationTime) {
            if (query.registrationTime["$gte"]) {
                query.registrationTime["$gte"] = new Date(query.registrationTime["$gte"]);
            }
            if (query.registrationTime["$lt"]) {
                query.registrationTime["$lt"] = new Date(query.registrationTime["$lt"]);
            }
        }
        if (query && query.lastAccessTime) {
            if (query.lastAccessTime["$gte"]) {
                query.lastAccessTime["$gte"] = new Date(query.lastAccessTime["$gte"]);
            }
            if (query.lastAccessTime["$lt"]) {
                query.lastAccessTime["$lt"] = new Date(query.lastAccessTime["$lt"]);
            }
        }

        let count = dbconfig.collection_partner.find(query).count();

        if (sortObj){
            //if there is sorting parameter
            let aggrOperation = [];
            partnerInfo = dbconfig.collection_partner.findOne({partnerName: query.partnerName}, {_id:1, children: 1}).lean().then(data => {
                if (data && data._id && data.children && data.children.length > 0 && query && query.partnerName) {
                    query.$or = [{partnerName: query.partnerName},{parent: data._id}];
                    delete query.partnerName;

                    aggrOperation =[
                        {$match:query},
                        {$project: { childrencount: {$size: { "$ifNull": [ "$children", [] ] }}, "partnerId":1, "partnerName":1 , "realName":1, "phoneNumber":1,
                                "commissionType":1, "credits":1, "registrationTime":1, "lastAccessTime":1, "dailyActivePlayer":1, "weeklyActivePlayer":1,
                                "monthlyActivePlayer":1, "totalPlayerDownline":1, "validPlayers":1, "totalChildrenDeposit":1, "totalChildrenBalance":1, "totalSettledCommission":1, "_id":1, }},
                        {$skip:index},
                        {$limit:limit}
                    ]
                } else {
                    aggrOperation =[
                        {$match:query},
                        {$project: { childrencount: {$size: { "$ifNull": [ "$children", [] ] }}, "partnerId":1, "partnerName":1 , "realName":1, "phoneNumber":1,
                                "commissionType":1, "credits":1, "registrationTime":1, "lastAccessTime":1, "dailyActivePlayer":1, "weeklyActivePlayer":1,
                                "monthlyActivePlayer":1, "totalPlayerDownline":1, "validPlayers":1, "totalChildrenDeposit":1, "totalChildrenBalance":1, "totalSettledCommission":1, "_id":1, }},
                        {$sort:sortObj},
                        {$skip:index},
                        {$limit:limit}
                    ]
                }
            }).then(() => {
                return dbconfig.collection_partner.aggregate(aggrOperation).then(
                    aggr => {
                        var retData = [];
                        for (var index in aggr) {
                            var prom = dbPartner.getPartnerItem(aggr[index]._id , aggr[index].childrencount);
                            retData.push(prom);
                        }
                        return Q.all(retData);
                    }).then(
                    partners => {
                        let partnerList = partners ? JSON.parse(JSON.stringify(partners)) : [];

                        return rearrangePartnerDetail(partnerList, platformId);
                    },
                    error => {
                        Q.reject({name: "DBError", message: "Error finding partners.", error: error});
                    }
                );
            });
        } else {
            //if there is no sorting parameter
            partnerInfo = dbconfig.collection_partner.findOne({partnerName: query.partnerName}, {_id:1, children: 1}).lean().then(data => {
                if (data && data._id && data.children && data.children.length > 0 && query && query.partnerName) {
                    query.$or = [{partnerName: query.partnerName},{parent: data._id}];
                    delete query.partnerName;
                }
            }).then(() => {
                return dbconfig.collection_partner.aggregate([
                    {$match:query},
                    {$project: { childrencount: {$size: { "$ifNull": [ "$children", [] ] }}, "partnerId":1, "partnerName":1 , "realName":1, "phoneNumber":1,
                            "commissionType":1, "credits":1, "registrationTime":1, "lastAccessTime":1, "dailyActivePlayer":1, "weeklyActivePlayer":1,
                            "monthlyActivePlayer":1, "totalPlayerDownline":1, "validPlayers":1, "totalChildrenDeposit":1, "totalChildrenBalance":1, "totalSettledCommission":1, "_id":1, }},
                    {$skip:index},
                    {$limit:limit}
                ]).then(
                    aggr => {
                        var retData = [];
                        for (var index in aggr) {
                            var prom = dbPartner.getPartnerItem(aggr[index]._id , aggr[index].childrencount);
                            retData.push(prom);
                        }
                        return Q.all(retData);
                    }).then(
                    partners => {
                        let partnerList = partners ? JSON.parse(JSON.stringify(partners)) : [];

                        return rearrangePartnerDetail(partnerList, platformId);
                    },
                    error => {
                        Q.reject({name: "DBError", message: "Error finding partners.", error: error});
                    }
                );
            });
        }

        return Q.all([count, partnerInfo]).then( function(data){
            return {size:data[0],data:data[1]}
        })
    },

    getPartnerItem: function(id, childrencount) {
        return dbconfig.collection_partner.findOne({_id: mongoose.Types.ObjectId(id)})
            .populate({path: "player", model: dbconfig.collection_players, select:{_id:1, name:1, playerId:1}})
            .populate({path: "parent", model: dbconfig.collection_partner})
            .populate({path: "level", model: dbconfig.collection_partnerLevel}).
            then(function(partnerdata){
                partnerdata._doc.childrencount = childrencount;
                return partnerdata
            })
    },

    /**
     * Reset partner password
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    resetPartnerPassword: function (partnerObjId, newPassword, platformId) {
        var deferred = Q.defer();

        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                deferred.reject({name: "DBError", message: "Error generate salt when updating partner password", error: err});
                return;
            }
            bcrypt.hash(newPassword, salt, function (err, hash) {
                if (err) {
                    deferred.reject({name: "DBError", message: "Error generate hash when updating partner password.", error: err});
                    return;
                }
                dbUtil.findOneAndUpdateForShard(
                    dbconfig.collection_partner,
                    {_id: partnerObjId, platform: platformId},
                    {password: hash},
                    constShardKeys.collection_partner
                ).then(
                    function (data) {
                        deferred.resolve(newPassword);
                    },
                    function (error) {
                        deferred.reject({name: "DBError", message: "Error resetting partner password.", error: error});
                    }
                );
            });
        });

        return deferred.promise;
    },

    /**
     * Get all the referral player for partner
     * @param {objectId}  partner objectId
     */
    getPartnerReferralPlayers: function (partnerObjId) {
        return dbconfig.collection_players.find({partner: partnerObjId}).sort({registrationTime: -1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    getPagePartnerReferralPlayers: function (query, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {};
        var queryObj = {
            partner: query.partnerObjId
        }
        if (query.name) {
            queryObj.name = query.name;
        }
        if (query.domain != null) {
            queryObj.domain = query.domain;
        }
        if (query.regStart != null) {
            queryObj.registrationTime = {'$gte': query.regStart};
        }
        if (query.regEnd != null) {
            queryObj.registrationTime = queryObj.registrationTime || {}
            queryObj.registrationTime['$lt'] = query.regEnd;
        }
        if (query.loginStart != null) {
            queryObj.lastAccessTime = {'$gte': query.loginStart};
        }
        if (query.loginEnd != null) {
            queryObj.lastAccessTime = queryObj.lastAccessTime || {};
            queryObj.lastAccessTime['$lt'] = query.loginEnd;
        }
        if (query.minTopupTimes != null) {
            queryObj.topUpTimes = {'$gte': query.minTopupTimes};
        }
        if (query.maxTopupTimes != null) {
            queryObj.topUpTimes = queryObj.topUpTimes || {};
            queryObj.topUpTimes['$lt'] = query.maxTopupTimes;
        }


        var count = dbconfig.collection_players.find(queryObj).count();
        var detail = dbconfig.collection_players.find(queryObj).sort(sortCol).skip(index).limit(limit);
        return Q.all([count, detail]).then(data => {
            return {size: data[0], data: data[1]}
        })
    },
    /**
     * Get all the active players for partner past week
     * @param {objectId}  partner objectId
     */
    getPartnerActivePlayersForPastWeek: function (partnerObjId) {
        var startTime = dbUtil.getLastWeekSGTime().startTime;

        return dbconfig.collection_players.find(
            {
                partner: partnerObjId,
                lastAccessTime: {$gte: startTime}
            }
        ).sort({lastAccessTime: -1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    /**
     * Get all the valid players for partner
     * @param {objectId}  partner objectId
     */
    getPartnerValidPlayers: function (partnerObjId) {
        return dbconfig.collection_players.find(
            {
                partner: partnerObjId,
                topUpSum: {$gte: constSystemParam.VALID_PLAYER_TOP_UP_AMOUNT}
            }
        ).sort({lastAccessTime: -1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    promotePartner: function (partner, oldLevel, newLevel) {
        return dbPartner.changePartnerLevel(partner, oldLevel, newLevel);
    },

    demotePartner: function (partner, oldLevel, newLevel) {
        return dbPartner.changePartnerLevel(partner, oldLevel, newLevel);
    },

    changePartnerLevel: function (partner, oldLevel, newLevel) {
        if (!newLevel) {
            return Q.resolve("This level does not exist!");
        }

        // too doo: We probably want to notify the partner of their promotion/demotion.

        return dbPartner.updatePartner(
            {_id: partner._id},
            {
                failMeetingTargetWeeks: 0,
                level: newLevel
            }
        );
    },
    // getPartnerPhoneNumber: function (partnerObjId) {
    //     return dbconfig.collection_partner.findOne({_id: partnerObjId}).then(
    //         partnerData => {
    //             if (partnerData) {
    //                 if (partnerData.phoneNumber) {
    //                     if (partnerData.phoneNumber.length > 20) {
    //                         try {
    //                             partnerData.phoneNumber = rsaCrypto.decrypt(partnerData.phoneNumber);
    //                         }
    //                         catch (err) {
    //                             console.log(err);
    //                         }
    //                     }
    //                     return partnerData.phoneNumber;
    //                 } else {
    //                     return Q.reject({name: "DataError", message: "Can not find phoneNumber"});
    //                 }
    //             } else {
    //                 return Q.reject({name: "DataError", message: "Can not find player"});
    //             }
    //         }
    //     );
    // },

    /**
     * Get partners player info
     * @param {objectId}  platformObjId
     * @param {[objectId]}  partnersObjId
     */
    getPartnersPlayerInfo: function (platformObjId, partnersObjId) {
        //return dbUtil.getWeeklySettlementTimeForPlatformId(platformObjId).then(
        return dbUtil.getLastWeekSGTimeProm().then(
            function (times) {
                if (times) {
                    return dbconfig.collection_partnerWeekSummary.find(
                        {
                            platformId: platformObjId,
                            partnerId: {$in: partnersObjId},
                            date: {
                                $gte: times.startTime,
                                $lt: times.endTime
                            }
                        }
                    );
                }
            }
        );
    },

    checkOwnDomainValidity: function (partner, value, time) {
        return dbconfig.collection_partnerOwnDomain.find({name: {$in: value}}).then(data => {
            if (data && data.length > 0) {
                return {
                    data: data.map(item => {
                        return item.name;
                    }),
                    exists: true, time: time
                };
            } else {
                return {exists: false, time: time};
            }
        })
    },
    checkPartnerFieldValidity: function (name, value) {
        //todo owndomain can duplicate accross platforms?
        var obj = {};
        obj[name] = value;
        if (name == 'player') {
            return dbconfig.collection_players.findOne({name: value}).then(
                data => {
                    if (data) {
                        obj.valid = true;
                        obj.player_id = data._id
                        return dbconfig.collection_partner.findOne({player: data._id}).then(
                            data => {
                                if (data) {
                                    obj.exists = true;
                                } else {
                                    obj.exists = false;
                                }
                                return obj;
                            },
                            error => {
                                return Q.reject({name: "DBError", message: "Error finding values.", error: error});
                            }
                        )
                    } else {
                        obj.valid = false;
                        return obj;
                    }
                },
                error => {
                    return Q.reject({name: "DBError", message: "Error finding values.", error: error});
                }
            )
        } else {
            return dbconfig.collection_partner.findOne(obj).then(
                data => {
                    if (data) {
                        obj.exists = true;
                    } else {
                        obj.exists = false;
                    }
                    return obj;
                },
                error => {
                    return Q.reject({name: "DBError", message: "Error finding values.", error: error});
                }
            )
        }
    },

    /**
     * Get partners player info
     * @param {objectId}  platformObjId
     * @param {[objectId]}  partnerObjId
     * @param bActive
     * @param queryTime
     */
    getPartnerActiveValidPlayers: function (platformObjId, partnerObjId, bActive, queryTime) {
        let times = {};
        let partnerLevelConfig = {};
        let partnerCommissionConfig = {};
        let configProm = dbconfig.collection_partnerLevelConfig.findOne({platform: platformObjId});
        //var timeProm = dbUtil.getWeeklySettlementTimeForPlatformId(platformObjId);
        let timeProm = dbUtil.getLastWeekSGTimeProm();
        let commConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({platform: platformObjId});

        return Q.all([timeProm, configProm, commConfigProm]).then(
            data => {
                if (data && data[0] && data[1] && data[2]) {
                    times = data[0];
                    if (queryTime) {
                        times = queryTime;
                    }
                    partnerLevelConfig = data[1];
                    partnerCommissionConfig = data[2];
                    return dbconfig.collection_players.find(
                        {
                            platform: platformObjId,
                            partner: partnerObjId
                        }
                    ).lean();
                }
            }
        ).then(
            partnerData => {
                if (partnerData && partnerData.length > 0) {
                    let playerIds = partnerData.map(player => player._id);
                    let partnerDataMap = {};
                    for (let i = 0; i < partnerData.length; i++) {
                        partnerDataMap[partnerData[i]._id] = partnerData[i];
                    }

                    const matchPlayerSummaries = {
                        platformId: platformObjId,
                        playerId: {$in: playerIds},
                        date: {
                            $gte: times.startTime,
                            $lt: times.endTime
                        }
                    };

                    const matchRecordSummaries = {
                        platformId: platformObjId,
                        playerId: {$in: playerIds},
                        createTime: {
                            $gte: times.startTime,
                            $lt: times.endTime
                        }
                    };

                    let consumptionSummariesProm = {};
                    let topUpSummariesProm = {};
                    if (times.startTime.getTime() >= dbUtil.getTodaySGTime().startTime.getTime()) {
                        consumptionSummariesProm = dbconfig.collection_playerConsumptionRecord.aggregate(
                            {$match: matchRecordSummaries},
                            {
                                $group: {
                                    _id: "$playerId",
                                    // playerId: "$playerId",
                                    times: {$sum: 1},
                                    amount: {$sum: "$validAmount"}
                                }
                            }
                        );
                        topUpSummariesProm = dbconfig.collection_playerTopUpRecord.aggregate(
                            {$match: matchRecordSummaries},
                            {
                                $group: {
                                    _id: "$playerId",
                                    // playerId: "$playerId",
                                    times: {$sum: 1},
                                    amount: {$sum: "$amount"}
                                }
                            }
                        );
                    }
                    else {
                        consumptionSummariesProm = dbconfig.collection_playerConsumptionDaySummary.find(matchPlayerSummaries);
                        topUpSummariesProm = dbconfig.collection_playerTopUpDaySummary.find(matchPlayerSummaries);
                    }
                    return Q.all([consumptionSummariesProm, topUpSummariesProm]).then(
                        data => {
                            let playersObj = [];
                            const consumptionSummaries = data[0];
                            const topUpSummaries = data[1];
                            let consumptionSummariesByPlayerId = [];
                            let topUpSummariesByPlayerId = [];

                            if (times.startTime.getTime() >= dbUtil.getTodaySGTime().startTime.getTime()) {
                                consumptionSummariesByPlayerId = dataUtils.byKey(consumptionSummaries, '_id');
                                topUpSummariesByPlayerId = dataUtils.byKey(topUpSummaries, '_id');
                            }
                            else {
                                consumptionSummariesByPlayerId = dataUtils.byKey(consumptionSummaries, 'playerId');
                                topUpSummariesByPlayerId = dataUtils.byKey(topUpSummaries, 'playerId');
                            }


                            playerIds.forEach(
                                playerId => {
                                    const consumptionSummary = consumptionSummariesByPlayerId[playerId];
                                    const topUpSummary = topUpSummariesByPlayerId[playerId];

                                    if (topUpSummary && (consumptionSummary || partnerCommissionConfig.settlementMode === 'TB')) {
                                        let playerIsValid, playerIsActive;

                                        if (consumptionSummary) {
                                            playerIsValid = consumptionSummary.times >= partnerLevelConfig.validPlayerConsumptionTimes && topUpSummary.times >= partnerLevelConfig.validPlayerTopUpTimes;
                                            playerIsActive = consumptionSummary.times >= partnerLevelConfig.activePlayerConsumptionTimes && topUpSummary.times >= partnerLevelConfig.activePlayerTopUpTimes;
                                        }
                                        else {
                                            playerIsValid = topUpSummary.times >= partnerLevelConfig.validPlayerTopUpTimes && topUpSummary.amount >= partnerLevelConfig.validPlayerTopUpAmount;
                                            playerIsActive = topUpSummary.times >= partnerLevelConfig.activePlayerTopUpTimes && topUpSummary.amount >= partnerLevelConfig.activePlayerTopUpAmount;
                                        }

                                        if (bActive && playerIsActive) {
                                            playersObj.push(partnerDataMap[playerId]);
                                        }

                                        if (!bActive && playerIsValid) {
                                            playersObj.push(partnerDataMap[playerId]);
                                        }
                                    }
                                }
                            );
                            return playersObj;
                        }
                    );
                }
            }
        );
    },

    partnerLoginAPI: function (partnerData, userAgent) {
        var platformObjId = null;
        var partnerObj = null;
        let requireLogInCaptcha = null;
        let retObj = {};
        return dbconfig.collection_platform.findOne({platformId: partnerData.platformId}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    partnerData.prefixName = /*platformData.partnerPrefix +*/ partnerData.name;
                    requireLogInCaptcha = platformData.partnerRequireLogInCaptcha || false;

                    return dbconfig.collection_partner.findOne({
                        partnerName: partnerData.prefixName.toLowerCase(),
                        platform: platformObjId
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            },
            error => {
                return Q.reject({name: "DBError", message: "Error in getting player platform data", error: error});
            }
        ).then(
            partner => {
                if (partner) {
                    platformObjId = partner.platform;
                    partnerObj = partner;
                    var db_password = String(partnerObj.password); // hashedPassword from db
                    if (dbUtil.isMd5(db_password)) {
                        if (md5(partnerData.password) == db_password) {
                            return Q.resolve(true);
                        }
                        else {
                            return Q.resolve(false);
                        }
                    }
                    else {
                        var passDefer = Q.defer();
                        bcrypt.compare(String(partnerData.password), db_password, function (err, isMatch) {
                            if (err) {
                                passDefer.reject({
                                    name: "DataError",
                                    message: "Error in matching password",
                                    error: err
                                });
                            }
                            passDefer.resolve(isMatch);
                        });
                        return passDefer.promise;
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            isMatch => {
                if (isMatch) {
                    if (partnerObj.permission.forbidPartnerFromLogin) {
                        return Q.reject({
                            name: "DataError",
                            message: "Partner is forbidden to login",
                            code: constServerCode.PARTNER_IS_FORBIDDEN
                        });
                    }

                    if (partnerObj.status == constPartnerStatus.FORBID) {
                        return Q.reject({
                            name: "DataError",
                            message: "Partner is not enable",
                            code: constServerCode.PARTNER_IS_FORBIDDEN
                        });
                    }

                    var newAgentArray = partnerObj.userAgent || [];
                    var uaObj = {
                        browser: userAgent.browser.name || '',
                        device: userAgent.device.name || '',
                        os: userAgent.os.name || '',
                    };
                    var bExit = false;

                    if(newAgentArray && typeof newAgentArray.forEach == "function" ){
                        newAgentArray.forEach(
                            agent => {
                                if (agent.browser == uaObj.browser && agent.device == uaObj.device && agent.os == uaObj.os) {
                                    bExit = true;
                                }
                            }
                        );
                    }
                    else{
                        newAgentArray = [];
                        bExit = true;
                    }
                    if (!bExit) {
                        newAgentArray.push(uaObj);
                    }
                    //var geo = geoip.lookup(partnerData.lastLoginIp);
                    var updateData = {
                        isLogin: true,
                        lastLoginIp: partnerData.lastLoginIp,
                        userAgent: newAgentArray,
                        $inc: {loginTimes: 1},
                        lastAccessTime: new Date().getTime(),
                    };
                    var geoInfo = {};
                    if(partnerData.lastLoginIp && partnerData.lastLoginIp != "undefined"){
                        var ipData = dbUtil.getIpLocationByIPIPDotNet(partnerData.lastLoginIp);
                        if(ipData){
                            geoInfo.ipArea = ipData;
                            geoInfo.country = ipData.country || null;
                            geoInfo.city = ipData.city || null;
                            geoInfo.province = ipData.province || null;
                        }else{
                            geoInfo.ipArea = {'province':'', 'city':''};
                            geoInfo.country = "";
                            geoInfo.city = "";
                            geoInfo.province = "";
                        }
                    }
                    //Object.assign(updateData, geoInfo);
                    return dbconfig.collection_partner.findOneAndUpdate({
                        _id: partnerObj._id,
                        platform: platformObjId
                    }, updateData).populate({
                        path: "level",
                        model: dbconfig.collection_partnerLevel
                    }).populate({
                        path: "player",
                        model: dbconfig.collection_players
                    }).lean().then(
                        data => {
                            //add player login record
                            var recordData = {
                                partner: data._id,
                                platform: platformObjId,
                                loginIP: partnerData.lastLoginIp,
                                clientDomain: partnerData.clientDomain ? partnerData.clientDomain : "",
                                userAgent: uaObj
                            };
                            Object.assign(recordData, geoInfo);
                            var record = new dbconfig.collection_partnerLoginRecord(recordData);
                            return record.save().then(
                                () => {
                                    data.platform.partnerRequireLogInCaptcha = requireLogInCaptcha;
                                    return data;
                                }
                            ).then(
                                () => {
                                    return dbconfig.collection_partner.findOne({_id: partnerObj._id}).populate({
                                        path: "level",
                                        model: dbconfig.collection_partnerLevel
                                    }).populate({
                                        path: "player",
                                        model: dbconfig.collection_players
                                    }).lean().then(
                                        res => {
                                            retObj = res;
                                            let a = retObj.bankAccountProvince ? pmsAPI.foundation_getProvince({provinceId: retObj.bankAccountProvince}) : true;
                                            let b = retObj.bankAccountCity ? pmsAPI.foundation_getCity({cityId: retObj.bankAccountCity}) : true;
                                            let c = retObj.bankAccountDistrict ? pmsAPI.foundation_getDistrict({districtId: retObj.bankAccountDistrict}) : true;
                                            return Q.all([a, b, c]);
                                        }
                                    ).then(
                                        zoneData => {
                                            retObj.bankAccountProvince = zoneData[0].province ? zoneData[0].province.name : retObj.bankAccountProvince;
                                            retObj.bankAccountCity = zoneData[1].city ? zoneData[1].city.name : retObj.bankAccountCity;
                                            retObj.bankAccountDistrict = zoneData[2].district ? zoneData[2].district.name : retObj.bankAccountDistrict;
                                            retObj.platform.partnerRequireLogInCaptcha = requireLogInCaptcha;
                                            return Q.resolve(retObj);
                                        },
                                        errorZone => {
                                            return Q.resolve(retObj);
                                        }
                                    );
                                }
                            );
                        },
                        error => {
                            return Q.reject({
                                name: "DBError",
                                message: "Error in updating player",
                                error: error
                            });
                        }
                    );
                } else {
                    return Q.reject({
                        name: "DataError",
                        message: "User name and password don't match",
                        code: constServerCode.INVALID_USER_PASSWORD
                    });
                }
            }
        );
    },

    partnerLoginWithSMSAPI: function (partnerData, userAgent, isSMSVerified) {
        let platformObjId = null;
        let partnerObj = null;

        return dbconfig.collection_platform.findOne({platformId: partnerData.platformId}).then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_partner.findOne({
                        phoneNumber: {$in: [partnerData.phoneNumber, rsaCrypto.encrypt(partnerData.phoneNumber), rsaCrypto.oldEncrypt(partnerData.phoneNumber)]},
                        platform: platformData._id
                    }).lean()
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            },
            error => {
                return Q.reject({name: "DBError", message: "Error in getting player platform data", error: error});
            }
        ).then(
            partner => {
                if (partner && isSMSVerified) {
                    platformObjId = partner.platform;
                    partnerObj = partner;

                    if (partnerObj.status == constPartnerStatus.FORBID) {
                        return Q.reject({
                            name: "DataError",
                            message: "Partner is not enable",
                            code: constServerCode.PARTNER_IS_FORBIDDEN
                        });
                    }
                    let newAgentArray = partnerObj.userAgent || [];
                    let uaObj = {
                        browser: userAgent.browser.name || '',
                        device: userAgent.device.name || '',
                        os: userAgent.os.name || '',
                    };
                    let bExit = false;
                    if(newAgentArray && typeof newAgentArray.forEach == "function" ){
                        newAgentArray.forEach(
                            agent => {
                                if (agent.browser == uaObj.browser && agent.device == uaObj.device && agent.os == uaObj.os) {
                                    bExit = true;
                                }
                            }
                        );
                    }
                    else{
                        newAgentArray = [];
                        bExit = true;
                    }
                    if (!bExit) {
                        newAgentArray.push(uaObj);
                    }
                    //let geo = geoip.lookup(partnerData.lastLoginIp);
                    let updateData = {
                        isLogin: true,
                        lastLoginIp: partnerData.lastLoginIp,
                        userAgent: newAgentArray,
                        lastAccessTime: new Date().getTime(),
                    };
                    // let geoInfo = {};
                    // if (geo && geo.ll && !(geo.ll[1] == 0 && geo.ll[0] == 0)) {
                    //     geoInfo = {
                    //         country: geo ? geo.country : null,
                    //         city: geo ? geo.city : null,
                    //         longitude: geo && geo.ll ? geo.ll[1] : null,
                    //         latitude: geo && geo.ll ? geo.ll[0] : null
                    //     }
                    // }
                    // Object.assign(updateData, geoInfo);
                    return dbconfig.collection_partner.findOneAndUpdate({
                        _id: partnerObj._id,
                        platform: platformObjId
                    }, updateData).populate({
                        path: "level",
                        model: dbconfig.collection_partnerLevel
                    }).populate({
                        path: "player",
                        model: dbconfig.collection_players
                    }).lean().then(
                        data => {
                            //add player login record
                            let recordData = {
                                partner: data._id,
                                platform: platformObjId,
                                loginIP: partnerData.lastLoginIp,
                                clientDomain: partnerData.clientDomain ? partnerData.clientDomain : "",
                                userAgent: uaObj
                            };
                            //Object.assign(recordData, geoInfo);
                            let record = new dbconfig.collection_partnerLoginRecord(recordData);
                            return record.save().then(
                                () => data
                            );
                        },
                        error => {
                            return Q.reject({
                                name: "DBError",
                                message: "Error in updating player",
                                error: error
                            });
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        );
    },

    authenticate: function (partnerId, token, partnerIp, conn) {
        var deferred = Q.defer();
        jwt.verify(token, constSystemParam.API_AUTH_SECRET_KEY, function (err, decoded) {
            if (err) {
                // Jwt token error
                deferred.reject({name: "DataError", message: "Token is not authenticated"});
            }
            else {
                dbconfig.collection_partner.findOne({partnerId: partnerId}).then(
                    partnerData => {
                        if (partnerData) {
                            if (decoded && decoded.name == partnerData.name) {
                                conn.isAuth = true;
                                conn.partnerId = partnerId;
                                conn.partnerObjId = partnerData._id;
                                deferred.resolve(true);
                            }
                            else {
                                deferred.reject({name: "DataError", message: "Patner name doesn't match!"});
                            }
                        }
                        else {
                            deferred.reject({name: "DataError", message: "Can't find player"});
                        }
                    }
                );

            }
        });

        return deferred.promise;
    },

    partnerLogout: function (partnerData) {
        var time_now = new Date().getTime();
        var updateData = {isLogin: false, lastAccessTime: time_now};

        return dbUtil.findOneAndUpdateForShard(dbconfig.collection_partner, {partnerId: partnerData.partnerId}, updateData, constShardKeys.collection_partner);
    },

    /**
     *  Update password
     */
    updatePassword: function (partnerId, currPassword, newPassword, smsCode) {
        let db_password = null;
        let partnerObj = null;
        // compare the user entered old password and password from db
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).then(
            data => {
                if (data) {
                    partnerObj = data;
                    db_password = String(data.password);

                    return dbconfig.collection_platform.findOne({
                        _id: partnerObj.platform
                    }).lean();
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Can not find partner"
                    });
                }
            }
        ).then(
            platformData => {
                if (platformData) {
                    // Check if platform sms verification is required
                    if (!platformData.partnerRequireSMSVerificationForPasswordUpdate) {
                        // SMS verification not required
                        return Q.resolve(true);
                    } else {
                        return dbPlayerMail.verifySMSValidationCode(partnerObj.phoneNumber, platformData, smsCode, partnerObj.partnerName, true);
                    }
                } else {
                    return Q.reject({
                        name: "DataError",
                        code: constServerCode.DOCUMENT_NOT_FOUND,
                        message: "Unable to find platform"
                    });
                }
            }
        ).then(
            isVerified => {
                if (isVerified) {
                    if (dbUtil.isMd5(db_password)) {
                        if (md5(currPassword) == db_password) {
                            return Q.resolve(true);
                        }
                        else {
                            return Q.resolve(false);
                        }
                    }
                    else {
                        let passDefer = Q.defer();
                        bcrypt.compare(String(currPassword), db_password, function (err, isMatch) {
                            if (err) {
                                passDefer.reject({
                                    name: "DataError",
                                    message: "Error in matching password",
                                    error: err
                                });
                            }
                            passDefer.resolve(isMatch);
                        });
                        return passDefer.promise;
                    }
                }
            }
        ).then(
            isMatch => {
                if (isMatch) {
                    let updateDefer = Q.defer();
                    bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
                        if (err) {
                            updateDefer.reject(err);
                        }
                        bcrypt.hash(newPassword, salt, function (err, hash) {
                            if (err) {
                                updateDefer.reject(err);
                            }
                            // override the cleartext password with the hashed one
                            dbconfig.collection_partner.findOneAndUpdate({_id: partnerObj._id, platform: partnerObj.platform}, {password: hash}).lean().then(
                                updateDefer.resolve, updateDefer.reject
                            );

                        });
                    });
                    return updateDefer.promise;

                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Password do not match",
                        error: "Password do not match"
                    });
                }
            }
        );
    },
    updatePartnerBankInfo: function (userAgent, partnerId, updateData) {
        let partnerData;
        let platformData = null;
        let partnerQuery = null;
        let duplicatedRealNameCount = 0;
        let sameBankAccCount = 0;
        let platformObjId;
        let isVerifiedData;
        return dbconfig.collection_partner.findOne({partnerId: partnerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .then(
                partnerResult => {
                    platformObjId = partnerResult.platform;
                    partnerQuery = {
                        _id: partnerResult._id,
                        platform: partnerResult.platform
                    }
                    partnerData = partnerResult;
                    platformData = partnerResult.platform;
                    updateData.curData = {};

                    if(partnerResult.bankAccount){
                        updateData.curData.bankAccount = partnerResult.bankAccount;
                    }

                    if(partnerResult.bankAccountName){
                        updateData.curData.bankAccountName = partnerResult.bankAccountName;
                    }

                    if(partnerResult.bankName){
                        updateData.curData.bankName = partnerResult.bankName;
                    }

                    return dbconfig.collection_partner.find({
                        bankAccount: updateData.bankAccount,
                        platform: partnerData.platform._id,
                        'permission.forbidPartnerFromLogin': false
                    }).lean().count();
                }
            ).then(
                retCount => {
                    sameBankAccCount = retCount || 0;

                    return dbconfig.collection_partner.find({realName : updateData.bankAccountName, platform: partnerData.platform._id}).lean().count().then(
                        count => {
                            duplicatedRealNameCount = count || 0;

                            if (partnerData && partnerData.platform) {
                                // Check if partner sms verification is required
                                if (!partnerData.platform.partnerRequireSMSVerificationForPaymentUpdate) {
                                    // SMS verification not required
                                    return Q.resolve(true);
                                } else {
                                    return dbPlayerMail.verifySMSValidationCode(partnerData.phoneNumber, partnerData.platform, updateData.smsCode, partnerData.partnerName, true);
                                }
                            } else {
                                return Q.reject({name: "DataError", message: "Cannot find partner"});
                            }
                        }
                    )
                }
            ).then(
                isVerified => {

                    isVerifiedData = isVerified;

                    let propQuery = {
                        status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                        'data.platformId': partnerData.platform._id,
                        'data.partnerName': partnerData.partnerName,
                        'data.partnerId': partnerData.partnerId
                    };

                    return dbPropUtil.getOneProposalDataOfType(partnerData.platform._id, constProposalType.UPDATE_PARTNER_BANK_INFO, propQuery).then(
                        proposal => {
                            if (!proposal) {
                                return {isFirstBankInfo: true};
                            }
                        }
                    );

            }).then(
                 firstBankInfo => {

                    if (isVerifiedData) {

                        updateData.updateData = {};

                        if(updateData.bankAccount){
                            updateData.updateData.bankAccount = updateData.bankAccount;
                        }

                        if(updateData.bankAccountName){
                            updateData.updateData.bankAccountName = updateData.bankAccountName;
                        }

                        if(updateData.bankName){
                            updateData.updateData.bankName = updateData.bankName;
                        }


                        if (firstBankInfo && firstBankInfo.hasOwnProperty('isFirstBankInfo') && firstBankInfo.isFirstBankInfo) {
                            if (updateData && updateData.bankAccountName) {
                                updateData.realName = updateData.bankAccountName;
                            }

                        } else {
                            if(partnerData.bankAccountName){
                                delete updateData.bankAccountName;
                            }

                            if (updateData.bankAccountName && !partnerData.realName) {
                                if (updateData.bankAccountName.indexOf('*') > -1)
                                    delete updateData.bankAccountName;
                                else
                                    updateData.realName = updateData.bankAccountName;
                            }

                            if (!updateData.bankAccountName && !partnerData.bankAccountName && !partnerData.realName) {
                                return Q.reject({
                                    name: "DataError",
                                    code: constServerCode.INVALID_DATA,
                                    message: "Please enter bank account name or contact cs"
                                });
                            }
                        }

                        // if (updateData.bankAccountType) {
                        //     let tempBankAccountType = updateData.bankAccountType;
                        //     let isValidBankType = Number.isInteger(Number(tempBankAccountType));
                        //     if (!isValidBankType) {
                        //         return Q.reject({
                        //             name: "DataError",
                        //             code: constServerCode.INVALID_DATA,
                        //             message: "Invalid bank account type"
                        //         });
                        //     }
                        // }
                        updateData.bankAccountType = 2;
                        updateData.isIgnoreAudit = true;

                        // check if same real name can be used for registration
                        if (updateData.realName && duplicatedRealNameCount > 0 && !partnerData.platform.partnerAllowSameRealNameToRegister){
                            return Q.reject({
                                name: "DataError",
                                code: constServerCode.INVALID_DATA,
                                message: "The name has been registered, please change a new bank card or contact our cs."
                            });
                        }

                        // check if the same bank account count exceeds the pre-defined limit
                        if (platformData && platformData.partnerSameBankAccountCount && sameBankAccCount >= platformData.partnerSameBankAccountCount && partnerData.bankAccount != updateData.bankAccount){
                            return Q.reject({
                                name: "DataError",
                                code: constServerCode.INVALID_DATA,
                                message: "The identical bank account has been registered, please change a new bank card or contact our cs, thank you!"
                            });
                        }

                        // if(!partnerData.bankAccountName){
                        //     updateData.bankAccountName = partnerData.realName ? partnerData.realName : '';
                        // }
                        // let partnerProm = dbutility.findOneAndUpdateForShard(dbconfig.collection_partner, partnerQuery, updateData, constShardKeys.collection_partner);
                        // return Promise.all([partnerProm]);
                        let inputDeviceData = dbutility.getInputDevice(userAgent, true);
                        updateData._id = partnerData._id || "";
                        updateData.partnerObjId = partnerData._id || "";
                        updateData.partnerName = partnerData.partnerName || "";

                        return dbProposal.createProposalWithTypeNameWithProcessInfo(platformObjId, constProposalType.UPDATE_PARTNER_BANK_INFO, {
                            creator: {type: "partner", name: partnerData.partnerName, id: partnerData._id},
                            data: updateData,
                            inputDevice: inputDeviceData
                        });

                        // return updateData;
                    }
                }
            ).then(
                proposal => {
                    if (!proposal){
                        return Promise.reject({
                            name: "DataError",
                            message: "proposal data is not found"
                        });
                    }
                    return updateData;
                }
            )
    },

    updatePartnerCommissionType: function (userAgent, partnerId, data) {
        return dbconfig.collection_partner.findOne({partnerId: partnerId})
            .populate({path: "platform", model: dbconfig.collection_platform}).then(
                partnerData => {
                    if (partnerData && partnerData.platform) {
                        if (partnerData.commissionType == constPartnerCommissionType.OPTIONAL_REGISTRATION) {
                            data.commissionType = Number(data.commissionType);
                            let inputDevice = dbutility.getInputDevice(userAgent,true);
                            return dbProposal.createProposalWithTypeNameWithProcessInfo(partnerData.platform._id, constProposalType.UPDATE_PARTNER_COMMISSION_TYPE, {
                                creator: {type: "partner", name: partnerData.partnerName, id: partnerData._id},
                                data: {
                                    _id: partnerData._id || "",
                                    partnerName: partnerData.partnerName,
                                    parternId: partnerData.partnerId,
                                    partnerObjId: partnerData._id,
                                    updateData: data,
                                    remark: localization.localization.translate(Object.keys(constPartnerCommissionType)[data.commissionType])
                                },
                                inputDevice: inputDevice? inputDevice: 0
                            });
                        } else {
                            return Q.reject({name: "DataError", message: "Fail to update commission type"});
                        }
                    } else {
                        return Q.reject({name: "DataError", message: "Cannot find partner"});
                    }
                }
            );

    },

    verifyPartnerBankAccount: function (partnerObjId, bankAccount) {
        return dbconfig.collection_partner.findOne({_id: partnerObjId, bankAccount: bankAccount}).then(
            partnerData => {
                return Boolean(partnerData);
            }
        )
    },

    verifyPartnerPhoneNumber: function (partnerObjId, phoneNumber) {
        let enPhoneNumber = rsaCrypto.encrypt(phoneNumber);
        let enOldPhoneNumber = rsaCrypto.oldEncrypt(phoneNumber);
        return dbconfig.collection_partner.findOne({
            _id: partnerObjId,
            phoneNumber: {$in: [phoneNumber, enPhoneNumber, enOldPhoneNumber]}
        }).then(
            partnerData => {
                return Boolean(partnerData);
            }
        )
    },

    getPlayerSimpleList: function (partnerId, queryType, startTime, endTime, startIndex, requestCount, sort) {
        var seq = sort ? -1 : 1;
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    var query = {partner: partnerData._id};
                    var sortObj = {registrationTime: seq};
                    if (queryType == "registrationTime" && (startTime != null || endTime != null)) {
                        query.registrationTime = {};
                        if (startTime) {
                            query.registrationTime["$gte"] = new Date(startTime);
                        }
                        if (endTime) {
                            query.registrationTime["$lt"] = new Date(endTime);
                        }
                    }
                    if (queryType == "lastAccessTime" && (startTime != null || endTime != null)) {
                        query.lastAccessTime = {};
                        if (startTime) {
                            query.lastAccessTime["$gte"] = new Date(startTime);
                        }
                        if (endTime) {
                            query.lastAccessTime["$lt"] = new Date(endTime);
                        }
                        sortObj = {lastAccessTime: seq};
                    }
                    var countProm = dbconfig.collection_players.find(query).count();
                    var partnerProm = dbconfig.collection_players.find(query).skip(startIndex).limit(requestCount).sort(sortObj).lean();
                    return Q.all([partnerProm, countProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            data => {
                if (data) {
                    var stats = {
                        totalCount: data[1],
                        startIndex: startIndex
                    };
                    return {
                        stats: stats,
                        records: data[0]
                    };
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner player"});
                }
            }
        );
    },

    getDomainList: function (partnerId) {
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).lean().then(
            partnerData => {
                if (partnerData) {
                    var res = {
                        playerSpreadUrl: partnerData.platform.playerInvitationUrl,
                        partnerSpreadUrl: partnerData.platform.partnerInvitationUrl
                    };
                    if (partnerData.ownDomain) {
                        res.selfSpreadUrl = partnerData.ownDomain;
                    }
                    return res;
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        );
    },

    getStatistics: function (partnerId, queryType) {
        var partnerObj = null;
        var queryTime = dbUtil.getTodaySGTime();
        switch (queryType) {
            case "day":
                break;
            case "week":
                queryTime = dbUtil.getCurrentWeekSGTime();
                break;
            case "month":
                queryTime = dbUtil.getCurrentMonthSGTIme();
                break;
            default:
                break;
        }
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;
                    var playersProm = dbconfig.collection_players.find({
                        partner: partnerData._id,
                        platform: partnerData.platform
                    }).lean();
                    var bonusProposalType = dbconfig.collection_proposalType.findOne({
                        platformId: partnerData.platform,
                        name: constProposalType.PLAYER_BONUS
                    }).lean();
                    return Q.all([playersProm, bonusProposalType]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            data => {
                if (data && data[0] && data[1]) {
                    var playerObjIds = data[0].map(player => player._id);
                    var bonusProposalType = data[1];
                    //下线玩家充值额, 下线玩家兑奖额, 所获奖励额, 下线玩家赢利额, 新注册下线玩家数, 活跃玩家数, 新注册下线渠道
                    var topUpPorm = dbconfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                playerId: {$in: playerObjIds},
                                platformId: partnerObj.platform,
                                createTime: {
                                    $gte: queryTime.startTime,
                                    $lt: queryTime.endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$platformId",
                                totalAmount: {$sum: "$amount"}
                            }
                        }
                    );
                    //下线玩家兑奖额
                    var bonusProposalProm = dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: bonusProposalType._id,
                                status: constProposalStatus.SUCCESS,
                                "data.playerObjId": {$in: playerObjIds},
                                createTime: {
                                    $gte: queryTime.startTime,
                                    $lt: queryTime.endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$type",
                                totalAmount: {$sum: "$data.amount"},
                            }
                        }
                    );
                    //所获奖励额
                    var rewardProm = dbconfig.collection_rewardLog.aggregate(
                        {
                            $match: {
                                platform: partnerObj.platform,
                                player: {$in: playerObjIds},
                                createTime: {
                                    $gte: queryTime.startTime,
                                    $lt: queryTime.endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$platform",
                                totalAmount: {$sum: "$amount"},
                            }
                        }
                    );
                    //下线玩家赢利额
                    var playerProfitProm = dbPartner.getPartnerCommission(partnerObj.partnerId, queryTime.startTime, queryTime.endTime, 0, 0);
                    //新注册下线玩家数
                    var newPlayerProm = dbconfig.collection_players.find({
                        partner: partnerObj._id,
                        platform: partnerObj.platform,
                        registrationTime: {$gte: queryTime.startTime, $lt: queryTime.endTime}
                    }).count();
                    //活跃玩家数
                    var activePlayerProm = dbPartner.getPartnerActiveValidPlayers(partnerObj.platform, partnerObj._id, true, queryTime);
                    //新注册下线渠道
                    var newChildrenProm = dbconfig.collection_partner.find({
                        parent: partnerObj._id,
                        registrationTime: {$gte: queryTime.startTime, $lt: queryTime.endTime}
                    }).count();
                    return Q.all([topUpPorm, bonusProposalProm, rewardProm, playerProfitProm, newPlayerProm, activePlayerProm, newChildrenProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner player or bonus proposal type"});
                }
            }
        ).then(
            data => {
                if (data) {
                    //下线玩家充值额, 下线玩家兑奖额, 所获奖励额, 下线玩家赢利额, 新注册下线玩家数, 活跃玩家数, 新注册下线渠道
                    var resObj = {
                        queryType: queryType,
                        topup: 0,
                        getBonus: 0,
                        bonus: 0,
                        playerWin: 0,
                        newPlayers: 0,
                        activePlayers: 0,
                        subPartner: 0,
                    };
                    if (data[0] && data[0][0]) {
                        resObj.topup = data[0][0].totalAmount;
                    }
                    if (data[1] && data[1][0]) {
                        resObj.getBonus = data[1][0].totalAmount;
                    }
                    if (data[2] && data[2][0]) {
                        resObj.bonus = data[2][0].totalAmount;
                    }
                    if (data[3] && data[3].total) {
                        resObj.playerWin = data[3].total.profitAmount;
                    }
                    if (data[4]) {
                        resObj.newPlayers = data[4];
                    }
                    if (data[5]) {
                        resObj.activePlayers = data[5].length;
                    }
                    if (data[6]) {
                        resObj.subPartner = data[6];
                    }
                    return resObj;
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner statistics data"});
                }
            }
        );
    },

    getIpHistory: function (partnerId) {
        var p1 = dbconfig.collection_partnerLoginRecord.find({'partner': partnerId}).sort({"loginTime": 1}).limit(1).lean();
        var p2 = dbconfig.collection_partnerLoginRecord.find({'partner': partnerId}).sort({"loginTime": -1}).limit(20).lean();
        var returnData = {reg: [], login: []};
        return Q.all([p1, p2]).then(
            data => {
                if (data && data[0] && data[1]) {
                    returnData.reg = data[0];
                    returnData.login = data[1];
                    return returnData;
                } else return returnData;
            }
        )
    },

    bindPartnerPlayer: function (partnerId, playerName) {
        var partnerObj = null;
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;
                    return dbconfig.collection_players.findOne({
                        platform: partnerData.platform,
                        name: playerName
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    var proposalData = {
                        partnerObjId: partnerObj._id,
                        name: partnerObj.partnerName,
                        updateData: {
                            player: playerData._id
                        },
                        playerName: playerData.name
                    };
                    return dbProposal.createProposalWithTypeName(partnerObj.platform, constProposalType.UPDATE_PARTNER_INFO, {data: proposalData});
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player"});
                }
            }
        );
    },

    /*
     * Apply bonus
     */
    applyBonus: function (userAgent, partnerId, bonusId, amount, honoreeDetail, bForce, adminInfo) {

        let lastBonusRemark = "";
        let platform;
        let partner = null;
        // let bonusDetail = null;
        let bUpdateCredit = false;
        let resetCredit = function (partnerObjId, platformObjId, credit, error) {
            //reset partner credit if credit is incorrect
            return dbconfig.collection_partner.findOneAndUpdate(
                {
                    _id: partnerObjId,
                    platform: platformObjId
                },
                {$inc: {credits: credit}},
                {new: true}
            ).then(
                resetPartner => {
                    // dbLogger.createCreditChangeLog(playerObjId, platformObjId, credit, constPlayerCreditChangeType.PLAYER_BONUS_RESET_CREDIT, resetPlayer.validCredit, null, error);
                    if (error) {
                        return Q.reject(error);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "partner valid credit abnormal."});
                    }
                }
            );
        };
        bonusId = parseInt(bonusId);
        amount = parseInt(amount);

        return dbconfig.collection_partner.findOne({partnerId: partnerId})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                partnerData => {
                    //check if partner has pending proposal to update bank info
                    if (partnerData) {

                        let propQ = {
                            "data._id": String(partnerData._id)
                        };
                        platform = partnerData.platform;

                        return dbPropUtil.getProposalDataOfType(partnerData.platform._id, constProposalType.UPDATE_PARTNER_BANK_INFO, propQ).then(
                            proposals => {
                                if (proposals && proposals.length > 0) {
                                    let bExist = false;
                                    proposals.forEach(
                                        proposal => {
                                            if (proposal.status == constProposalStatus.PENDING ||
                                                (proposal.process && proposal.process.status == constProposalStatus.PENDING)) {
                                                bExist = true;
                                            }
                                        }
                                    );
                                    if (!bExist || bForce) {
                                        return partnerData;
                                    }
                                    else {
                                        return Promise.reject({
                                            name: "DataError",
                                            errorMessage: "partner is updating bank info"
                                        });
                                    }
                                }
                                else {
                                    return partnerData;
                                }
                            }
                        );
                    }
                    else {
                        return Promise.reject({name: "DataError", errorMessage: "Cannot find partner"});
                    }
                }
            ).then(
                partnerData => {
                    if (!partnerData) {
                        return Promise.reject({name: "DataError", errorMessage: "Cannot find partner"});
                    }

                    partner = partnerData;

                    let permissionProm = Promise.resolve(true);
                    let disablePermissionProm = Promise.resolve(true);
                    if (!partner.permission.applyBonus) {
                        permissionProm = dbconfig.collection_partnerPermissionLog.find(
                            {
                                partner: partner._id,
                                platform: platform._id,
                                // "oldData.applyBonus": true,
                                "newData.applyBonus": false,
                            },
                            {remark: 1}
                        ).sort({createTime: -1}).limit(1).lean().then(
                            log => {
                                if (log && log.length > 0) {
                                    lastBonusRemark = log[0].remark;
                                }
                            }
                        );

                        disablePermissionProm = dbconfig.collection_partnerPermissionLog.findOne({
                            partner: partner._id,
                            platform: platform._id,
                            isSystem: false
                        }).sort({createTime: -1}).lean().then(
                            manualPermissionSetting => {

                                if (manualPermissionSetting && manualPermissionSetting.newData && manualPermissionSetting.newData.hasOwnProperty('applyBonus')
                                    && manualPermissionSetting.newData.applyBonus.toString() == 'false') {
                                    return dbconfig.collection_proposal.find({
                                        'data.platformId': platform._id,
                                        'data.partnerObjId': partner._id,
                                        mainType: constProposalType.PARTNER_BONUS,
                                        status: {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                        'data.remark': '禁用提款: '+ lastBonusRemark
                                    }).sort({createTime: -1}).limit(1).then(proposalData => {
                                        if (proposalData && proposalData.length > 0) {
                                            lastBonusRemark = manualPermissionSetting.remark;
                                        }
                                    });
                                }
                            }
                        )
                    }
                    return Promise.all([permissionProm, disablePermissionProm])
                }
            ).then(
                res => {
                    if (partner){

                        // if (!partnerData.permission || !partnerData.permission.applyBonus) {
                        //     return Q.reject({
                        //         status: constServerCode.PLAYER_NO_PERMISSION,
                        //         name: "DataError",
                        //         errorMessage: "Player does not have this permission"
                        //     });
                        // }

                        // partner = partnerData;

                        if (partner.bankName == null || !partner.bankAccountName || !partner.bankAccountCity
                            || !partner.bankAccount || !partner.bankAccountProvince || (partner.bankAccount && partner.bankAccount.indexOf("*") > -1)) {
                            return Q.reject({
                                status: constServerCode.PLAYER_INVALID_PAYMENT_INFO,
                                name: "DataError",
                                errorMessage: "Partner does not have valid payment information"
                            });
                        }
                    
                        if ((parseFloat(partner.credits).toFixed(2)) < parseFloat(amount)) {
                            return Q.reject({
                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                name: "DataError",
                                errorMessage: "Partner does not have enough credit."
                            });
                        }

                        let changeCredit = -amount;
                        let finalAmount = amount;
                        let creditCharge = 0;
                        let amountAfterUpdate = partner.credits - amount;

                        return dbconfig.collection_partner.findOneAndUpdate(
                            {
                                _id: partner._id,
                                platform: partner.platform._id
                            },
                            {$inc: {credits: changeCredit}},
                            {new: true}
                        ).then(
                            //check if player's credit is correct after update
                            updateRes => dbconfig.collection_partner.findOne({_id: partner._id})
                        ).then(
                            newPartnerData => {
                                if (newPartnerData) {
                                    bUpdateCredit = true;
                                    //to fix float problem...
                                    if (newPartnerData.credits < -0.02) {
                                        //credit will be reset below
                                        return Q.reject({
                                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                            name: "DataError",
                                            errorMessage: "Partner does not have enough credit.",
                                            data: '(detected after withdrawl)'
                                        });
                                    }

                                    //check if player's credit is correct after update
                                    if (amountAfterUpdate != newPartnerData.credits) {
                                        console.log("PartnerBonus: Update partner credit failed", amountAfterUpdate, newPartnerData.credits);
                                        return Q.reject({
                                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                            name: "DataError",
                                            errorMessage: "Update partner credit failed",
                                            data: '(detected after withdrawl)'
                                        });
                                    }
                                    //fix player negative credit
                                    if (newPartnerData.credits < 0 && newPartnerData.credits > -0.02) {
                                        newPartnerData.credits = 0;
                                        dbconfig.collection_partner.findOneAndUpdate(
                                            {_id: newPartnerData._id, platform: newPartnerData.platform},
                                            {credits: 0}
                                        ).then();
                                    }
                                    partner.credits = newPartnerData.credits;
                                    //create proposal
                                    var proposalData = {
                                        creator: adminInfo || {
                                            type: 'partner',
                                            name: partner.partnerName,
                                            id: partnerId
                                        },
                                        partnerId: partnerId,
                                        partnerObjId: partner._id,
                                        partnerName: partner.partnerName,
                                        bonusId: bonusId,
                                        platformId: partner.platform._id,
                                        platform: partner.platform.platformId,
                                        bankTypeId: partner.bankName,
                                        amount: finalAmount,
                                        // bonusCredit: bonusDetail.credit,
                                        curAmount: partner.credits,
                                        remark: partner.remarks || "",
                                        lastSettleTime: new Date(),
                                        honoreeDetail: honoreeDetail || "",
                                        creditCharge: creditCharge,
                                       // ximaWithdrawUsed: ximaWithdrawUsed,
                                       // isAutoApproval: partner.platform.enableAutoApplyBonus
                                        //requestDetail: {bonusId: bonusId, amount: amount, honoreeDetail: honoreeDetail}
                                    };

                                    if(partner && partner.platform && partner.platform.partnerEnableAutoApplyBonus) {
                                        proposalData.isAutoApproval = partner.platform.enableAutoApplyBonus;
                                    }

                                    if (!partner.permission.applyBonus && partner.platform.playerForbidApplyBonusNeedCsApproval) {
                                        proposalData.remark = "禁用提款" + lastBonusRemark;
                                        proposalData.needCsApproved = true;
                                    }
                                    var newProposal = {
                                        creator: proposalData.creator,
                                        data: proposalData,
                                        entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                        userType: constProposalUserType.PARTNERS,
                                        isPartner: true

                                    };
                                    newProposal.inputDevice = dbUtil.getInputDevice(userAgent, false, adminInfo);

                                    return getPartnerAllCommissionAmount(partner.platform._id, partner._id, new Date()).then(
                                        partnerCommission => {
                                            newProposal.data.lastWithdrawalTotalCommission = partnerCommission && partnerCommission[0] && partnerCommission[0].amount || 0;
                                            return dbProposal.createProposalWithTypeName(partner.platform._id, constProposalType.PARTNER_BONUS, newProposal);
                                        });
                                }
                            })
                    }

                }
            ).then(
                proposal => {
                    if (proposal) {
                        if (proposal.data && proposal.data.amount && proposal.data.amount >= platform.partnerAutoApproveWhenSingleBonusApplyLessThan) {
                            createPartnerLargeWithdrawalLog(proposal, platform._id).catch(err => {
                                console.log("createLargeWithdrawalLog failed", err);
                                return errorUtils.reportError(err);
                            });
                        }

                        if (bUpdateCredit) {
                            //todo::partner credit change log???
                            //dbLogger.createCreditChangeLog(player._id, player.platform._id, -amount * bonusDetail.credit, constProposalType.PLAYER_BONUS, player.validCredit, null, message);
                        }
                        return proposal;
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create bonus proposal"});
                    }
                }
            ).then(
                data => {
                    let proposal = Object.assign({}, data);
                    proposal.type = proposal.type._id;
                    return dbconfig.collection_platform.findOne({_id: data.data.platformId}).lean().then(
                        platform => {
                            if (platform  && proposal.status == constProposalStatus.AUTOAUDIT) {
                                let proposals = [];
                                proposals.push(proposal);
                                dbAutoProposal.processPartnerAutoProposals(proposals, platform).catch(errorUtils.reportError);
                            }
                            return data;
                        },
                        error => {
                            errorUtils.reportError(error);
                            return data;
                        }
                    );
                },
                error => {
                    if (bUpdateCredit) {
                        return resetCredit(partner._id, partner.platform._id, amount, error);
                    }
                    else {
                        return Q.reject(error);
                    }
                }
            );

        // return pmsAPI.bonus_getBonusList({}).then(
        //     bonusData => {
        //         if (bonusData && bonusData.bonuses && bonusData.bonuses.length > 0) {
        //             let bValid = false;
        //             bonusData.bonuses.forEach(
        //                 bonus => {
        //                     if (bonus.bonus_id == bonusId) {
        //                         bValid = true;
        //                         bonusDetail = bonus;
        //                     }
        //                 }
        //             );
        //             if (bValid) {
        //                 return dbconfig.collection_partner.findOne({partnerId: partnerId})
        //                     .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
        //                         partnerData => {
        //                             //check if partner has pending proposal to update bank info
        //                             if (partnerData) {
        //                                 return dbconfig.collection_proposalType.findOne({
        //                                     platformId: partnerData.platform._id,
        //                                     name: constProposalType.UPDATE_PARTNER_BANK_INFO
        //                                 }).then(
        //                                     proposalType => {
        //                                         if (proposalType) {
        //                                             return dbconfig.collection_proposal.find({
        //                                                 type: proposalType._id,
        //                                                 "data.partnerName": partnerData.partnerName
        //                                             }).populate(
        //                                                 {path: "process", model: dbconfig.collection_proposalProcess}
        //                                             ).lean();
        //                                         }
        //                                         else {
        //                                             return Q.reject({
        //                                                 name: "DataError",
        //                                                 errorMessage: "Cannot find proposal type"
        //                                             });
        //                                         }
        //                                     }
        //                                 ).then(
        //                                     proposals => {
        //                                         if (proposals && proposals.length > 0) {
        //                                             let bExist = false;
        //                                             proposals.forEach(
        //                                                 proposal => {
        //                                                     if (proposal.status == constProposalStatus.PENDING ||
        //                                                         ( proposal.process && proposal.process.status == constProposalStatus.PENDING)) {
        //                                                         bExist = true;
        //                                                     }
        //                                                 }
        //                                             );
        //                                             if (!bExist || bForce) {
        //                                                 return partnerData;
        //                                             }
        //                                             else {
        //                                                 return Q.reject({
        //                                                     status: constServerCode.PLAYER_PENDING_PROPOSAL,
        //                                                     name: "DataError",
        //                                                     errorMessage: "Partner is updating bank info"
        //                                                 });
        //                                             }
        //                                         }
        //                                         else {
        //                                             return partnerData;
        //                                         }
        //                                     }
        //                                 );
        //                             }
        //                             else {
        //                                 return Q.reject({name: "DataError", errorMessage: "Cannot find partner"});
        //                             }
        //                         }
        //                     );
        //             }
        //             else {
        //                 return Q.reject({
        //                     status: constServerCode.INVALID_PARAM,
        //                     name: "DataError",
        //                     errorMessage: "Invalid bonus id"
        //                 });
        //             }
        //         }
        //         else {
        //             return Q.reject({name: "DataError", errorMessage: "Cannot find bonus"});
        //         }
        //     }
        // ).then(
        //     partnerData => {
        //         if (partnerData) {
        //             // if (!partnerData.permission || !partnerData.permission.applyBonus) {
        //             //     return Q.reject({
        //             //         status: constServerCode.PLAYER_NO_PERMISSION,
        //             //         name: "DataError",
        //             //         errorMessage: "Player does not have this permission"
        //             //     });
        //             // }
        //             if (partnerData.bankName == null || !partnerData.bankAccountName || !partnerData.bankAccountType || !partnerData.bankAccountCity
        //                 || !partnerData.bankAccount || !partnerData.bankAddress) {
        //                 return Q.reject({
        //                     status: constServerCode.PLAYER_INVALID_PAYMENT_INFO,
        //                     name: "DataError",
        //                     errorMessage: "Partner does not have valid payment information"
        //                 });
        //             }
        //
        //             if (partnerData.permission && !partnerData.permission.applyBonus) {
        //                 return Q.reject({
        //                     status: constServerCode.PARTNER_NO_PERMISSION,
        //                     name: "DataError",
        //                     errorMessage: "Partner is forbidden to apply bonus"
        //                 });
        //             }
        //
        //             //check if partner has enough credit
        //             partner = partnerData;
        //             if (partnerData.credits < bonusDetail.credit * amount) {
        //                 return Q.reject({
        //                     status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
        //                     name: "DataError",
        //                     errorMessage: "Partner does not have enough credit."
        //                 });
        //             }
        //             //check if player credit balance.
        //             // if (playerData.creditBalance > 0) {
        //             //     return Q.reject({
        //             //         status: constServerCode.PLAYER_CREDIT_BALANCE_NOT_ENOUGH,
        //             //         name: "DataError",
        //             //         errorMessage: "Player does not have enough Expenses."
        //             //     });
        //             // }
        //             return dbconfig.collection_partner.findOneAndUpdate(
        //                 {
        //                     _id: partner._id,
        //                     platform: partner.platform._id
        //                 },
        //                 {$inc: {credits: -amount * bonusDetail.credit}},
        //                 {new: true}
        //             ).then(
        //                 newPartnerData => {
        //                     if (newPartnerData) {
        //                         bUpdateCredit = true;
        //
        //                         if (newPartnerData.credits < 0) {
        //                             //credit will be reset below
        //                             return Q.reject({
        //                                 status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
        //                                 name: "DataError",
        //                                 errorMessage: "Partner does not have enough credit.",
        //                                 data: '(detected after withdrawl)'
        //                             });
        //                         }
        //
        //                         partner.validCredit = newPartnerData.validCredit;
        //                         //create proposal
        //                         let proposalData = {
        //                             creator: adminInfo || {
        //                                 type: 'partner',
        //                                 name: partner.partnerName,
        //                                 id: partnerId
        //                             },
        //                             partnerId: partnerId,
        //                             partnerObjId: partner._id,
        //                             partnerName: partner.partnerName,
        //                             bonusId: bonusId,
        //                             platformId: partner.platform._id,
        //                             platform: partner.platform.platformId,
        //                             amount: amount,
        //                             bonusCredit: bonusDetail.credit,
        //                             curAmount: partner.credits,
        //                             requestDetail: {bonusId: bonusId, amount: amount, honoreeDetail: honoreeDetail}
        //                         };
        //                         let newProposal = {
        //                             creator: proposalData.creator,
        //                             data: proposalData,
        //                             entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
        //                             userType: constProposalUserType.PARTNERS,
        //                         };
        //                         newProposal.inputDevice = dbutility.getInputDevice(userAgent,true);
        //                         return dbProposal.createProposalWithTypeName(partner.platform._id, constProposalType.PARTNER_BONUS, newProposal);
        //                     }
        //                 }
        //             );
        //         } else {
        //             return Q.reject({name: "DataError", errorMessage: "Cannot find partner"});
        //         }
        //     }
        // ).then(
        //     proposal => {
        //         if (proposal) {
        //             if (bUpdateCredit) {
        //                 //todo::partner credit change log???
        //                 //dbLogger.createCreditChangeLog(player._id, player.platform._id, -amount * bonusDetail.credit, constProposalType.PLAYER_BONUS, player.validCredit, null, message);
        //             }
        //             return proposal;
        //         }
        //         else {
        //             return Q.reject({name: "DataError", errorMessage: "Cannot create bonus proposal"});
        //         }
        //     }
        // ).then(
        //     data => data,
        //     error => {
        //         if (bUpdateCredit) {
        //             return resetCredit(partner._id, partner.platform._id, amount, error);
        //         }
        //         else {
        //             return Q.reject(error);
        //         }
        //     }
        // );
    },

    getPartnerChildrenReport: function (partnerId, startTime, endTime, startIndex, requestCount, sort) {
        var partnerData;
        var partners;
        var totalCount = 0;
        var summary;
        var seq = sort ? -1 : 1;
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            data => {
                partnerData = data;
                if (partnerData) {
                    var queryObj = {
                        parent: partnerData._id
                    };
                    if (startTime || endTime) {
                        queryObj.registrationTime = {};
                    }
                    if (startTime) {
                        queryObj.registrationTime["$gte"] = new Date(startTime);
                    }
                    if (endTime) {
                        queryObj.registrationTime["$lt"] = new Date(endTime);
                    }
                    //find all children partner
                    var partnerProm = dbconfig.collection_partner.find({parent: partnerData._id}).sort({registrationTime: seq}).skip(startIndex).limit(requestCount).lean();
                    var configProm = dbconfig.collection_partnerLevelConfig.findOne({platform: partnerData.platform}).lean();
                    var countProm = dbconfig.collection_partner.find({parent: partnerData._id}).count();
                    var bonusProposTypeProm = dbconfig.collection_proposalType.findOne({
                        platformId: partnerData.platform,
                        name: constProposalType.PLAYER_BONUS
                    }).lean();
                    return Q.all([partnerProm, configProm, countProm, bonusProposTypeProm]);
                }
                else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot find partner"});
                }
            }
        ).then(
            data => {
                if (data && data[0] && data[1]) {
                    totalCount = data[2];
                    //get all partner player top up amount
                    if (data[0] && data[0].length > 0) {
                        var proms = [];
                        data[0].forEach(
                            partner => {
                                proms.push(dbPartner.getChildPartnerReport(partner, data[1], data[3]));
                            }
                        );
                        return Q.all(proms)
                    }
                    else {
                        return [];
                    }
                }
                else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot find partner level config data"});
                }
            }
        ).then(
            data => {
                partners = data;
                summary = {
                    totalPlayerTopUpSum: 0,
                    totalActivePlayers: 0
                };
                if (partners && partners.length > 0) {
                    partners.forEach(
                        partner => {
                            summary.totalPlayerTopUpSum += partner.playerTopUpSum || 0;
                            summary.totalActivePlayers += partner.activePlayers || 0;
                        }
                    );
                }
            }
        ).then(
            () => {
                var queryObj = {
                    partner: partnerData._id
                };
                if (startTime || endTime) {
                    queryObj.settleTime = {};
                }
                if (startTime) {
                    queryObj.settleTime["$gte"] = new Date(startTime);
                }
                if (endTime) {
                    queryObj.settleTime["$lt"] = new Date(endTime);
                }
                return dbconfig.collection_partnerCommissionRecord.find(queryObj).select('totalCommissionOfChildren commissionAmountFromChildren').lean().then(
                    commissionRecords => {
                        summary.totalCommissionOfChildren = dataUtils.sum(dataUtils.pluck(commissionRecords, 'totalCommissionOfChildren'));
                        summary.totalCommissionFromChildren = dataUtils.sum(dataUtils.pluck(commissionRecords, 'commissionAmountFromChildren'));
                    }
                );
            }
        ).then(
            () => {
                return {
                    stats: {
                        startIndex: startIndex,
                        totalCount: totalCount
                    },
                    children: partners,
                    summary: summary
                };
            }
        );
    },

    getChildPartnerReport: function (partnerObj, partnerLevelConfig, bonusProposalType) {
        //get partner active player
        bonusProposalType = bonusProposalType || {};
        var weekTime = dbUtil.getCurrentWeekSGTime();
        var startTime = weekTime.startTime;
        var endTime = weekTime.endTime;

        return dbconfig.collection_players.find(
            {
                platform: partnerObj.platform,
                partner: partnerObj._id
            }
        ).lean().then(
            function (playerData) {
                if (playerData.length > 0) {
                    var playerIds = playerData.map(player => player._id);
                    //var playersById = dataUtils.byKey(playerData, '_id');
                    var playerTopUpSum = 0;
                    playerData.forEach(
                        player => {
                            playerTopUpSum += player.topUpSum;
                        }
                    );
                    const matchPlayerSummaries = {
                        platformId: partnerObj.platform,
                        playerId: {$in: playerIds},
                        date: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    };
                    const consumptionSummariesProm = dbconfig.collection_playerConsumptionWeekSummary.find(matchPlayerSummaries);
                    const topUpSummariesProm = dbconfig.collection_playerTopUpWeekSummary.find(matchPlayerSummaries);
                    const bonusProposalProm = dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: bonusProposalType._id,
                                status: constProposalStatus.SUCCESS,
                                "data.playerObjId": {$in: playerIds}
                            }
                        },
                        {
                            $group: {
                                _id: "$type",
                                totalAmount: {$sum: {$multiply: ["$data.amount", "$data.bonusCredit"]}},
                            }
                        }
                    );

                    return Q.all([consumptionSummariesProm, topUpSummariesProm, bonusProposalProm]).then(
                        function (data) {
                            const consumptionSummaries = data[0];
                            const topUpSummaries = data[1];
                            const consumptionSummariesByPlayerId = dataUtils.byKey(consumptionSummaries, 'playerId');
                            const topUpSummariesByPlayerId = dataUtils.byKey(topUpSummaries, 'playerId');

                            var activePlayerCount = 0;
                            playerIds.forEach(
                                function (playerId) {
                                    const consumptionSummary = consumptionSummariesByPlayerId[playerId];
                                    const topUpSummary = topUpSummariesByPlayerId[playerId];
                                    if (consumptionSummary && topUpSummary) {
                                        var playerIsActive = consumptionSummary.times >= partnerLevelConfig.activePlayerConsumptionTimes
                                            && topUpSummary.times >= partnerLevelConfig.activePlayerTopUpTimes;

                                        if (playerIsActive) {
                                            activePlayerCount++;
                                        }
                                    }
                                }
                            );
                            //下线玩家总数，活跃玩家数，玩家总充值额，玩家总兑奖额， 下线渠道奖金总额，从下线渠道所获奖金
                            partnerObj.playerTopUpSum = playerTopUpSum;
                            partnerObj.activePlayers = activePlayerCount;
                            partnerObj.playerBonusSum = 0;
                            if (data[2] && data[2][0]) {
                                partnerObj.playerBonusSum = data[2][0].totalAmount;
                            }

                            return partnerObj;
                        }
                    );
                }
                else {
                    return partnerObj;
                }
            }
        );
    },

    getPartnerPlayerRegistrationReport: function (partnerId, startTime, endTime, domain, playerName, startIndex, requestCount, sort) {
        var seq = sort ? -1 : 1;
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    var queryObj = {
                        partner: partnerData._id
                    };
                    if (domain) {
                        queryObj.domain = domain;
                    }
                    if (playerName) {
                        queryObj.name = playerName;
                    }
                    if (startTime || endTime) {
                        queryObj.registrationTime = {};
                    }
                    if (startTime) {
                        queryObj.registrationTime["$gte"] = new Date(startTime);
                    }
                    if (endTime) {
                        queryObj.registrationTime["$lt"] = new Date(endTime);
                    }
                    var playersProm = dbconfig.collection_players.find(queryObj)
                        .sort({registrationTime: seq}).skip(startIndex).limit(requestCount)
                        .select('playerId name realName topUpTimes lastAccessTime registrationTime lastLoginIp topUpTimes domain')
                        .lean();
                    var countProm = dbconfig.collection_players.find(queryObj).count();
                    return Q.all([playersProm, countProm]);
                }
                else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot find partner"});
                }
            }
        ).then(
            data => {
                var players = data[0];
                var count = data[1];

                return {
                    stats: {
                        startIndex: startIndex,
                        totalCount: count,
                        requestCount: requestCount
                    },
                    players: players
                };
            }
        );
    },

    getAppliedBonusList: function (partnerId, startIndex, count, startTime, endTime, status, sort) {
        var seq = sort ? -1 : 1;
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).then(
            partnerData => {
                if (partnerData) {
                    //get partner bonus proposal type
                    return dbconfig.collection_proposalType.findOne({
                        platformId: partnerData.platform,
                        name: constProposalType.PARTNER_BONUS
                    });
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            typeData => {
                if (typeData) {
                    var queryObj = {
                        "data.partnerId": partnerId,
                        type: typeData._id
                    };
                    if (status) {
                        queryObj.status = status;
                    }
                    if (startTime || endTime) {
                        queryObj.createTime = {};
                    }
                    if (startTime) {
                        queryObj.createTime["$gte"] = new Date(startTime);
                    }
                    if (endTime) {
                        queryObj.createTime["$lte"] = new Date(endTime);
                    }

                    var countProm = dbconfig.collection_proposal.find(queryObj).count();
                    var proposalProm = dbconfig.collection_proposal.find(queryObj).sort({createTime: seq}).skip(startIndex).limit(count).lean();

                    return Q.all([proposalProm, countProm]).then(
                        data => {
                            if (data && data[0] && data[1]) {
                                return {
                                    stats: {
                                        totalCount: data[1],
                                        startIndex: startIndex,
                                        requestCount: count
                                    },
                                    records: data[0]
                                }
                            }
                            else {
                                return {
                                    stats: {
                                        totalCount: data[1] || 0,
                                        startIndex: startIndex,
                                        requestCount: count
                                    },
                                    records: []
                                }
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        );
    },

    getPartnerPlayers: function (platformObjId, data) {

        var playerQuery = {
            registrationTime: {
                $gte: data.startTime,
                $lt: data.endTime
            }
        }
        if (data.isRealPlayer) {
            playerQuery.isRealPlayer = true;
        }
        if (data.isTestPlayer) {
            playerQuery.isTestPlayer = true;
        }
        return Q.resolve().then(
            () => {

                if (data.partnerName) {

                    //partnerQuery.partnerName = data.partnerName;
                    return dbconfig.collection_partner.findOne({partnerName: data.partnerName}).then(
                        partner => {
                            if (partner) {
                                playerQuery.partner = partner._id;
                                return dbPlayerInfo.getPagePlayerByAdvanceQuery(platformObjId, playerQuery, data.index, data.limit, data.sortCol);
                                //return dbPlayerInfo.getPlayerByAdvanceQuery(platformObjId, playerQuery);
                            }
                            else {
                                return {data: null, size: 0}
                            }
                        }
                    );
                }
                else {
                    playerQuery.partner = {$ne: null};
                    //return dbPlayerInfo.getPlayerByAdvanceQuery(platformObjId, playerQuery);
                    return dbPlayerInfo.getPagePlayerByAdvanceQuery(platformObjId, playerQuery, data.index, data.limit, data.sortCol);

                }

            });
    },

    getPartnerSummary: function (platformObjId, data) {
        // get Player summary
        var matchObj = {
            platform: mongoose.Types.ObjectId(platformObjId),
            registrationTime: {$gte: new Date(data.startTime), $lt: new Date(data.endTime)}
        }
        if (data.isRealPlayer) {
            matchObj.isRealPlayer = true;
        }
        if (data.isTestPlayer) {
            matchObj.isTestPlayer = true;
        }

        return Q.resolve().then(
            () => {
                if (data.partnerName) {

                    //partnerQuery.partnerName = data.partnerName;
                    return dbconfig.collection_partner.findOne({partnerName: data.partnerName, platform: platformObjId}).then(
                        partner => {
                            if (partner) {
                                matchObj.partner = partner._id;
                                return dbconfig.collection_players.aggregate(
                                    {
                                        $match: matchObj
                                    },
                                    {
                                        $group: {
                                            _id: "$partner",
                                            total_players: {$sum: 1},
                                            total_topup_times: {$sum: "$topUpTimes"},
                                            total_consumption_times: {$sum: "$consumptionTimes"}
                                        }
                                    }
                                ).exec();
                            }
                            else {
                                return {data: null};
                            }
                        }
                    );
                }
                else {
                    matchObj.partner = {$ne: null};
                    return dbconfig.collection_players.aggregate(
                        {
                            $match: matchObj
                        },
                        {
                            $group: {
                                _id: "$partner",
                                total_players: {$sum: 1},
                                total_topup_times: {$sum: "$topUpTimes"},
                                total_consumption_times: {$sum: "$consumptionTimes"}
                            }
                        }
                    ).exec();
                }
            }).then(
            playerPartnerSummary => {

                return dbconfig.collection_players.populate(playerPartnerSummary, {
                    "path": "_id",
                    model: dbconfig.collection_partner
                })
            }
        );
    },

    getPartnerPlayerBonusReport: function (platform, partnerName, startTime, endTime, index, limit) {
        return dbconfig.collection_partner.findOne({partnerName: partnerName, platform: platform}).lean().then(
            data => {
                if (data && data.partnerId && String(data.platform) == String(platform)) {
                    return dbPartner.getPartnerPlayerPaymentReport(data.partnerId, startTime, endTime, index, limit)
                        .then(data => {
                            data.summary = data.summary || {};
                            data.stats = data.stats || {totalCount: 0};
                            data.players = data.players || [];
                            return data;
                        })
                } else {
                    return {name: "DataError", message: "Cannot find partner", players: []};
                }
            }
        )
    },

    getPartnerPlayerPaymentReport: function (partnerId, startTime, endTime, startIndex, requestCount, sort) {
        var seq = sort ? -1 : 1;
        if (!startTime && !endTime) {
            var monthTime = dbUtil.getCurrentMonthSGTIme();
            startTime = monthTime.startTime;
            endTime = monthTime.endTime;
        }
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    var allPlayerProm = dbconfig.collection_players.find({
                        platform: partnerData.platform,
                        partner: partnerData._id
                    }).lean();
                    var pagePlayerProm = dbconfig.collection_players.find({
                        platform: partnerData.platform,
                        partner: partnerData._id
                    }).sort({registrationTime: seq}).skip(startIndex).limit(requestCount).lean();
                    var bonusProposTypeProm = dbconfig.collection_proposalType.findOne({
                        platformId: partnerData.platform,
                        name: constProposalType.PLAYER_BONUS
                    }).lean();
                    return Q.all([allPlayerProm, pagePlayerProm, bonusProposTypeProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            data => {
                var allPlayers = data[0];
                var pagePlayers = data[1];
                //最近兑奖时间，兑奖总次数，总兑奖额，充值次数（查询其间)，兑奖次数，充值额，兑奖额
                var pageProms = [];
                pagePlayers.forEach(
                    player => {
                        pageProms.push(dbPartner.getPlayerPaymentDetail(player, startTime, endTime, data[2]));
                    }
                );
                //get all summary
                var allProms = [];
                allPlayers.forEach(
                    player => {
                        allProms.push(dbPartner.getPlayerPaymentSummary(player, startTime, endTime, data[2]));
                    }
                );

                return Q.all([Q.all(pageProms), Q.all(allProms)]);
            }
        ).then(
            data => {
                if (data && data[0] && data[1]) {
                    var pageSummary = {
                        totalTopUpTimes: 0,
                        totalBonusTimes: 0,
                        totalTopUpAmount: 0,
                        totalBonusAmount: 0,
                        totalConsumptionAmount: 0,
                        totalConsumptionTimes: 0,
                        topUpTimes: 0,
                        bonusTimes: 0,
                        topUpAmount: 0,
                        bonusAmount: 0,
                        totalValidConsumptionAmount: 0,
                        totalBonusConsumptionAmount: 0
                    };
                    var summary = Object.assign({}, pageSummary);
                    data[0].forEach(
                        player => {
                            Object.keys(pageSummary).forEach(
                                key => pageSummary[key] += player[key]
                            );
                        }
                    );
                    data[1].forEach(
                        player => {
                            Object.keys(summary).forEach(
                                key => summary[key] += player[key]
                            );
                        }
                    );
                    return {
                        stats: {
                            totalCount: data[1].length,
                            startIndex: startIndex
                        },
                        summary: summary,
                        pageSummary: pageSummary,
                        players: data[0]
                    };
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner player payment data"});
                }
            }
        );

    },

    getPlayerPaymentSummary: function (playerObj, startTime, endTime, bonusProposalType) {
        var bonusProposalProm = dbconfig.collection_proposal.find({
            type: bonusProposalType._id,
            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED, constProposalStatus.PENDING]},
            "data.playerObjId": playerObj._id
        }).sort({createTime: -1}).lean();

        var topUpRecordProm = dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    platformId: playerObj.platform,
                    playerId: playerObj._id,
                    createTime: {$gte: startTime, $lt: endTime},
                }
            },
            {
                $group: {
                    _id: {playerId: "$playerId"},
                    amount: {$sum: "$amount"},
                    times: {$sum: 1}
                }
            }
        ).exec();
        var consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate(
            {
                $match: {
                    platformId: playerObj.platform,
                    playerId: playerObj._id,
                    createTime: {$gte: startTime, $lt: endTime},
                }
            },
            {
                $group: {
                    _id: {playerId: "$playerId"},
                    validAmount: {$sum: "$validAmount"},
                    bonusAmount: {$sum: "$bonusAmount"},
                    times: {$sum: 1}
                }
            }
        );
        return Q.all([bonusProposalProm, topUpRecordProm, consumptionProm]).then(
            data => {
                var bonusProposals = data[0];
                var topUpRecords = data[1];
                var consumptionInfo = data[2];

                var totalBonusTimes = bonusProposals.length;
                var totalBonusAmount = 0;
                var topUpTimes = topUpRecords[0] ? topUpRecords[0].times : 0;
                var topUpAmount = topUpRecords[0] ? topUpRecords[0].amount : 0;
                var bonusTimes = 0;
                var bonusAmount = 0;

                bonusProposals.forEach(
                    proposal => {
                        var bonusCredit = proposal.data.amount || 0;
                        totalBonusAmount += bonusCredit;
                        if (proposal.createTime.getTime() < endTime.getTime() && proposal.createTime.getTime() >= startTime.getTime()) {
                            bonusTimes++;
                            bonusAmount += Number(bonusCredit);
                        }
                    }
                );
                //充值总次数，兑奖总次数，总充值额，总兑奖额，充值次数（查询其间），兑奖次数，充值额，兑奖额
                return {
                    totalTopUpTimes: playerObj.topUpTimes,
                    totalBonusTimes: totalBonusTimes,
                    totalTopUpAmount: playerObj.topUpSum,
                    totalConsumptionAmount: playerObj.consumptionSum,
                    totalConsumptionTimes: playerObj.consumptionTimes,
                    totalBonusAmount: totalBonusAmount,
                    topUpTimes: topUpTimes,
                    bonusTimes: bonusTimes,
                    topUpAmount: topUpAmount,
                    bonusAmount: bonusAmount,
                    totalValidConsumptionAmount: consumptionInfo[0] ? consumptionInfo[0].validAmount : 0,
                    totalBonusConsumptionAmount: consumptionInfo[0] ? consumptionInfo[0].bonusAmount : 0
                };
            }
        );
    },

    getPlayerPaymentDetail: function (playerObj, startTime, endTime, bonusProposalType) {
        //最近充值时间，最近兑奖时间，充值总次数，兑奖总次数，总充值额，总兑奖额，充值次数（查询其间），兑奖次数，充值额，兑奖额
        var bonusProposalProm = dbconfig.collection_proposal.find({
            type: bonusProposalType._id,
            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED, constProposalStatus.PENDING]},
            "data.playerObjId": playerObj._id
        }).sort({createTime: -1}).lean();
        var latestTopUpRecordProm = dbconfig.collection_playerTopUpRecord.find({
            platformId: playerObj.platform,
            playerId: playerObj._id
        }).sort({createTime: -1}).limit(1).lean();
        var topUpRecordProm = dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    platformId: playerObj.platform,
                    playerId: playerObj._id,
                    createTime: {$gte: startTime, $lt: endTime},
                }
            },
            {
                $group: {
                    _id: {playerId: "$playerId"},
                    amount: {$sum: "$amount"},
                    times: {$sum: 1}
                }
            }
        ).exec();
        var consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate(
            {
                $match: {
                    platformId: playerObj.platform,
                    playerId: playerObj._id,
                    createTime: {$gte: startTime, $lt: endTime},
                }
            },
            {
                $group: {
                    _id: {playerId: "$playerId"},
                    validAmount: {$sum: "$validAmount"},
                    bonusAmount: {$sum: "$bonusAmount"}
                }
            }
        );
        return Q.all([bonusProposalProm, topUpRecordProm, latestTopUpRecordProm, consumptionProm]).then(
            data => {
                if (data && data[0] && data[1]) {
                    var bonusProposals = data[0];
                    var topUpRecords = data[1];
                    var consumptionInfo = data[3];

                    var lastTopUpTime = data[2][0] ? data[2][0].createTime : null;
                    var lastBonusTime = bonusProposals[0] ? bonusProposals[0].createTime : null;
                    var totalBonusTimes = bonusProposals.length;
                    var totalBonusAmount = 0;
                    var topUpTimes = topUpRecords[0] ? topUpRecords[0].times : 0;
                    var topUpAmount = topUpRecords[0] ? topUpRecords[0].amount : 0;
                    var bonusTimes = 0;
                    var bonusAmount = 0;

                    bonusProposals.forEach(
                        proposal => {
                            var bonusCredit = proposal.data.amount || 0;
                            totalBonusAmount += bonusCredit;
                            if (proposal.createTime.getTime() < endTime.getTime() && proposal.createTime.getTime() >= startTime.getTime()) {
                                bonusTimes++;
                                bonusAmount += bonusCredit;
                            }
                        }
                    );
                    //玩家账号, 开户时间，最近登录时间，最近充值时间，最近兑奖时间，充值总次数，兑奖总次数，总充值额，总兑奖额，充值次数（查询其间），兑奖次数，充值额，兑奖额
                    return {
                        playerName: playerObj.name,
                        registrationTime: playerObj.registrationTime,
                        lastAccessTime: playerObj.lastAccessTime,
                        lastTopUpTime: lastTopUpTime,
                        lastBonusTime: lastBonusTime,
                        totalTopUpTimes: playerObj.topUpTimes,
                        totalBonusTimes: totalBonusTimes,
                        totalTopUpAmount: playerObj.topUpSum,
                        totalConsumptionTimes: playerObj.consumptionTimes,
                        totalConsumptionAmount: playerObj.consumptionSum,
                        totalBonusAmount: totalBonusAmount,
                        topUpTimes: topUpTimes,
                        bonusTimes: bonusTimes,
                        topUpAmount: topUpAmount,
                        bonusAmount: bonusAmount,
                        totalValidConsumptionAmount: consumptionInfo[0] ? consumptionInfo[0].validAmount : 0,
                        totalBonusConsumptionAmount: consumptionInfo[0] ? consumptionInfo[0].bonusAmount : 0
                    };
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find player payment data"});
                }
            }
        );
    },

    createPartnerCommissionConfig: function (platform) {
        var obj = {platform: platform}
        var newRecord = new dbconfig.collection_partnerCommissionConfig(obj);
        return newRecord.save();
    },

    getPartnerCommissionConfig: function (query) {
        return dbconfig.collection_partnerCommissionConfig.findOne(query);
    },

    updatePartnerCommissionLevel: function (query, update) {
        return dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(query, update);
    },

    createUpdatePartnerCommissionRateConfig: function  (query, data) {
        return dbconfig.collection_partnerCommissionRateConfig.findOne({platform: query.platform}).lean().then(
            configData => {
                //check if config exist
                if (!configData) {
                    var newCommissionRateConfig = new dbconfig.collection_partnerCommissionRateConfig(data);
                    return newCommissionRateConfig.save();
                }
                else {
                    return dbconfig.collection_partnerCommissionRateConfig.findOneAndUpdate(query, data);
                }
            });
    },

    getPartnerCommissionRateConfig: function (query) {
        return dbconfig.collection_partnerCommissionRateConfig.find(query);
    },

    updateParentCommissionRateConfig: function  (query, data) {
        return dbconfig.collection_partnerCommissionRateConfig.find({platform: query.platform}).lean().then(
            configData => {
                //check if config exist
                if (configData && configData.length > 0) {
                    let arrProm = [];

                    for (let i in configData) {
                        if (configData[i] && configData[i]._id) {
                            let prom = dbconfig.collection_partnerCommissionRateConfig.findOneAndUpdate({_id: configData[i]._id, platform: query.platform}, data);
                            arrProm.push(prom);
                        }
                    }

                    return Promise.all(arrProm);
                } else {
                    let newCommissionRateConfig = new dbconfig.collection_partnerCommissionRateConfig(data);
                    return newCommissionRateConfig.save();
                }
            });

    },
    createUpdatePartnerCommissionConfig: function  (query, data, clearCustomize) {
        return dbconfig.collection_partnerCommissionConfig.findOne({platform: query.platform, _id: query._id}).lean().then(
            configData => {
                //check if config exist
                if (!configData) {
                     var newCommissionConfig = new dbconfig.collection_partnerCommissionConfig(data);
                     return newCommissionConfig.save();
                }
                else {
                    delete data._id;

                    if (clearCustomize) {
                        clearCustomizedPartnerCommissionConfig(configData.platform, configData.commissionType, configData.provider).catch(errorUtils.reportError);
                    }

                    return dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(query, data);
                }
            }
        );
    },

    getPartnerCommissionConfigWithGameProviderGroup: function (query) {
        return dbconfig.collection_partnerCommissionConfig.find(query);
    },

    createUpdatePartnerCommissionConfigWithGameProviderGroup: function  (query, data, clearCustomize) {
        return dbconfig.collection_partnerCommissionConfig.findOne({platform: query.platform, _id: query._id}).lean().then(
            configData => {
                //check if config exist
                if (!configData) {
                    return dbconfig.collection_partnerCommissionConfig(data).save();
                }
                else {
                    delete data._id;

                    if (clearCustomize) {
                        clearCustomizedPartnerCommissionConfig(configData.platform, configData.commissionType, configData.provider).then(output => console.log(output)).catch(errorUtils.reportError);
                    }

                    return dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(query, data);
                }
            }
        );
    },

    startPlatformPartnerCommissionSettlement: function (platformObjId, bUpdateSettlementTime, isToday) {
        return dbconfig.collection_partnerCommissionConfig.findOne({platform: platformObjId}).lean().then(
            configData => {
                // check if config exist
                if (!configData) {
                    console.warn("Cannot do partner commission settlement: There is no configData for this platform! platformObjId=%s", platformObjId);
                }

                if (configData) {
                    //check config data period
                    let settleTime = isToday ? dbUtil.getTodaySGTime() : dbUtil.getYesterdaySGTime();
                    let bMatchPeriod = true;

                    // set settle time
                    switch (configData.commissionPeriod) {
                        case constPartnerCommissionPeriod.WEEK:
                            if (dbUtil.isFirstDayOfWeekSG()) {
                                settleTime = isToday ? dbUtil.getCurrentWeekSGTime() : dbUtil.getLastWeekSGTime();
                            }
                            else {
                                if (isToday) {
                                    settleTime = dbUtil.getCurrentWeekSGTime();
                                }
                                else {
                                    bMatchPeriod = false;
                                }
                            }
                            break;
                        case constPartnerCommissionPeriod.HALF_MONTH:
                            if (dbUtil.isHalfMonthDaySG()) {
                                settleTime = isToday ? dbUtil.getCurrentHalfMonthPeriodSG() : dbUtil.getPastHalfMonthPeriodSG();
                            }
                            else {
                                if (isToday) {
                                    settleTime = dbUtil.getCurrentHalfMonthPeriodSG();
                                }
                                else {
                                    bMatchPeriod = false;
                                }
                            }
                            break;
                        case constPartnerCommissionPeriod.MONTH:
                            if (dbUtil.isFirstDayOfMonthSG()) {
                                settleTime = isToday ? dbUtil.getCurrentMonthSGTIme() : dbUtil.getLastMonthSGTime();
                            }
                            else {
                                if (isToday) {
                                    settleTime = dbUtil.getCurrentMonthSGTIme();
                                }
                                else {
                                    bMatchPeriod = false;
                                }
                            }
                            break;
                    }

                    //if period does not match, no need to settle
                    if (!bMatchPeriod) {
                        return; //Q.reject({name: "DataError", message: "It's not settlement day"});
                    }

                    //if there is commission config, start settlement
                    let stream = dbconfig.collection_partner.find(
                        {
                            platform: platformObjId,
                            totalReferrals: {$gt: 0},
                            $and: [
                                {$or: [{lastCommissionSettleTime: {$lt: settleTime.startTime}}, {lastCommissionSettleTime: {$exists: false}}]},
                                {
                                    $or: [
                                        {permission: {$exists: false}},
                                        {$and: [{permission: {$exists: true}}, {'permission.disableCommSettlement': false}]}
                                    ]
                                }
                            ]
                        }
                    ).cursor({batchSize: 100});

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(function () {
                        return Q(
                            balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: 10,
                                    makeRequest: function (partnerIdObjs, request) {
                                        request("player", "calculatePartnersCommission", {
                                            partnerObjIds: partnerIdObjs.map(partnerIdObj => partnerIdObj._id),
                                            configData: configData,
                                            platformObjId: platformObjId,
                                            startTime: settleTime.startTime,
                                            endTime: settleTime.endTime,
                                            settlementTimeToSave: bUpdateSettlementTime ? Number(settleTime.startTime) : null,
                                        });
                                    }
                                }
                            )
                        );
                    });
                }
            }
        );
    },

    calculatePartnersCommission: function (platformObjId, configData, partnerObjIds, startTime, endTime, settlementTimeToSave) {
        let proms = [];
        partnerObjIds.forEach(
            objId => {
                proms.push(dbPartner.calculatePartnerCommission(platformObjId, configData, objId, startTime, endTime, settlementTimeToSave));
            }
        );
        return Q.all(proms);
    },

    calculatePartnerCommission: function (platformObjId, configData, partnerObjId, startTime, endTime, settlementTimeToSave) {
        let totalRewardAmount = 0;
        let serviceFee = 0;
        let platformFee = 0;
        let profitAmount = 0;
        let commissionLevel = 0;
        let commissionRate = 0;
        let bonusCommissionRate = 0;
        let totalValidAmount = 0;
        let totalBonusAmount = 0;
        let maxCommissionLevel = 0;
        let totalTopUpAmount = 0;
        let operationAmount = 0;
        let totalPlayerBonusAmount = 0;

        //get all partner players consumption data
        return dbconfig.collection_players.find({platform: platformObjId, partner: partnerObjId}).lean().then(
            players => {
                if (players && players.length > 0) {
                    let playerObjIds = players.map(player => player._id);

                    // promise all referrals consumption
                    let consumptionProm = dbconfig.collection_providerPlayerDaySummary.aggregate(
                        {
                            $match: {
                                platformId: platformObjId,
                                playerId: {$in: playerObjIds},
                                date: {
                                    $gte: startTime,
                                    $lt: endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$playerId",
                                totalValidAmount: {$sum: "$validAmount"},
                                totalBonusAmount: {$sum: "$bonusAmount"}
                            }
                        }
                    );

                    // promise all referrals reward
                    let rewardProm = dbconfig.collection_rewardLog.aggregate(
                        {
                            $match: {
                                platform: platformObjId,
                                player: {$in: playerObjIds},
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$platform",
                                totalRewardAmount: {$sum: "$amount"}
                            }
                        }
                    );

                    // promise all referrals topup
                    let topUpProm = dbconfig.collection_playerTopUpRecord.aggregate(
                        {
                            $match: {
                                platformId: platformObjId,
                                playerId: {$in: playerObjIds},
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                }
                            }
                        },
                        {
                            $group: {
                                _id: "$platformId",
                                totalTopUpAmount: {$sum: "$amount"}
                            }
                        }
                    );

                    // promise all referrals bonus
                    let bonusProm = dbconfig.collection_proposalType.findOne({
                        platformId: platformObjId,
                        name: constProposalType.PLAYER_BONUS
                    }).then(
                        bonusType => {
                            if (bonusType) {
                                return dbconfig.collection_proposal.aggregate(
                                    {
                                        $match: {
                                            // platform: platformObjId,
                                            type: bonusType._id,
                                            "data.playerObjId": {$in: playerObjIds},
                                            createTime: {
                                                $gte: startTime,
                                                $lt: endTime
                                            },
                                            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED, constProposalStatus.PENDING]}
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: "$platform",
                                            totalBonusAmount: {$sum: "$data.amount"}
                                        }
                                    }
                                );
                            }
                        }
                    );

                    return Q.all([consumptionProm, rewardProm, topUpProm, bonusProm]);
                }
            }
        ).then(
            data => {
                if (data) {
                    // calculate profit amount
                    let consumptionInfo = data[0];
                    let rewardInfo = data[1];
                    let topUpInfo = data[2];
                    let bonusInfo = data[3];
                    // var operationAmount = 0;
                    let platformFeeAmount = 0;
                    totalTopUpAmount = topUpInfo && topUpInfo[0] ? topUpInfo[0].totalTopUpAmount : 0;
                    totalPlayerBonusAmount = bonusInfo && bonusInfo[0] ? bonusInfo[0].totalBonusAmount : 0;

                    if (consumptionInfo && consumptionInfo.length > 0) {
                        consumptionInfo.forEach(
                            conInfo => {
                                totalValidAmount += conInfo.totalValidAmount;
                                totalBonusAmount += conInfo.totalBonusAmount;
                                platformFeeAmount += Math.abs(conInfo.totalBonusAmount);
                            }
                        );

                        if (configData && configData.platformFeeRate > 0) {
                            platformFee = Math.max(0, platformFeeAmount * configData.platformFeeRate);
                        }
                    }

                    if (configData && configData.serviceFeeRate > 0) {
                        serviceFee = (totalTopUpAmount + totalPlayerBonusAmount) * configData.serviceFeeRate;
                    }

                    if (rewardInfo && rewardInfo[0] && configData && configData.rewardRate) {
                        totalRewardAmount = rewardInfo[0].totalRewardAmount * configData.rewardRate;
                    }

                    switch (configData.settlementMode) {
                        case 'TB':
                            operationAmount = totalTopUpAmount - totalPlayerBonusAmount;
                            break;
                        case 'OPSR':
                        default:
                            operationAmount = -totalBonusAmount;//consumptionInfo[0].totalValidAmount + consumptionInfo[0].totalBonusAmount;

                            break;
                    }

                    profitAmount = operationAmount - platformFee - serviceFee - totalRewardAmount;

                    //get partner active player number
                    return dbPartner.getPartnerActiveValidPlayers(platformObjId, partnerObjId, true, {
                        startTime: startTime,
                        endTime: endTime
                    });
                }
            }
        ).then(
            validPlayers => {
                let validPlayerCount = validPlayers ? validPlayers.length : 0;
                //check partner commission level
                if (configData && configData.commissionLevelConfig && configData.commissionLevelConfig.length > 0) {
                    configData.commissionLevelConfig.forEach(
                        level => {
                            if (level.value >= maxCommissionLevel) {
                                maxCommissionLevel = level.value;
                            }
                            if (level.minProfitAmount <= profitAmount && profitAmount <= level.maxProfitAmount && validPlayerCount >= level.minActivePlayer) {
                                if (level.value >= commissionLevel) {
                                    commissionLevel = level.value;
                                    commissionRate = level.commissionRate;
                                }
                            }
                        }
                    );
                }
                //check partner bonus amount based on past commission history
                return dbconfig.collection_partner.findOne({_id: partnerObjId, platform: platformObjId});
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    partnerData.commissionHistory.push(commissionLevel);
                    //check past commission history
                    if (configData && configData.bonusCommissionHistoryTimes && configData.bonusCommissionHistoryTimes > 0
                        && configData.bonusRate && configData.bonusRate > 0 && commissionLevel == maxCommissionLevel) {
                        let bValid = true;
                        let times = Math.max(0, (partnerData.commissionHistory.length - configData.bonusCommissionHistoryTimes));
                        for (let i = partnerData.commissionHistory.length - 1; i >= times; i--) {
                            if (partnerData.commissionHistory[i] != maxCommissionLevel) {
                                bValid = false;
                            }
                        }
                        if (bValid) {
                            bonusCommissionRate = configData.bonusRate;
                        }
                    }
                    let negativeProfitAmount = partnerData.negativeProfitAmount;
                    profitAmount += partnerData.negativeProfitAmount;
                    let commissionAmount = profitAmount * (commissionRate + bonusCommissionRate);
                    let partnerProm = partnerData;
                    if (settlementTimeToSave) {
                        if (partnerData.negativeProfitAmount >= 0 && profitAmount < 0) {
                            partnerData.negativeProfitStartTime = endTime;
                        }
                        if (profitAmount >= 0) {
                            partnerData.negativeProfitStartTime = null;
                        }
                        if (commissionAmount > configData.minCommissionAmount) {
                            negativeProfitAmount = 0;
                        }
                        else {
                            negativeProfitAmount = profitAmount;
                        }

                        //partnerData.lastCommissionSettleTime = settlementTimeToSave;
                        //partnerData.credits += commissionAmount;
                        //create proposal for partner commission
                        if (commissionAmount < configData.minCommissionAmount) {
                            commissionAmount = 0;
                        }
                        if (commissionAmount != 0 || negativeProfitAmount != 0) {
                            var proposalData = {
                                entryType: constProposalEntryType.SYSTEM,
                                userType: constProposalUserType.PARTNERS,
                                data: {
                                    partnerObjId: partnerData._id,
                                    platformObjId: partnerData.platform,
                                    partnerName: partnerData.partnerName,
                                    lastCommissionSettleTime: settlementTimeToSave,
                                    commissionAmount: commissionAmount,
                                    negativeProfitAmount: negativeProfitAmount,
                                    commissionLevel: commissionLevel,
                                    negativeProfitStartTime: partnerData.negativeProfitStartTime,
                                    preNegativeProfitAmount: partnerData.negativeProfitAmount,
                                    commissionAmountFromChildren: 0
                                }
                            };
                            partnerProm = dbProposal.createProposalWithTypeName(partnerData.platform, constProposalType.PARTNER_COMMISSION, proposalData);
                        }
                    }
                    if (commissionAmount < configData.minCommissionAmount) {
                        commissionAmount = 0;
                    }
                    //log this commission record
                    let recordProm = dbUtil.upsertForShard(
                        dbconfig.collection_partnerCommissionRecord,
                        {
                            partner: partnerObjId,
                            platform: platformObjId,
                            settleTime: startTime
                        },
                        {
                            totalRewardAmount: totalRewardAmount,
                            serviceFee: serviceFee,
                            platformFee: platformFee,
                            profitAmount: profitAmount,
                            commissionLevel: commissionLevel,
                            commissionRate: commissionRate,
                            bonusCommissionRate: bonusCommissionRate,
                            negativeProfitAmount: negativeProfitAmount,
                            totalValidAmount: totalValidAmount,
                            totalBonusAmount: totalBonusAmount,
                            totalPlayerBonusAmount: totalPlayerBonusAmount,
                            totalTopUpAmount: totalTopUpAmount,
                            commissionAmount: commissionAmount,
                            lastCommissionSettleTime: startTime
                        },
                        constShardKeys.collection_partnerCommissionRecord
                    );

                    return Q.all([partnerProm, recordProm]);
                }
            }
        );
    },

    startPlatformPartnerChildrenCommissionSettlement: function (platformObjId, bUpdateSettlementTime, isToday) {
        return dbconfig.collection_partnerCommissionConfig.findOne({platform: platformObjId}).lean().then(
            configData => {
                if (configData && configData.childrenCommissionRate && configData.childrenCommissionRate.length > 0) {
                    //check children commision rate
                    let childrenCommissionRate = 0;
                    configData.childrenCommissionRate.forEach(
                        rateInfo => {
                            if (rateInfo.level == 1) {
                                childrenCommissionRate = rateInfo.rate;
                            }
                        }
                    );
                    if (childrenCommissionRate <= 0) {
                        return;
                    }
                    //check config data period
                    let settleTime = isToday ? dbUtil.getTodaySGTime() : dbUtil.getYesterdaySGTime();
                    let bMatchPeriod = true;

                    switch (configData.commissionPeriod) {
                        case constPartnerCommissionPeriod.WEEK:
                            if (dbUtil.isFirstDayOfWeekSG()) {
                                settleTime = isToday ? dbUtil.getCurrentWeekSGTime() : dbUtil.getLastWeekSGTime();
                            }
                            else {
                                if (isToday) {
                                    settleTime = dbUtil.getCurrentWeekSGTime();
                                }
                                else {
                                    bMatchPeriod = false;
                                }
                            }
                            break;
                        case constPartnerCommissionPeriod.HALF_MONTH:
                            if (dbUtil.isHalfMonthDaySG()) {
                                settleTime = isToday ? dbUtil.getCurrentHalfMonthPeriodSG() : dbUtil.getPastHalfMonthPeriodSG();
                            }
                            else {
                                if (isToday) {
                                    settleTime = dbUtil.getCurrentHalfMonthPeriodSG();
                                }
                                else {
                                    bMatchPeriod = false;
                                }
                            }
                            break;
                        case constPartnerCommissionPeriod.MONTH:
                            if (dbUtil.isFirstDayOfMonthSG()) {
                                settleTime = isToday ? dbUtil.getCurrentMonthSGTIme() : dbUtil.getLastMonthSGTime();
                            }
                            else {
                                if (isToday) {
                                    settleTime = dbUtil.getCurrentMonthSGTIme();
                                }
                                else {
                                    bMatchPeriod = false;
                                }
                            }
                            break;
                    }

                    //if period does not match, no need to settle
                    if (!bMatchPeriod) {
                        return;
                    }

                    //if there is commission config, start settlement
                    let stream = dbconfig.collection_partner.find(
                        {
                            platform: platformObjId,
                            lastChildrenCommissionSettleTime: {$lt: settleTime.startTime},
                            $or: [
                                {permission: {$exists: false}},
                                {$and: [{permission: {$exists: true}}, {'permission.disableCommSettlement': false}]}
                            ]
                        }
                    ).cursor({batchSize: 10});

                    let balancer = new SettlementBalancer();
                    return balancer.initConns().then(function () {
                        return Q(
                            balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: constSystemParam.BATCH_SIZE,
                                    makeRequest: function (partnerIdObjs, request) {
                                        request("player", "calculatePartnersChildrenCommission", {
                                            partnerObjIds: partnerIdObjs.map(partnerIdObj => partnerIdObj._id),
                                            childrenCommissionRate: childrenCommissionRate,
                                            platformObjId: platformObjId,
                                            startTime: settleTime.startTime,
                                            endTime: settleTime.endTime,
                                            settlementTimeToSave: bUpdateSettlementTime ? Number(settleTime.startTime) : null,
                                        });
                                    }
                                }
                            )
                        );
                    });
                }
            }
        );
    },

    calculatePartnersChildrenCommission: function (platformObjId, childrenCommissionRate, partnerObjIds, startTime, endTime, settlementTimeToSave) {
        let proms = [];
        partnerObjIds.forEach(
            objId => {
                proms.push(dbPartner.calculatePartnerChildrenCommission(platformObjId, childrenCommissionRate, objId, startTime, endTime, settlementTimeToSave));
            }
        );
        return Q.all(proms);
    },

    calculatePartnerChildrenCommission: function (platformObjId, childrenCommissionRate, partnerObjId, startTime, endTime, settlementTimeToSave) {
        //find all children
        let commissionAmountFromChildren = 0;
        let updatedCommissionRecordToReturn = null;
        let _partnerData = null;

        return dbconfig.collection_partner.find({parent: partnerObjId, platform: platformObjId}).lean().then(
            childrenPartners => {
                if (childrenPartners && childrenPartners.length > 0) {
                    //find all children partner commission report
                    let partnerObjIds = childrenPartners.map(child => child._id);
                    return dbconfig.collection_partnerCommissionRecord.aggregate(
                        {
                            $match: {
                                platform: platformObjId,
                                partner: {$in: partnerObjIds},
                                settleTime: {$gte: startTime, $lt: endTime}
                            }
                        },
                        {
                            $group: {
                                _id: "$platform",
                                totalCommissionAmount: {$sum: "$commissionAmount"}
                            }
                        }
                    ).then(
                        childrenCommissions => {
                            if (childrenCommissions && childrenCommissions[0] && childrenCommissions[0].totalCommissionAmount > 0) {
                                commissionAmountFromChildren = childrenCommissions[0].totalCommissionAmount * childrenCommissionRate;
                                //update partner commission report to add children commission amount
                                return dbUtil.upsertForShard(
                                    dbconfig.collection_partnerCommissionRecord,
                                    {
                                        partner: partnerObjId,
                                        platform: platformObjId,
                                        settleTime: startTime
                                    },
                                    {
                                        totalCommissionOfChildren: childrenCommissions[0].totalCommissionAmount,
                                        commissionAmountFromChildren: commissionAmountFromChildren
                                    },
                                    constShardKeys.collection_partnerCommissionRecord
                                );
                            }
                        }
                    ).then(
                        updatedCommissionRecord => {
                            updatedCommissionRecordToReturn = updatedCommissionRecord;

                            return Q.resolve().then(
                                () => {
                                    // Check if data update is required
                                    if (settlementTimeToSave) {
                                        // find the data for parent partner
                                        return dbconfig.collection_partner.findOne({
                                            _id: partnerObjId
                                        });
                                    } else {
                                        return updatedCommissionRecord;
                                    }
                                }
                            )
                        }
                    ).then(
                        partnerData => {
                            if (partnerData) {
                                _partnerData = partnerData;

                                // find any previous created proposal for this partner
                                return dbconfig.collection_proposal.findOne({
                                    "data.platformObjId": platformObjId,
                                    "data.partnerName": partnerData.partnerName,
                                    "data.lastCommissionSettleTime": settlementTimeToSave
                                });
                            }
                        }
                    ).then(
                        proposalData => {
                            if (proposalData) {
                                // Update parent commission to include children commission
                                return dbconfig.collection_proposal.findOneAndUpdate({
                                    _id: proposalData._id
                                }, {
                                    "data.commissionAmountFromChildren": commissionAmountFromChildren
                                });
                            } else if (!proposalData && settlementTimeToSave && commissionAmountFromChildren > 0) {
                                // Create a new proposal for child commission if parent commission not found
                                let proposalData = {
                                    entryType: constProposalEntryType.SYSTEM,
                                    userType: constProposalUserType.PARTNERS,
                                    data: {
                                        partnerObjId: partnerObjId,
                                        platformObjId: platformObjId,
                                        partnerName: _partnerData.partnerName,
                                        lastCommissionSettleTime: settlementTimeToSave,
                                        commissionAmountFromChildren: commissionAmountFromChildren,
                                        commissionAmount: 0,
                                        negativeProfitAmount: 0,
                                        preNegativeProfitAmount: _partnerData.negativeProfitAmount,
                                        commissionLevel: []
                                    }
                                };

                                if (_partnerData.negativeProfitStartTime) {
                                    proposalData.data.negativeProfitStartTime = _partnerData.negativeProfitStartTime;
                                }

                                return dbProposal.createProposalWithTypeName(platformObjId, constProposalType.PARTNER_COMMISSION, proposalData);
                            }
                        }
                    ).then(
                        () => updatedCommissionRecordToReturn
                    );
                }
            }
        );
    },

    getPartnerCommissionReport: function (platform, partnerName, startTime, endTime, index, limit, sortCol) {
        var sortKey = Object.keys(sortCol) ? Object.keys(sortCol)[0] : null;
        var sortVal = sortKey ? parseInt(sortCol[sortKey]) : null;
        var matchObj = {
            platform: platform,
            settleTime: {
                $gte: startTime,
                $lt: endTime
            }
        };
        let partId = matchObj;
        if (partnerName) {
            partId = dbconfig.collection_partner.findOne({partnerName: partnerName}).then(
                partner => {
                    if (partner && partner._id) {
                        matchObj.partner = partner._id;
                    } else {
                        matchObj = "noPartner";
                    }
                    return matchObj;
                })
        } else {
            // Instead of searching all partners, look for only partners with permission on
            partId = dbconfig.collection_partner.find({
                platform: platform,
                $or: [
                    {permission: {$exists: false}},
                    {$and: [{permission: {$exists: true}}, {'permission.disableCommSettlement': false}]}
                ]
            }).then(
                partners => {
                    if (partners && partners.length > 0) {
                        let partnerIds = partners.map(partner => partner._id);
                        matchObj.partner = {$in: partnerIds};
                    } else {
                        matchObj = "noPartner";
                    }
                    return matchObj;
                }
            )
        }

        return Q.resolve(partId).then(
            matchObj => {
                if (matchObj == "noPartner") {
                    return {data: [], size: 0, summary: {}, message: "Cannot find partner"}
                }
                return dbconfig.collection_partnerCommissionRecord.aggregate(
                    [
                        {
                            $match: matchObj
                        },
                        {
                            $group: {
                                _id: {
                                    partner: "$partner"
                                },
                                serviceFee: {$sum: "$serviceFee"},
                                platformFee: {$sum: "$platformFee"},
                                profitAmount: {$sum: "$profitAmount"},
                                totalRewardAmount: {$sum: "$totalRewardAmount"},
                                totalValidAmount: {$sum: "$totalValidAmount"},
                                totalBonusAmount: {$sum: "$totalBonusAmount"},
                                totalTopUpAmount: {$sum: "$totalTopUpAmount"},
                                totalPlayerBonusAmount: {$sum: "$totalPlayerBonusAmount"},
                                totalCommissionAmount: {$sum: "$commissionAmount"},
                                totalCommissionOfChildren: {$sum: "$totalCommissionOfChildren"}
                            }
                        }
                    ]
                ).then(
                    data => {
                        var result = [];
                        data.forEach(
                            eachRecord => {
                                if (eachRecord) {
                                    eachRecord.operationFee = eachRecord.totalTopUpAmount - eachRecord.totalPlayerBonusAmount;
                                    eachRecord.marketCost = eachRecord.totalRewardAmount + eachRecord.platformFee + eachRecord.serviceFee;
                                    // eachRecord.totalTopUpAmount = 0;
                                    // eachRecord.totalBonusAmount = 0;
                                    var a = dbconfig.collection_partner.findOne({_id: eachRecord._id.partner}).then(
                                        partner => {
                                            eachRecord._id.partnerName = partner.partnerName;
                                            //todo::refactor the code here for partner player payment summary
                                            // return dbPartner.getPartnerPlayerPaymentReport(partner.partnerId, startTime, endTime, 0, 0, {}).then(
                                            //     reportData => {
                                            //         if(reportData){
                                            //             eachRecord.totalTopUpAmount = reportData.summary.totalTopUpAmount;
                                            //             eachRecord.totalBonusAmount = reportData.summary.totalBonusAmount;
                                            //         }
                                            //         return eachRecord;
                                            //     },
                                            //     err => {
                                            //         console.log(err);
                                            //     }
                                            // );
                                            // eachRecord.totalTopUpAmount = 0;
                                            // eachRecord.totalBonusAmount = 0;
                                            return eachRecord;
                                        });
                                    result.push(a);
                                }
                            });
                        return Q.all(result).then(
                            result => {
                                if (sortKey) {
                                    result = result.sort((a, b) => {
                                        return (a[sortKey] - b[sortKey]) * sortVal;
                                    })
                                }
                                var summary = {
                                    marketCost: 0,
                                    operationFee: 0,
                                    platformFee: 0,
                                    totalRewardAmount: 0,
                                    profitAmount: 0,
                                    serviceFee: 0,
                                    totalBonusAmount: 0,
                                    totalTopUpAmount: 0,
                                    totalCommissionAmount: 0,
                                    totalCommissionOfChildren: 0
                                }
                                result.forEach(item => {
                                    if (item) {
                                        summary.marketCost += item.marketCost;
                                        summary.operationFee += item.operationFee;
                                        summary.platformFee += item.platformFee;
                                        summary.totalRewardAmount += item.totalRewardAmount;
                                        summary.profitAmount += item.profitAmount;
                                        summary.serviceFee += item.serviceFee;
                                        summary.totalBonusAmount += item.totalBonusAmount;
                                        summary.totalPlayerBonusAmount += item.totalPlayerBonusAmount;
                                        summary.totalTopUpAmount += item.totalTopUpAmount;
                                        summary.totalCommissionAmount += item.totalCommissionAmount;
                                        summary.totalCommissionOfChildren += item.totalCommissionOfChildren;
                                    }
                                });
                                return {
                                    data: result.slice(index, index + limit),
                                    size: result.length,
                                    summary: summary
                                };
                            }
                        )
                    })
            });
    },

    // getPartnerCommissionReport: function (platform, partnerName, startTime, endTime, index, limit, sortCol) {
    //     let stream;
    //     let sortKey = Object.keys(sortCol) ? Object.keys(sortCol)[0] : null;
    //     let sortVal = sortKey ? parseInt(sortCol[sortKey]) : null;
    //
    //     if (partnerName) {
    //         stream = dbconfig.collection_partner.find({partnerName: partnerName}, {_id: 1}).cursor({batchSize: 100})
    //     } else {
    //         // Instead of searching all partners, look for only partners with permission on
    //         stream = dbconfig.collection_partner.find({
    //             platform: platform,
    //             $or: [
    //                 {permission: {$exists: false}},
    //                 {$and: [{permission: {$exists: true}}, {'permission.disableCommSettlement': false}]}
    //             ]
    //         }, {_id: 1}).cursor({batchSize: 100})
    //     }
    //
    //     let balancer = new SettlementBalancer();
    //     let result = [];
    //     return balancer.initConns().then(function () {
    //         return Q(
    //             balancer.processStream(
    //                 {
    //                     stream: stream,
    //                     batchSize: 10,
    //                     makeRequest: function (partners, request) {
    //                         request("player", "findPartnersForCommissionReport", {
    //                             platform: platform,
    //                             partners: partners.map(partnerIdObj => ObjectId(partnerIdObj._id)),
    //                             startTime: startTime,
    //                             endTime: endTime
    //                         });
    //                     },
    //                     processResponse: function (record) {
    //                         result = result.concat(record.data);
    //                     }
    //                 }
    //             )
    //         )
    //     }).then(
    //         () => {
    //             if (sortKey) {
    //                 result = result.sort((a, b) => {
    //                     return (a[sortKey] - b[sortKey]) * sortVal;
    //                 })
    //             }
    //             let summary = {
    //                 marketCost: 0,
    //                 operationFee: 0,
    //                 platformFee: 0,
    //                 totalRewardAmount: 0,
    //                 profitAmount: 0,
    //                 serviceFee: 0,
    //                 totalBonusAmount: 0,
    //                 totalTopUpAmount: 0,
    //                 totalCommissionAmount: 0,
    //                 totalCommissionOfChildren: 0
    //             };
    //             result.forEach(item => {
    //                 if (item) {
    //                     summary.marketCost += item.marketCost;
    //                     summary.operationFee += item.operationFee;
    //                     summary.platformFee += item.platformFee;
    //                     summary.totalRewardAmount += item.totalRewardAmount;
    //                     summary.profitAmount += item.profitAmount;
    //                     summary.serviceFee += item.serviceFee;
    //                     summary.totalBonusAmount += item.totalBonusAmount;
    //                     summary.totalPlayerBonusAmount += item.totalPlayerBonusAmount;
    //                     summary.totalTopUpAmount += item.totalTopUpAmount;
    //                     summary.totalCommissionAmount += item.totalCommissionAmount;
    //                     summary.totalCommissionOfChildren += item.totalCommissionOfChildren;
    //                 }
    //             });
    //             return {
    //                 data: result.slice(index, index + limit),
    //                 size: result.length,
    //                 summary: summary
    //             };
    //         }
    //     )
    // },

    findPartnersForCommissionReport: (platform, partners, startTime, endTime) => {
        let matchObj = {
            platform: platform,
            settleTime: {
                $gte: startTime,
                $lt: endTime
            }
        };

        if (partners && partners.length > 0) {
            let partnerIds = partners.map(partner => partner._id);
            matchObj.partner = {$in: partnerIds};
        } else {
            matchObj = "noPartner";
        }

        return dbconfig.collection_partnerCommissionRecord.aggregate(
            [
                {
                    $match: matchObj
                },
                {
                    $group: {
                        _id: {
                            partner: "$partner"
                        },
                        serviceFee: {$sum: "$serviceFee"},
                        platformFee: {$sum: "$platformFee"},
                        profitAmount: {$sum: "$profitAmount"},
                        totalRewardAmount: {$sum: "$totalRewardAmount"},
                        totalValidAmount: {$sum: "$totalValidAmount"},
                        totalBonusAmount: {$sum: "$totalBonusAmount"},
                        totalTopUpAmount: {$sum: "$totalTopUpAmount"},
                        totalPlayerBonusAmount: {$sum: "$totalPlayerBonusAmount"},
                        totalCommissionAmount: {$sum: "$commissionAmount"},
                        totalCommissionOfChildren: {$sum: "$totalCommissionOfChildren"}
                    }
                }
            ]
        ).then(
            data => {
                let result = [];
                data.forEach(
                    eachRecord => {
                        if (eachRecord) {
                            eachRecord.operationFee = eachRecord.totalTopUpAmount - eachRecord.totalPlayerBonusAmount;
                            eachRecord.marketCost = eachRecord.totalRewardAmount + eachRecord.platformFee + eachRecord.serviceFee;

                            let a = dbconfig.collection_partner.findOne({_id: eachRecord._id.partner}).then(
                                partner => {
                                    eachRecord._id.partnerName = partner.partnerName;
                                    //todo::refactor the code here for partner player payment summary
                                    // return dbPartner.getPartnerPlayerPaymentReport(partner.partnerId, startTime, endTime, 0, 0, {}).then(
                                    //     reportData => {
                                    //         if(reportData){
                                    //             eachRecord.totalTopUpAmount = reportData.summary.totalTopUpAmount;
                                    //             eachRecord.totalBonusAmount = reportData.summary.totalBonusAmount;
                                    //         }
                                    //         return eachRecord;
                                    //     },
                                    //     err => {
                                    //         console.log(err);
                                    //     }
                                    // );
                                    // eachRecord.totalTopUpAmount = 0;
                                    // eachRecord.totalBonusAmount = 0;
                                    return eachRecord;
                                });
                            result.push(a);
                        }
                    });

                return Promise.all(result)
            }
        )
    },

    getPartnerCommission: function (partnerId, startTime, endTime, startIndex, requestCount) {
        var partnerObj = null;
        var configObj = null;
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;
                    //find partner platform commission config
                    return dbconfig.collection_partnerCommissionConfig.findOne({platform: partnerData.platform}).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner data"});
                }
            }
            // ).then(
            //     configData => {
            //         if (configData) {
            //             configObj = configData;
            //             return dbconfig.collection_players.find({partner: partnerObj._id}).lean();
            //         }
            //         else {
            //             return Q.reject({name: "DataError", message: "Cannot find partner commission config data"});
            //         }
            //     }
            // ).then(
            //     players => {
            //         if (players && players.length > 0) {
            //             var proms = players.map(player => dbPartner.getPartnerPlayerCommissionInfo(player.platform, player._id, player.name, configObj, startTime, endTime));
            //             return Q.all(proms);
            //         }
            //         else {
            //             return [];
            //         }
            //     }
        ).then(
            configData => {
                if (configData) {
                    configObj = configData;
                    // return dbconfig.collection_players.find({partner: partnerObj._id}).lean();
                    var query = dbconfig.collection_players.aggregate(
                        [
                            {
                                $match: {
                                    partner: partnerObj._id,
                                    platform: partnerObj.platform
                                }
                            },
                            {
                                $group: {_id: '$_id'}
                            }
                        ]
                    );

                    var stream = query.cursor({batchSize: 100}).allowDiskUse(true).exec();
                    var balancer = new SettlementBalancer();
                    var res = [];
                    return balancer.initConns().then(function () {
                        return Q(
                            balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: 1000,
                                    makeRequest: function (playerIdObjs, request) {
                                        request("player", "getPartnerPlayersCommissionInfo", {
                                            platformObjId: partnerObj.platform,
                                            configData: configObj,
                                            startTime: startTime,
                                            endTime: endTime,
                                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                                return playerIdObj._id;
                                            })
                                        });
                                    },
                                    processResponse: function (record) {
                                        res = res.concat(record.data);
                                    }
                                }
                            )
                        );
                    }).then(
                        data => {
                            return res;
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner commission config data"});
                }
            }
        ).then(
            playerCommissions => {
                playerCommissions = playerCommissions.filter(commission => commission);
                var total = {
                    totalValidAmount: 0,
                    totalBonusAmount: 0,
                    operationAmount: 0,
                    totalRewardAmount: 0,
                    serviceFee: 0,
                    platformFee: 0,
                    profitAmount: 0,
                    totalTopUpAmount: 0,
                    totalPlayerBonusAmount: 0,
                    operationCost: 0
                };
                playerCommissions.forEach(
                    commission => {
                        if (commission) {
                            total.totalValidAmount += commission.totalValidAmount;
                            total.totalBonusAmount += commission.totalBonusAmount;
                            total.operationAmount += commission.operationAmount;
                            total.totalRewardAmount += commission.totalRewardAmount;
                            total.serviceFee += commission.serviceFee;
                            total.platformFee += commission.platformFee;
                            total.profitAmount += commission.profitAmount;
                            total.totalTopUpAmount += commission.totalTopUpAmount;
                            total.totalPlayerBonusAmount += commission.totalPlayerBonusAmount;
                            total.operationCost += commission.operationCost;
                        }
                    }
                );
                let profitAmount = total.profitAmount;
                let maxCommissionLevel = 0;
                let commissionLevel = 0;
                let commissionRate = 0;
                if (configObj && configObj.commissionLevelConfig && configObj.commissionLevelConfig.length > 0) {
                    configObj.commissionLevelConfig.forEach(
                        level => {
                            if (level.value >= maxCommissionLevel) {
                                maxCommissionLevel = level.value;
                            }
                            //todo:: add valid player count here
                            if (level.minProfitAmount <= profitAmount && profitAmount <= level.maxProfitAmount /*&& validPlayerCount >= level.minActivePlayer*/) {
                                if (level.value >= commissionLevel) {
                                    commissionLevel = level.value;
                                    commissionRate = level.commissionRate;
                                }
                            }
                        }
                    );
                }
                total.commissionAmount = profitAmount * commissionRate;
                total.preNegativeProfitAmount = partnerObj.negativeProfitAmount;
                return dbconfig.collection_proposalType.findOne({
                    platform: partnerObj.platform,
                    name: constProposalType.PARTNER_COMMISSION
                }).then(
                    typeData => {
                        if (typeData) {
                            return dbconfig.collection_proposal.aggregate(
                                {
                                    $match: {
                                        type: typeData._id,
                                        createTime: {
                                            $gte: startTime,
                                            $lt: endTime
                                        },
                                        "data.partnerName": partner.partnerName
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$type",
                                        totalNegative: {$sum: "$preNegativeProfitAmount"}
                                    }
                                }
                            );
                        }
                    }
                ).then(
                    proposal => {
                        if (proposal && proposal[0] && proposal[0].totalNegative) {
                            total.preNegativeProfitAmount = proposal[0].totalNegative;
                        }
                        return {
                            stats: {
                                startIndex: startIndex,
                                totalCount: playerCommissions.length,
                                requestCount: requestCount
                            },
                            total: total,
                            playerCommissions: playerCommissions.slice(startIndex, startIndex + requestCount)
                        };
                    }
                );

            }
        );
    },

    getPartnerPlayersCommissionInfo: function (platformObjId, configData, playerObjIds, startTime, endTime) {
        var proms = playerObjIds.map(
            playerObjId => {
                return dbconfig.collection_players.findOne({_id: playerObjId}).then(
                    playerData => {
                        if (playerData) {
                            return dbPartner.getPartnerPlayerCommissionInfo(platformObjId, playerObjId, playerData.name, configData, startTime, endTime);
                        }
                    }
                );
            }
        );
        return Q.all(proms);
    },

    getPartnerPlayerCommissionInfo: function (platformObjId, playerObjId, playerName, configData, startTime, endTime) {
        var consumptionProm = dbconfig.collection_providerPlayerDaySummary.aggregate(
            {
                $match: {
                    platformId: platformObjId,
                    playerId: playerObjId,
                    date: {
                        $gte: startTime,
                        $lt: endTime
                    }
                }
            },
            {
                $group: {
                    _id: "$platformId",
                    totalValidAmount: {$sum: "$validAmount"},
                    totalBonusAmount: {$sum: "$bonusAmount"}
                }
            }
        );

        var rewardProm = dbconfig.collection_rewardLog.aggregate(
            {
                $match: {
                    platform: platformObjId,
                    player: playerObjId,
                    createTime: {
                        $gte: startTime,
                        $lt: endTime
                    }
                }
            },
            {
                $group: {
                    _id: "$platform",
                    totalRewardAmount: {$sum: "$amount"}
                }
            }
        );

        var topUpProm = dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    platformId: platformObjId,
                    playerId: playerObjId,
                    createTime: {
                        $gte: startTime,
                        $lt: endTime
                    }
                }
            },
            {
                $group: {
                    _id: "$platformId",
                    totalTopUpAmount: {$sum: "$amount"}
                }
            }
        );

        var bonusProm = dbconfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: constProposalType.PLAYER_BONUS
        }).then(
            bonusType => {
                if (bonusType) {
                    return dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                // platform: platformObjId,
                                type: bonusType._id,
                                "data.playerObjId": playerObjId,
                                createTime: {
                                    $gte: startTime,
                                    $lt: endTime
                                },
                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED, constProposalStatus.PENDING]}
                            }
                        },
                        {
                            $group: {
                                _id: "$platform",
                                totalBonusAmount: {$sum: "$data.amount"}
                            }
                        }
                    );
                }
            }
        );

        return Q.all([consumptionProm, rewardProm, topUpProm, bonusProm]).then(
            data => {
                //calculate profit amount
                var totalValidAmount = 0;
                var totalBonusAmount = 0;
                var totalRewardAmount = 0;
                var serviceFee = 0;
                var platformFee = 0;
                var profitAmount = 0;
                var commissionAmount = 0;

                var consumptionInfo = data[0];
                var rewardInfo = data[1];
                var topUpInfo = data[2];
                var bonusInfo = data[3];
                var totalTopUpAmount = topUpInfo && topUpInfo[0] ? topUpInfo[0].totalTopUpAmount : 0;
                var totalPlayerBonusAmount = bonusInfo && bonusInfo[0] ? bonusInfo[0].totalBonusAmount : 0;
                var operationAmount = totalTopUpAmount - totalPlayerBonusAmount;
                var platformFeeAmount = 0;
                if (consumptionInfo && consumptionInfo[0]) {
                    totalValidAmount = consumptionInfo[0].totalValidAmount;
                    totalBonusAmount = -consumptionInfo[0].totalBonusAmount;
                    // operationAmount = totalBonusAmount;
                    platformFeeAmount = Math.abs(totalBonusAmount);
                }
                if (rewardInfo && rewardInfo[0] && configData && configData.rewardRate) {
                    totalRewardAmount = rewardInfo[0].totalRewardAmount * configData.rewardRate;
                }
                if (configData && configData.serviceFeeRate > 0) {
                    serviceFee = (totalTopUpAmount + totalPlayerBonusAmount) * configData.serviceFeeRate;
                }
                if (configData && configData.platformFeeRate > 0) {
                    platformFee = platformFeeAmount * configData.platformFeeRate;
                }
                profitAmount = operationAmount - platformFee - serviceFee - totalRewardAmount;
                var operationCost = platformFee + serviceFee + totalRewardAmount;

                if (profitAmount) {
                    return {
                        playerName: playerName,
                        totalValidAmount: totalValidAmount,
                        totalBonusAmount: totalBonusAmount,
                        operationAmount: operationAmount,
                        totalRewardAmount: totalRewardAmount,
                        totalTopUpAmount: totalTopUpAmount,
                        serviceFee: serviceFee,
                        platformFee: platformFee,
                        profitAmount: profitAmount,
                        totalPlayerBonusAmount: totalPlayerBonusAmount,
                        operationCost: operationCost
                    };
                }
            }
        );
    },

    getPartnerCommissionValue: function (partnerId) {
        var partnerObj = null;
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;
                    //get partner bonus amount
                    return dbconfig.collection_proposalType.findOne({
                        platformId: partnerObj.platform,
                        name: constProposalType.PARTNER_BONUS
                    }).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner data"});
                }
            }
        ).then(
            typeData => {
                if (typeData) {
                    return dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: typeData._id,
                                "data.partnerObjId": partnerObj._id,
                                status: constProposalStatus.SUCCESS
                            }
                        },
                        {
                            $group: {
                                _id: "$type",
                                totalAmount: {$sum: "$data.amount"},
                            }
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner bonus proposal type"});
                }
            }
        ).then(
            bonusData => {
                var res = {
                    amount: partnerObj.credits,
                    validAmount: partnerObj.credits,
                    bonusAmount: 0
                };
                if (bonusData && bonusData[0]) {
                    res.bonusAmount = bonusData[0].totalAmount;
                }
                return res;
            }
        );
    },

    getPartnerPlayerRegistrationStats: function (partnerId, startTime, endTime) {
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).lean().then(
            partnerData => {
                if (partnerData) {
                    //总开户人数,在线开户数,手工开户数,存款人数,有效开户数,代理下级开户数
                    var totalProm = dbconfig.collection_players.find({
                        partner: partnerData._id,
                        platform: partnerData.platform,
                        registrationTime: {$gte: startTime, $lt: endTime}
                    }).count();
                    var onlineProm = dbconfig.collection_players.find({
                        partner: partnerData._id,
                        platform: partnerData.platform,
                        registrationTime: {$gte: startTime, $lt: endTime},
                        isOnline: true
                    }).count();
                    var manualProm = dbconfig.collection_players.find({
                        partner: partnerData._id,
                        platform: partnerData.platform,
                        registrationTime: {$gte: startTime, $lt: endTime},
                        isOnline: {$ne: true}
                    }).count();
                    var topUpProm = dbconfig.collection_players.find({
                        partner: partnerData._id,
                        platform: partnerData.platform
                    }).lean().then(
                        players => {
                            if (players && players.length > 0) {
                                var playerObjIds = players.map(player => player._id);
                                return dbconfig.collection_playerTopUpRecord.aggregate(
                                    {
                                        $match: {
                                            platformId: partnerData.platform,
                                            playerId: {$in: playerObjIds},
                                            createTime: {$gte: startTime, $lt: endTime},
                                            amount: {$gt: 0}
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: "$playerId"
                                        }
                                    }
                                ).then(
                                    topUpPlayers => {
                                        return topUpPlayers ? topUpPlayers.length : 0;
                                    }
                                );
                            }
                            else {
                                return 0;
                            }
                        }
                    );
                    var validProm = dbPartner.getPartnerActiveValidPlayers(partnerData.platform, partnerData._id, false, {
                        startTime: startTime,
                        endTime: endTime
                    }).then(
                        validPlayers => {
                            return validPlayers ? validPlayers.length : 0
                        }
                    );
                    var childrenProm = dbconfig.collection_partner.find({
                        parent: partnerData._id,
                        platform: partnerData.platform
                    }).lean().then(
                        partners => {
                            if (partners && partners.length > 0) {
                                var partnerObjIds = partners.map(partner => partner._id);
                                return dbconfig.collection_players.find({
                                    partner: {$in: partnerObjIds},
                                    platform: partnerData.platform,
                                    registrationTime: {$gte: startTime, $lt: endTime}
                                }).count();
                            }
                            else {
                                return 0;
                            }
                        }
                    );
                    return Q.all([totalProm, onlineProm, manualProm, topUpProm, validProm, childrenProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner data"});
                }
            }
        ).then(
            data => {
                if (data) {
                    return {
                        totalNewPlayers: data[0],
                        totalNewOnlinePlayers: data[1],
                        totalNewManualPlayers: data[2],
                        totalTopUpPlayers: data[3],
                        totalValidPlayers: data[4],
                        totalSubPlayers: data[5]
                    };
                }
            }
        );
    },

    getPartnerPhoneNumber: function (partnerObjId) {
        return dbconfig.collection_partner.findOne({_id: partnerObjId}).then(
            partnerData => {
                if (partnerData) {
                    if (partnerData.permission && !partnerData.permission.phoneCallFeedback) {
                        return Q.reject({
                            status: constServerCode.PARTNER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Partner does not have this permission"
                        });
                    }

                    if (partnerData.phoneNumber) {
                        // temp remove the encryption
                        // if (partnerData.phoneNumber.length > 20) {
                        //     try {
                        //         partnerData.phoneNumber = rsaCrypto.decrypt(partnerData.phoneNumber);
                        //     }
                        //     catch (err) {
                        //         console.log(err);
                        //     }
                        // }
                        return partnerData.phoneNumber;
                    } else {
                        return Q.reject({name: "DataError", message: "Can not find phoneNumber"});
                    }
                } else {
                    return Q.reject({name: "DataError", message: "Can not find partner"});
                }
            }
        );
    },

    isPhoneNumberValidToRegister: function (query) {
        return dbconfig.collection_partner.findOne(query).then(
            partnerData => {
                if (partnerData) {
                    return {isPhoneNumberValid: false};
                } else {
                    return {isPhoneNumberValid: true};
                }
            }
        );
    },

    isExceedPhoneNumberValidToRegister: function (query, count) {
        return dbconfig.collection_partner.findOne(query).count().then(
            partnerDataCount => {
                if (partnerDataCount > count) {
                    return {isPhoneNumberValid: false};
                } else {
                    return {isPhoneNumberValid: true};
                }
            }
        );
    },

    isPartnerNameValidToRegister: function (query) {
        return dbconfig.collection_partner.findOne({partnerName:query.partnerName, platform: query.platform}).then(
            partnerData => {
                if (partnerData) {
                    return {isPartnerNameValid: false};
                } else {
                    return {isPartnerNameValid: true};
                }
            }
        );
    },

    updatePartnerPermission: function (query, admin, permission, remark) {
        let updateObj = {};
        for (let key in permission) {
            if (permission.hasOwnProperty(key)) {
                updateObj["permission." + key] = permission[key];
            }
        }
        return dbUtil.findOneAndUpdateForShard(dbconfig.collection_partner, query, updateObj, constShardKeys.collection_partner, false).then(
            suc => {
                let oldData = {};
                for (let i in permission) {
                    if (permission.hasOwnProperty(i)) {
                        if (suc.permission[i] != permission[i]) {
                            oldData[i] = suc.permission[i];
                        } else {
                            delete permission[i];
                        }
                    }
                }
                if (Object.keys(oldData).length !== 0) {
                    let newLog = new dbconfig.collection_partnerPermissionLog({
                        admin: admin,
                        platform: query.platform,
                        partner: query._id,
                        remark: remark,
                        oldData: oldData,
                        newData: permission,
                    });
                    return newLog.save();
                } else return true;
            },
            error => {
                return Q.reject({
                    name: "DBError",
                    message: "Error updating partner permission.",
                    error: error
                });
            }
        ).then(
            suc => {
                return true;
            },
            error => {
                return Q.reject({
                    name: "DBError",
                    message: "Partner permission updated. Error occurred when creating log.",
                    error: error
                });
            }
        );
    },

    /**
     * Update partner status info and record change reasono
     * @param {objectId} partnerObjId
     * @param {String} status
     * @param {String} reason
     */
    updatePartnerStatus: function (partnerObjId, status, reason, adminName) {
        var updateData = {
            status: status
        };

        var partnerProm = dbUtil.findOneAndUpdateForShard(dbconfig.collection_partner, {
            _id: partnerObjId
        }, updateData, constShardKeys.collection_partner);
        var newLog = {
            _partnerId: partnerObjId,
            status: status,
            reason: reason,
            adminName: adminName
        };
        var log = new dbconfig.collection_partnerStatusChangeLog(newLog);
        var logProm = log.save();
        return Q.all([partnerProm, logProm]);
    },

    /*
     * get partner status change log
     * @param {objectId} partnerObjId
     */
    getPartnerStatusChangeLog: function (partnerObjId) {
        return dbconfig.collection_partnerStatusChangeLog.find({_partnerId: partnerObjId}).sort({createTime: 1}).limit(constSystemParam.MAX_RECORD_NUM).exec();
    },

    /**
     * Adds the given amount into the partner's account, and creates a creditChangeLog record.
     * Can also be used to deduct credits from the account, by providing a negative value.
     *
     * @param {ObjectId} partnerObjId
     * @param {ObjectId} platformObjId
     * @param {Number} updateAmount
     * @param {String} reasonType
     * @param {Object} [data]
     * @returns {Promise<Partner>}
     */
    changePartnerCredit: function changePartnerCredit(partnerObjId, platformObjId, updateAmount, reasonType, data) {
        return dbconfig.collection_partner.findOneAndUpdate(
            {_id: partnerObjId, platform: platformObjId},
            {$inc: {credits: updateAmount}},
            {new: true}
        ).then(
            partner => {
                if (!partner) {
                    return Q.reject({name: "DataError", message: "Can't update partner credit: partner not found."});
                }
                dbLogger.createPartnerCreditChangeLog(partnerObjId, platformObjId, updateAmount, reasonType, partner.credits, null, data);
                return partner;
            },
            error => {
                return Q.reject({name: "DBError", message: "Error updating partner.", error: error});
            }
        );
    },

    /**
     * Attempts to take the given amount out of the partner's account.
     * It resolves if the deduction was successful.
     * If rejects if the deduction failed for any reason.
     *
     * @param {ObjectId} partnerObjId
     * @param {ObjectId} platformObjId
     * @param {Number} updateAmount - Must be positive
     * @param {String} reasonType
     * @param {Object} [data]
     * @returns {Promise}
     */
    tryToDeductCreditFromPartner: function tryToDeductCreditFromPartner(partnerObjId, platformObjId, updateAmount, reasonType, data) {
        return Q.resolve().then(
            () => {
                if (updateAmount < 0) {
                    return Q.reject({
                        name: "DataError",
                        message: "tryToDeductCreditFromPartner expects a positive value to deduct",
                        updateAmount: updateAmount
                    });
                }
            }
        ).then(
            () => dbconfig.collection_partner.findOne({
                _id: partnerObjId,
                platform: platformObjId
            }).select('validCredit')
        ).then(
            partner => {
                if (partner.credits < updateAmount) {
                    return Q.reject({
                        status: constServerCode.PARTNER_NOT_ENOUGH_CREDIT,
                        name: "DataError",
                        message: "partner does not have enough credit."
                    });
                }
            }
        ).then(
            () => dbPartner.changePartnerCredit(partnerObjId, platformObjId, -updateAmount, reasonType, data)
        ).then(
            partner => {
                /*
                if (partner.credits < 0) {
                    // First reset the deduction, then report the problem
                    return Q.resolve().then(
                        () => dbPartner.refundPartnerCredit(partnerObjId, platformObjId, +updateAmount, "deductedBelowZeroRefund", data)
                    ).then(
                        () => Q.reject({
                            status: constServerCode.PARTNER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            message: "Partner does not have enough credit.",
                            data: '(detected after withdrawl)'
                        })
                    );
                }
                */
            }
        ).then(
            () => true
        );
    },

    /**
     * Just a conceptual shortcut for changePartnerCredit, could be tweaked in future.
     */
    refundPartnerCredit: function (partnerObjId, platformObjId, refundAmount, reasonType, data) {
        return dbPartner.changePartnerCredit(partnerObjId, platformObjId, refundAmount, reasonType, data);
    },

    getPartnerDomainReport : function (platform, para, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'registrationTime': -1};
        if (sortCol.name) {
            let sortOrder = sortCol.name;
            sortCol = {
                partnerName: sortOrder
            }
        }
        if (sortCol.partner) {
            let sortOrder = sortCol.partner;
            sortCol = {
                parent: sortOrder
            }
        }
        if (sortCol.phoneArea) {
            let sortOrder = sortCol.phoneArea;
            sortCol = {
                phoneProvince: sortOrder,
                phoneCity: sortOrder
            }
        }
        else if (sortCol.ipArea) {
            let sortOrder = sortCol.ipArea;
            sortCol = {
                province: sortOrder,
                city: sortOrder
            }
        }
        else if (sortCol.os) {
            let sortOrder = sortCol.os;
            sortCol = {
                registrationInterface: sortOrder,
                "userAgent.0.os": sortOrder
            }
        }
        else if (sortCol.browser) {
            let sortOrder = sortCol.browser;
            sortCol = {
                registrationInterface: sortOrder,
                "userAgent.0.browser": sortOrder
            }
        }

        let query = {platform: platform};
        para.startTime ? query.registrationTime = {$gte: new Date(para.startTime)} : null;
        (para.endTime && !query.registrationTime) ? (query.registrationTime = {$lt: new Date(para.endTime)}) : null;
        (para.endTime && query.registrationTime) ? (query.registrationTime['$lt'] = new Date(para.endTime)) : null;
        para.partnerName ? query.name = para.name : null;
        para.realName ? query.realName = para.realName : null;
        para.domain ? query.domain = new RegExp('.*' + para.domain + '.*', 'i') : null;
        para.sourceUrl ? query.sourceUrl = new RegExp('.*' + para.sourceUrl + '.*', 'i') : null;
        para.registrationInterface ? query.registrationInterface = para.registrationInterface : null;
        para.loginTimes ? query.loginTimes = para.loginTimes : null;

        let count = dbconfig.collection_partner.find(query).count();
        let detail = dbconfig.collection_partner.find(query).sort(sortCol).skip(index).limit(limit)
            .populate({path: 'parent', model: dbconfig.collection_partner}).read("secondaryPreferred").lean();

        return Q.all([count, detail]).then(
            data => {
                return {data: data[1], size: data[0]}
            }
        )
    },

    getDownlinePlayersRecord: function (platformObjId, partnerObjId, playerName, index, limit, sortCol) {
        let query = {platform: platformObjId, partner: partnerObjId};

        if (playerName) {
            query.name = playerName;
        }

        let countProm = dbconfig.collection_players.find(query).count();
        let downlinesProm = dbconfig.collection_players.find(query).sort(sortCol).skip(index).limit(limit).lean();

        return Promise.all([countProm, downlinesProm]).then(
            data => {
                return {data: data[1], size: data[0]};
            }
        );
    },

    getReferralsList: (partnerArr) => {
        let partnerProm = [];
        partnerArr.forEach(partner => {
            partnerProm.push(
                dbconfig.collection_players.find(
                    {
                        partner: partner._id,
                        platform: partner.platform
                    },
                    {
                        _id: 1, platform: 1, partner: 1, valueScore: 1, name: 1, realName: 1
                    }
                ).lean()
            )
        });
        return Promise.all(partnerProm).then(
            data => {
                return data;
            }
        );
    },

    getTotalPlayerDownline: (partnerArr) => {
        let playerCount = [];
        partnerArr.forEach(partner => {
            playerCount.push(dbconfig.collection_players.find({partner: partner._id, platform: partner.platform}).count().then(
                playerCount => {
                    dbconfig.collection_partner.findOneAndUpdate(
                        {
                            _id: partner._id,
                            platform: partner.platform,
                        },
                        {
                            $set: {totalPlayerDownline: playerCount}
                        }
                    ).exec();
                    return {partnerId: partner._id, size: playerCount}
                }
            ));
        });

        return Promise.all(playerCount).then(
            data => {
                return data;
            }
        );
    },

    getPartnerActivePlayer: (partnerDetail, activeTime, period) => {
        if(partnerDetail && partnerDetail.length > 0) {
            let playerIdList = [];

            partnerDetail.forEach(partnerInDetail => {
                playerIdList.push(ObjectId(partnerInDetail._id));
            });

            let platformId = ObjectId(partnerDetail[0].platform);
            let partnerId = ObjectId(partnerDetail[0].partner);

            return dbconfig.collection_partnerLevelConfig.findOne({platform: ObjectId(platformId)}).lean().then(config => {
                if (!config) {
                    Q.reject({name: "DataError", message: "Cannot find partnerLvlConfig"});
                }

                switch (period) {
                    case 'day':
                        activePlayerTopUpTimes = config.dailyActivePlayerTopUpTimes ? config.dailyActivePlayerTopUpTimes : 0;
                        activePlayerTopUpAmount = config.dailyActivePlayerTopUpAmount ? config.dailyActivePlayerTopUpAmount : 0;
                        activePlayerConsumptionTimes = config.dailyActivePlayerConsumptionTimes ? config.dailyActivePlayerConsumptionTimes : 0;
                        activePlayerConsumptionAmount = config.dailyActivePlayerConsumptionAmount ? config.dailyActivePlayerConsumptionAmount : 0;
                        break;
                    case 'week':
                        activePlayerTopUpTimes = config.weeklyActivePlayerTopUpTimes ? config.weeklyActivePlayerTopUpTimes : 0;
                        activePlayerTopUpAmount = config.weeklyActivePlayerTopUpAmount ? config.weeklyActivePlayerTopUpAmount : 0;
                        activePlayerConsumptionTimes = config.weeklyActivePlayerConsumptionTimes ? config.weeklyActivePlayerConsumptionTimes : 0;
                        activePlayerConsumptionAmount = config.weeklyActivePlayerConsumptionAmount ? config.weeklyActivePlayerConsumptionAmount : 0;
                        break;
                    case 'month':
                    default:
                        activePlayerTopUpTimes = config.monthlyActivePlayerTopUpTimes ? config.monthlyActivePlayerTopUpTimes : 0;
                        activePlayerTopUpAmount = config.monthlyActivePlayerTopUpAmount ? config.monthlyActivePlayerTopUpAmount : 0;
                        activePlayerConsumptionTimes = config.monthlyActivePlayerConsumptionTimes ? config.monthlyActivePlayerConsumptionTimes : 0;
                        activePlayerConsumptionAmount = config.monthlyActivePlayerConsumptionAmount ? config.monthlyActivePlayerConsumptionAmount : 0;
                        break;
                }

                let playerTopUpRecord = dbconfig.collection_playerTopUpRecord.aggregate(
                    {
                        $match: {
                            playerId: {$in: playerIdList},
                            platformId: platformId,
                            createTime: {
                                $gte: new Date(activeTime.startTime),
                                $lt: new Date(activeTime.endTime),
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$playerId",
                            topUpAmount: {$sum: "$amount"},
                            topUpCount: {$sum: 1}
                        }
                    }
                ).read("secondaryPreferred").then(topUpRecords => {
                    if (topUpRecords) {
                        topUpRecords = topUpRecords.filter(player => player.topUpAmount >= activePlayerTopUpAmount && player.topUpCount >= activePlayerTopUpTimes);

                        if (activePlayerTopUpTimes === 0) {
                            if (topUpRecords && topUpRecords.length > 0) {
                                playerIdList.forEach(playerId => {
                                    let index = topUpRecords.findIndex(p => p._id.toString() === playerId.toString());
                                    if (index === -1) {
                                        topUpRecords.push({
                                            _id: playerId,
                                            topUpAmount: 0,
                                            topUpCount: 0
                                        })
                                    }
                                })
                            }
                            else {
                                playerIdList.forEach(playerId => {
                                    topUpRecords.push({
                                        _id: playerId,
                                        topUpAmount: 0,
                                        topUpCount: 0
                                    })
                                })
                            }
                        }
                        return topUpRecords
                    }
                });

                let playerConsumptionRecord = dbconfig.collection_playerConsumptionRecord.aggregate(
                    {
                        $match: {
                            playerId: {$in: playerIdList},
                            platformId: platformId,
                            createTime: {
                                $gte: new Date(activeTime.startTime),
                                $lt: new Date(activeTime.endTime),
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$playerId",
                            consumptionAmount: {$sum: "$validAmount"},
                            consumptionCount: {$sum: 1}
                        }
                    }
                ).read("secondaryPreferred").then(consumptionRecords => {
                    if (consumptionRecords) {
                        consumptionRecords = consumptionRecords.filter(player => player.consumptionCount >= activePlayerConsumptionTimes && player.consumptionAmount >= activePlayerConsumptionAmount);

                        if (activePlayerConsumptionTimes === 0) {
                            if (consumptionRecords && consumptionRecords.length > 0) {
                                playerIdList.forEach(playerId => {
                                    let index = consumptionRecords.findIndex(p => p._id.toString() === playerId.toString());
                                    if (index === -1) {
                                        consumptionRecords.push({
                                            _id: playerId,
                                            consumptionAmount: 0,
                                            consumptionCount: 0
                                        })
                                    }
                                })
                            }
                            else {
                                playerIdList.forEach(playerId => {
                                    consumptionRecords.push({
                                        _id: playerId,
                                        consumptionAmount: 0,
                                        consumptionCount: 0
                                    })
                                })
                            }
                        }
                        return consumptionRecords
                    }
                });

                return Promise.all([playerTopUpRecord, playerConsumptionRecord]).then(data => {
                    if (data) {
                        let topUpRecord = data[0];
                        let consumptionRecord = data[1];

                        let result = [];
                        if (topUpRecord && topUpRecord.length > 0 && consumptionRecord && consumptionRecord.length > 0) {
                            topUpRecord.forEach(topUp => {
                                let index = consumptionRecord.findIndex(p => p._id.toString() === topUp._id.toString());
                                if (index !== -1) {
                                    let pIndex = partnerDetail.findIndex(q => q._id.toString() === topUp._id.toString());
                                    if (pIndex !== -1) {
                                        result.push({
                                            _id: topUp._id,
                                            topUpAmount: topUp.topUpAmount,
                                            topUpCount: topUp.topUpCount,
                                            consumptionAmount: consumptionRecord[index].consumptionAmount,
                                            consumptionCount: consumptionRecord[index].consumptionCount,
                                            valueScore: partnerDetail[pIndex].valueScore,
                                            realName: partnerDetail[pIndex].realName,
                                            name: partnerDetail[pIndex].name
                                        })
                                    }
                                }
                            })
                        }

                        switch (period) {
                            case 'day':
                                dbconfig.collection_partner.findOneAndUpdate(
                                    {
                                        _id: partnerId,
                                        platform: platformId,
                                    },
                                    {
                                        $set: {dailyActivePlayer: result.length}
                                    }
                                ).exec();
                                break;
                            case 'week':
                                dbconfig.collection_partner.findOneAndUpdate(
                                    {
                                        _id: partnerId,
                                        platform: platformId,
                                    },
                                    {
                                        $set: {weeklyActivePlayer: result.length}
                                    }
                                ).exec();
                                break;
                            case 'month':
                            default:
                                dbconfig.collection_partner.findOneAndUpdate(
                                    {
                                        _id: partnerId,
                                        platform: platformId,
                                    },
                                    {
                                        $set: {monthlyActivePlayer: result.length}
                                    }
                                ).exec();
                                break;
                        }
                        return {partnerId: partnerId, size: result.length, downLiner: result}
                    }
                })
            })
        }
    },

    getDailyActivePlayerCount: (partnerArr)  => {
        let todayTime = dbutility.getTodaySGTime();
        let dailyActivePlayerProm = [];
        let period = 'day';

        partnerArr.referral.forEach(partner => {
            if (partner && partner.length) {
                dailyActivePlayerProm.push( dbPartner.getPartnerActivePlayer(partner, todayTime, period) );
            }
        });

        return Promise.all(dailyActivePlayerProm).then( data => {
            return data;
        })
    },

    getWeeklyActivePlayerCount: (partnerArr)  => {
        let currentWeek = dbutility.getCurrentWeekSGTime();
        let weeklyActivePlayerProm = [];
        let period = 'week';

        partnerArr.referral.forEach(partner => {
            if (partner && partner.length) {
                weeklyActivePlayerProm.push( dbPartner.getPartnerActivePlayer(partner, currentWeek, period) );
            }
        });

        return Promise.all(weeklyActivePlayerProm).then( data => {
            return data;
        })
    },

    getMonthlyActivePlayerCount: (partnerArr)  => {
        let currentMonth = dbutility.getCurrentMonthSGTIme();
        let monthlyActivePlayerProm = [];
        let period = 'month';

        partnerArr.referral.forEach(partner => {
            if (partner && partner.length) {
                monthlyActivePlayerProm.push( dbPartner.getPartnerActivePlayer(partner, currentMonth, period) );
            }
        });

        return Promise.all(monthlyActivePlayerProm).then( data => {
            return data;
        })
    },

    getValidPlayersCount: (partnerArr)  => {
        let validPlayersProm = [];

        partnerArr.referral.forEach(partner => {
            if (partner && partner.length) {
                validPlayersProm.push( dbPartner.getValidPlayers(partner) );
            }
        });

        return Promise.all(validPlayersProm).then( data => {
            return data;
        })
    },

    getValidPlayers: (partnerDetail) => {
        if(partnerDetail && partnerDetail.length > 0) {
            let playerIdList = [];

            partnerDetail.forEach(partnerInDetail => {
                playerIdList.push(ObjectId(partnerInDetail._id));
            });

            let platformId = ObjectId(partnerDetail[0].platform);
            let partnerId = ObjectId(partnerDetail[0].partner);

            return dbconfig.collection_partnerLevelConfig.findOne({platform: ObjectId(platformId)}).lean().then(config => {
                if (!config) {
                    Q.reject({name: "DataError", message: "Cannot find partnerLvlConfig"});
                }
                let validPlayerTopUpTimes = config.validPlayerTopUpTimes ? config.validPlayerTopUpTimes : 0;
                let validPlayerTopUpAmount = config.validPlayerTopUpAmount ? config.validPlayerTopUpAmount : 0;
                let validPlayerConsumptionTimes = config.validPlayerConsumptionTimes ? config.validPlayerConsumptionTimes : 0;
                let validPlayerConsumptionAmount = config.validPlayerConsumptionAmount ? config.validPlayerConsumptionAmount : 0;
                let validPlayerValue = config.validPlayerValue ? config.validPlayerValue : 0;

                let playerTopUpRecord = dbconfig.collection_playerTopUpRecord.aggregate(
                    {
                        $match: {
                            playerId: {$in: playerIdList},
                            platformId: platformId,
                        }
                    },
                    {
                        $group: {
                            _id: "$playerId",
                            topUpAmount: {$sum: "$amount"},
                            topUpCount: {$sum: 1}
                        }
                    }
                ).read("secondaryPreferred").then(topUpRecords => {
                    if (topUpRecords) {
                        topUpRecords = topUpRecords.filter(player => player.topUpAmount >= validPlayerTopUpAmount && player.topUpCount >= validPlayerTopUpTimes);

                        if (validPlayerTopUpTimes === 0) {
                            if (topUpRecords && topUpRecords.length > 0) {
                                playerIdList.forEach(playerId => {
                                    let index = topUpRecords.findIndex(p => p._id.toString() === playerId.toString());
                                    if (index === -1) {
                                        topUpRecords.push({
                                            _id: playerId,
                                            topUpAmount: 0,
                                            topUpCount: 0
                                        })
                                    }
                                })
                            }
                            else {
                                playerIdList.forEach(playerId => {
                                    topUpRecords.push({
                                        _id: playerId,
                                        topUpAmount: 0,
                                        topUpCount: 0
                                    })
                                })
                            }
                        }
                        return topUpRecords
                    }
                });

                let playerConsumptionRecord = dbconfig.collection_playerConsumptionRecord.aggregate(
                    {
                        $match: {
                            playerId: {$in: playerIdList},
                            platformId: platformId,
                        }
                    },
                    {
                        $group: {
                            _id: "$playerId",
                            consumptionAmount: {$sum: "$validAmount"},
                            consumptionCount: {$sum: 1}
                        }
                    }
                ).read("secondaryPreferred").then(consumptionRecords => {
                    if (consumptionRecords) {
                        consumptionRecords = consumptionRecords.filter(player => player.consumptionCount >= validPlayerConsumptionTimes && player.consumptionAmount >= validPlayerConsumptionAmount);

                        if (validPlayerConsumptionTimes === 0) {
                            if (consumptionRecords && consumptionRecords.length > 0) {
                                playerIdList.forEach(playerId => {
                                    let index = consumptionRecords.findIndex(p => p._id.toString() === playerId.toString());
                                    if (index === -1) {
                                        consumptionRecords.push({
                                            _id: playerId,
                                            consumptionAmount: 0,
                                            consumptionCount: 0
                                        })
                                    }
                                })
                            }
                            else {
                                playerIdList.forEach(playerId => {
                                    consumptionRecords.push({
                                        _id: playerId,
                                        consumptionAmount: 0,
                                        consumptionCount: 0
                                    })
                                })
                            }
                        }
                        return consumptionRecords
                    }
                });

                return Promise.all([playerTopUpRecord, playerConsumptionRecord]).then(data => {
                    if (data) {
                        let topUpRecord = data[0];
                        let consumptionRecord = data[1];

                        let result = [];
                        if (topUpRecord && topUpRecord.length > 0 && consumptionRecord && consumptionRecord.length > 0) {
                            topUpRecord.forEach(topUp => {
                                let index = consumptionRecord.findIndex(p => p._id.toString() === topUp._id.toString());
                                if (index !== -1) {
                                    let pIndex = partnerDetail.findIndex(q => q._id.toString() === topUp._id.toString());
                                    if (pIndex !== -1) {
                                        if (partnerDetail[pIndex].valueScore >= validPlayerValue) {
                                            result.push({
                                                _id: topUp._id,
                                                topUpAmount: topUp.topUpAmount,
                                                topUpCount: topUp.topUpCount,
                                                consumptionAmount: consumptionRecord[index].consumptionAmount,
                                                consumptionCount: consumptionRecord[index].consumptionCount,
                                                valueScore: partnerDetail[pIndex].valueScore,
                                                realName: partnerDetail[pIndex].realName,
                                                name: partnerDetail[pIndex].name
                                            })
                                        }
                                    }
                                }
                            })
                        }

                        dbconfig.collection_partner.findOneAndUpdate(
                            {
                                _id: partnerId,
                                platform: platformId,
                            },
                            {
                                $set: {validPlayers: result.length}
                            },
                            {new: true}
                        ).exec();
                        return {partnerId: partnerId, size: result.length, downLiner: result}
                    }
                })
            })
        }
    },

    getTotalChildrenDeposit: (partnerArr)  => {
        let totalChildrenDepositProm = [];

        partnerArr.referral.forEach(partner => {
            if (partner && partner.length) {
                totalChildrenDepositProm.push( dbPartner.getTotalChildrenCredit(partner) );
            }
        });

        return Promise.all(totalChildrenDepositProm).then( data => {
            return data;
        })
    },

    getTotalChildrenCredit: (partnerDetail) => {
        if(partnerDetail && partnerDetail.length > 0) {
            let playerIdList = [];
            let totalTopUpAmount = 0;
            let totalBonusAmount = 0;

            partnerDetail.forEach(partnerInDetail => {
                playerIdList.push(ObjectId(partnerInDetail._id));
            });

            let platformId = ObjectId(partnerDetail[0].platform);
            let partnerId = ObjectId(partnerDetail[0].partner);

            return dbconfig.collection_playerTopUpRecord.aggregate(
                {
                    $match: {
                        playerId: {$in: playerIdList},
                        platformId: platformId,
                    }
                },
                {
                    $group: {
                        _id: "$playerId",
                        topUpAmount: {$sum: "$amount"},
                        topUpCount: {$sum: 1}
                    }
                }
            ).read("secondaryPreferred").then(topUpRecord => {
                if (topUpRecord) {
                    topUpRecord.map(player => totalTopUpAmount += player.topUpAmount);

                    let playerList = [];

                    topUpRecord.forEach( record => {
                        playerList.push(ObjectId(record._id));
                    });

                    return dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                "data.playerObjId": {$in: playerList},
                                "data.platformId": platformId,
                                "mainType": constProposalType.PLAYER_BONUS,
                                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                            },
                        },
                        {
                            $group: {
                                _id: "$data.playerName",
                                bonusAmount: {$sum: "$data.amount"},
                                bonusCount: {$sum: 1}
                            }
                        }
                    ).read("secondaryPreferred").then(records => {
                        records.map(player => totalBonusAmount += player.bonusAmount);
                        let totalCredit = (totalTopUpAmount - totalBonusAmount);
                        totalCredit = totalCredit.toFixed(2);

                        dbconfig.collection_partner.findOneAndUpdate(
                            {
                                _id: partnerId,
                                platform: platformId,
                            },
                            {
                                $set: {totalChildrenDeposit: totalCredit}
                            }
                        ).exec();
                        return {partnerId: partnerId, amount: totalCredit}
                    })
                }
            });
        }
    },

    getTotalChildrenBalance: (partnerArr)  => {
        let totalChildrenBalanceProm = [];

        partnerArr.referral.forEach(partner => {
            if (partner && partner.length) {
                totalChildrenBalanceProm.push( dbPartner.getTotalChildrenValidCredit(partner) );
            }
        });

        return Promise.all(totalChildrenBalanceProm).then( data => {
            return data;
        })
    },

    getTotalSettledCommission: (partnerArr)  => {
        let totalSettledCommissionAmount = [];

        partnerArr.forEach(partner => {
            let platformId = ObjectId(partner.platform);
            let partnerId = ObjectId(partner._id);

            let settledCommissionData = dbconfig.collection_proposalType.findOne({
                platformId: platformId,
                name: constProposalType.SETTLE_PARTNER_COMMISSION
            }).then(
                typeData => {
                    if (typeData) {
                        return dbconfig.collection_proposal.aggregate(
                            {
                                $match: {
                                    "data.partnerObjId": partnerId,
                                    "data.platformObjId": platformId,
                                    "type": typeData._id,
                                    "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                },
                            },
                            {
                                $group: {
                                    _id: "$data.partnerName",
                                    commissionAmount: {$sum: "$data.amount"},
                                    commissionCount: {$sum: 1}
                                }
                            }
                        ).read("secondaryPreferred").then(records => {
                            let totalCommissionAmount = 0;
                            records.map(record => totalCommissionAmount += record.commissionAmount);
                            totalCommissionAmount = parseFloat(totalCommissionAmount).toFixed(2);

                            dbconfig.collection_partner.findOneAndUpdate(
                                {
                                    _id: partnerId,
                                    platform: platformId,
                                },
                                {
                                    $set: {totalSettledCommission: totalCommissionAmount}
                                }
                            ).exec();
                            return {partnerId: partnerId, amount: totalCommissionAmount}
                        })
                    }
                }
            );

            totalSettledCommissionAmount.push(settledCommissionData);
        });

        return Promise.all(totalSettledCommissionAmount).then( data => {
            return data;
        })
    },

    getChildrenDetails: (platform, partnerId) => {
        if(!platform || !partnerId){
            return;
        }
        console.log('HERE11===');

        return dbconfig.collection_players.find({platform: platform, partner: ObjectId(partnerId)}).lean().then(
            playerDetails => {
                if(playerDetails){
                    console.log('HERE22===');
                    let calculatedDetailsProm = [];

                    playerDetails.map(
                        player => {
                            if(player){
                                console.log('HERE33===');
                                calculatedDetailsProm.push(dbPartner.getPlayerCalculatedDetails(player));
                            }
                        }
                    );

                    return Promise.all(calculatedDetailsProm);
                }
            }
        )
    },

    getPlayerCalculatedDetails: (player) => {
        let getPlayerTopUpDetailsProm = dbPartner.getPlayerTopUpDetails(player._id);
        let getPlayerBonusDetailsProm = dbPartner.getPlayerBonusDetails(player._id, player.platform);
        let playerObj = player;
        playerObj.manualTopUp = 0;
        playerObj.onlineTopUp = 0;
        playerObj.aliPayTopUp = 0;
        playerObj.wechatTopUp = 0;
        playerObj.totalBonus = 0;
        playerObj.totalDepositAmount = playerObj.topUpSum || 0;
        console.log('player.name===', player.name);

        return Promise.all([getPlayerTopUpDetailsProm, getPlayerBonusDetailsProm]).then(
            result => {
                console.log('result[0]===', result[0]);
                console.log('result[1]===', result[1]);
                if(result && result[0] && result[1]){
                    let topUpDetails = result[0];
                    let bonusDetails = result[1][0];

                    topUpDetails.forEach(topUpData => {
                        if(topUpData && topUpData._id && topUpData._id.topUpType){
                            if(topUpData._id.topUpType == constPlayerTopUpTypes.MANUAL){
                                playerObj.manualTopUp = topUpData.totalTopUpCount;
                            }else if(topUpData._id.topUpType == constPlayerTopUpTypes.ONLINE){
                                playerObj.onlineTopUp = topUpData.totalTopUpCount;
                            }else if(topUpData._id.topUpType == constPlayerTopUpTypes.ALIPAY){
                                playerObj.aliPayTopUp = topUpData.totalTopUpCount;
                            }else if(topUpData._id.topUpType == constPlayerTopUpTypes.WECHAT){
                                playerObj.wechatTopUp = topUpData.totalTopUpCount;
                            }
                        }
                    })

                    if(bonusDetails && bonusDetails.totalBonusAmount ){
                        console.log('bonusDetails===', bonusDetails);
                        playerObj.totalBonus = bonusDetails.totalBonusAmount;
                        playerObj.totalDepositAmount = playerObj.topUpSum - bonusDetails.totalBonusAmount;
                    }
                    console.log('playerObj.totalBonus===', playerObj.totalBonus);

                    return playerObj;
                }
            }
        )
    },

    getPlayerTopUpDetails: (playerObjId) => {
        return dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: {
                    playerId: playerObjId,
                }
            },
            {
                $group: {
                    _id: {"topUpType": "$topUpType"},
                    totalTopUpCount: {$sum: "$amount"}
                }
            }
        )
    },

    getPlayerBonusDetails: (playerObjId, platformObjId) => {
        return dbconfig.collection_proposalType.findOne({platformId: platformObjId, name: constProposalType.PLAYER_BONUS}).then(
            proposalType => {
                if(proposalType){
                    console.log('proposalType===', proposalType);
                    return dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: proposalType._id,
                                'data.playerObjId': playerObjId,
                                status: {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                            }
                        },
                        {
                            $group: {
                                //_id: "$data.amount",
                                _id: null,
                                totalBonusAmount: {$sum: "$data.amount"}
                            }
                        }
                    )
                }
            }
        );
    },

    getTotalChildrenValidCredit: (partnerDetail) => {
        if(partnerDetail && partnerDetail.length > 0) {
            let playerIdList = [];
            let totalValidCredit = 0;

            partnerDetail.forEach(partnerInDetail => {
                playerIdList.push(ObjectId(partnerInDetail._id));
            });

            let platformId = ObjectId(partnerDetail[0].platform);
            let partnerId = ObjectId(partnerDetail[0].partner);

            return dbconfig.collection_players.aggregate(
                {
                    $match: {
                        _id: {$in: playerIdList},
                        platform: platformId,
                    }
                },
                {
                    $group: {
                        _id: "$playerId",
                        validCredit: {$sum: "$validCredit"},
                        validCreditCount: {$sum: 1}
                    }
                }
            ).read("secondaryPreferred").then(topUpRecord => {
                if (topUpRecord) {
                    topUpRecord.map(player => totalValidCredit += player.validCredit);
                    totalValidCredit = totalValidCredit.toFixed(2);

                    dbconfig.collection_partner.findOneAndUpdate(
                        {
                            _id: partnerId,
                            platform: platformId,
                        },
                        {
                            $set: {totalChildrenBalance: totalValidCredit}
                        }
                    ).exec();
                    return {partnerId: partnerId, amount: totalValidCredit};
                }
            });
        }
    },

    customizePartnerCommission: (partnerObjId, settingObjId, field, oldConfig, newConfig, isPlatformRate, isRevert, isDelete, adminInfo, commissionType) => {
        return dbconfig.collection_partner.findById(partnerObjId).lean().then(
            partnerObj => {
                if (partnerObj) {
                    let creatorData = adminInfo || {
                        type: 'partner',
                        name: partnerObj.partnerName,
                        id: partnerObj._id
                    }

                    let proposalData = {
                        creator: adminInfo || {
                            type: 'partner',
                            name: partnerObj.partnerName,
                            id: partnerObj._id
                        },
                        platformObjId: partnerObj.platform,
                        partnerObjId: partnerObjId,
                        partnerName: partnerObj.partnerName,
                        settingObjId: settingObjId,
                        oldRate: oldConfig,
                        newRate: newConfig,
                        remark: localization.localization.translate(field),
                        isRevert: isRevert,
                        isPlatformRate: isPlatformRate,
                        isDelete: isDelete,
                        commissionType: commissionType
                    };
                    return dbProposal.createProposalWithTypeName(partnerObj.platform, constProposalType.CUSTOMIZE_PARTNER_COMM_RATE, {creator: creatorData, data: proposalData});
                }
            }
        );
    },

    updateAllCustomizeCommissionRate: (partnerObjId, commissionType, oldConfigArr, newConfigArr, adminInfo) => {
        if (newConfigArr && newConfigArr.length > 0) {
            newConfigArr.forEach(config => {
                if (config && config.commissionSetting && config.commissionSetting.length > 0) {
                    config.commissionSetting.forEach(setting => {
                        if (setting) {
                            setting.commissionRate = parseFloat((setting.commissionRate / 100).toFixed(4));
                        }
                    });
                }
            });
        }

        return dbconfig.collection_partner.findById(partnerObjId).lean().then(
            partnerObj => {
                if (partnerObj) {
                    let creatorData = adminInfo || {
                        type: 'partner',
                        name: partnerObj.partnerName,
                        id: partnerObj._id
                    };

                    let proposalData = {
                        creator: adminInfo || {
                            type: 'partner',
                            name: partnerObj.partnerName,
                            id: partnerObj._id
                        },
                        platformObjId: partnerObj.platform,
                        partnerObjId: partnerObjId,
                        partnerName: partnerObj.partnerName,
                        commissionType: commissionType,
                        remark: localization.localization.translate('commissionRate'),
                        isEditAll: true,
                        oldConfigArr: oldConfigArr,
                        newConfigArr: newConfigArr
                    };

                    return dbProposal.createProposalWithTypeName(partnerObj.platform, constProposalType.CUSTOMIZE_PARTNER_COMM_RATE, {creator: creatorData, data: proposalData});
                }
            }
        )
    },

    resetAllCustomizedCommissionRate: (partnerObjId, field, isResetAll, commissionType, adminInfo) => {
        return dbconfig.collection_partner.findById(partnerObjId).lean().then(
            partnerObj => {
                if (partnerObj) {
                    let creatorData = adminInfo || {
                        type: 'partner',
                        name: partnerObj.partnerName,
                        id: partnerObj._id
                    };

                    let proposalData = {
                        creator: adminInfo || {
                            type: 'partner',
                            name: partnerObj.partnerName,
                            id: partnerObj._id
                        },
                        platformObjId: partnerObj.platform,
                        partnerObjId: partnerObjId,
                        partnerName: partnerObj.partnerName,
                        remark: localization.localization.translate(field),
                        isResetAll: isResetAll,
                        commissionType: commissionType
                    };

                    return dbProposal.createProposalWithTypeName(partnerObj.platform, constProposalType.CUSTOMIZE_PARTNER_COMM_RATE, {creator: creatorData, data: proposalData});
                }
            }
        );
    },

    settlePartnersCommission: function (partnerObjIdArr, commissionType, startTime, endTime, isSkip) {
        let proms = [];
        partnerObjIdArr.map(partnerObjId => {
            let prom;
            if (isSkip) {
                prom = generateSkipCommissionLog(partnerObjId, commissionType, startTime, endTime).catch(errorUtils.reportError);
            }
            else {
                prom = dbPartner.generatePartnerCommissionLog(partnerObjId, commissionType, startTime, endTime).catch(errorUtils.reportError);
            }
            proms.push(prom);
        });

        return Promise.all(proms);
    },

    generatePartnerCommissionLog: function (partnerObjId, commissionType, startTime, endTime) {
        let downLinesRawCommissionDetails, partnerCommissionLog;
        return dbPartner.calculatePartnerCommissionDetail(partnerObjId, commissionType, startTime, endTime)
            .then(
            commissionDetail => {
                if (commissionDetail.disableCommissionSettlement) {
                    return undefined;
                }
                downLinesRawCommissionDetails = commissionDetail.downLinesRawCommissionDetail || [];

                delete commissionDetail.downLinesRawCommissionDetail;
                if (commissionDetail.rawCommissions && commissionDetail.rawCommissions.length) {
                    commissionDetail.rawCommissions.map(rawCommission => {
                        if (rawCommission && rawCommission.crewProfitDetail) {
                            delete rawCommission.crewProfitDetail;
                        }
                    });
                }

                return dbconfig.collection_partnerCommissionLog.findOneAndUpdate({
                    partner: commissionDetail.partner,
                    platform: commissionDetail.platform,
                    startTime: startTime,
                    endTime: endTime,
                    commissionType: commissionType,
                }, commissionDetail, {upsert: true, new: true}).lean().catch(err => {
                    console.error('partnerCommissionLog died with param:', commissionDetail, err);
                    return Promise.reject(err);
                })
            }
        ).then(
            partnerCommissionLogData => {
                if (!partnerCommissionLogData) {
                    return undefined;
                }
                updatePastThreeRecord(partnerCommissionLogData).catch(errorUtils.reportError);
                partnerCommissionLog = partnerCommissionLogData;

                let proms = [];
                downLinesRawCommissionDetails.map(detail => {
                    detail.platform = partnerCommissionLog.platform;
                    detail.partnerCommissionLog = partnerCommissionLog._id;

                    let prom = dbconfig.collection_downLinesRawCommissionDetail.findOneAndUpdate({platform: detail.platform, partnerCommissionLog: detail.partnerCommissionLog, name: detail.name}, detail, {upsert: true, new: true}).catch(err => {
                        console.error('downLinesRawCommissionDetail died with param:', detail, err);
                        errorUtils.reportError(err);
                    });
                    proms.push(prom);
                });

                return Promise.all(proms);
            }
        ).then(
            downLinesRawCommissionDetail => {
                if (!downLinesRawCommissionDetail) {
                    return undefined;
                }

                partnerCommissionLog.downLinesRawCommissionDetail = downLinesRawCommissionDetail;
                return partnerCommissionLog;
            }
        );
    },

    getCurrentPartnerCommissionDetail: function (platformObjId, commissionType, partnerName, startTime, endTime) {
        let result = [];
        let query = {platform: platformObjId};
        commissionType = commissionType || constPartnerCommissionType.DAILY_BONUS_AMOUNT;

        if (partnerName) {
            query.partnerName = partnerName;
        }
        else {
            query.commissionType = commissionType;
        }

        let stream = dbconfig.collection_partner.find(query, {commissionType: 1}).cursor({batchSize: 100});

        let balancer = new SettlementBalancer();
        return balancer.initConns().then(function () {
            return balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (partners, request) {
                        if (partners.length === 1) {
                            if (partners[0].commissionType) {
                                commissionType = partners[0].commissionType || commissionType;
                            }
                        }
                        request("player", "getCurrentPartnersCommission", {
                            commissionType: commissionType,
                            startTime: startTime,
                            endTime: endTime,
                            partnerObjIdArr: partners.map(function (partner) {
                                return partner._id;
                            })
                        });
                    },
                    processResponse: function (record) {
                        result = result.concat(record.data);
                    }
                }
            );
        }).then(
            () => {
                return result;
            }
        )
    },

    generateCurrentPartnersCommissionDetail: function (partnerObjIds, commissionType, startTime, endTime) {
        let currentPeriod = getCurrentCommissionPeriod(commissionType);

        if (startTime && endTime) {
            currentPeriod = {startTime, endTime};
        }

        let proms = [];

        partnerObjIds.map(partnerObjId => {
            let commissionDetail = {};
            let prom = dbPartner.calculatePartnerCommissionDetail(partnerObjId, commissionType, currentPeriod.startTime, currentPeriod.endTime).then(
                commissionData => {
                    commissionDetail = commissionData;
                    return getPreviousThreeDetailIfExist(partnerObjId, commissionType, currentPeriod.startTime);
                }
            ).then(
                pastData => {
                    commissionDetail.pastActiveDownLines = pastData.pastThreeActiveDownLines;
                    commissionDetail.pastNettCommission = pastData.pastThreeNettCommission;
                    return commissionDetail;
                }
            ).catch(errorUtils.reportError);
            proms.push(prom);
        });

        return Promise.all(proms);
    },

    calculatePartnerCommissionDetail: function (partnerObjId, commissionType, startTime, endTime) {
        let partner = {};
        let platform = {};
        let downLines = [];
        let providerGroups = [];
        let paymentProposalTypes = [];
        let rewardProposalTypes = [];
        let partnerCommissionRateConfig = {};
        let commissionRateTables = [];
        let activePlayerRequirement = {};
        let downLinesRawCommissionDetail = [];
        let activeDownLines = 0;
        let providerGroupConsumptionData = {};
        let commissionRates = {};
        let rawCommissions = [];
        let grossCommission = 0;
        let totalPlatformFee = 0;
        let totalReward = 0;
        let totalRewardFee = 0;
        let totalTopUp = 0;
        let totalTopUpFee = 0;
        let totalWithdrawal = 0;
        let totalWithdrawalFee = 0;
        let nettCommission = 0;
        let totaldownLines = 0;
        let parentPartnerCommissionDetail;
        let remarks;

        let commissionPeriod = getCommissionPeriod(commissionType);
        if (startTime && endTime) {
            commissionPeriod = {
                startTime: startTime,
                endTime: endTime
            };
        }

        let partnerProm = dbconfig.collection_partner.findOne({_id: partnerObjId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "parent", model: dbconfig.collection_partner}).lean();

        return partnerProm.then(
            data => {
                if (!data) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Error in getting partner data",
                    });
                }

                partner = data;
                platform = data.platform;

                let downLinesProm = dbconfig.collection_players.find({platform: platform._id, partner: partner._id}).lean();
                let providerGroupProm = dbconfig.collection_gameProviderGroup.find({platform: platform._id}).lean();
                if (!platform.useProviderGroup) {
                    providerGroupProm = Promise.resolve([]);
                }

                return Promise.all([downLinesProm, providerGroupProm]);

            }
        ).then(
            data => {
                downLines = data[0];
                providerGroups = data[1];

                let commissionRateTableProm = getAllCommissionRateTable(platform._id, commissionType, partner._id, providerGroups);
                let activePlayerRequirementProm = getRelevantActivePlayerRequirement(platform._id, commissionType);
                let paymentProposalTypesProm = getPaymentProposalTypes(platform._id);
                let rewardProposalTypesProm = getRewardProposalTypes(platform._id);
                let partnerCommissionConfigRateProm = getPartnerCommissionConfigRate(platform._id, partner._id);

                return Promise.all([commissionRateTableProm, activePlayerRequirementProm, paymentProposalTypesProm, rewardProposalTypesProm, partnerCommissionConfigRateProm]);
            }
        ).then(
            data => {
                commissionRateTables = data[0];

                activePlayerRequirement = data[1];

                paymentProposalTypes = data[2];

                rewardProposalTypes = data[3];

                partnerCommissionRateConfig = data[4];

                totaldownLines = downLines.length;

                let downLinesRawDetailProms = [];

                if (downLines.length > 200) {
                    return getAllPlayerCommissionRawDetailsWithSettlement(downLines, commissionType, commissionPeriod.startTime, commissionPeriod.endTime, providerGroups, paymentProposalTypes, rewardProposalTypes, activePlayerRequirement);
                }
                else {
                    downLines.map(player => {
                        let prom = getAllPlayerCommissionRawDetails(player._id, commissionType, commissionPeriod.startTime, commissionPeriod.endTime, providerGroups, paymentProposalTypes, rewardProposalTypes, activePlayerRequirement);
                        downLinesRawDetailProms.push(prom);
                    });
                }

                return Promise.all(downLinesRawDetailProms);
            }
        ).then(
            downLinesRawData => {
                downLinesRawCommissionDetail = downLinesRawData;

                activeDownLines = getActiveDownLineCount(downLinesRawCommissionDetail);

                providerGroupConsumptionData = getTotalPlayerConsumptionByProviderGroupName(downLinesRawCommissionDetail, providerGroups);

                commissionRateTables.map(groupRate => {
                    let totalConsumption = commissionType === constPartnerCommissionType.WEEKLY_CONSUMPTION
                        ? providerGroupConsumptionData[groupRate.groupName].validAmount
                        : -providerGroupConsumptionData[groupRate.groupName].bonusAmount;

                    let totalBonusAmount = -providerGroupConsumptionData[groupRate.groupName].bonusAmount;

                    commissionRates[groupRate.groupName] = getCommissionRate(groupRate.rateTable, totalConsumption, activeDownLines);

                    let platformFeeRateData = {};

                    if (groupRate.groupName == 'noGroup') {
                        platformFeeRateData.rate = partnerCommissionRateConfig.rateAfterRebatePlatform;
                        platformFeeRateData.isCustom = partnerCommissionRateConfig.rateAfterRebatePlatformIsCustom;
                    }
                    else {
                        if (partnerCommissionRateConfig && partnerCommissionRateConfig.rateAfterRebateGameProviderGroup
                            && typeof partnerCommissionRateConfig.rateAfterRebateGameProviderGroup == 'object') {
                            partnerCommissionRateConfig.rateAfterRebateGameProviderGroup.map(group => {
                                if (group.name === groupRate.groupName) {
                                    platformFeeRateData.rate = group.rate || 0;
                                    platformFeeRateData.isCustom = Boolean(group.isCustom);
                                }
                            });
                        } else if (partnerCommissionRateConfig && partnerCommissionRateConfig.hasOwnProperty('rateAfterRebateGameProviderGroup')
                            && typeof partnerCommissionRateConfig.rateAfterRebateGameProviderGroup == 'number') {
                            platformFeeRateData.rate = 0;
                            platformFeeRateData.isCustom = false;
                        }
                    }

                    let platformFeeRate = platformFeeRateData.rate ? Number(platformFeeRateData.rate) : 0;
                    let isCustomPlatformFeeRate = platformFeeRateData.isCustom;

                    let rawCommission = calculateRawCommission(totalConsumption, commissionRates[groupRate.groupName].commissionRate);

                    let platformFee =  platformFeeRate * totalBonusAmount / 100;
                    // platformFee = platformFee >= 0 ? platformFee : 0;
                    totalPlatformFee += platformFee;

                    rawCommissions.push({
                        crewProfit: providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                        crewProfitDetail: providerGroupConsumptionData[groupRate.groupName].crewProfitDetail,
                        groupName: groupRate.groupName,
                        groupId: groupRate.groupId,
                        amount: rawCommission,
                        totalConsumption: totalConsumption,
                        commissionRate: commissionRates[groupRate.groupName].commissionRate,
                        isCustomCommissionRate: commissionRates[groupRate.groupName].isCustom,
                        platformFee: platformFee,
                        platformFeeRate: platformFeeRate,
                        isCustomPlatformFeeRate: isCustomPlatformFeeRate,
                        siteBonusAmount: -providerGroupConsumptionData[groupRate.groupName].bonusAmount,
                    });

                    grossCommission += rawCommission;
                });

                totalReward = getTotalReward(downLinesRawData);
                totalRewardFee = totalReward * partnerCommissionRateConfig.rateAfterRebatePromo / 100;

                totalTopUp = getTotalTopUp(downLinesRawData);
                totalTopUpFee = totalTopUp * partnerCommissionRateConfig.rateAfterRebateTotalDeposit / 100;

                totalWithdrawal = getTotalWithdrawal(downLinesRawData);
                totalWithdrawalFee = totalWithdrawal * partnerCommissionRateConfig.rateAfterRebateTotalWithdrawal / 100;

                nettCommission = grossCommission - totalPlatformFee - totalTopUpFee - totalWithdrawalFee - totalRewardFee;

                if (partner && partner.parent && Object.keys(partner.parent) && Object.keys(partner.parent).length > 0) {
                    parentPartnerCommissionDetail = {};
                    let totalWinLose = getTotalWinLose(downLinesRawData);
                    let rate = partnerCommissionRateConfig && partnerCommissionRateConfig.parentCommissionRate ? partnerCommissionRateConfig.parentCommissionRate : 0;

                    parentPartnerCommissionDetail.parentPartnerObjId = partner.parent._id;
                    parentPartnerCommissionDetail.parentPartnerName = partner.parent.partnerName;
                    parentPartnerCommissionDetail.parentPartnerId = partner.parent.partnerId;
                    parentPartnerCommissionDetail.totalWinLose = totalWinLose;
                    parentPartnerCommissionDetail.parentCommissionRate = rate;
                    parentPartnerCommissionDetail.totalParentCommissionFee = totalWinLose < 0 ? -totalWinLose * rate / 100 : 0;
                    parentPartnerCommissionDetail.totaldownLines = totaldownLines;

                    remarks = translate("Parent Partner") + "：" + partner.parent.partnerName + "（"+ rate + "％）";
                }

                let returnObj = {
                    partner: partner._id,
                    platform: platform._id,
                    commissionType: commissionType,
                    startTime: commissionPeriod.startTime,
                    endTime: commissionPeriod.endTime,
                    partnerId: partner.partnerId,
                    partnerName: partner.partnerName,
                    partnerRealName: partner.realName,
                    partnerCredit: partner.credits,
                    downLinesRawCommissionDetail: downLinesRawCommissionDetail,
                    activeDownLines: activeDownLines,
                    partnerCommissionRateConfig: partnerCommissionRateConfig,
                    rawCommissions: rawCommissions,
                    totalReward: totalReward,
                    totalRewardFee: totalRewardFee,
                    rewardFeeRate: partnerCommissionRateConfig.rateAfterRebatePromo / 100,
                    totalPlatformFee: totalPlatformFee,
                    totalTopUp: totalTopUp,
                    totalTopUpFee: totalTopUpFee,
                    topUpFeeRate: partnerCommissionRateConfig.rateAfterRebateTotalDeposit / 100,
                    totalWithdrawal: totalWithdrawal,
                    totalWithdrawalFee: totalWithdrawalFee,
                    withdrawFeeRate: partnerCommissionRateConfig.rateAfterRebateTotalWithdrawal / 100,
                    status: constPartnerCommissionLogStatus.PREVIEW,
                    nettCommission: nettCommission,
                    disableCommissionSettlement: Boolean(partner.permission && partner.permission.disableCommSettlement),
                    parentPartnerCommissionDetail: parentPartnerCommissionDetail,
                    remarks: remarks,
                };

                if (totalTopUp) {
                    let depositCrewDetail = [];
                    downLinesRawData.forEach(downLine => {
                        if (downLine.topUpDetail.topUpAmount) {
                            depositCrewDetail.push({
                                crewAccount: downLine.name,
                                crewDepositAmount: downLine.topUpDetail.topUpAmount
                            })
                        }
                    });
                    returnObj.depositCrewDetail = depositCrewDetail;
                }

                if (totalWithdrawal) {
                    let withdrawCrewDetail = [];
                    downLinesRawData.forEach(downLine => {
                        if (downLine.withdrawalDetail.withdrawalAmount) {
                            withdrawCrewDetail.push({
                                crewAccount: downLine.name,
                                crewWithdrawAmount: downLine.withdrawalDetail.withdrawalAmount
                            })
                        }
                    });
                    returnObj.withdrawCrewDetail = withdrawCrewDetail;
                }

                if (totalWithdrawal) {
                    let bonusCrewDetail = [];
                    downLinesRawData.forEach(downLine => {
                        if (downLine.rewardDetail.total) {
                            bonusCrewDetail.push({
                                crewAccount: downLine.name,
                                crewBonusAmount: downLine.rewardDetail.total
                            })
                        }
                    });
                    returnObj.bonusCrewDetail = bonusCrewDetail;
                }

                return returnObj;
            }
        );
    },

    getPartnerCommissionLog: function (platformObjId, commissionType, startTime, endTime) {
        // return dbconfig.collection_partnerCommissionLog.find({
        //     "platform": platformObjId,
        //     commissionType: commissionType,
        //     startTime: startTime,
        //     endTime: endTime
        // }).lean();
        return dbPartner.findPartnerCommissionLog({
            "platform": platformObjId,
            commissionType: commissionType,
            startTime: new Date(startTime),
            endTime: new Date(endTime)
        });
    },

    getSelectedPartnerCommissionLog: function (platformObjId, partnerName) {
        let partner, settLog;
        return dbconfig.collection_partner.findOne({partnerName: partnerName, platform: platformObjId}, {partnerName: 1, platform: 1, commissionType:1}).lean().then(
            partnerData => {
                if (!partnerData) {
                    return Promise.reject({message: "No partner found in table"});
                }
                partner = partnerData;

                return dbconfig.collection_partnerCommSettLog.findOne({
                    platform: partner.platform,
                    settMode: partner.commissionType,
                    isSkipped: false,
                    isSettled: false
                }).lean();
            }
        ).then(
            settLogData => {
                if (!settLogData) {
                    return null;
                }
                settLog = settLogData;

                return dbPartner.findPartnerCommissionLog({
                    status: constPartnerCommissionLogStatus.PREVIEW,
                    partner: partner._id,
                    platform: partner.platform,
                    commissionType: partner.commissionType
                }, true);
            }
        ).then(
            partnerCommmissionLog => {
                if (partnerCommmissionLog) {
                    return partnerCommmissionLog;
                }

                if (!settLog) {
                    return null;
                }

                return dbPartner.generatePartnerCommissionLog(partner._id, partner.commissionType, settLog.startTime, settLog.endTime);
            }
        )
    },

    /**
     * Create new Proposal to update partner QQ
     * @param {json} data - proposal data
     */
    createPartnerQQProposal: function createPartnerQQProposal(query, data) {
        return dbconfig.collection_partner.findOne(query).lean().then(
            partnerData => {
                let proposalData = {
                    data: {
                        partnerName: partnerData.partnerName,
                        updateData: {qq: data.qq}
                    }
                }

                if (partnerData.qq) {
                    proposalData.data.curData = {qq: partnerData.qq};
                }

                if (partnerData.qq && !data.qq) {
                    return Q.reject({
                        status: constServerCode.INVALID_PARAM,
                        name: "DataError",
                        message: "INVALID_DATA"
                    });
                } else if (!partnerData.qq && !data.qq) {
                    return Promise.resolve();
                } else {
                    return dbProposal.createProposalWithTypeNameWithProcessInfo(partnerData.platform, constProposalType.UPDATE_PARTNER_QQ, proposalData);
                }
            }
        )
    },

    /**
     * Create new Proposal to update partner WeChat
     * @param {json} data - proposal data
     */
    createPartnerWeChatProposal: function createPartnerWeChatProposal(query, data) {
        return dbconfig.collection_partner.findOne(query).lean().then(
            partnerData => {
                let proposalData = {
                    data: {
                        partnerName: partnerData.partnerName,
                        updateData: {wechat: data.wechat}
                    }
                }

                if (partnerData.wechat) {
                    proposalData.data.curData = {wechat: partnerData.wechat};
                }

                if (partnerData.wechat && !data.wechat) {
                    return Q.reject({
                        status: constServerCode.INVALID_PARAM,
                        name: "DataError",
                        message: "INVALID_DATA"
                    });
                } else if (!partnerData.wechat && !data.wechat) {
                    return Promise.resolve();
                } else {
                    return dbProposal.createProposalWithTypeNameWithProcessInfo(partnerData.platform, constProposalType.UPDATE_PARTNER_WECHAT, proposalData);
                }
            }
        )
    },

    /**
     * Create new Proposal to update partner email
     * @param {json} data - proposal data
     */
    createPartnerEmailProposal: function createPartnerEmailProposal(query, data) {
        return dbconfig.collection_partner.findOne(query).lean().then(
            partnerData => {
                let proposalData = {
                    data: {
                        partnerName: partnerData.partnerName,
                        updateData: {email: data.email}
                    }
                }

                if (partnerData.email) {
                    proposalData.data.curData = {email: partnerData.email};
                }

                if (partnerData.email && !data.email) {
                    return Q.reject({
                        status: constServerCode.INVALID_PARAM,
                        name: "DataError",
                        message: "INVALID_DATA"
                    });
                } else if (!partnerData.email && !data.email) {
                    return Promise.resolve();
                } else {
                    return dbProposal.createProposalWithTypeNameWithProcessInfo(partnerData.platform, constProposalType.UPDATE_PARTNER_EMAIL, proposalData);
                }
            }
        )
    },

    applyClearPartnerCredit: (partnerObjId, commissionLog, adminName, remark) => {
        return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
            partnerData => {
                let proposalData = {
                    data: {
                        partnerObjId: partnerData._id,
                        platformObjId: partnerData.platform,
                        partnerName: partnerData.partnerName,
                        updateAmount: -Number(partnerData.credits),
                        curAmount: partnerData.credits,
                        realName: partnerData.realName,
                        remark: remark,
                        adminName: adminName,
                        isIgnoreAudit: true,
                        commissionType: commissionLog.commissionType,
                        logObjId: commissionLog._id,
                    },
                    isPartner: true,
                };

                return dbProposal.checkUpdateCreditProposal(partnerData.platform, constProposalType.UPDATE_PARTNER_CREDIT, proposalData);
            }
        );
    },

    bulkSettlePartnerCommission: (applySettlementArray, adminInfo, platformObjId, commissionType, startTime, endTime) => {
        if (!applySettlementArray || applySettlementArray.length < 1) {
            return;
        }

        updateCommSettLog(platformObjId, commissionType, startTime, endTime).catch(errorUtils.reportError);

        let proms = [];

        applySettlementArray.map(commissionApplication => {
            let logObjId = commissionApplication.logId;
            let settleType = commissionApplication.settleType;
            let remark = commissionApplication.remark;

            let prom = applyCommissionToPartner(logObjId, settleType, remark, adminInfo).catch(err => {
                console.log('settle fail', logObjId, err);
                return errorUtils.reportError(err);
            });

            proms.push(prom);
        });

        return Promise.all(proms);
    },

    updateTotalPlatformFeeToZero: (partnerCommissionLogObjId, platformObjId, partnerObjId, commissionType, rawCommissions, totalPlatformFee, nettCommission, adminInfo) => {
        let rawCommissionsArr = [];
        if (rawCommissions && rawCommissions.length > 0) {
            for (let i = 0; i < rawCommissions.length; i++) {
                let detail = rawCommissions[i];

                if (detail) {
                    detail.platformFee = 0;
                    detail.isForcePlatformFeeToZero = true;
                    detail.forcePlatformFeeToZeroBy = adminInfo;

                    rawCommissionsArr.push(detail);
                }
            }

            if (rawCommissionsArr && rawCommissionsArr.length > 0) {
                let latestNettCommission = nettCommission;

                latestNettCommission += totalPlatformFee;

                return dbconfig.collection_partnerCommissionLog.findOneAndUpdate(
                    {
                        _id: partnerCommissionLogObjId,
                        platform: platformObjId,
                        partner: partnerObjId,
                        commissionType: commissionType
                    },
                    {
                        rawCommissions: rawCommissionsArr,
                        nettCommission: latestNettCommission,
                        totalPlatformFee: 0
                    }
                );
            }
        }
    },

    getPartnerSettlementHistory: (platformObjId, partnerName, commissionType, startTime, endTime, sortCol, index, limit) => {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'_id': -1};
        let query = {
            platform: ObjectId(platformObjId),
            startTime: {
                $gte: startTime,
                $lte: endTime
            },
            endTime: {
                $gte: startTime,
                $lte: endTime
            },
            status: {
                $gte: 1,
                $lte: 3
            }
        };
        if(partnerName) {
            query.partnerName = partnerName;
        }
        if(commissionType) {
            query.commissionType = commissionType;
        }

        let count = dbconfig.collection_partnerCommissionLog.count(query).read("secondaryPreferred");
        // let result = dbconfig.collection_partnerCommissionLog.find(query).read("secondaryPreferred");
        let result = dbPartner.findPartnerCommissionLog(query);

        return Promise.all([count, result]).then(data => {
            let retData = [];
            let filterData = [];
            let result = data[1];

            result.forEach(v => {
                let filterDataIndex = filterData.indexOf(v.commissionType+v.partnerName);
                if(filterDataIndex < 0) {
                    filterData.push(v.commissionType+v.partnerName);

                    let record = JSON.parse(JSON.stringify(v));
                    retData.push(record);
                    retData[retData.length - 1].totalConsumption = 0;
                    v.downLinesRawCommissionDetail.forEach(v2=>{
                        retData[retData.length - 1].totalConsumption += v2.consumptionDetail.validAmount;
                    });

                    retData[retData.length - 1].groupCommissions = {};
                    v.rawCommissions.forEach(v2=>{
                        retData[retData.length - 1].groupCommissions[v2.groupName] = v2.amount;
                    });
                } else {
                    v.rawCommissions.forEach(v2=>{
                        retData[filterDataIndex].groupCommissions[v2.groupName] += v2.amount;
                    });
                    v.downLinesRawCommissionDetail.forEach(v2=>{
                        retData[filterDataIndex].totalConsumption += v2.consumptionDetail.validAmount;
                    });
                    retData[filterDataIndex].totalPlatformFee += v.totalPlatformFee;
                    retData[filterDataIndex].totalReward += v.totalReward;
                    retData[filterDataIndex].totalRewardFee += v.totalRewardFee;
                    retData[filterDataIndex].totalTopUp += v.totalTopUp;
                    retData[filterDataIndex].totalTopUpFee += v.totalTopUpFee;
                    retData[filterDataIndex].totalWithdrawal += v.totalWithdrawal;
                    retData[filterDataIndex].totalWithdrawalFee += v.totalWithdrawalFee;
                    retData[filterDataIndex].nettCommission += v.nettCommission;
                }
            });

            let sortKey = sortCol[Object.keys(sortCol)[0]];
            retData.sort(function(a,b){
                if(a[sortKey] < b[sortKey]) {
                    return sortCol[sortKey];
                } else if(a[sortKey] > b[sortKey]) {
                    return -sortCol[sortKey];
                } else {
                    return 0;
                }
            });
            retData = retData.splice(index, limit);
            return {count: data[0], data: retData};
        })
    },

    getCommissionRate: (platformId, partnerId, commissionType) => {
        let platformObj;
        let partnerObj;

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;
                    if (partnerId) {
                        return dbconfig.collection_partner.findOne({
                            platform: platformObj._id,
                            partnerId: partnerId
                        }).lean();
                    } else {
                        return Promise.resolve(true);
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;
                    let commissionQuery = {
                        platform: platformObj._id,
                        commissionType: commissionType
                    };

                    if (!partnerObj._id) {
                        commissionQuery.partner = {$exists: false};
                    } else {
                        commissionQuery.$or = [{'partner': {$exists: false}},{'partner': partnerObj._id}];
                    }

                    return dbconfig.collection_partnerCommissionConfig.find(commissionQuery)
                        .populate({
                        path: "provider",
                        model: dbconfig.collection_gameProviderGroup
                    }).lean();

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            commissionData => {
                if (commissionData) {
                    let returnData = [];
                    if (partnerObj._id) {
                        let customCommission = [];
                        let oriCommission = [];
                        for (let i = 0; i < commissionData.length; i++) {
                            if (commissionData[i].partner) {
                                customCommission.push(commissionData[i]);
                            } else {
                                oriCommission.push(commissionData[i]);
                            }
                        }

                        for (let j = 0; j < oriCommission.length ; j++) {
                            for (let k = customCommission.length - 1; k >= 0; k--) {
                                if (customCommission[k].provider && oriCommission[j].provider && customCommission[k].provider._id.toString() == oriCommission[j].provider._id.toString()) {
                                    oriCommission[j].commissionSetting.forEach(ori => {
                                        customCommission[k].commissionSetting.forEach(cus => {
                                            if (cus.playerConsumptionAmountFrom === ori.playerConsumptionAmountFrom
                                                && cus.playerConsumptionAmountTo === ori.playerConsumptionAmountTo
                                                && cus.activePlayerValueFrom === ori.activePlayerValueFrom
                                                && cus.activePlayerValueTo === ori.activePlayerValueTo
                                                && Number(cus.commissionRate) !== Number(ori.commissionRate)
                                            ) {
                                                ori.customizedCommissionRate = cus.commissionRate;
                                            }
                                        });
                                    });
                                    customCommission.splice(k,1);
                                }
                            }
                            oriCommission[j].commissionSetting.forEach(ori => {
                                if(ori){
                                    if (ori.activePlayerValueTo == null) {
                                        ori.activePlayerValueTo = "-";
                                    }
                                    if (ori.playerConsumptionAmountTo == null) {
                                        ori.playerConsumptionAmountTo = "-";
                                    }
                                    if (!ori.hasOwnProperty("defaultCommissionRate")) {
                                        ori.defaultCommissionRate = ori.commissionRate;
                                        delete ori.commissionRate;
                                    }
                                }
                            })
                            if(oriCommission[j].provider){
                                let commissionObj = {
                                    providerGroupId: oriCommission[j].provider && oriCommission[j].provider.hasOwnProperty("providerGroupId") ? oriCommission[j].provider.providerGroupId : "",
                                    providerGroupName: oriCommission[j].provider.name ? oriCommission[j].provider.name : "",
                                    list: oriCommission[j].commissionSetting
                                };
                                returnData.push(commissionObj);
                            }
                        }
                    } else {
                        for (let i = 0; i < commissionData.length; i++) {
                            if (commissionData[i].provider) {
                                let commissionObj = {
                                    providerGroupId: commissionData[i].provider && commissionData[i].provider.hasOwnProperty("providerGroupId") ? commissionData[i].provider.providerGroupId : "",
                                    providerGroupName: commissionData[i].provider && commissionData[i].provider.name ? commissionData[i].provider.name : ""
                                };
                                if (commissionData[i].commissionSetting && commissionData[i].commissionSetting.length) {
                                    for (let j = 0; j < commissionData[i].commissionSetting.length; j++) {
                                        if (commissionData[i].commissionSetting[j].activePlayerValueTo == null) {
                                            commissionData[i].commissionSetting[j].activePlayerValueTo = "-";
                                        }
                                        if (commissionData[i].commissionSetting[j].playerConsumptionAmountTo == null) {
                                            commissionData[i].commissionSetting[j].playerConsumptionAmountTo = "-";
                                        }
                                        commissionData[i].commissionSetting[j].defaultCommissionRate = commissionData[i].commissionSetting[j].commissionRate;
                                        delete commissionData[i].commissionSetting[j].commissionRate;
                                    }
                                    commissionObj.list = commissionData[i].commissionSetting;
                                }
                                returnData.push(commissionObj);
                            }
                        }
                    }
                    return returnData;
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find commission rate"});
                }
            }
        )
    },

    getPartnerFeeRate: (platformId, partnerId) => {
        let platformObj;
        let partnerObj;

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;
                    if (partnerId) {
                        return dbconfig.collection_partner.findOne({
                            platform: platformObj._id,
                            partnerId: partnerId
                        }).lean();
                    } else {
                        return Promise.resolve(true);
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;
                    let partnerFeeQuery = {
                        platform: platformObj._id,
                        partner: {$exists: false}
                    };

                    return dbconfig.collection_partnerCommissionRateConfig.find(partnerFeeQuery)
                        .populate({
                            path: "rateAfterRebateGameProviderGroup.gameProviderGroupId",
                            model: dbconfig.collection_gameProviderGroup
                        }).lean();

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            partnerFeeData => {
                if (partnerFeeData) {
                    let returnData = [];
                    function buildDefaultRateData() {
                        for (let i = 0; i < partnerFeeData.length; i++) {
                            let feeObj = {
                                defaultPromoRate: partnerFeeData[i].rateAfterRebatePromo,
                                defaultPlatformRate: partnerFeeData[i].rateAfterRebatePlatform,
                                defaultTotalDepositRate: partnerFeeData[i].rateAfterRebateTotalDeposit,
                                defaultTotalWithdrawalRate: partnerFeeData[i].rateAfterRebateTotalWithdrawal,
                                list: []
                            }
                            for (let j = 0; j < partnerFeeData[i].rateAfterRebateGameProviderGroup.length; j++) {
                                let providerGroupRate = partnerFeeData[i].rateAfterRebateGameProviderGroup[j];
                                let feeObjList = {
                                    providerGroupId: providerGroupRate.gameProviderGroupId && providerGroupRate.gameProviderGroupId.providerGroupId ? providerGroupRate.gameProviderGroupId.providerGroupId: "",
                                    providerGroupName: providerGroupRate.name,
                                    defaultRate: providerGroupRate.rate,
                                }
                                feeObj.list.push(feeObjList);
                            }
                            returnData.push(feeObj);
                        }
                    }
                    if (partnerObj._id) {
                        // let customFee = [];
                        let oriFee = partnerFeeData;

                        let partnerFeeQuery = {
                            platform: platformObj._id,
                            partner: partnerObj._id
                        };
                        return dbconfig.collection_partnerCommissionRateConfig.find(partnerFeeQuery).lean().then(
                                customFeeData => {
                                    if (customFeeData && customFeeData.length) {
                                        for (let i = 0; i < partnerFeeData.length; i++) {
                                            let feeObj = {
                                                defaultPromoRate: partnerFeeData[i].rateAfterRebatePromo,
                                                defaultPlatformRate: partnerFeeData[i].rateAfterRebatePlatform,
                                                defaultTotalDepositRate: partnerFeeData[i].rateAfterRebateTotalDeposit,
                                                defaultTotalWithdrawalRate: partnerFeeData[i].rateAfterRebateTotalWithdrawal,
                                                list: []
                                            };
                                            for (let j = customFeeData.length - 1; j >= 0; j--) {
                                                if (partnerFeeData[i].platform.toString() == customFeeData[j].platform.toString()) {
                                                    if (partnerFeeData[i].rateAfterRebatePromo != customFeeData[j].rateAfterRebatePromo) {
                                                        feeObj.customizedPromoRate = customFeeData[j].rateAfterRebatePromo;
                                                    }
                                                    if (partnerFeeData[i].rateAfterRebatePlatform != customFeeData[j].rateAfterRebatePlatform) {
                                                        feeObj.customizedPlatformRate = customFeeData[j].rateAfterRebatePlatform;
                                                    }
                                                    if (partnerFeeData[i].rateAfterRebateTotalDeposit != customFeeData[j].rateAfterRebateTotalDeposit) {
                                                        feeObj.customizedTotalDepositRate = customFeeData[j].rateAfterRebateTotalDeposit;
                                                    }
                                                    if (partnerFeeData[i].rateAfterRebateTotalWithdrawal != customFeeData[j].rateAfterRebateTotalWithdrawal) {
                                                        feeObj.customizedTotalWithdrawalRate = customFeeData[j].rateAfterRebateTotalWithdrawal;
                                                    }
                                                    if (partnerFeeData[i].rateAfterRebateGameProviderGroup) {
                                                        partnerFeeData[i].rateAfterRebateGameProviderGroup.forEach(ori => {
                                                            let feeObjList = {
                                                                providerGroupId: ori.gameProviderGroupId && ori.gameProviderGroupId.providerGroupId ? ori.gameProviderGroupId.providerGroupId : "",
                                                                providerGroupName: ori.name,
                                                                defaultRate: ori.rate,
                                                            }
                                                            if (customFeeData[j].rateAfterRebateGameProviderGroup) {
                                                                customFeeData[j].rateAfterRebateGameProviderGroup.forEach(cus => {
                                                                    if (ori.gameProviderGroupId && ori.gameProviderGroupId._id && cus.gameProviderGroupId
                                                                        && ori.gameProviderGroupId._id.toString() == cus.gameProviderGroupId.toString()
                                                                        && ori.rate != cus.rate) {
                                                                        feeObjList.customizedRate = cus.rate;
                                                                    }
                                                                });
                                                            }
                                                            feeObj.list.push(feeObjList);
                                                        });
                                                    }
                                                }
                                            }
                                            if (partnerFeeData[i].rateAfterRebateGameProviderGroup && partnerFeeData[i].rateAfterRebateGameProviderGroup.length && !feeObj.list.length) {
                                                partnerFeeData[i].rateAfterRebateGameProviderGroup.forEach(ori => {
                                                    let feeObjList = {
                                                        providerGroupId: ori.gameProviderGroupId && ori.gameProviderGroupId.providerGroupId ? ori.gameProviderGroupId.providerGroupId : "",
                                                        providerGroupName: ori.name,
                                                        defaultRate: ori.rate,
                                                    }
                                                    feeObj.list.push(feeObjList);
                                                });
                                            }
                                            returnData.push(feeObj);
                                        }
                                    } else {
                                        buildDefaultRateData();
                                    }
                                    return returnData;
                                }
                            );
                    } else {
                        buildDefaultRateData();
                        return returnData;
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find partner fee rate"});
                }
            }
        )
    },

    settlePartnersBillBoard: function (playerObjIds, type, startTime, endTime) {
        let proms = [];
        if (type == "totalTopUp") {
            playerObjIds.map(playerObjId => {
                let prom;
                prom = dbconfig.collection_playerTopUpRecord.aggregate([
                    {
                        "$match": {
                            "playerId": ObjectId(playerObjId),
                            "createTime": {
                                "$gte": new Date(startTime),
                                "$lte": new Date(endTime)
                            }
                        }
                    },
                    {
                        "$group": {
                            "_id": "$playerId",
                            "amount": {"$sum": "$amount"}
                        }
                    }
                ]).read("secondaryPreferred");

                proms.push(prom);
            });
        } else if (type == "totalConsumption") {
            playerObjIds.map(playerObjId => {
                let prom;
                prom = dbconfig.collection_playerConsumptionRecord.aggregate([
                    {
                        "$match": {
                            "playerId": ObjectId(playerObjId),
                            "createTime": {
                                "$gte": new Date(startTime),
                                "$lte": new Date(endTime)
                            }
                        }
                    },
                    {
                        "$group": {
                            "_id": "$playerId",
                            "amount": {"$sum": "$validAmount"}
                        }
                    }
                ]).read("secondaryPreferred");

                proms.push(prom);
            });
        } else if (type == "totalProfit") {
            playerObjIds.map(playerObjId => {
                let prom;
                prom = dbconfig.collection_proposal.aggregate([
                    {
                        "$match": {
                            "data.playerObjId": ObjectId(playerObjId),
                            "createTime": {
                                "$gte": new Date(startTime),
                                "$lte": new Date(endTime)
                            },
                            "mainType": "PlayerBonus",
                            "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                        }
                    },
                    {
                        "$group": {
                            "_id": "$data.playerObjId",
                            "amount": {"$sum": "$data.amount"}
                        }
                    }
                ]).read("secondaryPreferred");

                proms.push(prom);
            });
        }

        return Promise.all(proms);
    },

    settlePartnersActivePlayer: function (players, platformId, startTime, endTime, periodCheck) {
        let proms = [];
        return getRelevantActivePlayerRequirement(platformId, periodCheck).then(
            activePlayerRequirement => {
                players.map(player => {
                    let prom;
                    prom = getActivePlayerInfo(player, startTime, endTime, activePlayerRequirement);

                    proms.push(prom);
                });
                return Promise.all(proms);
            }
        );
    },

    getPartnerBillBoard: function (platformId, periodCheck, recordCount, partnerId, mode) {
        let prom;
        let recordDate;
        let returnData = {};
        let playerDataField;
        let totalRecord = recordCount || 10; //default 10 record
        let platformObj;
        let partnerObj;

        prom = dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData && platformData._id) {
                    platformObj = platformData;
                    if (partnerId) {
                        return dbconfig.collection_partner.findOne({partnerId: partnerId, platform: platformObj._id}).lean().then(
                            partnerData => {
                                if (partnerData && partnerData._id) {
                                    partnerObj = partnerData;
                                    if (partnerObj && partnerObj.partnerName) {
                                        partnerObj.partnerName = censoredPlayerName(partnerObj.partnerName);
                                    }
                                    return partnerData;
                                } else {
                                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                                }
                            }
                        )
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        );

        return prom.then(
            () => {
                if (periodCheck == constPartnerBillBoardPeriod.DAILY) {
                    recordDate = dbutility.getTodaySGTime();
                } else if (periodCheck == constPartnerBillBoardPeriod.WEEKLY) {
                    recordDate = dbutility.getCurrentWeekSGTime();
                }  else if (periodCheck == constPartnerBillBoardPeriod.BIWEEKLY) {
                    recordDate = dbutility.getCurrentBiWeekSGTIme();
                } else if (periodCheck == constPartnerBillBoardPeriod.MONTHLY) {
                    recordDate = dbutility.getCurrentMonthSGTIme();
                } else if (periodCheck == constPartnerBillBoardPeriod.NO_PERIOD) {

                } else {
                    return Promise.reject({name: "DataError", message: "Invalid period"});
                }

                if (mode == constPartnerBillBoardMode.CREW_DEPOSIT_ALL) {
                    if (periodCheck == constPartnerBillBoardPeriod.NO_PERIOD) {
                        playerDataField = "topUpSum";
                        return billBoardAmtRankingNoPeriod(platformObj, partnerObj, totalRecord, "allCrewDeposit", -1, playerDataField); // no period: find data in player's schema
                    } else {
                        return billBoardAmtRanking(platformObj, partnerObj, recordDate, totalRecord, "allCrewDeposit");
                    }

                } else if (mode == constPartnerBillBoardMode.CREW_VALIDBET_ALL) {
                    if (periodCheck == constPartnerBillBoardPeriod.NO_PERIOD) {
                        playerDataField = "consumptionSum";
                        return billBoardAmtRankingNoPeriod(platformObj, partnerObj, totalRecord, "allCrewValidBet", -1, playerDataField); // no period: find data in player's schema
                    } else {
                        return billBoardAmtRanking(platformObj, partnerObj, recordDate, totalRecord, "allCrewValidBet");
                    }

                } else if (mode == constPartnerBillBoardMode.CREW_PROFIT_ALL) {
                    if (periodCheck == constPartnerBillBoardPeriod.NO_PERIOD) {
                        playerDataField = "bonusAmountSum";
                        return billBoardAmtRankingNoPeriod(platformObj, partnerObj, totalRecord, "allCrewProfit", 1, playerDataField); // no period: find data in player's schema
                    } else {
                        return billBoardAmtRanking(platformObj, partnerObj, recordDate, totalRecord, "allCrewProfit", true);
                    }

                } else if (mode == constPartnerBillBoardMode.CREW_COUNT_ALL) {
                    let partnerRanking;
                    returnData["allCrewHeadCount"] = {};
                    returnData["allCrewHeadCount"].boardRanking = [];

                    let playerMatchQuery = {
                        $match: {
                            $and: [
                                {partner: {$exists: true}},
                                {partner: {$ne: null}}
                            ],
                            platform: platformObj._id,
                        }
                    };
                    if (periodCheck != constPartnerBillBoardPeriod.NO_PERIOD) {
                        playerMatchQuery.$match.registrationTime = {
                            "$gte": new Date(recordDate.startTime),
                            "$lte": new Date(recordDate.endTime)
                        }
                    }
                    return dbconfig.collection_players.aggregate([
                        playerMatchQuery,
                        {
                            $group: {
                                "_id": "$partner",
                                "count": {"$sum": 1}
                            }
                        },
                        {
                            $sort: {
                                "count": -1
                            }
                        }
                    ]).then(
                        playerData => {
                            if (playerData && playerData.length) {
                                for (let i = 0; i < playerData.length; i++) {
                                    playerData[i].rank = i + 1;
                                    if (playerData[i].createTime) {
                                        delete playerData[i].createTime;
                                    }
                                    if (partnerObj && partnerObj._id && playerData[i]._id.toString() == partnerObj._id.toString()) {
                                        delete playerData[i]._id;
                                        playerData[i].name = partnerObj.partnerName ? partnerObj.partnerName : " ";
                                        partnerRanking = playerData[i];
                                    }
                                }
                                if (playerData.length > totalRecord) {
                                    playerData.length = totalRecord;
                                }

                                return dbconfig.collection_partner.populate(playerData, {
                                    path: '_id',
                                    model: dbconfig.collection_partner,
                                    select: "partnerName"
                                }).then(
                                    populatedData => {
                                        for (let i = 0; i < populatedData.length; i++) {
                                            if (populatedData[i]._id && populatedData[i]._id.partnerName) {
                                                populatedData[i].name = censoredPlayerName(populatedData[i]._id.partnerName);
                                                delete populatedData[i]._id;
                                            }
                                        }
                                        if (partnerObj) {
                                            returnData["allCrewHeadCount"].partnerRanking = {};
                                            if (partnerRanking) {
                                                returnData["allCrewHeadCount"].partnerRanking = partnerRanking;
                                            } else {
                                                returnData["allCrewHeadCount"].partnerRanking.error = "No record for this partner";
                                            }
                                        }

                                        returnData["allCrewHeadCount"].boardRanking = populatedData;
                                        return returnData;
                                    }
                                );

                            } else {
                                return returnData;
                            }
                        }
                    )


                } else if (mode == constPartnerBillBoardMode.CREW_COUNT_ACTIVE) {
                    if (periodCheck == constPartnerBillBoardPeriod.NO_PERIOD) {
                        return Promise.reject({name: "DataError", message: "Invalid period"});
                    }
                    let allPlayerObj = [];
                    let stream = dbconfig.collection_players.find({
                        $and: [
                            {partner: {$exists: true}},
                            {partner: {$ne: null}}
                        ],
                        platform: platformObj._id
                    }, {partner: 1}).cursor({batchSize: 100});
                    let balancer = new SettlementBalancer();
                    var res = [];
                    return balancer.initConns().then(function () {
                        return Q(
                            balancer.processStream(
                                {
                                    stream: stream,
                                    batchSize: constSystemParam.BATCH_SIZE,
                                    makeRequest: function (playerIdObjs, request) {
                                        allPlayerObj = allPlayerObj.concat(playerIdObjs);
                                        request("player", "settlePartnersActivePlayer", {
                                            players: playerIdObjs,
                                            platformId: platformObj._id,
                                            periodCheck: periodCheck,
                                            startTime: recordDate.startTime,
                                            endTime: recordDate.endTime
                                        });
                                    },
                                    processResponse: function (record) {
                                        res = res.concat(record.data);
                                    }
                                }
                            )
                        );
                    }).then(
                        () => {
                            let partnerAmtObj = {};
                            let rankingArr = [];
                            let partnerRanking;
                            returnData["activeCrewHeadCount"] = {};
                            returnData["activeCrewHeadCount"].boardRanking = [];

                            for (let i = 0; i < res.length; i++) {
                                if (!partnerAmtObj[res[i].partner.toString()]) {
                                    partnerAmtObj[res[i].partner.toString()] = {
                                        partner: res[i].partner,
                                        count: res[i].active? 1: 0
                                    }
                                } else {
                                    if (res[i].active) {
                                        partnerAmtObj[res[i].partner.toString()].count += 1;
                                    }
                                }
                            }

                            for (let l = 0; l < Object.keys(partnerAmtObj).length; l++) {
                                rankingArr.push(partnerAmtObj[Object.keys(partnerAmtObj)[l]]);
                            }

                            function sortRankingRecord(a, b) {
                                if (a.count < b.count) {
                                    return 1;
                                }
                                if (a.count > b.count) {
                                    return -1;
                                }
                                if (a.count == b.count) {
                                    if (a.partner && b.partner) {
                                        if (a.partner.toString() < b.partner.toString()) {
                                            return -1;
                                        }
                                        if (a.partner.toString() > b.partner.toString()) {
                                            return 1;
                                        }
                                    }
                                }
                                return 0;
                            }

                            let sortedData = rankingArr.sort(sortRankingRecord);
                            for (let i = 0; i < sortedData.length; i++) {
                                sortedData[i].rank = i + 1;
                                if (partnerObj && partnerObj._id && sortedData[i].partner.toString() == partnerObj._id.toString()) {
                                    delete sortedData[i].partner;
                                    sortedData[i].name = partnerObj.partnerName? partnerObj.partnerName: " ";
                                    partnerRanking = sortedData[i];
                                }
                            }
                            if (sortedData.length > totalRecord) {
                                sortedData.length = totalRecord;
                            }

                            if (sortedData && sortedData.length) {
                                return dbconfig.collection_partner.populate(sortedData, {
                                    path: 'partner',
                                    model: dbconfig.collection_partner,
                                    select: "partnerName"
                                }).then(
                                    populatedData => {
                                        for (let i = 0; i < populatedData.length; i++) {
                                            if (populatedData[i].partner && populatedData[i].partner.partnerName) {
                                                populatedData[i].name = censoredPlayerName(populatedData[i].partner.partnerName);
                                                delete populatedData[i].partner;
                                            }
                                        }
                                        if (partnerObj) {
                                            returnData["activeCrewHeadCount"].partnerRanking = {};
                                            if (partnerRanking) {
                                                returnData["activeCrewHeadCount"].partnerRanking = partnerRanking;
                                            } else {
                                                returnData["activeCrewHeadCount"].partnerRanking.error = "No record for this partner";
                                            }
                                        }

                                        returnData["activeCrewHeadCount"].boardRanking = populatedData;
                                        return returnData;
                                    }
                                );
                            } else {
                                return returnData;
                            }
                        }
                    )

                } else if (mode == constPartnerBillBoardMode.PARTNER_COMMISSION) {
                    return dbconfig.collection_proposalType.findOne({
                        name: constProposalType.SETTLE_PARTNER_COMMISSION,
                        platformId: platformObj._id
                    }).lean().then(
                        proposalTypeData => {
                            if (proposalTypeData && proposalTypeData._id) {
                                let partnerRanking;
                                returnData["totalcommission"] = {};
                                returnData["totalcommission"].boardRanking = [];

                                let proposalMatchQuery = {
                                    $match: {
                                        "data.platformObjId": platformObj._id,
                                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                        "type": proposalTypeData._id
                                    }
                                };
                                if (periodCheck != constPartnerBillBoardPeriod.NO_PERIOD) {
                                    proposalMatchQuery.$match.createTime = {
                                        "$gte": new Date(recordDate.startTime),
                                        "$lte": new Date(recordDate.endTime)
                                    }
                                }

                                return dbconfig.collection_proposal.aggregate([
                                    proposalMatchQuery,
                                    {
                                        $group: {
                                            "_id": "$data.partnerObjId",
                                            "amount": {"$sum": "$data.amount"}
                                        }
                                    },
                                    {
                                        $sort: {
                                            "amount": -1
                                        }
                                    }
                                ]).read("secondaryPreferred").then(
                                    partnerData => {
                                        if (partnerData && partnerData.length) {
                                            for (let i = 0; i < partnerData.length; i++) {
                                                partnerData[i].rank = i + 1;
                                                if (partnerObj && partnerObj._id && partnerData[i]._id.toString() == partnerObj._id.toString()) {
                                                    delete partnerData[i]._id;
                                                    partnerData[i].name = partnerObj.partnerName ? partnerObj.partnerName : " ";
                                                    partnerRanking = partnerData[i];
                                                }
                                            }
                                            if (partnerData.length > totalRecord) {
                                                partnerData.length = totalRecord;
                                            }

                                            return dbconfig.collection_partner.populate(partnerData, {
                                                path: '_id',
                                                model: dbconfig.collection_partner,
                                                select: "partnerName"
                                            }).then(
                                                populatedData => {
                                                    for (let i = 0; i < populatedData.length; i++) {
                                                        if (populatedData[i]._id && populatedData[i]._id.partnerName) {
                                                            populatedData[i].name = censoredPlayerName(populatedData[i]._id.partnerName);
                                                            delete populatedData[i]._id;
                                                        }
                                                    }
                                                    if (partnerObj) {
                                                        returnData["totalcommission"].partnerRanking = {};
                                                        if (partnerRanking) {
                                                            returnData["totalcommission"].partnerRanking = partnerRanking;
                                                        } else {
                                                            returnData["totalcommission"].partnerRanking.error = "No record for this partner";
                                                        }
                                                    }

                                                    returnData["totalcommission"].boardRanking = populatedData;
                                                    return returnData;
                                                }
                                            );

                                        } else {
                                            return returnData;
                                        }
                                    }
                                )
                            } else {
                                return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                            }
                        }
                    );
                } else {
                    return Promise.reject({name: "DataError", message: "Invalid ranking mode"});
                }
            }
        )
    },

    getCrewActiveInfo: (platformId, partnerId, periodCycle, circleTimes, startDate, endDate, needsDetail= true, detailCircle = 0, startIndex = 0, count = 10) => {
        if (!circleTimes && !(periodCycle == 1 && startDate && endDate)) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId, null, null).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                return getRelevantActivePlayerRequirement(platform._id, periodCycle);
            }
        ).then(
            activePlayerRequirement => {
                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];
                let prom;
                let detailCircleCount = 0;

                if(periodCycle == 1 && !circleTimes){
                    startDate = new Date(startDate);
                    endDate = new Date(endDate);

                    for(let i = endDate; i >= startDate; i.setDate(i.getDate() - 1)){
                        let startTime = dbUtil.getDayStartTime(new Date(i));
                        let endTime = dbUtil.getDayStartTime(new Date(startTime));
                        endTime.setDate(startTime.getDate() + 1);

                        if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, activePlayerRequirement, null, needsDetail, "getCrewActiveInfo", platformId, partnerId).then(
                            playerActiveDetails => {
                                if(playerActiveDetails && playerActiveDetails.length > 1){
                                    let activePlayerSummary = playerActiveDetails[0];
                                    let relevantCrews = playerActiveDetails[1];
                                    let isNeedDetails = needsDetail;
                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(player => player.active);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    return {
                                        date: startTime,
                                        activeCrewNumbers: activePlayerSummary.totalActiveCrew || 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        activeCrewNumbers: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );

                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }else {
                    for (let i = 0; i < circleTimes; i++) {
                        let startTime = new Date(nextPeriod.startTime);
                        let endTime = new Date(nextPeriod.endTime);

                        if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, activePlayerRequirement, null, needsDetail, "getCrewActiveInfo", platformId, partnerId).then(
                            playerActiveDetails => {
                                if(playerActiveDetails && playerActiveDetails.length > 1){
                                    let activePlayerSummary = playerActiveDetails[0];
                                    let relevantCrews = playerActiveDetails[1];
                                    let isNeedDetails = needsDetail;

                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(player => player.active);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    return {
                                        date: startTime,
                                        activeCrewNumbers: activePlayerSummary.totalActiveCrew || 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        activeCrewNumbers: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );

                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }
                return Promise.all(outputProms);
            }
        );
    },

    getCrewDepositInfo: (platformId, partnerId, periodCycle, circleTimes, playerId, startDate, endDate, crewAccount, needsDetail= true, detailCircle = 0, startIndex = 0, count = 10) => {
        if (!circleTimes && !(periodCycle == 1 && startDate && endDate)) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId, playerId, crewAccount).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];
                let prom;
                let detailCircleCount = 0;

                if(periodCycle == 1 && !circleTimes){
                    startDate = new Date(startDate);
                    endDate = new Date(endDate);

                    for(let i = endDate; i >= startDate; i.setDate(i.getDate() - 1)){
                        let startTime = dbUtil.getDayStartTime(new Date(i));
                        let endTime = dbUtil.getDayStartTime(new Date(startTime));
                        endTime.setDate(startTime.getDate() + 1);

                        if(playerId || crewAccount) {
                            needsDetail = true;
                        }else if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, null, null, needsDetail, "getCrewDepositInfo", platformId, partnerId).then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let topUpSummary = playerDetails[0];
                                    let relevantCrews = playerDetails[1];
                                    let isNeedDetails = needsDetail;

                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(crew => crew.depositAmount);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    if((playerId || crewAccount) && relevantCrews.length <= 0){
                                        relevantCrews = playerDetails[1];
                                    }

                                    return {
                                        date: startTime,
                                        depositCrewNumbers: topUpSummary && topUpSummary.totalDepositCrew ? topUpSummary.totalDepositCrew : 0,
                                        totalDepositAmount: topUpSummary && topUpSummary.totalDepositAmount ? topUpSummary.totalDepositAmount : 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        depositCrewNumbers: 0,
                                        totalDepositAmount: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );

                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }else{
                    for (let i = 0; i < circleTimes; i++) {
                        let startTime = new Date(nextPeriod.startTime);
                        let endTime = new Date(nextPeriod.endTime);

                        if(playerId || crewAccount) {
                            needsDetail = true;
                        }else if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, null, null, needsDetail, "getCrewDepositInfo", platformId, partnerId).then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let topUpSummary = playerDetails[0];
                                    let relevantCrews = playerDetails[1];
                                    let isNeedDetails = needsDetail;

                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(crew => crew.depositAmount);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    if((playerId || crewAccount) && relevantCrews.length <= 0){
                                        relevantCrews = playerDetails[1];
                                    }

                                    return {
                                        date: startTime,
                                        depositCrewNumbers: topUpSummary && topUpSummary.totalDepositCrew ? topUpSummary.totalDepositCrew : 0,
                                        totalDepositAmount: topUpSummary && topUpSummary.totalDepositAmount ? topUpSummary.totalDepositAmount : 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        depositCrewNumbers: 0,
                                        totalDepositAmount: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );

                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }

                return Promise.all(outputProms);
            }
        );
    },

    getCrewWithdrawInfo: (platformId, partnerId, periodCycle, circleTimes, playerId, startDate, endDate, crewAccount, needsDetail= true, detailCircle = 0, startIndex = 0, count = 10) => {
        if (!circleTimes && !(periodCycle == 1 && startDate && endDate)) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId, playerId, crewAccount).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];
                let prom;
                let detailCircleCount = 0;

                if(periodCycle == 1 && !circleTimes){
                    startDate = new Date(startDate);
                    endDate = new Date(endDate);

                    for(let i = endDate; i >= startDate; i.setDate(i.getDate() - 1)){
                        let startTime = dbUtil.getDayStartTime(new Date(i));
                        let endTime = dbUtil.getDayStartTime(new Date(startTime));
                        endTime.setDate(startTime.getDate() + 1);

                        if(playerId || crewAccount) {
                            needsDetail = true;
                        }else if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, null, null, needsDetail, "getCrewWithdrawInfo", platformId, partnerId).then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let withdrawalSummary = playerDetails[0];
                                    let relevantCrews = playerDetails[1];
                                    let isNeedDetails = needsDetail;

                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(crew => crew.withdrawAmount);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    if((playerId || crewAccount) && relevantCrews.length <= 0){
                                        relevantCrews = playerDetails[1];
                                    }

                                    return {
                                        date: startTime,
                                        withdrawCrewNumbers: withdrawalSummary && withdrawalSummary.totalWithdrawCrew ? withdrawalSummary.totalWithdrawCrew : 0,
                                        totalWithdrawAmount: withdrawalSummary && withdrawalSummary.totalWithdrawAmount ? withdrawalSummary.totalWithdrawAmount : 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        withdrawCrewNumbers: 0,
                                        totalWithdrawAmount: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );
                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }else {
                    for (let i = 0; i < circleTimes; i++) {
                        let startTime = new Date(nextPeriod.startTime);
                        let endTime = new Date(nextPeriod.endTime);

                        if(playerId || crewAccount) {
                            needsDetail = true;
                        }else if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, null, null, needsDetail, "getCrewWithdrawInfo", platformId, partnerId).then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let withdrawalSummary = playerDetails[0];
                                    let relevantCrews = playerDetails[1];
                                    let isNeedDetails = needsDetail;

                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(crew => crew.withdrawAmount);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    if((playerId || crewAccount) && relevantCrews.length <= 0){
                                        relevantCrews = playerDetails[1];
                                    }

                                    return {
                                        date: startTime,
                                        withdrawCrewNumbers: withdrawalSummary && withdrawalSummary.totalWithdrawCrew ? withdrawalSummary.totalWithdrawCrew : 0,
                                        totalWithdrawAmount: withdrawalSummary && withdrawalSummary.totalWithdrawAmount ? withdrawalSummary.totalWithdrawAmount : 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        withdrawCrewNumbers: 0,
                                        totalWithdrawAmount: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );
                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }
                return Promise.all(outputProms);
            }
        );
    },

    checkAllCrewDetail: (platformId, partnerId, playerId, crewAccount, singleSearchMode, sortMode, startTime, endTime, startIndex, count) => {
        let index = startIndex || 0;
        let limit = count || 100;
        let platformObj;
        let totalDownLines = 0;
        singleSearchMode = singleSearchMode? singleSearchMode: "0"; // "0" search whole word, "1" fuzzy search

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!(platformData && platformData._id)) {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
                platformObj = platformData;
                return dbconfig.collection_partner.findOne({partnerId: partnerId, platform: platformData._id}).lean();
            }
        ).then(
            partnerData => {
                if (!partnerData) {
                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                }

                if (!startTime) {
                    startTime = new Date(partnerData.registrationTime);
                } else {
                    startTime = new Date(startTime);
                }

                if (!endTime) {
                    endTime = new Date();
                } else {
                    endTime = new Date(endTime);
                }

                // Find crews
                return dbconfig.collection_players.find({
                    platform: platformObj._id,
                    partner: partnerData._id
                }, {_id: 1, name: 1, playerId: 1, registrationTime: 1, lastAccessTime: 1}).lean();
            }
        ).then(
            allDownLinesData => {
                let selectedDownLines = [];
                // totalDownLines = allDownLinesData && allDownLinesData.length? allDownLinesData.length: 0;
                if (playerId || crewAccount) {
                    let fieldName;
                    let compareData;
                    if (playerId) {
                        compareData = playerId;
                        fieldName = 'playerId';
                    } else {
                        compareData = crewAccount;
                        fieldName = 'name';
                    }
                    let isMatch = false;

                    if (singleSearchMode == "1" && crewAccount && !playerId) {
                        let accPattern = new RegExp("^" + crewAccount, "i")
                        for (let i = 0; i < allDownLinesData.length; i++) {
                            if (accPattern.test(allDownLinesData[i][fieldName])) {
                                isMatch = true;
                                selectedDownLines.push(allDownLinesData[i]);
                            }
                        }
                    } else  {
                        for (let i = 0; i < allDownLinesData.length; i++) {
                            if (String(compareData) == String(allDownLinesData[i][fieldName])) {
                                isMatch = true;
                                selectedDownLines = [allDownLinesData[i]];
                                break;
                            }
                        }
                    }

                    if (!isMatch) {
                        return Promise.reject({name: "DataError", message: "Cannot find this downline"});
                    }
                } else {
                    selectedDownLines = allDownLinesData;
                }

                totalDownLines = selectedDownLines && selectedDownLines.length? selectedDownLines.length: 0;

                return getCrewsDetail(selectedDownLines, startTime, endTime).then(
                    playerDetails => {
                        if (sortMode == constCrewDetailMode.TOP_UP) {
                            function sortRecord(a, b) {
                                if (a.depositAmount < b.depositAmount)
                                    return 1;
                                if (a.depositAmount > b.depositAmount)
                                    return -1;
                                return 0;
                            }
                            playerDetails = playerDetails.sort(sortRecord);

                        } else if (sortMode == constCrewDetailMode.WITHDRAWAL) {
                            function sortRecord(a, b) {
                                if (a.withdrawAmount < b.withdrawAmount)
                                    return 1;
                                if (a.withdrawAmount > b.withdrawAmount)
                                    return -1;
                                return 0;
                            }
                            playerDetails = playerDetails.sort(sortRecord);

                        } else if (sortMode == constCrewDetailMode.BET_BONUS ) {
                            function sortRecord(a, b) {
                                if (a.crewProfit < b.crewProfit)
                                    return -1;
                                if (a.crewProfit > b.crewProfit)
                                    return 1;
                                return 0;
                            }
                            playerDetails = playerDetails.sort(sortRecord);

                        } else if (sortMode == constCrewDetailMode.BET_VALID) {
                            function sortRecord(a, b) {
                                if (a.validBet < b.validBet)
                                    return 1;
                                if (a.validBet > b.validBet)
                                    return -1;
                                return 0;
                            }
                            playerDetails = playerDetails.sort(sortRecord);

                        } else {
                            return Promise.reject({name: "DataError", message: "Invalid sorting mode"});
                        }

                        if (index) {
                            playerDetails.splice(0,index);
                        }
                        if (limit && playerDetails.length && limit  < playerDetails.length) {
                            playerDetails.length = limit;
                        }

                        return {
                            startIndex: index,
                            totalCount: totalDownLines,
                            list: playerDetails
                        }
                    }
                );
            }
        )
    },

    getCrewBetInfo: (platformId, partnerId, periodCycle, circleTimes, providerGroupId, playerId, startDate, endDate, crewAccount, needsDetail= true, detailCircle = 0, startIndex = 0, count = 10) => {
        if (!circleTimes && !(periodCycle == 1 && startDate && endDate)) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];
        let providerGroup;

        return getPartnerCrewsData(platformId, partnerId, playerId, crewAccount).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                if (!providerGroupId) {
                    return Promise.resolve();
                }

                return dbconfig.collection_gameProviderGroup.findOne({providerGroupId}).lean();
            }
        ).then(
            providerGroupData => {
                providerGroup = providerGroupData;

                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];
                let providerGroups = providerGroup ? [providerGroup] : null;
                let prom;
                let detailCircleCount = 0;

                if(periodCycle == 1 && !circleTimes){
                    startDate = new Date(startDate);
                    endDate = new Date(endDate);

                    for(let i = endDate; i >= startDate; i.setDate(i.getDate() - 1)){
                        let startTime = dbUtil.getDayStartTime(new Date(i));
                        let endTime = dbUtil.getDayStartTime(new Date(startTime));
                        endTime.setDate(startTime.getDate() + 1);

                        if(playerId || crewAccount) {
                            needsDetail = true;
                        }else if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, null, providerGroups, needsDetail, "getCrewBetInfo", platformId, partnerId).then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let betSummary = playerDetails[0];
                                    let relevantCrews = playerDetails[1];
                                    let isNeedDetails = needsDetail;

                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(crew => crew.betCounts);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    if ((playerId || crewAccount) && relevantCrews.length <= 0) {
                                        relevantCrews = playerDetails[1];
                                    }

                                    return {
                                        date: startTime,
                                        betCrewNumbers: betSummary && betSummary.totalBetCrew ? betSummary.totalBetCrew : 0,
                                        totalValidBet: betSummary && betSummary.totalValidBet ? betSummary.totalValidBet : 0,
                                        totalCrewProfit: betSummary && betSummary.totalCrewProfit ? betSummary.totalCrewProfit : 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        betCrewNumbers: 0,
                                        totalValidBet: 0,
                                        totalCrewProfit: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );
                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }else {
                    for (let i = 0; i < circleTimes; i++) {
                        let startTime = new Date(nextPeriod.startTime);
                        let endTime = new Date(nextPeriod.endTime);

                        if(playerId || crewAccount) {
                            needsDetail = true;
                        }else if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(downLines, startTime, endTime, null, providerGroups, needsDetail, "getCrewBetInfo", platformId, partnerId).then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let betSummary = playerDetails[0];
                                    let relevantCrews = playerDetails[1];
                                    let isNeedDetails = needsDetail;

                                    if(relevantCrews && relevantCrews.length > 0){
                                        relevantCrews = relevantCrews.filter(crew => crew.betCounts);
                                        isNeedDetails = relevantCrews[0] && relevantCrews[0].needsDetail ||  needsDetail;
                                    }

                                    if ((playerId || crewAccount) && relevantCrews.length <= 0) {
                                        relevantCrews = playerDetails[1];
                                    }

                                    return {
                                        date: startTime,
                                        betCrewNumbers: betSummary && betSummary.totalBetCrew ? betSummary.totalBetCrew : 0,
                                        totalValidBet: betSummary && betSummary.totalValidBet ? betSummary.totalValidBet : 0,
                                        totalCrewProfit: betSummary && betSummary.totalCrewProfit ? betSummary.totalCrewProfit : 0,
                                        startIndex: startIndex,
                                        list: (isNeedDetails === true || isNeedDetails === "true") ? relevantCrews.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        betCrewNumbers: 0,
                                        totalValidBet: 0,
                                        totalCrewProfit: 0,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );
                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }
                return Promise.all(outputProms);
            }
        );
    },

    getNewCrewInfo: (platformId, partnerId, periodCycle, circleTimes, startDate, endDate, needsDetail= true, detailCircle = 0, startIndex = 0, count = 10) => {
        if (!circleTimes && !(periodCycle == 1 && startDate && endDate)) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId, null, null).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];
                let prom;
                let detailCircleCount = 0;

                if(periodCycle == 1 && !circleTimes){
                    startDate = new Date(startDate);
                    endDate = new Date(endDate);

                    for(let i = endDate; i > startDate; i.setDate(i.getDate() - 1)){
                        let startTime = dbUtil.getDayStartTime(new Date(i));
                        let endTime = dbUtil.getDayStartTime(new Date(startTime));
                        endTime.setDate(startTime.getDate() + 1);
                        let newDownLines = downLines.filter(player => player.registrationTime >= startTime && player.registrationTime <= endTime);

                        if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(newDownLines, startTime, endTime, null, null, needsDetail, "getNewCrewInfo").then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let relevantCrewDetails = playerDetails[1];
                                    return {
                                        date: startTime,
                                        newCrewNumbers: newDownLines.length,
                                        startIndex: startIndex,
                                        list: relevantCrewDetails && relevantCrewDetails.length > 0 && relevantCrewDetails[0].needsDetail
                                        && (relevantCrewDetails[0].needsDetail === true || relevantCrewDetails[0].needsDetail === "true")
                                        ? relevantCrewDetails.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        newCrewNumbers: newDownLines.length,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );
                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }else {
                    for (let i = 0; i < circleTimes; i++) {
                        let startTime = new Date(nextPeriod.startTime);
                        let endTime = new Date(nextPeriod.endTime);
                        let newDownLines = downLines.filter(player => player.registrationTime >= startTime && player.registrationTime <= endTime);

                        if((needsDetail === true || needsDetail === "true") && detailCircleCount <= detailCircle){
                            needsDetail = true;
                            detailCircleCount ++;
                        }else{
                            needsDetail = false;
                        }

                        prom = getCrewsInfo(newDownLines, startTime, endTime, null, null, needsDetail, "getNewCrewInfo").then(
                            playerDetails => {
                                if(playerDetails && playerDetails.length > 1){
                                    let relevantCrewDetails = playerDetails[1];
                                    return {
                                        date: startTime,
                                        newCrewNumbers: newDownLines.length,
                                        startIndex: startIndex,
                                        list: relevantCrewDetails && relevantCrewDetails.length > 0 && relevantCrewDetails[0].needsDetail
                                        && (relevantCrewDetails[0].needsDetail === true || relevantCrewDetails[0].needsDetail === "true")
                                            ? relevantCrewDetails.slice(startIndex, startIndex + count) : []
                                    }
                                }else{
                                    return {
                                        date: startTime,
                                        newCrewNumbers: newDownLines.length,
                                        startIndex: startIndex,
                                        list: []
                                    }
                                }
                            }
                        );
                        nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                        outputProms.push(prom);
                    }
                }
                return Promise.all(outputProms);
            }
        );
    },

    preditCommission: (platformId, partnerId, searchPreviousPeriod = 0) => {
        let platform = {};
        let partner = {};

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({
                        code: constServerCode.INVALID_PLATFORM,
                        name: "DataError",
                        message: "Cannot find platform"
                    });
                }

                platform = platformData;

                return dbconfig.collection_partner.findOne({platform: platform._id, partnerId: partnerId}).lean();
            }
        ).then(
            partnerData => {
                if (!partnerData) {
                    return Promise.reject({
                        code: constServerCode.PARTNER_NAME_INVALID,
                        name: "DataError",
                        message: "Cannot find partner"
                    });
                }

                partner = partnerData;
                let period = getCurrentCommissionPeriod(partner.commissionType);
                if (searchPreviousPeriod && !isNaN(Number(searchPreviousPeriod))) {
                    for (let i = 0; i < Number(searchPreviousPeriod); i++) {
                        period = getPreviousCommissionPeriod(partner.commissionType, period);
                    }
                }

                return dbPartner.calculatePartnerCommissionDetail(partner._id, partner.commissionType, new Date(period.startTime), new Date(period.endTime));
            }
        ).then(
            commissionDetail => {
                if (!commissionDetail) {
                    return false;
                }

                let output = {};

                output.activeCrewNumbers = commissionDetail.activeDownLines;
                output.totalDepositAmount = commissionDetail.totalTopUp;
                if (commissionDetail.depositCrewDetail) {
                    output.depositCrewDetail = commissionDetail.depositCrewDetail;
                }
                output.depositFeeRate = commissionDetail.topUpFeeRate;
                output.totalDepositFee = commissionDetail.totalTopUpFee;
                output.totalWithdrawAmount = commissionDetail.totalWithdrawal;
                if (commissionDetail.withdrawCrewDetail) {
                    output.withdrawCrewDetail = commissionDetail.withdrawCrewDetail;
                }
                output.withdrawFeeRate = commissionDetail.withdrawFeeRate;
                output.totalWithdrawalFee = commissionDetail.totalWithdrawalFee;
                output.totalBonusAmount = commissionDetail.totalReward;
                if (commissionDetail.bonusCrewDetail) {
                    output.bonusCrewDetail = commissionDetail.bonusCrewDetail;
                }
                output.bonusFeeRate = commissionDetail.rewardFeeRate;
                output.totalBonusFee = commissionDetail.totalRewardFee;
                output.totalProviderFee = commissionDetail.totalPlatformFee ? commissionDetail.totalPlatformFee : 0;
                // output.totalCommission = commissionDetail.nettCommission;
                output.totalCommission = 0;
                output.list = [];

                if (commissionDetail.rawCommissions && commissionDetail.rawCommissions.length) {
                    commissionDetail.rawCommissions.map(providerCommission => {
                        output.list.push({
                            providerGroupId: providerCommission.groupId,
                            providerGroupName: providerCommission.groupName,
                            providerGroupCommission: providerCommission.amount,
                            providerGroupFee: providerCommission.platformFee,
                            crewProfit: providerCommission.crewProfit,
                            crewProfitDetail: providerCommission.crewProfitDetail,
                            commissionRate: providerCommission.commissionRate ? providerCommission.commissionRate : 0,
                            providerGroupFeeRate: providerCommission.platformFeeRate ? providerCommission.platformFeeRate / 100 : 0
                        })
                        if (providerCommission.amount) {
                            output.totalCommission += providerCommission.amount;
                        }
                    })
                }

                return output;
            }
        )
    },

    getCommissionProposalList : (platformId, partnerId, startTime, endTime, status, searchProposalCounts)=> {
        let platformObj;
        let partnerObj;
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (!platformData) {
                    return Promise.reject({
                        code: constServerCode.INVALID_PLATFORM,
                        name: "DataError",
                        message: "Cannot find platform"
                    });
                }

                platformObj = platformData;

                return dbconfig.collection_partner.findOne({platform: platformObj._id, partnerId: partnerId}).lean();
            }
        ).then(
            partnerData => {
                if (!partnerData) {
                    return Promise.reject({
                        code: constServerCode.PARTNER_NAME_INVALID,
                        name: "DataError",
                        message: "Cannot find partner"
                    });
                }

                partnerObj = partnerData;

                let proposalQuery = {
                    "data.platformId": platformObj._id,
                    "data.partnerObjId": partnerObj._id,
                }

                if (startTime && endTime) {
                    proposalQuery.createTime = {
                        $gte: new Date(startTime),
                            $lt: new Date(endTime)
                    }
                }

                if (status) {
                    if (status == constProposalStatus.SUCCESS || status == constProposalStatus.APPROVED) {
                        proposalQuery.status = {$in:[constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    } else {
                        proposalQuery.status = status;
                    }
                }

                // return dbPropUtil.getProposalDataOfType(platformObj._id, constProposalType.SETTLE_PARTNER_COMMISSION, proposalQuery);

                return dbconfig.collection_proposalType.findOne({
                    platformId: platformObj._id,
                    name: constProposalType.SETTLE_PARTNER_COMMISSION
                }).lean().then(
                    proposalType => {
                        proposalQuery.type = proposalType._id;

                        if (!(startTime && endTime) && searchProposalCounts) {
                            return dbconfig.collection_proposal.find(proposalQuery).populate(
                                {path: "process", model: dbconfig.collection_proposalProcess}
                            ).sort({createTime: -1}).limit(Number(searchProposalCounts)).lean();
                        } else {
                            return dbconfig.collection_proposal.find(proposalQuery).populate(
                                {path: "process", model: dbconfig.collection_proposalProcess}
                            ).lean();
                        }
                    }
                )
            }
        ).then(
            proposalData => {
                let returnData = [];
                if (proposalData && proposalData.length > 0) {
                    for (let i = 0; i < proposalData.length; i++) {
                        let commissionPeriod;
                        let totalProviderFee = 0;
                        let totalCommission = 0;
                        if (proposalData[i].data) {
                            if (proposalData[i].data.startTime && proposalData[i].data.endTime) {
                                proposalData[i].data.endTime = new Date(proposalData[i].data.endTime.setSeconds(proposalData[i].data.endTime.getSeconds() - 1));
                                commissionPeriod = proposalData[i].data.startTime.toISOString() + " ~ " + proposalData[i].data.endTime.toISOString();
                            }
                        }
                        let returnObj = {
                            proposalId: proposalData[i].proposalId ? proposalData[i].proposalId : "",
                            status: proposalData[i].status ? proposalData[i].status : "",
                            proposalAmount: proposalData[i].data && proposalData[i].data.amount ? proposalData[i].data.amount : 0,
                            createTime: proposalData[i].createTime ? proposalData[i].createTime : "",
                            commissionPeriod: commissionPeriod ? commissionPeriod : "",
                            activeCrewNumbers: proposalData[i].data && proposalData[i].data.activeCount ? proposalData[i].data.activeCount : 0,
                            totalDepositFee: proposalData[i].data && proposalData[i].data.totalTopUpFee ? proposalData[i].data.totalTopUpFee : 0,
                            totalWithdrawFee: proposalData[i].data && proposalData[i].data.totalWithdrawalFee ? proposalData[i].data.totalWithdrawalFee : 0,
                            totalBonusFee: proposalData[i].data && proposalData[i].data.totalRewardFee ? proposalData[i].data.totalRewardFee : 0,
                            list: []
                        };

                        if (proposalData[i].status == constProposalStatus.SUCCESS || proposalData[i].status == constProposalStatus.APPROVED) {
                            returnObj.successTime = proposalData[i].settleTime ? proposalData[i].settleTime : "";
                        } else if (proposalData[i].status == constProposalStatus.CANCEL) {
                            returnObj.cancelTime = proposalData[i].settleTime ? proposalData[i].settleTime : "";
                        }

                        if (proposalData[i].data && proposalData[i].data.rawCommissions && proposalData[i].data.rawCommissions.length) {
                            for (let j = 0; j < proposalData[i].data.rawCommissions.length; j++) {
                                let returnListObj = {
                                    providerGroupId: proposalData[i].data.rawCommissions[j].groupId ? proposalData[i].data.rawCommissions[j].groupId : "",
                                    providerGroupName: proposalData[i].data.rawCommissions[j].groupName ? proposalData[i].data.rawCommissions[j].groupName : "",
                                    providerGroupCommission: proposalData[i].data.rawCommissions[j].amount ? proposalData[i].data.rawCommissions[j].amount : 0,
                                    providerGroupFee: proposalData[i].data.rawCommissions[j].platformFee ? proposalData[i].data.rawCommissions[j].platformFee : 0
                                }
                                totalProviderFee += returnListObj.providerGroupFee;
                                totalCommission += returnListObj.providerGroupCommission;
                                returnObj.list.push(returnListObj);
                            }
                        }
                        returnObj.totalProviderFee = totalProviderFee;
                        returnObj.totalCommission = totalCommission;
                        returnData.push(returnObj);
                    }
                }

                return returnData;
            }
        )
    },

    cancelPartnerCommissionPreview: (commSettLog, partnerCommissionLogId) => {
        if(!commSettLog){
            return;
        }

        let query = {
            _id: {$in: partnerCommissionLogId}
        }

        return dbconfig.collection_partnerCommissionLog.remove(query).then(
            () => {
                return dbconfig.collection_partnerCommSettLog.remove({_id: commSettLog._id});
            },
            error => {
                return Q.reject({name: "DBError", message: error});
            }
        ).catch(
            function (error) {
                return Q.reject({name: "DBError", error: error});
            }
        );
    },

    deleteAllMail: (partnerId, hasBeenRead) => {
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).then(
            partnerData => {
                if (partnerData) {
                    let qObj = {recipientId: partnerData._id, bDelete: false};
                    if (hasBeenRead !== undefined) {
                        qObj.hasBeenRead = Boolean(hasBeenRead);
                    }
                    return dbconfig.collection_playerMail.update(
                        qObj,
                        {bDelete: true},
                        {multi: true}
                    );
                }
                else {
                    return Q.reject({name: "DBError", message: "Invalid partner data"});
                }
            }
        );
    },

    deleteMail: (partnerId, mailObjId) => {
        return dbconfig.collection_playerMail.findOne({_id: mailObjId}).populate(
            {path: "recipientId", model: dbconfig.collection_partner}
        ).then(
            mailData => {
                if (mailData && mailData.recipientId && mailData.recipientId.partnerId == partnerId) {
                    mailData.bDelete = true;
                    return mailData.save();
                }
                else {
                    return Q.reject({name: "DBError", message: "Invalid Mail id"});
                }
            }
        );
    },

    readMail: (partnerId, mailObjId) => {
        return dbconfig.collection_playerMail.findOne({_id: mailObjId}).populate(
            {path: "recipientId", model: dbconfig.collection_partner}
        ).then(
            mailData => {
                if (mailData && mailData.recipientId && mailData.recipientId.partnerId == partnerId) {
                    mailData.hasBeenRead = true;
                    return mailData.save();
                }
                else {
                    return Q.reject({name: "DBError", message: "Invalid Mail id"});
                }
            }
        );
    },

    findPartnerCommissionLog: (query, isOne) => {
        let request = dbconfig.collection_partnerCommissionLog.find(query);
        if (isOne) {
            request = request.limit(1);
        }
        request = request.lean().read("secondaryPreferred");

        return request.then(
            partnerCommissionLogs => {
                let proms = [];
                partnerCommissionLogs.map(partnerCommissionLog => {
                    let prom = Promise.resolve(partnerCommissionLog);
                    if (!partnerCommissionLog.downLinesRawCommissionDetail || partnerCommissionLog.downLinesRawCommissionDetail.length == 0) {
                        prom = dbconfig.collection_downLinesRawCommissionDetail.find({platform: partnerCommissionLog.platform, partnerCommissionLog: partnerCommissionLog._id}).lean().read("secondaryPreferred").then(
                            downLinesRawCommissionDetail => {
                                partnerCommissionLog.downLinesRawCommissionDetail = downLinesRawCommissionDetail;
                                return Promise.resolve(partnerCommissionLog)
                            }
                        );
                    }
                    proms.push(prom)
                });

                return Promise.all(proms);
            }
        ).then(
            partnerCommissionLogs => {
                if (isOne) {
                    return partnerCommissionLogs[0];
                }
                return partnerCommissionLogs;
            }
        )
    },

    handleGetAllPlayerCommissionRawDetails: (playerObjIds, commissionType, startTime, endTime, providerGroups, topUpTypes, rewardTypes, activePlayerRequirement) => {
        if (!playerObjIds || playerObjIds.length <= 0) {
            return [];
        }

        let proms = [];
        playerObjIds.map(playerObjId => {
            let prom = getAllPlayerCommissionRawDetails(playerObjId, commissionType, new Date(startTime), new Date(endTime), providerGroups, topUpTypes, rewardTypes, activePlayerRequirement);
            proms.push(prom);
        });

        return Promise.all(proms);
    },

    getPreviousCommissionPeriod: (pastX, platformObjId, partnerName, commissionType) => {
        if (partnerName) {
            return dbconfig.collection_partner.findOne({partnerName: partnerName, platform: platformObjId}, {commissionType: 1}).lean().then(
                partner => {
                    if (!partner) {
                        return Promise.reject({message: "Partner not found."});
                    }

                    return getPreviousNCommissionPeriod(partner.commissionType, Number(pastX));
                }
            );
        }
        else if (commissionType) {
            return getPreviousNCommissionPeriod(commissionType, Number(pastX));
        }
        else {
            return Promise.reject({message: "Please insert either commission type or partner name for search."});
        }
    },

    settlePastCommission: (partnerName, platformObjId, pastX, adminInfo) => {
        let period, partner, proposalType;
        return dbPartner.getPreviousCommissionPeriod(pastX, platformObjId, partnerName).then(
            periodData => {
                period = periodData;
                return dbconfig.collection_partner.findOne({partnerName: partnerName, platform: platformObjId}).lean();
            }
        ).then(
            partnerData => {
                partner = partnerData;

                return dbconfig.collection_proposalType.findOne({name: constProposalType.SETTLE_PARTNER_COMMISSION, platformId: partner.platform}).lean();
            }
        ).then(
            proposalTypeData => {
                proposalType = proposalTypeData;

                return dbconfig.collection_proposal.findOne({type: proposalType._id, "data.partnerId": partner.partnerId, "data.startTime": period.startTime, "data.endTime": period.endTime}).lean();
            }
        ).then(
            existingProposal => {
                if (existingProposal) {
                    return Promise.reject({message: translate("The partner commission for this period is already settled.") + translate("Proposal No.") + existingProposal.proposalId});
                }

                return dbPartner.generatePartnerCommissionLog(partner._id, partner.commissionType, period.startTime, period.endTime);
            }
        ).then(
            commissionLog => {
                return applyCommissionToPartner(commissionLog._id, constPartnerCommissionLogStatus.EXECUTED, "", adminInfo);
            }
        );
    },

    transferPartnerCreditToPlayer: (platformId, partnerObjId, currentCredit, updateCredit, totalTransferAmount, transferToPlayers, adminInfo) => {
        return dbconfig.collection_partner.findOne({platform: platformId, _id: partnerObjId}).lean().then( partnerData => {
            if (partnerData) {
                if (partnerData.credits) {
                    if(parseFloat(partnerData.credits).toFixed(2) != currentCredit) {
                        return Promise.reject({name: "DataError", message: "Partner does not have enough credit."});
                    } else {
                        return applyTransferPartnerCreditToPlayer(platformId, partnerData, currentCredit, updateCredit, totalTransferAmount, transferToPlayers, adminInfo);
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Partner does not have enough credit."});
                }
            } else {
                return Promise.reject({name: "DataError", message: "Invalid partner data"});
            }
        })
    },

    getChildPartnerRecords: (platformId, partnerObjId) => {
        let childPartnerData = [];
        let childPartnerNameArr = [];
        let query = {
            platform: mongoose.Types.ObjectId(platformId),
            _id: mongoose.Types.ObjectId(partnerObjId)
        }

        return dbconfig.collection_partner.aggregate([
            {$match: query},
            {
                $project: {
                    "_id": 1,
                    "children": 1
                }
            },
        ]).then(aggr => {
            let retData = [];
            if (aggr && aggr[0] && aggr[0].children && aggr[0].children.length > 0) {
                let childrenList = aggr[0].children || [];
                for (let index in childrenList) {
                    if (childrenList[index]) {
                        let prom = dbconfig.collection_partner.findOne({_id: mongoose.Types.ObjectId(childrenList[index])}, {partnerName:1, _id: 1, partnerId: 1}).lean();
                        retData.push(prom);
                    }
                }
            }
            return Promise.all(retData);
        }).then(childPartner => {
            if (childPartner && childPartner.length > 0) {
                for (let i = 0, len = childPartner.length; i < len; i++) {
                    if (childPartner[i] && childPartner[i].partnerName) {
                        childPartnerNameArr.push(childPartner[i].partnerName);
                    }
                }
            }

            return dbconfig.collection_proposalType.findOne({
                platformId: platformId,
                name: constProposalType.UPDATE_CHILD_PARTNER
            }).lean();
        }).then(proposalTypeData => {
            if (proposalTypeData) {
                let proms = [];

                if (childPartnerNameArr && childPartnerNameArr.length > 0) {
                    for (let i = 0, len = childPartnerNameArr.length; i < len; i++) {
                        if (childPartnerNameArr[i]) {
                            let matchQuery = {
                                'data.platformId': mongoose.Types.ObjectId(platformId),
                                'data.updateChildPartnerName': {$in: [childPartnerNameArr[i]]},
                                'data.curChildPartnerName': {$nin: [childPartnerNameArr[i]]},
                                'data.partnerObjId': partnerObjId,
                                type: proposalTypeData._id,
                                status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                            }

                            proms.push(dbconfig.collection_proposal.aggregate([
                                {
                                    $match: matchQuery
                                },
                                {
                                    $sort: { createTime: -1 }
                                },
                                {
                                    $group: {
                                        _id: childPartnerNameArr[i],
                                        proposalId: {$first: "$proposalId"},
                                        updateDateTime: {$first: "$createTime"},
                                    }
                                }
                            ]));
                        }
                    }

                    return Promise.all(proms);
                }
            } else {
                return Promise.reject({name: "DataError", message: "Failed to find proposal type data"});
            }
        }).then(data => {
            if (data && data.length > 0) {
                for (let i = 0, len = data.length; i < len; i++) {
                    let childPartnerProposal = data[i];
                    if (childPartnerProposal && childPartnerProposal.length > 0) {
                        for (let j = 0, jLen = childPartnerProposal.length; j < jLen; j++) {
                            if (childPartnerProposal[j] && Object.keys(childPartnerProposal[j]).length
                                && childPartnerProposal[j]._id && childPartnerProposal[j].proposalId && childPartnerProposal[j].updateDateTime) {
                                childPartnerData.push({partnerName: childPartnerProposal[j]._id, proposalId: childPartnerProposal[j].proposalId, createTime: childPartnerProposal[j].updateDateTime});
                            }
                        }
                    }
                }
            }

            let sortChildPartner = [];
            if (childPartnerData && childPartnerData.length > 0) {
                sortChildPartner = childPartnerData.sort(function(a, b) { return a.createTime - b.createTime});
            }

            return sortChildPartner;
        });
    },

    getDownPartnerInfo: (platformId, partnerId, requestPage, count) => {
        let platformObj;
        let partnerObj;
        let childPartnerObj;
        let proposalTypeObj;
        let index = 0;
        let currentPage = requestPage || 1;
        let pageNo = null;
        let limit = count || 10;
        let statsObj;
        let totalCount = 0;
        let totalPage = 1;

        if (typeof currentPage != 'number' || typeof limit != 'number') {
            return Promise.reject({name: "DataError", message: "Incorrect parameter type"});
        }

        if (currentPage <= 0) {
            pageNo = 0;
        } else {
            pageNo = currentPage;
        }

        index = ((pageNo - 1) * limit);
        currentPage = pageNo;

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;
                    if (partnerId) {
                        let query = {
                            platform: platformObj._id,
                            partnerId: partnerId
                        }

                        return dbconfig.collection_partner.findOne(query, {_id: 1, partnerId: 1, partnerName: 1}).lean();

                    } else {
                        return Promise.resolve(true);
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;

                    let query = {
                        platform: platformObj._id,
                        parent: partnerObj._id
                    };

                    let countProm = dbconfig.collection_partner.find(query).count();
                    let childPartnerProm = dbconfig.collection_partner.find(query, {_id: 0, partnerName: 1, commissionType: 1}).skip(index).limit(limit).lean();
                    let proposalTypeProm = dbconfig.collection_proposalType.findOne({platformId: platformObj._id, name: constProposalType.UPDATE_PARENT_PARTNER_COMMISSION}).lean();

                    return Promise.all([countProm, childPartnerProm, proposalTypeProm]);
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            data => {
                totalCount = data && data[0] ? data[0] : 0;
                totalPage = Math.ceil(totalCount / limit);
                childPartnerObj = data && data[1] ? data[1] : null;
                proposalTypeObj = data && data[2] ? data[2] : null;

                if(!proposalTypeObj) {
                    return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                }

                let thisMonthDateStartTime = dbutility.getCurrentMonthSGTIme().startTime;
                let endTime = new Date();
                endTime.setHours(23, 59, 59, 999);
                let proms = [];

                if (childPartnerObj && childPartnerObj.length > 0) {
                    for (let i = 0, len = childPartnerObj.length; i < len; i++) {
                        let childPartner = childPartnerObj[i];

                        if (childPartner && childPartner.partnerName) {

                            proms.push(dbconfig.collection_proposal.aggregate([
                                {
                                    $match: {
                                        createTime: {$gte: new Date(thisMonthDateStartTime), $lt: new Date(endTime)},
                                        type: proposalTypeObj._id,
                                        "data.partnerObjId": partnerObj._id,
                                        "data.platformId": platformObj._id,
                                        "data.childPartnerName": childPartner.partnerName
                                    }
                                },
                                {
                                    $group: {
                                        _id: {
                                            name: "$data.childPartnerName",
                                            commissionType: "$data.childPartnerCommissionType"
                                        },
                                        totalContribution: {$sum: "$data.amount"},
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        name: "$_id.name",
                                        commissionType: "$_id.commissionType",
                                        totalContribution: 1
                                    }
                                }
                            ]));

                        }
                    }
                }

                return Promise.all(proms).then(data => {
                    let contributionDetailsArr = data ? data : [];

                    if (childPartnerObj && childPartnerObj.length > 0) {
                        childPartnerObj.map(childPartner => {

                            childPartner.monthContribution = 0;

                            if (contributionDetailsArr && contributionDetailsArr.length > 0) {
                                for (let i = 0, len = contributionDetailsArr.length; i < len; i++) {

                                    let details = contributionDetailsArr[i];
                                    if (details && details.length > 0) {
                                        for (let j = 0, len = details.length; j < len; j++) {

                                            let detail = details[j];
                                            if (detail && detail.name && childPartner && childPartner.partnerName && detail.name == childPartner.partnerName) {
                                                childPartner.monthContribution = detail.totalContribution ? detail.totalContribution : 0;
                                            }
                                            if (detail.commissionType && childPartner.commissionType && Number(detail.commissionType) == Number(childPartner.commissionType)) {
                                                childPartner.commissionType = Number(detail.commissionType);
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        });
                    }

                    return childPartnerObj;
                });

            }
        ).then(finalChildPartnerData => {
            statsObj = {};
            statsObj.downstreamTotal = totalCount;
            statsObj.totalCount = totalCount;
            statsObj.totalPage = totalPage;
            statsObj.currentPage = currentPage;

            return {stats: statsObj, list: finalChildPartnerData ? finalChildPartnerData : []};
        })
    },

    partnerCreditToPlayer: (platformId, partnerId, targetList, userAgent) => {
        let platformObj;
        let partnerObj;

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(platformData => {
            if (!platformData || !platformData._id) {
                return Promise.reject({name: "DataError", message: "Cannot find platform"});
            }

            platformObj = platformData;

            return dbconfig.collection_partner.findOne({platform: platformObj._id, partnerId: partnerId}).lean();

        }).then(partnerData => {
            if (!partnerData || !partnerData._id) {
                return Promise.reject({name: "DataError", message: "Invalid partner data"});
            }

            let proms = [];
            let isDownlineValid = true;
            let isAmountValid = true;
            let isSpendingTimesValid = true;
            let isProviderGroupValid = true;

            partnerObj = partnerData;

            if (targetList && targetList.length > 0) {
                targetList.forEach(downline => {
                    if (downline && downline.username) {
                        let prom = dbconfig.collection_players.findOne({platform: platformObj._id, name: downline.username, partner: partnerObj._id}).lean().then(
                            playerData => {
                                if (!playerData) {
                                    isDownlineValid = false;
                                } else {
                                    if (!downline.amount || downline.amount <= 0) {
                                        isAmountValid = false;
                                    }

                                    if (downline.providerGroupId) {
                                        if (!downline.spendingTimes) {
                                            isSpendingTimesValid = false;
                                        } else {
                                            return dbconfig.collection_gameProviderGroup.findOne({providerGroupId: downline.providerGroupId, platform: platformObj._id}).lean().then(
                                                providerGroupData => {
                                                    if (!providerGroupData) {
                                                        isProviderGroupValid = false;
                                                    }

                                                    return {
                                                        playerObjId: playerData._id,
                                                        playerName: playerData.name,
                                                        amount: downline.amount,
                                                        withdrawConsumption: downline.spendingTimes ? dbUtil.noRoundTwoDecimalPlaces(downline.amount * downline.spendingTimes) : 0,
                                                        providerGroup: providerGroupData && providerGroupData._id ? providerGroupData._id : ''
                                                    }
                                                }
                                            );
                                        }
                                    } else {
                                        return {
                                            playerObjId: playerData._id,
                                            playerName: playerData.name,
                                            amount: downline.amount,
                                            withdrawConsumption: downline.spendingTimes ? dbUtil.noRoundTwoDecimalPlaces(downline.amount * downline.spendingTimes) : 0,
                                        }
                                    }

                                };
                            }
                        );

                        proms.push(prom);

                    } else {
                        return Promise.reject({
                            status: constServerCode.PLAYER_NAME_INVALID,
                            name: "DataError",
                            message: "Invalid player data"});
                    }
                });

                return Promise.all(proms).then(
                    res => {
                        if (!isDownlineValid) {
                            return Promise.reject({
                                status: constServerCode.PLAYER_NAME_INVALID,
                                name: "DataError",
                                message: "Invalid player data"});
                        } else if (!isAmountValid) {
                            return Promise.reject({
                                name: "DataError",
                                message: "Cannot transfer negative amount"});
                        } else if (!isSpendingTimesValid) {
                            return Promise.reject({
                                status: constServerCode.SPENDING_TIMES_REQUIRED,
                                name: "DataError",
                                message: "Spending Times cannot be empty"});
                        } else {
                            return res;
                        }
                    }
                );
            } else {
                return Promise.reject({
                    name: "DataError",
                    message: "targetList cannot be empty"});
            }

        }).then(downlineTransferData => {
            let transferDetail = [];
            let sumTransferAmount = 0;

            if (downlineTransferData && downlineTransferData.length > 0) {
                transferDetail = downlineTransferData;
                sumTransferAmount = dbUtil.noRoundTwoDecimalPlaces(downlineTransferData.reduce((sum, value) => sum + value.amount, 0));

                if (partnerObj.credits) {
                    if(partnerObj.credits <= 0 || partnerObj.credits < sumTransferAmount) {
                        return Promise.reject({
                            status: constServerCode.PARTNER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            message: "Partner does not have enough credit."});
                    } else {
                        let currentCredit = partnerObj.credits;
                        let updateCredit = partnerObj.credits - sumTransferAmount;

                        return applyTransferPartnerCreditToPlayer(platformObj._id, partnerObj, currentCredit, updateCredit, sumTransferAmount, transferDetail, null, userAgent);
                    }
                } else {
                    return Promise.reject({
                        status: constServerCode.PARTNER_NOT_ENOUGH_CREDIT,
                        name: "DataError",
                        message: "Partner does not have enough credit."});
                }
            }

        }).then(proposalData => {
            if (proposalData && proposalData.data && proposalData.data.amount) {
                return {amount: proposalData.data.amount * -1, balance: proposalData.data.updateCredit};
            }
        });
    },

    getDownPartnerContribution: (platformId, partnerId, requestPage, count, startTime, endTime) => {
        let platformObj;
        let partnerObj;
        let downlineProposalObj;
        let parentProposalObj;
        let index = 0;
        let currentPage = requestPage || 1;
        let pageNo = null;
        let limit = count || 10;
        let statsObj;
        let totalCount = 0;
        let totalPage = 1;
        let sortCol = {createTime: 1};
        let totalAmount = 0;

        if (typeof currentPage != 'number' || typeof limit != 'number') {
            return Promise.reject({name: "DataError", message: "Incorrect parameter type"});
        }

        if (currentPage <= 0) {
            pageNo = 0;
        } else {
            pageNo = currentPage;
        }

        index = ((pageNo - 1) * limit);
        currentPage = pageNo;

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;

                    if (partnerId) {
                        return dbconfig.collection_partner.findOne({
                            platform: platformObj._id,
                            partnerId: partnerId
                        }, {_id: 1, partnerId: 1, partnerName: 1, children: 1}).lean();

                    } else {
                        return Promise.resolve(true);
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;

                    return dbconfig.collection_proposalType.findOne({platformId: platformObj._id, name: constProposalType.SETTLE_PARTNER_COMMISSION}).lean();

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    if (!startTime) {
                        startTime = dbutility.getCurrentMonthSGTIme().startTime;
                    }

                    if (!endTime) {
                        endTime = new Date();
                        endTime.setHours(23, 59, 59, 999);
                    }

                    let query = {
                        type: proposalTypeData._id,
                        'data.partnerObjId': {$in: partnerObj.children},
                        'data.platformObjId': platformObj._id,
                        createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    };

                    let countProm = dbconfig.collection_proposal.find(query).count();
                    let downlineProposalProm = dbconfig.collection_proposal.find(
                        query, {
                            _id: 0, proposalId: 1, status: 1, createTime: 1, 'data.commissionType': 1, 'data.partnerName': 1
                        }).skip(index).limit(limit).sort(sortCol).lean();
                    let parentProposalProm = dbconfig.collection_proposalType.findOne({platformId: platformObj._id, name: constProposalType.UPDATE_PARENT_PARTNER_COMMISSION}).lean().then(
                        proposalTypeData => {
                            if (proposalTypeData) {
                                return dbconfig.collection_proposal.find({
                                    type: proposalTypeData._id,
                                    'data.partnerObjId': partnerObj._id,
                                    'data.platformObjId': platformObj._id,
                                    createTime: {$gte: new Date(startTime), $lt: new Date(endTime)}
                                }, {
                                    'data.relatedProposalId': 1, 'data.amount': 1
                                }).lean();
                            }
                        }
                    );

                    return Promise.all([countProm, downlineProposalProm, parentProposalProm]);

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        ).then(
            data => {
                totalCount = data && data[0] ? data[0] : 0;
                totalPage = Math.ceil(totalCount / limit);
                downlineProposalObj = data && data[1] ? data[1] : null;
                parentProposalObj = data && data[2] ? data[2] : null;

                if (downlineProposalObj && downlineProposalObj.length > 0) {
                    downlineProposalObj.map(downlineProposal => {
                        downlineProposal.username = downlineProposal && downlineProposal.data && downlineProposal.data.partnerName ? downlineProposal.data.partnerName : "";
                        downlineProposal.commissionType = downlineProposal && downlineProposal.data && downlineProposal.data.commissionType ? downlineProposal.data.commissionType : 0;
                        downlineProposal.time = downlineProposal.createTime;
                        downlineProposal.contribution = 0;

                        if (parentProposalObj && parentProposalObj.length > 0) {
                            for (let i = 0, len = parentProposalObj.length; i < len; i++) {
                                let proposal = parentProposalObj[i];

                                if (proposal && proposal.data && proposal.data.relatedProposalId && downlineProposal && downlineProposal.proposalId
                                    && proposal.data.relatedProposalId == downlineProposal.proposalId) {
                                    downlineProposal.contribution = proposal.data.amount ? proposal.data.amount : 0;
                                }
                            }
                        }

                        delete downlineProposal.data;
                        delete downlineProposal.createTime;
                    });
                }

                return downlineProposalObj;
            }
        ).then(finaldownlineProposalData => {
            if (finaldownlineProposalData && finaldownlineProposalData.length > 0) {
                totalAmount = finaldownlineProposalData.reduce((sum, value) => sum + value.contribution, 0);
            }

            statsObj = {};
            statsObj.totalAmount = totalAmount;
            statsObj.totalCount = totalCount;
            statsObj.totalPage = totalPage;
            statsObj.currentPage = currentPage;

            return {stats: statsObj, list: finaldownlineProposalData ? finaldownlineProposalData : []};
        })

    },

    getPartnerTransferList: (platformId, partnerId, startTime, endTime, requestPage, count) => {
        let platformObj;
        let partnerObj;
        let proposalObj;
        let providerGroupObj;
        let index = 0;
        let currentPage = requestPage || 1;
        let pageNo = null;
        let limit = count || 10;
        let statsObj = {};
        let totalCount = 0;
        let totalPage = 1;
        let sortCol = {createTime: -1};
        let totalTransferAmount = 0;

        if (typeof currentPage != 'number' || typeof limit != 'number') {
            return Promise.reject({name: "DataError", message: "Incorrect parameter type"});
        }

        if (currentPage <= 0) {
            pageNo = 0;
        } else {
            pageNo = currentPage;
        }

        index = ((pageNo - 1) * limit);
        currentPage = pageNo;

        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    platformObj = platformData;

                    if (partnerId) {
                        return dbconfig.collection_partner.findOne({
                            platform: platformObj._id,
                            partnerId: partnerId
                        }, {_id: 1, partnerId: 1, partnerName: 1}).lean();

                    } else {
                        return Promise.resolve(true);
                    }
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    partnerObj = partnerData;

                    return dbconfig.collection_proposalType.findOne({platformId: platformObj._id, name: constProposalType.PARTNER_CREDIT_TRANSFER_TO_DOWNLINE}).lean();

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        ).then(
            proposalTypeData => {
                if (proposalTypeData) {
                    if (!startTime) {
                        startTime = dbutility.getCurrentMonthSGTIme().startTime;
                    }

                    if (!endTime) {
                        endTime = new Date();
                        endTime.setHours(23, 59, 59, 999);
                    }

                    let query = {
                        type: proposalTypeData._id,
                        'data.partnerObjId': partnerObj._id,
                        'data.platformObjId': platformObj._id,
                        createTime: {$gte: new Date(startTime), $lt: new Date(endTime)},
                    };

                    let countProm = dbconfig.collection_proposal.find(query).count();
                    let proposalProm = dbconfig.collection_proposal.find(query,
                        {
                            proposalId: 1, createTime: 1, status: 1, "data.amount": 1, "data.transferToDownlineDetail": 1
                        }).skip(index).limit(limit).sort(sortCol).lean();
                    let totalTransferAmountProm = dbconfig.collection_proposal.aggregate([
                        {$match: query},
                        {
                            $group: {
                                _id: null,
                                totalTransfer: {$sum: "$data.amount"},
                            }
                        }
                    ]);
                    let gameProviderGroupProm = dbconfig.collection_gameProviderGroup.find({platform: platformObj._id}).lean();

                    return Promise.all([countProm, proposalProm, totalTransferAmountProm, gameProviderGroupProm]);

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                }
            }
        ).then(
            data => {
                totalCount = data && data[0] ? data[0] : 0;
                totalPage = Math.ceil(totalCount / limit);
                proposalObj = data && data[1] ? data[1] : null;
                totalTransferAmount = data && data[2] && data[2][0] && data[2][0].totalTransfer ? dbUtil.noRoundTwoDecimalPlaces(data[2][0].totalTransfer) * -1 : 0;
                providerGroupObj = data && data[3] ? data[3] : null;

                statsObj.totalCount = totalCount;
                statsObj.totalPage = totalPage;
                statsObj.currentPage = currentPage;
                statsObj.totalTransferAmount = totalTransferAmount;
                let proposalList = [];

                if (proposalObj && proposalObj.length > 0) {
                    for (let i = 0, len = proposalObj.length; i < len; i++) {
                        let proposal = proposalObj[i];
                        let transferList = []

                        if (proposal) {
                            if (proposal.data && proposal.data.transferToDownlineDetail && proposal.data.transferToDownlineDetail.length > 0) {
                                let transferDetails = proposal.data.transferToDownlineDetail;
                                for (let j = 0, jlen = transferDetails.length; j < jlen; j++) {
                                    if (transferDetails[j]) {
                                        let transferDetail = {};
                                        transferDetail.username = transferDetails[j].playerName;
                                        transferDetail.transferAmount = transferDetails[j].amount;
                                        transferDetail.withdrawConsumption = transferDetails[j].withdrawConsumption;

                                        if (transferDetails[j].providerGroup && providerGroupObj && providerGroupObj.length > 0) {
                                            providerGroupObj.forEach(providerGroup => {
                                                if (providerGroup && providerGroup._id && providerGroup._id.toString() == transferDetails[j].providerGroup.toString()) {
                                                    transferDetail.providerGroupId = providerGroup.providerGroupId;
                                                }
                                            });
                                        } else {
                                            transferDetail.providerGroupId = "";
                                        }

                                        transferList.push(transferDetail);
                                    }
                                }
                            }

                            let proposalDetail = {};
                            proposalDetail.amount = proposal.data && proposal.data.amount ? proposal.data.amount * -1 : 0;
                            proposalDetail.time = proposal.createTime;
                            proposalDetail.status = proposal.status;
                            proposalDetail.proposalId = proposal.proposalId;
                            proposalDetail.transferList = transferList;

                            proposalList.push(proposalDetail);
                        }
                    }
                }

                return {stats: statsObj, list: proposalList};
            }
        )
    },

    checkChildPartnerNameValidity: (platformId, partnerName, currentPartnerObjId) => {
        let isPartnerExist = null;
        let parentPartnerName = null;
        let isOwnParentPartner = null;

        return dbconfig.collection_partner.findOne({platform: mongoose.Types.ObjectId(platformId), partnerName: partnerName.trim()}, {_id: 1}).lean().then(
            partnerData => {
            if (!partnerData) {
                isPartnerExist = false;
                return {isExist: isPartnerExist};
            } else {
                if (partnerData._id) {
                    return dbconfig.collection_partner.findOne({children: {$in: [partnerData._id]}}, {partnerName: 1}).lean().then(data => {
                        if (data) {
                            isPartnerExist = true;
                            parentPartnerName = data && data.partnerName ? data.partnerName : '';
                            return {isExist: isPartnerExist, parent: parentPartnerName};
                        } else {
                            if (currentPartnerObjId) {
                                return dbconfig.collection_partner.findOne({_id: mongoose.Types.ObjectId(currentPartnerObjId), parent: partnerData._id}).lean().then(
                                    ownParentPartnerData => {
                                        if (ownParentPartnerData) {
                                            isOwnParentPartner = true;
                                            return {isOwnParent: isOwnParentPartner};
                                        }
                                    });
                            }
                        }
                    });
                }
            }

        })
    },

    getPartnerPermissionLog: function (platform, id, createTime) {
        var query = {
            platform: platform,
            partner: id
        }
        if (createTime) {
            query.createTime = createTime;
        }
        return dbconfig.collection_partnerPermissionLog.find(query).populate({
            path: "admin",
            model: dbconfig.collection_admin
        })
    }
};

function getPreviousNCommissionPeriod (commissionType, n) {
    n = n > 987 ? 987 : n;
    let commissionPeriod = getCurrentCommissionPeriod(commissionType);

    for (let i = 0; i < n; i++) {
        commissionPeriod = getPreviousCommissionPeriod (commissionType, commissionPeriod);
    }

    return commissionPeriod;
}

function calculateRawCommission (totalDownLineConsumption, commissionRate) {
    return Number(totalDownLineConsumption) * Number(commissionRate);
}

function getCommissionRate (commissionRateTable, consumptionAmount, activeCount) {
    let lastValidCommissionRate = 0;
    let isCustom = false;

    if (consumptionAmount < 0) {
        consumptionAmount *= -1;
    }

    commissionRateTable = commissionRateTable.sort((requirementA, requirementB) => {
        return requirementA.commissionRate - requirementB.commissionRate;
    });

    for (let i = 0; i < commissionRateTable.length; i++) {
        let commissionRequirement = commissionRateTable[i];

        if (commissionRequirement.playerConsumptionAmountFrom && consumptionAmount < commissionRequirement.playerConsumptionAmountFrom
            || commissionRequirement.playerConsumptionAmountTo && consumptionAmount > commissionRequirement.playerConsumptionAmountTo
            || commissionRequirement.activePlayerValueFrom && activeCount < commissionRequirement.activePlayerValueFrom
            || commissionRequirement.activePlayerValueTo && activeCount > commissionRequirement.activePlayerValueTo
        ) {
            continue;
        }

        lastValidCommissionRate = commissionRequirement.commissionRate;
        isCustom = Boolean(commissionRequirement.isCustom);
    }

    return {
        commissionRate: lastValidCommissionRate,
        isCustom: isCustom
    };
}

function getCommissionRateTable (platformObjId, commissionType, partnerObjId, providerGroupObjId) {
    providerGroupObjId = providerGroupObjId || {$exists: false};

    let platformConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({
        platform: platformObjId,
        commissionType: commissionType,
        provider: providerGroupObjId,
        partner: {$exists: false}
    }).lean();

    let customConfigProm = dbconfig.collection_partnerCommissionConfig.findOne({
        platform: platformObjId,
        commissionType: commissionType,
        provider: providerGroupObjId,
        partner: partnerObjId
    }).lean();

    return Promise.all([platformConfigProm, customConfigProm]).then(
        data => {
            let platformConfig = {};

            if (!data[0]) {
                platformConfig.commissionSetting = [];
            } else {
                platformConfig = data[0];
            }

            if (data[1]) {
                let customConfig = data[1];
                platformConfig.commissionSetting.map(platformRate => {
                    customConfig.commissionSetting.map(customRate => {
                        if (platformRate.playerConsumptionAmountFrom === customRate.playerConsumptionAmountFrom
                        && platformRate.playerConsumptionAmountTo === customRate.playerConsumptionAmountTo
                        && platformRate.activePlayerValueFrom === customRate.activePlayerValueFrom
                        && platformRate.activePlayerValueTo === customRate.activePlayerValueTo
                        && platformRate.commissionRate !== customRate.commissionRate) {
                            platformRate.isCustom = true;
                            platformRate.commissionRate = customRate.commissionRate;
                        }
                    });
                });
            }

            return platformConfig.commissionSetting;
        }
    );
}

function getAllCommissionRateTable (platformObjId, commissionType, partnerObjId, providerGroups) {
    let proms = [];

    if (providerGroups && providerGroups.length > 0) {
        providerGroups.map(group => {
            let prom = getCommissionRateTable(platformObjId, commissionType, partnerObjId, group._id).then(
                rateTable => {
                    return {
                        groupId: group.providerGroupId,
                        groupName: group.name,
                        rateTable: rateTable
                    }
                }
            );
            proms.push(prom);
        });
    }
    else {
        let prom = getCommissionRateTable(platformObjId, commissionType, partnerObjId).then(
            rateTable => {
                return {
                    groupId: "",
                    groupName: "noGroup",
                    rateTable: rateTable
                }
            }
        );

        proms.push(prom);
    }

    return Promise.all(proms);
}

function getPlayerCommissionConsumptionDetail (playerObjId, startTime, endTime, providerGroups) {
    return dbconfig.collection_playerConsumptionRecord.aggregate([
        {
            $match: {
                playerId: ObjectId(playerObjId),
                createTime: {
                    $gte: new Date(startTime),
                    $lt: new Date(endTime)
                },
                $or: [
                    {isDuplicate: {$exists: false}},
                    {
                        $and: [
                            {isDuplicate: {$exists: true}},
                            {isDuplicate: false}
                        ]
                    }
                ]
            }
        },
        {
            $group: {
                _id: "$providerId",
                provider: {$first: "$providerId"},
                count: {$sum: {$cond: ["$count", "$count", 1]}},
                validAmount: {$sum: "$validAmount"},
                bonusAmount: {$sum: "$bonusAmount"},
            }
        }
    ]).allowDiskUse(true).read("secondaryPreferred").then(
        consumptionData => {
            if (!consumptionData || !consumptionData[0]) {
                consumptionData = [];
            }

            let consumptionDetail = {
                consumptionTimes: 0,
                validAmount: 0,
                bonusAmount: 0,
            };

            let consumptionProviderDetail = {};

            if (providerGroups && providerGroups.length > 0) {
                providerGroups.map(group => {
                    consumptionProviderDetail[group.name] = {
                        consumptionTimes: 0,
                        validAmount: 0,
                        bonusAmount: 0,
                    }
                });
            }

            consumptionData.map(providerConsumptionData => {
                if (providerGroups && providerGroups.length > 0) {
                    providerGroups.map(group => {
                        if (!group || !group.providers) {
                            return;
                        }
                        group.providers.map(groupProviderId => {
                            if (String(groupProviderId) === String(providerConsumptionData.provider)) {
                                consumptionProviderDetail[group.name].consumptionTimes += providerConsumptionData.count;
                                consumptionProviderDetail[group.name].validAmount += providerConsumptionData.validAmount;
                                consumptionProviderDetail[group.name].bonusAmount += providerConsumptionData.bonusAmount;
                            }
                        });
                    });
                }

                consumptionDetail.consumptionTimes += providerConsumptionData.count;
                consumptionDetail.validAmount += providerConsumptionData.validAmount;
                consumptionDetail.bonusAmount += providerConsumptionData.bonusAmount;
            });

            consumptionDetail.consumptionProviderDetail = consumptionProviderDetail;

            return consumptionDetail;
        }
    );
}

function getPlayerCommissionTopUpDetail (playerObjId, startTime, endTime, topUpTypes) {
    return dbconfig.collection_proposal.aggregate([
        {
            "$match": {
                "data.playerObjId": {$in: [ObjectId(playerObjId), String(playerObjId)]},
                "createTime": {
                    "$gte": new Date(startTime),
                    "$lte": new Date(endTime)
                },
                "mainType": "TopUp",
                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
            }
        },
        {
            "$group": {
                "_id": "$type",
                "typeId": {"$first": "$type"},
                "count": {"$sum": 1},
                "amount": {"$sum": "$data.amount"}
            }
        }
    ]).read("secondaryPreferred").then(
        topUpData => {
            if (!topUpData || !topUpData[0]) {
                topUpData = [];
            }

            let playerTopUpDetail = {
                onlineTopUpAmount: 0,
                manualTopUpAmount: 0,
                weChatTopUpAmount: 0,
                aliPayTopUpAmount: 0,
                topUpAmount: 0,
                topUpTimes: 0,
            };

            for (let i = 0, len = topUpData.length; i < len; i++) {
                let topUpTypeRecord = topUpData[i];

                if (topUpTypes) {
                    switch (String(topUpTypeRecord.typeId)) {
                        case topUpTypes.onlineTopUpTypeId:
                            playerTopUpDetail.onlineTopUpAmount = topUpTypeRecord.amount;
                            break;
                        case topUpTypes.manualTopUpTypeId:
                            playerTopUpDetail.manualTopUpAmount = topUpTypeRecord.amount;
                            break;
                        case topUpTypes.weChatTopUpTypeId:
                            playerTopUpDetail.weChatTopUpAmount = topUpTypeRecord.amount;
                            break;
                        case topUpTypes.aliPayTopUpTypeId:
                            playerTopUpDetail.aliPayTopUpAmount = topUpTypeRecord.amount;
                            break;
                    }
                }

                playerTopUpDetail.topUpAmount += topUpTypeRecord.amount;
                playerTopUpDetail.topUpTimes += topUpTypeRecord.count;
            }

            return playerTopUpDetail;
        }
    );
}

function getPlayerCommissionWithdrawDetail (playerObjId, startTime, endTime) {
    return dbconfig.collection_proposal.aggregate([
        {
            "$match": {
                "data.playerObjId": {$in: [ObjectId(playerObjId), String(playerObjId)]},
                "createTime": {
                    "$gte": new Date(startTime),
                    "$lte": new Date(endTime)
                },
                "mainType": "PlayerBonus",
                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
            }
        },
        {
            "$group": {
                "_id": null,
                "count": {"$sum": 1},
                "amount": {"$sum": "$data.amount"}
            }
        }
    ]).read("secondaryPreferred").then(
        withdrawalInfo => {
            if (!withdrawalInfo || !withdrawalInfo[0]) {
                withdrawalInfo = [{}];
            }

            let withdrawalTotal = withdrawalInfo[0];

            return {
                withdrawalTimes: withdrawalTotal.count || 0,
                withdrawalAmount: withdrawalTotal.amount || 0,
            }
        }
    );
}

function getAllPlayersCommissionTopUpDetail (partnerId, platformId, startTime, endTime) {
    let platform = {};
    let downLines = [];
    return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
        platformData => {
            if (!platformData) {
                return Promise.reject({
                    code: constServerCode.INVALID_PLATFORM,
                    name: "DataError",
                    message: "Cannot find platform"
                });
            }

            platform = platformData;

            return dbconfig.collection_partner.findOne({platform: platform._id, partnerId: partnerId}).lean();
        }
    ).then(
        partnerData => {
            if (!partnerData) {
                return Promise.reject({
                    code: constServerCode.PARTNER_NAME_INVALID,
                    name: "DataError",
                    message: "Cannot find partner"
                });
            }

            return dbconfig.collection_players.find({platform: platform._id, partner: partnerData._id}).lean();


        }
    ).then(
        players => {
            let playerIds = [];
            if(players && players.length > 0){
                players.map(player => {
                    playerIds.push(ObjectId(player._id));
                    playerIds.push(String(player._id));
                })
            }
            return dbconfig.collection_proposal.aggregate([
                {
                    "$match": {
                        "data.playerObjId": {$in: playerIds},
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "mainType": "TopUp",
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    }
                },
                {
                    "$group": {
                        "_id": {playerId: "$data.playerObjId"},
                        "topUpTimes": {"$sum": 1},
                        "topUpAmount": {"$sum": "$data.amount"}
                    }
                }
            ]).read("secondaryPreferred")
        }
    );
}

function getAllPlayersCommissionConsumptionDetail (partnerId, platformId, startTime, endTime, providerGroups) {
    let platform = {};
    let downLines = [];
    return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
        platformData => {
            if (!platformData) {
                return Promise.reject({
                    code: constServerCode.INVALID_PLATFORM,
                    name: "DataError",
                    message: "Cannot find platform"
                });
            }

            platform = platformData;
            return dbconfig.collection_partner.findOne({platform: platform._id, partnerId: partnerId}).lean();
        }
    ).then(
        partnerData => {
            if (!partnerData) {
                return Promise.reject({
                    code: constServerCode.PARTNER_NAME_INVALID,
                    name: "DataError",
                    message: "Cannot find partner"
                });
            }
            return dbconfig.collection_players.find({platform: platform._id, partner: partnerData._id}).lean();
        }
    ).then(
        players => {
            let playerIds = [];
            if(players && players.length > 0){
                players.map(player => {
                    playerIds.push(ObjectId(player._id));
                })
            }
            return dbconfig.collection_playerConsumptionRecord.aggregate([
                {
                    $match: {
                        playerId: {$in: playerIds},
                        createTime: {
                            $gte: new Date(startTime),
                            $lt: new Date(endTime)
                        },
                        $or: [
                            {isDuplicate: {$exists: false}},
                            {
                                $and: [
                                    {isDuplicate: {$exists: true}},
                                    {isDuplicate: false}
                                ]
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: {providerId: "$providerId", playerId: "$playerId"},
                        provider: {$first: "$providerId"},
                        consumptionTimes: {$sum: {$cond: ["$count", "$count", 1]}},
                        validAmount: {$sum: "$validAmount"},
                        bonusAmount: {$sum: "$bonusAmount"},
                    }
                }
            ]).allowDiskUse(true).read("secondaryPreferred")
        }
    );
}

function getAllPlayersCommissionWithdrawDetail (partnerId, platformId, startTime, endTime) {
    let platform = {};
    let downLines = [];
    return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
        platformData => {
            if (!platformData) {
                return Promise.reject({
                    code: constServerCode.INVALID_PLATFORM,
                    name: "DataError",
                    message: "Cannot find platform"
                });
            }

            platform = platformData;

            return dbconfig.collection_partner.findOne({platform: platform._id, partnerId: partnerId}).lean();
        }
    ).then(
        partnerData => {
            if (!partnerData) {
                return Promise.reject({
                    code: constServerCode.PARTNER_NAME_INVALID,
                    name: "DataError",
                    message: "Cannot find partner"
                });
            }

            return dbconfig.collection_players.find({platform: platform._id, partner: partnerData._id}).lean();


        }
    ).then(
        players => {
            let playerIds = [];
            if(players && players.length > 0){
                players.map(player => {
                    playerIds.push(ObjectId(player._id));
                    playerIds.push(String(player._id));
                })
            }
            return dbconfig.collection_proposal.aggregate([
                {
                    "$match": {
                        "data.playerObjId": {$in: playerIds},
                        "createTime": {
                            "$gte": new Date(startTime),
                            "$lte": new Date(endTime)
                        },
                        "mainType": "PlayerBonus",
                        "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                    }
                },
                {
                    "$group": {
                        "_id": "$data.playerName",
                        "count": {"$sum": 1},
                        "withdrawAmount": {"$sum": "$data.amount"}
                    }
                }
            ]).read("secondaryPreferred");
        }
    );
}

function isPlayerActive (activePlayerRequirement, playerConsumptionTimes, playerConsumptionAmount, playerTopUpTimes, playerTopUpAmount) {
    return Boolean(
        (playerConsumptionTimes >= activePlayerRequirement.consumptionTimes)
        && (playerConsumptionAmount >= activePlayerRequirement.consumptionAmount)
        && (playerTopUpTimes >= activePlayerRequirement.topUpTimes)
        && (playerTopUpAmount >= activePlayerRequirement.topUpAmount)
    );
}

function getRelevantActivePlayerRequirement (platformObjId, commissionType) {
    let configPrefix = "weeklyActivePlayer";
    switch (Number(commissionType)) {
        case constPartnerCommissionType.DAILY_BONUS_AMOUNT:
            configPrefix = "dailyActive";
            break;
        case constPartnerCommissionType.WEEKLY_BONUS_AMOUNT:
        case constPartnerCommissionType.WEEKLY_CONSUMPTION:
            configPrefix = "weeklyActive";
            break;
        case constPartnerCommissionType.BIWEEKLY_BONUS_AMOUNT:
            configPrefix = "halfMonthActive";
            break;
        case constPartnerCommissionType.MONTHLY_BONUS_AMOUNT:
            configPrefix = "monthlyActive";
            break;
    }

    return dbconfig.collection_partnerLevelConfig.findOne({platform: platformObjId}).lean().then(
        partnerLevelConfig => {
            return {
                topUpTimes: partnerLevelConfig[configPrefix + "PlayerTopUpTimes"] || 0,
                topUpAmount: partnerLevelConfig[configPrefix + "PlayerTopUpAmount"] || 0,
                consumptionTimes: partnerLevelConfig[configPrefix + "PlayerConsumptionTimes"] || 0,
                consumptionAmount: partnerLevelConfig[configPrefix + "PlayerConsumptionAmount"] || 0,
            }
        }
    );
}

function getCommissionPeriod (commissionType) {
    switch (commissionType) {
        case constPartnerCommissionType.DAILY_BONUS_AMOUNT:
            return dbutility.getYesterdaySGTime();
        case constPartnerCommissionType.WEEKLY_BONUS_AMOUNT:
        case constPartnerCommissionType.WEEKLY_CONSUMPTION:
            return dbutility.getLastWeekSGTime();
        case constPartnerCommissionType.BIWEEKLY_BONUS_AMOUNT:
            return dbutility.getLastBiWeekSGTime();
        case constPartnerCommissionType.MONTHLY_BONUS_AMOUNT:
            return dbutility.getLastMonthSGTime();
        default:
            return dbutility.getLastWeekSGTime();
    }
}

function getCurrentCommissionPeriod (commissionType) {
    switch (Number(commissionType)) {
        case constPartnerCommissionType.DAILY_BONUS_AMOUNT:
            return dbutility.getTodaySGTime();
        case constPartnerCommissionType.WEEKLY_BONUS_AMOUNT:
        case constPartnerCommissionType.WEEKLY_CONSUMPTION:
            return dbutility.getCurrentWeekSGTime();
        case constPartnerCommissionType.BIWEEKLY_BONUS_AMOUNT:
            return dbutility.getCurrentBiWeekSGTIme();
        case constPartnerCommissionType.MONTHLY_BONUS_AMOUNT:
            return dbutility.getCurrentMonthSGTIme();
        default:
            return dbutility.getCurrentWeekSGTime();
    }
}

function getTargetCommissionPeriod (commissionType, date) {
    switch (Number(commissionType)) {
        case constPartnerCommissionType.DAILY_BONUS_AMOUNT:
            return dbutility.getDayTime(date);
        case constPartnerCommissionType.WEEKLY_BONUS_AMOUNT:
        case constPartnerCommissionType.WEEKLY_CONSUMPTION:
            return dbutility.getWeekTime(date);
        case constPartnerCommissionType.BIWEEKLY_BONUS_AMOUNT:
            return dbutility.getBiWeekSGTIme(date);
        case constPartnerCommissionType.MONTHLY_BONUS_AMOUNT:
            return dbutility.getMonthSGTIme(date);
        default:
            return dbutility.getWeekTime(date);
    }
}

function getRewardProposalTypes (platformObjId) {
    return dbconfig.collection_proposalType.find({platformId: platformObjId}, {name: 1}).lean().then(
        proposalType => {
            let rewardTypes = {};
            for (let i = 0, len = proposalType.length; i < len; i++) {
                let proposalTypeObj = proposalType[i];

                switch (proposalTypeObj.name) {
                    case constProposalType.ADD_PLAYER_REWARD_TASK:
                        rewardTypes.manualReward = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_CONSUMPTION_RETURN:
                        rewardTypes.consumptionReturn = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_LIMITED_OFFER_REWARD:
                        rewardTypes.limitedOffer = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_PROMO_CODE_REWARD:
                        rewardTypes.promoCode = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_CONVERT_REWARD_POINTS:
                        rewardTypes.convertRewardPoint = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_AUTO_CONVERT_REWARD_POINTS:
                        rewardTypes.autoConvertRewardPoint = proposalTypeObj._id.toString();
                        break;
                }
            }

            return rewardTypes;
        }
    );
}

function getPaymentProposalTypes (platformObjId) {
    return dbconfig.collection_proposalType.find({platformId: platformObjId}, {name: 1}).lean().then(
        proposalType => {
            let topUpTypes = {};
            for (let i = 0, len = proposalType.length; i < len; i++) {
                let proposalTypeObj = proposalType[i];

                switch (proposalTypeObj.name) {
                    case constProposalType.PLAYER_TOP_UP:
                        topUpTypes.onlineTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_MANUAL_TOP_UP:
                        topUpTypes.manualTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_WECHAT_TOP_UP:
                        topUpTypes.weChatTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                    case constProposalType.PLAYER_ALIPAY_TOP_UP:
                        topUpTypes.aliPayTopUpTypeId = proposalTypeObj._id.toString();
                        break;
                }
            }

            return topUpTypes;
        }
    );
}

function getAllPlayerCommissionRawDetails (playerObjId, commissionType, startTime, endTime, providerGroups, topUpTypes, rewardTypes, activePlayerRequirement) {
    let consumptionDetailProm = getPlayerCommissionConsumptionDetail(playerObjId, startTime, endTime, providerGroups).catch(err => {
        console.error('getPlayerCommissionConsumptionDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let topUpDetailProm = getPlayerCommissionTopUpDetail(playerObjId, startTime, endTime, topUpTypes).catch(err => {
        console.error('getPlayerCommissionTopUpDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let withdrawalDetailProm = getPlayerCommissionWithdrawDetail(playerObjId, startTime, endTime).catch(err => {
        console.error('getPlayerCommissionWithdrawDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let rewardDetailProm = getPlayerCommissionRewardDetail(playerObjId, startTime, endTime, rewardTypes).catch(err => {
        console.error('getPlayerCommissionRewardDetail died', playerObjId, err);
        return Promise.reject(err);
    });
    let namesProm = dbconfig.collection_players.findOne({_id: playerObjId}, {name:1, realName:1}).lean();

    return Promise.all([consumptionDetailProm, topUpDetailProm, withdrawalDetailProm, rewardDetailProm, namesProm]).then(
        data => {
            let consumptionDetail = data[0];
            let topUpDetail = data[1];
            let withdrawalDetail = data[2];
            let rewardDetail = data[3];
            let name = (data[4] && data[4].name) || "";
            let realName = (data[4] && data[4].realName) || "";

            let active = isPlayerActive(activePlayerRequirement, consumptionDetail.consumptionTimes, consumptionDetail.validAmount, topUpDetail.topUpTimes, topUpDetail.topUpAmount);

            return {
                name,
                realName,
                consumptionDetail,
                topUpDetail,
                withdrawalDetail,
                rewardDetail,
                active,
            };
        }
    );
}

function getActiveDownLineCount (downLineRawDetail) {
    let count = 0;
    downLineRawDetail.map(player => {
        if (player.active) {
            count++;
        }
    });

    return count;
}

function getTotalPlayerConsumptionByProviderGroupName (downLineRawDetail, providerGroups) {
    let total = {};

    if (providerGroups && providerGroups.length > 0) {
        providerGroups.map(group => {
            total[group.name] = {
                validAmount: 0,
                bonusAmount: 0,
                consumptionTimes: 0,
                crewProfitDetail: [],
            };
        });

        downLineRawDetail.map(downLine => {
            providerGroups.map(group => {
                if(downLine.consumptionDetail.consumptionProviderDetail[group.name]) {
                    total[group.name].validAmount += downLine.consumptionDetail.consumptionProviderDetail[group.name].validAmount;
                    total[group.name].bonusAmount += downLine.consumptionDetail.consumptionProviderDetail[group.name].bonusAmount;
                    total[group.name].consumptionTimes += downLine.consumptionDetail.consumptionProviderDetail[group.name].consumptionTimes;
                    if (downLine.consumptionDetail.consumptionProviderDetail[group.name].consumptionTimes) {
                        total[group.name].crewProfitDetail.push({
                            crewAccount: downLine.name,
                            singleCrewProfit: downLine.consumptionDetail.consumptionProviderDetail[group.name].bonusAmount
                        });
                    }
                }
            });
        });
    }
    else {
        total['noGroup'] = {
            validAmount: 0,
            bonusAmount: 0,
            consumptionTimes: 0,
        };

        downLineRawDetail.map(downLine => {
            if(downLine.consumptionDetail) {
                total['noGroup'].validAmount += downLine.consumptionDetail.validAmount;
                total['noGroup'].bonusAmount += downLine.consumptionDetail.bonusAmount;
                total['noGroup'].consumptionTimes += downLine.consumptionDetail.consumptionTimes;
            }
        });
    }

    return total;
}

function getPlayerCommissionRewardDetail (playerObjId, startTime, endTime, rewardTypes) {
    let rewardProm = dbconfig.collection_proposal.aggregate([
        {
            "$match": {
                "data.playerObjId": {$in: [ObjectId(playerObjId), String(playerObjId)]},
                "createTime": {
                    "$gte": new Date(startTime),
                    "$lte": new Date(endTime)
                },
                "mainType": "Reward",
                "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
            }
        },
        {
            "$group": {
                "_id": "$type",
                "typeId": {"$first": "$type"},
                "amount": {"$sum": "$data.rewardAmount"}
            }
        }
    ]).read("secondaryPreferred");

    return rewardProm.then(
        rewardData => {
            if (!rewardData || !rewardData[0]) {
                rewardData = [];
            }

            let playerRewardDetail = {
                systemReward: 0,
                manualReward: 0,
                consumptionReturn: 0,
                limitedOffer: 0,
                promoCode: 0,
                pointConversion: 0,
                total: 0
            };

            for (let i = 0, len = rewardData.length; i < len; i++) {
                let rewardTypeTotal = rewardData[i];

                switch (String(rewardTypeTotal.typeId)) {
                    case rewardTypes.manualReward:
                        playerRewardDetail.manualReward = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.consumptionReturn:
                        playerRewardDetail.consumptionReturn = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.limitedOffer:
                        playerRewardDetail.limitedOffer = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.promoCode:
                        playerRewardDetail.promoCode = rewardTypeTotal.amount;
                        break;
                    case rewardTypes.convertRewardPoint:
                    case rewardTypes.autoConvertRewardPoint:
                        playerRewardDetail.pointConversion += rewardTypeTotal.amount;
                        break;
                    default:
                        playerRewardDetail.systemReward += rewardTypeTotal.amount;
                }

                playerRewardDetail.total += rewardTypeTotal.amount;
            }

            return playerRewardDetail;
        }
    );
}

function getPartnerCommissionConfigRate (platformObjId, partnerObjId) {
    let platformConfigProm = dbconfig.collection_partnerCommissionRateConfig.findOne({platform: platformObjId, partner: {$exists: false}}).lean();
    let customConfigProm = dbconfig.collection_partnerCommissionRateConfig.findOne({platform: platformObjId, partner: partnerObjId}).lean();

    return Promise.all([platformConfigProm, customConfigProm]).then(
        data => {
            let rateData = {};
            if (data[0]) {
                rateData = data[0];
            }

            let rateConfig = {
                rateAfterRebatePromo: rateData.rateAfterRebatePromo || 0,
                rateAfterRebatePlatform: rateData.rateAfterRebatePlatform || 0,
                rateAfterRebateGameProviderGroup: rateData.rateAfterRebateGameProviderGroup || 0,
                rateAfterRebateTotalDeposit: rateData.rateAfterRebateTotalDeposit || 0,
                rateAfterRebateTotalWithdrawal: rateData.rateAfterRebateTotalWithdrawal || 0,
                parentCommissionRate: rateData.parentCommissionRate || 0,
            };

            if (data[1]) {
                let customRateData = data[1];
                if (rateConfig.rateAfterRebatePromo !== customRateData.rateAfterRebatePromo) {
                    rateConfig.rateAfterRebatePromoIsCustom = true;
                    rateConfig.rateAfterRebatePromo = customRateData.rateAfterRebatePromo;
                }
                else {
                    rateConfig.rateAfterRebatePromoIsCustom = false;
                }

                if (rateConfig.rateAfterRebatePlatform !== customRateData.rateAfterRebatePlatform) {
                    rateConfig.rateAfterRebatePlatformIsCustom = true;
                    rateConfig.rateAfterRebatePlatform = customRateData.rateAfterRebatePlatform;
                }
                else {
                    rateConfig.rateAfterRebatePlatformIsCustom = false;
                }

                if (rateConfig.rateAfterRebateTotalDeposit !== customRateData.rateAfterRebateTotalDeposit) {
                    rateConfig.rateAfterRebateTotalDepositIsCustom = true;
                    rateConfig.rateAfterRebateTotalDeposit = customRateData.rateAfterRebateTotalDeposit;
                }
                else {
                    rateConfig.rateAfterRebateTotalDepositIsCustom = false;
                }

                if (rateConfig.rateAfterRebateTotalWithdrawal !== customRateData.rateAfterRebateTotalWithdrawal) {
                    rateConfig.rateAfterRebateTotalWithdrawalIsCustom = true;
                    rateConfig.rateAfterRebateTotalWithdrawal = customRateData.rateAfterRebateTotalWithdrawal;
                }
                else {
                    rateConfig.rateAfterRebateTotalWithdrawalIsCustom = false;
                }

                if (rateConfig && rateConfig.rateAfterRebateGameProviderGroup && typeof rateConfig.rateAfterRebateGameProviderGroup == 'object') {
                    rateConfig.rateAfterRebateGameProviderGroup.map(defaultGroup => {
                        customRateData.rateAfterRebateGameProviderGroup.map(customGroup => {
                            if (defaultGroup.name === customGroup.name
                                && defaultGroup.rate !== customGroup.rate
                            ) {
                                defaultGroup.isCustom = true;
                                defaultGroup.rate = customGroup.rate;
                            }
                            else {
                                defaultGroup.isCustom = false;
                            }
                        });
                    });
                }
            }
            return rateConfig;
        }
    );
}

function getTotalTopUp (downLineRawDetail) {
    let total = 0;
    downLineRawDetail.map(downLine => {
        total += downLine.topUpDetail.topUpAmount || 0;
    });

    return total;
}

function getTotalReward (downLineRawDetail) {
    let total = 0;
    downLineRawDetail.map(downLine => {
        total += downLine.rewardDetail.total || 0;
    });

    return total;
}

function getTotalWithdrawal (downLineRawDetail) {
    let total = 0;
    downLineRawDetail.map(downLine => {
        total += downLine.withdrawalDetail.withdrawalAmount || 0;
    });

    return total;
}

function getTotalWinLose (downLineRawDetail) {
    let total = 0;
    downLineRawDetail.map(downLine => {
        total += downLine.consumptionDetail.bonusAmount || 0;
    });

    return total;
}

function generateSkipCommissionLog (partnerObjId, commissionType, startTime, endTime) {
    return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
        partner => {
            return dbconfig.collection_partnerCommissionLog.update({
                partner: partner._id,
                platform: partner.platform,
                partnerName: partner.partnerName,
                partnerRealName: partner.realName,
                commissionType: commissionType,
                startTime: startTime,
                endTime: endTime,
            }, {
                $set: {
                    status: constPartnerCommissionLogStatus.SKIPPED,
                }
            }, {
                new: true,
                upsert: true
            })
        }
    );
}

function updatePastThreeRecord (currentLog) {
    return dbconfig.collection_partnerCommissionLog.find({
        partner: currentLog.partner,
        platform: currentLog.platform,
        commissionType: currentLog.commissionType,
        startTime: {$lt: currentLog.startTime}
    }).sort({startTime: -1}).limit(3).lean().then(
        pastThreeRecord => {
            let pastThreeActiveDownLines = [];
            let pastThreeNettCommission = [];

            pastThreeRecord.map(log => {
                if (log.status === constPartnerCommissionLogStatus.SKIPPED) {
                    pastThreeActiveDownLines.push("SKIP");
                    pastThreeNettCommission.push("SKIP");
                }
                else {
                    pastThreeActiveDownLines.push(log.activeDownLines);
                    pastThreeNettCommission.push(log.nettCommission);
                }
            });

            return dbconfig.collection_partnerCommissionLog.update({
                partner: currentLog.partner,
                platform: currentLog.platform,
                commissionType: currentLog.commissionType,
                startTime: currentLog.startTime,
                endTime: currentLog.endTime,
            }, {
                pastActiveDownLines: pastThreeActiveDownLines,
                pastNettCommission: pastThreeNettCommission,
            }).lean();
        }
    );
}



function applyPartnerCommissionSettlement(commissionLog, statusApply, adminInfo, remark) {
    // find proposal type
    return dbconfig.collection_proposalType.findOne({name: constProposalType.SETTLE_PARTNER_COMMISSION, platformId: commissionLog.platform}).lean().then(
        proposalType => {
            if (!proposalType) {
                return Promise.reject({
                    message: "Error in getting proposal type"
                });
            }

            let commissionTypeName = getCommissionTypeName(commissionLog.commissionType);
            let proposalRemark = commissionTypeName + ", " + remark;

            // create proposal data
            let proposalData = {
                type: proposalType._id,
                creator: adminInfo ? adminInfo : {
                    type: 'partner',
                    name: commissionLog.partnerName,
                    id: commissionLog.partner
                },
                data: {
                    partnerObjId: commissionLog.partner,
                    platformObjId: commissionLog.platform,
                    partnerId: commissionLog.partnerId,
                    partnerName: commissionLog.partnerName,
                    partnerRealName: commissionLog.partnerRealName,
                    startTime: commissionLog.startTime,
                    endTime: commissionLog.endTime,
                    commissionType: commissionLog.commissionType,
                    partnerCommissionRateConfig: commissionLog.partnerCommissionRateConfig,
                    rawCommissions: commissionLog.rawCommissions,
                    activeCount: commissionLog.activeDownLines,
                    totalRewardFee: commissionLog.totalRewardFee,
                    totalReward: commissionLog.totalReward,
                    totalTopUpFee: commissionLog.totalTopUpFee,
                    totalTopUp: commissionLog.totalTopUp,
                    totalWithdrawalFee: commissionLog.totalWithdrawalFee,
                    totalWithdrawal: commissionLog.totalWithdrawal,
                    adminName: adminInfo ? adminInfo.name : "",
                    settleType: statusApply,
                    amount: commissionLog.nettCommission,
                    status: constPartnerCommissionLogStatus.PREVIEW,
                    logObjId: commissionLog._id,
                    remark: proposalRemark
                },
                entryType: constProposalEntryType.ADMIN,
                userType: constProposalUserType.PARTNERS
            };

            return dbProposal.createProposalWithTypeId(proposalType._id, proposalData);
        }
    );
}

function updateParentPartnerCommission(commissionLog, adminInfo, proposalId) {
    // find proposal type
    return dbconfig.collection_proposalType.findOne({name: constProposalType.UPDATE_PARENT_PARTNER_COMMISSION, platformId: commissionLog.platform}).lean().then(
        proposalType => {
            if (!proposalType) {
                return Promise.reject({
                    message: "Error in getting proposal type"
                });
            }

            let proposalRemark = translate("1.Partner Commission Proposal No.: ") + proposalId + '<br>' + translate("2.Parent Partner Commission Rate：") + commissionLog.parentPartnerCommissionDetail.parentCommissionRate + "%";

            // create proposal data
            let proposalData = {
                type: proposalType._id,
                creator: adminInfo,
                data: {
                    partnerObjId: commissionLog.parentPartnerCommissionDetail.parentPartnerObjId,
                    platformObjId: commissionLog.platform,
                    partnerId: commissionLog.parentPartnerCommissionDetail.parentPartnerId,
                    partnerName: commissionLog.parentPartnerCommissionDetail.parentPartnerName,
                    parentCommissionRate: commissionLog.parentPartnerCommissionDetail.parentCommissionRate,
                    amount: commissionLog.parentPartnerCommissionDetail.totalParentCommissionFee,
                    childPartnerName: commissionLog.partnerName,
                    childPartnerTotalDownLines: commissionLog.parentPartnerCommissionDetail.totaldownLines,
                    childPartnerCommissionType: commissionLog.commissionType,
                    childPlayerTotalWinLose: commissionLog.parentPartnerCommissionDetail.totalWinLose,
                    relatedProposalId: proposalId,
                    remark: proposalRemark
                },
                entryType: constProposalEntryType.ADMIN,
                userType: constProposalUserType.PARTNERS
            };

            return dbProposal.createProposalWithTypeId(proposalType._id, proposalData);
        }
    );
}

function applyTransferPartnerCreditToPlayer(platformId, partner, currentCredit, updateCredit, totalTransferAmount, transferToPlayers, adminInfo, userAgent) {
    // find proposal type
    return dbconfig.collection_proposalType.findOne({name: constProposalType.PARTNER_CREDIT_TRANSFER_TO_DOWNLINE, platformId: platformId}).lean().then(
        proposalType => {
            if (!proposalType) {
                return Promise.reject({
                    message: "Error in getting proposal type"
                });
            }

            // create proposal data
            let proposalData = {
                type: proposalType._id,
                creator: adminInfo ? adminInfo : {
                    type: 'partner',
                    name: partner.partnerName,
                    id: partner._id
                },
                data: {
                    partnerObjId: partner._id,
                    platformObjId: platformId,
                    partnerId: partner.partnerId,
                    partnerName: partner.partnerName,
                    currentCredit: currentCredit,
                    updateCredit: updateCredit,
                    amount: -totalTransferAmount,
                    transferToDownlineDetail: transferToPlayers
                },
                entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                userType: constProposalUserType.PARTNERS
            };

            if (userAgent) {
                proposalData.inputDevice = dbutility.getInputDevice(userAgent,true);
            }

            return dbProposal.createProposalWithTypeId(proposalType._id, proposalData);
        }
    );
}

function updateCommSettLog(platformObjId, commissionType, startTime, endTime) {
    return dbconfig.collection_partnerCommSettLog.findOneAndUpdate({
        platform: platformObjId,
        settMode: commissionType,
        startTime: startTime,
        endTime: endTime,
    }, {
        isSettled: true,
    }, {
        new: true
    }).lean();
}

function updateCommissionLogStatus (log, status, remark = "") {
    return dbconfig.collection_partnerCommissionLog.findOneAndUpdate({
        _id: log._id,
    }, {
        status: status,
        remark: remark
    });
}

function getPreviousCommissionPeriod (commissionType, currentPeriod) {
    let currentStartTime = new Date(currentPeriod.startTime);
    let previousDay = new Date(currentStartTime).setMinutes(currentStartTime.getMinutes() - 5);
    return getTargetCommissionPeriod(commissionType, new Date(previousDay));
}

function getPreviousThreeDetailIfExist (partnerObjId, commissionType, startTime) {
    let pastThreeActiveDownLines = [];
    let pastThreeNettCommission = [];
    startTime = new Date(startTime);
    let firstLastPeriod = getTargetCommissionPeriod(commissionType, new Date(new Date(startTime).setMinutes(startTime.getMinutes()-5)));
    let secondLastPeriod = getTargetCommissionPeriod(commissionType, new Date(new Date(firstLastPeriod.startTime).setMinutes(firstLastPeriod.startTime.getMinutes()-5)));
    let thirdLastPeriod = getTargetCommissionPeriod(commissionType, new Date(new Date(secondLastPeriod.startTime).setMinutes(secondLastPeriod.startTime.getMinutes()-5)));

    let firstLastRecordProm = dbPartner.findPartnerCommissionLog({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(firstLastPeriod.startTime),
        endTime: new Date(firstLastPeriod.endTime)
    }, true);
    let secondLastRecordProm = dbPartner.findPartnerCommissionLog({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(secondLastPeriod.startTime),
        endTime: new Date(secondLastPeriod.endTime)
    }, true);
    let thirdLastRecordProm = dbPartner.findPartnerCommissionLog({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(thirdLastPeriod.startTime),
        endTime: new Date(thirdLastPeriod.endTime)
    }, true);

    return Promise.all([firstLastRecordProm, secondLastRecordProm, thirdLastRecordProm]).then(
        records => {
            records.map(record => {
                if  (!record) {
                    pastThreeActiveDownLines.push("-");
                    pastThreeNettCommission.push("-");
                }
                else if (record.status === constPartnerCommissionLogStatus.SKIPPED) {
                    pastThreeActiveDownLines.push("SKIP");
                    pastThreeNettCommission.push("SKIP");
                }
                else {
                    pastThreeActiveDownLines.push(record.activeDownLines);
                    pastThreeNettCommission.push(record.nettCommission);
                }
            });

            return {
                pastThreeActiveDownLines,
                pastThreeNettCommission
            }
        }
    );
}

function censoredPlayerName(name) {
    let censoredName, front, censor = "***", rear;
    front = name.substr(0, 2);
    rear = name.substr(5);
    censoredName = front + censor + rear;
    censoredName = censoredName.substr(0, name.length);
    return censoredName;
}

function billBoardAmtRankingNoPeriod (platformObj, partnerObj, totalRecord, objectField, sortOrder, playerDataField) {
    let returnData = {};
    returnData[objectField] = {};
    returnData[objectField].boardRanking = [];
    let groupQuery = {
        $group: {
            _id: "$partner"
        }
    }
    groupQuery.$group.amount = {$sum: '$' + playerDataField};

    return dbconfig.collection_players.aggregate([
        {
            $match: {
                $and: [
                    {partner: {$exists: true}},
                    {partner: {$ne: null}}
                ],
                platform: platformObj._id
            }
        },
        groupQuery,
        {
            $sort: {
                'amount':sortOrder
            }
        }
    ]).then(
        allRankingData => {
            if (allRankingData && allRankingData.length) {
                let partnerRanking;
                for (let i = 0; i < allRankingData.length; i++) {
                    allRankingData[i].rank = i + 1;
                    if (partnerObj && partnerObj._id && allRankingData[i]._id.toString() == partnerObj._id.toString()) {
                        delete allRankingData[i]._id;
                        allRankingData[i].name = partnerObj.partnerName? partnerObj.partnerName: " ";
                        partnerRanking = allRankingData[i];
                    }
                }

                if (allRankingData.length > totalRecord) {
                    allRankingData.length = totalRecord;
                }

                if (allRankingData && allRankingData.length) {
                    return dbconfig.collection_partner.populate(allRankingData, {
                        path: '_id',
                        model: dbconfig.collection_partner,
                        select: "partnerName"
                    }).then(
                        populatedData => {
                            for (let i = 0; i < populatedData.length; i++) {
                                if (populatedData[i]._id && populatedData[i]._id.partnerName) {
                                    populatedData[i].name = censoredPlayerName(populatedData[i]._id.partnerName);
                                    delete populatedData[i]._id;
                                }
                            }
                            if (partnerObj) {
                                returnData[objectField].partnerRanking = {};
                                if (partnerRanking) {
                                    returnData[objectField].partnerRanking = partnerRanking;
                                } else {
                                    returnData[objectField].partnerRanking.error = "No record for this partner";
                                }
                            }

                            returnData[objectField].boardRanking = populatedData;
                            return returnData;
                        }
                    );
                }
            } else {
                return returnData;
            }
        }
    )
}



function billBoardAmtRanking (platformObj, partnerObj, recordDate, totalRecord, objectField, isReverseSort) {
    let allPlayerObj = [];
    let returnData = {};
    returnData[objectField] = {};
    returnData[objectField].boardRanking = [];
    let stream = dbconfig.collection_players.find({
        $and: [
        {partner: {$exists: true}},
        {partner: {$ne: null}}
        ],
        platform: platformObj._id
    }, {partner: 1}).cursor({batchSize: 100});
    // let stream = query.cursor({batchSize: 100}).allowDiskUse(true).exec();
    let balancer = new SettlementBalancer();
    var res = [];
    return balancer.initConns().then(function () {
        return Q(
            balancer.processStream(
                {
                    stream: stream,
                    // batchSize: 1,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        allPlayerObj = allPlayerObj.concat(playerIdObjs);
                        request("player", "settlePartnersBillBoard", {
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            }),
                            type: objectField,
                            startTime: recordDate.startTime,
                            endTime: recordDate.endTime
                        });
                    },
                    processResponse: function (record) {
                        res = res.concat(record.data);
                    }
                }
            )
        );
    }).then(
        () => {
            let partnerAmtObj = {};
            let rankingArr = [];
            let partnerRanking;
            for (let i = 0; i < res.length; i++) {
                if (res[i].length && res[i][0]._id) {
                    for (let j = 0; j < allPlayerObj.length; j++) {
                        if (!partnerAmtObj[allPlayerObj[j].partner.toString()]) {
                            partnerAmtObj[allPlayerObj[j].partner.toString()] = {
                                partner: allPlayerObj[j].partner,
                                amount: 0
                            }
                        }
                        if (res[i][0]._id.toString() == allPlayerObj[j]._id.toString()) {
                            partnerAmtObj[allPlayerObj[j].partner.toString()].amount += res[i][0].amount;
                        }
                    }
                }
            }
            if (allPlayerObj.length && !Object.keys(partnerAmtObj).length) {
                for (let k = 0; k < allPlayerObj.length; k++) {
                    if (!partnerAmtObj[allPlayerObj[k].partner.toString()]) {
                        partnerAmtObj[allPlayerObj[k].partner.toString()] = {
                            partner: allPlayerObj[k].partner,
                            amount: 0
                        }
                    }
                }
            }
            for (let l = 0; l < Object.keys(partnerAmtObj).length; l++) {
                rankingArr.push(partnerAmtObj[Object.keys(partnerAmtObj)[l]]);
            }

            function sortRankingRecord(a, b) {
                if (a.amount < b.amount) {
                    if (isReverseSort) {
                        return -1;
                    }
                    return 1;
                }
                if (a.amount > b.amount) {
                    if (isReverseSort) {
                        return 1;
                    }
                    return -1;
                }
                if (a.amount == b.amount) {
                    if (a.partner && b.partner) {
                        if (a.partner.toString() < b.partner.toString()) {
                            return -1;
                        }
                        if (a.partner.toString() > b.partner.toString()) {
                            return 1;
                        }
                    }
                }
                return 0;
            }

            let sortedData = rankingArr.sort(sortRankingRecord);
            for (let i = 0; i < sortedData.length; i++) {
                sortedData[i].rank = i + 1;
                if (sortedData[i].createTime) {
                    delete sortedData[i].createTime;
                }
                if (partnerObj && partnerObj._id && sortedData[i].partner.toString() == partnerObj._id.toString()) {
                    delete sortedData[i].partner;
                    sortedData[i].name = partnerObj.partnerName? partnerObj.partnerName: " ";
                    partnerRanking = sortedData[i];
                }
            }
            if (sortedData.length > totalRecord) {
                sortedData.length = totalRecord;
            }

            if (sortedData && sortedData.length) {
                return dbconfig.collection_partner.populate(sortedData, {
                    path: 'partner',
                    model: dbconfig.collection_partner,
                    select: "partnerName"
                }).then(
                    populatedData => {
                        // returnData[objectField] = {};
                        for (let i = 0; i < populatedData.length; i++) {
                            if (populatedData[i].partner && populatedData[i].partner.partnerName) {
                                populatedData[i].name = censoredPlayerName(populatedData[i].partner.partnerName);
                                delete populatedData[i].partner;
                            }
                        }
                        if (partnerObj) {
                            returnData[objectField].partnerRanking = {};
                            if (partnerRanking) {
                                returnData[objectField].partnerRanking = partnerRanking;
                            } else {
                                returnData[objectField].partnerRanking.error = "No record for this partner";
                            }
                        }

                        returnData[objectField].boardRanking = populatedData;
                        return returnData;
                    }
                );
            } else {
                // return Promise.reject({name: "DataError", message: "No record to show"});
                return returnData;
            }

        }
    )
}

function getActivePlayerInfo (player, startTime, endTime, activePlayerRequirement, providerGroups) {
    let consumptionDetailProm = getPlayerCommissionConsumptionDetail(player._id, startTime, endTime, providerGroups);
    let topUpDetailProm = getPlayerCommissionTopUpDetail(player._id, startTime, endTime);

    return Promise.all([consumptionDetailProm, topUpDetailProm]).then(
        data => {
            let consumptionDetail = data[0];
            let topUpDetail = data[1];

            if (activePlayerRequirement) {
                player.active = isPlayerActive(activePlayerRequirement, consumptionDetail.consumptionTimes, consumptionDetail.validAmount, topUpDetail.topUpTimes, topUpDetail.topUpAmount);
            }

            return player;
        }
    )
}

function getCommissionTypeName (commissionType) {
    switch (Number(commissionType)) {
        case 1:
            return "1天-输赢值";
        case 2:
            return "7天-输赢值";
        case 3:
            return "半月-输赢值";
        case 4:
            return "1月-输赢值";
        case 5:
            return "7天-投注额";
    }
}

function getCrewInfo (player, startTime, endTime, activePlayerRequirement, providerGroups, needsDetail, apiName) {
    let playerActiveDetail = {};
    let consumptionDetailProm = getPlayerCommissionConsumptionDetail(player._id, startTime, endTime, providerGroups);
    let topUpDetailProm = getPlayerCommissionTopUpDetail(player._id, startTime, endTime);
    let withdrawalDetailProm = getPlayerCommissionWithdrawDetail(player._id, startTime, endTime);

    return Promise.all([consumptionDetailProm, topUpDetailProm, withdrawalDetailProm]).then(
        data => {
            let consumptionDetail = data[0];
            let topUpDetail = data[1];
            let withdrawalDetail = data[2];

            playerActiveDetail = {
                crewAccount: player.name,
                depositAmount: topUpDetail.topUpAmount,
                depositCount: topUpDetail.topUpTimes,
                validBet: consumptionDetail.validAmount,
                betCounts: consumptionDetail.consumptionTimes,
                withdrawAmount: withdrawalDetail.withdrawalAmount,
                crewProfit: consumptionDetail.bonusAmount,
                needsDetail: needsDetail
            };

            if (activePlayerRequirement) {
                playerActiveDetail.active = isPlayerActive(activePlayerRequirement, consumptionDetail.consumptionTimes, consumptionDetail.validAmount, topUpDetail.topUpTimes, topUpDetail.topUpAmount);
            }

            if (providerGroups && providerGroups[0] && consumptionDetail.consumptionProviderDetail && consumptionDetail.consumptionProviderDetail[providerGroups[0].name]) {
                playerActiveDetail.validBet = consumptionDetail.consumptionProviderDetail[providerGroups[0].name].validAmount;
                playerActiveDetail.betCounts = consumptionDetail.consumptionProviderDetail[providerGroups[0].name].consumptionTimes;
                playerActiveDetail.crewProfit = consumptionDetail.consumptionProviderDetail[providerGroups[0].name].bonusAmount;
            }

            return playerActiveDetail;
        }
    )
}

function getCrewsInfo (players, startTime, endTime, activePlayerRequirement, providerGroups, needsDetail, apiName, platformId, partnerId) {
    let allPlayerDetailsProm = [] ;
    let playerDetailsProm = [] ;

    if(apiName == "getCrewActiveInfo"){
        let consumptionDetailProm = getAllPlayersCommissionConsumptionDetail(partnerId, platformId, startTime, endTime, providerGroups);
        let topUpDetailProm = getAllPlayersCommissionTopUpDetail(partnerId, platformId, startTime, endTime);

        allPlayerDetailsProm = Promise.all([consumptionDetailProm,topUpDetailProm]).then(
            data => {
                let consumptionDetails = data[0];
                let topUpDetails = data[1];
                let newConsumptionDetails = [];
                let newTopUpDetails = [];
                newTopUpDetails = topUpDetails;
                if(consumptionDetails && consumptionDetails.length > 0){
                    consumptionDetails.map(
                        consumption => {
                            if(consumption){
                                topUpDetails.forEach(
                                    topUp => {
                                        if(topUp){
                                            let newConsumption = {};
                                            let newTopUp = {};
                                            newConsumption = consumption;

                                            if(String(consumption._id.playerId) === String(topUp._id.playerId)){
                                                newConsumption.topUpTimes = topUp.topUpTimes || 0;
                                                newConsumption.topUpAmount = topUp.topUpAmount || 0;
                                                newConsumptionDetails.push(newConsumption);

                                                let indexNo = newTopUpDetails.findIndex(n => n._id.playerId);
                                                newTopUpDetails.splice(indexNo,1)
                                                delete topUp;

                                            }
                                        }
                                    }
                                )
                            }
                        }
                    );
                }

                let consumpTopUpObj = newConsumptionDetails.concat(newTopUpDetails);
                let totalActive = 0;
                if(consumpTopUpObj && consumpTopUpObj.length > 0){
                    if (activePlayerRequirement) {
                        consumpTopUpObj.forEach(result => {
                            if(result) {
                                totalActive += isPlayerActive(activePlayerRequirement, result.consumptionTimes, result.validAmount, result.topUpTimes, result.topUpAmount) ? 1 : 0;
                            }
                        })
                    }
                }

                return {totalActiveCrew: totalActive};
            }
        );

    }else if(apiName == "getCrewDepositInfo"){
        allPlayerDetailsProm = getAllPlayersCommissionTopUpDetail(partnerId, platformId, startTime, endTime).then(
            topUpDetail => {
                let totalDepositAmount = 0;
                topUpDetail.map(detail => {
                    totalDepositAmount += detail.topUpAmount || 0;
                })

                return {totalDepositCrew: topUpDetail.length ||0, totalDepositAmount: totalDepositAmount}
            }
        );
    }else if(apiName == "getCrewWithdrawInfo"){
        allPlayerDetailsProm = getAllPlayersCommissionWithdrawDetail(partnerId, platformId, startTime, endTime).then(
            withdrawalDetail => {
                let totalWithdrawAmount = 0;
                withdrawalDetail.map(detail => {
                    totalWithdrawAmount += detail.withdrawAmount || 0;
                })

                return {totalWithdrawCrew: withdrawalDetail.length ||0, totalWithdrawAmount: totalWithdrawAmount}
            }
        );
    }else if(apiName == "getCrewBetInfo"){
        allPlayerDetailsProm = getAllPlayersCommissionConsumptionDetail(partnerId, platformId, startTime, endTime, providerGroups).then(
            consumptionDetail => {
                let totalValidBet = 0;
                let totalCrewProfit = 0;
                let totalCrewNumber = 0;

                if(providerGroups && providerGroups.length > 0){
                    consumptionDetail.map(providerConsumptionData => {
                        if (providerGroups && providerGroups.length > 0) {
                            providerGroups.map(group => {
                                group.providers.map(groupProviderId => {
                                    if (String(groupProviderId) === String(providerConsumptionData.provider)) {
                                        totalCrewNumber ++;
                                        totalValidBet += providerConsumptionData.validAmount;
                                        totalCrewProfit += providerConsumptionData.bonusAmount;
                                    }
                                });
                            });
                        }
                    });
                }else{
                    consumptionDetail.map(detail => {
                        totalCrewNumber ++;
                        totalValidBet += detail.validAmount || 0;
                        totalCrewProfit += detail.bonusAmount || 0;
                    })

                }

                return {totalBetCrew: totalCrewNumber ||0, totalValidBet: totalValidBet, totalCrewProfit: totalCrewProfit}
            }
        );
    }

    if(needsDetail === true || needsDetail === "true"){
        players.map(player => {
            let prom = getCrewInfo(player, startTime, endTime, activePlayerRequirement, providerGroups, needsDetail, apiName);
            playerDetailsProm.push(prom);
        });
    }

    return Promise.all([allPlayerDetailsProm, Promise.all(playerDetailsProm)]);
}

function getPartnerCrewsData (platformId, partnerId, playerId, crewAccount) {
    let platform = {};
    let partner = {};
    let downLines = [];

    return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
        platformData => {
            if (!platformData) {
                return Promise.reject({
                    code: constServerCode.INVALID_PLATFORM,
                    name: "DataError",
                    message: "Cannot find platform"
                });
            }

            platform = platformData;

            return dbconfig.collection_partner.findOne({platform: platform._id, partnerId: partnerId}).lean();
        }
    ).then(
        partnerData => {
            if (!partnerData) {
                return Promise.reject({
                    code: constServerCode.PARTNER_NAME_INVALID,
                    name: "DataError",
                    message: "Cannot find partner"
                });
            }

            partner = partnerData;
            if(playerId){
                return dbconfig.collection_players.find({platform: platform._id, partner: partner._id, playerId: playerId}).lean();
            }
            else if(crewAccount){
                return dbconfig.collection_players.find({platform: platform._id, partner: partner._id, name: crewAccount}).lean();
            }
            else{
                return dbconfig.collection_players.find({platform: platform._id, partner: partner._id}).lean();
            }
        }
    ).then(
        downLineData => {
            if (!downLineData || downLineData.length < 1) {
                if(playerId || crewAccount){
                    return Promise.reject({
                        code: constServerCode.PLAYER_NAME_INVALID,
                        name: "DataError",
                        message: "Player not found"
                    });
                }
                downLineData = [];
            }

            downLines = downLineData;

            return {
                platform,
                partner,
                downLines
            };
        }
    );
}

function getCrewDetail (player, startTime, endTime) {
    let returnData = {};
    let consumptionDetailProm = getPlayerCommissionConsumptionDetail(player._id, startTime, endTime);
    let topUpDetailProm = getCrewTopUpDetail(player._id, startTime, endTime);
    let withdrawalDetailProm = getPlayerCommissionWithdrawDetail(player._id, startTime, endTime);


    return Promise.all([consumptionDetailProm, topUpDetailProm, withdrawalDetailProm]).then(
        data => {
            let consumptionDetail = data[0];
            let topUpDetail = data[1];
            let withdrawalDetail = data[2];

            returnData = {
                playerId: player.playerId,
                crewAccount: player.name,
                crewRegisterTime: player.registrationTime,
                crewLastLoginTime: player.lastAccessTime,
                depositAmount: topUpDetail.length && topUpDetail[0].topUpAmount? topUpDetail[0].topUpAmount: 0,
                depositCount: topUpDetail.length && topUpDetail[0].topUpTimes? topUpDetail[0].topUpTimes: 0,
                validBet: consumptionDetail.validAmount,
                betCounts: consumptionDetail.consumptionTimes,
                withdrawAmount: withdrawalDetail.withdrawalAmount,
                crewProfit: consumptionDetail.bonusAmount,
            };

            return returnData;
        }
    )
}

function getCrewsDetail (players, startTime, endTime) {
    let playerDetailsProm = [] ;
    players.map(player => {
        let prom = getCrewDetail(player, startTime, endTime);
        playerDetailsProm.push(prom);
    });

    return Promise.all(playerDetailsProm);
}

function getCrewTopUpDetail (playerObjId, startTime, endTime) {
    return dbconfig.collection_playerTopUpRecord.aggregate([
        {
            $match : {
                playerId: playerObjId,
                createTime: {$gte: startTime, $lt: endTime}
            }
        },
        {
            $group: {
                _id: "$playerId",
                topUpTimes: {$sum: 1},
                topUpAmount: {$sum: "$amount"}
            }
        }
    ]).read("secondaryPreferred")
}

function getCustomizeRatePartner(query) {
    let commissionConfigProm = dbconfig.collection_partnerCommissionConfig.find(query, {_id:0, partner:1}).lean();
    let commissionRateConfigProm = dbconfig.collection_partnerCommissionRateConfig.find(query, {_id:0, partner:1}).lean();

    return Promise.all([commissionConfigProm, commissionRateConfigProm]).then(
        data => {
            if (!data || data[0] || data [1]) {
                let commissionConfigPartner = data[0], commissionRateConfigPartner = data[1];
                return commissionConfigPartner.concat(commissionRateConfigPartner.filter(function (item) {
                    return commissionConfigPartner.indexOf(item) < 0;
                }));
            }
        }
    );
}

function rearrangePartnerDetail(partnerList, platformId) {
    let partnerObjIds = [];

    for (let i = 0; i < partnerList.length; i++) {
        if (partnerList[i].phoneNumber) {
            partnerList[i].phoneNumber = dbutility.encodePhoneNum(partnerList[i].phoneNumber);
        }

        if (partnerList[i] && partnerList[i]._id) {
            partnerObjIds.push(ObjectId(partnerList[i]._id));
        }
    }

    if (platformId && partnerObjIds && partnerObjIds.length > 0) {
        let query = {
            platform: ObjectId(platformId),
            partner: {$in: partnerObjIds}
        }

        let customizeRatePartnerProm = getCustomizeRatePartner(query);

        return Promise.all([customizeRatePartnerProm]).then(
            customizeRatePartner => {
                if (customizeRatePartner && customizeRatePartner[0] && customizeRatePartner[0].length > 0) {
                    customizeRatePartner[0].forEach(data => {
                        let indexNo = partnerList.findIndex(x => x && x._id && data.partner && (x._id.toString() == data.partner.toString()));

                        if(indexNo != -1) {
                            partnerList[indexNo].isCustomizeSettingExist = true;
                        }
                    });

                    return partnerList;
                } else {
                    return partnerList;
                }

            }
        )
    }

    return partnerList;
}

var proto = dbPartnerFunc.prototype;
proto = Object.assign(proto, dbPartner);
module.exports = dbPartner;

function clearCustomizedPartnerCommissionConfig (platform, commissionType, provider) {
    let query = {platform, commissionType, partner: {$exists: true}};
    if (provider) {
        query.provider = provider;
    }
    return dbconfig.collection_partnerCommissionConfig.remove(query);
}

function getAllPlayerCommissionRawDetailsWithSettlement (players, commissionType, startTime, endTime, providerGroups, topUpTypes, rewardTypes, activePlayerRequirement) {
    let playerObjIdArr = [];
    let details = [];
    players.map(player => {
        playerObjIdArr.push(player._id);
    });

    let stream = dbconfig.collection_players.find({_id: {$in: playerObjIdArr}},{_id: 1}).cursor({batchSize: 500});
    let balancer = new SettlementBalancer();

    return balancer.initConns().then(function () {
        return Q(
            balancer.processStream(
                {
                    stream: stream,
                    batchSize: constSystemParam.BATCH_SIZE,
                    makeRequest: function (playerIdObjs, request) {
                        request("player", "getAllPlayerCommissionRawDetails", {
                            playerObjIds: playerIdObjs.map(function (playerIdObj) {
                                return playerIdObj._id;
                            }),
                            commissionType,
                            startTime,
                            endTime,
                            providerGroups,
                            topUpTypes,
                            rewardTypes,
                            activePlayerRequirement
                        });
                    },
                    processResponse: function (record) {
                        details = details.concat(record.data);
                    }
                }
            )
        );
    }).then(
        () => {
            return details;
        }
    );
}

function applyCommissionToPartner (logObjId, settleType, remark, adminInfo) {
    let log = {};

    return dbPartner.findPartnerCommissionLog({_id: logObjId}, true).then(
        logData => {
            if (!logData) {
                return Promise.reject({
                    message: "Error in getting partner commission log."
                });
            }

            log = logData;

            let resetProm = Promise.resolve();
            if (settleType === constPartnerCommissionLogStatus.RESET_THEN_EXECUTED) {
                remark = "结算前清空馀额：" + remark;
                resetProm = dbPartner.applyClearPartnerCredit(log.partner, log, adminInfo.name, remark);
            }
            return resetProm;
        }
    ).then(
        resetProposal => {
            updateCommissionLogStatus(log, settleType, remark).catch(errorUtils.reportError);
            if (resetProposal && resetProposal.proposalId) {
                remark = "(" + resetProposal.proposalId + ") "+ remark;
            }
            if (settleType === constPartnerCommissionLogStatus.EXECUTED_THEN_RESET) {
                remark = "结算后清空馀额：" + remark;
            }

            if (settleType != constPartnerCommissionLogStatus.SKIPPED) {
                return applyPartnerCommissionSettlement(log, settleType, adminInfo, remark);
            }
        }
    ).then(
        proposal => {

            if (log && log.parentPartnerCommissionDetail && Object.keys(log.parentPartnerCommissionDetail) && Object.keys(log.parentPartnerCommissionDetail).length > 0
                && proposal && proposal.proposalId && settleType != constPartnerCommissionLogStatus.SKIPPED) {
                updateParentPartnerCommission(log, adminInfo, proposal.proposalId).catch(error => {
                    console.trace("Update parent partner commission");
                    return errorUtils.reportError(error);
                })
            }

            return proposal;
        }
    );
}

function createPartnerLargeWithdrawalLog (proposalData, platformObjId) {
    let log;
    return dbconfig.collection_partnerLargeWithdrawalLog({
        platform: platformObjId,
        proposalId: proposalData.proposalId
    }).save().then(logData => {
        log = logData;
        return dbconfig.collection_proposal.findOneAndUpdate({_id: proposalData._id, createTime: proposalData.createTime}, {"data.partnerLargeWithdrawalLog": log._id}, {new: true}).lean();
    }).then(
        proposal => {
            if (proposal) {
                return dbLargeWithdrawal.fillUpPartnerLargeWithdrawalLogDetail(log._id);
            } else {
                return Promise.reject({message: "Save to proposal failed"}); // the only time here is reach are when there is bug
            }
        }
    );
}

// partner all commission amount (include first level partner commission)
function getPartnerAllCommissionAmount (platformObjId, partnerObjId, currentWithdrawCreateTime) {
    return  dbconfig.collection_proposalType.findOne({
        platformId: platformObjId,
        name: constProposalType.PARTNER_BONUS
    }).lean().then(
        proposalType => {
            return dbconfig.collection_proposal.findOne({
                'data.partnerObjId': partnerObjId,
                type: proposalType._id,
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: -1}).lean();
        }).then(
        withdrawalData => {
            if (!withdrawalData) {
                return Promise.reject({name: "DataError", message: "Cannot find proposals"})
            }

            return dbconfig.collection_proposalType.find({
                platformId: platformObjId,
                name: {$in: [constProposalType.UPDATE_PARENT_PARTNER_COMMISSION, constProposalType.SETTLE_PARTNER_COMMISSION]}
            }, {_id: 1}).lean().then(
                proposalType => {
                    if (!(proposalType && proposalType.length)) {
                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                    }

                    return dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: {$in: proposalType.map(item => item._id)},
                                createTime: {
                                    $gte: withdrawalData.createTime,
                                    $lt: currentWithdrawCreateTime
                                },
                                'data.partnerObjId': partnerObjId,
                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                            }
                        },
                        {
                            $group: {
                                _id: "$data.partnerObjId",
                                amount: {$sum: "$data.amount"}
                            }
                        }
                    );
                }
            );
        }
    ).catch(errorUtils.reportError);
}
