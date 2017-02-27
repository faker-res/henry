var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test Reward event", function () {

    var testPlatformObjId = null;
    var rewardEventObjId = null;

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

    it('Should create a reward event', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            var formName = "testRewardEvent" + date;

            var inputData = {
                name: formName,
                code: new Date().getTime(),
                platform: testPlatformObjId
            };

            socket.emit('createRewardEvent', inputData);
            socket.once('_createRewardEvent', function (data) {
                socket.close();
                if (data.success) {
                    rewardEventObjId = data.data._id;
                    data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    it('Should get reward event for platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var inputData = {
                platform: testPlatformObjId
            };

            socket.emit('getRewardEventsForPlatform', inputData);
            socket.once('_getRewardEventsForPlatform', function (data) {
                socket.close();
                if (data.success) {
                    data.data[0].platform.should.containEql(testPlatformObjId);
                    done();
                }
            });
        });
    });

    it('Should update a reward event', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            var formName = "testRewardEvent" + date;

            var inputData = {
                query: {_id: rewardEventObjId},
                updateData:{
                    name: formName
                }
            };

            socket.emit('updateRewardEvent', inputData);
            socket.once('_updateRewardEvent', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should delete a reward event', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputData = {
                _ids: [rewardEventObjId],
            };

            socket.emit('deleteRewardEventByIds', inputData);
            socket.once('_deleteRewardEventByIds', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should not get reward event for platform', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var inputData = {
                platform: testPlatformObjId
            };

            socket.emit('getRewardEventsForPlatform', inputData);
            socket.once('_getRewardEventsForPlatform', function (data) {
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
        commonTestFunc.removeTestProposalData( [], testPlatformObjId,[], []).then(function(data){
            done();
        })
    });

});