const express = require('express');
const router = express.Router();

const constProposalStatus = require('../const/constProposalStatus');
const constServerCode = require("../const/constServerCode");

const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');

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
                            actualAmountReceived: data.actualAmountReceived
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

module.exports = router;
