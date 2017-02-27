/**
 * Created by hninpwinttin on 13/1/16.
 */

var should = require('should');
var socketConnection = require('../test_modules/socketConnection');

describe("Test ProposalTypeProcessStep", function () {

    var testProposalTypeProcessStep1ObjId = "";
    var testProposalTypeProcessStep2ObjId = "";

    /* Test 1 - create a new ProposalTypeProcessStep */
    it('Should create a ProposalTypeProcessStep1', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputProposalTypeProcessStep = {
                title: "testProposalTypeProcessStep1"
            };

            socket.emit('createProposalTypeProcessStep', inputProposalTypeProcessStep);
            socket.once('_createProposalTypeProcessStep', function (data) {
                socket.close();
                if (data.success) {
                    testProposalTypeProcessStep1ObjId = data.data._id;
                    // data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    /* Test 2 - create a new ProposalTypeProcessStep */
    it('Should create a ProposalTypeProcessStep2', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputProposalTypeProcessStep = {
                title: "testProposalTypeProcessStep2"
            };

            socket.emit('createProposalTypeProcessStep', inputProposalTypeProcessStep);
            socket.once('_createProposalTypeProcessStep', function (data) {
                socket.close();
                if (data.success) {
                    testProposalTypeProcessStep2ObjId = data.data._id;
                    // data.data.name.should.containEql(formName);
                    done();
                }
            });
        });
    });

    it('Should update  ProposalTypeProcessStep1', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var inputProposalTypeProcessStep = {
                query:{_id: testProposalTypeProcessStep1ObjId},
                updateData: {
                    nextStepWhenApprove: testProposalTypeProcessStep2ObjId,
                    title: "testProposalTypeProcessStep2"
                }
            };

            socket.emit('updateProposalTypeProcessStep', inputProposalTypeProcessStep);
            socket.once('_updateProposalTypeProcessStep', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 2 - delete a new ProposalTypeProcessStep */
    it('Should delete ProposalTypeProcessStep', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var processStep = {
                _ids: [testProposalTypeProcessStep1ObjId, testProposalTypeProcessStep2ObjId]
            };
            socket.emit('deleteProposalTypeProcessStepById', processStep);
            socket.once('_deleteProposalTypeProcessStepById', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


});
