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
var jwt = require('jsonwebtoken');
var errorUtils = require("../modules/errorUtils.js");
var pmsAPI = require("../externalAPI/pmsAPI.js");
var dbLogger = require("./../modules/dbLogger");
var constProposalMainType = require('../const/constProposalMainType');
let rsaCrypto = require("../modules/rsaCrypto");
let dbutility = require("./../modules/dbutility");

let env = require('../config/env').config();

let SettlementBalancer = require('../settlementModule/settlementBalancer');

const constPlayerLevelPeriod = require('../const/constPlayerLevelPeriod');
const constPartnerCommissionPeriod = require('../const/constPartnerCommissionPeriod');
const constProposalStatus = require('../const/constProposalStatus');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constPartnerCommissionSettlementMode = require('../const/constPartnerCommissionSettlementMode');
const constPartnerStatus = require('../const/constPartnerStatus');
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");


let dbPartner = {

    createPartnerAPI: function (partnerData) {
        return dbconfig.collection_platform.findOne({platformId: partnerData.platformId}).then(
            platformData => {
                if (platformData) {
                    partnerData.platform = platformData._id;
                    partnerData.isNewSystem = true;
                    // attach platform prefix to player name if available
                    // if (platformData.partnerPrefix) {
                    //     partnerData.partnerName = platformData.partnerPrefix + partnerData.partnerName;
                    // }

                    return dbPartner.isPhoneNumberValidToRegister({
                        phoneNumber: partnerData.phoneNumber,
                        platform: platformData._id
                    }).then(
                        function (data) {
                            if (("allowSamePhoneNumberToRegister" in platformData) && !platformData.allowSamePhoneNumberToRegister && !data.isPhoneNumberValid) {
                                return Q.reject({
                                    name: "DataError",
                                    message: "Phone number already exists"
                                });
                            }
                            else {
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
                            }
                        },
                        function (error) {
                            deferred.reject({
                                name: "DBError",
                                message: "Error when finding phone number",
                                error: error
                            });
                        }
                    );
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find platform"});
                }
            }
        );
    },

    /**
     * Create a new partner
     * @param {json} partnerdata - The data of the partner user. Refer to Partner schema.
     */
    createPartner: function (partnerdata) {
        let deferred = Q.defer();
        // let partnerName = partnerdata.partnerName;
        let platformData = null;

        if (partnerdata.parent === '') {
            partnerdata.parent = null;
        }
        if (!partnerdata.platform) {
            return Q.reject({
                name: "DataError",
                message: "You did not provide the 'platform' (ObjectId) field for the new partner"
            });
        }
        partnerdata.isNewSystem = true;
        // Player name should be alphanumeric and max 15 characters
        let alphaNumRegex = /^([0-9]|[a-z])+([0-9a-z]+)$/i;
        if (partnerdata.partnerName.length > 20 || !partnerdata.partnerName.match(alphaNumRegex)) {
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

                    // attach platform prefix to player name if available
                    if (platform.partnerPrefix) {
                        partnerdata.partnerName = platform.partnerPrefix + partnerdata.partnerName;
                    }

                    if (platformData.allowSamePhoneNumberToRegister === true) {
                        return {isPhoneNumberValid: true};
                    } else {
                        return dbPartner.isPhoneNumberValidToRegister({
                            phoneNumber: partnerdata.phoneNumber,
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
                if (data.isPhoneNumberValid) {
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
            function (level) {
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

                        let partner = new dbconfig.collection_partner(partnerdata);
                        partner.level = level;
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
                query[k]= data[k];
            }
        }
        count = dbconfig.collection_partner.find( query ).count();
        if(data.sortCol){
            //if there is sorting parameter
            var detail = dbconfig.collection_partner.aggregate([
                {$match: query},
                {$project:{ childrencount: {$size: { "$ifNull": [ "$children", [] ] }},"partnerId":1, "partnerName":1 ,"realName":1, "phoneNumber":1, "status":1, "parent":1, "totalReferrals":1, "credits":1, "registrationTime":1, "level":1, "lastAccessTime":1, "lastLoginIp":1,"_id":1, "validReward":1}},
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
                {$project:{ childrencount: {$size: { "$ifNull": [ "$children", [] ] }},"partnerId":1, "partnerName":1 ,"realName":1, "phoneNumber":1, "status":1, "parent":1, "totalReferrals":1, "credits":1, "registrationTime":1, "level":1, "lastAccessTime":1, "lastLoginIp":1,"_id":1, "validReward":1}},
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
    getPartnersByAdvancedQuery: function (platformId, data) {
        var count = 0;
        var query = {};
        query.platform  = mongoose.Types.ObjectId(platformId);
        for(var k in data){
            if(k!="limit" && k!="index" && k!="pageObj" && k!="sortCol"&& k!="platformId"){

                if(k=="status"){
                    data["status"] = parseInt(data["status"]);
                }
                if(k=="level"){
                    data["level"] = mongoose.Types.ObjectId(data["level"]);
                }
                query[k]= data[k];
            }
        }
        count = dbconfig.collection_partner.find( query ).count();
        if(data.sortCol){
            //if there is sorting parameter
            var detail = dbconfig.collection_partner.aggregate([
                {$match:query},
                {$project:{ childrencount: {$size: { "$ifNull": [ "$children", [] ] }},"partnerId":1, "partnerName":1 ,"realName":1, "phoneNumber":1, "status":1, "parent":1, "totalReferrals":1, "credits":1, "registrationTime":1, "level":1, "lastAccessTime":1, "lastLoginIp":1,"_id":1, "validReward":1}},
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
            });
            
        }else{
            //if there is not sorting parameter
            var detail = dbconfig.collection_partner.aggregate([
                {$match:query},
                {$project:{ childrencount: {$size: { "$ifNull": [ "$children", [] ] }},"partnerId":1, "partnerName":1 ,"realName":1, "phoneNumber":1, "status":1, "parent":1, "totalReferrals":1, "credits":1, "registrationTime":1, "level":1, "lastAccessTime":1, "lastLoginIp":1,"_id":1, "validReward":1}},
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
    getPartnerItem: function(id, childrencount) {
        return dbconfig.collection_partner.findOne({_id: mongoose.Types.ObjectId(id)})
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
            return dbconfig.collection_players.findOne({playerId: value}).then(
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
                    requireLogInCaptcha = platformData.requireLogInCaptcha || false;

                    return dbconfig.collection_partner.findOne({partnerName: partnerData.prefixName.toLowerCase()}).lean();
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
                                    data.platform.requireLogInCaptcha = requireLogInCaptcha;
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
                    if (!platformData.requireSMSVerificationForPasswordUpdate) {
                        // SMS verification not required
                        return Q.resolve(true);
                    } else {
                        // Check verification SMS match
                        return dbconfig.collection_smsVerificationLog.findOne({
                            platformObjId: partnerObj.platform,
                            tel: partnerObj.phoneNumber
                        }).sort({createTime: -1}).then(
                            verificationSMS => {
                                // Check verification SMS code
                                if (verificationSMS && verificationSMS.code && verificationSMS.code == smsCode) {
                                    verificationSMS = verificationSMS || {};
                                    return dbconfig.collection_smsVerificationLog.remove(
                                        {_id: verificationSMS._id}
                                    ).then(
                                        () => {
                                            return Q.resolve(true);
                                        }
                                    )
                                }
                                else {
                                    let errorMessage = verificationSMS ? "Invalid SMS Validation Code" : "Incorrect SMS Validation Code";
                                    return Q.reject({
                                        status: constServerCode.VALIDATION_CODE_INVALID,
                                        name: "ValidationError",
                                        message: errorMessage
                                    });
                                }
                            }
                        )
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
        return dbconfig.collection_partner.findOne({partnerId: partnerId}).then(
            partnerData => {
                if (partnerData) {
                    if (partnerData.bankName || partnerData.bankAccount || partnerData.bankAccountName || partnerData.bankAccountType || partnerData.bankAccountCity || partnerData.bankAddress) {
                        // bankData.partnerName = partnerData.partnerName;
                        // bankData.parternId = partnerData.partnerId;
                        let inputDevice = dbutility.getInputDevice(userAgent,true);
                        return dbProposal.createProposalWithTypeNameWithProcessInfo(partnerData.platform, constProposalType.UPDATE_PARTNER_BANK_INFO, {
                            data: {
                                partnerName: partnerData.partnerName,
                                parternId: partnerData.partnerId,
                                updateData: bankData
                            },
                            inputDeivce: inputDevice
                        });
                    }
                    else {
                        return dbconfig.collection_partner.update(
                            {_id: partnerData._id, platform: partnerData.platform},
                            bankData
                        );
                    }
                }
                else {
                    return Q.reject({name: "DataError", message: "Cannot find partner"});
                }
            }
        );
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

    isPartnerNameValidToRegister: function (query) {
        return dbconfig.collection_partner.findOne({$or:[{partnerName:query.partnerName},{realName:query.realName}]},{platform: query.platform}).then(
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
    }


};

module.exports = dbPartner;
