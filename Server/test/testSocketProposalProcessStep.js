var should = require('should');
var socketConnection = require('../test_modules/socketConnection');

describe("Test Proposal Process Step", function () {


    var formName = "";
    var testProposalProcessObjId = null;
    var testProposalTypeProcessStepObjId = null;

    var testAdminObjId = null;
    var testAdminName = null;



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
                    testAdminObjId = data.data._id;
                    data.data.adminName.should.equal(testAdminName);
                    done();
                } else {
                    done(data || true);
                }
            });
        });
    });

    /* Test 1 - create a new ProposalTypeProcessStep */
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
                    // data.data.name.should.containEql(formName);
                    done();
                } else {
                    done(data || true);
                }
            });
        });
    });


});
