/**
 * Created by hninpwinttin on 29/1/16.
 */
var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonAPIs = require('../modules/commonAPIs');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test partner level", function () {

    var formName="";
    var description = "testPlatformDescription";
    var testPlatformObjId = null;

    var testPartnerLevelName = null;
    var testPartnerLevelObjId = null;

    it('Should create test API platform', function (done) {

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

    /* Test 1 - create a new partnerLevel */
    it('Should create a new partner Level', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            testPartnerLevelName = "VIP" + date;
            var testPartnerLevelDescription = "This level is the highest"

            var inputPartnerLevel = {
                name: testPartnerLevelName,
                platform: testPlatformObjId,
                limitPlayers: 100,
                consumptionAmount: 500,
                demoteWeeks: 2,
                value: date,
                description: testPartnerLevelDescription,
                consumptionReturn: 0.1

            };

            socket.emit(commonAPIs.partnerLevel.create, inputPartnerLevel);
            socket.once("_"+commonAPIs.partnerLevel.create, function (data) {
                socket.close();
                if (data.success) {
                    testPartnerLevelObjId = data.data._id;
                    data.data.name.should.containEql(testPartnerLevelName);
                    done();
                }
            });
        });

    });

    /* Test 2 - get a partnerLevel */
    it('Should get a new partner Level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var testPartnerLevelDescription = "VIP";
            var partnerLevelData = {
                _id: testPartnerLevelObjId,
            };
            socket.emit(commonAPIs.partnerLevel.get, partnerLevelData);
            socket.once("_"+commonAPIs.partnerLevel.get, function (data) {

                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 3 - update a partnerLevel */
    it('Should update partner level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var partnerLevelData = {
                limitPlayers: 120,
            };

            socket.emit(commonAPIs.partnerLevel.update, {query: {_id: testPartnerLevelObjId}, updateData: partnerLevelData});
            socket.once('_'+commonAPIs.partnerLevel.update, function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 4 - update a partnerLevel */
    it('Should get all partner level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit(commonAPIs.partnerLevel.getAll, {});
            socket.once('_'+commonAPIs.partnerLevel.getAll, function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 5 - delete a partnerLevel */
    it('Should delete partner level', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var partnerLevel = {
                _id: testPartnerLevelObjId
            };
            socket.emit(commonAPIs.partnerLevel.delete, partnerLevel);
            socket.once("_"+commonAPIs.partnerLevel.delete, function (data) {
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
