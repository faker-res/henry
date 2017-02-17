var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test ProposalTypeProcess", function () {

    var testProposalTypeProcessStepObjId = "";
    var testProposalTypeProcessStepObjId_2 = "";
    var testProposalTypeProcessObjId = "";

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

    /* Test 1 - create a test ProposalTypeProcessStep  */
    it('Should create a ProposalTypeProcessStep', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputProposalTypeProcessStep = {
                title: "testProposalTypeProcessStep1"
            };

            socket.emit('createProposalTypeProcessStep', inputProposalTypeProcessStep);
            socket.once('_createProposalTypeProcessStep', function (data) {
                socket.close();
                if (data.success) {
                    testProposalTypeProcessStepObjId = data.data._id;
                    done();
                }
            });
        });
    });

    /* Test 2 - create a second test-ProposalTypeProcessStep  */
    it('Should create a second ProposalTypeProcessStep', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputProposalTypeProcessStep = {
                title: "testProposalTypeProcessStep2"
            };
            socket.emit('createProposalTypeProcessStep', inputProposalTypeProcessStep);
            socket.once('_createProposalTypeProcessStep', function (data) {
                socket.close();
                if (data.success) {
                    testProposalTypeProcessStepObjId_2 = data.data._id;
                    done();
                }
            });
        });
    });

    /* Test 3 - create a new ProposalTypeProcess */
    it('Should create a new ProposalTypeProcess', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();

            var inputProposalTypeProcessStep = {
                platformId: testPlatformObjId,
                name: "testProposalProcess" + date,
                steps: [testProposalTypeProcessStepObjId]
            };

            socket.emit('createProposalTypeProcess', inputProposalTypeProcessStep);
            socket.once('_createProposalTypeProcess', function (data) {
                socket.close();
                if (data.success) {
                    testProposalTypeProcessObjId = data.data._id;
                    // data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    /* Test 4 - add a process to the ProposalTypeProcess */
    it('Should add step to ProposalTypeProcess', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();

            var inputProposalTypeProcessStep = {
                processId : testProposalTypeProcessObjId ,
                stepId: [testProposalTypeProcessStepObjId_2]
            };

            socket.emit('addStepToProposalTypeProcess', inputProposalTypeProcessStep);
            socket.once('_addStepToProposalTypeProcess', function (data) {
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
        commonTestFunc.removeTestProposalData( [], testPlatformObjId, [], []).then(function(data){
            done();
        })
    });



});

