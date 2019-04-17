// Info:
// minPointNotification - 点数馀额过低警告值(如果没有，不需要填写)
// Add new key, if there is any new party

const thirdPartyAPIConfig = {
    1: {
        charset: 'UTF-8',
        merchantCode: 'M310018',
        signType: 'RSA',
        topUpAPIAddr: 'https://api.fukuaipay.com/gateway/bank',
        withdrawAPIAddr: 'https://api.fukuaipay.com/gateway/withdraw',
        topUpAPICallback: "http://devtest.wsweb.me:3000/fkpNotify",
        withdrawAPICallback: "",

        //financial settlement
        name: '快付收银台',
        enableTopup: false,
        enableBonus: false,
        description: '提供网银、银联等支付方式。'
    },
    2: {
        //financial settlement
        name: 'FPMS',
        enableTopup: false,
        enableBonus: false,
        description: '不通过其他第三方财务系统，（银行卡、个人支付宝、个人微信、提款将可自行在本系统操作）',
        minPointNotification: 200000
    },
    3: {
        topUpAPIAddr: "http://pms-pay-dev.neweb.me/", // env.js - config.paymentHTTPAPIUrl
        topUpAPICallback: "http://devtest.wsweb.me:7100", // env.js - config.internalRESTUrl

        //financial settlement
        name: 'PMS',
        enableTopup: true,
        enableBonus: true,
        description: '（预设）与本公司创立合作至今的财务公司，提供银行卡、N 种第三方、支付宝、微信等市面上所有充值。',
        minPointNotification: 150000
    },
    4: {
        mainDomain: "http://52.221.143.107:9001/v1/",
        subDomain: "http://52.221.143.107:9001/v1/",

        topUpAPIAddr: "http://52.221.143.107:8182/",
        topUpAPIAddr2: "http://52.221.143.107:8182/",
        topUpAPIAddr3: "http://52.221.143.107:8182/",
        topUpAPICallback: "http://devtest.wsweb.me:7100",
        withdrawAPICallback: "http://devtest.wsweb.me:7100",

        //financial settlement
        name: 'PMS2',
        enableTopup: false,
        enableBonus: false,
        description: '我是说明4',
    },
    5: {
        mainDomain: "",
        subDomain: "",

        topUpAPIAddr: "http://jbet.pay.clh66.com/api/pay.jhtml",
        topUpAPICallback: "http://devtest.wsweb.me:7000",
        withdrawAPICallback: "http://devtest.wsweb.me:7000",

        //financial settlement
        name: 'DAYOU',
        enableTopup: false,
        enableBonus: false,
        description: '大有财务系统 - 嘉博专用第三方财务系统',
    }
}

module.exports = thirdPartyAPIConfig;