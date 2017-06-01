"use strict";

require('../test_modules/improveMochaReporting')();
let should = require('should');
let commonTestFun = require('../test_modules/commonTestFunc');
let dataGenerator = require("./../test_modules/dataGenerator.js");
let dbConfig = require('../modules/dbproperties');

let dbPartner = require('./../db_modules/dbPartner');

describe('Test DB Partner create partner', function () {

    // TODO:: Pending testing
    return true;

    let testPlatformObjId, testPlatformId;
    // let generatedPartnerId = [];

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

    it('can create a partner through CreatePartner', function (done) {
        let exampleInput = {
            domain: 'localhost',
            partnerName: 'SarahYoh',
            realName: 'sarahYoh',
            password: 'sarahYoh',
            email: 'sarahYoh@sarahYoh.com',
            phoneNumber: '011102346222',
            level: '592e2998f627ae3c76e4bcb9',
            remarks: 't',
            platform: testPlatformObjId,
            depthInTree: 1
        };

        dbPartner.createPartner(exampleInput).then(
            data => {
                // console.log('data', data);
                data.partnerName.should.be.equal('sarahyoh');
                data.email.should.be.equal('sarahYoh@sarahYoh.com');
                data.password.should.not.be.equal('sarahYoh');
                data.platform.should.be.equal(testPlatformObjId);
                data.status.should.be.equal(1);
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

    it('can only create partner when partner name is unique', function (done) {
        let exampleInput = {
            domain: 'localhost',
            partnerName: 'SarahYoh',
            realName: 'sarahYoh',
            password: 'sarahYoh',
            email: 'sarahYoh@sarahYoh.com',
            phoneNumber: '011102346122',
            level: '592e2998f627ae3c76e4bcb9',
            remarks: 'test',
            platform: testPlatformObjId
        };

        dbPartner.createPartner(exampleInput).then(
            data => {
                done(new Error('Partner that have the same partner name is created'));
            },
            err => {
                done();
            }
        ).catch(
            err => {
                done(err);
            }
        );
    });

    it('can only create partner when platform is valid', function (done) {
        let exampleInput = {
            domain: 'localhost',
            partnerName: 'genuine',
            realName: 'genuine',
            password: 'genuine',
            email: 'genuine@genuine.com',
            phoneNumber: '011102346122',
            level: '592e2998f627ae3c76e4bcb9',
            remarks: 'genuine',
            platform: "invalid platoform"
        };

        dbPartner.createPartner(exampleInput).then(
            data => {
                done(new Error('Partner that have the same partner name is created'));
            },
            err => {
                done();
            }
        ).catch(
            err => {
                done(err);
            }
        );
    });

    it('can create partner through CreatePartnerApi', function (done) {
        let exampleInput = {
            domain: 'localhost',
            partnerName: 'ZoruaLeong',
            realName: 'ZoruaLeong',
            password: 'ZoruaLeong',
            email: 'Zorua@LeongUniverse.co',
            phoneNumber: '011102346999',
            level: '592e2998f627ae3c76e4bcb9',
            remarks: 'Zoroark',
            platformId: testPlatformId,
            depthInTree: 1
        };

        dbPartner.createPartnerAPI(exampleInput).then(
            data => {
                console.log('data', data);
                data.partnerName.should.be.equal('zorualeong');
                data.email.should.be.equal('Zorua@LeongUniverse.co');
                data.password.should.not.be.equal('ZoruaLeong');
                data.platform.toString().should.be.equal(testPlatformObjId.toString());
                data.status.should.be.equal(1);
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
        commonTestFun.removeTestData(testPlatformObjId,  []).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done) {
        commonTestFun.removeTestProposalData([],testPlatformObjId, [], []).then(function(data){
            done();
        })
    });
});