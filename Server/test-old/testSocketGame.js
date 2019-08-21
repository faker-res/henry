var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test Game", function () {

    /* Test 1 - create a new game */

    var testGameName = "";
    var description = "testGameDescription";
    var gameName = "";
    var testGameObjId = null;
    var testGameObjId2 = null;


    var testPlatformName = "";
    var platformDescription = "testPlatformDescription";
    var testPlatformObjId = null;
    var gameProviderObjId = null;
    var testPlatformObjId2 = null;

    it('Should create test provider and game', function (done) {

        commonTestFunc.createTestGameProvider().then(
            function (data) {
                gameProviderObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test platform-One', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create test platform-Two', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformObjId2 = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    /* Test 3 - create a new game */
    it('Should create a new game', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            gameName = "testGame" + date;

            // Create a new game here
            var gameData = {
                name: gameName + date,
                description: description,
                provider: gameProviderObjId,
                type: 'Card',
                code: gameName + date,
                gameId: gameName + date
                //platformObjId: testPlatformObjId
            };
            socket.emit('createGameAndAddToProvider', gameData);
            socket.once('_createGameAndAddToProvider', function (data) {
                socket.close();
                if (data.success) {
                    testGameObjId = data.data._id;
                    done();
                }
            });
        });

    });

    //* Test 4 - create a new game and add to the test platform */
    it('Should create a new game - Two and add to a provider', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            gameName = "testGameTwo" + date;

            // Create a new game here
            var gameData = {
                name: gameName + date,
                description: description,
                provider: gameProviderObjId,
                code: gameName + date,
                type: 'Casual',
                gameId: gameName + date,
                //platformObjId: testPlatformObjId
            };
            socket.emit('createGameAndAddToProvider', gameData);
            socket.once('_createGameAndAddToProvider', function (data) {
                socket.close();
                if (data.success) {
                    testGameObjId2 = data.data._id;
                    done();
                }
            });
        });

    });

    /* Test 6 - search a game */
    it('Should search a game', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var searchGameData = {
                _id: testGameObjId
            };
            socket.emit('getGame', searchGameData);
            socket.once('_getGame', function (data) {
                //socket.removeAllListeners('searchGame');
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 7 - update a  game */
    it('Should update a game', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var updateGameData = {
                description: description + "Update"
            }
            socket.emit('updateGame', {query: {name: testGameName}, updateData: updateGameData});
            socket.on('_updateGame', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 8 - Get Games by Game Provider */
    it('Should search a game by Game Provider', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var searchGameData = {
                _id: gameProviderObjId
            };
            socket.emit('getGamesByProviderId', searchGameData);
            socket.once('_getGamesByProviderId', function (data) {
                //socket.removeAllListeners('searchGame');
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 9 - Create Game Platform status */
    it('Should attach Game 1 ToPlatform', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var platformGameStatusData = {
                game: testGameObjId,
                platform: testPlatformObjId,
                name: "testGameObjId",
                status: 1
            };
            socket.emit('attachGameToPlatform', platformGameStatusData);
            socket.once('_attachGameToPlatform', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should attach Game 2 ToPlatform2', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var platformGameStatusData = {
                game: testGameObjId2,
                name: "testGameObjId2",
                platform: testPlatformObjId2,
                status: 1
            };
            socket.emit('attachGameToPlatform', platformGameStatusData);
            socket.once('_attachGameToPlatform', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    // getGamesNotAttachedToPlatform

    it('Should add a Provider to a Platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var addProviderToPlatformData = {
                platformId: testPlatformObjId,
                providerId: gameProviderObjId,
                providerNickName: 'Nick',
                providerPrefix: 'PF'
            };

            socket.emit('addProviderToPlatformById', addProviderToPlatformData);
            socket.once('_addProviderToPlatformById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should rename a Provider in a Platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var renameProviderInPlatformData = {
                platformId: testPlatformObjId,
                providerId: gameProviderObjId,
                providerNickName: 'Claus',
                providerPrefix: 'FP'
            };

            socket.emit('renameProviderInPlatformById', renameProviderInPlatformData);
            socket.once('_renameProviderInPlatformById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    /* Test - Get all games under a platform and a provider */
    it('Should Get all games under a platform and a provider', function (done) {

        socketConnection.createConnection().then(function (socket) {
            var query = {
                platform: testPlatformObjId,
                provider: gameProviderObjId
            };
            socket.emit('getGamesByPlatformAndProvider', query);
            socket.once('_getGamesByPlatformAndProvider', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should Get all games which are not attached to a platform Under a provider', function (done) {

        socketConnection.createConnection().then(function (socket) {

            var query = {
                platform: testPlatformObjId,
                provider: gameProviderObjId
            };

            socket.emit('getGamesNotAttachedToPlatform', query);
            socket.once('_getGamesNotAttachedToPlatform', function (data) {
                socket.close();
                if (data.success) {
                    data.data[0]._id.should.equal(testGameObjId2);
                    done();
                }
            });
        });
    });

    //* Test 10 - Delete a new game */
    it('Should delete the game info', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var delGameData = {
                _id: testGameObjId
            };
            socket.emit('deleteGameById', delGameData);
            socket.once('_deleteGameById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


    /* Test 13 - remove Provider from platform */
    it('Should remove a Provider from a Platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var removeProviderFromPlatformData = {
                platformId: testPlatformObjId,
                providerId: gameProviderObjId
            };

            socket.emit('removeProviderFromPlatformById', removeProviderFromPlatformData);
            socket.once('_removeProviderFromPlatformById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should update platformGameStatus of Game 1', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var query = {
                game: testGameObjId,
                platform: testPlatformObjId

            };
            var updateData = {status: 2};

            socket.emit('updateGameStatusToPlatform', {query: query, updateData: updateData});
            socket.once('_updateGameStatusToPlatform', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


    it('Should delete platformGameStatus of Game 1 in Platform', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var platformGameStatusData = {
                game: testGameObjId,
                platform: testPlatformObjId,
                status: 1
            };
            socket.emit('detachGameFromPlatform', platformGameStatusData);
            socket.once('_detachGameFromPlatform', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 11 - Delete a new platform */
    it('Should delete the platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var delPlatformData = {
                _id: testPlatformObjId
            };
            socket.emit('deletePlatformById', {_ids: [testPlatformObjId]});
            socket.once('_deletePlatformById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 12 - Get all game types */
    it('Should get all game types', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            socket.emit('getAllGameTypes', {});
            socket.once('_getAllGameTypes', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get all game status', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            socket.emit('getAllGameStatus', {});
            socket.once('_getAllGameStatus', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId).then(function(data){
            done();
        })
    });

});
