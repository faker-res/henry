var should = require('should');
var dbconfig = require('../modules/dbproperties');

var WebSocketClient = require('../server_common/WebSocketClient');
var PlayerService = require('../services/client/ClientServices').PlayerService;
var RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;

var TopUpIntentionService = require('../services/client/ClientServices').TopUpIntentionService;
var ConsumptionService = require('../services/client/ClientServices').ConsumptionService;

var ClientPlayerAPITest = require('../testAPI/clientAPITest/ClientPlayerAPITest');
var ClientRegistrationIntentionAPITest = require('../testAPI/clientAPITest/ClientRegistrationIntentionAPITest');
var ClientTopUpIntentionAPITest = require('../testAPI/clientAPITest/ClientTopUpIntentionAPITest');
var ClientConsumptionAPITest = require('../testAPI/clientAPITest/ClientConsumptionAPITest');

var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbPlatform = require('../db_modules/dbPlatform');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbProposal = require('../db_modules/dbProposal');
var dbPlayer = require('../db_modules/dbPlayerInfo');

var env = require("../config/env").config();
var commonTestFun = require('../test_modules/commonTestFunc');


describe("Test Client API - Player service", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var playerService = new PlayerService();
    client.addService(playerService);

    var registrationIntentionService = new RegistrationIntentionService();
    client.addService(registrationIntentionService);

    it('Should create test player and platform', function(done) {
        commonTestFun.createTestPlatform().then(
            function(data) {
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                return commonTestFun.createTestPlayer(testPlatformObjId);
            },
            function(error) {
                console.error(error);
            }
        ).then(
            function(data) {
                testPlayerName = data.name;
                testPlayerObjId = data._id;
                testPlayerId = data.playerId;
                testPlayerValidCredit = data.validCredit;
                testPlayerRealName = data.realName;
                done();
            },
            function(error) {
                console.error(error);
            }
        );
    });

    it('Should create a connection', function (done) {
        client.connect();
        client.addEventListener("open", function () {
            done();
        });
    });

    it('Should create a department and CS', function (done) {
        commonTestFun.createTestDepartment().then(
            function(data) {
                if (data && data._id){
                    adminData = {
                        departments : [data._id],
                        adminName: commonTestFun.testAdminName,
                        email: commonTestFun.testAdminEmail,
                        password: '123456',
                    };
                    return dbAdminInfo.createAdminUserWithDepartment(adminData);
                }
                else{
                    console.error("Department is not found");
                }
            },
            function(error) {
                console.error(error);
            }
        ).then(
            function(data) {
                testAdminName = data.adminName;
                testAdminObjId = data._id;
                done();
            },
            function(error) {
                console.error(error);
            }
        );
    });

    it('Should change the credit amount of test player', function (done) {
        testUpdateAmount = 10;
        dataObj = {
            platformId: testPlatformObjId,
            creator: {type: "admin", name: testAdminName, id: testAdminObjId},
            data: {
                playerObjId: testPlayerObjId,
                playerName: testPlayerName,
                updateAmount: testUpdateAmount,
                curAmount: testPlayerValidCredit,
                realName: testPlayerRealName,
                remark: "test the function of changing of valid credit",
                adminName: testAdminName
            }
        }
        commonTestFun.createUpdatePlayerCreditProposalTest(dataObj).then(
            function(data) {
                done();
            },
            function(error) {
                console.error(error);
            }
        );
    });

    it('Should check the valid credit of test player has updated correctly', function (done) {
        dbPlayer.getPlayerInfo({name: testPlayerName}).then(
            function(data) {
                validCredit = data.validCredit;
                if (validCredit == testPlayerValidCredit + testUpdateAmount){
                    done();
                }
                else{
                    console.error("update amount incorrect");
                }
            },
            function(error) {
                console.error(error);
            }
        )
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function(data){
            done();
        })
    });

    it('Should remove all test Data', function(done){
        commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]).then(function(data){
            done();
        })
    });

});

