const sampleData = {
    getLoginRewardPoints: `{
        "status": 200,
        "data": {
            "data": [{
                "period": 6, // 0:无周期,1:每日,2:每周,3:每半个月,4:每月,5:每年,6:自定义周期
                "index": 1, //排序
                "consecutiveCount": 1, //累积登入天数
                "rewardPoints": 20,
                "rewardTitle": "test points",
                "rewardContent": "test definition",  //内文说明
                "status": true,  //登入积分开关
                "createTime": "2017-12-06T06:36:41.801Z",
                "progress": {
                    "isApplicable": false,  //能否领取
                    "isApplied": false,  //已领取
                    "count": 0  //玩家登入天数
                },
                "startTime": "2017-12-21T16:00:00.000Z",  //周期开始时间
                "endTime": "2017-12-29T16:00:00.000Z"  //周期结束时间
            },{
                "period": 4,
                "index": 2,
                "consecutiveCount": 1,
                "rewardPoints": 30,
                "rewardTitle": "test month",
                "rewardContent": "test month defi",
                "status": false,
                "createTime": "2017-12-06T06:53:30.690Z",
                "progress": {
                    "count": 1,
                    "isApplied": true,
                    "isApplicable": true
                },
                "startTime": "2017-11-30T16:00:00.000Z",
                "endTime": "2017-12-31T15:59:59.999Z"
            }]
        }
    }`,
    getGameRewardPoints: `{
        "status": 200,
        "data": {
            "data": [{
                    "period": 1, // 0:无周期,1:每日,2:每周,3:每半个月,4:每月,5:每年,6:自定义周期
                    "index": 1, //排序
                    "consecutiveCount": 1, //累积登入天数
                    "rewardPoints": 9,
                    "rewardTitle": "test game", // 奖励标题
                    "rewardContent": "game test", // 奖励内容
                    "target": {
                        "dailyValidConsumptionAmount": 11
                    },
                    "status": true, //登入积分开关
                    "createTime": "2017-12-26T02:01:11.414Z",
                    "progress": { //玩家进度，会根据target参数返回不同progress
                        "isApplicable": false,
                        "isApplied": false,
                        "count": 0,
                        "todayConsumptionAmountProgress": 0
                    },
                    "startTime": "2017-12-25T16:00:00.000Z",
                    "endTime": "2017-12-26T16:00:00.000Z",
                    "eventObjId": "5a41ad677ea92401a75ad310"
                },{
                    "period": 2,
                    "index": 2,
                    "rewardTitle": "test game2",
                    "rewardContent": "game test 2",
                    "target": {
                        "singleConsumptionAmount": 10,
                        "dailyConsumptionCount": 2
                    },
                    "status": true,
                    "createTime": "2017-12-26T03:18:02.568Z",
                    "consecutiveCount": 1,
                    "rewardPoints": 8,
                    "progress": {
                        "isApplicable": false,
                        "isApplied": false,
                        "count": 0,
                        "todayConsumptionCount": 1
                    },
                    "startTime": "2017-12-24T16:00:00.000Z",
                    "endTime": "2017-12-31T16:00:00.000Z",
                    "eventObjId": "5a41bf6a3c157c6376e98c18"
                },{
                    "period": 1,
                    "index": 3,
                    "consecutiveCount": 1,
                    "rewardPoints": 7,
                    "rewardTitle": "test game3",
                    "rewardContent": "game test 3",
                    "target": {
                        "dailyWinGameCount": 2
                    },
                    "status": true,
                    "createTime": "2017-12-26T03:21:14.401Z",
                    "progress": {
                        "isApplicable": false,
                        "isApplied": false,
                        "count": 0,
                        "todayWinCount": 1
                    },
                    "startTime": "2017-12-25T16:00:00.000Z",
                    "endTime": "2017-12-26T16:00:00.000Z",
                    "eventObjId": "5a41c02a3c157c6376e98c1d"
            }]
        }
    }`,
    getTopUpRewardPointsEvent: `{
       "status": 200,
       "data":[{
            "_id": "5a4217464ab51805447f9d00",  // 活动ID
            "period": 1,  // 期间 : 1 - 每日, 2 - 每周, 3 - 每半月, 4 - 每月, 5 - 无周期
            "consecutiveCount": 1,  // 必须要在周期内 N 天达成才能领取积分
            "rewardPoints": 8,  // 领取积分数量
            "rewardTitle": "50块送8",  // 积分活动名称
            "target": {  // 达成目标
                "dailyTopupAmount": 50  // 需求当日存款额度
            },
            "status": true,
            "createTime": "2017-12-26T09:32:54.164Z",  //创建时间
            "progress": {  // 玩家活动进度
                "isApplicable": false,  // 可申请
                "isApplied": false,  // 已领取
                "count": 0  // 已达成天数
            },
            "startTime": "2017-12-25T16:00:00.000Z",  // 开始时间
            "endTime": "2017-12-26T16:00:00.000Z"  // 结束时间
       }]
    }`,
    getMissonList: `{
       "status": 200,
        "data": {
            "pointRanking": [{
                    "account": "yu***ncetest0013", //玩家账号
                    "grade": "高级", //等级
                    "totalPoint": 171, //总分数
                    "rank": 1 //排名
            }],
            "playerPointInfo": [{
                "rank": 136, //目前登陆玩家排名
                "grade": "高级", 目前登陆玩家等级
                "totalPoint": 0 //目前登陆玩家分数
            }],
            "gamePointList": [{
                "id": "5abd9fa2dad91c60c98839e7",
                "refreshPeriod": "Daily", //刷新周期
                "device": "全选", //装置
                "gameType": "百家乐", //游戏类别
                "betDetail": ["闲“], //下注项目
                "title": "xxxx",
                "gradeLimit": 0, //等级限制
                "gradeName": "普通会员",
                "point": 1,//获得积分
                "status": 0, //0代表初始状态,不可领取,1:可领取,2:已领取
                "dailyRequestBetCountsAndAmount": [0,1],//（三选一）的项目之一，（前：每日投注笔数）+（后：每笔最低单笔投注金额）
                "dailyBetConsumption": 10,//（三选一）有效投注额,
                "dailyWinBetCounts": 0, //（三选一）每日胜利次数
                "providerId": ["56"],
                "goal": 1,// 累积天数
                "currentGoal": 0// 目前满足条件的天数
            }],
            "loginPointList": [{
                "id": "5ae01b32a4c7f3a54222f08f",
                "refreshPeriod": "Daily",// 刷新周期
                "device": "全选",//装置
                "title": "login 1",
                "content": "login 1",
                "gradeLimit": 0,//等级限制,用户等级必须>=此等级时才可以领取,不然就报错:您的等级不够
                "gradeName": "普通会员",
                "point": 5,//获得积分
                "status": 1,//0代表初始状态,不可领取,1:可领取,2:已领取
                "providerId": ["16"],
                "goal": 1,// 累积天数
                "currentGoal": 1// 目前满足条件的天数
                "turnQualifiedLoginDate": 2018-05-09T // 准确转成合格的登入日期(举例：任务本月累积5天登入（7/1、7/3、7/5、7/7、7/9），则 turnQualifiedLoginDate：7/9）
            }],
            "rechargePointList": [{
                "id":"05ae01b32a4c7f3a54222f08",
                "refreshPeriod":"monthly",// 刷新周期
                "device":“h5玩家” //装置
                "depositType":"在线充值,个人微信",//存款类型，可从FPMS获得
                "onlineTopupType":"0,1,2,3",//在线充值类型（如：微信扫码,快捷支付）
                "manualTopupType":"0,1,2,3, // 手工存款方式（如：ATM、网银支付）
                "bankCardType":"0,1,2,3,"//银行卡类型（如：中国银行,农业银行）
                "dailyRequestDeposit":100 // 每日充值金额
                "title":"存款200元",
                "content":"存款200元以上可获得积分",
                "gradeLimit":"2",
                "point":20,//获得积分
                "status":0,
                "goal":7, // 累积充值天数
                "currentGoal":4 // 目前满足条件的充值天数
            }]
        }
    }`,
    getPointRule: `{
       "status": 200,
       "data": {
            "preDailyExchangedPoint": 0,
            "preDailyAppliedPoint": 0,
            "refreshPeriod": "Weekly",
            "list": [{
                "gradeId": 0,
                "gradeName": "普通会员",
                "dailyGetMaxPoint": 1000, //单日获取积分上限
                "preExchangeRate": 8, //提前兑换真钱比例
                "preDailyExchangeMaxPoint": 2, // 提前、单日最高可兑换积分
                "endExchangeRate": 6, // 到期兑换比例
                "endExchangeMaxPoint": 6, //到期最高可兑换积分
                "requestedValidBetTimes": 5, //兑换真钱后，真钱的流水倍数
                "lockedGroupId": "", //锁大厅组的ID
                "lockedGroupName": "自由额度" // 锁大厅组的名字
            }]
       }
    }`,
    getRewardPointsRanking: `{
        "status": 200,
        "data": {
            "data": [{
                "playerName": "yu***nceplatinumdragon", // 玩家名称
                "playerLevel": "普通会员", // 玩家等级
                "lastUpdate": "2017-12-01T09:27:55.916Z",  // 最后更新时间
                "points": 67  // 分数
            },{
                "playerName": "yu***ncetopazdragon",
                "playerLevel": "普通会员",
                "lastUpdate": "2017-12-18T07:02:38.172Z",
                "points": 9
            },… // 重复次数根据totalRank
        }
    }`,

    applyRewardPoint: `{
        "status": 200,
        "data": {
            "rewardPointsObjId": "5ae14a5bb61984f65c6a80aa",
            "creator": "yunvincetest0013", //提案人
            "category": 1, //积分任务类型
            "rewardTitle": "login 1",
            "rewardContent": "login 1",
            "userAgent": 1, //装置
            "status": 1, //提案状态
            "playerName": "yunvincetest0013", //玩家账号
            "oldPoints": 0, //变化前积分
            "newPoints": 5, //变化后积分
            "amount": 5, //积分变量
            "currentDayAppliedAmount": 0, //单日积分上限
            "maxDayApplyAmount": 10, //单日获取积分上限
            "playerLevelName": "高级",
            "remark": "",
            "rewardTarget": {
                "targetDestination": [
                    "",
                    "57970a907f46b02427067245",
                    "57985b83611cd9d838274d9a",
                    "5799d77b9803c16f52ec8e68",
                    "5799d6bc9803c16f52ec8e67",
                    "57bc008b2157c3ee35e81ca1"
                ], //积分目标。如：登入目标
                "gameProviderPT": false
            }
        }
    }`,

    applyRewardPoints: `{
        "status": 200,
        "data": [{
            "rewardPointsObjId": "5ae14a5bb61984f65c6a80aa",
            "creator": "yunvincetest0013", //提案人
            "category": 1, //积分任务类型
            "rewardTitle": "login 1",
            "rewardContent": "login 1",
            "userAgent": 1, //装置
            "status": 1, //提案状态
            "playerName": "yunvincetest0013", //玩家账号
            "oldPoints": 0, //变化前积分
            "newPoints": 5, //变化后积分
            "amount": 5, //积分变量
            "currentDayAppliedAmount": 0, //单日积分上限
            "maxDayApplyAmount": 10, //单日获取积分上限
            "playerLevelName": "高级",
            "remark": "",
            "rewardTarget": {
                "targetDestination": [
                    "",
                    "57970a907f46b02427067245",
                    "57985b83611cd9d838274d9a",
                    "5799d77b9803c16f52ec8e68",
                    "5799d6bc9803c16f52ec8e67",
                    "57bc008b2157c3ee35e81ca1"
                ], //积分目标。如：登入目标
                "gameProviderPT": false
            }
        }]
    }`,

    applyPointToCredit: `{
        message: "领取成功: 使用 (30) 积分， 兑换 (1) 真钱
        // 状况1：有足够的积分可以兑换真钱，没有积分馀数（真钱＝整数且馀0）。如：300（积分）/30（兑换比例）＝10（现金） 馀 0（积分）
        // 状况2：有足够的积分可以兑换真钱，且『有』积分馀数。如：329（积分）/30（兑换比例）＝10 （现金）馀 29（积分）
        / 状况3：有足够的积分可以兑换真钱，但部分积分超出单日可兑换限额。如欲兑换：300（积分）/30（兑换比例）＝10（现金） 馀 0（积分），但今日 180（积分）
    }`,

    applyPointToCreditFailed: `{
        errorMessage: "兑换失败，欲兑换的点数不足最低金额（1）元
        // 状况1：兑换失败，兑换的点数，不足最低金额 1 元。如：29（积分）/30（兑换比例）＝0（现金）馀 29（积分）
        // 状况2：兑换失败，今日已达兑换上限。如：今日已经兑换了 180 分（满了），欲再次兑换 30 分
    }`,

    getPointChangeRecord: `{
       "status": 200,
        "data": [{
            "pointRecordId": "1774", //积分ID
            "pointType": 2,
            "title": "15 p", //文字标题
            "device": "WEB玩家", //装置（TEXT 形式）
            "status": 1,
            "beforePoint": 30, //变化前积分
            "afterPoint": 45, //变化后积分
            "pointChange": 15, //积分变量（注意有可能负号）
            "dailyClaimedPoint": 30, //当下单日已获得积分（栏位：单日积分上限的分子）
            "dailyClaimMaxPoint": 200, //单日积分上限（栏位：单日积分上限的分母）
            "createTime": "2018-06-08T03:21:31.540Z",
            "playerLevelText": "高级", //会员等级名称（TEXT 的形式）
            "remark": "" //备注中的内容
            },{
            "pointRecordId": "1773",
            "pointType": 2,
            "title": "haha top up",
            "device": "WEB玩家",
            "status": 1,
            "beforePoint": 0,
            "afterPoint": 30,
            "pointChange": 30,
            "dailyClaimedPoint": 0,
            "dailyClaimMaxPoint": 200,
            "createTime": "2018-06-08T03:21:24.053Z",
            "playerLevelText": "高级",
            "remark": ""
        }]
    }`,
}

let rewardPoint = {
    name:"奖励点数",
    func: {
        getLoginRewardPoints:{
            title: "获取登入积分信息",
            serviceName: "rewardPoints",
            functionName: "getLoginRewardPoints",
            desc:"获取登入积分信息",
            requestContent:[
                { param: "platformId", mandatory: "否", type: "String", content: "平台ID (若未登入则必填)" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getLoginRewardPoints
            },
            respondFailure: {
                status: "40x",
            }
        },

        getGameRewardPoints:{
            title: "获取游戏积分信息",
            serviceName: "rewardPoints",
            functionName: "getGameRewardPoints",
            desc:"获取游戏积分信息",
            requestContent:[
                { param: "platformId", mandatory: "否", type: "String", content: "平台ID (若未登入则必填)" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getGameRewardPoints
            },
            respondFailure: {
                status: "40x",
            }
        },

        getTopUpRewardPointsEvent:{
            title: "获取存款积分信息",
            serviceName: "rewardPoints",
            functionName: "getTopUpRewardPointsEvent",
            desc:"获取存款积分信息",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getTopUpRewardPointsEvent
            },
            respondFailure: {
                status: "40x",
            }
        },

        getMissonList:{
            title: "获取任务信息",
            serviceName: "rewardPoints",
            functionName: "getMissonList",
            desc:"获取任务信息",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getMissonList
            },
            respondFailure: {
                status: "4xx",
            }
        },

        getPointRule:{
            title: "积分规则",
            serviceName: "rewardPoints",
            functionName: "getPointRule",
            desc:"积分规则",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPointRule
            },
            respondFailure: {
                status: "4xx",
            }
        },

        getRewardPointsRanking:{
            title: "获取积分排名列表",
            serviceName: "rewardPoints",
            functionName: "getRewardPointsRanking",
            desc:"获取积分排名列表",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "totalRank", mandatory: "否", type: "int", content: "显示数量，选填，不填时初始值为10" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getRewardPointsRanking
            },
            respondFailure: {
                status: "4xx",
            }
        },
        applyRewardPoint:{
            title: "手动申请积分活动奖励",
            serviceName: "rewardPoints",
            functionName: "applyRewardPoint",
            desc:"手动申请积分活动奖励. 注：需登入后才能申请",
            requestContent:[
                { param: "eventObjectId", mandatory: "是", type: "String", content: "活动ID" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.applyRewardPoint
            },
            respondFailure: {
                status: "4xx",
            }
        },

        applyRewardPoints:{
            title: "手动批量申请积分活动奖励",
            serviceName: "rewardPoints",
            functionName: "applyRewardPoints",
            desc:"手动批量申请积分活动奖励. 注：需登入后才能申请",
            requestContent:[
                { param: "eventObjectId", mandatory: "是", type: "Array", content: "活动ID" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.applyRewardPoints
            },
            respondFailure: {
                status: "4xx",
            }
        },

        applyPointToCredit:{
            title: "积分兑换真钱",
            serviceName: "rewardPoints",
            functionName: "applyPointToCredit",
            desc:"积分兑换真钱.",
            requestContent:[
                { param: "point", mandatory: "是", type: "int", content: "活动ID" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.applyPointToCredit
            },
            respondFailure: {
                status: "4xx",
                name: "Data Error",
                errorMessage: sampleData.applyPointToCreditFailed

            }
        },

        deductPointManually:{
            title: "扣除积分",
            serviceName: "rewardPoints",
            functionName: "deductPointManually",
            desc:"需要玩家登入.",
            requestContent:[
                { param: "requestId", mandatory: "否", type: "String", content: "请求ID" },
                { param: "pointToDeduct", mandatory: "是", type: "int", content: "扣除的分数（一定要负数）" },
                { param: "remark", mandatory: "是", type: "String", content: "注释" }
            ],
            respondSuccess:{
                status: 200,
            },
            respondFailure: {
                status: "4xx",

            }
        },

        getPointChangeRecord:{
            title: "获取积分变化记录",
            serviceName: "rewardPoints",
            functionName: "getPointChangeRecord",
            desc:"获取积分变化记录，需要玩家登入.",
            requestContent:[
                { param: "startTime", mandatory: "是", type: "Date Time", content: "开始时间" },
                { param: "endTime", mandatory: "是", type: "Date Time", content: "结束时间" },
                { param: "pointType", mandatory: "否", type: "int", content: "积分类型：不填-所有（预设）、1-登入积分、2-存款积分、3-游戏积分、4-积分扣除、5-积分增加、6-提前积分兑换、7-到期积分兑换、8-积分扣除（取消退还）、9-提前积分兑换（取消退还）、10-到期积分兑换（取消退还）" },
                { param: "status", mandatory: "否", type: "int", content: "积分变化状态：不填-所有（预设), 0-待审核, 1-已执行, 2-已取消" },
                { param: "platformId", mandatory: "是", type: "String", content: "平台id" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPointChangeRecord
            },
            respondFailure: {
                status: "4xx",

            }
        },
    }
}

export default rewardPoint;