const express = require('express');
const router = express.Router();

const dbPaymentProposal = require('./../db_modules/externalAPI/dbPaymentProposal');

router.post('/fkpNotify', function(req, res, next) {
    let isValidData =
        req && req.body && req.body.merchantCode && req.body.orderNo && req.body.payOrderNo && Number.isFinite(Number(req.body.amount))
        && req.body.orderStatus;

    if (isValidData) {
        let msgBody = req.body;
        dbPaymentProposal.updateFKPTopupProposal(msgBody.orderNo, msgBody.payOrderNo, msgBody.orderStatus).then(
            () => {
                res.send('SUCCESS');
            }
        )
    } else {
        res.send('Invalid data!');
    }
});

module.exports = router;
