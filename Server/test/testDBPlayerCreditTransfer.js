var should = require('should');
var dbconfig = require('./../modules/dbproperties');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardTask = require('../db_modules/dbRewardTask');
var dbProvider = require('../db_modules/dbGameProvider');
var mongoose = require('mongoose');
var commonTestFun = require('../test_modules/commonTestFunc');
var Q = require("q");

describe("Test player credit transfter", function () {

    var testPlatformId = null;
    var testPlayerId = null;
    var testProviderId = null;

    it('Should create test player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {
                testPlatformId = data._id;
                return commonTestFun.createTestPlayer(testPlatformId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerId = data._id;
                //console.log("player", data);
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
                testProviderId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('it should create reward task for player', function (done) {
        var taskData = {
            playerId: testPlayerId,
            platformId: testPlatformId,
            targetProviders: [testProviderId],
            type: "testTask",
            rewardType: "testTask",
            requiredUnlockAmount: 200,
            initAmount: 100,
            currentAmount: 100,
        };
        dbRewardTask.createRewardTask(taskData).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function(error){
                console.log(error);
            }
        );
    });

    // it('it should get player locked credit', function (done) {
    //     dbPlayerInfo.getPlayerInfo({_id: testPlayerId}).then(
    //         function (data) {
    //             if (data) {
    //                 data.lockedCredit.should.not.equal(0);
    //                 done();
    //             }
    //         }
    //     );
    // });


    //todo::enable this later
    return;

    it('it should transfer player credit to provider', function (done) {
        dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerId, testPlatformId, testProviderId, -1).then(
            function (data) {
                if (data) {
                    done();
                }
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('it should get player credit in provider', function (done) {
        dbconfig.collection_providerPlayerCredit.findOne({playerId: testPlayerId, providerId: testProviderId}).then(
            function(data){
                //console.log(data);
                done();
            }
        );
    });

    it('it should transfer player credit out from provider', function (done) {
        dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerId, testPlatformId, testProviderId, -1).then(
            function (data) {
                if (data) {
                    //console.log(data);
                    done();
                }
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('it should get player credit in provider', function (done) {
        dbconfig.collection_providerPlayerCredit.findOne({playerId: testPlayerId, providerId: testProviderId}).then(
            function(data){
               // console.log(data);
                done();
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('it should transfer player credit to provider', function (done) {
        dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerId, testPlatformId, testProviderId, -1).then(
            function (data) {
                if (data) {
                    //console.log(data);
                    done();
                }
            }
        );
    });

    // it('it should update player credit in provider', function (done) {
    //     dbconfig.collection_providerPlayerCredit.findOneAndUpdate(
    //         {playerId: testPlayerId, providerId: testProviderId},
    //         {gameCredit: 500}
    //     ).then(
    //         function(data){
    //             console.log(data);
    //             done();
    //         }
    //     );
    // });

    it('it should transfer player credit out from provider', function (done) {
        dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerId, testPlatformId, testProviderId, -1).then(
            function (data) {
                if (data) {
                   // console.log(data);
                    done();
                }
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('it should get player reward task', function (done) {
        dbRewardTask.getRewardTask({playerId: testPlayerId}).then(
            function(data){
                //console.log(data);
                done();
            },
            function(error){
                console.log(error);
                done();
            }
        );
    });

    it('it should get player credit in provider', function (done) {
        dbconfig.collection_providerPlayerCredit.findOne({playerId: testPlayerId, providerId: testProviderId}).then(
            function(data){
               // console.log(data);
                done();
            },
            function(error){
                console.log(error);
            }
        );
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformId, [testPlayerId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformId, [], [testPlayerId]).then(function(data){
            done();
        })
    });


});







