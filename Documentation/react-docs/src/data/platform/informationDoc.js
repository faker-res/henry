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
}`
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
    }
}

export default information