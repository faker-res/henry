var should = require('should');
var dbconfig = require('./../modules/dbproperties');

var dailyProviderSettlement = require('./../scheduleTask/dailyProviderSettlement');

var mongoose = require('mongoose');
var Q = require("q");

describe("Scheduled consumption settlement tasks", function () {

    var testProviderId =  mongoose.Types.ObjectId(process.env.PROVIDER);

    // These are stress tests only.
    // The logic tests for these operations can be found in mocha-addTestConsumptionData.js

    it('start platform daily settlement', function () {
        this.timeout(15*60*1000);
        return dailyProviderSettlement.calculateDailyProviderSettlement(testProviderId).then(
            function (response) {
                console.log("Response:", response);
            }
        );
    });
});