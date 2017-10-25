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
var dbGame = require('./../db_modules/dbGame');


function testFirstTopUpRewardEvent(data) {

    this.platformName = data.platformName; // this.platformName = "Rainbow";
    this.playerName = data.playerName;  //this.playerName = "michael";
    this.typeName = constProposalType.FIRST_TOP_UP;
    this.gameName = "ninja-panda-one";

    this.platformId = null;
    this.playerObjId = null;
    this.proposalTypeId = null;
    this.gameId = null;
    this.gameType = null;
};

//Common
var proto = testFirstTopUpRewardEvent.prototype;

proto.runTestData = function (data) {

    var deferred = Q.defer();
    var self = this;

    dbPlatform.getPlatform({name: this.platformName}).then(
        function (data) {
            self.platformId = data._id;
            return dbProposalType.getProposalType({platformId: self.platformId, name: self.typeName});
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error finding platform.", error: error});
        }
    ).then(
        function (data) {
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
            self.playerObjId = data._id;
            return dbGame.getGame({name: self.gameName});

        }, function (error) {

            deferred.reject({name: "DBError", message: "Error in getting game info", error: error});

        }
    ).then(
        function (data) {
            self.gameId = data._id;
            self.gameType = data.type;
            return dbPlayerInfo.playerTopUp(self.playerObjId, 500);

        }, function (error) {

            deferred.reject({name: "DBError", message: "Error in finding player info", error: error});
        }
    ).then(
        function (data) {

            return dbPlayerInfo.playerPurchase(self.playerObjId, self.gameId, self.gameType, 300);

        }, function (error) {

            deferred.reject({name: "DBError", message: "Error in  player topup", error: error});
        }
    ).then(
        function (data) {
            return dbPlayerInfo.applyForFirstTopUpRewardProposal("", self.playerObjId);

        }, function (error) {
            deferred.reject({name: "DBError", message: "Error in  player purchase", error: error});
        }
    ).then(
        function (data) {
            deferred.resolve(data);

        }, function (error) {

            deferred.reject({
                name: "DBError",
                message: "Error in creating proposal for the first topUp Reward",
                error: error
            });
        }
    );
    return deferred.promise;

};

module.exports = testFirstTopUpRewardEvent;