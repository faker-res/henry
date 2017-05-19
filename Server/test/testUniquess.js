const should = require('should');
const dbconfig = require('../modules/dbproperties');
const dbPlatform = require('../db_modules/dbPlatform');
const WebSocketClient = require('../server_common/WebSocketClient');
const PlayerService = require('../services/client/ClientServices').PlayerService;
const PartnerService = require('../services/client/ClientServices').PartnerService;
const RegistrationIntentionService = require('../services/client/ClientServices').RegistrationIntentionService;
const ClientPartnerAPITest = require('../testAPI/clientAPITest/ClientPartnerAPITest');
const ClientRegistrationIntentionAPITest = require('../testAPI/clientAPITest/ClientRegistrationIntentionAPITest');
const env = require("../config/env").config();
const commonTestFun = require('../test_modules/commonTestFunc');
const Q = require("q");
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbPartner = require('../db_modules/dbPartner');
const rsaCrypto = require("../modules/rsaCrypto");


let testPlatformObjId = null;
let testPlatformId = null;
let testPartnerName = null;
let testObjId = [];
let partnerPhoneNumber = null;
let partnerName = null;
let playerPhoneNumber = null;
let playerName = null;
let playerRealName = null;

describe("Test Partner API - Partner service", () => {

    let client = new WebSocketClient(env.clientAPIServerUrl);

    let partnerService = new PartnerService();
    client.addService(partnerService);

    let registrationIntentionService = new RegistrationIntentionService();
    client.addService(registrationIntentionService);

    let clientPartnerAPITest = new ClientPartnerAPITest(partnerService);


    //// Init Data - Start ///////
    it('Should create test API partner and platform', (done) => {

        commonTestFun.createTestPlatform({
            allowSamePhoneNumberToRegister:false,
            allowSameRealNameToRegister:false
        }).then(
             (data) => {
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;

                let createNewTestPartner = commonTestFun.createTestPartner(testPlatformObjId);
                let createNewTestPlayer = commonTestFun.createTestPlayer(testPlatformObjId);
                return Q.all([createNewTestPartner,createNewTestPlayer]);
            },
            (error) => {
                console.error("init platform data error \n",error);
            }
        ).then(
            (data) => {
                testObjId.push(data[0]._id);
                testObjId.push(data[1]._id);
                partnerPhoneNumber = data[0].phoneNumber;
                partnerName = data[0].partnerName;
                playerPhoneNumber = data[1].phoneNumber;
                playerName = data[1].name;
                playerRealName = data[1].realName;
                done();
            },
            (error) => {
                console.error("init player and partner data error \n",error);
            }
        );
    });

    // test partner uniquess
    it('Should fail due to partner phone number is not unique', (done) => {

            let partnerData = {
                "platform": testPlatformObjId,
                "partnerName": "testPartner1",
                "email": "testP1@gmail.com",
                "password": "123123",
                "phoneNumber":partnerPhoneNumber
            };

            dbPartner.createPartner(partnerData).then(
            (data) => {
                done();
            },
            (error) => {
                console.error("partner phone number error \n",error);
            }
         );
    });

    it('Should failed due to partner name is not unique', (done) => {
            let partnerData = {
                "platform": testPlatformObjId,
                "email": "testP2@gmail.com",
                "password": "123123",
                "phoneNumber":"123456789",
                "partnerName": partnerName
            };

            dbPartner.createPartner(partnerData).then(
            (data) => {
                done();
            },
            (error) => {
                console.error("partner name error \n",error);
            }
         );
    });

    // test player uniquess
    it('Should fail due to player phone number is not unique', (done) => {
            let playerData = {
                platform: testPlatformObjId,
                name: "testPlayer1",
                password: '123456',
                realName:"Test Player 1",
                email: 'testPlayer1@sinonet.com.sg',
                phoneNumber: rsaCrypto.decrypt(playerPhoneNumber)
            }

            dbPlayerInfo.createPlayerInfo(playerData).then(
            (data) => {
                done();
            },
            (error) => {
                console.error("player phone number error \n",error);
            }
         );
    });

    it('Should failed due to player real name is not unique', (done) => {
            let playerData = {
                platform: testPlatformObjId,
                name: "testPlayer2",
                password: '123456',
                phoneNumber: "1234561231",
                email: 'testPlayer2@sinonet.com.sg',
                realName: playerRealName
            }

            dbPlayerInfo.createPlayerInfo(playerData).then(
            (data) => {
                done();
            },
            (error) => {
                console.error("palyer real name error \n",error);
            }
         );
    });

    it('Should failed due to player name is not unique', (done) => {
            let playerData = {
                platform: testPlatformObjId,
                password: '123456',
                phoneNumber: "1234561232",
                email: 'testPlayer3@sinonet.com.sg',
                realName: "Test Player 3",
                name: playerName
            }

            dbPlayerInfo.createPlayerInfo(playerData).then(
            (data) => {
                done();
            },
            (error) => {
                console.error("palyer name error \n",error);
            }
         );
    });

    // remove data
    it('Should remove all test Data',(done) => {
        commonTestFun.removeTestData(testPlatformObjId, testObjId).then((data) => {
            done();
        })
    });

});