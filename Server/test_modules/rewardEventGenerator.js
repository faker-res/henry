var Q = require("q");

var dbProposalType = require("../db_modules/dbProposalType.js");
var dbProposalTypeProcess = require("../db_modules/dbProposalTypeProcess.js");
var dbRewardType = require("../db_modules/dbRewardType.js");
var dbRewardEvent = require("../db_modules/dbRewardEvent.js");
var constRewardType = require("../const/constProposalType.js");
var constProposalType = require('./../const/constProposalType');
var dbconfig = require('../modules/dbproperties');
var testGameTypes = require("../test/testGameTypes");
var dbPlayerLevel = require("../db_modules/dbPlayerLevel.js");
var errorUtils = require("../modules/errorUtils.js");

var playerLevels;
dbPlayerLevel.getPlayerLevel({}).then(
    levels => {
        playerLevels = levels;
    }
).catch(err => errorUtils.reportError(err));

function createFullAttendanceRewardEvent (testPlatformId, topUpConfig, consumptionConfig, rewardAmount, spendingAmount) {
    var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: constRewardType.FULL_ATTENDANCE});
    var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
        platformId: testPlatformId,
        name: constRewardType.FULL_ATTENDANCE
    });
    return Q.all([typeProm, typeProcessProm]).then(
        function (data) {
            if (!data || !data[0] || !data[1]) {
                return Q.reject(Error("Failed to get proposalType and proposalTypeProcess", {data: data}));
            }

            var proposalTypeId = data[0]._id;
            //var proposalTypeProcessId = data[1]._id;

            return dbRewardType.getRewardType({name: constRewardType.FULL_ATTENDANCE}).then(
                function (testRewardType) {
                    var testRewardTypeId = testRewardType._id;

                    var eventName = "testEvent" + Date.now();

                    var eventData = {
                        name: eventName,
                        code: new Date().getTime(),
                        platform: testPlatformId,
                        type: testRewardTypeId,
                        param: {
                            checkTopUp: true,
                            numOfTopUpDays: topUpConfig.numOfDays,
                            minTopUpAmount: topUpConfig.minAmount,
                            checkConsumption: true,
                            numOfConsumeDays: consumptionConfig.consumeDays,
                            minConsumeAmount: consumptionConfig.consumeAmount,
                            andTopUpConsume: false,

                            andProvider: false,
                            providers: [],

                            rewardAmount: rewardAmount,
                            spendingAmount: spendingAmount
                        },
                        executeProposal: proposalTypeId
                    };
                    return dbRewardEvent.createRewardEvent(eventData);
                }
            )
        }
    );
}

function createPlayerConsumptionReturnRewardEvent(testPlatformId, generatedData) {
    var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: constRewardType.PLAYER_CONSUMPTION_RETURN});
    var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
        platformId: testPlatformId,
        name: constRewardType.PLAYER_CONSUMPTION_RETURN
    });
    return Q.all([typeProm, typeProcessProm]).then(
        function (data) {
            if (!data || !data[0] || !data[1]) {
                return Q.reject(Error("Failed to get proposalType and proposalTypeProcess", {data: data}));
            }

            var proposalTypeId1 = data[0]._id;
            var proposalTypeProcessId1 = data[1]._id;

            return dbRewardType.getRewardType({name: constRewardType.PLAYER_CONSUMPTION_RETURN}).then(
                function (data) {
                    var testRewardTypeId1 = data._id;

                    var eventName = "testEvent" + Date.now();

                    var eventData = {
                        name: eventName,
                        code: new Date().getTime(),
                        platform: testPlatformId,
                        type: testRewardTypeId1,
                        param: {
                            ratio: generateRewardRatiosForPlatform(testPlatformId, 0, 0.01)
                        },
                        executeProposal: proposalTypeId1,
                        needSettlement: true,
                        needApply: true
                    };
                    if (generatedData) {
                        generatedData.playerConsumptionReturnRewardEventData = eventData;
                    }
                    return dbRewardEvent.createRewardEvent(eventData);
                }
            );

        }
    );
}

function createPartnerConsumptionReturnRewardEvent (testPlatformId, generatedData) {
    var partnerConsumptionReturnTypeName = constProposalType.PARTNER_CONSUMPTION_RETURN;

    var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: partnerConsumptionReturnTypeName});
    var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
        platformId: testPlatformId,
        name: partnerConsumptionReturnTypeName
    });
    return Q.all([typeProm, typeProcessProm]).then(
        function (data) {
            data[0].name.should.equal(partnerConsumptionReturnTypeName);
            data[1].name.should.equal(partnerConsumptionReturnTypeName);
            var partnerConsumptionReturnProposalTypeId = data[0]._id;
            var partnerConsumptionReturnProposalTypeProcessId = data[1]._id;

            //var stepType1Name = "testStepType1" + Date.now();
            //var prom1 = dbProposalTypeProcessStep.createProposalTypeProcessStep(
            //    {title: stepType1Name, department: step1DepartmentId, role: step1RoleId}
            //);
            //
            //return prom1.then(
            //    function (stepType1) {
            //        stepType1.title.should.equal(stepType1Name);
            //        return dbProposalTypeProcess.addStepToProcess(partnerConsumptionReturnProposalTypeProcessId, [stepType1._id]);
            //    }
            //).then(
            //    function () {
            return dbRewardType.getRewardType({name: partnerConsumptionReturnTypeName}).then(
                function (data) {
                    var testPartnerConsumptionReturnRewardTypeId = data._id;

                    var eventName = "testConsumptionReturnEvent" + Date.now();

                    var eventData = {
                        name: eventName,
                        code: new Date().getTime(),
                        platform: testPlatformId,
                        type: testPartnerConsumptionReturnRewardTypeId,
                        condition: {
                            partnerLevel: 0
                        },
                        param: {
                            rewardPercentage: {
                                type: "Table",
                                des: "Reward percentage",
                                data: generateRewardRatiosForPlatform(testPlatformId, 0.01, 0.01)
                            }
                        },
                        executeProposal: partnerConsumptionReturnProposalTypeId
                    };
                    if (generatedData) {
                        generatedData.partnerConsumptionReturnRewardEventData = eventData;
                    }
                    return dbRewardEvent.createRewardEvent(eventData);
                }
            );
            //}
            //);
        }
    );
}

function roundNumber (v) {
    return Math.round(v * 1000000) / 1000000;
}

// CONSIDER: This is a synchronous function, but really it should look up the playerLevels specific to the platform, which would make it asynchronous.
function generateRewardRatiosForPlatform (platformId, base, multiplier) {
    /*
    // Original, hard-coded.  What we are seeking to produce.
    var ratios = {
        Normal: {
            1: 0.02,
            2: 0.03,
            3: 0.04
        },
        VIP: {
            1: 0.03,
            2: 0.04,
            3: 0.05
        },
        Diamond: {
            1: 0.04,
            2: 0.05,
            3: 0.06
        }
    };
    */

    // Dynamic, based on player levels and gameTypes currently in the DB.
    if (typeof base !== 'number') {
        base = 0.01;
    }
    if (typeof multiplier !== 'number') {
        multipler = 0.01;
    }
    var ratios = {};
    var j = 1;
    playerLevels.forEach(level => {
        if (ratios[level.value]) {
            return;
        }
        var levelRatios = {};
        var i = j;
        for (var gameType in testGameTypes) {
            var gameTypeId = testGameTypes[gameType];
            levelRatios[gameTypeId] = roundNumber(base + i * multiplier);
            i++;
        }
        ratios[level.value] = levelRatios;
        j++;
    });

    //console.log("ratios:", ratios);
    return ratios;
}

function createPartnerReferralRewardEvent (testPlatformId, partnerLevelName) {
    var typeName = constProposalType.PARTNER_REFERRAL_REWARD;

    var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: typeName});
    var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformId, name: typeName});

    return Q.all([typeProm, typeProcessProm]).then(
        function (data) {
            if (!data || !data[0] || !data[1]) {
                return Q.reject(Error("Failed to get proposalType and proposalTypeProcess", {data: data}));
            }
            data[0].name.should.equal(typeName);
            data[1].name.should.equal(typeName);
            var proposalTypeObjId = data[0]._id;
            var proposalTypeProcessId = data[1]._id;

            return dbRewardType.getRewardType({name: constRewardType.PARTNER_REFERRAL_REWARD}).then(
                function(data){
                    var testRewardTypeId = data._id;

                    var eventName = "testEvent" + Date.now();

                    var referralRewardParam = {
                        rewardAmount: {
                            type: "Array",
                            des: "Reward amount based on newly referred players",
                            data: [10, 20, 50, 100]
                        }
                    };

                    var eventData = {
                        name: eventName,
                        code: new Date().getTime(),
                        platform: testPlatformId,
                        type: testRewardTypeId,
                        condition: {
                            partnerLevel: partnerLevelName,
                            numOfEntries: referralRewardParam.rewardAmount.data.length
                        },
                        param: referralRewardParam,
                        executeProposal: proposalTypeObjId
                    };
                    return dbRewardEvent.createRewardEvent(eventData);
                }
            )
        }
    );
}

function createPartnerIncentiveRewardEvent (testPlatformId, partnerLevelName, validConsumptionSum, rewardAmount) {
    var typeName = constProposalType.PARTNER_INCENTIVE_REWARD;

    var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: typeName});
    var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: testPlatformId, name: typeName});

    return Q.all([typeProm, typeProcessProm]).then(
        function (data) {
            if (!data || !data[0] || !data[1]) {
                return Q.reject(Error("Failed to get proposalType and proposalTypeProcess", {data: data}));
            }

            data[0].name.should.equal(typeName);
            data[1].name.should.equal(typeName);
            var proposalTypeObjId = data[0]._id;
            var proposalTypeProcessId = data[1]._id;


            return dbRewardType.getRewardType({name: constRewardType.PARTNER_INCENTIVE_REWARD}).then(
                function (data) {
                    var testRewardTypeId = data._id;

                    var eventName = "testEvent" + Date.now();

                    var eventData = {
                        name: eventName,
                        code: new Date().getTime(),
                        platform: testPlatformId,
                        type: testRewardTypeId,
                        condition: {
                            partnerLevel: partnerLevelName,
                            // validPlayers: validPlayers,
                            validConsumptionSum: validConsumptionSum,
                            rewardAmount: rewardAmount
                        },
                        executeProposal: proposalTypeObjId
                    };
                    return dbRewardEvent.createRewardEvent(eventData);
                }
            );
        }
    );
}

function createPartnerTopUpReturnRewardEvent (testPlatformId, generatedData) {
    var partnerTopUpReturnTypeName = constProposalType.PARTNER_TOP_UP_RETURN;

    var typeProm = dbProposalType.getProposalType({platformId: testPlatformId, name: partnerTopUpReturnTypeName});
    var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({
        platformId: testPlatformId,
        name: partnerTopUpReturnTypeName
    });
    var partnerLevel = dbconfig.collection_partnerLevel.find({platform: testPlatformId});
    return Q.all([typeProm, typeProcessProm, partnerLevel]).then(
        function (data) {
            data[0].name.should.equal(partnerTopUpReturnTypeName);
            data[1].name.should.equal(partnerTopUpReturnTypeName);
            var partnerTopUpReturnProposalTypeId = data[0]._id;
            var partnerTopUpReturnProposalTypeProcessId = data[1]._id;
            var levels = data[2];
            return dbRewardType.getRewardType({name: partnerTopUpReturnTypeName}).then(
                function (data) {
                    var testPartnerTopUpReturnRewardTypeId = data._id;

                    var eventName = "testTopUpReturnEvent" + Date.now();

                    var eventData = {
                        name: eventName,
                        code: new Date().getTime(),
                        platform: testPlatformId,
                        type: testPartnerTopUpReturnRewardTypeId,
                        param: {
                            reward: {}
                        },
                        executeProposal: partnerTopUpReturnProposalTypeId
                    };
                    levels.forEach(
                        level => {
                            eventData.param.reward[level.value] = {
                                rewardPercentage: 0.01*(level.value+1),
                                maxRewardAmount: 100*(level.value+1),
                                minTopUpAmount: 1*(level.value+1),
                            };
                        }
                    );
                    if (generatedData) {
                        generatedData.partnerTopUpReturnRewardEventData = eventData;
                    }
                    return dbRewardEvent.createRewardEvent(eventData);
                }
            );
        }
    );
}

function linkTypeStepToProcess (testPlatformId, proposalTypeProcessName, stepType1Id) {
    return dbProposalTypeProcess.getProposalTypeProcess({
        platformId: testPlatformId,
        name: proposalTypeProcessName
    }).then(
        function (proposalTypeProcess) {
            var proposalTypeProcessId = proposalTypeProcess._id;

            var processProm = dbProposalTypeProcess.addStepToProcess(proposalTypeProcessId, [stepType1Id]);
            processProm.then(
                function (data) {
                    data.should.not.equal(undefined);
                }
            );
        }
    );
}

function clearConsumptionData(generatedData) {

    var platformObjId = generatedData.testPlatformId;
    var playerObjIds =  [generatedData.testPlayerId];

    var pmE = dbconfig.collection_playerConsumptionWeekSummary.remove({platformId:  platformObjId});
    var pmE1 = dbconfig.collection_playerConsumptionWeekSummary.remove({playerId: {$in:playerObjIds}});

    var pmF = dbconfig.collection_playerConsumptionDaySummary.remove({platformId: platformObjId});
    var pmF1 = dbconfig.collection_playerConsumptionDaySummary.remove({playerId: {$in:playerObjIds}});

    var pmG = dbconfig.collection_playerConsumptionSummary.remove({platformId: platformObjId});
    var pmG1 = dbconfig.collection_playerConsumptionSummary.remove({playerId: {$in:playerObjIds}});

    return Q.all([pmE,  pmE1, pmF, pmF1, pmG, pmG1]);
}

var rewardEventGenerator = {
    createFullAttendanceRewardEvent: createFullAttendanceRewardEvent,
    createPlayerConsumptionReturnRewardEvent: createPlayerConsumptionReturnRewardEvent,
    createPartnerConsumptionReturnRewardEvent: createPartnerConsumptionReturnRewardEvent,
    createPartnerReferralRewardEvent: createPartnerReferralRewardEvent,
    createPartnerIncentiveRewardEvent: createPartnerIncentiveRewardEvent,
    linkTypeStepToProcess: linkTypeStepToProcess,
    clearConsumptionData: clearConsumptionData,
    createPartnerTopUpReturnRewardEvent: createPartnerTopUpReturnRewardEvent
};

module.exports = rewardEventGenerator;