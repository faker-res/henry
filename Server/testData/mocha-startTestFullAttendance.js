var should = require('should');
var dbconfig = require('../modules/dbproperties');
var mongoose = require('mongoose');
var consecutiveTopUpEvent = require('../scheduleTask/consecutiveTopUpEvent');

var Q = require("q");

describe("Test player full attendance reward event", function () {

    var testPlatformId = mongoose.Types.ObjectId(process.env.PLATFORM);

    it('test consecutive top up event for related platforms', function (done) {
        this.timeout(15*60*1000);
        consecutiveTopUpEvent.checkPlatformFullAttendancePlayers(testPlatformId).then(
            function (data) {
                console.log(data);
                done();
            },
            function (error) {
                console.log(error);
            }
        );
    });

});