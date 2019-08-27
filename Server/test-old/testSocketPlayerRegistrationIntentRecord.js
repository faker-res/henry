var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFun = require('../test_modules/commonTestFunc');
let rsaCrypto = require("../modules/rsaCrypto");

describe("Test PlayerRegistrationIntentRecord", function () {


    var testPlayerObjId = null;
    var testPlayerRegIntentRecordObjId = null;
    var date = new Date().getTime();
    var testPlayerName = "testpayer" + date;
    var testPlatformObjId = null;
    var testPlatformId = null;
    var testPlayerId = null;
    var testPlayerPhoneNum = null;

    it('Should create test API player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
                testPlayerPhoneNum = rsaCrypto.decrypt(data.phoneNumber);
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should create PlayerRegistrationIntentRecord', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerData = {
                ipAddress: "145.237.5.44",
                status: "processing",
                createTime: date,
                playerId: testPlayerId,
                lastLoginIp: "210.21.84.23",
                phoneNumber: testPlayerPhoneNum,
                platform: testPlatformObjId,
                ipArea: "anywhere"
            };

            socket.emit('createPlayerRegistrationIntentRecord', playerData);
            socket.once('_createPlayerRegistrationIntentRecord', function (data) {
                socket.close();

                if (data.success && data.data) {
                    testPlayerRegIntentRecordObjId = data.data._id;
                    done();
                }
            });

        });

    });
    it('Should delete PlayerRegistrationIntentRecord', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerData = {_id: testPlayerRegIntentRecordObjId};

            socket.emit('deletePlayerRegistrationIntentRecord', playerData);
            socket.once('_deletePlayerRegistrationIntentRecord', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                }
            });

        });

    });
    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test proposal data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });


});