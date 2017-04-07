var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFun = require('../test_modules/commonTestFunc');

describe("Test PlayerTopUpIntentRecord", function () {


    var testPlayerObjId = null;
    var testPlayerTopUpIntentRecordObjId = null;
    var date = new Date().getTime();
    var testPlatformObjId = null;


    it('Should create test API player and platform', function (done) {

          commonTestFun.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create PlayerTopUpIntentRecord', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerData = {
                playerId: testPlayerObjId,
                status: "processing",
                topupTime: date,
                topupChannel: "Bank Transfer"
            };

            socket.emit('createPlayerTopUpIntentRecord', playerData);
            socket.once('_createPlayerTopUpIntentRecord', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testPlayerTopUpIntentRecordObjId = data.data._id;
                    done();
                } else {
                    done(data || true);
                }
        });

    });

});

    it('Should update PlayerTopUpIntentRecord', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var data = {
                query: {_id: testPlayerTopUpIntentRecordObjId},
                updateData: {
                //proposalId: xxxx
                status: "Success",
                topUpAmount:30
                }
            };

            socket.emit('updatePlayerTopUpIntentRecord', data);
            socket.once('_updatePlayerTopUpIntentRecord', function (data) {
                socket.close();
                if (data.success) {
                    done();
                } else {
                    done(data || true);
                }
            });
        });
    });

    it('Should get PlayerTopUpIntentRecord', function(done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerData = {_id: testPlayerTopUpIntentRecordObjId};

            socket.emit('getPlayerTopUpIntentRecord', playerData);
            socket.once('_getPlayerTopUpIntentRecord', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                } else {
                    done(data || true);
                }
            });

        });

    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData( [], testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });



});