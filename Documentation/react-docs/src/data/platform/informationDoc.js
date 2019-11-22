const sampleData = {
    getPlatformAnnouncements: `{
    "list":[{
        "_id":"588567aa725d17143a4c9435",
        "reach":1,
        "title":"testAnnoucement", //公告标题
        "content"::"test annoucement message", //公告内容
        "date": "2017-01-31 22:10:10:00", //创建日期
    }]
}`,
    getPlatformDetails: `{
    "_id": "5733e26ef8c8a9355caf49d8",
    "platformId": "1",
    "platformName": "Yunyou",
    "csPhone": "4008009988",
    "csWeixin": "yunGamePlatform",
    "csQQ": "4359374512",
    "oaWeixin": "YunGameServices",
    "icon": "https://upload.wikimedia.org/wikipedia/commons/e/ee/1AKC_Maltese_Dog_Show_2011.jpg",
    "__v": 0,
    "lastDailySettlementTime": "2018-01-03T04:17:02.226Z",
    "lastWeeklySettlementTime": "2017-03-06T10:26:28.124Z",
    "gameProviderNickNames": {
        "5733e2d9f8c8a9355caf4a08": "企鹅游戏",
        "5733e2edf8c8a9355caf4a0a": "三石游戏",
        "5733ec84f8c8a9355caf4beb": "Froggy Studios"
    },
    "code": "4",
    "name": "Yunyou",
    "gameProviderInfo": {
        "57985b83611cd9d838274d9a": {
            "localNickName": null,
            "localPrefix": ""
        }
    },
    "weixinPhotoUrl": "test",
    "csUrl": "test123",
    "bonusSetting": {
        "0": {
            "platform": "5733e26ef8c8a9355caf49d8",
            "value": 0,
            "name": "普通会员",
            "bonusPercentageCharges": 10,
            "bonusCharges": 1
        },
        "1": {
            "platform": "5733e26ef8c8a9355caf49d8",
            "value": 1,
            "name": "高级",
            "bonusPercentageCharges": 0,
            "bonusCharges": 0
        },
        "2": {
            "platform": "5733e26ef8c8a9355caf49d8",
            "value": 2,
            "name": "VIP",
            "bonusPercentageCharges": 0,
            "bonusCharges": 0
        },
        "3": {
            "platform": "5733e26ef8c8a9355caf49d8",
            "value": 3,
            "name": "特邀贵宾",
            "bonusPercentageCharges": 0,
            "bonusCharges": 0
        },"4": {
            "platform": "5733e26ef8c8a9355caf49d8",
            "value": 4,
            "name": "SUPER",
            "bonusPercentageCharges": 0,
            "bonusCharges": 0
        }
    },
    "consumptionTimeConfig": [],
    "playerValueConfig": {
        "credibilityScoreDefault": 5,
        "winRatioScores": [{
            "score": 8,
            "name": -100
        },{
            "score": 2,
            "name": -20
        },{
            "score": -1,
            "name": 0
        },{
            "score": -2,
            "name": 20
        },{
            "score": -10,
            "name": 100
        }],
        "gameTypeCountScores": [{
            "score": 0,
            "name": 0
        },{
            "score": 1,
            "name": 1
        }],"topUpTimesScores": [{
            "score": 0,
            "name": 0
        },{
            "score": 1,
            "name": 1
        }],
        "criteriaScoreRatio": {
            "winRatio": 10,
            "playerLevel": 10,
            "credibilityRemark": 60,
            "gameTypeCount": 10,
            "topUpTimes": 10
        }
    },
    "monitorPlayerSoundChoice": "1.wav",
    "monitorMerchantSoundChoice": "1.wav",
    "monitorPlayerUseSound": false,
    "monitorMerchantUseSound": false,
    "monitorPlayerCount": 4,
    "monitorMerchantCount": 10,
    "partnerNameMinLength": 6,
    "partnerNameMaxLength": 12,
    "playerNameMinLength": 6,
    "playerNameMaxLength": 30,
    "usePhoneNumberTwoStepsVerification": false,
    "usePointSystem": true,
    "useProviderGroup": true,
    "useLockedCredit": false,
    "onlyNewCanLogin": false,
    "requireCaptchaInSMS": false,
    "requireLogInCaptcha": false,
    "playerLevelDownPeriod": 3,
    "playerLevelUpPeriod": 3,
    "manualPlayerLevelUp": true,
    "autoCheckPlayerLevelUp": true,
    "canMultiReward": false,
    "autoApproveBonusProfitOffset": 2000,
    "autoApproveProfitTimesMinAmount": 2000,
    "autoApproveProfitTimes": 10,
    "autoApproveConsumptionOffset": 50,
    "autoApproveLostThreshold": 50,
    "autoApproveRepeatDelay": 1,
    "autoApproveRepeatCount": 3,
    "autoApproveWhenSingleDayTotalBonusApplyLessThan": 20000,
    "autoApproveWhenSingleBonusApplyLessThan": 5000,
    "enableAutoApplyBonus": true,
    "whiteListingPhoneNumbers": [],
    "samePhoneNumberRegisterCount": 1,
    "allowSamePhoneNumberToRegister": true,
    "smsVerificationExpireTime": 5,
    "requireSMSVerificationForPaymentUpdate": false,
    "requireSMSVerificationForPasswordUpdate": false,
    "requireSMSVerification": false,
    "allowSameRealNameToRegister": true,
    "bonusPercentageCharges": 0,
    "minTopUpAmount": 0,
    "canAutoSettlement": false,
    "settlementStatus": "DailyError",
    "weeklySettlementMinute": 25,
    "weeklySettlementHour": 18,
    "weeklySettlementDay": 1,
    "dailySettlementMinute": 3,
    "dailySettlementHour": 14,
    "paymentChannels": [],
    "gameProviders": [{
        "_id": "57970a907f46b02427067245",
        "code": "AGLIVE",
        "description": "中国手游界的航母，主营卡牌类游戏。",
        "name": "中国手游",
        "providerId": "16",
        "__v": 0,
        "interfaceType": 2,
        "canChangePassword": 2,
        "lastDailySettlementTime": "2018-01-08T07:01:00.536Z",
        "settlementStatus": "Ready",
        "dailySettlementMinute": 1,
        "dailySettlementHour": 15,
        "runTimeStatus": 1,
        "status": 0,
        "prefix": ""
    },{
        "_id": "57985b83611cd9d838274d9a",
        "providerId": "18",
        "name": "腾讯游戏",
        "code": "PTOTHS",
        "description": "中国游戏界的巨无霸，无人挑战",
        "__v": 0,
        "interfaceType": 2,
        "canChangePassword": 1,
        "lastDailySettlementTime": "2018-01-08T07:00:00.633Z",
        "settlementStatus": "Ready",
        "dailySettlementMinute": 0,
        "dailySettlementHour": 15,
        "runTimeStatus": 1,
        "status": 1,
        "prefix": ""
    },{
        "_id": "5799d77b9803c16f52ec8e68",
        "code": "MGSLOT",
        "description": "中国游戏品牌领先者",
        "name": "中国联众",
        "providerId": "19",
        "__v": 0,
        "interfaceType": 2,
        "canChangePassword": 2,
        "lastDailySettlementTime": "2018-01-09T03:00:00.740Z",
        "settlementStatus": "Ready",
        "dailySettlementMinute": 0,
        "dailySettlementHour": 11,
        "runTimeStatus": 1,
        "status": 1,
        "prefix": ""
    },{
        "_id": "5799d6bc9803c16f52ec8e67",
        "providerId": "20",
        "name": "捕鱼王游戏",
        "code": "FISHLIVE",
        "description": "xxxxxxx",
        "__v": 0,
        "interfaceType": 2,
        "canChangePassword": 2,
        "lastDailySettlementTime": "2017-11-04T22:00:00.916Z",
        "settlementStatus": "DailyError",
        "dailySettlementMinute": 0,
        "dailySettlementHour": 6,
        "runTimeStatus": 1,
        "status": 2,
        "prefix": ""
    }],
    "department": "57b6c8b33d71e6c469f2aa1f",
    "partnerPrefix": "",
    "prefix": "yunvince"
}`,
    getConfig: `{
    withdrawFeeNoDecimal:1 // 提款手续费无条件减免小数点后金额（少扣玩家金额）0:否 / 1:是
    accountMaxLength:12 // 会员帐号最大长度  
    accountMinLength:6 // 会员帐号最低长度  
    minDepositAmount:100 // 最小充值额  
    needSMSForTrailAccount:1 // 玩家前端索取试玩帐号需短信验证( 0-否/1-是）  
    needSMSForRegister:1 // 玩家注册需短信验证(0-否/1-是）  
    needSMSForModifyPassword:1 // 修改密码需短信验证(0-否/1-是）  
    needSMSForModifyBankInfo:1 // 修改支付资料需短信验证(0-否/1-是）  
    needImageCodeForLogin:1 // 登陆时需图片验证码(0-否/1-是）  
    needImageCodeForSendSMSCode:1 // 发送短信验证码时需图片验证码(0-否/1-是）  
    twoStepsForModifyPhoneNumber:1 // 更改手机号码2步验证(0-否/1-是）
    passwordMaxLength:12 // 玩家帐号的密码最大长度
    passwordMinLength:6 // 玩家帐号的密码最短长度
    accountPrefix:abc // 玩家帐号前坠（可多位）
    cdnOrFtpLink // 后台配置的：玩家 CDN/FTP 相对路径配置
    "callBackToUserLines": [ // 请求回电的可用线路{
        "lineId": 6898, // 线路ID
        "status": 1 // 线路状态（开启：1 / 关闭：0）
        "levelLimit": "" // 等级限制（空：没登入也可以拨打，有值"0.1.2.3"：根据等级的配置）
    },],
    themeStyle:精简风格 //主题类型
    themeID:black //主题ID
    themeIDList:[ //该网站选中的主题类型中，所有主题ID的List
        0:{
            themeID:123 // 主题ID，可能该类型中有多个，从 0 开始列
            remark:蓝色版 // 该主题的备注
        }
        "wechatList": [{
            "isImg": 0,
            "content": "yunGamePlatform"
        },{
            "isImg": 1,
            "content": "test"
        }],
        "qqList": [{
            "isImg": 0,
            "content": "4359374512"
        }],
        "telList": [{
            "isImg": 0,
            "content": "4008009988"
        }],
        "live800": "test123",
        "activityList": [{
            showInRealServer:1 // 正式站是否展示（0：不展示、1：展示、预设1）
            "code": "test",
            "bannerImg":
            "getHashFile(\\"https://rbftp.kingbaly.net/ruibo/web-slider/wsb-201712-xmas.jpg\\")",
            "btnList": [{
                "btn": "activityBtn",
                "extString": "style(\\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\\") my_href=\\"\\""
            },{
                "btn": "activityBtn2",
                "extString": "style(\\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\\") my_href=\\"\\""
        }]
        },{
            "code": "test1",
            "title": [{
                "name": "BBB"
            }],
            "btnList": [{
                "btn": "activityBtn1",
                "extString": "style(\\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\\") my_href=\\"\\""
            },{
                "btn": "activityBtn3",
                "extString": "style(\\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\\") my_href=\\"\\""
            }]
        }],
        "platformLogoUrl": [{
            "isImg": 1,
            "content": "4008009988"
        }],
        "SkypeList": [{
            "isImg": 0,
            "content": "4008009988"
        }],
        "emailList": [{
            "isImg": 0,
            "content": "4008009988"
        }],
        "wechatQRUrl": [{
            "isImg": 0,
            "content": "4008009988"
        }],
        "displayUrl": [{
            "isImg": 0,
            "content": "4008009988"
        }],
        "playerSpreadUrl": [{
            "isImg": 0,
            "content": "4008009988"
        }],
        }
    ]
}`,

    getPlatformSetting: `{
    "platformId": "1",
    "platformName": "xxxx",// 平台名称
    "playerAccountPrefix": "xxxx",// 玩家帐号字首
    "partnerAccountPrefix": "xxxx"// 代理帐号字首
}`,

    getTemplateSetting: `[{
    "templateId": "5b3f27e0de418654ca5f1cbe", // 模版ID
    "functionList": [{
        "displayStatus": 1, //展示状态（0-否/1-是）
        "functionId": 10, //功能ID
        "functionName": "Test10" //功能名称
        },{
        "displayStatus": 1,
        "functionId": 11,
        "functionName": "Test11"
    }]
}]`,

    getLockedLobbyConfig: `[{
    nickName: '真人游戏', //锁大厅名称(无名称是 为 '' 例如：nickName： ‘’ )  
    id: 1, //锁大厅ID(该id为后台设置锁大厅配置时候填入的id（注意：不是游戏平台id）)
}]`,

    saveFrontEndData: `{
   "_id": "5bc59fb8aed7af825a9e0248",
   "page": 1,
   "platform": "5733e26ef8c8a9355caf49d8",
   "__v": 0,
   "data": "abc"
}`,
}
let information = {
    name:"平台设置/信息",
    func: {
        getPlatformAnnouncements:{
            title: " 获取平台公告",
            serviceName: "platform",
            functionName: "getPlatformAnnouncements",
            desc: "备注: 调用结果以json格式返回",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "int", content: "平台ID" },
                { param: "reach", mandatory: "否", type: "String", content: "返回对应类型的公告，默认返回所有, players：玩家 partner：代理，conditional：定制" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPlatformAnnouncements
            },
            respondFailure: {
                status: "4xx",
            }
        },

        getPlatformDetails:{
            title: " 获取平台信息",
            serviceName: "platform",
            functionName: "getPlatformDetails",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "int", content: "平台ID" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPlatformDetails
            },
            respondFailure: {
                status: 200,
                data: "null"
            }
        },

        getConfig:{
            title: " 获取平台设置",
            serviceName: "platform",
            functionName: "getPlatformDetails",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "int", content: "平台ID" },
                { param: "device", mandatory: "否", type: "int", content: `1: WEB
                                                                           3: H5
                                                                           没提供device, 参数的话会根据user agent来判定` },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getConfig
            },
            respondFailure: {
                status: 400,
                errorMessage: "No platform exists with id: xx",
                data: "null"
            }
        },

        getPlatformSetting:{
            title: " 获取平台设置",
            serviceName: "platform",
            functionName: "getPlatformSetting",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPlatformSetting
            },
            respondFailure: {
                status: "4xx",
            }
        },

        getTemplateSetting:{
            title: " 获取模板设置",
            serviceName: "platform",
            functionName: "getPlatformSetting",
            desc: "请对应FPMS 功能（前端功能模版配置）",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "url", mandatory: "否", type: "String", content: "当下域名（非必填），无填入则返回预设模版配置。有域名则查询是否在特殊模版中，返回特殊模版的配置。" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getTemplateSetting
            },
            respondFailure: {
                status: "4xx",
            }
        },

        getLockedLobbyConfig:{
            title: " 获取平台锁大厅配置",
            serviceName: "platform",
            functionName: "getLockedLobbyConfig",
            desc: "无配置时候，返回[] 即空数组",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID. 该接口获取的是平台的锁大厅配置，不需要登陆状态" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getLockedLobbyConfig
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        saveFrontEndData:{
            title: " 前端保存数据接口",
            serviceName: "platform",
            functionName: "saveFrontEndData",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "token", mandatory: "是", type: "String", content: "FPMS用户验证token" },
                { param: "page", mandatory: "是", type: "int", content: "请求页面" },
                { param: "data", mandatory: "是", type: "String", content: "保存的数据" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.saveFrontEndData
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        getFrontEndData:{
            title: " 前端获取数据接口",
            serviceName: "platform",
            functionName: "saveFrontEndData",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "page", mandatory: "是", type: "int", content: "请求页面" },
            ],
            respondSuccess:{
                status: 200,
                data: "abc"
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },

        getFrontEndConfig:{
            title: " 获取前端設置数据接口",
            serviceName: "platform",
            functionName: "getFrontEndConfig",
            desc: "",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "code", mandatory: "是", type: "int", content: "设置的code" },
                { param: "clientType", mandatory: "是", type: "int", content: "设备" },
            ],
            respondSuccess:{
                status: 200,
                data: "[{}]"
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: '""'
            }
        },
    }
}

export default information