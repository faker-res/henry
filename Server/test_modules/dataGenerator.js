"use strict";

var should = require('should');

var dbPartnerLevel = require('../db_modules/dbPartnerLevel');
var dbPartner = require('../db_modules/dbPartner');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbGame = require('../db_modules/dbGame');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlayerTopUpWeekSummary = require('../db_modules/dbPlayerTopUpWeekSummary');

var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');
var commonTestFun = require('../test_modules/commonTestFunc');

var dbconfig = require('../modules/dbproperties');

var testGameTypes = require("../test/testGameTypes");

var Q = require("q");
var mongooseUtils = require("../modules/mongooseUtils.js");
var promiseUtils = require("../modules/promiseUtils.js");
var dbUtil = require("../modules/dbutility.js");
var streamUtils = require("../modules/streamUtils.js");
var dbUtil = require("../modules/dbutility");

require('./improveMochaReporting')();

// These functions are passed an object called 'generatedData'
// ids and objects are placed in this for the caller, and for other functions.
// The functions may also get ids out of the object.

function createTestPlatformAndGames (generatedData) {
    var platformName = "testPlatform" + Date.now();
    return dbPlatform.createPlatform(
        {
            name: platformName,
            code: new Date().getTime()
        },
        {
            // We keep these numbers low so that we can test the partner settlements without needing to create too many consumption records
            validPlayerTopUpTimes: 2,
            validPlayerConsumptionTimes: 2,
            activePlayerTopUpTimes: 1,
            activePlayerConsumptionTimes: 1
        }
    ).then(
        function (platform) {
            generatedData.testPlatformId = platform._id;
        }
    ).then(
        function () {
            // return createPartnerLevelsFor(generatedData.testPlatformId);
            // createPlatform creates 3 partnerLevels, with values 0,1,2, according to constPartnerLevel
            return dbconfig.collection_partnerLevel.findOne({platform: generatedData.testPlatformId, value: 1});
        }
    ).then(
        function (partnerLevel) {
            generatedData.testPartnerLevel = partnerLevel;
        }
    );
}

function createTestPlatformAndPlayerAndPartner (generatedData) {
    var playerName = "testplayer" + Date.now();
    return createTestPlatformAndGames(generatedData).then(
        function () {
            return dbPartner.createPartner(
                {
                    partnerName: "testPartner" +  Date.now(),
                    realName: "testRealName" + Date.now(),
                    platform: generatedData.testPlatformId,
                    level: generatedData.testPartnerLevel._id,
                    phoneNumber: "123123123"
                }
            );
        }
    ).then(
        function (partner) {
            generatedData.testPartnerId = partner._id;

            return dbPlayerInfo.createPlayerInfo(
                {
                    name: playerName,
                    platform: generatedData.testPlatformId,
                    partner: generatedData.testPartnerId,
                    password: "123",
                    lastLoginIp: "1.180.233.173",
                    phoneNumber: "11111111" + new Date().getTime()
                }
            );
        }
    ).then(
        function (data) {
            generatedData.testPlayerId = data._id;
        }
    );
}

function createTestGame1(generatedData) {
    var now = Date.now();
    var gameData = {
        name: "testGame1" + now,
        type: testGameTypes.CARD,
        code: "testGame1" + now,
        gameId: "testGame1" + now
    };
    return dbGame.createGame(gameData).then(
        function (data) {
            generatedData.testGameId = data._id;
            generatedData.testGameType = data.type;
        }
    );
}

function createTestGame2(generatedData) {
    var now = Date.now();
    var gameData = {
        name: "testGame2" + now,
        type: testGameTypes.CASUAL,
        code: "testGame2" + now,
        gameId: "testGame2" + now
    };
    return dbGame.createGame(gameData).then(
        function (data) {
            generatedData.testGame2Id = data._id;
            generatedData.testGame2Type = data.type;
        }
    );
}

/**
 *
 * @param playerId
 * @param {Object} consumptionConfig
 * @param {Number} consumptionConfig.consumeDays
 * @param {Number} consumptionConfig.consumeTimes
 * @param {Number} consumptionConfig.consumeAmount
 * @param {Date} consumptionConfig.lastConsumptionTime
 * @param generatedData
 * @param bulkPlayerConsumptionRecordOps
 * @param bulkPlayerConsumptionSummaryOps
 * @returns {*}
 */
function createConsumptionRecordsForPlayer(playerId, consumptionConfig, generatedData, bulkPlayerConsumptionRecordOps, bulkPlayerConsumptionSummaryOps) {
    var proms = [];
    var lastConsumptionDay = new Date(consumptionConfig.lastConsumptionTime || dbUtil.getLastWeekSGTime().endTime);
    //lastConsumptionDay.setHours(0, 0, 0, 0);
    //console.log("lastConsumptionDay", lastConsumptionDay);
    // Uncommenting these will disable bulk inserts, useful to test collision (avoidance) during createPlayerConsumptionRecord()
    //bulkPlayerConsumptionRecordOps = null;
    //bulkPlayerConsumptionSummaryOps = null;

    for (var j = 0; j < consumptionConfig.consumeDays; j++) {
        var curDate = new Date(lastConsumptionDay);
        //curDate.setHours(0, 0, 0, 0);
        curDate.setDate(lastConsumptionDay.getDate() - (j + 1));

        for (var i = 0; i < consumptionConfig.consumeTimes; i++) {
            curDate = new Date(curDate.getTime() + 1000);
            //console.log("curDate", i, curDate, playerId);
            var recordData = {
                playerId: playerId,
                platformId: generatedData.testPlatformId,
                providerId: generatedData.testGameProviderId,
                gameId: i > 0 ? generatedData.testGame2Id : generatedData.testGameId,
                gameType: i > 0 ? generatedData.testGame2Type : generatedData.testGameType,
                amount: consumptionConfig.consumeAmount,
                validAmount: consumptionConfig.consumeAmount,
                orderNo: new Date().getTime()+Math.random(),
                bonusAmount: consumptionConfig.bonusAmount || 0,
                createTime: curDate
            };
            proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(recordData));

            // if (bulkPlayerConsumptionRecordOps && bulkPlayerConsumptionSummaryOps) {
            //     recordData.bDirty = false;
            //     bulkPlayerConsumptionRecordOps.insert(recordData);
            //
            //     var match = {
            //         playerId: recordData.playerId,
            //         platformId: recordData.platformId,
            //         gameType: recordData.gameType,
            //         bDirty: false,
            //     };
            //
            //     var summary = {
            //         playerId: recordData.playerId,
            //         platformId: recordData.platformId,
            //         gameType: recordData.gameType,
            //         bDirty: false,
            //         amount: recordData.amount,
            //         validAmount: 0,   // recordData.amount,
            //         createTime: new Date() + Math.floor(Math.random()*1000),
            //         dirtyDate: null,
            //         consumptionRecords: [] // not correct but faster :P
            //     };
            //     bulkPlayerConsumptionSummaryOps.upsert( match, summary);
            // } else {
            //     proms.push(dbPlayerConsumptionRecord.createPlayerConsumptionRecord(recordData));
            // }
        }
    }

    // if (bulkPlayerConsumptionRecordOps && bulkPlayerConsumptionSummaryOps) {
    //     // When using setAutoFlush(false), we should check regularly whether a flush is needed
    //     proms.push( bulkPlayerConsumptionRecordOps.considerFlush() );
    //     proms.push( bulkPlayerConsumptionSummaryOps.considerFlush() );
    //
    //     var totalConsumptionTimes = consumptionConfig.consumeTimes * consumptionConfig.consumeDays;
    //     var totalConsumptionAmount = consumptionConfig.consumeAmount * totalConsumptionTimes;
    //     var playerProm = dbconfig.collection_players.findOneAndUpdate(
    //         {_id: playerId, platform: generatedData.testPlatformId},
    //         {$inc: {consumptionSum: totalConsumptionAmount, dailyConsumptionSum: totalConsumptionAmount, consumptionTimes: totalConsumptionTimes}}
    //     ).exec();
    //     proms.push(playerProm);
    // }

    return Q.all(proms);
    //return promiseUtils.each(proms, x => x);
}

/**
 * @param [bulkTopUpRecordSummaryOps] - Optional
 * @param [lastTopUpTime] - Optional
 */
function createTopUpRecordsForPlayer (playerId, testPlatformId, topUpDays, topUpTimes, topUpAmount, lastTopUpTime, bulkTopUpRecordSummaryOps) {
    lastTopUpTime = lastTopUpTime || dbUtil.getLastWeekSGTime().endTime;
    var proms = [];
    for (var j = 0; j < topUpDays; j++) {
        var curDate = new Date(lastTopUpTime.getTime());
        curDate.setHours(0, 0, 0, 0);
        curDate.setDate(curDate.getDate() - (j + 1));

        for (var i = 0; i < topUpTimes; i++) {
            curDate = new Date(curDate.getTime() + 1000);
            var newRecordData = {
                playerId: playerId,
                platformId: testPlatformId,
                amount: topUpAmount,
                createTime: curDate
            };
            var prom = bulkTopUpRecordSummaryOps ? bulkTopUpRecordSummaryOps.insert(newRecordData) : dbPlayerTopUpRecord.createPlayerTopUpRecord(newRecordData);
            proms.push(prom);
        }
    }
    return Q.all(proms);
}

/* WIP
function createConsumptionRecordsForAllPlayersOnPlatform (consumptionConfig, platformId) {
    var bulkConsumptionRecordOps = mongooseUtils.bulkOperationWrapper(dbconfig.collection_playerConsumptionRecord);

    dbconfig.collection_platfor

                return bulkConsumptionRecordOps.flush();
}
*/

/**
 * @param {Object} generatedData
 * @returns {Promise<undefined>}
 */
function createTestPlayerPlatformAndGames (generatedData) {
    return dataGenerator.createTestPlatformAndPlayerAndPartner(generatedData)
        .then(dataGenerator.createTestGame1.bind(null, generatedData))
        .then(dataGenerator.createTestGame2.bind(null, generatedData));
        // .then( () => dataGenerator.createPartnerLevelFor(generatedData.testPlatformObjId) );
}

/**
 * @param {{consumeTimes: number, consumeDays: number, consumeAmount: number}} consumptionConfig
 * @param generatedData
 * @returns {*|Promise|Promise.<*>}
 */
function createTestPlayerPlatformGamesAndConsumptionRecords (consumptionConfig, generatedData) {
    return dataGenerator.createTestPlayerPlatformAndGames(generatedData).then(
        () => dataGenerator.createConsumptionRecordsForPlayer(generatedData.testPlayerId, consumptionConfig, generatedData)
    );
}

function getThisWeekStartAndEnd () {
    // var endTime = new Date();
    // endTime.setHours(0, 0, 0, 0);
    // endTime.setDate(endTime.getDate());
    // var startTime = new Date();
    // startTime.setHours(0, 0, 0, 0);
    // startTime.setDate(startTime.getDate() - 7);
    // return {
    //     startTime: startTime,
    //     endTime: endTime
    // };
    return dbUtil.getLastWeekSGTime();
}

function getYesterdayStartAndEnd () {
    // var endTime = new Date();
    // endTime.setHours(0, 0, 0, 0);
    // var startTime = new Date();
    // startTime.setHours(0, 0, 0, 0);
    // startTime.setDate(endTime.getDate() - 1);
    // return {
    //     startTime: startTime,
    //     endTime: endTime
    // };
    return dbUtil.getYesterdaySGTime();
}

function createPartnerLevelForPlatformWithValue (platformId, value) {
    var partnerLevelName = "testPartnerLevel" + Date.now();
    return dbPartnerLevel.createPartnerLevel(
        {
            platform: platformId,
            name: partnerLevelName,
            value: value,
            limitPlayers: 50 * value,
            consumptionAmount: 35 * value,
            demoteWeeks: 2,
            consumptionReturn: 0.2
        }
    );
}

/**
 * @typedef QuickPlayerCreator
 * @property {function(PlayerData):Promise} create
 * @property {function():Promise} flush
 */

/**
 * This does the same as dbPlayerInfo.createPlayerInfo except much faster, because the platform and level info are pre-fetched, and it uses bulk insert.
 * You should wait for the promise returned by create to resolve.  Usually this will happen immediately, but it may take longer if a batch is actually being sent.
 * When you have finished creating players, you should call quickPlayerCreator.flush()
 * @param platformId
 * @returns {Promise.<QuickPlayerCreator>} The resolved function also contains a function called flush() which should be called at the very end.
 */
function getQuickPlayerCreator (platformId) {
    const bulkPlayerOps = mongooseUtils.bulkOperationWrapper(dbconfig.collection_players);

    // @todo Get all player levels, and iterate the list to create players of all levels equally.
    const levelProm = dbconfig.collection_playerLevel.findOne({
        platform: platformId,
        value: 0
    }).exec();

    var platformProm = dbconfig.collection_platform.findOne({_id: platformId});

    return Q.all([levelProm, platformProm]).then(
        function (data) {
            const level = data[0];
            const platform = data[1];

            const quickPlayerCreator = {
                create: function (playerData) {
                    playerData.playerId = playerData.playerId || "emergencyID" + Date.now() + Math.random();
                    playerData.playerId = platform.prefix + playerData.playerId;
                    playerData.playerLevel = playerData.playerLevel || level._id;
                    return bulkPlayerOps.insert(playerData);
                },
                flush: () => bulkPlayerOps.flush(),
                considerFlush: () => bulkPlayerOps.considerFlush()
            };

            return quickPlayerCreator;
        }
    )
}

var treeNodesCreated;
var partnerIndex;
/**
 *
 * @param partnerTreeConfig Should contain generatedData, consumptionConfig and topUpConfig
 * @returns {*}
 */
function createPartnerTree (partnerTreeConfig) {
    treeNodesCreated = 0;
    partnerIndex = 0;
    return getQuickPlayerCreator(partnerTreeConfig.generatedData.testPlatformId).then(
        function (quickPlayerCreator) {
            var proms = [];
            for (var i = 0; i < partnerTreeConfig.topLevelPartners; i++) {
                proms.push( createPartnerAndChildren(partnerTreeConfig, 0, null, quickPlayerCreator) );
            }
            return Q.all(proms).then(
                function (data) {
                    // console.log("treeNodesCreated:", treeNodesCreated);
                    return quickPlayerCreator.flush();
                }
            // ).then(
            //     function () {
            //         return promiseUtil.delay(3000);
            //     }
            ).catch(
                function (error) {
                    return Q.reject(error.error || error);
                }
            );
        }
    );
}

function createPartnerAndChildren (partnerTreeConfig, currentDepth, parentPartner, quickPlayerCreator) {
    var generatedData = partnerTreeConfig.generatedData;
    var func = parentPartner ? dbPartner.createPartnerWithParent : dbPartner.createPartner;

    // Old
    var partnerLevel = generatedData.testPartnerLevel._id;
    // Even spread of levels.  Caller will need to have set generatedData.testPartnerLevels.
    //var partnerLevel = generatedData.testPartnerLevels[partnerIndex++ % generatedData.testPartnerLevels.length];

    return func({
        parent: parentPartner && parentPartner._id,
        partnerName: "testPartner" + Date.now() + Math.random(),
        realName: "testRealName" + Date.now() + Math.random(),
        platform: generatedData.testPlatformId,
        level: partnerLevel
    }).then(
        function (newPartner) {
            treeNodesCreated++;
            // console.log("treeNodesCreated:", treeNodesCreated);
            var promiseGenerators = [];
            if (currentDepth < partnerTreeConfig.depth) {
                for (var i=0; i<partnerTreeConfig.childrenPerPartner; i++) {
                    promiseGenerators.push( createPartnerAndChildren.bind(null, partnerTreeConfig, currentDepth+1, newPartner, quickPlayerCreator) );
                }
            }
            return promiseUtils.each( promiseGenerators, pg => pg() ).then(() => newPartner);
        }
    ).then(
        function (newPartner) {
            return createPlayersForPartner(partnerTreeConfig, newPartner._id, quickPlayerCreator);
        }
    );
}

function createPlayersForPartner (partnerTreeConfig, partnerId, quickPlayerCreator) {
    const consumptionConfig = partnerTreeConfig.consumptionConfig;
    const generatedData = partnerTreeConfig.generatedData;
    const topUpConfig = partnerTreeConfig.topUpConfig;
    const promGenerators = [];
    for (let i = 0; i < partnerTreeConfig.playersPerPartner; i++) {
        promGenerators.push(function () {
            const playerName = "testPlayerWithPartner" + Date.now() + Math.random();
            // const prom = dbPlayerInfo.createPlayerInfo(
            const prom = quickPlayerCreator.create(
                {
                    name: playerName,
                    platform: generatedData.testPlatformId,
                    partner: partnerId,
                    password: "123"
                }
            // We can use the below if we want to create consumptionRecords immediately, but it is slower because we need the player to be created now, so we cannot bulk insert players.
            // ).then(
            //     () => quickPlayerCreator.flush()
            // ).then(
            //     () => dbconfig.collection_players.findOne({name: playerName})
            // ).then(
            //     function (player) {
            //         return dataGenerator.createConsumptionRecordsForPlayer(player._id, consumptionConfig, generatedData).then(
            //             () => dataGenerator.createTopUpRecordsForPlayer(player._id, generatedData.testPlatformId, topUpConfig.topUpDays, topUpConfig.topUpTimes, topUpConfig.topUpAmount)
            //         );
            //     }
            );
            return prom;
        });
    }
    //update partner's total referral
    promGenerators.push( function(){
        return dbconfig.collection_partner.findOneAndUpdate(
            {_id: partnerId, platform: generatedData.testPlatformId},
            {totalReferrals: partnerTreeConfig.playersPerPartner}
        )
    });
    return promiseUtils.each(promGenerators, pg => pg() );
}

function ensureTestGames (generatedData) {
    var proms = [];

    if (!generatedData.testGameId) {
        proms.push( createTestGame1(generatedData) );
    }
    if (!generatedData.testGame2Id) {
        proms.push( createTestGame2(generatedData) );
    }

    return Q.all(proms);
}

/**
 * @param [generatedData] - Optional
 */
function createConsumptionRecordsForAllPlayersOnPlatform (platformId, generatedData, consumptionConfig, topUpConfig) {
    generatedData = generatedData || {};
    generatedData.testPlatformId = generatedData.testPlatformId || platformId;

    const bulkPlayerConsumptionRecordOps = mongooseUtils.bulkOperationWrapper(dbconfig.collection_playerConsumptionRecord);
    const bulkPlayerConsumptionSummaryOps = mongooseUtils.bulkOperationWrapper(dbconfig.collection_playerConsumptionSummary);
    const bulkTopUpRecordSummaryOps = mongooseUtils.bulkOperationWrapper(dbconfig.collection_playerTopUpRecord);
    bulkPlayerConsumptionRecordOps.setAutoFlush(false);
    bulkPlayerConsumptionSummaryOps.setAutoFlush(false);

    const processPlayer =
        (player) => dataGenerator.createConsumptionRecordsForPlayer(player._id, consumptionConfig, generatedData, bulkPlayerConsumptionRecordOps, bulkPlayerConsumptionSummaryOps).then(
            () => topUpConfig && dataGenerator.createTopUpRecordsForPlayer(player._id, generatedData.testPlatformId, topUpConfig.topUpDays, topUpConfig.topUpTimes, topUpConfig.topUpAmount, topUpConfig.lastTopUpTime, bulkTopUpRecordSummaryOps)
        );

    return ensureTestGames(generatedData).then(function () {
        const stream = dbconfig.collection_players.find({platform: platformId}).cursor({batchSize: 1000});
        //return streamUtils.processStreamInParallelizedBatches(stream, 10000, processPlayer);
        return streamUtils.processStreamConcurrently(stream, 4, processPlayer);
    }).then(
        () => bulkPlayerConsumptionRecordOps.flush()
    ).then(
        () => bulkPlayerConsumptionSummaryOps.flush()
    ).then(
        () => bulkTopUpRecordSummaryOps.flush()
    );
}
function clearTopUpData(generatedData) {

    var platformObjId = generatedData.testPlatformId;
    var playerObjIds =  [generatedData.testPlayerId];

    var pmD = dbconfig.collection_playerTopUpRecord.remove({platformId: platformObjId});
    var pmD1 = dbconfig.collection_playerTopUpRecord.remove({playerId: {$in:playerObjIds}});

    var pmH = dbconfig.collection_playerTopUpDaySummary.remove({platformId:platformObjId});
    var pmH1 = dbconfig.collection_playerTopUpDaySummary.remove({playerId: {$in:playerObjIds}});

    return Q.all([pmD, pmD1, pmH, pmH1]);
}


function clearConsumptionData(generatedData) {

    var platformObjId = generatedData.testPlatformId;
    var playerObjIds =  [generatedData.testPlayerId];

    var pmC = dbconfig.collection_playerConsumptionRecord.remove({platformId: platformObjId});
    var pmC1 = dbconfig.collection_playerConsumptionRecord.remove({playerId: {$in:playerObjIds}});

    var pmE = dbconfig.collection_playerConsumptionWeekSummary.remove({platformId:  platformObjId});
    var pmE1 = dbconfig.collection_playerConsumptionWeekSummary.remove({playerId: {$in:playerObjIds}});

    var pmF = dbconfig.collection_playerConsumptionDaySummary.remove({platformId: platformObjId});
    var pmF1 = dbconfig.collection_playerConsumptionDaySummary.remove({playerId: {$in:playerObjIds}});

    var pmG = dbconfig.collection_playerConsumptionSummary.remove({platformId: platformObjId});
    var pmG1 = dbconfig.collection_playerConsumptionSummary.remove({playerId: {$in:playerObjIds}});

    return Q.all([pmC, pmC1, pmE,  pmE1, pmF, pmF1, pmG, pmG1]);
}

var dataGenerator = {
    createTestPlatformAndGames: createTestPlatformAndGames,
    createTestPlatformAndPlayerAndPartner: createTestPlatformAndPlayerAndPartner,
    createTestGame1: createTestGame1,
    createTestGame2: createTestGame2,
    createConsumptionRecordsForPlayer: createConsumptionRecordsForPlayer,
    createTopUpRecordsForPlayer: createTopUpRecordsForPlayer,
    createTestPlayerPlatformAndGames: createTestPlayerPlatformAndGames,
    createTestPlayerPlatformGamesAndConsumptionRecords: createTestPlayerPlatformGamesAndConsumptionRecords,
    getThisWeekStartAndEnd: getThisWeekStartAndEnd,
    getYesterdayStartAndEnd: getYesterdayStartAndEnd,
    createPartnerLevelForPlatformWithValue: createPartnerLevelForPlatformWithValue,
    createPartnerTree: createPartnerTree,
    ensureTestGames: ensureTestGames,
    createConsumptionRecordsForAllPlayersOnPlatform: createConsumptionRecordsForAllPlayersOnPlatform,
    clearConsumptionData : clearConsumptionData,
    clearTopUpData: clearTopUpData
};

module.exports = dataGenerator;
