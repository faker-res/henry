/**
 * Created by hninpwinttin on 13/1/16.
 */
var dbconfig = require('./../modules/dbproperties');
let constProposalType = require('../const/constProposalType');
var Q = require("q");

var proposalType = {
    /**
     * Create a new proposal type
     * @param {json} data - The data of the proposalType. Refer to proposalType schema.
     */
    createProposalType: function (proposalData) {
        var deferred = Q.defer();
        var proposalTypeProcess = new dbconfig.collection_proposalTypeProcess(proposalData);
        proposalTypeProcess.save().then(
            function (data) {
                if (data) {
                    proposalData.process = data._id;
                    proposalData.executionType = "execute"+proposalData.name;
                    proposalData.rejectionType = "reject"+proposalData.name;
                    var proposalType = new dbconfig.collection_proposalType(proposalData);
                    return proposalType.save();
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't create proposal type process"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating proposal type process", error: error});
            }
        ).then(
            function (data) {
                if (data) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't create proposal type"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating proposal type", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Update proposal type
     * @param {json} data - The data of the proposalType. Refer to proposalType schema.
     */
    updateProposalType: function (query, data) {
        return dbconfig.collection_proposalType.findOneAndUpdate(query, data).exec();
    },

    /**
     * Get one proposal type
     * @param {String} query - The query string
     */
    getProposalType: function (query) {
        return dbconfig.collection_proposalType.findOne(query).exec();
    },

    /**
     * Get one proposal type expiration duration
     * @param {String} query - The query string
     */
    getProposalTypeExpirationDuration: function (query) {
        return dbconfig.collection_proposalType.findOne(query).exec();
    },

    /**
     * Get proposal types for platform
     * @param {objectId} platformId - The platform Id
     */
    getProposalTypeByPlatformId: function (platformId) {
        //hide proposal type related to unused reward
        let hideProposalType = [
            constProposalType.FULL_ATTENDANCE,
            constProposalType.PARTNER_CONSUMPTION_RETURN,
            constProposalType.FIRST_TOP_UP,
            constProposalType.PARTNER_INCENTIVE_REWARD,
            constProposalType.PARTNER_REFERRAL_REWARD,
            constProposalType.GAME_PROVIDER_REWARD,
            constProposalType.PLATFORM_TRANSACTION_REWARD,
            constProposalType.PLAYER_TOP_UP_RETURN,
            constProposalType.PLAYER_CONSUMPTION_INCENTIVE,
            constProposalType.PARTNER_TOP_UP_RETURN,
            constProposalType.PLAYER_TOP_UP_REWARD,
            constProposalType.PLAYER_REFERRAL_REWARD,
            constProposalType.PLAYER_REGISTRATION_REWARD,
            constProposalType.PLAYER_DOUBLE_TOP_UP_REWARD,
            constProposalType.PLAYER_CONSECUTIVE_LOGIN_REWARD,
            constProposalType.PLAYER_EASTER_EGG_REWARD,
            constProposalType.PLAYER_TOP_UP_PROMO,
            constProposalType.PLAYER_CONSECUTIVE_CONSUMPTION_REWARD,
            constProposalType.PLAYER_PACKET_RAIN_REWARD,
        ];

        let query = {
            name: {
                $nin: hideProposalType
            }
        };

        if (platformId) {
            query.platformId = {
                $in: platformId
            }
        }

        return dbconfig.collection_proposalType.find(query).exec();
    },

    /**
     * Get all proposal types
     */
    getAllProposalType: function () {
        return dbconfig.collection_proposalType.find().exec();
    },

    /**
     * Remove proposal types
     * @param {json} ids - array of id
     */
    removeProposalTypes: function (ids) {
        return dbconfig.collection_proposalType.remove({_id: {$in: ids}}).exec();
    },

    /**
     * Update proposal type expiry duration
     * @param {ObjectId} processId - ObjId of ProposalType
     * @param {string} expiryDuration
     */
    updateProposalTypeExpiryDuration: function (query, expiryDuration) {
        //update expiry date
        return dbconfig.collection_proposalType.findOne(query).then(
            function (data) {
                if (data) {
                    return dbconfig.collection_proposalType.findOneAndUpdate(
                        query,
                        {$set: { expirationDuration: expiryDuration }},
                        {new: true}
                    ).then(
                        function (data) {
                            return Promise.resolve(); 
                        },
                        function (error) {
                            return Promise.reject({name: "DBError", message: "Can't update proposal type's expiry duration"});  
                        }
                    )
                }
                else {
                    return Promise.reject({name: "DBError", message: "Can't find proposal type"});
                }
            },
            function (error) {
                return Promise.reject({name: "DBError", message: "Error finding proposal type", error: error});
            }
        )
    },

}
module.exports = proposalType;
