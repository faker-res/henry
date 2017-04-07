var should = require('should');
var socketConnection = require('../test_modules/socketConnection');

describe("Test API User", function () {


    var apiUserObjId = null;

    it('Should create a new api user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            var apiUserData = {
                name: "testApiUser" + date,
                password: "123"
            };
            socket.emit('createApiUser', apiUserData);
            socket.once('_createApiUser', function (data) {
                socket.close();
                if (data.success) {
                    apiUserObjId = data.data._id;
                    done();
                }
            });
        });
    });

    it('Should delete api user', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var apiUser = {
                _id: apiUserObjId
            };
            socket.emit('deleteApiUser', apiUser);
            socket.once('_deleteApiUser', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


});