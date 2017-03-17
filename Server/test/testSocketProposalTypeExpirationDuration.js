/**
 * Created by jazz on 3/3/17
 */

var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');
var constProposalPriority = require('../const/constProposalPriority');
var constProposalEntryType = require('../const/constProposalEntryType');
var constProposalUserType = require('../const/constProposalUserType');
var constProposalStatus = require('./../const/constProposalStatus');
var moment = require('moment-timezone');

describe("Test Proposal Type", function () {

    var formName="";
    var testProposalTypeObjId = null;
    var testPlatformObjId = null;
    var testExpirationMinDuration = 120; //in minute

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

    /* create a new proposal Type */
    it('Should create a proposal type', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testProposalType" + date;

            var inputProposalType = {
                platformId: testPlatformObjId,
                name: formName,
                ExpirationDuration: testExpirationMinDuration
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
                updateData: {name: formName, ExpirationDuration: testExpirationMinDuration}
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

    //proposal
    it('Should create a proposal', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testProposal" + date;

            var curTime = new Date();
            var expiredDate = moment(curTime).add(testExpirationMinDuration,'minutes').format('YYYY-MM-DD HH:mm:ss.sss');

            var inputProposal = {
                type: testProposalTypeObjId,
                priority: constProposalPriority.GENERAL,
                entryType:constProposalEntryType.ADMIN,
                userType:constProposalUserType.PLAYERS,
                createTime:curTime,
                status:constProposalStatus.PENDING,
                expirationTime:expiredDate
            };

            socket.emit('createProposal', inputProposal);
            socket.once('_createProposal', function (data) {
                socket.close();
                if (data.success) {
                    testProposalObjId = data.data._id;
                    done();
                }
            });
        });
    });

    it('Should get a proposal', function (done) {

        socketConnection.createConnection().then(function (socket) {

            socket.connected.should.equal(true);
            var inputProposal = {};
            socket.emit('getProposal', inputProposal);
            socket.once('_getProposal', function (data) {
                socket.close();
                if (data.success) {
                    // testProposalTypeObjId = data.data._id;
                    //data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    it('Should get the list of proposal priorities defined in the system', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.emit('getProposalPriorityList', {});
            socket.once('_getProposalPriorityList', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get the list of proposal entry types defined in the system', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.emit('getProposalEntryTypeList', {});
            socket.once('_getProposalEntryTypeList', function (data) {
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
