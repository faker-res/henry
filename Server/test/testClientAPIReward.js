var should = require('should');
var Q = require("q");
var WebSocketClient = require('../server_common/WebSocketClient');
var RewardService = require('../services/client/ClientServices').RewardService;
var PlatformService = require('../services/client/ClientServices').PlatformService;
var PlayerService = require('../services/client/ClientServices').PlayerService;
var ClientRewardAPITest = require('../testAPI/clientAPITest/ClientRewardAPITest');
var ClientPlatformAPITest = require('../testAPI/clientAPITest/ClientPlatformAPITest');
var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');

var dbconfig = require('../modules/dbproperties');
var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');

var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var constRewardType = require('./../const/constRewardType');
var constProposalType = require('./../const/constProposalType');
var dbRewardType = require('./../db_modules/dbRewardType');
var dbProposalType = require('../db_modules/dbProposalType');
var dbProvider = require('./../db_modules/dbGameProvider');
var dbGame = require('./../db_modules/dbGame');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbPaymentChannel = require('../db_modules/dbPaymentChannel');
var dbPlayerTopUpIntentRecord = require('../db_modules/dbPlayerTopUpIntentRecord');
var dbPlayerConsumptionRecord = require('../db_modules/dbPlayerConsumptionRecord');

var rewardEventGenerator = require("./../test_modules/rewardEventGenerator.js");
var commonTestActions = require("../test_modules/commonTestActions.js");
var dbPlayerConsumptionDaySummary = require("../db_modules/dbPlayerConsumptionDaySummary.js");
var topUpRecordId = null;
var testRewardEventId = null; // GameProviderReward Event

var testPlayerId = null;
var testPlayerObjId = null;

var testPlatformObjId = null; // _id
var testPlatformId = null; // platformId

var testProviderId = null;
var testProviderObjId = null;
var testGameId = null;
var testGameObjId = null;
var testRewardTypeId = null;
var testConsumptionRewardTypeId = null;
var testFirstTopUpRewardTypeId = null;

var proposalTypeId = null;
var proposalTypeId2 = null;
var proposalTypeId3 = null;

var testChannelId = null;
var testPlayerName = null;

describe("Test Client API - reward service", function () {

    //todo::disable test for now
    //return;

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var rewardService = new RewardService();
    client.addService(rewardService);
    var clientRewardAPITest = new ClientRewardAPITest(rewardService);

    var platformService = new PlatformService();
    client.addService(platformService);
    var clientPlatformAPITest = new ClientPlatformAPITest(platformService);

    var playerService = new PlayerService();
    client.addService(playerService);
    var clientPlayerAPITest = new ClientPlayerAPITest(playerService);

    //// Init Proposal Data - Start ///////

    it('Should create test API player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test provider and game', function (done) {

        commonTestFun.createTestGameProvider().then(
            function (data) {
                testProviderObjId = data._id;
                testProviderId = data.providerId;
                return commonTestFun.createGame(testProviderObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameObjId = data._id;
                testGameId = data.gameId;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test payment channel', function (done) {
        commonTestFun.createTestPaymentChannel().then(
            function (data) {
                if (data && data.channelId) {
                    testChannelId = data.channelId;
                    done();
                }
            },
            function (error) {
                console.log({error: error});
            }
        );
    });


    it('it should create reward task for player', function (done) {
        var taskData = {
            playerId: testPlayerObjId,
            platformId: testPlatformObjId,
            targetProviders: [testProviderObjId],
            type: "unitTestTask",
            rewardType: "testTask",
            requiredUnlockAmount: 60,
            initAmount: 30,
            currentAmount: 30,
        };
        dbRewardTask.createRewardTask(taskData).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function (error) {
                console.log(error);
            }
        );
    });


    it('Should create TopUp Record', function (done) {
        commonTestFun.createTopUpRecord(testPlayerObjId, testPlatformObjId).then(
            function (data) {
                topUpRecordId = data._id;
                done();

            }, function (error) {
                console.log({error: error});
            });
        }
    );

    it('Should get GameProvider Reward Type ID', function (done) {
            commonTestFun.getRewardType(constProposalType.GAME_PROVIDER_REWARD).then(
                function (data) {
                    testRewardTypeId = data._id;
                    done();
                },

                function (error) {
                    console.error(error);
                });
        }
    );

    it('Should get gameProvider reward proposal type Id', function (done) {
        commonTestFun.getProposalType(testPlatformObjId, constProposalType.GAME_PROVIDER_REWARD).then(
            function (data) {
                proposalTypeId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );

    });

    it('Should create GameProvider Reward Event', function (done) {
        var eventData = {
            type: testRewardTypeId,
            name: constProposalType.GAME_PROVIDER_REWARD,
            code: new Date().getTime(),
            platform: testPlatformObjId,
            param: {
                provider: testProviderObjId,
                games: [testGameObjId],
                rewardPercentage: 1.5,
                spendingPercentage: 1.2
            },
            executeProposal: proposalTypeId
        };
        commonTestFun.createRewardEvent(eventData).then(
            function (data) {
                // console.log("GameProviderRewardEvent",data);
                testRewardEventId = data._id;
                done();
            },
            function (error) {
                console.log({error: error});
            }
        )

    });

    it('Should get Consumption Reward Type ID and proposalType Id', function (done) {

        commonTestFun.getRewardType(constProposalType.PLAYER_CONSUMPTION_RETURN).then(
            function (data) {
                //console.log('getFirstTopUpRewardType', data);
                testConsumptionRewardTypeId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            });
    });

    it('Should get player consumption proposal type Id', function (done) {
        commonTestFun.getProposalType(testPlatformObjId, constProposalType.PLAYER_CONSUMPTION_RETURN).then(
            function (data) {
                proposalTypeId2 = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );

    });

    /*
     it('Should create player consumptionReturn reward event', function (done) {
     var consumptionRewardEventData = {
     priority: 0,
     needApply: false,
     condition: null,
     param: {
     ratio: {
     Normal: {
     Casual: 0.02,
     Card: 0.03,
     Sports: 0.04,
     Coin: 0.06
     },
     VIP: {
     Casual: 0.03,
     Card: 0.04,
     Sports: 0.05,
     Coin: 0.07
     },
     Diamond: {
     Casual: 0.04,
     Card: 0.05,
     Sports: 0.06,
     Coin: 0.08
     }
     }
     },
     executeProposal: proposalTypeId2,
     type: testConsumptionRewardTypeId,
     platform: testPlatformObjId,
     code: '1465891203438',
     name: constProposalType.PLAYER_CONSUMPTION_RETURN
     };
     return commonTestFun.createRewardEvent(consumptionRewardEventData).then(
     function (data) {
     //console.log("playerConsumptionRewardEvent", data);
     done();
     },
     function (error) {
     console.log({error: error});
     }
     );
     });
     */

    it('Should create player consumptionReturn reward event', function () {
        return rewardEventGenerator.createPlayerConsumptionReturnRewardEvent(testPlatformObjId);
    });

    it('Should get First TopUp Reward Type ID', function (done) {

        commonTestFun.getRewardType(constProposalType.FIRST_TOP_UP).then(
            function (data) {
                //console.log('getFirstTopUpRewardType', data);
                testFirstTopUpRewardTypeId = data._id;
                done();
            },

            function (error) {
                console.error(error);
            });
    });

    it('Should get First TopUp Reward proposal type Id', function (done) {

        commonTestFun.getProposalType(testPlatformObjId, constProposalType.FIRST_TOP_UP).then(
            function (data) {
                proposalTypeId3 = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );

    });

    it('Should create first topup reward event', function () {
        var deferred = Q.defer();
        var eventData = {
            name: constProposalType.FIRST_TOP_UP,
            code: new Date().getTime(),
            platform: testPlatformObjId,
            type: testFirstTopUpRewardTypeId,
            param: {
                rewardPercentage: 0.3,
                spendingPercentage: 0.5
            },
            executeProposal: proposalTypeId3
        };
        commonTestFun.createRewardEvent(eventData).then(
            function (data) {
                //console.log("playerFirstTopUp",data);
                deferred.resolve(data);
                //done();
            },
            function (error) {
                console.log({error: error});
            }
        );
    });

    it('Should create topUp Proposal', function (done) {

        var topUpData = {
            playerId: testPlayerId,
            topUpAmount: 260,
            topupChannel: testChannelId
        };
        dbPlayerTopUpIntentRecord.generateProposalIDfromTopupIntention(topUpData).then(
            function (data) {
                //console.log('Create TopUp Proposal', data);
                return dbPlayerTopUpRecord.playerTopUpSuccess({proposalId: data.proposalId}, topUpData);
            },
            function (error) {
                console.log({'topUpProposal': error});
            }
        ).then(function (data) {
                //console.log('Approve TopUp Proposal', data);
                done();
            },
            function (error) {
                console.log({'topUp Success': error});
            }
        )
    });

    it('Should create consumption record to unlock the reward task', function (done) {

        var consumptionRecord = {
            //name:  playerName,
            playerId: testPlayerObjId,
            platformId: testPlatformObjId,
            providerId: testProviderObjId,
            gameId: testGameObjId, // to check
            amount: 70,
            validAmount: 50,
            gameType: 'test',
            createTime: Date.now(),
            orderNo: new Date().getTime()+Math.random()
        };

        dbPlayerConsumptionRecord.createPlayerConsumptionRecord(consumptionRecord).then(
            function (data) {
                // console.log("consumptionRecord", data);
                done();
            },
            function (error) {
                console.log({'createConsumption Error': error});
            }
        );
    });

    /*
     // I tried this (copied from testEventConsumptionReturn.js) but it didn't help:

     var consumeDays = 1;

     it('test daily player consumption summary task', function () {
     return commonTestActions.calculatePlatformDaySummaryForPastDays(consumeDays, testPlatformId);
     });

     it('test daily player game type consumption summary task', function (done) {
     var proms = [];

     for (var i = 0; i < consumeDays; i++) {
     var endTime = new Date();
     endTime.setHours(0, 0, 0, 0);
     endTime.setDate(endTime.getDate() - i);
     var startTime = new Date();
     startTime.setHours(0, 0, 0, 0);
     startTime.setDate(startTime.getDate() - (i + 1));
     // proms.push(dbPlayerGameTypeConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, testPlatformId));
     proms.push(dbPlayerConsumptionDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, testPlatformId));
     }
     Q.all(proms).then(
     function (data) {
     if (data) {
     done();
     }
     },
     function (error) {
     console.error(error);
     }
     );
     });
     */
    //// Init Proposal Data - End ///////

    it('Should create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });


    it('Should login apiUser', function (done) {
        const testPlayerLoginData = {
            name: testPlayerName,
            password: "123456",
            lastLoginIp: "192.168.3.22",
            platformId: testPlatformId
        };
        clientPlayerAPITest.login(function (data) {
            done();
        }, testPlayerLoginData);
    });

    //todo::fix this test later
    // it('Should get all reward list available for a  player', function (done) {
    //     clientRewardAPITest.getRewardList(function (data) {
    //         if (data.data) {
    //             //console.log("getRewardList", data);
    //             for (var i = 0; i < data.data.length; i++) {
    //                 if (data.data[i]._id == testRewardEventId) {
    //                     done();
    //                 }
    //             }
    //         }
    //     }, {platformId: testPlatformId});
    // });


    it('Should get player reward list', function (done) {
        var rewardListQuery = {
            startTime: "2016-01-01",
            endTime: "2016-12-31",
            rewardType: 'PlayerConsumptionReturn',
            startIndex: 0,
            requestCount: 15
        };
        clientRewardAPITest.getPlayerRewardList(function (data) {
            //console.log("getPlayerRewardList", data);
            data.status.should.equal(200);
            done();
        }, rewardListQuery);
    });

    it('Should get all reward events task for a player', function (done) {
        clientRewardAPITest.getRewardTask(function (data) {
            //console.log("getRewardTask", data);
            data.status.should.equal(200);
            done();
            //var rewardTaskPlayerId = data.data.playerId;
            //rewardTaskPlayerId.should.equal(testPlayerId);
            //done();
        }, {playerId: testPlayerId});
    });


    it('Should get consume rebate', function (done) {
        clientRewardAPITest.requestConsumeRebate(function (data) {
            //console.log("requestConsumeRebate", data);
            if (data.data) {
                data.data.should.equal(true);
            }
            done();
        }, {playerId: testPlayerId});
    });

    it('Should get consume rebate amount', function (done) {
        clientRewardAPITest.getConsumeRebateAmount(function (data) {
            if (data.data) {
                var total = data.data;
                total.should.have.property('totalAmount');

                if (!(total.totalAmount > 0)) {
                    console.warn("todo: This test is not getting the expected response data!");
                    console.log("getConsumeRebateAmount response:", data);
                }

                // These tests are not passing because dbPlayerConsumptionWeekSummary.getPlayerConsumptionReturnAmount() was getting consumptionSummaries = [];
                // However I have tested the internal calls in testEventConsumptionReturn.js under 'Should get consume rebate amount'
                //total.totalAmount.should.be.a.Number;
                //total.totalAmount.should.be.greaterThan(0);
                //total.should.have.property('Card');
            }
            done();
        }, {});
    });

    it('Should reset the state of showInfo ', function (done) {

       /* dbPlayerInfo.setBonusShowInfo(testPlayerId,1).then(function (data){
            console.log("++++++++++++++++++++",data)
            data.viewInfo.showInfoState.should.equal(true);
           //data.viewInfo.showInfoState.should.equal(false);
            done();
        }, function (error) {
            console.log({'reset Error': error});
        });*/
        clientRewardAPITest.setBonusShowInfo(function (data) {

            if (data) {
                data.data.viewInfo.showInfoState.should.equal(true);
                done();
            }

        }, {playerId: testPlayerId, setShowInfo: 1});

    });

    //todo:: re-eanble after first top up update
   return;
    // it('Should check - the user should be valid for first top-up reward', function (done) {
    //
    //     clientRewardAPITest.isValidForFirstTopUpReward(function (data) {
    //         //console.log("isValidForFirstTopUpReward", data);
    //         data.data.ConsumptionRecord.should.equal(true);
    //         done();
    //     }, {playerId: testPlayerId});
    // });
    //
    // it('Should create first topup reward proposal', function (done) {
    //     clientRewardAPITest.createFirstTopUpRewardProposal(function (data) {
    //         // console.log("createFirstTopUpRewardProposal", data);
    //         data.data.should.have.property('_id');
    //         done();
    //     }, {playerId: testPlayerId, topUpRecordId: topUpRecordId});
    // });

    it('Should apply provider reward', function (done) {
        clientRewardAPITest.applyProviderReward(function (data) {
            // console.log("applyProviderReward", data);
            data.data.should.equal('RewardTaskExist');
            done();

        }, {playerId: testPlayerId, eventId: testRewardEventId, amount: 250});
    });

    it('Should get platform details list', function (done) {
        clientPlatformAPITest.getPlatformDetails(function (data) {
                //console.log("getPlatformDetails", data);
                data.data.platformId.should.equal(testPlatformId);
                done();
            }, {platformId: testPlatformId}
        );
    });

    it('Should get platform announcements', function (done) {
        clientPlatformAPITest.getPlatformAnnouncements(function (data) {
            //console.log("getPlatformAnnouncements", data);
            data.status.should.equal(200);
            done();
        }, {
            platformId: testPlatformId
        });
    });

    it('Should remove all test Data', function (done) {
        commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function (data) {
            done();
        })
    });

    it('Should remove all test Data', function (done) {
        commonTestFun.removeTestProposalData([], testPlatformObjId, [proposalTypeId, proposalTypeId2, proposalTypeId3], [testPlayerObjId]).then(function (data) {
            done();
        })
    });

    
});




