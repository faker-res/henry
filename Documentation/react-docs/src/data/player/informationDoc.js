const sampleData = {

    get: `{}`,
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
    updatePlayerQQSuccess: `{
        //第一次绑定，没填qq
        {}
        
        //编辑，有填qq, 提案信息
        {
            "_id": "5de0db78b488a3058921bcab", // 提案Obj ID
            "proposalId": "409210", // 提案ID
            "type": { // 提案类型信息
              "_id": "5d156e8fcb1be97463ab051b", // 类型ID
              "platformId": "a71a6b88616ad166d2b92e30", // 平台ID
              "name": "UpdatePlayerQQ", // 类型名称
              "process": "5d156e8fcb1be97463ab0514",
              "executionType": "executeUpdatePlayerQQ",
              "rejectionType": "rejectUpdatePlayerQQ"
            },
            "mainType": "UpdatePlayer",
            "status": "Approved",
            "inputDevice": 1, // 装置
            "processedTimes": 0, // 处理的次数
            "settleTime": "2019-11-29T08:48:56.882Z", // 处理完毕的时间
            "expirationTime": "9999-12-31T23:59:59.000Z", // 过期日期
            "noSteps": true,
            "userType": "0",
            "entryType": "0",
            "priority": "0",
            "data": {
              "realNameBeforeEdit": "测试名字", // 更改前的真实姓名
              "proposalPlayerLevel": "Normal",
              "playerLevelName": "Normal",
              "proposalPlayerLevelValue": 0,
              "curData": {
                "qq": "556****8qq9"
              },
              "updateData": {
                "qq": "55667788qq0"
              },
              "playerName": "pp2doc",
              "playerObjId": "5ddf76f108d86c02c8cdb34d",
              "platformId": "a71a6b88616ad166d2b92e30",
              "playerId": "8833",
              "_id": "5ddf76f108d86c02c8cdb34d"
            },
            "createTime": "2019-11-29T08:48:56.882Z",
            "creator": {
              "id": "5ddf76f108d86c02c8cdb34d",
              "name": "pp2doc",
              "type": "player"
            },
        }
}`,
    updatePlayerQQFailure: `{ 
        //编辑，没有有填qq
        "name": "DataError",
        "message": "INVALID_DATA",
        "errorMessage": "数据无效"
        
}`,
    updatePlayerWeChatSuccess: `{
    //第一次绑定，没填wechat
    {}
    
    //编辑，有填wechat
    {
        "_id": "5de5cfcc641b2c035a1ca6ed",
        "proposalId": "409214",
        "type": { // 提案类型
          "_id": "5de5cfa285cd94377bc41c8d",
          "platformId": "a71a6b88616ad166d2b92e30",
          "name": "UpdatePlayerWeChat",
          "process": "5de5cfa285cd94377bc41c86",
          "executionType": "executeUpdatePlayerWeChat",
          "rejectionType": "rejectUpdatePlayerWeChat"
        },
        "mainType": "UpdatePlayer",
        "status": "Approved",
        "inputDevice": 1, // 设备
        "processedTimes": 0, // 处理的次数
        "settleTime": "2019-12-03T03:00:28.483Z", // 处理完毕的时间
        "expirationTime": "9999-12-31T23:59:59.000Z", // 过期日期
        "noSteps": true,
        "userType": "0",
        "entryType": "0",
        "priority": "0",
        "data": {
          "realNameBeforeEdit": "docdocreal", // 更改前的真实姓名
          "proposalPlayerLevel": "Normal",
          "playerLevelName": "Normal",
          "proposalPlayerLevelValue": 0,
          "updateData": {
            "wechat": "wechataddtest1"
          },
          "playerName": "pp2docdco",
          "playerObjId": "5ddf7a6508d86c02c8cdb35e",
          "platformId": "a71a6b88616ad166d2b92e30",
          "playerId": "8834",
          "_id": "5ddf7a6508d86c02c8cdb35e"
        },
        "createTime": "2019-12-03T03:00:28.483Z",
        "creator": {
          "id": "5ddf7a6508d86c02c8cdb35e",
          "name": "pp2docdco",
          "type": "player"
        },
    }

}`,
    updatePlayerWeChatFailure: `{
        //编辑，没有有填wechat
        "name": "DataError",
        "message": "INVALID_DATA",
        "errorMessage": "数据无效"
        
}`,
    updatePlayerEmailSuccess: `{
        //第一次绑定，没填email
        {}
        
        //编辑，有填email
        {
            "_id": "5de0e625b488a3058921bcb2",
            "proposalId": "409211", // 提案ID
            "type": { // 提案类型
              "_id": "57b6c9b1c1106be2f321fb66",
              "platformId": "5733e26ef8c8a9355caf49d8",
              "name": "UpdatePlayerEmail",
              "process": "5733e26ef8c8a9355caf49e4",
              "executionType": "executeUpdatePlayerEmail",
              "rejectionType": "rejectUpdatePlayerEmail"
            },
            "mainType": "UpdatePlayer", // 提案母类型
            "status": "Approved", // 状态
            "inputDevice": 1, // 设备
            "processedTimes": 0, // 处理次数
            "settleTime": "2019-11-29T09:34:29.243Z", // 处理完毕的时间
            "expirationTime": "9999-12-31T23:59:59.000Z", // 过期日期
            "noSteps": true,
            "userType": "0",
            "entryType": "0",
            "priority": "0",
            "data": {
              "realNameBeforeEdit": "unlockreal", // 更改前的真实姓名
              "proposalPlayerLevel": "特邀贵宾", // 玩家等级
              "playerLevelName": "特邀贵宾", // 等级名称
              "proposalPlayerLevelValue": 3,
              "curData": {
                "email": "admin****in.cm"
              },
              "updateData": {
                "email": "admin@admin.com"
              },
              "playerName": "yunvinceunlock", // 玩家姓名
              "playerObjId": "5db29decbfeab910d829a614",
              "platformId": "5733e26ef8c8a9355caf49d8", // 平台ID
              "playerId": "8828", // 玩家ID
              "_id": "5db29decbfeab910d829a614"
            },
            "createTime": "2019-11-29T09:34:29.243Z",
            "creator": {
              "id": "5db29decbfeab910d829a614",
              "name": "yunvinceunlock",
              "type": "player"
            },
        }
}`,
    updatePlayerEmailFailure: `{
        //编辑，没有有填email
        "name": "DataError",
        "message": "INVALID_DATA",
        "errorMessage": "数据无效"
        
}`,
    changeBirthdayDate: `{
    "_id": "5de5baf5641b2c035a1ca6eb",
    "proposalId": "409213",
    "type": {
      "_id": "57ff08433f8838c63a7f8399",
      "platformId": "a71a6b88616ad166d2b92e30",
      "name": "UpdatePlayerInfo",
      "process": "57ff08433f8838c63a7f8384",
      "executionType": "executeUpdatePlayerInfo",
      "rejectionType": "rejectUpdatePlayerInfo",
      "__v": 0
    },
    "mainType": "UpdatePlayer",
    "status": "Approved",
    "inputDevice": 1,
    "processedTimes": 0,
    "settleTime": "2019-12-03T01:31:33.565Z",
    "expirationTime": "9999-12-31T23:59:59.000Z",
    "noSteps": true,
    "userType": "0",
    "entryType": "0",
    "priority": "0",
    "data": {
      "realNameBeforeEdit": "docdocreal",
      "proposalPlayerLevel": "Normal",
      "playerLevelName": "Normal",
      "proposalPlayerLevelValue": 0,
      "isIgnoreAudit": true,
      "remark": "生日",
      "DOB": "1995-11-16T08:44:00.000Z",
      "playerName": "pp2docdco",
      "playerObjId": "5ddf7a6508d86c02c8cdb35e",
      "platformId": "a71a6b88616ad166d2b92e30",
      "playerId": "8834",
      "_id": "5ddf7a6508d86c02c8cdb35e"
    },
    "createTime": "2019-12-03T01:31:33.565Z",
    "creator": {
      "id": "5ddf7a6508d86c02c8cdb35e",
      "name": "pp2docdco",
      "type": "player"
    }
}`,
    updatePlayerAvatar: `{}`,

    updatePassword: `{
        "text": "密码修改成功"
}`,

}

const playerInformationDesc = `
<b>玩家对象 / Player Object：</b>
<template>
{
    "_id": "5de0e3df211ed9037381dbdd",  //玩家 Object ID
    "playerId": "7480",   //玩家ID
    "name": "gi0iaon9g",  //玩家账号
    "email": "gi0iaon9g@gmail.com",
    "gender": true,   //性别 true：男， false：女
    "DOB": "1978-05-12",    //生日日期
    "platform": "5733e26ef8c8a9355caf49d8", //玩家所注册的平台 Object ID
    "password": "$2b$10$9EnCFUNApMAWMEhmTIpqo.Vh5iTs1m4CFlLnabcZs6XLyYoSoN./u",
    "deviceId": "aWh5WmhTZUlqTzYxY3pSRlRvL2xYZElzVlJzM2hZMGlnM2Y4......==",
    "registrationDevice": "0",    //注册设备
    "loginDevice": "0",    //登入设备
    "hasPassword": false,   //是否有设密码，APP注册的账号有可能不用密码登入
    "lastLoginIp": "::1",   //上次登入的IP地址
    "isLogin": true,        //是否登入
    "lastAccessTime": "2019-11-29T09:24:49.683Z",     //上次登入时间
    "registrationTime": "2019-11-29T09:24:47.345Z",   //注册时间
    "realName": "",         //真实名字  
    "feedbackTimes": 0,     //回访次数
    "lastFeedbackTime": null,   //上次回访时间
    "isRealPlayer": true,   //是否为真钱玩家
    "isTestPlayer": false,  //是否为测试玩家
    "bankCardGroup": "57b572e45052101945a7cbc7",    //银行卡组 Object ID
    "merchantGroup": "57ad808bab1d5cb646acd76c",    //商户组 Object ID
    "loginTimes": 1,      //登入次数
    "consumptionTimes": 0,    //投注次数
    "consumptionSum": 0,      //总投注额
    "pastMonthConsumptionSum": 0,   //月投注额
    "weeklyConsumptionSum": 0,      //周投注额
    "dailyConsumptionSum": 0,       //天投注额
    "bonusAmountSum": 0,            //总输赢值
    "pastMonthBonusAmountSum": 0,   //月输赢值
    "weeklyBonusAmountSum": 0,      //周输赢值
    "dailyBonusAmountSum": 0,       //天输赢值
    "withdrawSum": 0,               //总提款额
    "pastMonthWithdrawSum": 0,      //月提款额
    "weeklyWithdrawSum": 0,         //周提款额
    "dailyWithdrawSum": 0,          //天提款额
    "withdrawTimes": 0,             //提款次数
    "topUpTimes": 0,                //充值次数
    "topUpSum": 0,                  //总充值额
    "pastMonthTopUpSum": 0,         //月充值额
    "weeklyTopUpSum": 0,            //周充值额
    "dailyTopUpSum": 0,             //天充值额
    "lockedCredit": 0,              //锁定额度
    "validCredit": 0,               //有效额度
    "receiveSMS": true,             //玩家是否可以收到SMS短信
    "bFirstTopUpReward": false,     //是否以获取首充优惠
    "forbidLevelMaintainReward": false, //禁止玩家获取保级优惠
    "forbidLevelUpReward": false,   //禁止玩家获取升级优惠
    "forbidRewardEvents": [],       //禁止玩家获取特定的优惠活动
    "forbidTopUpType": [],          //禁止玩家充值方式
    "forbidPromoCodeList": [],      //禁止玩家获取特定的优惠代码活动
    "forbidRewardPointsEvent": [],  //禁止玩家获取特定的积分活动
    "forbidProviders": [],          //禁用提供商
    "qnaWrongCount": {    //密保问题答错次数，成功后将重置为0
      "editName": 0,
      "editBankCard": 0,
      "updatePhoneNumber": 0,
      "forgotPassword": 0
    },
    "smsSetting": {     //各类短信设置
      "PlayerRetentionRewardGroupSuccess": true,
      "AuctionOpenPromoCodeSuccess": true,
      "AuctionPromoCodeSuccess": true,
      "PromoCodeSend": true,
      "PlayerLevelUpSuccess": true,
      "PlayerLevelDownMigrationSuccess": true,
      "PlayerLevelUpMigrationSuccess": true,
      "PlayerPromoCodeRewardSuccess": true,
      "PlayerRegisterIntentionSuccess": true,
      "PlayerFreeTrialRewardGroupSuccess": true,
      "PlayerConsumptionRewardGroupSuccess": true,
      "PlayerConsecutiveRewardGroupSuccess": true,
      "PlayerLoseReturnRewardGroupSuccess": true,
      "PlayerTopUpReturnGroupSuccess": true,
      "updatePassword": true,
      "UpdatePhoneInfoSuccess": true,
      "UpdateBankInfoSuccess": true,
      "PlayerLimitedOfferRewardSuccess": true,
      "WithdrawCancel": true,
      "WithdrawSuccess": true,
      "WechatTopupSuccess": true,
      "AlipayTopupSuccess": true,
      "OnlineTopupSuccess": true,
      "ManualTopupSuccess": true,
      "PlayerConsumptionReturnSuccess": true,
      "updatePaymentInfo": true,
      "consumptionReturn": true,
      "applyReward": true,
      "cancelBonus": true,
      "applyBonus": true,
      "manualTopup": true
    },
    "permission": {     //玩家权限
      "levelChange": true,
      "PlayerLimitedOfferReward": true,
      "PlayerPacketRainReward": true,
      "playerConsecutiveConsumptionReward": true,
      "forbidPlayerFromEnteringGame": false,
      "forbidPlayerFromLogin": false,
      "PlayerDoubleTopUpReturn": true,
      "PlayerTopUpReturn": true,
      "forbidPlayerConsumptionIncentive": false,
      "allowPromoCode": true,
      "forbidPlayerConsumptionReturn": false,
      "disableWechatPay": false,
      "rewardPointsTask": true,
      "banReward": false,
      "quickpayTransaction": true,
      "alipayTransaction": true,
      "SMSFeedBack": true,
      "phoneCallFeedback": true,
      "topUpCard": true,
      "topupManual": true,
      "topupOnline": true,
      "allTopUp": true,
      "transactionReward": true,
      "applyBonus": true
    },
    "playerLevel": {        //玩家等级资料
      "_id": "5733e26ef8c8a9355caf49dc",
      "name": "普通会员",
      "value": 0,
      "platform": "5733e26ef8c8a9355caf49d8",
      "reward": {
        "bonusCredit": 20,
        "isRewardTask": false,
        "providerGroup": "free",
        "requiredUnlockTimes": 0,
        "requiredUnlockAmount": 0
      },
      "consumptionLimit": 20000,
      "topupLimit": 2000,
      "levelUpConfig": [
        {
          "_id": "573abaefed6da1cf5c398fed",
          "topupPeriod": "DAY",
          "consumptionPeriod": "DAY",
          "consumptionLimit": 0,
          "consumptionSourceProviderId": [],
          "topupLimit": 0
        }
      ],
      "levelDownConfig": [
        {
          "_id": "5800988c1a8d1645a7091e49",
          "topupPeriod": "DAY",
          "consumptionPeriod": "DAY",
          "consumptionMinimum": 0,
          "topupMinimum": 0
        }
      ],
      "canApplyConsumptionReturn": true,
      "playerValueScore": 2
    },
    "rewardPointsObjId": {      //玩家积分
      "_id": "5de0e3e1211ed9037381dbdf",
      "platformObjId": "5733e26ef8c8a9355caf49d8",
      "playerObjId": "5de0e3df211ed9037381dbdd",
      "playerName": "gi0iaon9g",
      "playerLevel": "5733e26ef8c8a9355caf49dc",
      "progress": [],
      "lastUpdate": "2019-11-29T09:24:49.599Z",
      "createTime": "2019-11-29T09:24:49.599Z",
      "points": 0,
    },
    "ximaWithdraw": 0,
    "viewInfo": {
      "showInfoState": true,
      "limitedOfferInfo": 1
    },
    "registrationInterface": 1,
    "relTsPhoneList": [],
    "valueScore": 0,
    "gameProviderPlayed": [],
    "credibilityRemarks": [
      "5b7fa51c24265f24dad50cb0"
    ],
    "applyingEasterEgg": false,
    "isReferralReward": false,
    "similarPlayers": [],
    "favoriteGames": [],
    "creditWallet": [],
    "userAgent": [
      {
        "os": "Mac OS",
        "device": "",
        "browser": "Chrome"
      },
      {
        "os": "Mac OS",
        "device": "PC",
        "browser": "Chrome"
      }
    ],
    "games": [],
    "blacklistIp": [],
    "loginIps": [
      "::1"
    ],
    "exp": 0,
    "forbidPromoCode": false,
    "status": 1,
    "badRecords": [],
    "trustLevel": "2",
    "icon": "",
    "creditBalance": 0,
    "dailyTopUpIncentiveAmount": 0
}
</template>
`;

let information = {
    name: "玩家信息/资料",
    desc: playerInformationDesc,
    func: {
        get: {
            title: "获取玩家基本信息",
            serviceName: "player",
            functionName: "get",
            desc: "客户端获取玩家的基本信息，包括邮箱，地址，以及玩家等级详细信息。通过这个接口，还会返回更多的玩家信息。",
            requestContent: [
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
            ],
            respondSuccess: {
                status: 200,
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        getWithdrawalInfo: {
            title: "登入后获取提款信息",
            serviceName: "player",
            functionName: "getWithdrawalInfo",
            desc: "获取提款信息",
            requestContent: [],
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
        updatePaymentInfo: {
            title: "修改玩家的支付信息",
            serviceName: "player",
            functionName: "updatePaymentInfo",
            desc: "提供一个修改玩家的支付信息的接口",
            requestContent: [
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
                {param: "bankName", mandatory: "是", type: 'String', content: '银行名称ID'},
                {param: "bankAccount", mandatory: "是", type: 'String', content: '银行账号'},
                {param: "bankAccountType", mandatory: "否", type: 'String', content: '账号类型 -- 1:信用卡 , 2:借记卡（默认2）'},
                {param: "bankAccountProvince", mandatory: "否", type: 'String', content: '开户省 "130000" (河北省）'},
                {param: "bankAccountCity", mandatory: "否", type: 'String', content: '开户城市"130700"（张家口）'},
                {param: "bankAccountDistrict", mandatory: "否", type: 'String', content: '开户地区"130734"（其它区）'},
                {param: "bankAddress", mandatory: "否", type: 'String', content: '银行地址'},
                {param: "remark", mandatory: "否", type: 'String', content: '备注'},
                {param: "smsCode", mandatory: "否", type: 'String', content: '短信验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        updatePassword: {
            title: "修改玩家登录密码",
            serviceName: "player",
            functionName: "updatePassword",
            desc: "提供一个用于修改玩家密码的接口",
            requestContent: [
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
                {param: "oldPassword", mandatory: "是", type: 'String', content: '旧密码'},
                {param: "newPassword", mandatory: "是", type: 'String', content: '新密码'},
                {param: "smsCode", mandatory: "否", type: 'String', content: 'SMS验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.updatePassword,
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        updatePhoneNumberWithSMS: {
            title: "修改玩家电话",
            serviceName: "player",
            functionName: "updatePhoneNumberWithSMS",
            desc: "",
            requestContent: [
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
                {param: "smsCode", mandatory: "是", type: 'String', content: 'SMS验证码 '},
                {param: "newPhoneNumber", mandatory: "否", type: 'String', content: '手机号 - 若只验证旧号码或无验证'},
            ],
            respondSuccess: {
                status: 200,
                data: "true",
            },
            respondFailure: {
                status: "4xx",
                data: "-",
                errorMessage: "",
            }
        },
        updatePlayerQQ: {
            title: "编辑玩家QQ",
            serviceName: "player",
            functionName: "updatePlayerQQ",
            desc: "",
            requestContent: [
                {param: "qq", mandatory: "否", type: 'String', content: '(第一次绑定可选择不填写,第二次修改必填)'},
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.updatePlayerQQSuccess ,
            },
            respondFailure: {
                status: "420 / 405",
                data: sampleData.updatePlayerQQFailure,
                errorMessage: "验证失败, 请先登录",
            }
        },
        updatePlayerWeChat: {
            title: "编辑玩家wechat",
            serviceName: "player",
            functionName: "updatePlayerWeChat",
            desc: "",
            requestContent: [
                {param: "wechat", mandatory: "否", type: 'String', content: '(第一次绑定可选择不填写,第二次修改必填)'},
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.updatePlayerWeChatSuccess ,
            },
            respondFailure: {
                status: "420 / 405",
                data: sampleData.updatePlayerWeChatFailure,
                errorMessage: "验证失败, 请先登录",
            }
        },
        updatePlayerEmail: {
            title: "编辑玩家email",
            serviceName: "player",
            functionName: "updatePlayerEmail",
            desc: "",
            requestContent: [
                {param: "email", mandatory: "否", type: 'String', content: '(第一次绑定可选择不填写,第二次修改必填)'},
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.updatePlayerEmailSuccess ,
            },
            respondFailure: {
                status: "420 / 405",
                data: sampleData.updatePlayerEmailFailure,
                errorMessage: "验证失败, 请先登录",
            }
        },
        changeBirthdayDate: {
            title: "修改生日日期",
            serviceName: "player",
            functionName: "changeBirthdayDate",
            desc: "",
            requestContent: [
                {param: "date", mandatory: "是", type: 'Date', content: '生日日期 (需登入)'},
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.changeBirthdayDate,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        updatePasswordWithToken: {
            title: "令牌更新密码",
            serviceName: "player",
            functionName: "updatePasswordWithToken",
            desc: "",
            requestContent: [
                {param: "token", mandatory: "是", type: 'String', content: ''},
                {param: "password", mandatory: "是", type: 'String', content: '玩家要更换的密码'},
            ],
            respondSuccess: {
                status: 200,
                data:"true",
            },
            respondFailure: {
                status: "40x",
                data: "null",
                errorMessage: "",
            }
        },
        updatePasswordByPhoneNumber: {
            title: "通过电话号码重置密码",
            serviceName: "player",
            functionName: "updatePasswordByPhoneNumber",
            desc: "",
            requestContent: [
                {param: "phoneNumber", mandatory: "是", type: 'String', content: '玩家电话号码'},
                {param: "newPassword", mandatory: "是", type: 'String', content: '新密码'},
                {param: "smsCode", mandatory: "是", type: 'String', content: '短信验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "{text:'密码修改成功'}",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        updatePlayerAvatar: {
            title: "设置头像信息",
            serviceName: "player",
            functionName: "updatePlayerAvatar",
            desc: "",
            requestContent: [
                {param: "avatar", mandatory: "否", type: 'String', content: '头像'},
                {param: "avatarFrame", mandatory: "否", type: 'String', content: '头像框'},
            ],
            respondSuccess: {
                status: 200,
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
    }

};
export default information;