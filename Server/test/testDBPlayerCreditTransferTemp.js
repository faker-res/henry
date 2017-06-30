/*  
 *  After the functions are moved from dbPlayerInfo to dbPlayerCreditTransfer,
 *  TODO :: change the function used to test the correct functions.
 */

let should = require('should');
let dbConfig = require('../modules/dbproperties');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbPlatform = require('../db_modules/dbPlatform');
let dbRewardTask = require('../db_modules/dbRewardTask');
let mongoose = require('mongoose');
let commonTestFunc = require('../test_modules/commonTestFunc');
let Q = require('q');

describe('Test player credit transfer', function () {

    // todo :: WIP
    return true;
    
    let testPlatformObj = null;
    let testGameProviderObj = null;
    let testGameProviderObj2 = null;

    before(function (done) {
        // create a test platform
        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatformObj = data;
                // create a test game provider
                return commonTestFunc.createTestGameProvider();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        ).then(
            function (data) {
                testGameProviderObj = data;
                // create another test game provider
                return commonTestFunc.createTestGameProvider();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        ).then(
            function (data) {
                testGameProviderObj2 = data;
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });

    describe('Scenario that transfer in should fail', function () {
        
        describe('Transfer in with no valid credit and reward credit', function () {
            
            let testPlayerObj = null;
            
            before(function (done) {
                // create a test player without credit
                let prom1 = createCustomTestPlayer(testPlatformObj._id, {validCredit: 0}).then(
                    function (data) {
                        testPlatformObj = data;
                        done();
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should fail when trying to transfer 0 credit', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 0, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        console.error(data);
                        done(new Error("Player successfully transferred 0 credit to the provider, which should not be happened."));
                    },
                    function (error) {
                        done();
                    }
                )
            });
            
            it('should fail when trying to transfer credit that player does not have enough', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 5, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        console.error(data);
                        done(new Error("Player successfully transferred 5 credit to the provider, which should not be happened."));
                    },
                    function (error) {
                        done();
                    }
                )
            });
        });

        describe('Transfer in with non-applicable reward credit only', function () {
            
            let testPlayerObj = null;
            let testRewardObj = null;
            
            before(function (done) {
                // create a test player without credit
                createCustomTestPlayer(testPlatformObj._id, {validCredit: 0}).then(
                    function (data) {
                        testPlatformObj = data;
                        
                        // create a test reward task
                        let rewardTaskData = {
                            playerId: testPlayerObj._id,
                            platformId: testPlatformObj._id,
                            targetProviders: [testGameProviderObj2._id],
                            type: "testTask",
                            rewardType: "testTask",
                            requiredUnlockAmount: 200,
                            initAmount: 100,
                            currentAmount: 100
                        }

                        return dbRewardTask.createRewardTask(rewardTaskData);
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                ).then(
                    function (data) {
                        testRewardObj = data;
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                )
            });

            it('should fail when trying to transfer 0 credit', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 0, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        console.error(data);
                        done(new Error("Player successfully transferred 0 credit to the provider, which should not be happened."));
                    },
                    function (error) {
                        done();
                    }
                )
            });

            it('should fail when trying to transfer credit from inapplicable reward', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 100, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        console.error(data);
                        done(new Error("Player successfully transferred 100 credit to the provider, which should not be happened."));
                    },
                    function (error) {
                        done();
                    }
                )
            });

        });
    });
    
    describe('Player transfer in and out without winning or losing credits', function () {
        describe('with only valid credit', function () {

            let testPlayerObj = null;
            
            before(function (done) {
                createCustomTestPlayer(testPlatformObj._id).then(
                    function (data) {
                        testPlayerObj = data;
                        done();
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer in credit to provider', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 300, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        if (data) {
                            data.providerCredit.should.be.equal(300);
                            data.transferCredit.playerCredit.should.be.equal(300);
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return null."));
                        }
                        
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                )
            });

            it('should be able to transfer in again after topup', function (done) {
                dbPlayerInfo.playerTopUp(testPlayerObj._id, 200, "testPayment").then(
                    function () {
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 200, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            data.providerCredit.should.be.equal(500);
                            data.transferCredit.playerCredit.should.be.equal(200);
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return null."));
                        }
                    }
                )
            });

            it('should be able to transfer out with all the credit back into valid credit', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 500, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(500);
                        data.transferCredit.playerCredit.should.be.equal(500);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(500);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                )
            });
        });

        describe('with only applicable reward credit', function () {
            // #4

            // before:
                // create a player that have 0 valid credit
                // create an applicable reward for this player

            // test if transfer in success
            // test if the amount of game credit is correct
            // top up
            // test transfer in again
            // test if the amount of game credit is correct
            // test if transfer out is success
            // test if the amount of transfer out is correct
        });

        describe('with non-applicable reward credit and valid credit', function () {
            // #5

            // before:
                // create a player that have 0 valid credit
                // create a non-applicable reward for this player

            // test if transfer in success
            // test if the amount of game credit is correct
            // top up
            // test transfer in again
            // test if the amount of game credit is correct
            // test if transfer out is success
            // test if the amount of transfer out is correct
        });

        describe('with applicable reward credit and valid credit', function () {
            // #6

            // before:
                // create a player
                // create a non-applicable reward for this player

            // test if transfer in success
            // test if the amount of game credit is correct
            // top up
            // test transfer in again
            // test if the amount of game credit is correct
            // test if transfer out is success
            // test if the amount of transfer out is correct
        });
    });

    describe('Transfer out with winning credits', function () {
       
        describe('with only valid credit', function () {
            // #7

            // before:
                // create a player
                // transfer in
                // win some credits

            // test if transfer out success
            // test if transfer out have the right amount on valid credit
        });

        describe('with only applicable reward credit', function () {
            // #8

            // before:
                // create a player with 0 valid credit
                // create an applicable reward for the player
                // transfer in
                // win some credits

            // test if transfer out success
            // test if transfer out have the right amount on valid credit   
            // test if transfer out have the right amount of reward current amount
        });

        describe('with non-applicable reward credit and valid credit', function () {
            // #9

            // before:
                // create a player
                // create a non-applicable reward for the player
                // transfer in
                // win some credits

            // test if transfer out success
            // test if transfer out have the right amount on valid credit   
            // test if transfer out have the right amount of reward current amount
        });

        describe('with applicable reward credit and valid credit', function () {
            // #10

            // before:
                // create a player
                // create an applicable reward for the player
                // transfer in
                // win some credits

            // test if transfer out success
            // test if transfer out have the right amount on valid credit   
            // test if transfer out have the right amount of reward current amount
        });
    });

    describe('Transfer out with losing credits', function () {
        
        describe('with only valid credit', function () {
            // #11

            // before:
                // create a player
                // transfer in
                // lose some credits

            // test if transfer out success
            // test if transfer out have the right amount on valid credit   
            // test if transfer out have the right amount of reward current amount
        });

        describe('with only applicable reward credit', function () {
            // #12

            // before:
                // create a player with 0 valid credit
                // create an applicable reward for the player
                // transfer in
                // lose some credits

            // test if transfer out success
            // test if transfer out have the right amount on valid credit   
            // test if transfer out have the right amount of reward current amount
        });

        describe('with non-applicable reward credit and valid credit', function () {
            // #13

            // before:
                // create a player
                // create a non-applicable reward for the player
                // transfer in
                // lose some credits

            // test if transfer out success
            // test if transfer out have the right amount on valid credit   
            // test if transfer out have the right amount of reward current amount
        });

        describe('with applicable reward credit and valid credit', function () {
            
            describe('The amount losses is less than the valid credit', function () {
                // #14

                // before:
                    // create a player
                    // create an applicable reward for the player
                    // transfer in
                    // lose some credits

                // test if transfer out success
                // test if transfer out have the right amount on valid credit   
                // test if transfer out have the right amount of reward current amount
            });

            describe('The amount losses is more than the valid credit', function () {
                // #15

                // before:
                    // create a player
                    // create an applicable reward for the player
                    // transfer in
                    // lose some more credits

                // test if transfer out success
                // test if transfer out have the right amount on valid credit   
                // test if transfer out have the right amount of reward current amount
            });
        });
    });

    describe('test when the same transfer in request is triggered multiple times', function () {
        // #16

        // before:
            // create a player
            // create promise that do the transfer in
            // create an array that hold 10 of that same promise
        
        // test if only one transfer in is success
        // test if the game credit is correct
    })

    describe('test transfering in and out with register reward', function () {
        // before
            // create a player with 0 credit
            // create a register reward
            // create a reward task of register reward for this player

        // test if transfer in is working as intended
        // win some credit
        // test if transfer out is working as intended
    });
});

// might want to move to commonTestFunc or modify the current commonTestFunc.createTestPlayer()
function createCustomTestPlayer (platformId, data) {
    return Q.all([
        commonTestFunc.getTestMerchantGroup(platformId),
        commonTestFunc.getTestBankCardGroup(platformId),
    ]).spread(
        (merchantGroup, bankCardGroup) => {
            var date = new Date();
            var playerName = commonTestFunc.testPlayerName + date.getTime() + commonTestFunc.getRandomInt();

            var playerData = {
                name: playerName,
                platform: platformId,
                password: '123456',
                validCredit: 300,
                realName: "Test Player",
                phoneNumber: '80808080',
                email: 'testPlayer@sinonet.com.sg',

                // Example bank details (may need some improvement)
                bankName: 'Banky McBankFace',
                bankAccount: '123456',
                bankAccountName: 'Current Account',
                bankAccountType: 'Current',
                bankAccountCity: 'Cebu',
                bankAddress: '1 Banking Street, Cebu, Philippines',
                bankBranch: 'Cebu Central',
                internetBanking: 'https://bankymcbankfacebanking.com/',

                merchantGroup: merchantGroup._id,
                bankCardGroup: bankCardGroup._id,
            };

            if (data) {
                Object.assign(playerData, data);
            }

            return dbPlayerInfo.createPlayerInfo(playerData);
        }
    );
}