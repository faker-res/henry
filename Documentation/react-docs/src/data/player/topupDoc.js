const sampleData = {
getTopUpList: `{
    stats: {
        totalCount: //提案总数,
        startIndex: //当前页面,
        requestCount: //页面总提案数,
        totalAmount: //提案总额度
    },
    records: [{  //查询记录列表
        amount: //充值额度,
        createTime: //充值时间,
        bDirty: //充值记录是否已使用
    }]
}`,
getTopupHistory: `{
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "totalAmount": 100,  //查询结果总额度
        "startIndex": 0  //查询结果记录开始index
    },
    "records": [{  //查询记录列表
        "_id": "57ff2909b1a94bd1d796e6ce",
        "proposalId": "Yun399071",  //提案id
        "type": "1",  //充值类型，1手动 2在线
        "mainType": "TopUp",  //提案类型
        "status": "Pending",  //提案状态
        "__v": 0,
        "noSteps": true,
        "userType": "2",
        "entryType": "1",
        "priority": "0",
        "data": {  //提案详细内容
            "amount": "100",  //充值额度
            "lastBankcardNo": "1234",  //银行卡号
            "bankTypeId": "DD",  //银行卡类型
            "depositMethod": "1",  //存款方法
            "provinceId": "1",  //省id
            "cityId": "1",  //城市id
            "districtId": "1",  //区域id
            "playerId": "Yun1071",  //玩家id
            "playerObjId": "57be8bf1c8a650901043bbea",
            "platformId": "5733e26ef8c8a9355caf49d8",
            "playerLevel": "57d8b3a20a74d857514bd6fa",
            "bankCardType": "DD",
            "platform": "4",  //平台id
            "playerName": "vince1",  //玩家名字
            "validTime": "",
            "creator": {
                "type": "player",
                "name": "vince1",
                "id": "Yun1071"
            }
        }
    }]
}`,
getMinMaxCommonTopupAmount: `{
    minDepositAmount: 最低充值额
    maxDepositAmount: 最高充值额
}`,

createFKPTopupProposal:`{
    "postUrl": "https://api.fukuaipay.com/gateway/bank",
    "postData": {
        "charset": "UTF-8",
        "merchantCode": "M310018",
        "orderNo": "602461",
        "amount": 50000,
        "channel": "BANK",
        "bankCode": "CASHIER",
        "remark": "test remark",
        "notifyUrl": "http://devtest.wsweb.me:3000/fkpNotify",
        "returnUrl": "",
        "extraReturnParam": "",
        "sign": "CL+ACv/7qdRR0nmVQeuTSERkIh+GY1L62TFkdwJLOwv2A8YL3pURBP5xTZ5rr8/8I/C7cQWxleKw+kIBWl12bm2oC7Utau7Yux9SdAu6tBMpMpNCg0WvtAXkIBZpEDSdOHwoiljEXzHhLyiONgZYOIgZNJqtBdVf6khaoP5z5cE=",
        "signType": "RSA"
    }
}`,

add: `{
    "playerId": "5c0e3457e3c4bc102baa2cc6", //玩家ID 
    "topupChannel": "5733f5b78e12a75e05e09e75", //充值渠道
    "platformId": "5733e26ef8c8a9355caf49d8", //平台ID
    "topUpAmount": 10, //充值金额
    "_id": "5de0cfa0211ed9037381dbc7",
    "status": "1", //(充值的状态):* 1--意向 * 2--充值中 * 3--成功 * 4--失败
    "operationList": [], //作记录， 以数组方式保存操作列表
    "createTime": "2019-11-29T07:58:24.878Z" //创建时间
}`,
update: `{
    "_id": "5de0cfa0211ed9037381dbc7", //充值意向记录ID
    "playerId": "5c0e3457e3c4bc102baa2cc6", //家ID
    "topupChannel": "5733f5b78e12a75e05e09e75", //充值渠道
    "platformId": "5733e26ef8c8a9355caf49d8", //平台ID
    "topUpAmount": 10, //充值金额
    "status": "1", //(充值的状态):* 1--意向 * 2--充值中 * 3--成功 * 4--失败
    "operationList": [], //作记录， 以数组方式保存操作列表
    "createTime": "2019-11-29T07:58:24.878Z" //创建时间
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
                { param: "topUpType", mandatory: "否", type: "Int", content: `1:手动充值 
                                                                              2:在线充值 
                                                                              3:支付宝充值 
                                                                              4:个人微信` },
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
                data: "-",
                errorMessage: "错误信息",
            }
        },
        checkExpiredManualTopup: {
            title: "手工订单超时后的再次确认请求",
            serviceName: "payment",
            functionName: "checkExpiredManualTopup",
            desc: "",
            requestContent: [
                { param: "proposalId", mandatory: "是", type: "String", content: "提案号" },
            ],
            respondSuccess: {
                status: 200,
                data: "true / false"
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "详细错误信息",
            }
        },
        getTopupHistory: {
            title: "获取玩家充值申请记录",
            serviceName: "payment",
            functionName: "getTopupHistory",
            desc: "",
            requestContent: [
                { param: "topUpType", mandatory: "否", type: "Int", content: `1:手动充值 
                                                                              2:在线充值    
                                                                              3:支付宝充值 
                                                                              4.微信充值 
                                                                              5.快捷支付` },
                { param: "startTime", mandatory: "是", type: "Date", content: "开始时间" },
                { param: "endTime", mandatory: "是", type: "Date", content: "结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始index， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量，用于分页" },
                { param: "sort", mandatory: "否", type: "Boolean", content: "按时间排序, false:降序， true：正序" },
                { param: "status", mandatory: "否", type: "String", content: "提案状态（参见提案状态列表）默认：Success" },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getTopupHistory
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "失败",
            }
        },
        isFirstTopUp: {
            title: "是否首冲",
            serviceName: "payment",
            functionName: "isFirstTopUp",
            desc: "",
            requestContent: [],
            respondSuccess: {
                status: 200,
                data: "true / false"
            },
            respondFailure: {
                status: "420",
                data: "null",
                errorMessage: "验证失败, 请先登录",
            }
        },
        createCommonTopupProposal: {
            title: "(通用充值) 创建通用充值提案",
            serviceName: "payment",
            functionName: "createCommonTopupProposal",
            desc: "玩家输入在线充值金额，系统返回跳转链接",
            requestContent: [
                { param: "amount", mandatory: "否", type: "Int", content: "充值金额" },
                { param: "bonusCode", mandatory: "否", type: "Int", content: "优惠代码" },
                { param: "limitedOfferObjId", mandatory: "否", type: "String", content: "指定充值应用于哪个秒杀礼包" },
                { param: "topUpReturnCode", mandatory: "否", type: "String", content: "指定充值应用于哪个秒存送金" },
            ],
            respondSuccess: {
                status: 200,
                data: '"http://url"    //跳转链接'
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "详细错误信息",
            }
        },
        getMinMaxCommonTopupAmount: {
            title: "(通用充值) 获取通用充值最高和最低可接收充值额度",
            serviceName: "payment",
            functionName: "getMinMaxCommonTopupAmount",
            desc: "请求玩家可使用的充值额度",
            requestContent: [],
            respondSuccess: {
                status: 200,
                data: sampleData.getMinMaxCommonTopupAmount
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "详细错误信息",
            }
        },
        createFKPTopupProposal: {
            title: "(第三方上下分接口) 快付充值",
            serviceName: "payment",
            functionName: "createFKPTopupProposal",
            desc: "",
            requestContent: [
                {param:"amount", mandatory: "是", type: "Int", content: "充值额度"},
                {param:"bankCode", mandatory: "否", type: "String", content: "收银台代码"},
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.createFKPTopupProposal
            },
            respondFailure: {
                status: "420",
                data: "null",
                errorMessage: "详细错误信息",
            }
        },
        add: {
            title: "添加注册意向记录",
            serviceName: "topupIntentionadd",
            functionName: "add",
            desc: "",
            requestContent: [
                { param: "createTime", mandatory: "否", type: "Date", content: "创建记录的时间 （使用服务端的时间为准）" },
                { param: "operationList", mandatory: "否", type: "String", content: "操作记录，使用数组保存操作记录" },
                { param: "ipAddress", mandatory: "否", type: "String", content: "用户的IP地址 （在服务端取）" },
                { param: "status", mandatory: "否", type: "Int", content:`注册过程的状态，分为 
                                                                          1–意向 
                                                                          2–验证码
                                                                          3–成功
                                                                          4–失败` },
                { param: "username", mandatory: "否", type: "String", content: "玩家注册时使用的用户名" },
                { param: "mobile", mandatory: "否", type: "String", content: "玩家注册时使用的手机号" },
                { param: "playerId", mandatory: "是", type: "String", content: "玩家注册成功之后的玩家ID" },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.add
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        update: {
            title: "修改注册意向记录",
            serviceName: "topupIntentionadd",
            functionName: "update",
            desc: "",
            requestContent: [
                { param: "_id", mandatory: "是", type: "String", content: "注册意向记录ID" },
                { param: "createTime", mandatory: "否", type: "Date", content: "创建记录的时间" },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.update
            },
            respondFailure: {
                status: "4xx",
            }
        },
        createFixedTopupProposal: {
            title: "（固定额度充值）创建充值提案",
            serviceName: "player",
            functionName: "createFixedTopupProposal",
            desc: `玩家选择固定金额后提交，通过此函数生成提案后发给PMS，PMS返回链接，系统返回跳转链接。\n需登入。`,
            requestContent: [
                { param: "topUpType", mandatory: "是", type: "Int", content: "充值方式" },
                { param: "depositMethod", mandatory: "是", type: "Int", content: "次级充值方式" },
                { param: "amount", mandatory: "是", type: "Int", content: "充值金额" },
                { param: "bonusCode", mandatory: "否", type: "Int", content: "优惠代码" },
                { param: "limitedOfferObjId", mandatory: "否", type: "String", content: "指定充值应用于哪个秒杀礼包" },
                { param: "topUpReturnCode", mandatory: "否", type: "String", content: "指定充值应用于哪个秒存送金" },
            ],
            respondSuccess: {
                status: 200,
                data: '"http://url" //跳转链接'
            },
            respondFailure: {
                status: "4xx",
                errorMessage: '"" //详细错误信息'
            }
        },



    }
}

export default topup;
