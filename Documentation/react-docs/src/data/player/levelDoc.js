const sampleData = {
    manualPlayerLevelUp: `{
        message: 恭喜您从 (当前等级) 升级到(当前等级),获得 xx元、xx元共x个礼包
    }`,
    getAllLevel: `{
        status: 200/4xx,
        "data": {
            [{
                levelUpConfig: [ //升级设定{
                    andConditions: true, //true =>AND, false =>OR// 玩家最小充值额
                    topupLimit: 2000,//玩家最小消费额
                    topupPeriod: “WEEK”, //值可以是“DAY”, “WEEK”, “NONE”
                    consumptionLimit: 20000,
                    consumptionPeriod: “WEEK”,//值可以是“DAY”, “WEEK”, “NONE”//本例说明玩家在一个星期内必须同时充值2000以上以及消费20000以上才能达到下一个等级
                    consumptionSourceProviderId: [“16”] 游戏提供商ID,用来检测投注额。 [ ]空 代表全部提供商
                },...],
                Name: “Normal”, //等级名
                Value: 0, //等级值
                Reward: [{
                    bonusCredit: 20 //奖励额
                }],
                list:[{
                    displayTextContent: "内文",
                    displayTitle: "标题",
                    displayId: "0",
                    playerLevel:xxx
                }]
            },...]
        ｝
    }`,
    upgrade: `{
        "status": 200,
        "data": {
            "message": "恭喜您从 普通会员 升级到 高级,获得30元共1个礼包"
        }
    }`,
}

let level = {
    name:"玩家等级",
    func: {
        manualPlayerLevelUp:{
            title: "玩家前端自助判断升级",
            serviceName: "player",
            functionName: "manualPlayerLevelUp",
            desc:"已登录玩家自助升级",
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.manualPlayerLevelUp
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "充值金额不足, 有效投注不足",
            }
        },
        getLevel:{
            title: "获取玩家等级",
            serviceName: "playerLevel",
            functionName: "getLevel",
            desc:"获取玩家等级信息",
            requestContent:[
                { param: "playerId", mandatory: "是", type: "String", content: "玩家ID" }
            ],
            respondSuccess:{
                status: 200,
                data: "玩家等级信息"
            },
            respondFailure: {
                status: "40x",
                data: "null",
            }
        },
        getLevelReward:{
            title: "获取等级优惠信息",
            serviceName: "playerLevel",
            functionName: "getLevelReward",
            desc:"获取玩家当前等级的",
            requestContent:[
                { param: "playerId", mandatory: "是", type: "String", content: "玩家ID" }
            ],
            respondSuccess:{
                status: 200,
                data: "等级优惠信息对象"
            },
            respondFailure: {
                status: "40x"
            }
        },
        getAllLevel:{
            title: "获取全部玩家等级",
            serviceName: "playerLevel",
            functionName: "getAllLevel",
            desc:"获取全部玩家等级",
            requestContent:[
                { param: "playerId", mandatory: "是", type: "String", content: "玩家ID" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getAllLevel
            },
            respondFailure: {
                status: "40x",
                data: "null"
            }
        },

        upgrade:{
            title: "玩家升级",
            serviceName: "playerLevel",
            functionName: "upgrade",
            desc:"玩家升级",
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.upgrade
            },
            respondFailure: {
                status: "40x",
                errorMessage: "验证失败, 请先登录",
                data: "null"
            }
        },
    }
}


export default level;