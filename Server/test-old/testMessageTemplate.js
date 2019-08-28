let should = require('should');
let socketConnection = require('../test_modules/socketConnection');
let commonTestFunc = require('../test_modules/commonTestFunc');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

let Q = require("q");
let dbConfig = require('../modules/dbproperties');
const constMessageTypeParam = require("../const/constMessageTypeParam");
let dbMessageTemplate = require('../db_modules/dbMessageTemplate');
let dbPlayerInfo = require('../db_modules/dbPlayerInfo');

describe("Test message template and send message", function () {

    let testPlayer = null;
    let testPlayerObjId = null;

    let testPlatform = null;
    let testPlatformObjId = null;
    let testPlatformId = null;

    let testMessageTemplate = null;
    let messageTemplateData = {};
    let messageTemplateParam = constMessageTypeParam.UPDATE_PASSWORD;
    /* Test 1 - create a new platform before the creation of a new player */
    it('Should create test API platform', function (done) {
        commonTestFunc.createTestPlatform().then(
            function (data) {
                testPlatform = data;
                testPlatformObjId = data._id;
                testPlatformId = data.platformId;
                done();
            },
            function (error) {
                done(error);
            }
        );
    });

    /* Test 2 - create internal message template */
    it('Should create internal message template', function (done) {
        let content = '';
        messageTemplateParam.params.forEach(
            (param) => {
                content += param.description + ' {{' + param.parameterName + '}} ';
            }
        );
        messageTemplateData = {
            format: 'internal',
            content: content,
            subject: messageTemplateParam.name,
            type: messageTemplateParam.name,
            platform: ObjectId(testPlatformObjId),
        };

        dbMessageTemplate.createMessageTemplate(messageTemplateData).then(
            function (data) {
                testMessageTemplate = data;
                done();
            },
            function (error) {
                done(error);
            }
        );
    });

    /* Test 3 - create a new player */
    it('Should create player', function (done) {
        commonTestFunc.createTestPlayer(testPlatformObjId).then(
            (data) => {
                testPlayer = data;
                testPlayerObjId = data._id;
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 3.1 - player all sms setting should be true by default*/
    it('Should all sms setting be true by default', function (done) {
        Object.values(testPlayer.smsSetting).filter(setting => setting === false).length.should.equal(0);
        done();
    });

    /* Test 4 - create update player password */
    it('Should update player password', function (done) {
        dbPlayerInfo.resetPlayerPassword(testPlayerObjId, '888888', testPlatformObjId, false).then(
            (data) => {
                done();
            },
            (error) => {
                done(error);
            }
        )
    });

    /* Test 5 - check is send internal message to player */
    it('Should send internal message to player', function (done) {
        // send message is async function, so we need timeout, if not data might be null
        setTimeout(() => {
            let query = {
                platformId: messageTemplateData.platform,
                recipientId: testPlayerObjId,
                title: messageTemplateData.subject,
            };
            dbConfig.collection_playerMail.findOne(query).then(
                (data) => {
                    should.exist(data);
                    done();
                },
                (error) => {
                    done(error);
                }
            )
        }, 100);
    });


    /* Test 99 - remove all test Data */
    it('Should remove all test Data', function (done) {
        commonTestFunc.removeTestData(testPlatformObjId, [testPlayerObjId]).then(function (data) {
            done();
        })
    });
});