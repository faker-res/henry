var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var Chance = require('chance');
var chance = new Chance();
var mongoose = require('mongoose');
var Q = require("q");

var total = 500;
var playerNamePrefix = 'deviceplayer';
describe("Add player location data", function () {


    it('add one location', function (done) {

        var allPro = [];
        for (var i = 0; i < total; i++) {
            var date = new Date();
            var sendData = {
                name: playerNamePrefix + i % 30,
                password: '123',
                platformId: 435,
                lastLoginIp: chance.ip(),
                loginTime: new Date(date.setDate(date.getDate() - Math.random() * 30))
            };
            var uaObj = {
                browser: '',
                device: '',
                os: '',
            };
            var a = dbPlayerInfo.playerLogin(sendData, uaObj);
            allPro.push(a);
        }
        Q.all(allPro).then(
            function (data) {
                done();
            },
            function (err) {
                console.log(err);
            }
        ).catch(
            function (err) {
                console.log(err);
            }
        )
    });
});
