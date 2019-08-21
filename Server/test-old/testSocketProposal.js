var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var constProposalPriority = require('../const/constProposalPriority');
var constProposalEntryType = require('../const/constProposalEntryType');
var constProposalUserType = require('../const/constProposalUserType');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test Proposal", function () {


    var formName = "";
    var testProposalTypeObjId = null;
    var testProposalObjId = null;
    var testAdminId = null;
    var testAdminName = null;
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

    /* Test 1 - create admin users */ // working fine
    it('Should create admin user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            testAdminName = "step1admin" + date;

            var createUser = {
                "adminName": testAdminName,
                "email": "testUser123@gmail.com",
                "firstName": "testUserFirstName",
                "lastName": "testUserLastName",
                "password": "123",
                "accountStatus": 1
            };

            socket.emit('createAdmin', createUser);

            socket.once('_createAdmin', function (data) {
                socket.close();
                if (data.success && data.data) {
                    testAdminId = data.data._id;
                    data.data.adminName.should.equal(testAdminName);
                    done();
                }
            });
        });
    });

    /* Test 1 - create a new proposal type */
    it('Should create a proposal type', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testProposalType" + date;

            var inputProposalType = {
                platformId: testPlatformObjId,
                name: formName
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

    /* Test 2 - create a new proposal */
    it('Should create a proposal', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            formName = "testProposal" + date;

            var inputProposal = {
                type: testProposalTypeObjId,
                priority: constProposalPriority.GENERAL,
                entryType:constProposalEntryType.ADMIN,
                userType:constProposalUserType.PLAYERS
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

    /* Test 3 - get a proposal */
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
