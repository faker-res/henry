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
let queryPhoneLocation = require('query-mobile-phone-area');
let constRegistrationIntentRecordStatus = require("../const/constRegistrationIntentRecordStatus.js");
const request = require('request');
var geoip = require('geoip-lite');
let Q = require("q");

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

    createPlayerRegistrationIntentRecord: function (data, status) {
        let proposalData = {
            creator: data.adminInfo || {
                type: 'player',
                name: data.name,
                id: data.playerId
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

        let query = {
            name: data.name,
            "data.phoneNumber": data.phoneNumber,
            "data.smsCode": data.smsCode
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
                if(newIntentData.status != constRegistrationIntentRecordStatus.MANUAL){
                    return dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordBySMSCode(query,newIntentData)
                }else{
                    let newRecord = new dbconfig.collection_playerRegistrationIntentRecord(newIntentData);
                    return newRecord.save();
                }
            })
        }else{
            if(newIntentData.status != constRegistrationIntentRecordStatus.MANUAL){
                return dbPlayerRegistrationIntentRecord.updatePlayerRegistrationIntentRecordBySMSCode(query,newIntentData)
            }else{
                let newRecord = new dbconfig.collection_playerRegistrationIntentRecord(newIntentData);
                return newRecord.save();
            }
        }
    },

    createPlayerRegistrationIntentionProposal: (platform, data, status) => {
        dbconfig.collection_proposalType.findOne({platformId:platform, name: constProposalType.PLAYER_REGISTRATION_INTENTION}).lean().then(
            typeData => {
                if( typeData ){
                    return dbconfig.collection_proposal.findOne({
                        type: typeData._id,
                        "data.name": data.data.name
                        // "data.phoneNumber": data.data.phoneNumber
                    }).lean().then(
                        proposalData => {
                            if( proposalData ){
                                //if(proposalData.status != constProposalStatus.SUCCESS){
                                    dbconfig.collection_proposal.findOneAndUpdate(
                                        {_id: proposalData._id, createTime: proposalData.createTime},
                                        {
                                            status: status,
                                            "data.realName": data.data.realName,
                                            "data.playerId": data.data.playerId
                                        }
                                    ).then();
                                //}
                            }
                            else{
                                dbProposal.createProposalWithTypeName(platform, constProposalType.PLAYER_REGISTRATION_INTENTION, data).then(
                                    newProposal => {
                                        if (newProposal) {
                                            dbconfig.collection_proposal.findOneAndUpdate({
                                                _id: newProposal._id,
                                                createTime: newProposal.createTime
                                            }, {status: status}).then();
                                        }
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
        if (query && query._id && query.creatTime) {
            return dbconfig.collection_playerRegistrationIntentRecord.findOneAndUpdate(query, updateData, {new: true});
        } else {
            return dbUtil.findOneAndUpdateForShard(
                dbconfig.collection_playerRegistrationIntentRecord,
                query, updateData,
                constShardKeys.collection_playerRegistrationIntentRecord
            )
        }
    },

    /**
     * Update a playerRegIntentRecord information by SMSCode
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerRegistrationIntentRecordBySMSCode: function (query, updateData) {
        if (query) {
            return dbconfig.collection_playerRegistrationIntentRecord.findOneAndUpdate(query, updateData, {new: true});
        } else {
            return dbUtil.findOneAndUpdateForShard(
                dbconfig.collection_playerRegistrationIntentRecord,
                query, updateData,
                constShardKeys.collection_playerRegistrationIntentRecord
            )
        }
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
