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
let Q = require("q");

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
        let newProposal = {
            creator: proposalData.creator,
            data: data,
            entryType: data.adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
            userType: data.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
        };
        dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentionProposal(data.platform, newProposal, status);
        var newRecord = new dbconfig.collection_playerRegistrationIntentRecord(data);
        return newRecord.save();
    },

    createPlayerRegistrationIntentionProposal: (platform, data, status) => {
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
