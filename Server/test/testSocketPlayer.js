var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var Chance = require('chance');
var chance = new Chance();

var constPlayerFeedback = require('./../const/constPlayerFeedbackResult.js');
var commonTestFunc = require('../test_modules/commonTestFunc');

var PLATFORM_PREFIX_SEPARATOR = '';

describe("Test socket player", function () {

    var testPlayer = null;
    var testPlayerName = null;
    var testPlayerObjId = null;

    var testPlatform = null;
    var testPlatformDescription = "testPlatformDescription";
    var testPlatformObjId = null;
    var testPlatformId = null;

    var testAdminId = null;
    var testAdminName = null;
    var playerFeedbackId = null;
    var resetPassword = null;
    var gameProviderObjId = null;

    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create a random user name', function () {
        for (var i = 0; i < 10; i++) {
            var randomName = chance.name().replace(/\s+/g, '');
            var randomPSW = chance.hash({length: 12});
        }
    });

    /* Test 2 - create a new platform before the creation of a new player */
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId=data.platformId;
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });

    /* Test 4 - create a new player */
    it('Should create player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            testPlayerName = "testplayer" + date;

            var createPlayer = {
                "name": testPlayerName,
                "email": "testPlayer123@gmail.com",
                "realName": "testPlayerRealName",
                "password": "123456",
                "platform": testPlatformObjId,
                "platformId": testPlatformId,
                "phoneNumber": "93354765",
                isTestPlayer: true

            };

            socket.emit('createPlayer', createPlayer);
            socket.once('_createPlayer', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testPlayerName = testPlatform.prefix + PLATFORM_PREFIX_SEPARATOR + testPlayerName;

                    testPlayer = data.data;
                    testPlayerObjId = data.data._id;
                    testPlayer.name.should.equal(testPlayerName);
                    done();
                }
            });
        });
    });


    it('Should create the game Provider', function (done) {
        commonTestFunc.createTestGameProvider().then(
            function (data) {
                gameProviderObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });

    /* Test 3 - find a  player */
    it('Should find player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPlayer = {
                "_id": testPlayerObjId
            };
            socket.emit('getPlayerInfo', queryPlayer);

            socket.once('_getPlayerInfo', function (data) {
                socket.close();
                if (data.success && data.data) {
                    data.data.name.should.containEql(testPlayerName);
                    done();
                }
            });
        });
    });

    // it('Should update player payment', function (done) {
    //     socketConnection.createConnection().then(function (socket) {
    //         socket.connected.should.equal(true);
    //
    //         var updatePlayer = {
    //             query: {_id: testPlayerObjId},
    //             updateData: {
    //                 bankName: "MNC",
    //                 bankAccount: "123",
    //                 bankAccountName: "steve",
    //                 bankAccountType: "saving",
    //                 bankAccountCity: "Singapore"
    //             }
    //         };
    //         socket.emit('updatePlayerPayment', updatePlayer);
    //
    //         socket.once('_updatePlayerPayment', function (data) {
    //             socket.close();
    //             if (data.success && data.data) {
    //                 done();
    //             } else {
    //                 done(data || true);
    //             }
    //         });
    //     });
    // });

    /* Test 4 - find players by a platform */
    it('Should find players By platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var queryPlayer = {
                "platform": testPlatformObjId
            };
            socket.emit('getPlayersByPlatform', queryPlayer);

            socket.once('_getPlayersByPlatform', function (data) {
                socket.close();
                if (data.success && data.data) {
                    // data.data.name.should.containEql(testPlayerName);
                    done();
                }
            });
        });
    });

    /* Test 5 - update player by _id or name */
    it('Should update player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var updatePlayer = {
                email: "updateTestPlayer@test.com"
            };

            socket.emit('updatePlayer', {query: {_id: testPlayerObjId}, updateData: updatePlayer});
            socket.once('_updatePlayer', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should create admin user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            testAdminName = "step1admin" + date;

            var createUser = {
                "adminName": testAdminName,
                "email": "testUser123@gmail.com",
                "firstName": "testUserFirstName",
                "lastName": "testUserLastName",
                "password": "123456",
                "accountStatus": 1
            };

            socket.emit('createAdmin', createUser);

            socket.once('_createAdmin', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testAdminId = data.data._id;
                    data.data.adminName.should.equal(testAdminName);
                    done();
                }
            });
        });
    });

    it('Should create a new player feedback', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();

            var inputPlayerFeedback = {
                playerId: testPlayerObjId,
                platform: testPlatformObjId,
                adminId: testAdminId,
                content: "unique and cool",
                result: constPlayerFeedback.NORMAL
            };

            socket.emit('createPlayerFeedback', inputPlayerFeedback);
            socket.once('_createPlayerFeedback', function (data) {
                socket.close();
                if (data.success) {
                    playerFeedbackId = data.data._id;
                    done();
                }
            });
        });
    });

    it('Should resest the player password', function (done) {

        socketConnection.createConnection().then(function (socket) {
            var playerQuery = {
                playerId: testPlayerObjId
            };
            socket.emit('resetPlayerPassword', playerQuery);
            socket.once('_resetPlayerPassword', function (data) {
                socket.close();
                if (data.success) {
                    resetPassword = data.data;
                    done();
                }
            });
        });
    });

    it('Should find player feedbacks', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                "playerId": testPlayerObjId
            };
            socket.emit('getPlayerFeedbacks', query);

            socket.once('_getPlayerFeedbacks', function (data) {
                socket.close();

                if (data.success) {
                    done();
                }
            });
        });
    });


    it('Should find player last 5 feedback', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                "playerId": testPlayerObjId,
                "limit":5,
            };
            socket.emit('getPlayerLastNFeedbackRecord', query);

            socket.once('_getPlayerLastNFeedbackRecord', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                }
            });

        });
    });

    it('Should find player by advanced query', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var startTime = new Date();
            startTime.setHours(0, 0, 0, 0);
            startTime.setDate(startTime.getDate() - 1);

            var playerQuery = {
                platformId: testPlatformObjId,
                query: {
                    isTestPlayer: true,
                    phoneNumber: "93354765",
                    email: "updateTestPlayer@test.com",
                    name: testPlayerName,
                    lastAccessTime: startTime
                }
            };
            socket.emit('getPlayerByAdvanceQuery', playerQuery);
            socket.once('_getPlayerByAdvanceQuery', function (data) {
                socket.close();
                // if (data.success) {
                if (data.success && data.data) {
                    done();
                }
            });

        });
    });

    it('Should get the currently active players', function (done) {
        socketConnection.createConnection().then(function (socket) {
            var time = new Date().toISOString();
            var query = {
                noOfPlayers: 10,
                  platform : testPlatformObjId
            }
            socket.emit('getActivePlayers', query);
            socket.once('_getActivePlayers', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get the total count of current active players',function(done){
        socketConnection.createConnection().then(function (socket) {

            var query = { platform : testPlatformObjId };
            socket.emit('getCurrentActivePlayersCount', query);
            socket.once('_getCurrentActivePlayersCount', function(data) {
                socket.close();
                if(data.success) {
                    done();
                }
            });


        });
    });


    it('Should get the list of player trust levels defined in the system', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.emit('getPlayerTrustLevelList', {});
            socket.once('_getPlayerTrustLevelList', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


    it('Should delete player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var players = {
                _ids: [testPlayerObjId]
            };
            socket.emit('deletePlayersById', players);
            socket.once('_deletePlayersById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should find new player count by platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                startDate: new Date('2016-05-01'),
                endDate:  new Date('2016-12-30')
            };
            socket.emit('countNewPlayers', query);
            socket.once('_countNewPlayers', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                }
            });

        });
    });

    it('Should get total player consumption by platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                startDate: new Date('2016-05-01'),
                endDate:  new Date('2016-12-30')
            };
            socket.emit('getPlayerConsumptionSumForAllPlatform', query);
            socket.once('_getPlayerConsumptionSumForAllPlatform', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                }
            });

        });
    });

    it('Should get total player topup by platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                startDate: new Date('2016-05-01'),
                endDate:  new Date('2016-12-30')
            };
            socket.emit('getTopUpTotalAmountForAllPlatform', query);
            socket.once('_getTopUpTotalAmountForAllPlatform', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                }
            });

        });
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });



});
