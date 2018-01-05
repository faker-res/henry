const should = require('should');
const dbConfig = require('./../modules/dbproperties');
const socketConnection = require('../test_modules/socketConnection');
const commonTestFunc = require('../test_modules/commonTestFunc');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

describe("Test player reward points", function () {
    let testPlayer = null;
    let testPlayerName = null;
    let testPlayerObjId = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;

    let testRewardPointsObjId = null;

    const testUpdateAmount = 500;
    const testRemark = "this is test remark";

    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            (data) => {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();
            },
            (error) => {
                console.error(error);
                done(error);
            }
        );
    });

    /* Test 2 - is disable to use reward points system by default for new platform */
    it('Check is disable to use reward points system by default for new platform', function (done) {
        testPlatform.should.have.property('usePointSystem', false);
        done();
    });

    /* Test 3 - enable reward points system for unit test purpose */
    it('Should enable reward points system for unit test purpose', function (done) {
        if (testPlatform.usePointSystem === false) {
            dbConfig.collection_platform.findOneAndUpdate(
                {_id: ObjectId(testPlatformObjId)},
                {usePointSystem: true},
                {new: true}).lean().then(
                (data) => {
                    testPlatform = data;
                    if (testPlatform.usePointSystem !== true) {
                        done('new platform reward points system should be enable');
                    }
                    done();
                },
                (error) => {
                    done(error);
                }
            );
        }
    });

    /* Test 4 - create a new player with reward points record */
    it('Should create a reward points record for a newly created player', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            let date = new Date().getTime();
            testPlayerName = "testPlayer" + date;

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
                should.exist(data.success);
                should.exist(data.data);
                should.exist(data.data.rewardPointsObjId);
                done();
            });
        });
    });

    /* Test 5 - create a reward points that is zero by default */
    it('Check is create a reward points that is zero by default', function (done) {
        testPlayer.rewardPointsObjId.should.have.property('points', 0);
        done();
    });

    /* Test 6 - create a reward points task that is true by default */
    it('Check is create a reward points task that is true by default', function (done) {
        testPlayer.permission.should.have.property('rewardPointsTask', true);
        done()
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
                should.exist(data.success);
                should.exist(data.data);
                done();
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
                should.exist(data.success);
                should.exist(data.data);
                should.exist(data.data.rewardPointsObjId);
                done();
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
                should.exist(data.success);
                should.exist(data.data);
                testRewardPointsObjId = data.data._id;
                done();
            });
        });
    });

    /* Test 10 - check is log match when add reward points to player*/
    it('Should create log when add reward points to player', function (done) {
        dbConfig.collection_rewardPointsLog.findOne({rewardPointsObjId: testRewardPointsObjId})
            .sort({'createTime':-1}).lean().then(
            (data) => {
                if (data && data.amount === testUpdateAmount) {
                    done();
                } else {
                    done('Log no match');
                }
            },
            (error) => {
                done(error);
            }
        );
    });

    /* Test 100 - remove all test Data */
    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function () {
            done();
        })
    });
});