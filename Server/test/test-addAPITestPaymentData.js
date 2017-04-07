var should = require('should');
var dbPaymentChannel = require('../db_modules/dbPaymentChannel');
var dbPlatform = require('../db_modules/dbPlatform');
var dbApiUser = require('../db_modules/db-api-user');

var testGameTypes = require("../test/testGameTypes");

var mongoose = require('mongoose');
var Q = require("q");

describe("Create test API client data", function () {

    //todo::should clear old test api data???

    var testChannelName = "testClientPaymentChannel";
    var apiUserName = "testApiUser";
    var testChannelId = null;

    it('delete old API payment test data', function (done) {
        dbPaymentChannel.getPaymentChannel({name: testChannelName}).then(
            function (data) {
                if (data && data.channelId) {
                    dbPaymentChannel.deletePaymentChannel(data.channelId).then(
                        function (data) {
                            done();
                        }, function (error) {
                            console.log(error);
                        }
                    );
                }
                else {
                    done();
                }
            }
        );

    });

    it('create test payment channel', function (done) {
        var channelData = {
            name: testChannelName,
            code: "testCode",
            key: "testKey",
            status: "1",
            des: "test payment channel"
        };
        dbPaymentChannel.createPaymentChannel(channelData).then(
            function (data) {
                if (data && data.channelId) {
                    testChannelId = data.channelId;
                    done();
                }
            },
            function(error){
                console.log(error);
            }
        );
    });


    it('delete old API user test data', function (done) {
        dbApiUser.getApiUserInfo({name: apiUserName}).then(
            function (data) {
                if (data && data._id) {
                    dbApiUser.deleteApiUser(data._id).then(
                        function (data) {
                            done();
                        },
                        function (error) {
                        }
                    );
                }
                else {
                    done();
                }
            }
        );

    });

    it('Should create a new api user', function (done) {
        var apiUserData = {
            name: "testApiUser",
            password: "123"
        };
        dbApiUser.addApiUser(apiUserData).then(
            function (data) {
                if (data && data._id) {
                    done();
                }
            }
        );
    });

});
