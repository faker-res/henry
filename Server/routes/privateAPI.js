const express = require('express');
const router = express.Router();

const constProposalStatus = require('../const/constProposalStatus');
const constServerCode = require("../const/constServerCode");

const dbProposal = require('./../db_modules/dbProposal');

router.get('/notifyPayment', (req, res, next) => {
    res.end('Success');
});

router.post('/notifyPayment', function(req, res, next) {
    console.log(`notifyPayment ${req.method} ${req.url}`);
    // LOG
    let inputData = [];

    req.on('data', data => {
        inputData.push(data);
    }).on('end', () => {
        let buffer = Buffer.concat(inputData);

        let stringBuffer = buffer.toString();

        console.log('stringBuffer', stringBuffer);

        let parsedData = JSON.parse(stringBuffer);

        let msgBody = parsedData.content;
        let isValidData = msgBody && msgBody.proposalId && msgBody.status && msgBody.billNo && msgBody.amount
            && msgBody.username && msgBody.md5 && msgBody.depositMethod;

        console.log('isValidData', isValidData);

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
                    isValidData = false;
                    break;
            }
            dbProposal.updateTopupProposal(msgBody.proposalId, statusText, msgBody.billNo, msgBody.status, msgBody.remark, msgBody).then(
                () => {
                    res.send({
                        code: constServerCode.SUCCESS,
                        msg: "succ"
                    });
                },
                err => {
                    res.send({
                        code: constServerCode.INVALID_DATA,
                        msg: err.message
                    })
                }
            )
        } else {
            res.send({
                code: constServerCode.INVALID_DATA,
                msg: "Invalid data"
            })
        }
    });


});

module.exports = router;
