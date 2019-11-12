const plDesc = `guguui k  hjuh iuh h y8i ghy`;

let ApiContent = {
    Login: {
        playerLogin: {
            desc: "玩家登录接口",
            requestContent:{"platformId": "必填|String|玩家注册平台","name":"必填|String|玩家用户名","password": "必填|String|玩家密码"},
            statusSuccess:"status: 200, data: 玩家对象, token: 玩家token",
            statusFailed:"status: 40x, data: -, errorMessage: 错误信息"
        },
        partnerLogin: {
            desc: "gugyygyg ygyug yuguy bjhbhikb",
            requestContent:"gbe gnjfakbgu ejg bera g",
            statusSuccess:"dngk lgndflkng lknglk",
            statusFailed:"gfdih f ga ghk hgusa"
        }
    },
    Topup: {
        onlineTopup: {
            desc: "gugyygyg ygyug yuguy bjhbhikb",
            requestContent:"gbe gnjfakbgu ejg bera g",
            statusSuccess:"dngk lgndflkng lknglk",
            statusFailed:"gfdih f ga ghk hgusa"
        },
        manualTopup: {
            desc: "gugyygyg ygyug yuguy bjhbhikb",
            requestContent:"gbe gnjfakbgu ejg bera g",
            statusSuccess:"dngk lgndflkng lknglk",
            statusFailed:"gfdih f ga ghk hgusa"
        }
     },
    Reward: {},

}

export default ApiContent