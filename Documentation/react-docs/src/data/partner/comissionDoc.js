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

    getCommissionRate: `[{
    "providerGroupId": 1, // 锁大厅组1，每个锁大厅有不同的比例。
    "providerGroupName": "group1", // 锁大厅组1的名字
    "list": [{
        "defaultCommissionRate": 0.1, // 预设佣金比例
        "activePlayerValueTo": “-”, // 活跃下线人数最大值，-代表无限
        "activePlayerValueFrom": 1, // 活跃下线人数最小值
        "playerConsumptionAmountTo": 9999, // 下线最大输值（或投注额）
        "playerConsumptionAmountFrom": 0, // 下线最小输值（或投注额）
        “customizedCommissionRate”： 0.15 //客制化佣金比例
    },{
        "defaultCommissionRate": 0.11,
        "activePlayerValueTo": 8888,
        "activePlayerValueFrom": 2,
        "playerConsumptionAmountTo": 8888,
        "playerConsumptionAmountFrom": 0
    }]
    },{
    "providerGroupId": 2,
    "providerGroupName": "group2",
    "list": [{
        "defaultCommissionRate": 0.1,
        "activePlayerValueTo": "-",
        "activePlayerValueFrom": 1,
        "playerConsumptionAmountTo": 9999,
        "playerConsumptionAmountFrom": 0
    }]
}]`,

    preditCommission: `{
    activeCrewNumbers:"2",  // 活跃下线人数
    totalDepositAmount:"500", //本周期的所有存款总和
    depositFeeRate:"0.1"  //存款手续费比例
    totalDepositFee:"50",  // 存款费用
    totalWithdrawAmount:"500", //本周期的所有取款总和
    withdrawFeeRate:"0.1" //取款手续费比例
    totalWithdrawFee:"50",  // 提款费用
    totalBonusAmount:"1000" //本周期的所有优惠总和
    bonusFeeRate:"0.01" //优惠费用扣除比例
    totalBonusFee:"10"  // 所有优惠费用总和
    totalProviderFee:"5000"  // 所有平台费用总和
    totalCommission:"20000"  // 所有锁定组的佣金总和（没扣除费用）
    depositCrewDetail:[ // 下线存款详情表（有记录>0才会列出）
            0:{
            crewAccount:sallen888 //有存款的下线玩家
            crewDepositAmount:200 //该玩家的存款金额
        }]
        withdrawCrewDetail:[ // 下线提款详情表（有记录>0才会列出）
            0:{
            crewAccount:sallen888 //有提款的下线玩家
            crewWithdrawAmount:200 //该玩家的提款金额
        }]
        bonusCrewDetail:[ // 下线优惠详情表（有记录>0才会列出）
            0:{
            crewAccount:sallen888 //有优惠的下线玩家
            crewBonusAmount:200 //该玩家的优惠金额（包含手工、代码等）
        }
            list: [
                providerGroupId:"0",
                providerGroupName:"百家乐（真人）",
                crewProfit："-300" //单一组的下线报表输赢
                commissionRate:"0.35" //单一组对应『输赢、活跃玩家数量』的佣金比 例
                crewProfitDetail:[ // 下线玩家报表输赢详情（有记录>0才会列出）
                    0:{
                    crewAccount:sallen888 //下线有投注的玩家帐号
                    singleCrewProfit:200 //单一投注玩家的报表输赢
                }]
                providerGroupCommission:"5000",
                providerGroupFeeRate:"0.10" //单一组的平台费用比例
                providerGroupFee:"1500"
            ]
        ]
    }
}`,

    getCommissionProposalList: `[{
    "proposalId": "697236",
    "status": "Approved", //提案状态
    "proposalAmount": -490.3, //提案金额
    "createTime": "2018-05-21T06:55:12.618Z",//提交时间//结算的佣金周期 （哪一天 ～ 哪一天）
    "commissionPeriod": "2018-04-30T16:00:00.000Z ~ 2018-05-14T15:59:59.000Z",
    "activeCrewNumbers": 1, //活跃玩家数量
    "totalDepositFee": 90, //需扣除的总存款手续费
    "totalWithdrawFee": 0, //需扣除的总取款手续费
    "totalBonusFee": 3.3, //需扣除的优惠
    "list": [{
        "providerGroupId": "1",
        "providerGroupName": "group1",
        "providerGroupCommission": -397, //单一组的佣金
        "providerGroupFee": 0 //单一组的平台费
    },{
        "providerGroupId": "2",
        "providerGroupName": "group2",
        "providerGroupCommission": 0,
        "providerGroupFee": 0
    }],
    "successTime": "2018-05-21T06:55:12.653Z", // success/cancelTime 只出一种
    "cancelTime": "2018-05-21T06:52:43.529Z",
    "totalProviderFee": 0, // 所有平台费用总和
    "totalCommission": -397 //// 所有锁定组的佣金总和（没扣除费用）
}]`,

    partnerCreditToPlayer: `{
    amount: 2000，//返回转账金额,
    balance: 5000 //账户余额
}`,
}
let commission = {
    name:"佣金",
    func: {
        getPartnerCommission:{
            title: " 查询代理佣金信息",
            serviceName: "partner",
            functionName: "getPartnerCommission",
            requestContent:[
                { param: "startTime", mandatory: "否", type: "Date Time", content: "开始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "结束时间" },
                { param: "startIndex", mandatory: "否", type: "int", content: "-" },
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
                data: SampleData.getPartnerCommissionRate
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        updatePartnerCommissionType:{
            title: " 更新代理佣金模式",
            serviceName: "partner",
            functionName: "updatePartnerCommissionType",
            requestContent:[
                { param: "commissionType", mandatory: "是", type: "int", content: `1天-输赢值: 1
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
                errorMessage: "xxxxx"
            }
        },

        getCommissionRate:{
            title: " 获取代理佣金比例详情",
            serviceName: "partner",
            functionName: "getCommissionRate",
            requestContent:[
                { param: "partnerId", mandatory: "否", type: "String", content: "可选择不填，不填只显示平台设置的代理佣金比例" },
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "commissionType", mandatory: "是", type: "String", content: `1天-输赢值: 1
                                                                                      7天-输赢值: 2
                                                                                      半月-输赢值: 3
                                                                                      1月-输赢值: 4
                                                                                      7天-投注额: 5` }

            ],
            respondSuccess:{
                status: 200,
                data: SampleData.getCommissionRate
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        preditCommission:{
            title: " 预算代理佣金",
            serviceName: "partner",
            functionName: "preditCommission",
            desc: "注：代理必须登入",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "searchPreviousPeriod", mandatory: "否", type: "int", content: "搜寻前 X 周期，预设0＝本周期" },
            ],
            respondSuccess:{
                status: 200,
                data: SampleData.preditCommission
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        getCommissionProposalList:{
            title: " 查询代理佣金提案",
            serviceName: "partner",
            functionName: "getCommissionProposalList",
            desc: "注：代理必须登入",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "startTime", mandatory: "是", type: "Date Time", content: "开始时间（与 searchProposalCounts 二选一）" },
                { param: "endTime", mandatory: "是", type: "Date Time", content: "结束时间（与 searchProposalCounts 二选一）" },
                { param: "status", mandatory: "否", type: "String", content: "请参考提案状态表, 不填代表全部" },
                { param: "searchProposalCounts", mandatory: "否", type: "int", content: "往前搜寻提案数量（与查询时间二选一）" },
            ],
            respondSuccess:{
                status: 200,
                data: SampleData.getCommissionProposalList
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        partnerCreditToPlayer:{
            title: " 代理转金额给下线",
            serviceName: "partner",
            functionName: "getCommissionProposalList",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "partnerId", mandatory: "是", type: "String", content: "代理ID" },
                { param: "targetList", mandatory: "否", type: "Array Object", content: `转账明细数组
                                                                                        {
                                                                                          username: 'String' | 玩家账号 - 必填
                                                                                          amount: int
                                                                                          providerGroupId: int | 锁大厅ID(当不填该字段，代表转入自由额度（
                                                                                          此处的锁大厅ID 是 后台基础设置 -> 锁大厅设置的id）)
                                                                                          spendingTimes: int | 流水倍数(providerGroupId字段填写后，该字段必填)
                                                                                        }` },
            ],
            respondSuccess:{
                status: 200,
                data: SampleData.partnerCreditToPlayer
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },
    }
}

export default commission;