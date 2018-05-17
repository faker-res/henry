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
let ObjectId = mongoose.Types.ObjectId;

let env = require('../config/env').config();

let SettlementBalancer = require('../settlementModule/settlementBalancer');

const constPlayerLevelPeriod = require('../const/constPlayerLevelPeriod');
const constPartnerCommissionPeriod = require('../const/constPartnerCommissionPeriod');
const constPartnerCommissionType = require('../const/constPartnerCommissionType');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constPartnerCommissionSettlementMode = require('../const/constPartnerCommissionSettlementMode');
const constPartnerStatus = require('../const/constPartnerStatus');
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
const constPartnerCommissionLogStatus = require("../const/constPartnerCommissionLogStatus");


let dbPartner = {

    createPartnerAPI: function (partnerData) {
        let platformData;
        return dbconfig.collection_platform.findOne({platformId: partnerData.platformId}).then(
            platformDataResult => {
                platformData = platformDataResult;
                if (platformData) {
                    if (!platformData.partnerRequireSMSVerification) {
                        return true;
                    }
                    return dbPlayerMail.verifySMSValidationCode(partnerData.phoneNumber, platformData, partnerData.smsCode, null, true);
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

                    if (platformData.partnerWhiteListingPhoneNumbers
                        && platformData.partnerWhiteListingPhoneNumbers.length > 0
                        && partnerData.phoneNumber
                        && platformData.partnerWhiteListingPhoneNumbers.indexOf(partnerData.phoneNumber) > -1)
                        return {isPhoneNumberValid: true};

                    if (platformData.partnerAllowSamePhoneNumberToRegister === true) {
                        return dbPartner.isExceedPhoneNumberValidToRegister({
                            phoneNumber: rsaCrypto.encrypt(partnerData.phoneNumber),
                            platform: partnerData.platform
                        }, platformData.partnerSamePhoneNumberRegisterCount);
                        // return {isPhoneNumberValid: true};
                    } else {
                        return dbPartner.isPhoneNumberValidToRegister({
                            phoneNumber: rsaCrypto.encrypt(partnerData.phoneNumber),
                            platform: partnerData.platform
                        });
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        ).then(
            (data) => {
                if (data.isPhoneNumberValid) {
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

        if (!partnerdata.platform) {
            return Q.reject({
                name: "DataError",
                message: "You did not provide the 'platform' (ObjectId) field for the new partner"
            });
        }

        partnerdata.isNewSystem = true;

        // Player name should be alphanumeric and max 15 characters
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

                    if (platformData.partnerDefaultCommissionGroup && !partnerdata.commissionType) {
                        partnerdata.commissionType = platformData.partnerDefaultCommissionGroup;
                    };
                    // attach platform prefix to player name if available
                    if (platform.partnerPrefix) {
                        partnerdata.partnerName = platform.partnerPrefix + partnerdata.partnerName;
                    }

                    if ((platformData.partnerNameMaxLength > 0 && partnerdata.partnerName.length > platformData.partnerNameMaxLength) || (platformData.partnerNameMinLength > 0 && partnerdata.partnerName.length < platformData.partnerNameMinLength)) {
                        deferred.reject({
                            name: "DataError",
                            message: "Partner Name length is not valid"
                        });
                        return Promise.reject(new Error());
                    }

                    if (platformData.partnerWhiteListingPhoneNumbers
                        && platformData.partnerWhiteListingPhoneNumbers.length > 0
                        && partnerdata.phoneNumber
                        && platformData.partnerWhiteListingPhoneNumbers.indexOf(partnerdata.phoneNumber) > -1)
                        return {isPhoneNumberValid: true};

                    if (platformData.partnerAllowSamePhoneNumberToRegister === true) {
                        return dbPartner.isExceedPhoneNumberValidToRegister({
                            phoneNumber: rsaCrypto.encrypt(partnerdata.phoneNumber),
                            platform: partnerdata.platform
                        }, platformData.partnerSamePhoneNumberRegisterCount);
                        // return {isPhoneNumberValid: true};
                    } else {
                        return dbPartner.isPhoneNumberValidToRegister({
                            phoneNumber: rsaCrypto.encrypt(partnerdata.phoneNumber),
                            platform: partnerdata.platform
                        });
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
        dbUtil.getGeoIp(ip).then(
            data => {
                if (data) {
                    return dbconfig.collection_partner.findOneAndUpdate(
                        {_id: partnerObjId, platform: platformObjId},
                        data
                    ).then();
                }
            }
        ).catch(errorUtils.reportError);
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
        if (newDomains && Array.isArray(newDomains)) {
            return dbconfig.collection_partner.findOne({_id: partnerObjId}).lean().then(
                partnerData => {
                    if (partnerData) {
                        partnerObj = partnerData;
                        newElements = dbUtil.difArrays(partnerData.ownDomain, newDomains);
                        removedElements = dbUtil.difArrays(newDomains, partnerData.ownDomain);
                        if (newElements && newElements.length > 0) {
                            var newProms = newElements.map(ele => new dbconfig.collection_partnerOwnDomain({name: ele}).save());
                            return Q.all(newProms);
                        }
                    }
                    else {
                        return Q.reject({
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
                        return Q.all(remProms);
                    }
                }
            );
        }
        else {
            return Q.reject({
                name: "DataError",
                message: "Invalid domain data"
            });
        }
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
        return dbconfig.collection_partner.findOne(query).populate({
            path: "level",
            model: dbconfig.collection_partnerLevel
        }).populate({
            path: "player",
            model: dbconfig.collection_players
        }).lean();
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
                    for (let i = 0; i < partners.length; i++) {
                        if (partners[i].phoneNumber) {
                            partners[i].phoneNumber = dbutility.encodePhoneNum(partners[i].phoneNumber);
                        }
                    }
                    return partners;
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
                    for (let i = 0; i < partners.length; i++) {
                        if (partners[i].phoneNumber) {
                            partners[i].phoneNumber = dbutility.encodePhoneNum(partners[i].phoneNumber);
                        }
                    }
                    return partners;
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
            query.phoneNumber = {$in: [rsaCrypto.encrypt(query.phoneNumber), query.phoneNumber]};
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
            partnerInfo = dbconfig.collection_partner.aggregate([
                {$match:query},
                {$project: { childrencount: {$size: { "$ifNull": [ "$children", [] ] }}, "partnerId":1, "partnerName":1 , "realName":1, "phoneNumber":1,
                        "commissionType":1, "credits":1, "registrationTime":1, "lastAccessTime":1, "dailyActivePlayer":1, "weeklyActivePlayer":1,
                        "monthlyActivePlayer":1, "totalPlayerDownline":1, "validPlayers":1, "totalChildrenDeposit":1, "totalChildrenBalance":1, "totalSettledCommission":1, "_id":1, }},
                {$sort:sortObj},
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
                    for (let i = 0; i < partners.length; i++) {
                        if (partners[i].phoneNumber) {
                            partners[i].phoneNumber = dbutility.encodePhoneNum(partners[i].phoneNumber);
                        }
                    }
                    return partners;
                },
                error => {
                    Q.reject({name: "DBError", message: "Error finding partners.", error: error});
                }
            );
        } else {
            //if there is no sorting parameter
            partnerInfo = dbconfig.collection_partner.aggregate([
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
                    for (let i = 0; i < partners.length; i++) {
                        if (partners[i].phoneNumber) {
                            partners[i].phoneNumber = dbutility.encodePhoneNum(partners[i].phoneNumber);
                        }
                    }

                    return partners;
                },
                error => {
                    Q.reject({name: "DBError", message: "Error finding partners.", error: error});
                }
            );
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
    resetPartnerPassword: function (partnerObjId, newPassword) {
        var deferred = Q.defer();

        bcrypt.genSalt(constSystemParam.SALT_WORK_FACTOR, function (err, salt) {
            if (err) {
                deferred.reject({name: "DBError", message: "Error resetting partner password.", error: err});
                return;
            }
            bcrypt.hash(newPassword, salt, function (err, hash) {
                if (err) {
                    deferred.reject({name: "DBError", message: "Error resetting partner password.", error: err});
                    return;
                }
                dbUtil.findOneAndUpdateForShard(
                    dbconfig.collection_partner,
                    {_id: partnerObjId},
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
        return dbconfig.collection_platform.findOne({platformId: partnerData.platformId}).then(
            platformData => {
                if (platformData) {
                    platformObjId = platformData._id;
                    partnerData.prefixName = platformData.partnerPrefix + partnerData.name;
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
                    var geo = geoip.lookup(partnerData.lastLoginIp);
                    var updateData = {
                        isLogin: true,
                        lastLoginIp: partnerData.lastLoginIp,
                        userAgent: newAgentArray,
                        $inc: {loginTimes: 1},
                        lastAccessTime: new Date().getTime(),
                    };
                    var geoInfo = {};
                    if (geo && geo.ll && !(geo.ll[1] == 0 && geo.ll[0] == 0)) {
                        geoInfo = {
                            country: geo ? geo.country : null,
                            city: geo ? geo.city : null,
                            longitude: geo && geo.ll ? geo.ll[1] : null,
                            latitude: geo && geo.ll ? geo.ll[0] : null
                        }
                    }
                    Object.assign(updateData, geoInfo);
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
                        $or: [
                            {phoneNumber: partnerData.phoneNumber},
                            {phoneNumber: rsaCrypto.encrypt(partnerData.phoneNumber)}
                        ],
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
                    let geo = geoip.lookup(partnerData.lastLoginIp);
                    let updateData = {
                        isLogin: true,
                        lastLoginIp: partnerData.lastLoginIp,
                        userAgent: newAgentArray,
                        lastAccessTime: new Date().getTime(),
                    };
                    let geoInfo = {};
                    if (geo && geo.ll && !(geo.ll[1] == 0 && geo.ll[0] == 0)) {
                        geoInfo = {
                            country: geo ? geo.country : null,
                            city: geo ? geo.city : null,
                            longitude: geo && geo.ll ? geo.ll[1] : null,
                            latitude: geo && geo.ll ? geo.ll[0] : null
                        }
                    }
                    Object.assign(updateData, geoInfo);
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
                            Object.assign(recordData, geoInfo);
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
                            if (partnerData.lastLoginIp == partnerIp) {
                                conn.isAuth = true;
                                conn.partnerId = partnerId;
                                deferred.resolve(true);
                            }
                            else {
                                deferred.reject({name: "DataError", message: "Player ip doesn't match!"});
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
                        return dbPlayerMail.verifySMSValidationCode(partnerObj.phoneNumber, platformData, smsCode, null, true);
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
                    partnerObj.password = newPassword;
                    return partnerObj.save();
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

    updatePartnerBankInfo: function (userAgent, partnerId, bankData) {
        let partnerData;
        return dbconfig.collection_partner.findOne({partnerId: partnerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .then(
                partnerResult => {
                    partnerData = partnerResult;
                    if (partnerData && partnerData.platform) {
                        // Check if partner sms verification is required
                        if (!partnerData.platform.partnerRequireSMSVerificationForPaymentUpdate) {
                            // SMS verification not required
                            return Q.resolve(true);
                        } else {
                            return dbPlayerMail.verifySMSValidationCode(partnerData.phoneNumber, partnerData.platform, bankData.smsCode, null, true);
                        }
                    } else {
                        return Q.reject({name: "DataError", message: "Cannot find partner"});
                    }
                }
            ).then(
                () => {
                if (partnerData.bankName || partnerData.bankAccount || partnerData.bankAccountName || partnerData.bankAccountType || partnerData.bankAccountCity || partnerData.bankAddress) {
                    // bankData.partnerName = partnerData.partnerName;
                    // bankData.parternId = partnerData.partnerId;
                    let inputDevice = dbutility.getInputDevice(userAgent,true);
                    return dbProposal.createProposalWithTypeNameWithProcessInfo(partnerData.platform._id, constProposalType.UPDATE_PARTNER_BANK_INFO, {
                        creator: {type: "partner", name: partnerData.partnerName, id: partnerData._id},
                        data: {
                            _id: partnerData._id || "",
                            partnerName: partnerData.partnerName,
                            parternId: partnerData.partnerId,
                            updateData: bankData
                        },
                        inputDevice: inputDevice? inputDevice: 0
                    });
                }
                else {
                    return dbconfig.collection_partner.update(
                        {_id: partnerData._id, platform: partnerData.platform._id},
                        bankData
                    );
                }
            }
        );
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
        var enPhoneNumber = rsaCrypto.encrypt(phoneNumber);
        return dbconfig.collection_partner.findOne({
            _id: partnerObjId,
            phoneNumber: {$in: [phoneNumber, enPhoneNumber]}
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
        let partner = null;
        let bonusDetail = null;
        let bUpdateCredit = false;;
        let resetCredit = function (partnerObjId, platformObjId, credit, error) {
            //reset partner credit if credit is incorrect
            return dbconfig.collection_partner.findOneAndUpdate({
                _id: partnerObjId,
                platform: platformObjId
            }, {$inc: {credits: credit}}).then(
                resetPartner => {
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
        return pmsAPI.bonus_getBonusList({}).then(
            bonusData => {
                if (bonusData && bonusData.bonuses && bonusData.bonuses.length > 0) {
                    let bValid = false;
                    bonusData.bonuses.forEach(
                        bonus => {
                            if (bonus.bonus_id == bonusId) {
                                bValid = true;
                                bonusDetail = bonus;
                            }
                        }
                    );
                    if (bValid) {
                        return dbconfig.collection_partner.findOne({partnerId: partnerId})
                            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
                                partnerData => {
                                    //check if partner has pending proposal to update bank info
                                    if (partnerData) {
                                        return dbconfig.collection_proposalType.findOne({
                                            platformId: partnerData.platform._id,
                                            name: constProposalType.UPDATE_PARTNER_BANK_INFO
                                        }).then(
                                            proposalType => {
                                                if (proposalType) {
                                                    return dbconfig.collection_proposal.find({
                                                        type: proposalType._id,
                                                        "data.partnerName": partnerData.partnerName
                                                    }).populate(
                                                        {path: "process", model: dbconfig.collection_proposalProcess}
                                                    ).lean();
                                                }
                                                else {
                                                    return Q.reject({
                                                        name: "DataError",
                                                        errorMessage: "Cannot find proposal type"
                                                    });
                                                }
                                            }
                                        ).then(
                                            proposals => {
                                                if (proposals && proposals.length > 0) {
                                                    let bExist = false;
                                                    proposals.forEach(
                                                        proposal => {
                                                            if (proposal.status == constProposalStatus.PENDING ||
                                                                ( proposal.process && proposal.process.status == constProposalStatus.PENDING)) {
                                                                bExist = true;
                                                            }
                                                        }
                                                    );
                                                    if (!bExist || bForce) {
                                                        return partnerData;
                                                    }
                                                    else {
                                                        return Q.reject({
                                                            status: constServerCode.PLAYER_PENDING_PROPOSAL,
                                                            name: "DataError",
                                                            errorMessage: "Partner is updating bank info"
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
                                        return Q.reject({name: "DataError", errorMessage: "Cannot find partner"});
                                    }
                                }
                            );
                    }
                    else {
                        return Q.reject({
                            status: constServerCode.INVALID_PARAM,
                            name: "DataError",
                            errorMessage: "Invalid bonus id"
                        });
                    }
                }
                else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot find bonus"});
                }
            }
        ).then(
            partnerData => {
                if (partnerData) {
                    // if (!partnerData.permission || !partnerData.permission.applyBonus) {
                    //     return Q.reject({
                    //         status: constServerCode.PLAYER_NO_PERMISSION,
                    //         name: "DataError",
                    //         errorMessage: "Player does not have this permission"
                    //     });
                    // }
                    if (partnerData.bankName == null || !partnerData.bankAccountName || !partnerData.bankAccountType || !partnerData.bankAccountCity
                        || !partnerData.bankAccount || !partnerData.bankAddress) {
                        return Q.reject({
                            status: constServerCode.PLAYER_INVALID_PAYMENT_INFO,
                            name: "DataError",
                            errorMessage: "Partner does not have valid payment information"
                        });
                    }

                    if (partnerData.permission && !partnerData.permission.applyBonus) {
                        return Q.reject({
                            status: constServerCode.PARTNER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Partner is forbidden to apply bonus"
                        });
                    }

                    //check if partner has enough credit
                    partner = partnerData;
                    if (partnerData.credits < bonusDetail.credit * amount) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                            name: "DataError",
                            errorMessage: "Partner does not have enough credit."
                        });
                    }
                    //check if player credit balance.
                    // if (playerData.creditBalance > 0) {
                    //     return Q.reject({
                    //         status: constServerCode.PLAYER_CREDIT_BALANCE_NOT_ENOUGH,
                    //         name: "DataError",
                    //         errorMessage: "Player does not have enough Expenses."
                    //     });
                    // }
                    return dbconfig.collection_partner.findOneAndUpdate(
                        {
                            _id: partner._id,
                            platform: partner.platform._id
                        },
                        {$inc: {credits: -amount * bonusDetail.credit}},
                        {new: true}
                    ).then(
                        newPartnerData => {
                            if (newPartnerData) {
                                bUpdateCredit = true;

                                if (newPartnerData.credits < 0) {
                                    //credit will be reset below
                                    return Q.reject({
                                        status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                        name: "DataError",
                                        errorMessage: "Partner does not have enough credit.",
                                        data: '(detected after withdrawl)'
                                    });
                                }

                                partner.validCredit = newPartnerData.validCredit;
                                //create proposal
                                let proposalData = {
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
                                    amount: amount,
                                    bonusCredit: bonusDetail.credit,
                                    curAmount: partner.credits,
                                    requestDetail: {bonusId: bonusId, amount: amount, honoreeDetail: honoreeDetail}
                                };
                                let newProposal = {
                                    creator: proposalData.creator,
                                    data: proposalData,
                                    entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                    userType: constProposalUserType.PARTNERS,
                                };
                                newProposal.inputDevice = dbutility.getInputDevice(userAgent,true);
                                return dbProposal.createProposalWithTypeName(partner.platform._id, constProposalType.PARTNER_BONUS, newProposal);
                            }
                        }
                    );
                } else {
                    return Q.reject({name: "DataError", errorMessage: "Cannot find partner"});
                }
            }
        ).then(
            proposal => {
                if (proposal) {
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
            data => data,
            error => {
                if (bUpdateCredit) {
                    return resetCredit(partner._id, partner.platform._id, amount * bonusDetail.credit, error);
                }
                else {
                    return Q.reject(error);
                }
            }
        );
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
                    playerQuery.partner = {$exists: true};
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
                    return dbconfig.collection_partner.findOne({partnerName: data.partnerName}).then(
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
                    matchObj.partner = {$exists: true};
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
        return dbconfig.collection_partner.findOne({partnerName: partnerName}).lean().then(
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

    createUpdatePartnerCommissionConfig: function  (query, data) {
        return dbconfig.collection_partnerCommissionConfig.findOne({platform: query.platform, _id: query._id}).lean().then(
           configData => {
               //check if config exist
               if (!configData) {
                    var newCommissionConfig = new dbconfig.collection_partnerCommissionConfig(data);
                    return newCommissionConfig.save();
               }
               else {
                   delete data._id;
                   return dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(query, data);
               }
           });
    },

    getPartnerCommissionConfigWithGameProviderGroup: function (query) {
        return dbconfig.collection_partnerCommissionConfig.find(query);
    },

    getCustomizeCommissionConfigPartner: function (query) {
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
    },

    createUpdatePartnerCommissionConfigWithGameProviderGroup: function  (query, data) {
        return dbconfig.collection_partnerCommissionConfig.findOne({platform: query.platform, _id: query._id}).lean().then(
            configData => {
                //check if config exist
                if (!configData) {
                    return dbconfig.collection_partnerCommissionConfig(data).save();
                }
                else {
                    delete data._id;
                    return dbconfig.collection_partnerCommissionConfig.findOneAndUpdate(query, data);
                }
            });
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

        let count = dbconfig.collection_partner.find(query).count();
        let detail = dbconfig.collection_partner.find(query).sort(sortCol).skip(index).limit(limit)
            .populate({path: 'parent', model: dbconfig.collection_partner}).lean();

        return Q.all([count, detail]).then(
            data => {
                return {data: data[1], size: data[0]}
            }
        )
    },

    getReferralsList: (partnerArr) => {
        let partnerProm = [];
        partnerArr.forEach(partner => {
            partnerProm.push(dbconfig.collection_players.find({partner: partner._id, platform: partner.platform}).lean())
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

        //         return dbconfig.collection_playerTopUpRecord.aggregate(
        //             {
        //                 $match: {
        //                     playerId: {$in: playerIdList},
        //                     platformId: platformId,
        //                     createTime: {
        //                         $gte: new Date(activeTime.startTime),
        //                         $lt: new Date(activeTime.endTime),
        //                     }
        //                 }
        //
        //             },
        //             {
        //                 $group: {
        //                     _id: "$playerId",
        //                     topUpAmount: {$sum: "$amount"},
        //                     topUpCount: {$sum: 1}
        //                 }
        //             }).read("secondaryPreferred").then(topUpRecord => {
        //             if (topUpRecord) {
        //                 topUpRecord = topUpRecord.filter(player => player.topUpAmount >= activePlayerTopUpAmount && player.topUpCount >= activePlayerTopUpTimes);
        //
        //                 if (topUpRecord && topUpRecord.length > 0 ){
        //
        //                     let playerList = [];
        //                     let topUpPlayerList = [];
        //
        //                     topUpRecord.forEach( record => {
        //                         playerList.push(ObjectId(record._id));
        //                         topUpPlayerList.push(record);
        //                     });
        //
        //                     return dbconfig.collection_playerConsumptionRecord.aggregate(
        //                         {
        //                             $match: {
        //                                 playerId: {$in: playerList},
        //                                 platformId: platformId,
        //                                 createTime: {
        //                                     $gte: new Date(activeTime.startTime),
        //                                     $lt: new Date(activeTime.endTime),
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: "$playerId",
        //                                 consumptionAmount: {$sum: "$validAmount"},
        //                                 consumptionCount: {$sum: 1}
        //                             }
        //                         }).read("secondaryPreferred").then(records => {
        //                             if (records) {
        //                                 records = records.filter(records => records.consumptionCount >= activePlayerConsumptionTimes && records.consumptionAmount >= activePlayerConsumptionAmount);
        //
        //                                 let consumptionPlayerList = [];
        //                                 if (records && records.length > 0) {
        //
        //                                     records.forEach( record => {
        //
        //                                         let index = topUpPlayerList.findIndex(p => p._id.toString() == record._id.toString());
        //
        //                                         if (index != -1){
        //
        //                                             let playerIndex = partnerDetail.findIndex(q => q._id.toString() == record._id.toString());
        //
        //                                             if(playerIndex != -1){
        //                                                 consumptionPlayerList.push({
        //                                                     _id: record._id,
        //                                                     topUpAmount: topUpPlayerList[index].topUpAmount,
        //                                                     topUpCount: topUpPlayerList[index].topUpCount,
        //                                                     consumptionAmount: record.consumptionAmount,
        //                                                     consumptionCount: record.consumptionCount,
        //                                                     valueScore: partnerDetail[playerIndex].valueScore,
        //                                                     realName: partnerDetail[playerIndex].realName,
        //                                                     name: partnerDetail[playerIndex].name
        //                                                 })
        //                                             }
        //
        //                                         }
        //
        //                                     })
        //
        //                                     switch (period) {
        //                                         case 'day':
        //                                             dbconfig.collection_partner.findOneAndUpdate(
        //                                                 {
        //                                                     _id: partnerId,
        //                                                     platform: platformId,
        //                                                 },
        //                                                 {
        //                                                     $set: {dailyActivePlayer: records.length}
        //                                                 }
        //                                             ).exec();
        //                                             break;
        //                                         case 'week':
        //                                             dbconfig.collection_partner.findOneAndUpdate(
        //                                                 {
        //                                                     _id: partnerId,
        //                                                     platform: platformId,
        //                                                 },
        //                                                 {
        //                                                     $set: {weeklyActivePlayer: records.length}
        //                                                 }
        //                                             ).exec();
        //                                             break;
        //                                         case 'month':
        //                                         default:
        //                                             dbconfig.collection_partner.findOneAndUpdate(
        //                                                 {
        //                                                     _id: partnerId,
        //                                                     platform: platformId,
        //                                                 },
        //                                                 {
        //                                                     $set: {monthlyActivePlayer: records.length}
        //                                                 }
        //                                             ).exec();
        //                                             break;
        //                                     }
        //                                     return {partnerId: partnerId, size: records.length, downLiner: consumptionPlayerList}
        //                                 }
        //                                 else{
        //                                     return {partnerId: partnerId, size: 0, downLiner: consumptionPlayerList}
        //                                 }
        //                             }
        //                         }
        //                     )
        //                 }
        //                 else{
        //                     return {partnerId: partnerId, size: 0, downLiner: []}
        //                 }
        //
        //             }
        //         })
        //
        //     });
        // }
        // else{
        //     // for those partner that does not have downline
        //     return {partnerId: partnerId, size: 0, downLiner: []}
        // }
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

        //         return dbconfig.collection_playerTopUpRecord.aggregate(
        //             {
        //                 $match: {
        //                     playerId: {$in: playerIdList},
        //                     platformId: platformId,
        //                 }
        //             },
        //             {
        //                 $group: {
        //                     _id: "$playerId",
        //                     topUpAmount: {$sum: "$amount"},
        //                     topUpCount: {$sum: 1}
        //                 }
        //             }).read("secondaryPreferred").then(topUpRecord => {
        //             if (topUpRecord) {
        //                 topUpRecord = topUpRecord.filter(player => player.topUpAmount >= validPlayerTopUpAmount && player.topUpCount >= validPlayerTopUpTimes);
        //
        //                 if (topUpRecord && topUpRecord.length > 0){
        //                     let playerList = [];
        //                     let topUpPlayerList = [];
        //
        //                     topUpRecord.forEach( record => {
        //                         playerList.push(ObjectId(record._id));
        //                         topUpPlayerList.push(record);
        //                     });
        //
        //                     return dbconfig.collection_playerConsumptionRecord.aggregate(
        //                         {
        //                             $match: {
        //                                 playerId: {$in: playerList},
        //                                 platformId: platformId,
        //                             }
        //                         },
        //                         {
        //                             $group: {
        //                                 _id: "$playerId",
        //                                 consumptionAmount: {$sum: "$validAmount"},
        //                                 consumptionCount: {$sum: 1}
        //                             }
        //                         }).read("secondaryPreferred").then(records => {
        //                             records = records.filter(records => records.consumptionCount >= validPlayerConsumptionTimes && records.consumptionAmount >= validPlayerConsumptionAmount);
        //
        //                             if (records && records.length > 0){
        //
        //                                 let consumptionPlayerList = [];
        //                                 records.forEach( record => {
        //
        //                                     let index = topUpPlayerList.findIndex(p => p._id.toString() == record._id.toString());
        //
        //                                     if (index != -1){
        //
        //                                         let playerIndex = partnerDetail.findIndex(q => q._id.toString() == record._id.toString());
        //
        //                                         if(playerIndex != -1){
        //                                             if (partnerDetail[playerIndex].valueScore >= validPlayerValue){
        //                                                 consumptionPlayerList.push({
        //                                                     _id: record._id,
        //                                                     topUpAmount: topUpPlayerList[index].topUpAmount,
        //                                                     topUpCount: topUpPlayerList[index].topUpCount,
        //                                                     consumptionAmount: record.consumptionAmount,
        //                                                     consumptionCount: record.consumptionCount,
        //                                                     valueScore: partnerDetail[playerIndex].valueScore,
        //                                                     realName: partnerDetail[playerIndex].realName,
        //                                                     name: partnerDetail[playerIndex].name
        //                                                 })
        //                                             }
        //
        //                                         }
        //
        //                                     }
        //
        //                                 })
        //
        //                                 dbconfig.collection_partner.findOneAndUpdate(
        //                                     {
        //                                         _id: partnerId,
        //                                         platform: platformId,
        //                                     },
        //                                     {
        //                                         $set: {validPlayers: consumptionPlayerList.length}
        //                                     },
        //                                     {new: true}
        //                                 ).exec();
        //
        //                                 return {partnerId: partnerId, size: consumptionPlayerList.length, downLiner: consumptionPlayerList}
        //                             }
        //                             else{
        //                                 return {partnerId: partnerId, size: 0, downLiner: []}
        //                             }
        //
        //                         }
        //                     )
        //                 }
        //                 else{
        //                     return {partnerId: partnerId, size: 0, downLiner: []}
        //                 }
        //
        //             }
        //         })
        //
        //     });
        // }
        // else{
        //     return {partnerId: partnerId, size: 0, downLiner: []}
        // }
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

        return dbconfig.collection_players.find({platform: platform, partner: ObjectId(partnerId)}).lean().then(
            playerDetails => {
                if(playerDetails){
                    let calculatedDetailsProm = [];

                    playerDetails.map(
                        player => {
                            if(player){
                                calculatedDetailsProm.push(dbPartner.getPlayerCalculatedDetails(player));
                            }
                        }
                    )

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

        return Promise.all([getPlayerTopUpDetailsProm, getPlayerBonusDetailsProm]).then(
            result => {
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
                        playerObj.totalBonus = bonusDetails.totalBonusAmount;
                        playerObj.totalDepositAmount = playerObj.topUpSum - bonusDetails.totalBonusAmount;
                    }

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
                    return dbconfig.collection_proposal.aggregate(
                        {
                            $match: {
                                type: proposalType._id,
                                'data.playerObjId': playerObjId,
                                status: constProposalStatus.APPROVED
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

    customizePartnerCommission: (partnerObjId, settingObjId, field, oldConfig, newConfig, isPlatformRate, isRevert, isDelete, adminInfo) => {
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
                        isDelete: isDelete
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
        return dbPartner.calculatePartnerCommissionDetail(partnerObjId, commissionType, startTime, endTime)
            .then(
            commissionDetail => {
                return dbconfig.collection_partnerCommissionLog.findOneAndUpdate({
                    partner: commissionDetail.partner,
                    platform: commissionDetail.platform,
                    startTime: startTime,
                    endTime: endTime,
                    commissionType: commissionType,
                }, commissionDetail, {upsert: true, new: true}).lean();
            }
        ).then(
            partnerCommissionLog => {
                updatePastThreeRecord(partnerCommissionLog).catch(errorUtils.reportError);
                return partnerCommissionLog;
            }
        );
    },

    getCurrentPartnerCommissionDetail: function (platformObjId, commissionType, partnerName) {
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

    generateCurrentPartnersCommissionDetail: function (partnerObjIds, commissionType) {
        let currentPeriod = getCurrentCommissionPeriod(commissionType);

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

        let commissionPeriod = getCommissionPeriod(commissionType);
        if (startTime && endTime) {
            commissionPeriod = {
                startTime: startTime,
                endTime: endTime
            };
        }

        let partnerProm = dbconfig.collection_partner.findOne({_id: partnerObjId})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean();

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

                let downLinesRawDetailProms = [];

                downLines.map(player => {
                    let prom = getAllPlayerCommissionRawDetails(player._id, commissionType, commissionPeriod.startTime, commissionPeriod.endTime, providerGroups, paymentProposalTypes, rewardProposalTypes, activePlayerRequirement);
                    downLinesRawDetailProms.push(prom);
                });

                return Promise.all(downLinesRawDetailProms);
            }
        ).then(
            downLinesRawData => {
                downLinesRawCommissionDetail = downLinesRawData;

                activeDownLines = getActiveDownLineCount(downLinesRawCommissionDetail);

                providerGroupConsumptionData = getTotalPlayerConsumptionByProviderGroupName(downLinesRawCommissionDetail, providerGroups);

                commissionRateTables.map(groupRate => {
                    commissionRates[groupRate.groupName] = getCommissionRate(groupRate.rateTable, providerGroupConsumptionData[groupRate.groupName].validAmount, activeDownLines);

                    let totalConsumption = commissionType === constPartnerCommissionType.WEEKLY_CONSUMPTION
                        ? providerGroupConsumptionData[groupRate.groupName].validAmount
                        : -providerGroupConsumptionData[groupRate.groupName].bonusAmount;

                    let platformFeeRateData = {};

                    if (groupRate.groupName == 'noGroup') {
                        platformFeeRateData.rate = partnerCommissionRateConfig.rateAfterRebatePlatform;
                        platformFeeRateData.isCustom = partnerCommissionRateConfig.rateAfterRebatePlatformIsCustom;
                    }
                    else {
                        partnerCommissionRateConfig.rateAfterRebateGameProviderGroup.map(group => {
                            if (group.name === groupRate.groupName) {
                                platformFeeRateData.rate = group.rate;
                                platformFeeRateData.isCustom = Boolean(group.isCustom);
                            }
                        });
                    }

                    let platformFeeRate = Number(platformFeeRateData.rate);
                    let isCustomPlatformFeeRate = platformFeeRateData.isCustom;

                    let rawCommission = calculateRawCommission(totalConsumption, commissionRates[groupRate.groupName].commissionRate);

                    let platformFee =  platformFeeRate * totalConsumption / 100;
                    platformFee = platformFee >= 0 ? platformFee : 0;
                    totalPlatformFee += platformFee;

                    rawCommissions.push({
                        groupName: groupRate.groupName,
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

                return {
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
                    totalPlatformFee: totalPlatformFee,
                    totalTopUp: totalTopUp,
                    totalTopUpFee: totalTopUpFee,
                    totalWithdrawal: totalWithdrawal,
                    totalWithdrawalFee: totalWithdrawalFee,
                    status: constPartnerCommissionLogStatus.PREVIEW,
                    nettCommission: nettCommission,
                };
            }
        );
    },

    getPartnerCommissionLog: function (platformObjId, commissionType, startTime, endTime) {
        return dbconfig.collection_partnerCommissionLog.find({
            "platform": platformObjId,
            commissionType: commissionType,
            startTime: startTime,
            endTime: endTime
        }).lean();
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
            let log = {};

            let prom = dbconfig.collection_partnerCommissionLog.findOne({_id: logObjId}).lean().then(
                logData => {
                    if (!logData) {
                        return Promise.reject({
                            message: "Error in getting partner commission log."
                        });
                    }

                    log = logData;

                    let resetProm = Promise.resolve();
                    if (settleType === constPartnerCommissionLogStatus.RESET_THEN_EXECUTED) {
                        remark = "结算前清空馀额：" + remark
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
                    return applyPartnerCommissionSettlement(log, settleType, adminInfo, remark);
                }
            ).catch(errorUtils.reportError);

            proms.push(prom);
        });

        return Promise.all(proms);
    },

    getPartnerSettlementHistory: (platformObjId, partnerName, commissionType, startTime, endTime, sortCol, index, limit) => {
        index = index || 0;
        limit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        sortCol = sortCol || {'_id': -1};
        let query = {
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
        let result = dbconfig.collection_partnerCommissionLog.find(query).read("secondaryPreferred");

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
                                if (customCommission[k].provider._id.toString() == oriCommission[j].provider._id.toString()) {
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
                                if (ori.activePlayerValueTo == null) {
                                    ori.activePlayerValueTo = "-";
                                }
                                if (!ori.hasOwnProperty("defaultCommissionRate")) {
                                    ori.defaultCommissionRate = ori.commissionRate;
                                    delete ori.commissionRate;
                                }
                            })
                            let commissionObj = {
                                providerGroupId: oriCommission[j].provider.providerGroupId ? oriCommission[j].provider.providerGroupId : "",
                                providerGroupName: oriCommission[j].provider.name ? oriCommission[j].provider.name : "",
                                list: oriCommission[j].commissionSetting
                            };
                            returnData.push(commissionObj);
                        }
                    } else {
                        for (let i = 0; i < commissionData.length; i++) {
                            let commissionObj = {
                                providerGroupId: commissionData[i].provider.providerGroupId ? commissionData[i].provider.providerGroupId : "",
                                providerGroupName: commissionData[i].provider.name ? commissionData[i].provider.name : ""
                            };
                            if (commissionData[i].commissionSetting && commissionData[i].commissionSetting.length) {
                                for (let j = 0; j < commissionData[i].commissionSetting.length; j++) {
                                    if (commissionData[i].commissionSetting[j].activePlayerValueTo == null) {
                                        commissionData[i].commissionSetting[j].activePlayerValueTo = "-";
                                    }
                                    commissionData[i].commissionSetting[j].defaultCommissionRate = commissionData[i].commissionSetting[j].commissionRate;
                                    delete commissionData[i].commissionSetting[j].commissionRate;
                                }
                                commissionObj.list = commissionData[i].commissionSetting;
                            }
                            returnData.push(commissionObj);
                        }
                    }
                    return returnData;
                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find commission rate"});
                }
            }
        )
    },

    getCrewActiveInfo: (platformId, partnerId, periodCycle, circleTimes) => {
        if (!circleTimes) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                return getRelevantActivePlayerRequirement(platform._id, periodCycle);
            }
        ).then(
            activePlayerRequirement => {
                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];

                for (let i = 0; i < circleTimes; i++) {
                    let startTime = new Date(nextPeriod.startTime);
                    let endTime = new Date(nextPeriod.endTime);

                    let prom = getCrewsInfo(downLines, startTime, endTime, activePlayerRequirement).then(
                        playerActiveDetails => {
                            return {
                                date: startTime,
                                activeCrewNumbers: getActiveDownLineCount(playerActiveDetails),
                                list: playerActiveDetails.filter(player => player.active)
                            }
                        }
                    );
                    nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                    outputProms.push(prom);
                }

                return Promise.all(outputProms);
            }
        );
    },

    getCrewDepositInfo: (platformId, partnerId, periodCycle, circleTimes) => {
        if (!circleTimes) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];

                for (let i = 0; i < circleTimes; i++) {
                    let startTime = new Date(nextPeriod.startTime);
                    let endTime = new Date(nextPeriod.endTime);

                    let prom = getCrewsInfo(downLines, startTime, endTime).then(
                        playerDetails => {
                            let relevantCrews = playerDetails.filter(player => player.depositAmount);
                            let count = 0;
                            let totalDepositAmount = 0;

                            relevantCrews.map(player => {
                                count++;
                                totalDepositAmount += player.depositAmount;
                            })

                            return {
                                date: startTime,
                                depositCrewNumber: count,
                                totalDepositAmount: totalDepositAmount,
                                list: relevantCrews
                            }
                        }
                    );
                    nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                    outputProms.push(prom);
                }

                return Promise.all(outputProms);
            }
        );
    },

    getCrewWithdrawInfo: (platformId, partnerId, periodCycle, circleTimes) => {
        if (!circleTimes) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];

                for (let i = 0; i < circleTimes; i++) {
                    let startTime = new Date(nextPeriod.startTime);
                    let endTime = new Date(nextPeriod.endTime);

                    let prom = getCrewsInfo(downLines, startTime, endTime).then(
                        playerDetails => {
                            let relevantCrews = playerDetails.filter(player => player.withdrawAmount);
                            let count = 0;
                            let totalWithdrawAmount = 0;
                            relevantCrews.map(player => {
                                count++;
                                totalWithdrawAmount += player.withdrawAmount;
                            });


                            return {
                                date: startTime,
                                withdrawCrewNumbers: count,
                                totalWithdrawAmount: totalWithdrawAmount,
                                list: relevantCrews
                            }
                        }
                    );
                    nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                    outputProms.push(prom);
                }

                return Promise.all(outputProms);
            }
        );
    },

    getCrewBetInfo: (platformId, partnerId, periodCycle, circleTimes, providerGroupId) => {
        if (!circleTimes) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];
        let providerGroup;

        return getPartnerCrewsData(platformId, partnerId).then(
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

                for (let i = 0; i < circleTimes; i++) {
                    let startTime = new Date(nextPeriod.startTime);
                    let endTime = new Date(nextPeriod.endTime);

                    let prom = getCrewsInfo(downLines, startTime, endTime, null, providerGroups).then(
                        playerDetails => {
                            let relevantCrews = playerDetails.filter(player => player.betCounts);
                            let count = 0;
                            let totalValidBet = 0;
                            let totalCrewProfit = 0;

                            relevantCrews.map(player => {
                                count++;
                                totalValidBet += player.validBet;
                                totalCrewProfit += player.crewProfit;
                            });

                            return {
                                date: startTime,
                                betCrewNumbers: count,
                                totalValidBet: totalValidBet,
                                totalCrewProfit: totalCrewProfit,
                                list: relevantCrews
                            }
                        }
                    );
                    nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                    outputProms.push(prom);
                }

                return Promise.all(outputProms);
            }
        );
    },

    getNewCrewInfo: (platformId, partnerId, periodCycle, circleTimes) => {
        if (!circleTimes) {
            return {};
        }

        circleTimes = circleTimes > 30 ? 30 : circleTimes;

        let platform = {};
        let partner = {};
        let downLines = [];

        return getPartnerCrewsData(platformId, partnerId).then(
            crewsData => {
                ({platform, partner, downLines} = crewsData);

                let nextPeriod = getCurrentCommissionPeriod(periodCycle);
                let outputProms = [];

                for (let i = 0; i < circleTimes; i++) {
                    let startTime = new Date(nextPeriod.startTime);
                    let endTime = new Date(nextPeriod.endTime);
                    let newDownLines = downLines.filter(player => player.registrationTime >= startTime && player.registrationTime <= endTime);

                    let prom = getCrewsInfo(newDownLines, startTime, endTime).then(
                        playerDetails => {
                            return {
                                date: startTime,
                                newCrewNumbers: newDownLines.length,
                                list: playerDetails
                            }
                        }
                    );
                    nextPeriod = getPreviousCommissionPeriod(periodCycle, nextPeriod);
                    outputProms.push(prom);
                }

                return Promise.all(outputProms);
            }
        );
    },
};


function calculateRawCommission (totalDownLineConsumption, commissionRate) {
    return Number(totalDownLineConsumption) * Number(commissionRate);
}

function getCommissionRate (commissionRateTable, consumptionAmount, activeCount) {
    let lastValidCommissionRate = 0;
    let isCustom = false;
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
            if (!data || !data[0]) {
                return Promise.reject({
                    name: "DataError",
                    message: "Cannot find commission rate, please ensure that you had configure the setting properly."
                });
            }

            let platformConfig = data[0];

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
                playerId: playerObjId,
                createTime: {
                    $gte: new Date(startTime),
                    $lt: new Date(endTime)
                },
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
    switch (commissionType) {
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
    let consumptionDetailProm = getPlayerCommissionConsumptionDetail(playerObjId, startTime, endTime, providerGroups);
    let topUpDetailProm = getPlayerCommissionTopUpDetail(playerObjId, startTime, endTime, topUpTypes);
    let withdrawalDetailProm = getPlayerCommissionWithdrawDetail(playerObjId, startTime, endTime);
    let rewardDetailProm = getPlayerCommissionRewardDetail(playerObjId, startTime, endTime, rewardTypes);
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
            };
        });

        downLineRawDetail.map(downLine => {
            providerGroups.map(group => {
                if(downLine.consumptionDetail.consumptionProviderDetail[group.name]) {
                    total[group.name].validAmount += downLine.consumptionDetail.consumptionProviderDetail[group.name].validAmount;
                    total[group.name].bonusAmount += downLine.consumptionDetail.consumptionProviderDetail[group.name].bonusAmount;
                    total[group.name].consumptionTimes += downLine.consumptionDetail.consumptionProviderDetail[group.name].consumptionTimes;
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
                rateAfterRebatePromo: rateData.rateAfterRebatePromo,
                rateAfterRebatePlatform: rateData.rateAfterRebatePlatform,
                rateAfterRebateGameProviderGroup: rateData.rateAfterRebateGameProviderGroup,
                rateAfterRebateTotalDeposit: rateData.rateAfterRebateTotalDeposit,
                rateAfterRebateTotalWithdrawal: rateData.rateAfterRebateTotalWithdrawal,
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

    let firstLastRecordProm = dbconfig.collection_partnerCommissionLog.findOne({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(firstLastPeriod.startTime),
        endTime: new Date(firstLastPeriod.endTime)
    }).lean();
    let secondLastRecordProm = dbconfig.collection_partnerCommissionLog.findOne({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(secondLastPeriod.startTime),
        endTime: new Date(secondLastPeriod.endTime)
    }).lean();
    let thirdLastRecordProm = dbconfig.collection_partnerCommissionLog.findOne({
        partner: partnerObjId,
        commissionType: commissionType,
        startTime: new Date(thirdLastPeriod.startTime),
        endTime: new Date(thirdLastPeriod.endTime)
    }).lean();

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

function getCrewInfo (player, startTime, endTime, activePlayerRequirement, providerGroups) {
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

function getCrewsInfo (players, startTime, endTime, activePlayerRequirement, providerGroups) {
    let playerDetailsProm = [] ;
    players.map(player => {
        let prom = getCrewInfo(player, startTime, endTime, activePlayerRequirement, providerGroups);
        playerDetailsProm.push(prom);
    });

    return Promise.all(playerDetailsProm);
}

function getPartnerCrewsData (platformId, partnerId) {
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

            return dbconfig.collection_players.find({platform: platform._id, partner: partner._id}).lean();
        }
    ).then(
        downLineData => {
            if (!downLineData || downLineData.length < 1) {
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





var proto = dbPartnerFunc.prototype;
proto = Object.assign(proto, dbPartner);
module.exports = dbPartner;