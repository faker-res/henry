const sampleData = {
    getWithdrawalInfo: `{
        freeTimes: 免手续费提款剩余次数
        serviceCharge: 手续费
        currentFreeAmount: 免手续费提款额
        freeAmount: 可提款金额
        ximaWithdraw: 可提款洗码金额
        lockList: [{ 现有锁大厅
        name: 大厅名字
        lockAmount: 锁定额度
        currentLockAmount: 锁定额度余额
        }]
}`,
    getPlayerAnyDayStatus:`{
        topUpAmount: 200, // 当日存款额度
        consumptionAmount: 1488, // 当日投注额
        bonusAmount: 0, // 当日输赢值
        rewardAmount: 50 // 当日领取优惠额度
}`,
    getBonusRequestList:`{
        stats: {
            totalCount: 提案总数
            startIndex: 当前页面
            requestCount: 页面总提案数
            totalAmount: 提案总额度
        }，
        records: [提案详情]
}`,
}

let withdraw = {
    name: "提款",
    func: {
        getWithdrawalInfo: {
            title: "登入后获取提款信息",
            serviceName: "player",
            functionName: "getWithdrawalInfo",
            desc: "获取提款信息",
            requestContent: [
                {param: "platformId", mandatory: "是", type: 'String', content: '平台ID'},

            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getWithdrawalInfo,
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        getPlayerAnyDayStatus: {
            title: "获取玩家当日数据",
            serviceName: "player",
            functionName: "getPlayerAnyDayStatus",
            desc: "获取玩家当天的存款、提款、投注与优惠领取额度。",
            requestContent: [
                {param: "providerIds", mandatory: "否", type: 'Array', content: '平台ID，不填时搜索全部'},
                {param: "startTime", mandatory: "否", type: 'Date', content: '选择日期，不填则为当日'},

            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getPlayerAnyDayStatus,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        applyBonus: {
            title: "申请提款",
            serviceName: "payment",
            functionName: "applyBonus",
            desc: "向系统申请提款",
            requestContent: [
                {param: "amount", mandatory: "是", type: 'Int', content: '提款额度'},
                {param: "bankId", mandatory: "否", type: 'Int', content: '多银行卡的选择，若不填就是默认银行卡1'},
            ],
            respondSuccess: {
                status: 200,
                data: "提款提案详情",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        getBonusRequestList: {
            title: "获取提款提案列表",
            serviceName: "payment",
            functionName: "getBonusRequestList",
            desc: "获取玩家所提交的提款申请列表。",
            requestContent: [
                {param: "startTime", mandatory: "否", type: 'Date', content: '开始时间'},
                {param: "endTime", mandatory: "否", type: 'Date', content: '结束时间'},
                {param: "status", mandatory: "否", type: 'String', content: '提案状态(参考提案状态列表，默认：所有状态)'},
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getBonusRequestList,
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        cancelBonusRequest: {
            title: "取消提款申请",
            serviceName: "payment",
            functionName: "cancelBonusRequest",
            desc: "玩家可以取消已提交的提款申请。(前提是提案状态为未处理)。",
            requestContent: [
                {param: "proposalId", mandatory: "是", type: 'String', content: '开始提款提案号'},
            ],
            respondSuccess: {
                status: 200,
                data: "{proposalId: 提款提案号}",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
    }
}

export default withdraw;