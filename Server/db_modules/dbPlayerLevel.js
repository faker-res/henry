/**
 * Created by hninpwinttin on 29/1/16.
 */
const dbconfig = require('./../modules/dbproperties');
const dbUtil = require('./../modules/dbutility');

const constSystemParam = require('./../const/constSystemParam');

const SettlementBalancer = require('../settlementModule/settlementBalancer');

let dbPlayerLevelInfo = {

    /**
     * Create a new playerLevel
     * @param {json} data - The data of the playerLevel. Refer to playerLevel schema.
     */
    createPlayerLevel : function(playerLevelData){
        var playerLevel = new dbconfig.collection_playerLevel(playerLevelData);
        return playerLevel.save();
    },

    /**
     * Update a playerLevel information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePlayerLevel: function(query, updateData) {
        return dbconfig.collection_playerLevel.findOneAndUpdate(query, updateData);
    },

    /**
     * Get playerLevel information
     * @param {String}  query - The query string
     */
    getPlayerLevel : function(query) {
        return dbconfig.collection_playerLevel.find(query);
    },

    /**
     * Delete playerLevel information
     * @param {String}  - ObjectId of the playerLevel
     */
    deletePlayerLevel : function(playerLevelObjId) {
        return dbconfig.collection_playerLevel.remove({_id:playerLevelObjId});
    },

    startPlatformPlayerLevelUpSettlement: (platformObjId) => {
        console.log('startPlatformPlayerLevelUpSettlement');
        let platformData, proposalTypeObjId;
        let lastMonth = dbUtil.getLastMonthSGTime();

        return dbconfig.collection_platform.findOne({_id: platformObjId}).lean().then(
            platform => {
                platformData = platform;

                console.log('lastMonth', lastMonth);

                let stream = dbconfig.collection_playerTopUpRecord.aggregate(
                    {
                        $match: {
                            createTime: {
                                $gte: lastMonth.startTime,
                                $lt: lastMonth.endTime
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$playerId",
                            amountSum: {$sum: "$amount"}
                        }
                    }).cursor({batchSize: 10000}).allowDiskUse(true).exec();

                let balancer = new SettlementBalancer();
                return balancer.initConns().then(function () {
                    return balancer.processStream(
                        {
                            stream: stream,
                            batchSize: constSystemParam.BATCH_SIZE,
                            makeRequest: function (topUpRecords, request) {
                                request("player", "performPlatformPlayerLevelUpSettlement", {
                                    topUpRecords: topUpRecords,
                                    platformObj: platformData
                                });
                            }
                        }
                    );
                });
            }
        )
    },

    performPlatformPlayerLevelUpSettlement: (topUpRecords, platformObj) => {
        console.log('topUpRecords', topUpRecords);

        return Promise.resolve(true);
    }
};

module.exports = dbPlayerLevelInfo;