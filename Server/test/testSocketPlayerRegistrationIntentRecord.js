var should = require('should');
var socketConnection = require('../test_modules/socketConnection');

describe("Test PlayerRegistrationIntentRecord", function () {


    var testPlayerObjId = null;
    var testPlayerRegIntentRecordObjId = null;
    var date = new Date().getTime();
    var testPlayerName = "testpayer" + date;

    it('Should create PlayerRegistrationIntentRecord', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerData = {
                ipAddress: "145.237.5.44",
                status: "processing",
                createTime: date
            };

            socket.emit('createPlayerRegistrationIntentRecord', playerData);
            socket.once('_createPlayerRegistrationIntentRecord', function (data) {
                socket.close();

                if (data.success && data.data) {
                    testPlayerRegIntentRecordObjId = data.data._id;
                    done();
                }
            });

        });

    });
    it('Should delete PlayerRegistrationIntentRecord', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var playerData = {_id: testPlayerRegIntentRecordObjId};

            socket.emit('deletePlayerRegistrationIntentRecord', playerData);
            socket.once('_deletePlayerRegistrationIntentRecord', function (data) {
                socket.close();
                if (data.success && data.data) {
                    done();
                }
            });

        });

    });


});