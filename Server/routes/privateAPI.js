const express = require('express');
const router = express.Router();

const constProposalStatus = require('../const/constProposalStatus');

const dbProposal = require('./../db_modules/dbProposal');

router.post('/notifyPayment', function(req, res, next) {
    // LOG
    console.log('req.body', req.body);

    let msgBody = req.body.content|| req.body;
    let isValidData = msgBody && msgBody.proposalId && msgBody.status && msgBody.billNo && msgBody.amount
        && msgBody.username && msgBody.md5 && msgBody.depositMethod;

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
                res.send('SUCCESS');
            }
        )
    } else {
        res.send('Invalid data!');
    }
});

module.exports = router;
