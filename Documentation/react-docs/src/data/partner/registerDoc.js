const sampleData = {
    register: `{
        "_id": "5de712a35246ba02e23eb6b4",
        "partnerId": "14055",
        "level": "57ff08433f8838c63a7f836f",
        "realName": "docreal",
        "password": "$2b$10$ExisaEKFpUggiD83gtbxJ.lcEv9xs.Ujcl4IaVmvEghMrvTNrmrIy",
        "lastLoginIp": "undefined", // 最后一次登入的IP
        "partnerName": "pp2docdco",
        "platform": "a71a6b88616ad166d2b92e30",
        "isNewSystem": true, // 是否是新系统注册
        "registrationDevice": "0", // 注册设备
        "commissionType": 0, // 佣金类型
        "loginTimes": 1, 
        "registrationInterface": 1, // 开户设备
        "status": 1,
        "permission": {
          "disableCommSettlement": false,
          "SMSFeedBack": true,
          "phoneCallFeedback": true,
          "forbidPartnerFromLogin": false,
          "applyBonus": true
        },
        "commissionAmountFromChildren": 0, // 下线佣金额
        "lastChildrenCommissionSettleTime": "1970-01-01T00:00:00.000Z",
        "lastCommissionSettleTime": "1970-01-01T00:00:00.000Z",
        "negativeProfitAmount": 0,
        "commissionHistory": [],
        "ownDomain": [],
        "userAgent": [ // 装置
          {
            "browser": "Chrome",
            "device": "",
            "os": "Mac OS"
          }
        ],
        "dateConsumptionReturnRewardWasLastAwarded": "1970-01-01T00:00:00.000Z",
        "datePartnerLevelMigrationWasLastProcessed": "1970-01-01T00:00:00.000Z",
        "parent": null, // 上线
        "children": [], // 下线
        "depthInTree": 0,
        "failMeetingTargetWeeks": 0,
        "validReward": 0, // 有效优惠
        "validConsumptionSum": 0,
        "totalChildrenBalance": 0,
        "totalChildrenDeposit": 0,
        "monthlyActivePlayer": 0,
        "weeklyActivePlayer": 0,
        "dailyActivePlayer": 0,
        "activePlayers": 0,
        "validPlayers": 0,
        "totalWithdrawalAmt": 0,
        "totalSettledCommission": 0, // 已结佣金（总）
        "totalPlayerDownline": 0,
        "totalReferrals": 0,
        "credits": 0,
        "isLogin": false,
        "lastAccessTime": "2019-12-04T01:57:55.235Z",
        "registrationTime": "2019-12-04T01:57:55.235Z",
        "phoneNumber": "112******4556",
        "email": "",
        "DOB": null,
        "gender": true,
        "commissionHeapCycleStart": "",
        "commissionHeapCycleEnd": "",
        "partnerLevel": 1,
        "downLineLevel": 2
    }`,
    registerToken:`eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwYXNzd29yZCI6IiQyYiQxMCRFeGlzYUVLRnBVZ2dpRDgzZ3RieEoubGNFdjl4cy5VamNsNElhVm12RWdoTXJ2VE5ybXJJeSIsImlhdCI6MTU3NTQyNDY3NSwiZXhwIjoxNTc1NDQyNjc1fQ.5Mb90dcqzcUrlpIS0wBa8KjFQu8HIAdarBAH6VGuUac
    `
}
let register = {
    name:"注册",
    func: {
        register:{
            title: "代理会员注册",
            serviceName: "partner",
            functionName: "register",
            desc:"代理会员注册接口",
            requestContent:[
                { param: "name", mandatory: "是", type: "String", content: "代理账号" },
                { param: "platformId", mandatory: "是", type: "String", content: "平台id" },
                { param: "password", mandatory: "是", type: "String", content: "注册的密码" },
                { param: "realName", mandatory: "否", type: "String", content: "代理真实姓名" },
                { param: "phoneNumber", mandatory: "是", type: "Number", content: "代理手机号" },
                { param: "captcha", mandatory: "否", type: "String", content: "使用图片验证码，不需短信验证直接开户" },
                { param: "deviceType", mandatory: "否", type: "Number", content: `装置: 
                                                                                  1-浏览器(browser)
                                                                                  2-h5
                                                                                  3-安卓APP 
                                                                                  4-IOS APP` },
                { param: "subPlatformId", mandatory: "否", type: "String", content: `子平台ID:
                                                                                    401 - 易游棋牌
                                                                                    402 - v68 
                                                                                    403 - 易游` },
                { param: "smsCode", mandatory: "否", type: "String", content: "使用短信验证码，则不用图片验证（5/29 目前尚无）" },
                { param: "email", mandatory: "否", type: "String", content: "代理邮箱" },
                { param: "gender", mandatory: "否", type: "int", content: `代理性别
                                                                           1-男
                                                                           0-女` },
                { param: "DOB", mandatory: "否", type: "Date", content: "代理生日" },
                { param: "qq", mandatory: "否", type: "String", content: "代理qq号码" },
                { param: "commissionType", mandatory: "否", type: "String", content: `(5/29 尚无) 当代理基础数据的『佣金设置』＝前端自选时 ，可请求:
                                                                                      1天输赢:1
                                                                                      7天输赢:2
                                                                                      半月输赢:3
                                                                                      1月输赢:4
                                                                                      7天投注额:5`},
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.register,
                token: sampleData.registerToken
            },
            respondFailure: {
                status: "4xx",
            }
        },

        isValidUsername:{
            title: "代理会员注册用户名有效性验证",
            serviceName: "partner",
            functionName: "isValidUsername",
            desc:"用于在注册时，检测玩家的用户名是否有效",
            requestContent:[
                { param: "name", mandatory: "是", type: "String", content: "要验证的用户名" },
                { param: "platformId", mandatory: "是", type: "String", content: "平台id" },
            ],
            respondSuccess:{
                status: 200,
                data: "true / false"
            },
            respondFailure: {
                status: "4xx",
                data: "null"
            }
        },

        createDownLinePartner:{
            title: "代理给下级代理开户",
            serviceName: "partner",
            functionName: "createDownLinePartner",
            desc:"代理给下级代理开户，该接口需要登录",
            requestContent:[
                { param: "deviceType", mandatory: "否", type: "int", content: "设备类型列表" },
                { param: "subPlatformId", mandatory: "否", type: "int", content: "子平台列表" },
                { param: "account", mandatory: "是", type: "String", content: "账号" },
                { param: "password", mandatory: "是", type: "String", content: "密码" },
                { param: "phoneNumber", mandatory: "是", type: "String", content: "电话号码" },
                { param: "commissionRate", mandatory: "是", type: "Array", content: "请参考【代理】-->【佣金】-->【查询代理佣金设置数据】（getPartnerCommissionRate）接口，需把回文加到此栏目"},
            ],
            respondSuccess:{
                status: 200,
                data: "代理信息数据"
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        captcha:{
            title: "代理会员注册验证码",
            serviceName: "partner",
            functionName: "captcha",
            desc:"代理会员注册验证码接口,从服务端获取验证码， 验证码以base64格式分发给客户端, 客户端接到之后显示出来",
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: "验证码base64字符串"
            },
            respondFailure: {
                status: "40x",
                data: "null"
            }
        },
    }
}

export default register;