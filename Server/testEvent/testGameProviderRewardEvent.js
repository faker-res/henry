/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
var Q = require("q");
var should = require('should');
var dbProposalType = require('../db_modules/dbProposalType');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var constProposalType = require('./../const/constProposalType');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var constRewardType = require('./../const/constRewardType');
var dbRewardRule = require('./../db_modules/dbRewardRule');
var dbPlatform = require('./../db_modules/dbPlatform');
var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');


function testGameProviderRewardEvent(data) {

    this.platformName = data.name; // this.platformName = "Rainbow";
    this.playerName = data.playerName;  //this.playerName = "michael";
    this.typeName = constProposalType.GAME_PROVIDER_REWARD;

    this.platformId = null;
    this.playerObjId = null;
    this.proposalTypeId = null;
};

//Common
var proto = testGameProviderRewardEvent.prototype;

proto.runTestData = function (data) {

    var deferred = Q.defer();
    var self = this;

    dbPlatform.getPlatform({name: this.platformName}).then(
        function (data) {
            //console.log("test", data);
            self.platformId = data._id;
            return dbProposalType.getProposalType({platformId: self.platformId, name: self.typeName});
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error finding platform.", error: error});
        }
    ).then(
        function (data) {
            //console.log("test2", data);
            if (data) {
                self.proposalTypeId = data._id;
                return dbPlayerInfo.getPlayerInfo({name: self.playerName});
            }
            else {
                deferred.reject({name: "DBError", message: "Error finding proposal info.", error: error});
            }
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error in finding player info", error: error});
        }).then(
        function (data) {
            //console.log("test3", data);
            self.playerObjId = data._id;
            return dbPlayerInfo.applyForGameProviderReward(self.platformId, self.playerObjId);

        }, function (error) {

            deferred.reject({name: "DBError", message: "Error in finding player info", error: error});
        }
    ).then(function (data) {
               // console.log("test4", data);
               deferred.resolve(data);

           }, function (error) {
               deferred.reject({
                   name: "DBError",
                   message: "Error in creating proposal for the gameProviderReward",
                   error: error
               });
           }
    );
    return deferred.promise;

};

module.exports = testGameProviderRewardEvent;