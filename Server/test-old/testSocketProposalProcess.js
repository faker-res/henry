/**
 * Created by hninpwinttin on 15/1/16.
 */
var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var constProposalStepStatus = require('../const/constProposalStepStatus');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test Proposal Process", function () {


    var formName = "";
    var testProposalObjId = null;
    var testProposalProcessStepObjId = null;
    var testAdminObjId = null;
    var testAdminName = null;

    /* Test 2 - create a new proposal process */
    it('Should create a proposal Process', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            commonTestFunc.createTestProposalProcess().then(
             function (data) {
                    testProposalObjId = data._id;
                    done();
                },{

            });
        });
    });

    it('Should get full ProposalProcess', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var proposalProcess = {
                _id: testProposalObjId
            };
            socket.emit('getFullProposalProcess', proposalProcess);
            socket.once('_getFullProposalProcess', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });



});
