var should = require('should');
var socketConnection = require('../test_modules/socketConnection');

describe("Test login", function () {

    /* Test 1 - Admin user login and socket connection */
    it('Should login and create socket connection', function (done) {
        socketConnection.createConnection().then(function (client) {
            client.connected.should.equal(true);
            done();
        }).done();
    });

});


