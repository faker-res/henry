let dbconfig = require('./../modules/dbproperties');
let dbUtil = require('./../modules/dbutility');
let dbProposal = require('./../db_modules/dbProposal');
let dbProposalType = require('./../db_modules/dbProposalType');
let constShardKeys = require('../const/constShardKeys');
let constSystemParam = require('../const/constSystemParam');
let constProposalType = require('../const/constProposalType');
let constProposalEntryType = require('../const/constProposalEntryType');
let constProposalUserType = require('../const/constProposalUserType');
let constProposalMainType = require('../const/constProposalMainType');
let constProposalStatus = require('../const/constProposalStatus');
let constMessageType = require('../const/constMessageType');
let queryPhoneLocation = require('query-mobile-phone-area');
let constRegistrationIntentRecordStatus = require("../const/constRegistrationIntentRecordStatus.js");
const request = require('request');
var geoip = require('geoip-lite');
let Q = require("q");

let SMSSender = require('../modules/SMSSender');
let ObjectId = mongoose.Types.ObjectId;

var dbPlayerRegistrationIntentRecord = {

    /**
     * create top up intent record
     * @param {Json} data
     */
    createPlayerRegistrationIntentRecordAPI: function (data, status) {
        if (data && data.platformId) {
            return dbconfig.collection_platform.findOne({platformId: data.platformId}).then(
                function (plat) {
                    if (plat && plat._id) {
                        data.platformId = plat.platformId;
                        data.platform = plat._id;
                        return dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentRecord(data, status);
                    } else {
                        return Q.reject({name: "DataError", message: "Platform does not exist"});
                    }
                },
                function (err) {
                    return Q.reject({name: "DataError", message: "Error in getting platform ID", error: err});
                }
            );
        } else {
            return Q.reject({name: "DataError", message: "Incomplete input data"});
        }
    },

    updatePlayerRegistrationIntentRecordAPI: function (data, status) {
        if (data && data.platformId) {
            return dbconfig.collection_platform.findOne({platformId: data.platformId}).then(
                function (plat) {
                    if (plat && plat._id) {
                        data.platformId = plat.platformId;
                        data.platform = plat._id;
                        return dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecord(data, status);
                    } else {
                        return Q.reject({name: "DataError", message: "Platform does not exist"});
                    }
                },
                function (err) {
                    return Q.reject({name: "DataError", message: "Error in getting platform ID", error: err});
                }
            );
        } else {
            return Q.reject({name: "DataError", message: "Incomplete input data"});
        }
    },

    createPlayerRegistrationIntentRecord: function (data, status) {
        if(data){
            let proposalData = {
                creator: data.adminInfo || {
                    type: data.partnerName ? "partner" :'player',
                    name: data.partnerName ? data.partnerName : data.name,
                    id: data.partnerName ? data.partnerId : data.playerId
                }
            };

            if(data.smsCode){
                data.smsCode = parseInt(data.smsCode);
            }

            let newProposal = {
                creator: proposalData.creator,
                data: data,
                entryType: data.adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                userType: data.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                status: status
            };

            //data.ipArea = geoip('210.21.84.23');
            if( data.phoneNumber ){
                var queryRes = queryPhoneLocation(data.phoneNumber);
                if (queryRes) {
                    data.phoneProvince = queryRes.province;
                    data.phoneCity = queryRes.city;
                    data.phoneType = queryRes.type;
                }
                dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentionProposal(data.platform, newProposal, status);
            }

            if (typeof(data.platform) != 'object') {
                data.platform = ObjectId(data.platform);
            }

            let newIntentData = {
                status: constRegistrationIntentRecordStatus[status.toString().toUpperCase()],
                data: data,
                name: data.name
            };

            let query;
            if(data.name){
                query = {
                    name: data.name,
                    "data.phoneNumber": data.phoneNumber,
                    "data.smsCode": data.smsCode
                }
            }else{
                query = {
                    "data.phoneNumber": data.phoneNumber,
                    "data.smsCode": data.smsCode
                }
            }

            if(data.lastLoginIp && data.lastLoginIp != "undefined"){
                return dbUtil.getGeoIp(data.lastLoginIp).then(
                    ipData=>{
                        if(data){
                            data.ipArea = ipData;
                        }else{
                            data.ipArea = {'province':'', 'city':''};
                        }

                        return data;
                    }
                ).then(data => {
                    return dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordBySMSCode(query,newIntentData)
                })
            }else{
                return dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordBySMSCode(query,newIntentData)
            }
        }
    },

    createPlayerRegistrationIntentionProposal: (platform, data, status) => {
        var deferred = Q.defer();
        dbconfig.collection_proposalType.findOne({platformId:platform, name: constProposalType.PLAYER_REGISTRATION_INTENTION}).lean().then(
            typeData => {
                if( typeData ){
                    dbProposal.createProposalWithTypeName(platform, constProposalType.PLAYER_REGISTRATION_INTENTION, data).then(
                        newProposal => {
                            if (newProposal) {
                                dbconfig.collection_proposal.findOneAndUpdate({
                                    _id: newProposal._id,
                                    createTime: newProposal.createTime
                                }, {status: status}).then(
                                    function (data) {
                                        if(status === constProposalStatus.APPROVED ||status === constProposalStatus.MANUAL ) {
                                            SMSSender.sendByPlayerObjId(data.data.playerObjId, constMessageType.PLAYER_REGISTER_INTENTION_SUCCESS, data);
                                            // if require on outside, messageDispatcher will be empty object, probably because of circular dependency, so require inside function
                                            require("./../modules/messageDispatcher").dispatchMessagesForPlayerProposal(data, constMessageType.PLAYER_REGISTER_INTENTION_SUCCESS, {}).catch(err=>{console.error(err)});
                                        }
                                       deferred.resolve(data);
                                    },
                                    function (error) {
                                        deferred.reject({name: "DBError", message: "Error finding matching proposal", error: error});
                                    }
                                );
                            }
                        }
                    );
                }
            }
        );
    },

    /**
     * Update a playerRegIntentRecord information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerRegistrationIntentRecord: function (query, updateData) {
        let proposalProm;
        let registrationIntentProm;
        let queryObj = {};
        if(query){
            if(query.name){
                query.playerName = query.name;
            }
            if(query.password){
                delete query.password;
            }
            if(query.confirmPass){
                delete query.confirmPass;
            }
        }
        let updateQuery = {
            data: query
        };

        if(updateData != "Fail"){
            updateQuery.status = updateData;
        }

        let intentUpdateData = {
            name: query.name,
            status: "",
            data: query
        };

        queryObj['data.phoneNumber'] = query.phoneNumber ? query.phoneNumber : "";
        queryObj['data.smsCode'] = query.smsCode ? parseInt(query.smsCode) : "";

        return dbconfig.collection_players.findOne({playerId:query.playerId,platform:query.platform})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).then(
                (playerData) => {
                    updateQuery.data.playerLevelName = playerData.playerLevel.name;
                    if (query && query._id && query.createTime) {
                        proposalProm = dbconfig.collection_proposal.findOneAndUpdate(queryObj, updateQuery, {new: true});
                        if(updateData && updateData != "Fail"){
                            intentUpdateData.status = constRegistrationIntentRecordStatus[intentUpdateData.toString().toUpperCase()];
                        }
                        registrationIntentProm = dbconfig.collection_playerRegistrationIntentRecord.findOneAndUpdate(queryObj, intentUpdateData, {new: true});
                    } else {
                        proposalProm = dbUtil.findOneAndUpdateForShard(
                            dbconfig.collection_proposal,
                            queryObj, updateQuery,
                            constShardKeys.collection_proposal
                        );
                        if(updateData && updateData != "Fail"){
                            intentUpdateData.status = constRegistrationIntentRecordStatus[updateData.toString().toUpperCase()];
                        }
                        registrationIntentProm = dbUtil.findOneAndUpdateForShard(
                            dbconfig.collection_playerRegistrationIntentRecord,
                            queryObj, intentUpdateData,
                            constShardKeys.collection_playerRegistrationIntentRecord
                        );
                    }
                    return Promise.all([proposalProm,registrationIntentProm]).then(
                        (data) =>{
                            if(data && data[0] && updateData && updateData != "Fail"){
                                let proposalData = data[0];
                                proposalData.data.playerName = playerData.name;
                                proposalData.data.playerObjId = playerData._id;
                                proposalData.data.platformId = playerData.platform;
                                SMSSender.sendByPlayerObjId(proposalData.data.playerObjId, constMessageType.PLAYER_REGISTER_INTENTION_SUCCESS, proposalData);
                                // if require on outside, messageDispatcher will be empty object, probably because of circular dependency, so require inside function
                                require("./../modules/messageDispatcher").dispatchMessagesForPlayerProposal(proposalData, constMessageType.PLAYER_REGISTER_INTENTION_SUCCESS, {}).catch(err=>{console.error(err)});
                            }
                            return data
                        }
                    );
                }
            );
    },

    /**
     * Update a playerRegIntentRecord information by SMSCode
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerRegistrationIntentRecordBySMSCode: function (query, updateData) {
        let secondQuery = {};
        return dbconfig.collection_playerRegistrationIntentRecord.find(query).then(data => {
            if(data && data.length > 0) {
                return query;
            }else{
                secondQuery = {
                    "data.phoneNumber": query["data.phoneNumber"],
                    "data.smsCode": query["data.smsCode"]
                }

                return dbconfig.collection_playerRegistrationIntentRecord.find(secondQuery).then(data2 => {
                    if(data2 && data2.length > 0){
                        return secondQuery;
                    }
                    return "Create New";
                });
            }
        }).then(queryData =>{
            if(queryData){
                    if (queryData != "Create New") {
                        return dbconfig.collection_playerRegistrationIntentRecord.findOneAndUpdate(queryData, updateData, {new: true});
                    } else {
                        let newRecord = new dbconfig.collection_playerRegistrationIntentRecord(updateData);
                        return newRecord.save();
                    }
            }else{
                return dbUtil.findOneAndUpdateForShard(
                    dbconfig.collection_playerRegistrationIntentRecord,
                    queryData, updateData,
                    constShardKeys.collection_playerRegistrationIntentRecord
                );
            }
        })
    },
    /**
     * Get playerRegIntentRecord information
     * @param {String}  query - The query string
     */
    getPlayerRegistrationIntentRecord: function (query) {
        var d = new Date(Date.now() - 60 * 60 * 1000);
        query.createTime = {$gt: d.toISOString()};
        return dbconfig.collection_playerRegistrationIntentRecord.find(query).sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM);
    },

    /**
     * Delete playerRegIntentRecord information
     * @param {String}  - ObjectId of the playerLoginRecord
     */
    deletePlayerRegistrationIntentRecord: function (playerRegIntentRecordId) {
        return dbconfig.collection_playerRegistrationIntentRecord.remove({_id: playerRegIntentRecordId});
    }

};

module.exports = dbPlayerRegistrationIntentRecord;
