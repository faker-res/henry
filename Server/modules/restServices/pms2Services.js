const rp = require('request-promise');

const extConfig = require('../../config/externalPayment/paymentSystems');

const paymentSystemId = 4;

function getMainDomain () {
    return extConfig[paymentSystemId].mainDomain;
}

function getSubDomain () {
    return extConfig[paymentSystemId].subDomain;
}

function getMainTopupLobbyAddress () {
    return extConfig[paymentSystemId].topUpAPIAddr;
}

function getSubTopupLobbyAddress () {
    return extConfig[paymentSystemId].topUpAPIAddr2;
}

function get3rdTopupLobbyAddress () {
    return extConfig[paymentSystemId].topUpAPIAddr3;
}

function requestWithPromise (domain, paramStr) {
    let url = domain.concat(paramStr);

    return rp(url);
}

function pingDomain (domain) {
    if (!domain) {
        return false;
    }

    let options = {
        method: 'GET',
        uri: domain.concat('fpms-test.txt')
    };

    return rp(options).then(
        () => true,
        () => false
    );
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

            if (getSubDomain()) {
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
            } else {
                return Promise.reject({message: "Fail to get sub domain"});
            }

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

async function getTopupLobbyAddress () {
    if (await pingDomain(getMainTopupLobbyAddress())) {
        return getMainTopupLobbyAddress();
    }

    if (await pingDomain(getSubTopupLobbyAddress())) {
        return getSubTopupLobbyAddress();
    }

    if (await pingDomain(get3rdTopupLobbyAddress())) {
        return get3rdTopupLobbyAddress();
    }

    // If things goes wrong, just return main address
    return getMainTopupLobbyAddress();
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

function postMerchantList (reqData) {
    return postRequest(reqData, 'getMerchantList', 'POST')
}

function postMerchantTypeList (reqData) {
    return postRequest(reqData, 'getMerchantTypeList', 'POST')
}

function postPaymentGroup (reqData) {
    return postRequest(reqData, 'getPlayerRankByType', 'POST')
}

function postPaymentGroupByPlayer (reqData) {
    return postRequest(reqData, 'getPlayerRankByPlayer', 'POST')
}

module.exports = {
    getMinMax: getMinMax,
    getTopupLobbyAddress: getTopupLobbyAddress,
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
    postTopupForceMatch: postTopupForceMatch,
    postMerchantList: postMerchantList,
    postMerchantTypeList: postMerchantTypeList,
    postPaymentGroup: postPaymentGroup,
    postPaymentGroupByPlayer: postPaymentGroupByPlayer
};
