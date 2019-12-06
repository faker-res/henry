const sampleData = {
getWithdrawalInfo: `{
    freeTimes: 免手续费提款剩余次数
    serviceCharge: 手续费
    currentFreeAmount: 免手续费提款额
    freeAmount: 可提款金额
    ximaWithdraw: 可提款洗码金额
    lockList: [{ //现有锁大厅
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
applyBonus:`{
    "_id": "5de094a9211ed9037381dbb3",
    "proposalId": "602459", //提案号码
    "mainType": "PlayerBonus",
    "process": "5de094a9211ed9037381dbb2",
    "status": "AutoAudit",
    "device": "1",
    "inputDevice": 1,
    "processedTimes": 0, //处理时间
    "settleTime": "2019-11-29T03:46:49.573Z", //结算时间
    "expirationTime": "9999-12-31T23:59:59.000Z", //到期时间
    "noSteps": false,
    "userType": "0",
    "entryType": "0",
    "priority": "0",
    "data": {
        "realNameBeforeEdit": "testagain", //玩家真实姓名（编辑前）
        "proposalPlayerLevel": "普通会员", //玩家等级
        "playerLevelName": "普通会员", //玩家等级名字
        "proposalPlayerLevelValue": 0,
        "bonusSystemName": "PMS2", 
        "bonusSystemType": 4,
        "changeCredit": -100,
        "bankNameWhenSubmit": "1",
        "bankAccountWhenSubmit": "******543543",
        "isAutoApproval": true, //自动审核开关
        "ximaWithdrawUsed": 0, //提款洗码金额
        "oriCreditCharge": 0, //原始手续费
        "creditCharge": 0, //实际手续费
        "lastSettleTime": "2019-11-29T03:46:49.027Z",
        "curAmount": 895.2221999999999, //总馀额
        "amount": 100, //额度
        "bankTypeId": "1", //银行类型
        "platform": "4", //平台 
        "platformId": "5733e26ef8c8a9355caf49d8", //平台ID
        "loginDevice": 1,
        "playerName": "test112", //玩家名字
        "playerObjId": "5c0e3457e3c4bc102baa2cc6", //玩家Object ID
        "playerId": "7325", //玩家ID
        "creator": {
            "id": "7325",
            "name": "test112",
            "type": "player"
        }
    },
    "createTime": "2019-11-29T03:46:49.573Z", //创建时间
    "creator": {
        "id": "7325",
        "name": "test112",
        "type": "player"
    },
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
cancelBonusRequest:`{
    "proposalId": "602459" //提案号码
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
                data: sampleData.applyBonus,
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
                data: sampleData.cancelBonusRequest,
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