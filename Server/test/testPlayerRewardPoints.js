let should = require('should');
let dbConfig = require('./../modules/dbproperties');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');

let Chance = require('chance');
let chance = new Chance();

describe("Test player reward points", function () {

    let testPlayer = null;
    let testPlayerName = null;
    let testPlayerObjId = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;

    let testUpdateAmount = 500;
    let testRemark = "this is test remark";
    let testRewardPointsObjId = null;

    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create a random user name', function () {
        for (let i = 0; i < 10; i++) {
            let randomName = chance.name().replace(/\s+/g, '');
            let randomPSW = chance.hash({length: 12});
        }
    });

    /* Test 2 - create a new platform before the creation of a new player */
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });

    /* Test 3 - disable to use reward points system by default for new platform */
    it('Should disable to use reward points system by default for new platform', function (done) {
        if (testPlatform.usePointSystem === false) {
            done();
        }
    });

    /* Test 4 - create a new player with reward points record */
    it('Should create a reward points record for a newly created player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            let date = new Date().getTime();
            testPlayerName = "testplayer" + date;

            let createPlayer = {
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
                testPlayer = data.data;
                socket.close();
                if (data.success && data.data && data.data.rewardPointsObjId) {
                    done();
                }
            });
        });
    });

    /* Test 5 - create a reward points that is zero by default */
    it('Should create a reward points that is zero by default', function (done) {
        if (testPlayer.rewardPointsObjId.points === 0) {
            done();
        }
    });

    /* Test 6 - create a reward points task that is true by default */
    it('Should create a reward points task that is true by default', function (done) {
        if (testPlayer.permission.rewardPointsTask === true) {
            done();
        }
    });

    /* Test 7 - remove a reward points record for existing player */
    it('Should remove a reward points record for existing player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            let removeData = {
                playerId: testPlayer._id,
                platformId: testPlayer.platform,
                rewardPointsObjId: testPlayer.rewardPointsObjId._id
            };

            socket.emit('removePlayerRewardPointsRecord', removeData);
            socket.once('_removePlayerRewardPointsRecord', function (data) {
                socket.close();
                if (data.success && data.data) {
                    if (data.success) {
                        done();
                    }
                }
            });
        });
    });

    /* Test 8 - create a reward points record for existing player */
    it('Should create a reward points record for existing player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            let createRewardPointsData = {
                playerId: testPlayer._id,
                platformId: testPlayer.platform
            };

            socket.emit('createPlayerRewardPointsRecord', createRewardPointsData);
            socket.once('_createPlayerRewardPointsRecord', function (data) {
                testPlayer = data.data;
                testPlayerObjId = data.data._id;
                socket.close();
                if (data.success && data.data && data.data.rewardPointsObjId) {
                    done();
                }
            });
        });
    });

    /* Test 9 - update player reward points record and create reward points log*/
    it('Should update player reward points record and create reward points log', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            let updateData = {
                playerObjId: testPlayer._id,
                platformObjId: testPlayer.platform,
                updateAmount: testUpdateAmount,
                remark: testRemark
            };

            socket.emit('updatePlayerRewardPointsRecord', updateData);
            socket.once('_updatePlayerRewardPointsRecord', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testRewardPointsObjId = data.data._id;
                    done();
                }
            });
        });
    });

    /* Test 98 - remove all test Data */
    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function () {
            done();
        })
    });

    /* Test 99 - remove all reward points Data */
    it('Should remove all reward points Data', function(done){
        dbConfig.collection_rewardPoints.remove({rewardPointsObjId: testRewardPointsObjId}).then(function () {
            done();
        })
    });

    /* Test 100 - remove all reward points log Data */
    it('Should remove all reward points log Data', function(done){
        dbConfig.collection_rewardPointsLog.remove({rewardPointsObjId: testRewardPointsObjId}).then(function () {
            done();
        })
    });
});