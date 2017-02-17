/**
 * Created by hninpwinttin on 29/1/16.
 */
var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test player level", function () {

    var testPlayerLevelName = null;
    var testPlayerLevelObjId = null;

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


    it('Should create a new player Level', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            testPlayerLevelName = "VIP" + date;

            var inputPlayerLevel = {
                platform: testPlatformObjId,
                value: date,
                name: testPlayerLevelName,
                levelUpConfig: [
                    {
                        andConditions: true,
                        topupLimit: 1000,
                        topupPeriod: "WEEK",
                        consumptionLimit: 10000,
                        consumptionPeriod: "WEEK"
                    },
                    {
                        andConditions: false,
                        topupLimit: 1000,
                        topupPeriod: "DAY",
                        consumptionLimit: 100000,
                        consumptionPeriod: "DAY"
                    }
                ],
                levelDownConfig: [
                    {
                        andConditions: true,
                        topupMinimum: 10,
                        topupPeriod: "WEEK",
                        consumptionMinimum: 100,
                        consumptionPeriod: "WEEK"
                    },
                    {
                        andConditions: false,
                        topupMinimum: 10,
                        topupPeriod: "DAY",
                        consumptionMinimum: 1000,
                        consumptionPeriod: "DAY"
                    }
                ],
                consumption: {
                    "casual": 50,
                    "card": 50,
                    "adventure": 30,
                    "sport": 30
                }
            };
            socket.emit("createPlayerLevel", inputPlayerLevel);
            socket.once("_createPlayerLevel", function (data) {
                socket.close();
                if (data.success) {
                    testPlayerLevelObjId = data.data._id;
                    data.data.name.should.containEql(testPlayerLevelName);
                    done();
                }
            });
        });

    });


    it('Should get a player Level for platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerLevelData = {
                platformId: testPlatformObjId,
            };
            socket.emit("getPlayerLevelByPlatformId", playerLevelData);
            socket.once("_getPlayerLevelByPlatformId", function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 2 - get a playerLevel */
    it('Should get a new player Level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var testPartnerLevelDescription = "VIP";
            var playerLevelData = {
                _id: testPlayerLevelObjId,
            };
            socket.emit("getPlayerLevel", playerLevelData);
            socket.once("_getPlayerLevel", function (data) {

                socket.close();
                if (data.success) {

                    done();
                }
            });
        });
    });

    /* Test 3 - update a playerLevel */
    it('Should update player level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerLevelData = {
                name: 'Emperor'
            };

            socket.emit('updatePlayerLevel', {query: {_id: testPlayerLevelObjId}, updateData: playerLevelData});
            socket.once('_updatePlayerLevel', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 5 - delete a playerLevel */
    it('Should delete player level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerLevel = {
                _id: testPlayerLevelObjId
            };
            socket.emit('deletePlayerLevel', playerLevel);
            socket.once('_deletePlayerLevel', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


});