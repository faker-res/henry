/**
 * Created by hninpwinttin on 13/1/16.
 */

var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test Proposal Type", function () {

    var formName="";
    var testProposalTypeObjId = null;
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

    /* Test 1 - create a new proposal Type */
    it('Should create a proposal type', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testProposalType" + date;

            var inputProposalType = {
                platformId: testPlatformObjId,
                name: formName,
               // process: description
            };

            socket.emit('createProposalType', inputProposalType);
            socket.once('_createProposalType', function (data) {
                socket.close();
                if (data.success) {
                    testProposalTypeObjId = data.data._id;
                    data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    it('Should update proposal type', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            formName = "testProposalType" + date;
            var updateData = {
                query: {_id: testProposalTypeObjId},
                updateData: {name: formName}
            };

            socket.emit('updateProposalType', updateData);
            socket.once('_updateProposalType', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get all proposal type', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllProposalType', {});
            socket.once('_getAllProposalType', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should delete proposal types', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteProposalTypes', {_ids: [testProposalTypeObjId]});
            socket.once('_deleteProposalTypes', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get all proposal execution type', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllProposalExecutionType', {});
            socket.once('_getAllProposalExecutionType', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get all proposal rejection type', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllProposalRejectionType', {});
            socket.once('_getAllProposalRejectionType', function (data) {
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
        commonTestFunc.removeTestProposalData([], testPlatformObjId, [testProposalTypeObjId], []).then(function(data){
            done();
        })
    });

});
