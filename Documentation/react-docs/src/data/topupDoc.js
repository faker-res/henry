const sampleData = {
getTopUpList: `{
    stats: {
        totalCount: "提案总数",
        startIndex: "当前页面",
        requestCount: "页面总提案数",
        totalAmount: "提案总额度"
    },
    records: [{  //查询记录列表
        amount: "充值额度",
        createTime: "充值时间",
        bDirty: "充值记录是否已使用"
    }]
}`,
    
}

/*
    func.*.desc:
    for description of each function, it takes a string and convert '\n' to line break.

*/
let topup = {
    name: "充值",
    func: {
        getTopupList: {
            title: "获取充值记录",
            serviceName: "payment",
            functionName: "getTopupList",
            desc: "获取玩家充值记录",
            requestContent: [
                { param: "topUpType", mandatory: "否", type: "Int", content: "1:手动充值 2:在线充值 3:支付宝充值 4：个人微信" },
                { param: "startTime", mandatory: "否", type: "Date", content: "开始时间" },
                { param: "endTime", mandatory: "否", type: "Date", content: "结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始index， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量，用于分页" },
                { param: "sort", mandatory: "否", type: "Boolean", content: "按时间排序 false:降序， true：正序" },
                { param: "bDirty", mandatory: "否", type: "Boolean", content: "充值是否已被占用（已申请过奖励）" },
                { param: "bSinceLastConsumption", mandatory: "否", type: "Boolean", content: "是否是最后投注后的充值" },
                { param: "bSinceLastPlayerWithDraw", mandatory: "否", type: "Boolean", content: "是否是最后提款后的充值" },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getTopUpList
            },
            respondFailure: {
                status: "40x",
                data: "null",
                errorMessage: "错误信息",
            }
        },
    }
}

export default topup;
