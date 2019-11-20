const SampleData = {
    getPartnerCommission: `{
    "stats": {
        "startIndex": 0,
        "totalCount": 4
    },
    "total": {
        "totalValidAmount": 770,  //总有效消费额度
        "totalBonusAmount": 20,  //总奖励消费额度
        "operationAmount": 750,  //总经营额度
        "totalRewardAmount": 210,  //总奖励额度
        "serviceFee": 7.5,  //总服务费
        "platformFee": 7.5,  //总平台费
        "profitAmount": 525  //总利润
        “commissionAmount”: 100  //总佣金
        "operationCost": 179.54000000000002,  推广费用
        "preNegativeProfitAmount": 0  之前累计负赢利额度
    },
    "playerCommissions": [{
        "playerName": "vince",  //玩家用户名
        "totalValidAmount": 770,  //有效投注
        "totalBonusAmount": 20,  投注输赢
        "operationAmount": 750,  运营额度
        "totalRewardAmount": 210,  奖励额度
        "serviceFee": 7.5,  服务费
        "platformFee": 7.5,  平台费
        "profitAmount": 525,  总利润
        “totalTopUpAmount”: 123  总充值
        “totalPlayerBonusAmount”: 100  总提款,
        "operationCost": 179.54000000000002,  推广费用
    }]
}`,
    getPartnerCommissionValue: `{
    "amount": 93,  //当前佣金
    "validAmount": 93,  //可领佣金
    "bonusAmount": 5  //以领佣金
}`,
    getPartnerCommissionRate: `[
       {
         "providerGroupId": 0, // 大厅组ID
         "providerGroupName": "group1", //大厅组名字
         "commissionType": 2,
         "list": [
           {
             "commissionRate": 0.22, // 佣金比例
             "activePlayerValueTo": null, // 活跃玩家
             "activePlayerValueFrom": null, // 活跃玩家
             "playerConsumptionAmountTo": null, // 玩家投注
             "playerConsumptionAmountFrom": null // 玩家投注
           }
         ]
       },
       {
         "providerGroupId": 2,
         "providerGroupName": "group2",
         "commissionType": 2,
         "list": [
           {
             "playerConsumptionAmountFrom": null,
             "playerConsumptionAmountTo": null,
             "activePlayerValueFrom": null,
             "activePlayerValueTo": null,
             "commissionRate": 0.21
           }
         ]
       }
]`,
}
let commission = {
    name:"佣金信息",
    func: {
        getPartnerCommission:{
            title: " 查询代理佣金信息",
            serviceName: "partner",
            functionName: "getPartnerCommission",
            requestContent:[
                { param: "startTime", mandatory: "是", type: "Date Time", content: "开始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "结束时间" },
                { param: "startIndex", mandatory: "是", type: "int", content: "-" },
                { param: "requestCount", mandatory: "否", type: "int", content: "-" }
            ],
            respondSuccess:{
                status: 200,
                data: SampleData.getPartnerCommission
            },
            respondFailure: {
                status: "4xx"

            }
        },

        getPartnerCommissionValue:{
            title: " 查询代理佣金详情",
            serviceName: "partner",
            functionName: "getPartnerCommissionValue",
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: SampleData.getPartnerCommissionValue
            },
            respondFailure: {
                status: "4xx"

            }
        },

        getPartnerCommissionRate:{
            title: " 查询代理佣金设置数据",
            serviceName: "partner",
            functionName: "getPartnerCommissionRate",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "partnerId", mandatory: "是", type: "String", content: "代理ID" },
                { param: "commissionClass", mandatory: "是", type: "String", content: "固定(2)" },

            ],
            respondSuccess:{
                status: 200,
                data: SampleData.getPartnerCommissionValue
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: ""
            }
        },

        updatePartnerCommissionType:{
            title: " 更新代理佣金模式",
            serviceName: "partner",
            functionName: "updatePartnerCommissionType",
            requestContent:[
                { param: "commissionType", mandatory: "是", type: "int", content: `commisionType: 
                                                                                    1天-输赢值: 1
                                                                                    7天-输赢值: 2
                                                                                    半月-输赢值: 3
                                                                                    1月-输赢值: 4
                                                                                    7天-投注额: 5` }

            ],
            respondSuccess:{
                status: 200,
                data: "-"
            },
            respondFailure: {
                status: "4xx",
                data: "-",
                errorMessage: ""
            }
        },
    }
}

export default commission;