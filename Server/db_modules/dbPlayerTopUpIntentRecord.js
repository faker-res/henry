var dbconfig = require('./../modules/dbproperties');
var dbUtil = require('./../modules/dbutility');
var dbProposal = require('./../db_modules/dbProposal');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPaymentChannel = require('./../db_modules/dbPaymentChannel');
var constProposalType = require('./../const/constProposalType');
var constTopUpIntentRecordStatus = require('./../const/constTopUpIntentRecordStatus');
var constProposalStatus = require('./../const/constProposalStatus');
var constShardKeys = require('./../const/constShardKeys');
var constSystemParam = require('./../const/constSystemParam');
var Q = require("q");

var dbPlayerTopUpIntentRecord = {

    /**
     * create top up intent record
     * @param {Json} data
     */
    createPlayerTopUpIntentRecordWithID: function (idData) {
        var deferred = Q.defer();
        var prom1 = dbconfig.collection_players.findOne({playerId: idData.playerId});
        var prom2 = dbconfig.collection_paymentChannel.findOne({channelId: idData.topupChannel});
        var prom3 = dbconfig.collection_platform.findOne({platformId: idData.platformId});
        var result = null;
        Q.all([prom1, prom2, prom3]).then(
            function (data) {
                if (data && data[0] && data[1] && data[2]) {
                    result = {};
                    result.playerId = data[0]._id;
                    result.topupChannel = data[1]._id;
                    result.platformId = data[2]._id;
                    result.topUpAmount = idData.topUpAmount;
                    // var newRecord = new dbconfig.collection_playerTopUpIntentRecord(result);
                    return dbPlayerTopUpIntentRecord.createPlayerTopUpIntentRecord(result);
                }
                else{
                    deferred.reject({name: "DataError", message: "Error in getting player, paymentChannel or platform"});
                }
            }, function (err) {
                deferred.reject({
                    name: "DBError",
                    message: "Error in getting player, paymentChannel or platform",
                    error: err
                });
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            }, function (err) {
                deferred.reject({
                    name: "DataError",
                    message: "Error in getting player, paymentChannel or platform",
                    error: err
                });
            }
        ).catch(
            function (error) {
                deferred.reject({name: "DBError", message: "Error in getting player, game or provider", error: error});
            }
        );
        return deferred.promise;

    },
    /**
     * create top up intent record
     * @param {Json} data
     */
    createPlayerTopUpIntentRecord: function (data) {
        var newRecord = new dbconfig.collection_playerTopUpIntentRecord(data);
        return newRecord.save();
    },

    /**
     * Update a playerTopUpIntentRecord information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerTopUpIntentRecord: function (query, updateData) {
        if( query && query._id && query.creatTime ){
            return dbconfig.collection_playerTopUpIntentRecord.findOneAndUpdate(query, updateData, {new: true});
        } else{
            return dbUtil.findOneAndUpdateForShard(
                dbconfig.collection_playerTopUpIntentRecord,
                query, updateData,
                constShardKeys.collection_playerTopUpIntentRecord
            )
        }
    },
    /**
     * Get playerTopUpIntentRecord information
     * @param {String}  query - The query string
     */
    getPlayerTopUpIntentRecord: function (query) {

        var d = new Date(Date.now() - 60 * 60 * 1000);
        query.createTime = {$gt: d.toISOString()};
        return dbconfig.collection_playerTopUpIntentRecord.find(query).sort({createTime: -1}).limit(constSystemParam.MAX_RECORD_NUM);


    },
    /**
     * Delete playerTopUpIntentRecord information
     * @param {String}  - ObjectId of the playerLoginRecord
     */
    generateProposalIDfromTopupIntention: function (inputData) {
        var deferred = Q.defer();

        var platformId;
        var playerObjId;

        var prom1 = dbPaymentChannel.getPaymentChannel({channelId: inputData.topupChannel});
        var prom2 = dbPlayerInfo.getPlayerInfo({playerId: inputData.playerId});
        Q.all([prom1, prom2]).then(
            function (data) {
                if (data && data[0] && data[1]) {
                    platformId = data[1].platform;
                    playerObjId = data[1]._id;
                    var proposalData = inputData;
                    proposalData.playerObjId = playerObjId;
                    proposalData.playerId = data[1].playerId;
                    proposalData.platformId = data[1].platform;
                    proposalData.channel = data[0]._id;
                    proposalData.channelName = data[0].name;
                    proposalData.validForTransactionReward = data[0].validForTransactionReward;
                    proposalData.amount = inputData.topUpAmount;
                    proposalData.topUpAmount = inputData.topUpAmount;
                    
                    return dbProposal.createProposalWithTypeName(platformId, constProposalType.PLAYER_TOP_UP, {data: proposalData});
                } else {
                    deferred.reject({name: "DataError", message: "Cannot find player or payment channel"});
                }
            }, function (err) {
                deferred.reject({name: "DBError", message: "Cannot find player or payment channel.", error: err});
            }
        ).then(
            function (data) {
                //todo::check code here, might not need update status here
                return dbconfig.collection_proposal.findOneAndUpdate({_id: data._id, createTime: data.createTime}, {status: constProposalStatus.PENDING}, {new: true}).exec();
            },
            function (err) {
                deferred.reject({name: "DBError", message: "Cannot create proposal", error: err});
            }
        ).then(
            function (data) {
                if (data) {

                    var platformId = data.data.platformId;
                    var topupData = data.toObject();
                    dbconfig.collection_platform.findOne({"_id": platformId}).then(
                        function (platformData) {

                            delete topupData.data.platformId;
                            topupData.data.platformId = platformData.platformId;
                            deferred.resolve(topupData);

                        },
                        function (err) {

                            deferred.reject({
                                name: "DBError",
                                error: err,
                                message: "Error in getting player platform Data"
                            });
                        });

                } else {
                    deferred.reject({name: "DataError", message: "Cannot update proposal status to PENDING"});
                }
            }, function (err) {
                deferred.reject({
                    name: "DBError",
                    message: "Cannot update proposal status to PENDING" + err,
                    error: err
                });
            }
        );
        return deferred.promise;
    }
}

module.exports = dbPlayerTopUpIntentRecord;