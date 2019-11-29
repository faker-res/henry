const sampleData = {

    get: `{
    "_id": "5ddf76f108d86c02c8cdb34d",
    "playerId": "8833", // 玩家ID
    "domain": "localhost", // 域名
    "password": "$2b$10$LtrT3BEww5LF1rjpuQ.j9ueA.Ms6WL.jYqnxu80Lp95ZSNNQtWDAa", // 玩家密码
    "name": "pp2doc", // 玩家姓名
    "nickName": "docnick", // 玩家昵称
    "phoneNumber": "115******5855", // 玩家电话号码
    "isNewSystem": true, // 是否为新系统注册
    "accAdmin": "admin", // 后台账号
    "csOfficer": "599ce2785a806af6d051030c", // 后台账号ID
    "bankAccountName": "测试名字", // 银行账户姓名
    "registrationDevice": "0", // 注册装置
    "hasPassword": false, // 玩家是否有改过密码
    "qnaWrongCount": { // 在客服服务中，玩家回答问题错误时的计数
      "editName": 0,
      "editBankCard": 0,
      "updatePhoneNumber": 0,
      "forgotPassword": 0
    },
    "relTsPhoneList": [],
    "ximaWithdraw": 0, // 戏码额度
    "viewInfo": {
      "showInfoState": true,
      "limitedOfferInfo": 1
    },
    "loginTimes": 3, // 登入次数
    "registrationInterface": 0,
    "valueScore": 3.1,
    "gameProviderPlayed": [], // 有玩过的游戏
    "credibilityRemarks": [ // 信用评价
      "5b9b801ede3bad0feafe3b2d"
    ],
    "applyingEasterEgg": false, // 申请彩蛋中
    "isReferralReward": false,
    "similarPlayers": [],
    "favoriteGames": [], // 最爱的游戏
    "bFirstTopUpReward": false,
    "forbidLevelMaintainReward": false, // 被禁取等级奖励
    "forbidLevelUpReward": false, // 被禁取升级奖励
    "forbidPromoCode": false, // 禁用优惠代码
    "forbidRewardEvents": [], // 被禁用的优惠
    "forbidTopUpType": [], // 被禁用的充值管道
    "creditWallet": [], // 额度
    "consumptionTimes": 0, // 消费次数
    "consumptionSum": 0, // 消费总额
    "pastMonthConsumptionSum": 0, // 上一个月的消费总额
    "weeklyConsumptionSum": 0, // 上周的消费总额
    "dailyConsumptionSum": 0, // 每日的消费总额
    "bonusAmountSum": 0, // 赢取总额度
    "pastMonthBonusAmountSum": 0, // 上一个月赢取的总额度
    "weeklyBonusAmountSum": 0, // 上周赢取的总额度
    "dailyBonusAmountSum": 0, // 每日赢取的总额度
    "withdrawSum": 0, // 提取的总额度
    "pastMonthWithdrawSum": 0, // 上个月提取的总额度
    "weeklyWithdrawSum": 0, // 上周提取的总额度
    "dailyWithdrawSum": 0, // 每日提取的总额度
    "withdrawTimes": 0, // 提取次数
    "topUpTimes": 0, // 充值次数
    "topUpSum": 0, // 充值总额
    "pastMonthTopUpSum": 0, // 上一个月的充值总额
    "weeklyTopUpSum": 0, // 上周的充值总额
    "dailyTopUpIncentiveAmount": 0, 
    "dailyTopUpSum": 0, // 每日的充值总额
    "lockedCredit": 0, // 未解锁额度
    "validCredit": 0, // 有效额度
    "creditBalance": 0, // 额度
    "permission": { // 权限
      "levelChange": true, // 等级变更
      "PlayerLimitedOfferReward": true, // 
      "PlayerPacketRainReward": true,
      "playerConsecutiveConsumptionReward": true,
      "forbidPlayerFromEnteringGame": false, // 是否禁止登入游戏
      "forbidPlayerFromLogin": false, // 是否禁止登入
      "PlayerDoubleTopUpReturn": true,
      "PlayerTopUpReturn": true,
      "forbidPlayerConsumptionIncentive": false,
      "allowPromoCode": true, // 是否禁止优惠代码申请
      "forbidPlayerConsumptionReturn": false,
      "disableWechatPay": false, // 是否禁止个人微信支付
      "rewardPointsTask": true, // 积分任务权限
      "banReward": false,
      "quickpayTransaction": true,
      "alipayTransaction": true, // 是否禁止个人支付宝支付
      "SMSFeedBack": true, // 是否禁止短信回访
      "phoneCallFeedback": true, // 是否禁止电话回访
      "topUpCard": true, // 是否禁止点卡充值
      "topupManual": true, // 是否禁止手工充值
      "topupOnline": true, // 是否禁止在线充值
      "allTopUp": true, // 所有存款权限
      "transactionReward": true,
      "applyBonus": true // 是否禁止申请提款
    },
    "userAgent": [ // 用户代理
      {
        "os": "Mac OS",
        "device": "PC",
        "browser": "Chrome"
      }
    ],
    "games": [], // 游戏
    "exp": 0, // 经验
    "forbidPromoCodeList": [], // 禁用优惠代码列表
    "forbidRewardPointsEvent": [],
    "forbidProviders": [],
    "status": 1, // 状态
    "badRecords": [],
    "trustLevel": "2",
    "blacklistIp": [],
    "loginIps": [
      "::1"
    ],
    "lastLoginIp": "::1",
    "isLogin": true,
    "lastAccessTime": "2019-11-28T09:43:53.904Z", // 开始时间
    "registrationTime": "2019-11-28T07:27:45.166Z", // 注册时间
    "realName": "测试名字", // 真实姓名
    "receiveSMS": true, // 是否接收短信
    "feedbackTimes": 0, // 回访次数
    "lastFeedbackTime": null, // 最后回访次数
    "isRealPlayer": true, // 是否为真实玩家
    "isTestPlayer": false, // 是否为测试玩家
    "icon": "",
    "smsSetting": { // 选短信设定
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
    "DOB": "1995-11-01T07:25:35.045Z", // 生日
    "gender": true, // 性别
    "email": "admi******n.com", // 电邮
    "playerLevel": { // 玩家等级
      "_id": "57ff08433f8838c63a7f8372",
      "name": "Normal",
      "value": 0,
      "platform": "a71a6b88616ad166d2b92e30",
      "reward": {
        "bonusCreditLevelDown": 0,
        "isRewardTaskLevelDown": false,
        "providerGroupLevelDown": "free",
        "requiredUnlockTimesLevelDown": 0,
        "bonusCredit": 20,
        "isRewardTask": false,
        "providerGroup": "free",
        "requiredUnlockTimes": 0,
        "requiredUnlockAmount": 0
      },
      "levelDownConfig": [ // 降级设置
        {
          "andConditions": true,
          "topupPeriod": "MONTH",
          "consumptionPeriod": "MONTH",
          "_id": "57ff08433f8838c63a7f8374",
          "consumptionMinimum": 100,
          "topupMinimum": 10
        },
        {
          "andConditions": false,
          "topupPeriod": "MONTH",
          "consumptionPeriod": "MONTH",
          "_id": "57ff08433f8838c63a7f8373",
          "consumptionMinimum": 100,
          "topupMinimum": 10
        }
      ],
      "levelUpConfig": [ // 升级设置
        {
          "andConditions": true,
          "topupPeriod": "MONTH",
          "consumptionPeriod": "MONTH",
          "_id": "57ff08433f8838c63a7f8376",
          "consumptionLimit": 20000,
          "consumptionSourceProviderId": [],
          "topupLimit": 2000
        }
      ],
      "playerValueScore": 2,
      "canApplyConsumptionReturn": true
    },
    "rewardPointsObjId": "5ddf76f308d86c02c8cdb34f",
    "bankName": "1",
    "bankAccountType": "2",
    "remark": "首次绑定提款卡2",
    "bankAccount": "******889963",
    "bankAccountDistrict": "西城区",
    "bankAccountCity": "北京市",
    "bankAccountProvince": "北京",
    "userCurrentPoint": 0,
    "platformId": "4",
    "bankAccountProvinceId": "110000",
    "bankAccountCityId": "110100",
    "bankAccountDistrictId": "110102",
    "pendingRewardAmount": 0,
    "preDailyExchangedPoint": 0,
    "preDailyAppliedPoint": 0
}`,
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
        {提案资料........}

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


}

let information = {
    name: "玩家信息/资料",
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
                data: sampleData.get,
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
                data: "",
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
                data: "",
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
                {param: "platformId", mandatory: "是", type: 'String', content: '平台ID'},
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
                {param: "smsCode", mandatory: "是", type: 'String', content: 'SMS验证码 '},
                {param: "newPhoneNumber", mandatory: "否", type: 'String', content: '手机号 - 若只验证旧号码或无验证'},
            ],
            respondSuccess: {
                status: 200,
                data: "",
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
                data:"玩家对象",
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
                {param: "platformId", mandatory: "是", type: 'String', content: '平台ID'},
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
                data:"玩家资料",
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