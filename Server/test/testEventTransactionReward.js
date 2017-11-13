var should = require('should');
var dbProposalType = require('../db_modules/dbProposalType');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var dbDepartment = require('../db_modules/dbDepartment');
var constProposalType = require('./../const/constProposalType');
var dbRole = require('../db_modules/dbRole');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var constRewardType = require('./../const/constRewardType');
var dbRewardRule = require('./../db_modules/dbRewardRule');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbProvider = require('./../db_modules/dbGameProvider');
var dbGame = require('./../db_modules/dbGame');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbProposal = require('./../db_modules/dbProposal');
var dbRewardType = require('./../db_modules/dbRewardType');
var dbconfig = require('./../modules/dbproperties');
var dbPaymentChannel = require('./../db_modules/dbPaymentChannel');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpIntentRecord = require('./../db_modules/dbPlayerTopUpIntentRecord');

var commonTestFunc = require('../test_modules/commonTestFunc');
var typeName = constProposalType.PLATFORM_TRANSACTION_REWARD;
var Q = require("q");

var proposalTypeId = null;
var proposalId = null;
var testRewardTypeId = null;
var testPlatformId = null;
var testProviderId = null;
var testProviderId2 = null;
var testGameId = null;
var testGameId2 = null;
var testPlayersId = [];
var playerShortId = [];
var playerLevelId = null;
var paymentId = null;
var topUpAmount = 200;
var topUpPercentage = .3;

var testPlayerNum = 3;
var rewardTypeName = 'PlatformTransactionReward';

describe("Test Transaction Reward event", function () {

    it('Should create test API platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test provider-One and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testGameProviderObjId = data._id;
                return commonTestFunc.createGame(testGameProviderObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test provider-Two and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                testProviderId2 = data._id;
                return commonTestFunc.createGame(testProviderId2);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId2 = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('get test reward type', function (done) {
        dbRewardType.getRewardType({name: constRewardType.PLATFORM_TRANSACTION_REWARD}).then(
            function (data) {
                testRewardTypeId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should get player level ID', function (done) {
        dbconfig.collection_playerLevel.findOne({
            platform: testPlatformId,
            value: 0
        }).then(
            function (data) {
                playerLevelId = data._id;
                done();
            }
        );
    });

    it('create test platform and player', function (done) {
        var date = new Date();
        var eventName = "testEvent" + date.getTime();

        var proms = [];
        var date = new Date();
        for (var i = 0; i < testPlayerNum; i++) {
            var playerData = {
                name: "testpayer" + i + date.getTime(),
                platform: testPlatformId,
                password: "123",
                games: [testGameId2, testGameId],
                phoneNumber: "11111111" + i
            };
            proms.push(dbPlayerInfo.createPlayerInfo(playerData));
        }
        Q.all(proms).then(
            function (data) {
                if (data) {
                    for (var j = 0; j < data.length; j++) {
                        testPlayersId.push(data[j]._id);
                        playerShortId.push(data[j].playerId)
                    }
                }
            }
        ).then(
            function (data) {
                var eventData = {
                    name: eventName,
                    code: new Date().getTime(),
                    platform: testPlatformId,
                    type: testRewardTypeId,
                    param: {
                        playerLevel: playerLevelId,
                        rewardPercentage: topUpPercentage
                    },
                    executeProposal: proposalTypeId
                };
                return dbRewardEvent.createRewardEvent(eventData).then(
                    function (data) {
                        done();
                    }
                );
            },
            function (error) {
            }
        );

    });

    it('Should create test payment channel', function (done) {
        commonTestFunc.createTestPaymentChannel().then(
            function (data) {
                if (data && data.channelId) {
                    paymentId = data.channelId;
                    done();
                }
            },
            function (error) {
                console.log({error: error});
            }
        );
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformId, testPlayersId).then(function(data){
            done();
        })
    });

    it('Should remove all test proposal Data', function(done){
        commonTestFunc.removeTestProposalData([] , testPlatformId, [], testPlayersId).then(function(data){
            done();
        })
    });
    //todo::update this test later
    return;
    it('Should create a topup intention record', function () {
        var para = {
            playerId: playerShortId[0],
            platformId: testPlatformId,
            topUpAmount: topUpAmount,
            topupChannel: paymentId,
            topUpAmount: topUpAmount
        };
        return dbPlayerTopUpIntentRecord.generateProposalIDfromTopupIntention(para).then(
            function (data) {
                proposalId = data.proposalId;
                var sendData = {
                    proposalId: proposalId,
                    playerId: playerShortId[0],
                    topUpAmount: topUpAmount,
                    amount: topUpAmount
                };
                //todo::re-written test here
                return dbPlayerTopUpRecord.playerTopUpSuccess({proposalId: proposalId}, sendData).then(
                    function (data) {
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayersId[0]}).then(
                            function (data) {
                                data.validCredit.should.equal(topUpAmount + Math.floor(topUpAmount * topUpPercentage));
                            }
                        );
                   }
                );
            }
        );
    });




});