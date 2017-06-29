/*  
 *  After the functions are moved from dbPlayerInfo to dbPlayerCreditTransfer,
 *  TODO :: change the function used to test the correct functions. #dbGameProvider.getPlayerCreditInProvider()
 * 
 *  TODO :: test if the game credit is correct
 */

let should = require('should');
let dbConfig = require('../modules/dbproperties');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');
let dbPlatform = require('../db_modules/dbPlatform');
let dbRewardTask = require('../db_modules/dbRewardTask');
let dbProvider = require('../db_modules/dbProvider');
let mongoose = require('mongoose');
let commonTestFunc = require('../test_modules/cc');
let Q = require('q');
const constProposalType = require('./../const/constProposalType');
const registrationRewardType = constProposalType.PLAYER_REGISTRATION_REWARD;

describe('Test player credit transfer', function () {

    // todo :: WIP
    return false;
    
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
                );
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
                );
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
                );
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
                );
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
                );
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
                );
            });
        });

        describe('with only applicable reward credit', function () {
            
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
                            targetProviders: [testGameProviderObj._id],
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
                );
            });

            it('should be able to transfer in credit to provider', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 100, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        if (data) {
                            data.providerCredit.should.be.equal(100);
                            data.transferCredit.rewardCredit.should.be.equal(100);
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return null."));
                        }
                        
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
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
                            data.providerCredit.should.be.equal(300);
                            data.transferCredit.playerCredit.should.be.equal(200);
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return null."));
                        }
                    }
                );
            });

            it('should be able to transfer out correct amount to both reward and valid credit', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 500, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(200);
                        data.rewardCredit.should.be.equal(100);
                        data.transferCredit.playerCredit.should.be.equal(200);
                        data.transferCredit.rewardCredit.should.be.equal(100);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(200);
                        data.lockedCredit.should.be.equal(100);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                );
            });
        });

        describe('with non-applicable reward credit and valid credit', function () {
            
            let testPlayerObj = null;
            let testRewardObj = null;
            
            before(function (done) {
                // create a test player credit
                createCustomTestPlayer(testPlatformObj._id).then(
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

            it('should fail when trying to transfer with the reward amount as well', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 400, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        console.error(data);
                        done(new Error("Player successfully transferred 400 credit to the provider including reward credit, which should not be happened."));
                    },
                    function (error) {
                        done();
                    }
                )
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
                        data.transferCredit.rewardCredit.should.be.equal(0);
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

        describe('with applicable reward credit and valid credit', function () {
            
            let testPlayerObj = null;
            let testRewardObj = null;
            
            before(function (done) {
                // create a test player
                createCustomTestPlayer(testPlatformObj._id).then(
                    function (data) {
                        testPlatformObj = data;
                        
                        // create a test reward task
                        let rewardTaskData = {
                            playerId: testPlayerObj._id,
                            platformId: testPlatformObj._id,
                            targetProviders: [testGameProviderObj._id],
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

            it('should be able to transfer in credit to provider', function (done) {
                dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 400, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        if (data) {
                            data.providerCredit.should.be.equal(400);
                            data.transferCredit.playerCredit.should.be.equal(300);
                            data.transferCredit.rewardCredit.should.be.equal(100);
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
                dbPlayerInfo.playerTopUp(testPlayerObj._id, 100, "testPayment").then(
                    function () {
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 100, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            data.providerCredit.should.be.equal(500);
                            data.transferCredit.playerCredit.should.be.equal(100);
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
                        data.playerCredit.should.be.equal(400);
                        data.rewardCredit.should.be.equal(100);
                        data.transferCredit.playerCredit.should.be.equal(400);
                        data.transferCredit.rewardCredit.should.be.equal(100);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(400);
                        data.lockedCredit.should.be.equal(100);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                )
            });
        });
    });

    describe('Transfer out with winning credits', function () {
        // amount of transfer out will be more than the amount of transfer in to simulate credit earning scenario
       
        describe('with only valid credit', function () {
            
            let testPlayerObj = null;
            
            before(function (done) {
                // create a test player with credit
                createCustomTestPlayer(testPlatformObj._id).then(
                    function (data) {
                        testPlayerObj = data;
                        // transfer in
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 300, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                        }
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer out correctly', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 500, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(500);
                        data.rewardCredit.should.be.equal(0);
                        data.transferCredit.playerCredit.should.be.equal(500);
                        data.transferCredit.rewardCredit.should.be.equal(0);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(500);
                        data.lockedCredit.should.be.equal(0);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                );
            });
        });

        describe('with only applicable reward credit', function () {
            
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
                            targetProviders: [testGameProviderObj._id],
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
                        // transfer in
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 100, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                        }
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer out correctly', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 500, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(0);
                        data.rewardCredit.should.be.equal(500);
                        data.transferCredit.playerCredit.should.be.equal(0);
                        data.transferCredit.rewardCredit.should.be.equal(500);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(0);
                        data.lockedCredit.should.be.equal(500);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                );
            });
        });

        describe('with non-applicable reward credit and valid credit', function () {
            
            let testPlayerObj = null;
            let testRewardObj = null;
            
            before(function (done) {
                // create a test player credit
                createCustomTestPlayer(testPlatformObj._id).then(
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
                        // transfer in
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 300, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                        }
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer out correctly', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 500, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(500);
                        data.rewardCredit.should.be.equal(0);
                        data.transferCredit.playerCredit.should.be.equal(500);
                        data.transferCredit.rewardCredit.should.be.equal(0);
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
                );
            });
        });

        describe('with applicable reward credit and valid credit', function () {
            
            let testPlayerObj = null;
            let testRewardObj = null;
            
            before(function (done) {
                // create a test player
                createCustomTestPlayer(testPlatformObj._id).then(
                    function (data) {
                        testPlatformObj = data;
                        
                        // create a test reward task
                        let rewardTaskData = {
                            playerId: testPlayerObj._id,
                            platformId: testPlatformObj._id,
                            targetProviders: [testGameProviderObj._id],
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
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 400, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                        }
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer out correctly', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 500, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(300);
                        data.rewardCredit.should.be.equal(200);
                        data.transferCredit.playerCredit.should.be.equal(300);
                        data.transferCredit.rewardCredit.should.be.equal(200);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(300);
                        data.lockedCredit.should.be.equal(200);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                );
            });
        });
    });

    describe('Transfer out with losing credits', function () {

        // amount of transfer out will be less than the amount of transfer in to simulate credit losing scenario
        describe('with only valid credit', function () {
            
            let testPlayerObj = null;
            
            before(function (done) {
                // create a test player with credit
                createCustomTestPlayer(testPlatformObj._id).then(
                    function (data) {
                        testPlayerObj = data;
                        // transfer in
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 300, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                        }
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer out correctly', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 250, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(250);
                        data.rewardCredit.should.be.equal(0);
                        data.transferCredit.playerCredit.should.be.equal(250);
                        data.transferCredit.rewardCredit.should.be.equal(0);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(250);
                        data.lockedCredit.should.be.equal(0);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                );
            });
        });

        describe('with only applicable reward credit', function () {
            // #12
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
                            targetProviders: [testGameProviderObj._id],
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
                        // transfer in
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 100, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                        }
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer out correctly', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 50, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(0);
                        data.rewardCredit.should.be.equal(50);
                        data.transferCredit.playerCredit.should.be.equal(0);
                        data.transferCredit.rewardCredit.should.be.equal(50);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(0);
                        data.lockedCredit.should.be.equal(50);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                );
            });
        });

        describe('with non-applicable reward credit and valid credit', function () {
            // #13
            let testPlayerObj = null;
            let testRewardObj = null;
            
            before(function (done) {
                // create a test player credit
                createCustomTestPlayer(testPlatformObj._id).then(
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
                        // transfer in
                        return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 300, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        if (data) {
                            done();
                        } else {
                            done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                        }
                    },
                    function (error) {
                        console.error(error);
                        done(error);
                    }
                );
            });

            it('should be able to transfer out correctly', function (done) {
                dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 250, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                    function (data) {
                        data.providerCredit.should.be.equal(0);
                        data.playerCredit.should.be.equal(250);
                        data.rewardCredit.should.be.equal(0);
                        data.transferCredit.playerCredit.should.be.equal(250);
                        data.transferCredit.rewardCredit.should.be.equal(0);
                        return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                    },
                    function (error) {
                        done(error);
                    }
                ).then(
                    function (data) {
                        data.validCredit.should.be.equal(250);
                        done();
                    },
                    function (error) {
                        done(error);
                    }
                );
            });
        });

        describe('with applicable reward credit and valid credit', function () {
            
            describe('The amount losses is less than the valid credit', function () {
                
                let testPlayerObj = null;
                let testRewardObj = null;
                
                before(function (done) {
                    // create a test player
                    createCustomTestPlayer(testPlatformObj._id).then(
                        function (data) {
                            testPlatformObj = data;
                            
                            // create a test reward task
                            let rewardTaskData = {
                                playerId: testPlayerObj._id,
                                platformId: testPlatformObj._id,
                                targetProviders: [testGameProviderObj._id],
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
                            return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 400, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                        },
                        function (error) {
                            done(error);
                        }
                    ).then(
                        function (data) {
                            if (data) {
                                done();
                            } else {
                                done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                            }
                        },
                        function (error) {
                            console.error(error);
                            done(error);
                        }
                    );
                });

                it('should be able to transfer out correctly', function (done) {
                    dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 300, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                        function (data) {
                            data.providerCredit.should.be.equal(0);
                            data.playerCredit.should.be.equal(200);
                            data.rewardCredit.should.be.equal(100);
                            data.transferCredit.playerCredit.should.be.equal(200);
                            data.transferCredit.rewardCredit.should.be.equal(100);
                            return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                        },
                        function (error) {
                            done(error);
                        }
                    ).then(
                        function (data) {
                            data.validCredit.should.be.equal(200);
                            data.lockedCredit.should.be.equal(100);
                            done();
                        },
                        function (error) {
                            done(error);
                        }
                    );
                });
            });

            describe('The amount losses is more than the valid credit', function () {
                
                let testPlayerObj = null;
                let testRewardObj = null;
                
                before(function (done) {
                    // create a test player
                    createCustomTestPlayer(testPlatformObj._id).then(
                        function (data) {
                            testPlatformObj = data;
                            
                            // create a test reward task
                            let rewardTaskData = {
                                playerId: testPlayerObj._id,
                                platformId: testPlatformObj._id,
                                targetProviders: [testGameProviderObj._id],
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
                            return dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 400, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);
                        },
                        function (error) {
                            done(error);
                        }
                    ).then(
                        function (data) {
                            if (data) {
                                done();
                            } else {
                                done(new Error("transferPlayerCreditToProviderbyPlayerObjId return falsey value"));
                            }
                        },
                        function (error) {
                            console.error(error);
                            done(error);
                        }
                    );
                });

                it('should be able to transfer out correctly', function (done) {
                    dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 50, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                        function (data) {
                            data.providerCredit.should.be.equal(0);
                            data.playerCredit.should.be.equal(0);
                            data.rewardCredit.should.be.equal(50);
                            data.transferCredit.playerCredit.should.be.equal(0);
                            data.transferCredit.rewardCredit.should.be.equal(50);
                            return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                        },
                        function (error) {
                            done(error);
                        }
                    ).then(
                        function (data) {
                            data.validCredit.should.be.equal(0);
                            data.lockedCredit.should.be.equal(50);
                            done();
                        },
                        function (error) {
                            done(error);
                        }
                    );
                });
            });
        });
    });

    describe('test when the same transfer request can be triggered multiple times', function () {
        // #16
        let testPlayerObj = null;
        let testRewardObj = null;
        
        before(function (done) {
            // create a test player
            createCustomTestPlayer(testPlatformObj._id).then(
                function (data) {
                    testPlatformObj = data;
                    
                    // create a test reward task
                    let rewardTaskData = {
                        playerId: testPlayerObj._id,
                        platformId: testPlatformObj._id,
                        targetProviders: [testGameProviderObj._id],
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

        it('only one promises should be success', function (done) {
            let prom = dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 400, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name);

            let samePromises= [prom, prom, prom, prom, prom, prom, prom, prom, prom, prom]; // 10 same prom

            executeAllPromises(samePromises).then(
                function (data) {
                    data.errors.length.should.be.equal(9);
                    data.results.length.should.be.equal(1);
                    // TODO:: add game credit check before done()
                    done();
                }
            );
        });
    })

    // test transfering in and out with register reward is already included in testEvent
    describe('test transfering in and out with register reward', function () {

        let testPlayerObj = null;
        let testRewardObj = null;
        
        before(function (done) {
            // create a test player
            createCustomTestPlayer(testPlatformObj._id).then(
                function (data) {
                    testPlatformObj = data;
                    
                    // create a test reward task
                    let rewardTaskData = {
                        playerId: testPlayerObj._id,
                        platformId: testPlatformObj._id,
                        targetProviders: [testGameProviderObj._id],
                        type: "testTask",
                        rewardType: registrationRewardType,
                        requiredBonusAmount : 100,
                        initAmount: 30,
                        bonusAmount : 8,
                        currentAmount: 30
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
            );
        });

        it('should be able to transfer in credit to provider', function (done) {
            dbPlayerInfo.transferPlayerCreditToProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 30, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                function (data) {
                    if (data) {
                        data.providerCredit.should.be.equal(30);
                        data.transferCredit.rewardCredit.should.be.equal(30);
                        data.transferCredit.playerCredit.should.be.equal(0);
                        done();
                    } else {
                        done(new Error("transferPlayerCreditToProviderbyPlayerObjId return null."));
                    }
                },
                function (error) {
                    console.error(error);
                    done(error);
                }
            );
        });

        it('should be able to transfer out with all the credit back into valid credit', function (done) {
            dbPlayerInfo.transferPlayerCreditFromProviderbyPlayerObjId(testPlayerObj._id, testPlatformObj._id, testGameProviderObj._id, 50, testGameProviderObj.providerId, testPlayerObj.name, testPlatformObj.platformId, null, testGameProviderObj.name).then(
                function (data) {
                    data.providerCredit.should.be.equal(0);
                    data.transferCredit.rewardCredit.should.be.equal(50);
                    data.transferCredit.playerCredit.should.be.equal(0);
                    return dbPlayerInfo.getPlayerInfo({_id: testPlayerObj._id});
                },
                function (error) {
                    done(error);
                }
            ).then(
                function (data) {
                    data.lockedCredit.should.be.equal(50);
                    done();
                },
                function (error) {
                    done(error);
                }
            );
        });


        // before
            // create test player with 0 valid credit
            // create custom reward that have required unlock bonus amount
            
        // transfer in should work as intended
        // transfer out should work as intended
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

// This function is used to execute multiple promises, and not stopping the rest of the promises even when one failed
function executeAllPromises(promises) {
    // Wrap all Promises in a Promise that will always "resolve"
    var resolvingPromises = promises.map(function (promise) {
        return new Promise(function (resolve) {
            var payload = new Array(2);
            promise.then(function (result) {
                payload[0] = result;
            }).catch(function (error) {
                payload[1] = error;
            }).then(function () {
                /* 
                    * The wrapped Promise returns an array:
                    * The first position in the array holds the result (if any)
                    * The second position in the array holds the error (if any)
                    */
                resolve(payload);
            });
        });
    });

    var errors = [];
    var results = [];

    // Execute all wrapped Promises
    return Promise.all(resolvingPromises).then(function (items) {
        items.forEach(function (payload) {
            if (payload[1]) {
                errors.push(payload[1]);
            } else {
                results.push(payload[0]);
            }
        });

        return {
            errors: errors,
            results: results
        };
    });
}