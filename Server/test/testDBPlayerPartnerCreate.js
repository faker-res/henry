"use strict";

require('../test_modules/improveMochaReporting')();
let should = require('should');
let commonTestFun = require('../test_modules/commonTestFunc');
let dataGenerator = require("./../test_modules/dataGenerator.js");
let dbConfig = require('../modules/dbproperties');

let dbPlayerPartner = require('./../db_modules/dbPlayerPartner');

describe("Test DB CreatePlayerPartner", function() {
    let testPlatformObjId, testPlatformId;
    let generatedPlayerId = [];

    it('Should create test player and platform', function (done) {
        commonTestFun.createTestPlatform({"prefix": "RE", "partnerPrefix":'REP'}).then(
            function (data) {
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();
            },
            function (error) {
                console.error(error);
                done(new Error(JSON.stringify(error, null, 2)));
            }
        ).catch(
            function (error) {
                done(error);
            }
        );
    });

    it('can create player partner through CreatePlayerPartnerAPI', function (done) {
        let exampleInput = {
            name: "HuatZhi",
            realName: "Lor Gian Zhi",
            password: "LorGianZhi",
            platformId: testPlatformId,
            domain: "huatzhi.com",
            phoneNumber: "01111111111",
            email: "huat@snsoft.com",
            userAgent: [ { browser: 'Chrome', device: '', os: 'Linux' } ],
            lastLoginIp: '218.107.132.66',
            loginIps: [ '218.107.132.66' ]
        };

        dbPlayerPartner.createPlayerPartnerAPI(exampleInput).then(
            data => {
                // data[0] is the player object, data[1] is the partner object
                data.length.should.be.equal(2);
                data[0].name.should.be.equal('rehuatzhi');
                data[1].partnerName.should.be.equal('rephuatzhi');
                data[1].email.should.be.equal('huat@snsoft.com');
                data[0].password.should.not.be.equal('LorGianZhi');
                data[0].platform.toString().should.be.equal(testPlatformObjId.toString());
                data[1].status.should.be.equal(1);
                done();
            },
            err => {
                done(new Error(JSON.stringify(err, null, 2)));
            }
        ).catch(
            err => {
                done(err);
            }
        );
    });

    it('Should remove all test Data', function(done) {
        commonTestFun.removeTestData(testPlatformObjId,  generatedPlayerId).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done) {
        commonTestFun.removeTestProposalData([],testPlatformObjId, [], generatedPlayerId).then(function(data){
            done();
        })
    });
});