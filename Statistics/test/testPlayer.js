var should = require('should');
var socketConnection = require('../test_modules/socketConnection');

describe("Test player statictics APIs", function () {


    it('Should get DAU for past 30 days', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getPastDaysDAU', {numOfDays: 30});
            socket.once('_getPastDaysDAU', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should get new player for past 30 days', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getNewPlayerCount', {num: 30, frequency: 300});
            socket.once('_getNewPlayerCount', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });

        });
    });

    it('Should get retention data for past 7 days', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getRetentionData', {
                dataType: 'Active User',
                frequency: 'day',
                range: 'Last 7 days'
            });
            socket.once('_getRetentionData', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should get ARPU for past 7 days', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getARPU', {
                dataType: 'Average Revenue',
                frequency: 'day',
                range: 'Last 7 days',
                metric: 'paying user'
            });
            socket.once('_getARPU', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });
});