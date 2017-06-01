"use strict";

require('../test_modules/improveMochaReporting')();
let should = require('should');
let commonTestFun = require('../test_modules/commonTestFunc');
let dataGenerator = require("./../test_modules/dataGenerator.js");
let dbConfig = require('../modules/dbproperties');

let dbPlayerInfo = require('./../db_modules/dbPlayerInfo');


describe("Test DB Player create player", function() {
    let testPlatformObjId, testPlatformId;

    // TODO:: Pending testing
    return true;
    
    let generatedPlayerId = [];

    it('Should create test player and platform', function (done) {

        commonTestFun.createTestPlatform().then(
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

    it('can create a player through createPlayerInfo', function(done) {
        let exampleInput = {
            domain: 'localhost',
            referral: null,
            name: 'testPlayerOne',
            email: 'huat@snsoft.my',
            password: 'testplay',
            phoneNumber: '01110898823',
            realName: 'testtest',
            nickName: 'testtest',
            partner: null,
            platform: testPlatformObjId
        };

        dbPlayerInfo.createPlayerInfo(exampleInput).then(
            data => {
                generatedPlayerId.push(data._id);
                data.name.should.be.equal('testplayerone');
                data.email.should.be.equal('huat@snsoft.my');
                data.password.should.not.be.equal('testplay');
                done();
            },
            err => {
                done(new Error(JSON.stringify(err, null, 2)));
            }
        ).catch(function(err) {
           done(err);
        });
    });

    it('can only create player when player name is unique', function(done) {
        let exampleInput = {
            domain: 'localhost',
            referral: null,
            name: 'testPlayerOne',
            email: 'huat@snsoft.co',
            password: 'testplay',
            phoneNumber: '01110898824',
            realName: 'testtest',
            nickName: 'testtest',
            partner: null,
            platform: testPlatformObjId
        };

        dbPlayerInfo.createPlayerInfo(exampleInput).then(
            data => {
                generatedPlayerId.push(data._id);
                done(new Error("Player with same username can be created."));
            },
            err => {
                done();
            }
        ).catch(function(err) {
            done(err);
        });
    });

    it('can only create player when platform is valid', function(done) {
        let exampleInput = {
            domain: 'localhost',
            referral: null,
            name: 'testPlayerTwo',
            email: 'huat@snsoft.cso',
            password: 'testplay',
            phoneNumber: '01110898825',
            realName: 'testtest',
            nickName: 'testtest',
            partner: null,
            platform: false
        };

        dbPlayerInfo.createPlayerInfo(exampleInput).then(
            data => {
                generatedPlayerId.push(data._id);
                done(new Error("Player with invalid platform can be created."));
            },
            err => {
                done();
            }
        ).catch(function(err) {
            done(err);
        });
    });

    it('can create a player through createPlayerInfoApi', function(done) {
        let exampleInput = {
            domain: 'localhost',
            referral: null,
            name: 'testPlayerThree',
            email: 'huat@snsoft.cot',
            password: 'testplay',
            phoneNumber: '01110898825',
            realName: 'testtest2',
            nickName: 'testtest',
            partner: null,
            userAgent: [ { browser: 'Chrome', device: '', os: 'Linux' } ],
            isOnline: true,
            lastLoginIp: '218.107.132.66',
            loginIps: [ '218.107.132.66' ],
            platformId: testPlatformId
        };

        dbPlayerInfo.createPlayerInfoAPI(exampleInput).then(
            data => {
                generatedPlayerId.push(data._id);
                data.name.should.be.equal('testplayerthree');
                data.email.should.be.equal('huat@****ft.cot'); // api output censored the email
                data.password.should.not.be.equal('testplay');
                done();
            },
            err => {
                done(new Error(JSON.stringify(err, null, 2)));
            }
        ).catch(function(err) {
            done(err);
        });
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