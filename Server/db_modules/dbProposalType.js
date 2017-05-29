/**
 * Created by hninpwinttin on 13/1/16.
 */
var dbconfig = require('./../modules/dbproperties');
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
        return dbconfig.collection_proposalType.find(
            {
                platformId: {
                    $in: platformId
                }
            }
        ).exec();
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
