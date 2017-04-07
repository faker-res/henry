var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPlayerTopUpRecord = require('../db_modules/dbPlayerTopUpRecord');
var dbPlayerTopUpDaySummary = require('../db_modules/dbPlayerTopUpDaySummary');
var dbPlatform = require('../db_modules/dbPlatform');
var dbRewardRule = require('../db_modules/dbRewardRule');
var dbRewardEvent = require('../db_modules/dbRewardEvent');
var dbRewardTask = require('../db_modules/dbRewardTask');
var consecutiveTopUpEvent = require('../scheduleTask/consecutiveTopUpEvent');
var dbProposalType = require('../db_modules/dbProposalType');
var dbGame = require('../db_modules/dbGame');
var dbRewardType = require('../db_modules/dbRewardType');
var dbProposal = require('../db_modules/dbProposal');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var dbProposalTypeProcessStep = require('../db_modules/dbProposalTypeProcessStep');
var dbProposalTypeProcess = require('../db_modules/dbProposalTypeProcess');
var constProposalType = require('./../const/constProposalType');

var constRewardType = require('./../const/constRewardType');
var constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var testGameTypes = require("../test/testGameTypes");
var commonTestFun = require('../test_modules/commonTestFunc');

var Q = require("q");


function testFullAttendanceEvent(data) {
    //local variables for test param
    this.testRewardTypeId = null;
    this.testPlatformId = null;
    this.testRewardEventId = null;

    this.typeName = constProposalType.FULL_ATTENDANCE;
    this.proposalTypeId = null;
    this.proposalTypeProcessId = null;

    this.testPlayersId = [];
    this.testPlayerNum = data.testPlayerNum || 3;

    this.topUpTimes = data.topUpTimes || 3;
    this.minAmount = data.minAmount || 1000;
    this.numOfDays = data.numOfDays || 3;
    this.topUpDays = data.topUpDays || 3;
    this.rewardAmount = data.rewardAmount || 100;
    this.spendingAmount = data.spendingAmount || 300;


    this.step1DepartmentId = null;
    this.step1AdminId = null;
    this.step1RoleId = null;
    this.stepType1Name = null;
    this.stepType1Id = null;

    this.testGameId = null;
    this.testGameType = null;

    this.date = new Date();
    this.testPlatformName = data.testPlatformName || "testPlatform" + this.date.getTime();
    this.testDepart1Name = data.testDepart1Name || "step1Department" + this.date.getTime();
    //this.testAdmin1Name = data.testAdmin1Name || "step1admin" + this.date.getTime();
    //this.testRole1Name = data.testRole1Name || "step1Role" + this.date.getTime();
    this.eventName = data.eventName || "testEvent" + this.date.getTime();


    this.testPlatformData = {
        name: this.testPlatformName
    };
    this.gameData = {};
    this.testRewardTask = {};
};

//Common
var proto = testFullAttendanceEvent.prototype;

//To run test logic
proto.runTestData = function (data) {
    var deferred = Q.defer();
    var self = this;

    //create test platform for test event
    dbPlatform.createPlatform(self.testPlatformData).then(
        //get proposal info
        function (data) {
            self.testPlatformId = data._id;
            self.testPlatformData = data;
            var typeProm = dbProposalType.getProposalType({platformId: self.testPlatformId, name: self.typeName});
            var typeProcessProm = dbProposalTypeProcess.getProposalTypeProcess({platformId: self.testPlatformId, name: self.typeName});
            return Q.all([typeProm, typeProcessProm]);
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error creating platform.", error: error});
        }
    ).then(
        // created related department
        function(data){
            if (data && data[0] && data[1]) {
                self.proposalTypeId = data[0]._id;
                self.proposalTypeProcessId = data[1]._id;

                return dbDepartment.createDepartment({departmentName: self.testDepart1Name});
            }
            else {
                deferred.reject({name: "DataError", message: "Can't find proposal type.", error: error});
            }
        },
        function(error){
            deferred.reject({name: "DBError", message: "Error finding proposal type.", error: error});
        }
    ).then(
        //create admin user and roles
        function(data){
            if (data) {
                self.step1DepartmentId = data._id;

                //var email = 'testadmin-' + date + '-' + Math.floor(1000000 * Math.random()) + '@test.sinonet.sg';
                //var admin1Prom = dbAdminInfo.createAdminUserWithDepartment(
                //    {adminName: self.testAdmin1Name, departments: [self.step1DepartmentId], email: email}
                //);
                //var role1Prom = dbRole.createRoleForDepartment(
                //    {roleName: self.testRole1Name, departments: [self.step1DepartmentId], email: email}
                //);
                //
                //return Q.all([admin1Prom, role1Prom]);

                return commonTestFun.createTestAdminWithRole(self.step1DepartmentId);
            }
            else {
                deferred.reject({name: "DataError", message: "Can't create department.", error: error});
            }
        },
        function(error){
            deferred.reject({name: "DBError", message: "Error creating department.", error: error});
        }
    ).then(
        //attach role to user
        function (data) {
            if (data && data[0] && data[1]) {
                self.step1AdminId = data[0]._id;
                self.step1RoleId = data[1]._id;

                return dbRole.attachRolesToUsersById([self.step1AdminId], [self.step1RoleId]);
            }
            else {
                console.log(data);
            }
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error creating user and role.", error: error});
        }
    ).then(
        //create proposal type process steps
        function (data) {
            return dbProposalTypeProcessStep.createProposalTypeProcessStep(
                {title: self.stepType1Name, department: self.step1DepartmentId, role: self.step1RoleId}
            );
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error attach user to role.", error: error});
        }
    ).then(
        //add proposal step to process
        function (data) {
            if (data) {
                self.stepType1Id = data._id;
                return dbProposalTypeProcess.addStepToProcess(self.proposalTypeProcessId, [self.stepType1Id]);
            }
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error create proposal type process step", error: error});
        }
    ).then(
        //get test reward type
        function (data) {
            return dbRewardType.getRewardType({name: constRewardType.FULL_ATTENDANCE});
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error add proposal step to process", error: error});
        }
    ).then(
        //create test platform reward event
        function(data){
            self.testRewardTypeId = data._id;
            self.eventData = {
                name: self.eventName,
                platform: self.testPlatformId,
                type: self.testRewardTypeId,
                param: {
                    numOfDays: self.numOfDays,
                    minAmount: self.minAmount,
                    rewardAmount: self.rewardAmount,
                    spendingAmount: self.spendingAmount
                },
                executeProposal: self.proposalTypeId
            };
            return dbRewardEvent.createRewardEvent(self.eventData);
        },
        function(error){
            deferred.reject({name: "DBError", message: "Error get reward type", error: error});
        }
    ).then(
        //create test player
        function (data) {
            self.eventData = data;
            self.testRewardEventId = data._id;

            var proms = [];
            var date = new Date();
            for (var i = 0; i < self.testPlayerNum; i++) {
                var playerData = {
                    name: "testPlayer" + i + date.getTime(),
                    platform: self.testPlatformId,
                    password: "123"
                };
                proms.push(dbPlayerInfo.createPlayerInfo(playerData));
            }

            return Q.all(proms);
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error create reward event", error: error});
        }
    ).then(
        //add player daily top up record
        function (data) {
            if (data) {
                for (var j = 0; j < data.length; j++) {
                    self.testPlayersId.push(data[j]._id);
                }
                var proms = [];
                var today = new Date();
                today.setHours(0, 0, 0, 0);

                for (var k = 0; k < self.testPlayersId.length; k++) {
                    for (var j = 0; j < self.topUpDays; j++) {
                        var curDate = new Date();
                        curDate.setHours(0, 0, 0, 0);
                        curDate.setDate(today.getDate() - (j + 1));
                        for (var i = 0; i < self.topUpTimes; i++) {
                            curDate = new Date(curDate.getTime() + 1000);
                            proms.push(dbPlayerTopUpRecord.createPlayerTopUpRecord(
                                {
                                    playerId: self.testPlayersId[k],
                                    platformId: self.testPlatformId,
                                    amount: 500,
                                    createTime: curDate,
                                    paymentId: "testPayment",
                                    currency: "USD",
                                    topUpType: "VISA"
                                }
                            ));
                        }
                    }
                }
                return Q.all(proms);
            }
            else{
                deferred.reject({name: "DataError", message: "Can't create test player"});
            }
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error create test player", error: error});
        }
    ).then(
        //test daily player top up summary
        function (data) {
            if (data) {
                var proms = [];
                for (var i = 0; i < self.numOfDays; i++) {
                    var endTime = new Date();
                    endTime.setHours(0, 0, 0, 0);
                    endTime.setDate(endTime.getDate() - i);
                    var startTime = new Date();
                    startTime.setHours(0, 0, 0, 0);
                    startTime.setDate(startTime.getDate() - (i + 1));
                    proms.push(dbPlayerTopUpDaySummary.calculatePlatformDaySummaryForTimeFrame(startTime, endTime, self.testPlatformId));
                }
                return Q.all(proms);
            }
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error create test player top up record", error: error});
        }
    ).then(
        //check platform event
        function (data) {
            if (data) {
                return consecutiveTopUpEvent.checkPlatformFullAttendancePlayers(self.testPlatformId);
            }
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error create test player top up record", error: error});
        }
    ).then(
        //check event proposals
        function (data) {
            return dbProposal.getAvailableProposalsByAdminId(self.step1AdminId, self.testPlatformId);
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error create test player top up record", error: error});
        }
    ).then(
        //approve event proposals
        function(data){
            if (data && data.length > 0) {
                var proms = [];
                for (var i = 0; i < data.length; i++) {
                    if (String(data[i].type._id) == String(self.proposalTypeId)) {
                        proms.push(dbProposal.updateProposalProcessStep(data[i]._id, self.step1AdminId, "test approve", true));
                    }
                }
                return Q.all(proms);
            }
            else{
                deferred.reject({name: "DataError", message: "Can't get event proposal"});
            }
        },
        function(error){
            deferred.reject({name: "DBError", message: "Error get event proposal", error: error});
        }
    ).then(
        //todo:: check reward task here
        //create test games
        function(data){
            self.gameData = {
                name: "testGame" + self.date.getTime(),
                type: testGameTypes.CARD,
                code: "testGame" + self.date.getTime(),
            };
            return dbGame.createGame(self.gameData);
        },
        function(error){
            deferred.reject({name: "DBError", message: "Error approve reward proposal", error: error});
        }
    ).then(
        //player purchase and achieve reward task
        function (data) {
            self.testGameId = data._id;
            self.testGameType = data.type;

            //todo:: to be replaced with new function
            //return dbPlayerInfo.playerPurchase(self.testPlayersId[0], self.testGameId, self.testGameType, 500);
            deferred.resolve(true);
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error create test game", error: error});
        }
    ).then(
        //get reward task
        function (data) {
            return dbRewardTask.getRewardTask({playerId: self.testPlayersId[0], type: constRewardType.FULL_ATTENDANCE});
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error player purchase", error: error});
        }
    ).then(
        function (data) {
            self.testRewardTask = data;
            deferred.resolve(self);
        },
        function (error) {
            deferred.reject({name: "DBError", message: "Error get reward task", error: error});
        }
    );

    return deferred.promise;
};


module.exports = testFullAttendanceEvent;
