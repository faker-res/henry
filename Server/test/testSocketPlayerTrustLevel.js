var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test player trust level", function () {

    var testPlayerTrustLevelName = null;
    var testPlayerTrustLevelObjId = null;

    var formName="";
    var description = "testPlatformDescription";
    var testPlatformObjId = null;

    it('Should create test platform', function (done) {

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

    it('Should create a new player trust Level', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            testPlayerTrustLevelName = "VIP" + date;

            var inputPlayerTrustLevel = {
                platform: testPlatformObjId,
                value: date,
                name: testPlayerTrustLevelName,
            };
            socket.emit("createPlayerTrustLevel", inputPlayerTrustLevel);
            socket.once("_createPlayerTrustLevel", function (data) {
                socket.close();
                if (data.success) {
                    testPlayerTrustLevelObjId = data.data._id;
                    data.data.name.should.containEql(testPlayerTrustLevelName);
                    done();
                }
            });
        });

    });


    it('Should get a player trust Level for platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerTrustLevelData = {
                platformId: testPlatformObjId,
            };
            socket.emit("getPlayerTrustLevelByPlatformId", playerTrustLevelData);
            socket.once("_getPlayerTrustLevelByPlatformId", function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 2 - get a playerTrustLevel */
    it('Should get a new player trust Level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var playerTrustLevelData = {
                _id: testPlayerTrustLevelObjId
            };
            socket.emit("getPlayerTrustLevel", playerTrustLevelData);
            socket.once("_getPlayerTrustLevel", function (data) {

                socket.close();
                if (data.success) {

                    done();
                }
            });
        });
    });

    /* Test 3 - update a playerTrustLevel */
    it('Should update player trust level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerTrustLevelData = {
                name: 'Suspicious'
            };

            socket.emit('updatePlayerTrustLevel', {query: {_id: testPlayerTrustLevelObjId}, updateData: playerTrustLevelData});
            socket.once('_updatePlayerTrustLevel', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 4 - get all playerTrustLevel */
    it('Should get all player trust level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllPlayerTrustLevels', {});
            socket.once('_getAllPlayerTrustLevels', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 5 - delete a playerTrustLevel */
    it('Should delete player trust level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerTrustLevel = {
                _id: testPlayerTrustLevelObjId
            };
            socket.emit('deletePlayerTrustLevel', playerTrustLevel);
            socket.once('_deletePlayerTrustLevel', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, []).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData( [], testPlatformObjId, [], []).then(function(data){
            done();
        })
    });


});