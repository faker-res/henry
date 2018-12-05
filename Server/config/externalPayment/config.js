const thirdPartyAPIConfig = {
    fukuaipay: {
        charset: 'UTF-8',
        merchantCode: 'M310018',
        signType: 'RSA',
        topUpAPIAddr: 'https://api.fukuaipay.com/gateway/bank',
        withdrawAPIAddr: 'https://api.fukuaipay.com/gateway/withdraw'
    }
}

module.exports = thirdPartyAPIConfig;