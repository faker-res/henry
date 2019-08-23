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


var testPlatformObjId = null;
var testPlatformId = null;
var testPlayerName = null;
var testPlayerObjId = null;
var testPlayerId = null;
var testPlayerValidCredit = null;
var testPlayerRealName = null;
var testAdminName = null;
var testAdminObjId = null;
var validCredit = null;
var testUpdateAmount = null;
var adminData = {};

describe("Test CS Operation", function () {

    var client = new WebSocketClient(env.clientAPIServerUrl);

    var playerService = new PlayerService();
    client.addService(playerService);

    var registrationIntentionService = new RegistrationIntentionService();
    client.addService(registrationIntentionService);

    before(async function() {
        // create test platform
        let testPlatform = await commonTestFun.createTestPlatform();
        testPlatform.should.have.property('_id');

        testPlatformObjId = testPlatform._id;
        testPlatformId = testPlatform.platformId;

        // create test player
        let testPlayer = await commonTestFun.createTestPlayer(testPlatformObjId);
        testPlayer.should.have.property('_id');

        testPlayerName = testPlayer.name;
        testPlayerObjId = testPlayer._id;
        testPlayerId = testPlayer.playerId;
        testPlayerValidCredit = testPlayer.validCredit;
        testPlayerRealName = testPlayer.realName;

        // create a connection
        client.connect();
        let clientOpenProm = () => {
            return new Promise(res => {
                client.addEventListener("open", function () {
                    res();
                });
            });
        }
        await clientOpenProm();
    });

    it('Should create a department', async function () {
        let testDepartment = await commonTestFun.createTestDepartment();
        testDepartment.should.have.property('_id');

        adminData.departments = [testDepartment._id];
        adminData.adminName = commonTestFun.testAdminName;
        adminData.email = commonTestFun.testAdminEmail;
        adminData.password = '123456';
    });

    it('Should create a CS', async function () {
        let testAdmin = await dbAdminInfo.createAdminUserWithDepartment(adminData);
        testAdmin.should.have.property('_id');

        testAdminName = testAdmin.adminName;
        testAdminObjId = testAdmin._id;
    });

    it('Should change the credit amount of test player', async function () {
        testUpdateAmount = -10;
        let dataObj = {
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
        };
        let testProposal = await commonTestFun.createUpdatePlayerCreditProposalTest(dataObj);
        testProposal.should.have.property('_id');
    });

    it('Should check the valid credit of test player has updated correctly', async function () {
        let testPlayerInfo = await dbPlayer.getPlayerInfo({name: testPlayerName});
        if (!testPlayerInfo || (testPlayerInfo && !testPlayerInfo._id)) {
            console.error("credit check failed!")
        }

        validCredit = testPlayerInfo.validCredit;
        console.log("checking validCredit", validCredit)
        validCredit.should.equal(testPlayerValidCredit + testUpdateAmount);

    });

    after(async function () {
        // remove all test data
        console.log("checking checking reaching here?")
        let removeTestDataProm = commonTestFun.removeTestData(testPlatformObjId, [testPlayerObjId]);
        let removeTestProposalData = commonTestFun.removeTestProposalData([] , testPlatformObjId, [], [testPlayerObjId]);
        let finished = await Promise.all([removeTestDataProm, removeTestProposalData]);

        // close connection
        client.disconnect();
    });

});

