const sampleData = {
getPlayerDayStatus: `{
    "topUpAmount": 110,
    "consumptionAmount": 1000
    
}`,
getPlayerWeekStatus: `{
    "topUpAmount": 110,
    "consumptionAmount": 1000
    
}`,
getPlayerMonthStatus: `{
    "topUpAmount": 110,
    "consumptionAmount": 1000
    
}`,
getPlayerAnyDayStatus: `{
    topUpAmount: 200, // 当日存款额度
    consumptionAmount: 1488, // 当日投注额
    bonusAmount: 0, // 当日输赢值
    rewardAmount: 50 // 当日领取优惠额度
	
}`,
getPlayerConsumptionSum: `{
    "consumptionSum": 6875 //『总』有效投注额
}`,
getLastConsumptions: `{
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "startIndex": 0  //查询结果记录开始index
    },"records": []  //查询记录列表
}`,
search: `{
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "startIndex": 0  //查询结果记录开始index
    },"records": []  //查询记录列表
}`,
searchConsumptionRecord: `[{
  		"_id": "5a6058c1ff8545b2a2184387",
  		"platformId": "9c23b22853e93cb452bde61b",
  		"providerId": "18",
  		"gameId": {
  			"name": "樱桃之恋"
  		},
  		"roundNo": "1",
  		"orderNo": "11",
  		"gameType": "16",
  		"insertTime": "2018-01-18T08:20:17.355Z",
  		"isDuplicate": false,
  		"bDirty": false,
  		"usedEvent": [],
  		"commissionAmount": 0,
  		"bonusAmount": 100,
  		"validAmount": 50,
  		"amount": 50,
  		"createTime": "2018-01-18T08:20:17.354Z",
  		"__v": 0,
  		"playerName": "et***st009"
]`,


};

let consumption = {
    name: "投注",
    func: {
        getPlayerDayStatus: {
            title: "获取玩家当天状态",
            serviceName: "player",
            functionName: "getPlayerDayStatus",
            desc: "",
            requestContent: [
                { param: "providerIds", mandatory: "否", type: 'Array', content: '提供商ID - 只获取指定提供商ID的投注记录，不填则全拿' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getPlayerDayStatus,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        getPlayerWeekStatus: {
            title: "获取玩家本周状态",
            serviceName: "player",
            functionName: "getPlayerWeekStatus",
            desc: "",
            requestContent: [
                { param: "providerIds", mandatory: "否", type: 'Array', content: '提供商ID - 只获取指定提供商ID的投注记录，不填则全拿' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getPlayerWeekStatus,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        getPlayerMonthStatus: {
            title: "获取玩家本月状态",
            serviceName: "player",
            functionName: "getPlayerMonthStatus",
            desc: "",
            requestContent: [
                { param: "providerIds", mandatory: "否", type: 'Array', content: '提供商ID - 只获取指定提供商ID的投注记录，不填则全拿' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getPlayerMonthStatus,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        getPlayerAnyDayStatus: {
            title: "获取玩家当日数据",
            serviceName: "player",
            functionName: "getPlayerAnyDayStatus",
            desc: "获取玩家当天的存款、提款、投注与优惠领取额度。",
            requestContent: [
                { param: "providerIds", mandatory: "否", type: 'Array', content: '提供商ID - 不填时搜索全部' },
                { param: "startTime", mandatory: "否", type: 'Date Time', content: '选择日期 不填则为当日' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getPlayerAnyDayStatus,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        getPlayerConsumptionSum: {
            title: "获取玩家『总』有效投注额",
            serviceName: "payment",
            functionName: "getPlayerConsumptionSum",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: 'String', content: '平台ID' },
                { param: "name", mandatory: "是", type: 'String', content: '会员帐号' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getPlayerConsumptionSum,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "详细错误信息",
            }
        },
        //消费记录信息表 data–消费记录列表和总的记录数量，详细信息见下表。
        getLastConsumptions: {
            title: "获取最近消费记录",
            serviceName: "consumption",
            functionName: "getLastConsumptions",
            desc: "获取玩家最近的15条消费记录",
            requestContent: [
                { param: "startIndex", mandatory: "否", type: 'Int', content: '查询记录总数量，用于分页' },
                { param: "requestCount", mandatory: "否", type: 'Int', content: '请求最近的消费记录条数' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getLastConsumptions,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        search: {
            title: "查询消费记录",
            serviceName: "consumption",
            functionName: "search",
            desc: "根据条件查询消费记录信息",
            requestContent: [
                { param: "startTime", mandatory: "否", type: 'Date Time', content: '查询消费开始时间' },
                { param: "endTime", mandatory: "否", type: 'Date Time', content: '查询消费结束时间 (默认为本周)' },
                { param: "providerId", mandatory: "否", type: 'String', content: '内容提供商ID ' },
                { param: "gameId", mandatory: "否", type: 'String', content: '游戏ID' },
                { param: "startIndex", mandatory: "否", type: 'Int', content: '查询记录总数量，用于分页' },
                { param: "requestCount", mandatory: "否", type: 'Int', content: '查询结果记录开始index' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getLastConsumptions,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        searchConsumptionRecord: {
            title: "搜索平台投注记录",
            serviceName: "platform",
            functionName: "searchConsumptionRecord",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: 'Date', content: '查询消费开始时间' },
                { param: "endTime", mandatory: "否", type: 'Date', content: '查询消费结束时间 (默认为本周)' },
                { param: "minBonusAmount", mandatory: "否", type: 'String', content: '最小输赢值（必须大于等于0)' },
                { param: "minAmount", mandatory: "否", type: 'String', content: '最小投注额' },
                { param: "minValidAmount", mandatory: "否", type: 'String', content: '最小有效投注额' },
                { param: "startIndex", mandatory: "否", type: 'Int', content: '查询记录总数量，用于分页' },
                { param: "requestCount", mandatory: "否", type: 'Int', content: '请求个数，最大1000' },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.searchConsumptionRecord,
            },
            respondFailure: {
                status: "4xx",
            }
        },
    }
};

export default consumption;
