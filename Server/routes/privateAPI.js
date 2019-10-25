const express = require('express');
const router = express.Router();

const serverInstance = require("../modules/serverInstance");

const constMessageClientTypes = require("../const/constMessageClientTypes.js");
const constProposalStatus = require('../const/constProposalStatus');
const constServerCode = require("../const/constServerCode");
const constSystemParam = require('../const/constSystemParam');

const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbPlayerPayment = require('./../db_modules/dbPlayerPayment');

const rsaCrypto = require('./../modules/rsaCrypto');
const jwt = require('jsonwebtoken');

router.get('/notifyPayment', (req, res, next) => {
    res.end('Success');
});

router.post('/notifyPayment', function(req, res, next) {
    // LOG
    let inputData = [];

    req.on('data', data => {
        inputData.push(data);
    }).on('end', () => {
        let buffer = Buffer.concat(inputData);
        let stringBuffer = buffer.toString();
        let decoded = decodeURIComponent(stringBuffer);
        let parsedData = JSON.parse(decoded.substring(decoded.indexOf('{')));

        let msgBody = parsedData.content;
        let isValidData = msgBody && msgBody.proposalId && msgBody.status && msgBody.billNo && msgBody.amount
            && msgBody.username && msgBody.topUpType && msgBody.depositMethod && msgBody.md5;

        // TEMP LOG
        console.log('parsedData', parsedData);

        if (isValidData) {
            let statusText;

            switch (msgBody.status) {
                case "PENDING":
                    statusText = constProposalStatus.PENDING;
                    break;
                case "SUCCESS":
                    statusText = constProposalStatus.SUCCESS;
                    break;
                case "FAIL":
                    statusText = constProposalStatus.FAIL;
                    break;
                case "CANCEL":
                    statusText = constProposalStatus.CANCEL;
                    break;
                default:
                    statusText = constProposalStatus.PREPENDING;
                    break;
            }

            dbProposal.updateTopupProposal(msgBody.proposalId, statusText, msgBody.billNo, msgBody.status, msgBody.remark, msgBody).then(
                data => {
                    console.log('updateTopupProposal data', data);
                    let returnMsg = encodeURIComponent(JSON.stringify({
                        code: constServerCode.SUCCESS,
                        msg: "succ",
                        data: {
                            rate: data.rate,
                            actualAmountReceived: data.actualAmountReceived,
                            realName: data.realName
                        }
                    }));

                    console.log('updateTopupProposal success', msgBody.proposalId, returnMsg);

                    res.send(returnMsg);
                    res.end();
                },
                err => {
                    console.log('updateTopupProposal error', msgBody.proposalId, err);
                    let returnMsg = encodeURIComponent(JSON.stringify({
                        code: constServerCode.INVALID_DATA,
                        msg: err.message,
                        data: err.data
                    }));

                    res.send(returnMsg);
                    res.end();
                }
            )
        } else {
            let returnMsg = encodeURIComponent(JSON.stringify({
                code: constServerCode.INVALID_DATA,
                msg: "Invalid data"
            }));
            res.send(returnMsg);
            res.end();
        }
    });


});

router.get('/getPlayerConsumptionSum', (req, res, next) => {
    res.end('Success');
});

router.post('/getPlayerConsumptionSum', function(req, res, next) {
    // LOG
    let inputData = [];

    req.on('data', data => {
        inputData.push(data);
    }).on('end', () => {
        let buffer = Buffer.concat(inputData);
        let stringBuffer = buffer.toString();
        let decoded = decodeURIComponent(stringBuffer);
        let parsedData = JSON.parse(decoded.substring(decoded.indexOf('{')));

        let msgBody = parsedData.content;
        let isValidData = msgBody && msgBody.platformId && msgBody.name && msgBody.md5;

        // TEMP LOG
        console.log('parsedData', parsedData);

        if (isValidData) {
            dbPlayerInfo.getPlayerConsumptionSum(msgBody.platformId, msgBody.name).then(
                data => {
                    console.log('getPlayerConsumptionSum data', data);
                    let returnMsg = encodeURIComponent(JSON.stringify({
                        code: constServerCode.SUCCESS,
                        msg: "succ",
                        data: {
                            consumptionSum: data.consumptionSum
                        }
                    }));

                    console.log('getPlayerConsumptionSum success', msgBody.name, returnMsg);

                    res.send(returnMsg);
                    res.end();
                },
                err => {
                    console.log('getPlayerConsumptionSum error', msgBody.name, err);
                    let returnMsg = encodeURIComponent(JSON.stringify({
                        code: constServerCode.INVALID_DATA,
                        msg: err.message
                    }));

                    res.send(returnMsg);
                    res.end();
                }
            )

        } else {
            let returnMsg = encodeURIComponent(JSON.stringify({
                code: constServerCode.INVALID_DATA,
                msg: "Invalid data"
            }));
            res.send(returnMsg);
            res.end();
        }
    });
});

router.get('/notifyWithdrawal', (req, res, next) => {
    res.end('Success');
});

router.post('/notifyWithdrawal', function(req, res, next) {
    let inputData = [];

    req.on('data', data => {
        inputData.push(data);
    }).on('end', () => {
        let buffer = Buffer.concat(inputData);
        let stringBuffer = buffer.toString();
        let decoded = decodeURIComponent(stringBuffer);
        let parsedData = JSON.parse(decoded.substring(decoded.indexOf('{')));

        let msgBody = parsedData.content;
        let isValidData = msgBody && msgBody.proposalId && msgBody.orderStatus;
        let statusText;
        switch (Number(msgBody.orderStatus)) {
            case 1:
                statusText = constProposalStatus.SUCCESS;
                break;
            case 2:
                statusText = constProposalStatus.FAIL;
                break;
            case 3:
                statusText = constProposalStatus.PROCESSING;
                break;
            case 4:
                statusText = constProposalStatus.UNDETERMINED;
                break;
            case 5:
                statusText = constProposalStatus.RECOVER;
                break;
            // case 4:
            //     statusText = constProposalStatus.PROCESSING;
            //     break;
            default:
                isValidData = false;
                break;
        }

        // TEMP LOG
        console.log('parsedData notifyWithdrawal', parsedData);

        if (isValidData) {
            dbProposal.updateBonusProposal(msgBody.proposalId, statusText, 1, msgBody.remark).then(
                data => {
                    console.log('notifyWithdrawal data', data);
                    let returnMsg = encodeURIComponent(JSON.stringify({
                        code: constServerCode.SUCCESS,
                        msg: "succ"
                    }));

                    console.log('notifyWithdrawal success', msgBody.name, returnMsg);

                    res.send(returnMsg);
                    res.end();
                },
                err => {
                    console.log('notifyWithdrawal error', msgBody.name, err);
                    let returnMsg = encodeURIComponent(JSON.stringify({
                        code: constServerCode.INVALID_DATA,
                        msg: err.message
                    }));

                    res.send(returnMsg);
                    res.end();
                }
            )

        } else {
            let returnMsg = encodeURIComponent(JSON.stringify({
                code: constServerCode.INVALID_DATA,
                msg: "Invalid data"
            }));
            res.send(returnMsg);
            res.end();
        }
    });
});

router.get('/getProposalStatusList', (req, res, next) => {
    res.end('Success');
});

router.post('/getProposalStatusList', function(req, res, next) {
    let inputData = [];

    req.on('data', data => {
        inputData.push(data);
    }).on('end', () => {
        let buffer = Buffer.concat(inputData);
        let stringBuffer = buffer.toString();
        let decoded = decodeURIComponent(stringBuffer);
        let parsedData = JSON.parse(decoded.substring(decoded.indexOf('{')));

        let msgBody = parsedData.content;
        let isValidData = msgBody && msgBody.proposalIds;

        // TEMP LOG
        console.log('parsedData getProposalStatusList', parsedData);

        if (isValidData) {
            dbProposal.getProposalStatusList(msgBody.proposalIds).then(
                data => {
                    console.log('getProposalStatusList data', data);
                    let returnMsg = {
                        code: constServerCode.SUCCESS,
                        msg: "succ",
                        data: data
                    };

                    console.log('getProposalStatusList success', msgBody.proposalIds, returnMsg);

                    res.send(returnMsg);
                    res.end();
                },
                err => {
                    console.log('getProposalStatusList error', msgBody.proposalIds, err);
                    let returnMsg = encodeURIComponent(JSON.stringify({
                        code: constServerCode.INVALID_DATA,
                        msg: err.message
                    }));

                    res.send(returnMsg);
                    res.end();
                }
            )

        } else {
            let returnMsg = encodeURIComponent(JSON.stringify({
                code: constServerCode.INVALID_DATA,
                msg: "Invalid data"
            }));
            res.send(returnMsg);
            res.end();
        }
    });
});

router.get('/getPlayerInfo', (req, res, next) => {
    res.end('Success');
});

router.post('/getPlayerInfo', function(req, res, next) {
    let inputData = [];

    req.on('data', data => {
        inputData.push(data);
    }).on('end', () => {
        let buffer = Buffer.concat(inputData);
        let stringBuffer = buffer.toString();
        let decoded = decodeURIComponent(stringBuffer);
        let parsedData = JSON.parse(decoded.substring(decoded.indexOf('{')));

        let msgBody = parsedData.content;
        let isValidData = msgBody && msgBody.name && msgBody.platformId;

        // TEMP LOG
        console.log('parsedData getPlayerInfo PMS', parsedData);

        if (isValidData) {
            dbPlayerInfo.getPlayerInfoForPMS(msgBody.platformId, msgBody.name).then(
                data => {
                    console.log('getPlayerInfo PMS data', data);
                    let returnMsg = {
                        code: constServerCode.SUCCESS,
                        msg: "succ",
                        data: data
                    };

                    console.log('getPlayerInfo PMS success', msgBody.platformId, msgBody.name, returnMsg);

                    res.send(returnMsg);
                    res.end();
                },
                err => {
                    console.log('getPlayerInfo PMS error', msgBody.platformId, msgBody.name, err);
                    let returnMsg = {
                        code: constServerCode.INVALID_DATA,
                        msg: err.message
                    };

                    res.send(returnMsg);
                    res.end();
                }
            )

        } else {
            let returnMsg = {
                code: constServerCode.INVALID_DATA,
                msg: "Invalid data"
            };
            res.send(returnMsg);
            res.end();
        }
    });
});

router.get('/createTopUpProposal', (req, res, next) => {
    res.end('Success');
});

router.post('/createTopUpProposal', function(req, res, next) {
    // LOG
    let inputData = [];
    req.on('data', data => {
        inputData.push(data);
    }).on('end', () => {
        let buffer = Buffer.concat(inputData);
        let stringBuffer = buffer.toString();
        let reqData;

        try {
            reqData = JSON.parse(stringBuffer);
        } catch (e) {
            reqData = stringBuffer;
        }

        if (reqData && reqData.content && reqData.content.length > 0) {
            let proms = [];
            let tempPlatformId;
            let tempUsername;

            reqData.content.forEach(encrypted => {
                let token = encrypted.token;
                let decoded = jwt.verify(token, constSystemParam.PMS2_AUTH_SECRET_KEY);
                console.log('********************** decoded', decoded);

                if (decoded) {
                    tempPlatformId = decoded && decoded.platformId;
                    tempUsername = decoded && decoded.username;

                    let isValidData = decoded && decoded.platformId && decoded.username && decoded.clientType && decoded.amount
                        && decoded.status && decoded.topUpType && decoded.depositMethod;

                    if (isValidData) {
                        let statusText;

                        switch (decoded.status) {
                            case "PENDING":
                                statusText = constProposalStatus.PENDING;
                                break;
                            default:
                                statusText = constProposalStatus.PREPENDING;
                                break;
                        }

                        proms.push(dbPlayerPayment.createTopUpProposal(decoded.platformId, decoded.username, decoded.clientType, statusText, decoded.topUpType, decoded.amount, decoded));
                    }
                }
            });

            Promise.all(proms).then(
                data => {
                    console.log('createTopUpProposal data', data);
                    let returnData = [];

                    if (data && data.length > 0) {
                        data.forEach(item => {
                            if (item && item.proposalId) {
                                let result = {proposalId: item.proposalId, amount: item.amount, status: item.status, rate: item.rate, actualAmountReceived: item.actualAmountReceived, bankCardNo: item.bankCardNo};
                                let encryptData = jwt.sign(result, constSystemParam.PMS2_AUTH_SECRET_KEY);
                                returnData.push({token: encryptData});
                            }
                        });
                    }

                    let returnMsg = {
                        code: constServerCode.SUCCESS,
                        msg: "succ",
                        data: {
                            platformId: tempPlatformId,
                            username: tempUsername,
                            proposals: returnData
                        }
                    };

                    console.log('createTopUpProposal PMS success', tempPlatformId, tempUsername, returnMsg);

                    res.send(returnMsg);
                    res.end();
                },
                err => {
                    console.log('createTopUpProposal PMS error', tempPlatformId, tempUsername, err);
                    let returnMsg = {
                        code: constServerCode.INVALID_DATA,
                        msg: err.message
                    };

                    res.send(returnMsg);
                    res.end();
                }
            );
        } else {
            let returnMsg = {
                code: constServerCode.INVALID_DATA,
                msg: "Invalid data"
            };
            res.send(returnMsg);
            res.end();
        }
    });
});

router.post('/updateKeyPair', function (req, res, next) {
    console.log(`updateKeyPair requested`);

    let wsMessageClient = serverInstance.getWebSocketMessageClient();
    if (wsMessageClient) {
        wsMessageClient.sendMessage(constMessageClientTypes.MANAGEMENT, "general", "updateRSAKeys");
        wsMessageClient.sendMessage(constMessageClientTypes.CLIENT, "platform", "updateRSAKeys", {});
        wsMessageClient.sendMessage(constMessageClientTypes.PROVIDER, "platform", "updateRSAKeys", {});
        wsMessageClient.sendMessage(constMessageClientTypes.SETTLEMENT, "platform", "updateRSAKeys", {});
        wsMessageClient.sendMessage(constMessageClientTypes.EXTERNAL_REST, "general", "updateRSAKeys");
    }

    rsaCrypto.refreshKeys(true);
    res.end('Success');

    // let inputData = [];
    //
    // req.on('data', data => {
    //     inputData.push(data);
    // }).on('end', () => {
    //
    // });
    //
    // let data = req.body;
    // let isValidData = Boolean(data && data.privateKey && data.publicKey);
    //
    // if (!data || !isValidData) {
    //     return;
    // }
    //
    // if (data.privateKey && data.publicKey) {
    //     rsaCrypto.restartServices();
    // }
});

module.exports = router;
