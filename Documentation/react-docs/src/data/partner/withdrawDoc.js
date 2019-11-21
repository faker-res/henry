const SampleData = {
    applyBonus: `{
        proposalId: “000123”, // 提案Id
        proposalType: “003”, // 提案类型
        status: “001”, // 提案状态
        requestDetail: { // 兑奖明细, 包含申请兑奖的明细信息
            bonusId: “001”,
            amount: 1,
            honoreeDetail: {
                mobile: 13500101111
            }
        },
        createTime: “2016-08-15 12:00:00”,... // 创建时间
        errorMessage: “xxxxxx” // 详细错误信息
    }`,

    cancelBonusRequest: `{
        proposalId: 提款提案号
    }`,

    getBonusRequestList: `{
        stats: {
            totalCount: 20,
            startIndex: 5
        },
        records: [{
            proposalId:”001”,
            proposalType: “002”             
            ...},{
            proposalId:”002”,
            proposalType: “002”
        ...}]
    }`,

    partnerCreditToPlayer: `{
        amount: 2000，//返回转账金额,
        balance: 5000 //账户余额
    }`,
}
let withdraw = {
    name:"提款",
    func: {
        applyBonus:{
            title: " 申请兑奖",
            serviceName: "partner",
            functionName: "applyBonus",
            desc: "",
            requestContent:[
                { param: "bonusId", mandatory: "是", type: "String", content: "奖品Id" },
                { param: "amount", mandatory: "是", type: "int", content: "兑奖数量" },
                { param: "honoreeDetail", mandatory: "是", type: "String", content: "领奖人明细信息，里面的内容会根据奖品的信息变化" },
            ],
            respondSuccess:{
                status: 200,
                data: SampleData.applyBonus
            },
            respondFailure: {
                status: "4xx"

            }
        },

        cancelBonusRequest:{
            title: " 取消提款申请",
            serviceName: "partner",
            functionName: "cancelBonusRequest",
            desc: "",
            requestContent:[
                { param: "proposalId", mandatory: "是", type: "String", content: "提款提案号" },
            ],
            respondSuccess:{
                status: 200,
                data: SampleData.cancelBonusRequest
            },
            respondFailure: {
                status: "4xx",
                data: "-",
                errorMessage: "错误信息"
            }
        },

        getBonusRequestList:{
            title: " 获取兑奖列表",
            serviceName: "partner",
            functionName: "cancelBonusRequest",
            desc: "",
            requestContent:[
                { param: "startTime", mandatory: "是", type: "Date Time", content: "开始时间" },
                { param: "endTime", mandatory: "是", type: "Date Time", content: "结束时间" },
                { param: "status", mandatory: "否", type: "String", content: "提案状态(参考提案状态列表，默认：所有状态)" },
            ],
            respondSuccess:{
                status: 200,
                data: SampleData.getBonusRequestList
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },

        partnerCreditToPlayer:{
            title: " 代理转金额给下线",
            serviceName: "partner",
            functionName: "partnerCreditToPlayer",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "Date Time", content: "开始时间" },
                { param: "partnerId", mandatory: "是", type: "Date Time", content: "结束时间" },
                { param: "targetList", mandatory: "否", type: "String", content: `转账明细数组
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
                errorMessage: ""
            }
        },
    }
}

export default withdraw;