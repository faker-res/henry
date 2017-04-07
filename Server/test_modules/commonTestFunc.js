var Q = require("q");
var env = require('../config/env').config();
var dbconfig = require('./../modules/dbproperties');
var dbPlatform = require('../db_modules/dbPlatform');
var dbPlayerInfo = require('../db_modules/dbPlayerInfo');
var dbPaymentChannel = require('../db_modules/dbPaymentChannel');
var dbProvider = require('./../db_modules/dbGameProvider');
var dbGame = require('./../db_modules/dbGame');
var dbPlayerTopUpRecord = require('./../db_modules/dbPlayerTopUpRecord');
var dbProposalType = require('./../db_modules/dbProposalType');
var dbRewardType = require('./../db_modules/dbRewardType');
var dbRewardEvent = require('./../db_modules/dbRewardEvent');
var dbRewardRule = require('./../db_modules/dbRewardRule');
var dbRewardTask = require('./../db_modules/dbRewardTask');
var dbProposalProcess = require('./../db_modules/dbProposalProcess');
var dbAdminInfo = require('../db_modules/dbAdminInfo');
var dbDepartment = require('../db_modules/dbDepartment');
var dbRole = require('../db_modules/dbRole');
var constProposalStepStatus = require('../const/constProposalStepStatus');
var clientApiInstances = require("../modules/clientApiInstances.js");

require('./improveMochaReporting')();

// Instantiate mocked client APIs, so tests can use them, and won't complain that they are missing
if( env.mode == "qa" ){
    clientApiInstances.createContentProviderAPIMocked();
    clientApiInstances.createPaymentAPIMocked();
}

var commonTestFunc = {

    testPlatformName: "testPlatform",
    testPaymentChannelName: "testPaymentChannelName",
    testPlayerName: "testplayer",
    testProviderName: 'testProviderName',
    testGameName: 'testGame',
    testChannelName: 'testChannelName',
    testRewardRuleName: 'testRewardRuleName',
    testPartner : 'testPartner',

    testAdminName: "step1admin",
    testRoleName: "step1Role",
    testDepartName: "step1Department",


    createTestPlatform: function () {
        var date = new Date();
        var platformName = commonTestFunc.testPlatformName + date.getTime();
        var platformData = {
            name: platformName,
            prefix: "",
            code: new Date().getTime(),
            description: "a platform for testing"
        };
        return dbPlatform.createPlatform(platformData);
    },

    createTestPlayer: function (platformId) {
        return Q.all([
            commonTestFunc.getTestMerchantGroup(platformId),
            commonTestFunc.getTestBankCardGroup(platformId),
        ]).spread(
            (merchantGroup, bankCardGroup) => {
                var date = new Date();
                var playerName = commonTestFunc.testPlayerName + date.getTime() + commonTestFunc.getRandomInt();

                var playerData = {
                    name: playerName,
                    platform: platformId,
                    password: '123456',
                    validCredit: 300,

                    phoneNumber: '80808080',
                    email: 'testPlayer@sinonet.com.sg',

                    // Example bank details (may need some improvement)
                    bankName: 'Banky McBankFace',
                    bankAccount: '123456',
                    bankAccountName: 'Current Account',
                    bankAccountType: 'Current',
                    bankAccountCity: 'Cebu',
                    bankAddress: '1 Banking Street, Cebu, Philippines',
                    bankBranch: 'Cebu Central',
                    internetBanking: 'https://bankymcbankfacebanking.com/',

                    merchantGroup: merchantGroup._id,
                    bankCardGroup: bankCardGroup._id,
                };
                return dbPlayerInfo.createPlayerInfo(playerData);
            }
        );
    },

    getTestMerchantGroup: function (platformObjId) {
        return new dbconfig.collection_platformMerchantGroup({
            groupId: String(commonTestFunc.getRandomInt()),
            code: String(commonTestFunc.getRandomInt()),
            name: 'TestMerchantGroup:' + commonTestFunc.getRandomInt(),
            displayName: 'Test merchant group ' + commonTestFunc.getRandomInt(),
            platform: platformObjId,
            merchants: ['003', '005'],
        }).save();
    },

    getTestBankCardGroup: function (platformObjId) {
        return new dbconfig.collection_platformMerchantGroup({
            groupId: String(commonTestFunc.getRandomInt()),
            code: String(commonTestFunc.getRandomInt()),
            name: 'TestBankCardGroup:' + commonTestFunc.getRandomInt(),
            displayName: 'Test bank card group ' + commonTestFunc.getRandomInt(),
            platform: platformObjId,
            banks: ['002', '007'],
        }).save();
    },

    createTestPaymentChannel: function (data) {
        var date = new Date();
        var channelData = {
            name: commonTestFunc.testPaymentChannelName + date.getTime(),
            code: "testCode",
            key: "testKey",
            status: "1",
            des: "test payment channel",
            validForTransactionReward: true
        };
        return dbPaymentChannel.createPaymentChannel(channelData);
    },

    createTestGameProvider: function (data) {

        var date = new Date();
        var providerData = {
            name: commonTestFunc.testProviderName + date.getTime(),
            nickName: "Froggy Games",
            code: "FGXN" + date.getTime(),
            providerId: date.getTime()
        };
        return dbProvider.createGameProvider(providerData);
    },

    createGame: function (testProviderObjId) {
        var date = new Date();
        var gameData = {
            name: commonTestFunc.testGameName + date.getTime(),
            provider: testProviderObjId,
            type: 'Casual',
            code: commonTestFunc.testGameName + date.getTime(),
            gameId: date.getTime()
        };
        return dbGame.createGame(gameData);
    },

    createTopUpRecord: function (playerObjId, platformObjId) {

        var topUpData = {
            playerId: playerObjId,
            platformId: platformObjId,
            amount: 500,
            createTime: new Date(),
            paymentId: "testPayment",
            currency: "USD",
            topUpType: "VISA"
        };
        return dbPlayerTopUpRecord.createPlayerTopUpRecord(topUpData);
    },

    createTestRewardRule: function () {
        var date = new Date().getTime();
        var rewardRuleData = {
            name: commonTestFunc.testRewardRuleName + date
        };
        return dbRewardRule.createRewardRule(rewardRuleData);
    },

    createTestRewardTask: function (data) {

        return dbRewardTask.createRewardTask(data);

    },

    createTestProposalProcess: function () {

        var inputProposalProcess = {
            status: constProposalStepStatus.PENDING
        };
        return dbProposalProcess.createProposalProcess(inputProposalProcess);
    },

    createRewardEvent: function (data) {
        return dbRewardEvent.createRewardEvent(data);
    },

    getProposalType: function (platformObjId, proposalTypeName) {

        return dbProposalType.getProposalType({
            platformId: platformObjId,
            name: proposalTypeName
        });
    },

    getRewardType: function (proposalTypeName) {

        return dbRewardType.getRewardType({name: proposalTypeName});

    },

    updatePlatform: function (query, data) {

        return dbPlatform.updatePlatform(query, data);
    },

    createTestDepartment: function () {
        var date = new Date().getTime();
        return dbDepartment.createDepartment({departmentName: commonTestFunc.testDepartName + date + Math.random(0, 100)});

    },

    createTestAdminWithRole: function (departmentId) {

        var date = new Date().getTime();
        var email = 'testadmin-' + date + '-' + commonTestFunc.getRandomInt() + '@test.sinonet.sg';
        var admin1Prom = dbAdminInfo.createAdminUserWithDepartment(
            {adminName: commonTestFunc.testAdminName + date, departments: [departmentId], email: email}
        );

        var role1Prom = dbRole.createRoleForDepartment(
            {roleName: commonTestFunc.testRoleName + date, departments: [departmentId]}
        );
        return Q.all([admin1Prom, role1Prom]);
    },

    attachRolesToUsers: function (adminId, roleId) {

        return dbRole.attachRolesToUsersById([adminId], [roleId]);

    },


    removeTestData: function (platformObjId, playerObjIds) {
        var platformNameQuery = ".*" + commonTestFunc.testPlatformName + "*.";
        var playerNameQuery = ".*" + commonTestFunc.testPlayerName + "*.";
        var paymentChannelQuery = ".*" + commonTestFunc.testPaymentChannelName + "*.";
        var providerQuery = ".*" + commonTestFunc.testProviderName + "*.";
        var gameQuery = ".*" + commonTestFunc.testGameName + "*.";
        var adminQuery = ".*" + commonTestFunc.testAdminName + "*.";
        var departmentQuery = ".*" + commonTestFunc.testDepartName + "*.";
        var roleQuery = ".*" + commonTestFunc.testRoleName + "*.";

        var pm1 = dbconfig.collection_platform.find({name: {$regex: platformNameQuery}}, {_id: 1}).then(
            platforms => {
                return dbPlatform.deletePlatform(platforms.map(platform => platform._id));
            }
        );
        var pm2 = dbconfig.collection_players.remove({name: {$regex: playerNameQuery}});
        var pm3 = dbconfig.collection_paymentChannel.remove({name: {$regex: paymentChannelQuery}});
        var pm4 = dbconfig.collection_gameProvider.remove({name: {$regex: providerQuery}});
        var pm5 = dbconfig.collection_game.remove({name: {$regex: gameQuery}});
        var pm6 = dbconfig.collection_rewardEvent.remove({platform: platformObjId});
        var pm7 = dbconfig.collection_role.remove({roleName: {$regex: roleQuery} });
        var pm8 = dbconfig.collection_admin.remove({adminName: {$regex: adminQuery}});
        var pm9 = dbconfig.collection_department.remove({departmentName: {$regex: departmentQuery}});
        var pmA = dbconfig.collection_platformMerchantGroup.remove({name: 'TestMerchantGroup.*'});
        var pmB = dbconfig.collection_platformBankCardGroup.remove({name: 'TestBankCardGroup.*'});

        var pmC = dbconfig.collection_playerConsumptionRecord.remove({platformId: platformObjId});
        var pmC1 = dbconfig.collection_playerConsumptionRecord.remove({playerId: {$in:playerObjIds}});

        var pmD = dbconfig.collection_playerTopUpRecord.remove({platformId: platformObjId});
        var pmD1 = dbconfig.collection_playerTopUpRecord.remove({playerId: {$in:playerObjIds}});

        var pmE = dbconfig.collection_playerConsumptionWeekSummary.remove({platformId: platformObjId});
        var pmE1 = dbconfig.collection_playerConsumptionWeekSummary.remove({playerId: {$in:playerObjIds}});

        var pmF = dbconfig.collection_playerConsumptionDaySummary.remove({platformId: platformObjId});
        var pmF1 = dbconfig.collection_playerConsumptionDaySummary.remove({playerId: {$in: playerObjIds}});

        var pmG = dbconfig.collection_playerConsumptionSummary.remove({platformId: platformObjId});
        var pmG1 = dbconfig.collection_playerConsumptionSummary.remove({playerId: {$in: playerObjIds}});

        var pmH = dbconfig.collection_playerTopUpDaySummary.remove({platformId:platformObjId});
        var pmH1 = dbconfig.collection_playerTopUpDaySummary.remove({playerId: {$in: playerObjIds}});

        var pmI =  dbconfig.collection_playerTopUpWeekSummary.remove({platformId:platformObjId});

        var pmJ = dbconfig.collection_providerDaySummary.remove({platformId:platformObjId});
        var pmK = dbconfig.collection_providerPlayerDaySummary.remove({platformId:platformObjId});

        var pmL = dbconfig.collection_platformDaySummary.remove({platformId:platformObjId});
        var pmM = dbconfig.collection_playerRegistrationIntentRecord.remove({platformId:platformObjId});
        var pmN = dbconfig.collection_playerTopUpIntentRecord.remove({playerId: {$in:playerObjIds}});

        var pmO = dbconfig.collection_rewardTask.remove({platformId:platformObjId});
        var pmO1 = dbconfig.collection_rewardTask.remove({playerId: {$in: playerObjIds}});

        return Q.all([pm1, pm2, pm3, pm4, pm5, pm6, pm7, pm8, pm9, pmA, pmB, pmC, pmC1, pmD, pmD1,
            pmE, pmE1, pmF, pmF1, pmG, pmG1, pmH, pmH1, pmI, pmJ,pmK, pmL ,pmM, pmN, pmO, pmO1]);
    },

    removeTestProposalData: function (adminRoleObjIds, platformObjId, proposalTypeObjIds, playerObjId) {

        var proposalQuery =  ".*" +'test'+ "*.";
        var pm_P_ProcessStep = dbconfig.collection_proposalTypeProcessStep.remove({"role": {$in: adminRoleObjIds}});
        var pm_P_Process = dbconfig.collection_proposalProcess.remove({"type": {$in: proposalTypeObjIds }});
        var pm_P_Type = dbconfig.collection_proposalType.remove({"platformId": platformObjId});

        var pm_P = dbconfig.collection_proposal.remove({"data.platformId": platformObjId});
        var pm_P1 = dbconfig.collection_proposal.remove({"proposalId": {$regex: proposalQuery}});
        var pm_P2= dbconfig.collection_proposal.remove({"playerId": playerObjId});

        return Q.all([pm_P_ProcessStep, pm_P_Process, pm_P_Type, pm_P, pm_P1, pm_P2]);
    },

    removeAllTestProposalData: function () {

        // var pm_P_ProcessStep = dbconfig.collection_proposalTypeProcessStep.remove({});
        // var pm_P_Process = dbconfig.collection_proposalTypeProcess.remove({});
        // var pm_P_Type = dbconfig.collection_proposalType.remove({});
        var pm_P = dbconfig.collection_proposal.remove({});
        return Q.all([pm_P]);
    },

    removeAllTestData: function () {

        var proms = [];
        var skipCollections = ['collection_admin', 'collection_department', 'collection_role', 'collection_apiUser', 'collection_players','collection_gameType','collection_rewardType', 'collection_rewardParam', 'collection_rewardCondition'];

        for (var collection in dbconfig) {

            if (!commonTestFunc.isInclude(collection, skipCollections)) {

                var prom_remove = dbconfig[collection].remove({});
                proms.push(prom_remove);
            }
        }
        return Q.all(proms);
    },

    isInclude: function (collectionName, arr) {

        var isExist = false;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == collectionName) {
                return true;
            }
        }
        return isExist;

    },

    getRandomInt: function () {
        //return Math.floor(Math.random() * 1000000);
        return new Date().getTime()+Math.floor(Math.random() * 1000000);
    },
};

module.exports = commonTestFunc;