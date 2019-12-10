const sampleData = {
    manualPlayerLevelUp: `{
    message: 恭喜您从 (当前等级) 升级到(当前等级),获得 xx元、xx元共x个礼包
}`,
getLevel:`{
    "_id": "5733e26ef8c8a9355caf49dc",
    "name": "普通会员", //会员等级
    "value": 0,
    "consumptionLimit": 20000, //消费限额
    "topupLimit": 2000, //充值限额
    "canApplyConsumptionReturn": true, //可以申請退回消费
    "playerValueScore": 2, //玩家价值
    "reward": {
      "requiredUnlockAmount": 0, //解锁所需数量
      "requiredUnlockTimes": 0, //解锁所需次数
      "providerGroup": "free", //提供商
      "isRewardTask": false, //是否奖励任务
      "bonusCredit": 20, //奖励额
      "requiredUnlockTimesLevelDown": 0, //保级-优惠解锁流水倍数
      "providerGroupLevelDown": "free", //保级-优惠锁大厅组
      "isRewardTaskLevelDown": false, //如果解锁流水 >0 就是true。代表优惠需要解锁才能提款
      "bonusCreditLevelDown": 0 //保级优惠额度
    },
    "levelDownConfig": [
      {
        "_id": "5800988c1a8d1645a7091e49",
        "topupPeriod": "DAY", //值可以是“DAY”, “WEEK”, “NONE”
        "consumptionPeriod": "DAY", //值可以是“DAY”, “WEEK”, “NONE”
        "consumptionMinimum": 0, //玩家最小消费限额 保持在这个等级
        "topupMinimum": 0 //玩家最小充值限额 保持在这个等级
      }
    ],
    "levelUpConfig": [ //升级设定
      {
        "_id": "573abaefed6da1cf5c398fed",
        "topupPeriod": "DAY", //值可以是“DAY”, “WEEK”, “NONE”
        "consumptionPeriod": "DAY", //值可以是“DAY”, “WEEK”, “NONE”
        "consumptionLimit": 0, //玩家升级所需最小消费限额
        "consumptionSourceProviderId": [], 游戏提供商ID,用来检测投注额。 [ ]空 代表全部提供商
        "topupLimit": 0 //玩家升级所需最小充值限额
      }
    ],
    "platformId": "4" //平台ID 
  }
}`,

getLevelReward:`{
    "bonusCreditLevelDown": 0, //保级优惠额度
    "isRewardTaskLevelDown": false, //如果解锁流水 >0 就是true。代表优惠需要解锁才能提款
    "providerGroupLevelDown": "free", //保级-优惠锁大厅组
    "requiredUnlockTimesLevelDown": 0, //保级-优惠解锁流水倍数
    "bonusCredit": 20, //奖励额
    "isRewardTask": false, //是否奖励任务
    "providerGroup": "free", //提供商
    "requiredUnlockTimes": 0, //解锁所需次数
    "requiredUnlockAmount": 0 //解锁所需数量
}`,
getAllLevel: `{
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
}`,
upgrade: `{
"message": "恭喜您从 普通会员 升级到 高级,获得30元共1个礼包"
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
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.getLevel
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
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.getLevelReward
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
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.getAllLevel
            },
            respondFailure: {
                status: "4xx",
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