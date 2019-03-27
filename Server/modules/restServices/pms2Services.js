const rp = require('request-promise');

const extConfig = require('../../config/externalPayment/paymentSystems');

const paymentSystemId = 4;

function getMainDomain () {
    return extConfig[paymentSystemId].mainDomain;
}

function getSubDomain () {
    return extConfig[paymentSystemId].subDomain;
}

function requestWithPromise (domain, paramStr) {
    let url = domain.concat(paramStr);

    return rp(url);
}

function sendRequest (paramStr) {
    return rp(getMainDomain().concat(paramStr)).then(
        data => {
            console.log('retData', data);
            return data;
        }
    ).catch(
        err => {
            console.log('Main domain send request error', err);

            return requestWithPromise(getSubDomain(), paramStr)
        }
    );
}

function postRequest (reqData, urlName, method) {
    let options = {
        method: method,
        uri: getMainDomain().concat(urlName),
        body: reqData,
        json: true // Automatically stringifies the body to JSON
    };

    return rp(options).then(
        data => {
            console.log(`${urlName} SUCCESS: ${data}`);
            return data;
        }
    ).catch(
        err => {
            console.log(`${urlName} 1ST FAILED: ${err}`);

            options.uri = getSubDomain().concat(urlName);

            return rp(options).then(
                data => {
                    console.log(`${urlName} 2ND SUCCESS: ${data}`);
                    return data;
                }
            ).catch(
                err => {
                    console.log(`${urlName} 2ND FAILED: ${err}`);
                    throw err;
                }
            );
        }
    );
}

function getMinMax (reqData) {
    let paramStr =
        "foundation/payMinAndMax.do?"
        + "platformId=" + reqData.platformId + "&"
        + "username=" + reqData.name + "&"
        + "clientType=" + reqData.clientType;

    console.log('getMinMaxCommonTopupAmount url', paramStr);

    return sendRequest(paramStr);
}

function postWithdraw (reqData) {
    return postRequest(reqData, 'withdraw-proposal', 'POST');
}

function patchTopupStatus (reqData) {
    return postRequest(reqData, 'playerDepositStatus', 'PATCH');
}

function postBatchTopupStatus (reqData) {
    return postRequest(reqData, 'batch/playerDepositStatus', 'POST')
}

function postCancelTopup (reqData) {
    return postRequest(reqData, 'deposit-proposal/cancel', 'POST')
}

function postDelayTopup (reqData) {
    return postRequest(reqData, 'deposit-proposal/delay', 'POST')
}

function postCreateTopup (reqData) {
    return postRequest(reqData, 'deposit-proposal/create', 'POST')
}

function postBankCardList (reqData) {
    return postRequest(reqData, 'getBankCardList', 'POST')
}

function postBankCard (reqData) {
    return postRequest(reqData, 'getBankCard', 'POST')
}

function postBankType (reqData) {
    return postRequest(reqData, 'bankType', 'POST')
}

function postBankTypeList (reqData) {
    return postRequest(reqData, 'bankTypes', 'POST')
}

function postSyncPlatform (reqData) {
    return postRequest(reqData, 'sync-platform', 'POST')
}

function postTopupForceMatch (reqData) {
    return postRequest(reqData, 'deposit-proposal/force-match', 'POST')
}

module.exports = {
    getMinMax: getMinMax,
    postWithdraw: postWithdraw,
    patchTopupStatus: patchTopupStatus,
    postBatchTopupStatus: postBatchTopupStatus,
    postCancelTopup: postCancelTopup,
    postDelayTopup: postDelayTopup,
    postCreateTopup: postCreateTopup,
    postBankCardList: postBankCardList,
    postBankCard: postBankCard,
    postBankType: postBankType,
    postBankTypeList: postBankTypeList,
    postSyncPlatform: postSyncPlatform,
    postTopupForceMatch: postTopupForceMatch
};
