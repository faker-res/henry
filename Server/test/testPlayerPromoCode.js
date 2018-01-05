/**
 * Created by mark on 2/1/18.
 */
"use strict";

var should = require('should');

var dbconfig = require('../modules/dbproperties');

var dataGenerator = require("./../test_modules/dataGenerator.js");

var Q = require("q");
var commonTestFunc = require('../test_modules/commonTestFunc');

var promiseUtils = require("../modules/promiseUtils");
var mongooseUtils = require("../modules/mongooseUtils");

var dataUtils = require("../modules/dataUtils.js");
var commonTestActions = require("./../test_modules/commonTestActions.js");
var dbUtility = require("../modules/dbutility");
let dbGameProvider = require('./../db_modules/dbGameProvider');
let dbPlayerReward = require('./../db_modules/dbPlayerReward');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
let dbProposal = require('../db_modules/dbProposal');
const constProposalType = require('./../const/constProposalType');


describe("Test Player Consumption Reward Group", function () {
    //generate data
    let testRewardObj = null;
    let testPlayer = null;
    let testPlatformId = null;
    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformGameProviderGroup = null;
    let testPlatformGameProvider = null;
    let testPlatformGame = null;
    let promoCodeType = null;
    let promoCodeNumber = null;
    let promoCode = null;
    let topUpProposal = null;


    //********************
    //*SETUP
    //********************
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform({'useProviderGroup': true}).then(
            function (data) {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });
    //
    it('Should create a player', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObjId).then(
            data => {
                if (data) {
                    testPlayer = data;
                } else {
                    console.log('Failed at create player');
                }
                done()
            },
            err => {
                console.error(err);
            }
        );
    });

    it('Should create game provider and game for platform', function (done) {
        commonTestFunc.createTestGameProvider().then(
            (gameProvider) => {
                testPlatformGameProvider = gameProvider;
                return commonTestFunc.createGame(testPlatformGameProvider._id);
            },
            (error) => {
                done(error);
            }
        ).then(
            (game) => {
                testPlatformGame = game;
                done();
            },
            (error) => {
                console.error(error);
            }
        );
    });

    it('Should create game provider group', function (done) {
        let providerGroup = [{
            name: 'asdas',
            providers: [testPlatformGameProvider._id]
        }];
        dbGameProvider.updatePlatformProviderGroup(testPlatformObjId, providerGroup).then(
            (gameProvider) => dbGameProvider.getPlatformProviderGroup(testPlatformObjId),
            (error) => {
                done(error);
            }
        ).then(
            (gameProviderGroup) => {
                testPlatformGameProviderGroup = gameProviderGroup[0];
                // console.log(testPlatformGameProviderGroup)
                done();
            },
            (error) => {
                console.error(error);
            }
        );
    });
    it('add promocode sms content', function (done) {
        let platformObjId = testPlatformObjId;
        let promoCodeSMSContent = [{'name': 'this is a message', 'type': 1, 'platformObjId': platformObjId}];
        let isDelete = false;
        dbPlayerReward.updatePromoCodeSMSContent(platformObjId, promoCodeSMSContent, isDelete).then(data => {
            let result = data;
            done();

        }, error => {
            console.error(error);
        })


    });

    it('create promocode type', function (done) {
        dbPlayerReward.getPromoCodeTypes(testPlatformObjId, false).then(data => {
            promoCodeType = data[0];
            done();
        }, error => {
            done('fail to create promo code type')
        });
    });


    it('create a  promocode', function (done) {
        let expireTime = new Date(new Date().getTime() + (60 * 60 * 1000));
        promoCode = {
            platformObjId: testPlatformObjId,
            playerName: testPlayer.name,
            isProviderGroup: true,
            allowedProviders: testPlatformGameProviderGroup,
            amount: 37,
            bannerText: "Happy New Year!",
            disableWithdraw: false,
            expirationTime: expireTime,
            isSharedWithXIMA: true,
            minTopUpAmount: 100,
            promoCodeType: promoCodeType,
            promoCodeTypeObjId: promoCodeType._id,
            requiredConsumption: 100,
            smsContent: promoCodeType.name
        };
        dbPlayerReward.generatePromoCode(testPlatformObjId, promoCode).then(data => {
            promoCodeNumber = data;
            done();
        }, error => {
            console.log(error);
            done('Fail to generate a promo code');
        })
    });

    //********************
    //*TESTING
    //********************

    //it will failed in here , because the PMS dint return result
    it('create a manual topup record for apply the promo code', function (done) {
        let manualTopupInputData = {
            amount: 250,
            bankTypeId: 1,
            depositMethod: 1,
            lastBankcardNo: 123456789,
            cityId: "120100",
            districtId: "120101",
            provinceId: "120000",
            realName: "MY",
            remark: "123"
        };
        dbPlayerTopUpRecord.addManualTopupRequest(null, testPlayer.playerId, manualTopupInputData, 'markt', 'mkt2018', 1, 'admin', 'admin', '', new Date(), 'mtai').then(data => {
            done();
        }, err => {
            console.error(err);
        })
    })

    // do this again because addManualTopupRequest didnt return result;
    it('check if the proposal is established', function (done) {
        dbconfig.collection_proposal.findOne({
            'data.platformId': testPlatformObjId,
            'data.playerObjId': testPlayer._id
        }).then(
            function (data) {
                topUpProposal = data;
                done();
            },
            function (error) {
                console.error(error);
                done('fail to create ali pay acc')
            }
        );
    });

    it("approve TopUp Proposal because it's prepending at start, and promocode need to calculate with proposal", function (done) {
        let requestId = new Date().getTime();
        dbProposal.updateTopupProposal(topUpProposal.proposalId, 'Approved', requestId, 1)
            .then(data => {
                done();
            }, err => {
                console.log(err)
                done();
            })
    });

    it("apply promocode now", function (done) {
        dbPlayerReward.applyPromoCode(testPlayer.playerId, promoCodeNumber).then(data => {
                done();
            },
            error => {
                done('Fail at apply promocode')
            })
    })

    it("creating consumption record to unlock this promo code", function (done) {
        let curTime = new Date();
        commonTestFunc.createConsumptionRecord(testPlayer._id, testPlatformObjId, 130).then(
            function (data) {
                done();
            },
            function (error) {
                console.error(error);
                done('Fail at creating consumption record');
            }
        );
    })

    it('check if the proposal is unlock and reward amount is correct', function (done) {
        dbconfig.collection_proposal.findOne({
            'data.platformId': testPlatformObjId,
            'data.playerObjId': testPlayer._id,
            'mainType': 'Reward',
            'status': 'Approved'
        }).then(
            function (data) {
                if (data.data.rewardAmount == promoCode.amount) {
                    done();
                } else {
                    done('the reward amount is not equal from the promocode setting');
                }
            },
            function (error) {
                console.log(error)
                done('cannot find any promo code success proposal')
            }
        );
    });
    var generatedData = {};

    // *****************
    // delete data
    // *****************
    it('Clear Consumption Data', function (done) {
        dataGenerator.clearConsumptionData(generatedData);
        done();
    });

    it('Should remove all test Data', function (done) {
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayer._id]).then(function (data) {
            done();
        })
    });

    it('Should remove all test Data', function (done) {
        commonTestFunc.removeTestProposalData([], testPlatformObjId, [], [testPlayer._id]).then(function (data) {
            done();
        })
    });
});