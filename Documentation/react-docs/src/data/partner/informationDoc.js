const sampleData = {
get: `//代理对象，详见下面说的
{
    partnerId: “xxxxxx”, //渠道ID
    name:”test1”, //账号
    realName: “Elisa ”, //姓名
    phoneNumber:”13412345678”, //手机号
    qq:”123456”, //QQ号码
    bankAccount:””, //银行账号
    bankUserName:””, //收款人姓名
    bankName:””, //开户银行
    bankAccountType:””, //银行类型
    bankAccountCity:””, //开户城市
    bankBranch:””, //开户网点
}`,
getStatistics:`{
    queryType: “day/week/month”, //查询类型
    topup: 2000,    //下线玩家充值额
    getBonus: 180,  //下线玩家兑奖额
    bonus: 200, //所获奖励额
    playerWin: 424.5,   //下线玩家赢利额
    newPlayers: 10, //新注册下线玩家数
    activePlayers: 2,   //活跃玩家数
    subPartners: 0  //新注册下线渠道
}`,
getPlayerSimpleList:`{
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "startIndex": 0  //查询结果记录开始index
  		},
    "records": [  //查询记录列表{
        id: “u83535”    //玩家id
        name:”ut446823”, //玩家用户名
        realName:”李四”, //真实姓名
        registrationTime: "2016-12-05T11:41:15.714Z" //注册时间
        lastLoginIP: “158.56.2.45” //最后登录IP
    }]
}`,
getPartnerChildrenReport:`{
    "stats": {
        "startIndex": 0,
        "totalCount": 1
    },"children": [  //下线列表{
        "partnerId": "20",
        "partnerName": "渠道1",
        "realName": "渠道",
        "activePlayers": 0,  //本周活跃玩家数
        "totalReferrals": 0,  //下线玩家总数
        "credits": 0,  //额度
        "lastAccessTime": "2016-09-20T07:11:52.982Z",
        "registrationTime": "2016-09-20T07:11:52.982Z",
        “playerTopUpSum": 504,  //玩家总充值额度
        "playerBonusSum": 0  //玩家总兑奖额度
    }],
    "summary": {  //报表小记
        "totalPlayerTopUpSum": 0,
        "totalActivePlayers": 0
    }
}`,
getPartnerPlayerPaymentReport:`{
    "stats": {
  			"totalCount": 1,
  			"startIndex": 0
  		},
    "summary": {  //总计
  			"totalTopUpTimes": 5,  //玩家总充值次数
  			"totalBonusTimes": 0,  //玩家总兑奖次数
  			"totalTopUpAmount": 504,  //玩家总充值额度
  			"totalBonusAmount": 0,  //玩家总兑奖额度
  			"topUpTimes": 5,  //玩家搜索时间内充值次数
  			"bonusTimes": 0,  //玩家搜索时间内兑奖次数
  			"topUpAmount": 504,  //玩家搜索时间内充值额度
  			"bonusAmount": 0  //玩家搜索时间内兑奖额度,
  			“totalValidConsumptionAmount: 0”,  //玩家搜索时间内有效消费额度
  			“totalBonusConsumptionAmount: 0”,  //玩家搜索时间内奖励消费额度
  			"totalConsumptionAmount": 770,  //玩家总消费额
  			"totalConsumptionTimes": 2,  //玩家总消费次数
    },"pageSummary": {  //本页小记
  			"totalTopUpTimes": 5,
  			"totalBonusTimes": 0,
  			"totalTopUpAmount": 504,
  			"totalBonusAmount": 0,
  			"totalConsumptionAmount": 0,
  			"totalConsumptionTimes": 0,
  			"topUpTimes": 5,
  			"bonusTimes": 0,
  			"topUpAmount": 504,
  			"bonusAmount": 0，
  			“totalValidConsumptionAmount: 0”,
  			“totalBonusConsumptionAmount: 0”
    },"players": [  //玩家报表内容{
  			"playerName": "YunVincevince73",
  			"registrationTime": "2016-12-22T07:22:32.807Z",
  			"lastAccessTime": "2016-12-22T07:22:32.807Z",
  			"lastBonusTime": null,  //最近兑奖时间
  			“lastTopUpTime”: null,  //最近充值时间
  			"totalTopUpTimes": 0,
  			"totalBonusTimes": 0,
  			"totalTopUpAmount": 0,
  			"totalBonusAmount": 0,
  			"topUpTimes": 0,
  			"bonusTimes": 0,
  			"topUpAmount": 0,
  			"bonusAmount": 0，
  			“totalValidConsumptionAmount: 0”,
  			“totalBonusConsumptionAmount: 0”
    }]
}`,
getPartnerPlayerRegistrationReport:`{
    "stats": {
        "startIndex": 0,
        "totalCount": 1
    },"players": [  //下线玩家列表{
        "playerId": "20",
        "name": "渠道1",
        "realName": "渠道",
        "lastAccessTime": "2016-09-20T07:11:52.982Z",
        "registrationTime": "2016-09-20T07:11:52.982Z",
        “lastLoginIp”: xxxx,
        “topUpTimes”: 3,
        “domain”: xxxx
    }]
}`,
getPartnerPlayerRegistrationStats:`{
    "totalNewPlayers": 5,  //总开户人数
    "totalNewOnlinePlayers": 1,  //在线开户数
    "totalNewManualPlayers": 4,  //手工开户数
    "totalTopUpPlayers": 1,  //存款人数
    "totalValidPlayers": 0,  //有效开户数
    "totalSubPlayers": 2  //代理下级开户数
}`,

getCrewActiveInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式  
    activeCrewNumbers:2, //活跃人数共2人  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getCrewDepositInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式  
    depositCrewNumbers:2, //存款人数共2人  
    totalDepositAmount:500 //存款总金额  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getCrewWithdrawInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式  
    withdrawCrewNumbers:2, //提款人数共2人  
    totalwithdrawAmount:500 //提款总金额  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getCrewBetInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式
    betCrewNumbers:2, //总投注人数（算笔数>0）  
    totalvalidBet:500, //总有效投注额  
    totalCrewProfit:-6000, //下线总输6000元  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getNewCrewInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式
    newCrewNumbers:2, //总新注册人数
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    },{  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
}

let information = {
    name: "代理信息/资料",
    func: {
        get: {
            title: "获取代理会员用户信息",
            serviceName: "partner",
            functionName: "get",
            desc: "客户端获取推广的基本信息，包括手机，地址，以及银行资料详细信息。通过这个接口，还会返回更多的玩家信息。\n 代理登入login后能直接调用",
            requestContent: [],
            respondSuccess: {
                status: 200,
                data:sampleData.get,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        getStatistics: {
            title: "获取代理统计信息注册create",
            serviceName: "partner",
            functionName: "getStatistics",
            desc: "按周期查询代理统计信息。",
            requestContent: [
                { param: "queryType", mandatory: "是", type: "String", content: "查询类型，分为 day(日)/week(周)/month(月)" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getStatistics,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPlayerSimpleList: {
            title: "获取代理下线玩家列表",
            serviceName: "partner",
            functionName: "getPlayerSimpleList",
            desc: "",
            requestContent: [
                { param: "partnerId", mandatory: "是", type: "String", content: "代理Id" },
                { param: "queryType", mandatory: "否", type: "String", content: "分两种类型: registrationTime注册时间查询 | lastAccessTime最后登录时间查询" },
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
                { param: "sort", mandatory: "否", type: "Boolean", content: "排序方向 true–正序, false–降序" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPlayerSimpleList,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPlayerDetailList: {
            title: "获取代理下线玩家详情列表",
            serviceName: "partner",
            functionName: "getPlayerDetailList",
            desc: "请参考上一个接口 【获取代理下线玩家列表】（getPlayerSimpleList），同理。"
        },
        getPartnerChildrenReport: {
            title: "获取代理下线报表",
            serviceName: "partner",
            functionName: "getPartnerChildrenReport",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerChildrenReport,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPartnerPlayerPaymentReport: {
            title: "代理其下玩家充值兑奖情况记录",
            serviceName: "partner",
            functionName: "getPartnerPlayerPaymentReport",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerPlayerPaymentReport,
            },
            respondFailure: {
                status: "4xx",
            }
        },
        getPartnerPlayerRegistrationReport: {
            title: "查询代理下线玩家开户来源报表",
            serviceName: "partner",
            functionName: "getPartnerPlayerRegistrationReport",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间" },
                { param: "domain", mandatory: "否", type: "String", content: "域名" },
                { param: "playerName", mandatory: "否", type: "String", content: "玩家名字" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerPlayerRegistrationReport,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPartnerPlayerRegistrationStats: {
            title: "查询代理下线玩家开户统计",
            serviceName: "partner",
            functionName: "getPartnerPlayerRegistrationStats",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerPlayerRegistrationStats,
            },
            respondFailure: {
                status: "4xx",
            }
        },
        getCrewActiveInfo: {
            title: "获取下线玩家活跃信息",
            serviceName: "partner",
            functionName: "getCrewActiveInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewActiveInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getCrewDepositInfo: {
            title: "获取下线玩家存款信息",
            serviceName: "partner",
            functionName: "getCrewDepositInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewDepositInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getCrewWithdrawInfo: {
            title: "获取下线玩家提款信息",
            serviceName: "partner",
            functionName: "getCrewWithdrawInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewWithdrawInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getCrewBetInfo: {
            title: "获取下线玩家提款信息",
            serviceName: "partner",
            functionName: "getCrewBetInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "providerGroupId", mandatory: "否", type: "String", content: "锁大厅组ID" },
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewBetInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getNewCrewInfo: {
            title: "获取新注册下线玩家信息",
            serviceName: "partner",
            functionName: "getNewCrewInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "startTime", mandatory: "否", type: "Date", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getNewCrewInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
    }
}
export default information;