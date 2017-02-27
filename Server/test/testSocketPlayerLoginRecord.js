/**
 * Created by hninpwinttin on 26/1/16.
 */
var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test PlayerLoginRecord", function () {

    var testPlayerObjId = null;
    var date = new Date().getTime();
    var testPlayerName = null;
    var testPlayerLoginRecordObjId = null;
    var testPlatformObjId = null;

    it('Should create test API player and platform', function (done) {

        commonTestFunc.createTestPlatform().then(
            function (data) {

                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFunc.createTestPlayer(testPlatformObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });


    it('Should create a player login record', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputPlayerLoginRecord = {
                player: testPlayerObjId,
                platform: testPlatformObjId,
                loginTime: date,
                clientType: "testClientType",
                country: "Singapore"
            };

            socket.emit('createPlayerLoginRecord', inputPlayerLoginRecord);
            socket.once('_createPlayerLoginRecord', function (data) {
                socket.close();
                if (data.success) {
                    testPlayerLoginRecordObjId = data.data._id;
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

    it('Should remove all test Data', function(done){
        commonTestFunc.removeTestProposalData( [], testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });

});

