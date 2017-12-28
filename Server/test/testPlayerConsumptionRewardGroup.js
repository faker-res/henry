/**
 * Created by mark on 28/12/17.
 */

"use strict";

var should = require('should');

var constRewardType = require('./../const/constRewardType');
var dbPartnerLevel = require('../db_modules/dbPartnerLevel');
var dbPartner = require('../db_modules/dbPartner');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPartner = require('../db_modules/dbPartner');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardEvent = require('./../db_modules/dbRewardEvent');

// exist
var dbRewardTask = require('../db_modules/dbRewardTask');

var dbconfig = require('../modules/dbproperties');

var testGameTypes = require("../test/testGameTypes");
var playerSummary = require("../scheduleTask/playerSummary");
var partnerSummary = require("../scheduleTask/partnerSummary");

var dataGenerator = require("./../test_modules/dataGenerator.js");

var Q = require("q");
var commonTestFun = require('../test_modules/commonTestFunc');

var promiseUtils = require("../modules/promiseUtils");
var mongooseUtils = require("../modules/mongooseUtils");

var dataUtils = require("../modules/dataUtils.js");
var dbGameProvider = require("../db_modules/dbGameProvider.js");
var commonTestActions = require("./../test_modules/commonTestActions.js");
var dbUtility = require("../modules/dbutility");


const constProposalType = require('./../const/constProposalType');
const consumptionRewardGroupType = constProposalType.PLAYER_CONSUMPTION_REWARD_GROUP;

describe("Test Player Consumption Reward Group", function () {

    //generate data
    let testPlatformObj = null;
    let testRewardObj = null;
    let testPlayer = null;
    let testPlatformId = null;
    let testPlatform = null;
    let testPlatformObjId = null;

    let playerConsumptionRewardType = null;
    let playerConsumptionEvent = null;
    // create a test platform
    let testGameProviderObjId = null;
    let testGameId = null;
    let testGameType = null;
    let rewardEventData = null;

    var generatedData = {};
    //********************
    //*SETUP
    //********************

    it('Should create test API platform', function (done) {
        commonTestFun.createTestPlatform().then(
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
         commonTestFun.createTestPlayer(testPlatformObjId).then(
             data=>{
                if(data){
                    testPlayer = data;
                    // console.log(data);
                }else{
                    // console.log('nothing left');
                }
                done()
             },
            err=>{
                 done(err);
            }
        );
    });

    it('Should create test provider-One and game', function (done) {

        commonTestFun.createTestGameProvider().then(
            function (data) {
                testGameProviderObjId = data._id;
                return commonTestFun.createGame(testGameProviderObjId);
            },
            function (error) {
                console.error(error);
            }
        ).then(
            function (data) {
                testGameId = data._id;
                testGameType = data.type;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    /* get reward type */
    it('Get Reward Type at platform', function (done) {
        dbconfig.collection_rewardType.findOne({name: constRewardType.PLAYER_CONSUMPTION_REWARD_GROUP}).lean().then(
            rewardType => {
                if (rewardType) {
                    playerConsumptionRewardType = rewardType;
                    console.log(playerConsumptionRewardType)
                    done();
                } else {
                    done('player consumption rewardType is not found');
                }
            }
        )
    })

    // *****************
    // Testing
    // *****************

    it("create player consumption reward group", function (done) {
        //create a test player without credit
        rewardEventData = {
            "platform" : testPlatformObjId,
            "type" : playerConsumptionRewardType._id,
            "name" : "TZE1"+new Date().getTime(),
            "code" : "TZE1"+new Date().getTime(),
            "validStartTime" : dbUtility.getTodaySGTime().startTime,
            "validEndTime" :dbUtility.getTodaySGTime().endTime,
            // "executeProposal" : ObjectId("5a3b1b5c39ecb9e663158ea5"),
            "settlementPeriod" : "2",
            "needSettlement" : false,
            "param" : {
                "rewardParam" : [
                    {
                        "value" : [
                            {
                                "spendingTimes" : 2,
                                "rewardAmount" : 25,
                                "minConsumptionAmount" : 100
                            }
                        ]
                    }
                ]
            },
            "condition" : {
                "providerGroup" : null,
                "validEndTime" : dbUtility.getTodaySGTime().startTime,
                "validStartTime" : dbUtility.getTodaySGTime().endTime,
                "applyType" : "1",
                "code" : "TZE1",
                "name" : "TZE1"
            },
            "canApplyFromClient" : false,
            "needApply" : false,
            "priority" : 0,
            "__v" : 0
        }


        generatedData.rewardTaskId = rewardEventData._id;
        dbRewardEvent.createRewardEvent(rewardEventData).then(data => {
            done();
        },
            error=>{
            // console.log(error);
            done();
            }
        );
    });



    it("get the player consumption reward group", function (done) {
        let data = {
            platform: testPlatformObjId, type: playerConsumptionRewardType._id,
            name: rewardEventData.name
        }
        dbRewardEvent.getRewardEvent(data)
        .then(rewardEvent => {
            if (rewardEvent) {
                playerConsumptionEvent = rewardEvent;
                done();
            } else {
                done('Player Consumption Event Not Found')
            }
        })
    })
    it("creating consumption record", function(done){
        let curTime = new Date().getTime();
        console.log(testPlayer._id);
        let consumptionData = {
            playerObjId:testPlayer._id,
            platformObjId:testPlatformObjId,
            providerObjId:testGameProviderObjId,
            gameId:testGameId,
            gameType:testGameType,
            amount:100,
            curTime:curTime

        }
        commonTestFun.createConsumptionRecord(consumptionData).then(
            function (data) {
                // console.log(data);
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    })
    /* apply reward */
    it("apply player consumption reward for the player", function(done){
        let data = {};
        dbPlayerInfo.applyRewardEvent('', testPlayer.playerId, rewardEventData.code, data,"")
            .then(data=>{
                console.log(data);
                done();
            },error=>{
                console.log(error);
                done();
            })
    })


    it("creating consumption record", function(done){
        let curTime = new Date().getTime();
        console.log(testPlayer._id);
        let consumptionData = {
            playerObjId:testPlayer._id,
            platformObjId:testPlatformObjId,
            providerObjId:testGameProviderObjId,
            gameId:testGameId,
            gameType:testGameType,
            amount:250,
            curTime:curTime

        }
        commonTestFun.createConsumptionRecord(consumptionData).then(
            function (data) {
                // console.log(data);
                done();
            },
            function (error) {
                console.error(error);
                done(error);
            }
        );
    });
    it("check the proposal",function(done){
        dbconfig.collection_proposal.findOne({'data.platformId':testPlatformObjId ,'data.playerObjId':testPlayer._id}).then(data=>{
            if(data){
                console.log(data);
                done();
            }
        },
        error=>{
                console.log(error);
                done();
        })
    });

    var generatedData = {};

    // *****************
    // delete data
    // *****************
    it('Clear Consumption Data', function (done) {
        dataGenerator.clearConsumptionData(generatedData);
        done();
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId,  [testPlayer._id]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([], testPlatformObjId, [], [testPlayer._id]).then(function(data){
            done();
        })
    });
});