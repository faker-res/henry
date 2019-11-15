const sampleData = {
    getRewardList: `{
        name: String|优惠名称
        code: String|优惠代码
        description: String|优惠详情
        validStartTime: String|优惠开始时间
        validEndTime: String|优惠结束时间
        groupName: String|优惠分组名称
        showInRealServer： String|正式站是否展示（0：不展示、1：展示、预设1）
        referralPeriod: String|推荐人优惠组 - 被推荐人周期： 1 - 日; 2 - 周; 3 - 月; 4 - 年; 5 - 无周期
        condition: {
            "requiredBankCard": Boolean|（领优惠中）是否有绑定提款资料
            "isDynamicRewardTopUpAmount": Boolean|优惠金额随着存款变动
            "referralRewardMode": String|推荐人优惠模式(1 - 投注条件, 2 - 存款条件)
            "canApplyFromClient": Boolean|前端展示按钮
            "visibleForDevice": Array|前端设备可见
            "allowApplyAfterWithdrawal": Boolean|（领优惠前）检查最新存款后有审核中、已执行的提款记录仍可申请
            "interval": String|优惠周期
            "isPlayerLevelDiff": Boolean|前端设备可见
            "validEndTime": DateTime|优惠开始时间
            "validStartTime": DateTime|优惠结束时间
            "isIgnoreAudit": Number|X 元以下优惠自动执行（忽略审核部)
            "showInRealServer": Number|正式站展示
            "imageUrl": Array|前端展示图片网址/imageUrl
            "applyType": String|优惠周期不符合优惠提案生成方式
            "forbidApplyReward": Array|（领优惠前）检查周期内不允许同时领取其他优惠
        }
        param: {
            rewardParam: [
              {
                "levelId": 0,
                "value": [
                  {
                    //推荐人优惠 - 模式(投注条件)
                    "spendingTimes": Number|解锁流水（优）X倍
                    "maxRewardAmount": Number|优惠金额上限
                    "rewardPercentage": Double|推荐人返利金额（优惠比例）
                    "playerValidConsumption": Number|被推荐人有效投注额
                    
                    
                    //推荐人优惠 - 模式(存款条件) - 优惠金额随着存款变动
                    "spendingTimes": Number|解锁流水（优）X倍
                    "maxRewardAmount": Number|优惠金额上限
                    "maxRewardInSingleTopUp": Number|单笔最高优惠金额
                    "rewardPercentage": Double|推荐人赠送比例
                    "topUpCount": Number|被推荐人存款笔数
                    "firstTopUpAmount": Number|被推荐人首次单笔存款额
                    
                    
                    //推荐人优惠 - 模式(存款条件) 
                    "totalTopUpAmount": Number|被推荐人存款总额
                    "topUpCount": Number|被推荐人存款笔数
                    "rewardAmount": Number|优惠额
                    "maxRewardAmount": Number|优惠金额上限
                    "spendingTimes": Number|解锁流水（优）X倍
                  }
                ]
              }
            ]
        }
    
}`,
    getRewardTask:`{
        "status": 200,
        "data": {
            "_id": "5801d011696f0b3448da40bd",
            "playerId": "57bbb966e2d544e224d6f11c",
            "type": "FirstTopUp",  任务类型
            "rewardType": "FirstTopUp",  奖励类型
            "platformId": "5733e26ef8c8a9355caf49d8",
            "__v": 0,
            "useConsumption": true,  是否占用消费记录
            "isUnlock": false,  是否已解锁
            "initAmount": 103,  初始值
            "currentAmount": 103,  当前值，奖励额度
            "_inputCredit": 0,  转入值
            "unlockedAmount": 0,  已解锁额度
            "requiredUnlockAmount": 2060,  要求解锁额度
            "inProvider": false,  是否转入提供商
            "createTime": "2016-10-15T06:43:29.640Z",  创建时间
            "data": null,
            "targetGames": [],
            "targetProviders": [  
                目标提供商{
                    "_id": "57985b83611cd9d838274d9a",
                    "providerId": "18",
                    "name": "腾讯游戏",
                    "code": "PTOTHS",
                    "description": "中国游戏界的巨无霸，无人挑战",
                    "__v": 0,
                    "interfaceType": 2,
                    "canChangePassword": 1,
                    "settlementStatus": "DailySettlement",
                    "dailySettlementMinute": 0,
                    "dailySettlementHour": 21,
                    "runTimeStatus": 1,
                    "status": 1,
                    "prefix": ""
                }
            ],
            "status": "Started"
        }
    }`,

    getPlayerRewardList:`{
        status: 200/4xx,
        "data": {
            "stats": {
                "totalCount": 1,  //查询记录总数量，用于分页
                "startIndex": 0  //查询结果记录开始index
            },
            "records": [
                {
                    “playerId”: //玩家id
                    “playerName”: //玩家名
                    “createTime”: //生成时间
                    “rewardType”: //优惠类型
                    "rewardAmount”: //优惠金额
                    "eventName”: //优惠名
                    “eventCode”: //优惠识别码
                    “status”: //优惠领取状态
                    "promoCodeName”: //优惠代码名, 只有优惠代码优惠会显示
                }
            ]  //查询列表
        }
    }`,

    getRewardApplicationData:`{
        status: 200,  
        data: {
            code: 优惠唯一代码
            eventName: 优惠名称
            rewardType：优惠类型
            status: 优惠条件是否满足, 1: 满足, 2: 不满足, 3: 已达到领取上限
            condition: {  如果有存款要求返回此数据  
                deposit: {  
                    status: 1: 满足, 2: 不满足==》（如果有存款需求，但是状态为2，前端需引导去存款）  
                    allAmount: 如果有金额限制则显示限制的总金额，当满足条件后返回此数据  
                    times: 如果有存款次数限制则显示限制的次数，当满足条件后不再限制 则不用返回此数据  
                    details:[{  符合申请的存款列表
                        id: 存款唯一ID
                        amount: 存款金额  
                    }],
                    list: [{    （幸运注单）有存款要求的中单号  
                        id: 中单id  
                        no: 中单单号  
                        time: 下注时间  
                        betAmount: 下注金额  
                        winAmount: 彩金  
                        rewardAmount: 优惠金额  
                        spendingTimes: 提款流水倍数  
                        depositAmount: 周期内需要完成的存款金额  
                        status: 1 满足 2 不满足  
                    }]  
                },  
                bet: {  //如果有投注要求返回此数据  
                    status: 1满足,2不满足==》（如果有投注需求，但是状态为2，前端需引导去投注）
                    needBet: 需要投注金额  
                    alreadyBet: 已投注金额  
                    gameGroup：[{}] //如果有游戏组限制列出游戏组，没有不返回
                    list: [{    （幸运注单） // 有存款要求的中单号  
                        id: 中单id  
                        no: 中单单号  
                        time: 下注时间  
                        betAmount: 下注金额  
                        winAmount: 彩金  
                        rewardAmount: 优惠金额  
                        spendingTimes: 提款流水倍数  
                        status: 1 满足 2 不满足  
                    }]  
                },  
                ximaRatios: [{   如果是洗码，享受洗码比例，如不是不返回  
                    gameType: 游戏类型名称
                    ratio: 洗码比率
                    amountBet: 已投注金额
                }],  
                telephone: { 如果有电话限制返回此数据  
                    status: 1满足,2不满足==》（如果有电话，但是状态为2，前端需提示）  
                },   
                ip: {   如果有ip限制返回此数据
                    status: 1满足,2不满足==》（如果有ip限制，但是状态为2，前端需提示）  
                },    
                SMSCode: {  如果有SMSCode限制返回此数据
                    status: 1限制,2异常==》（如果有此优惠需短信验证，前端需做短信验证处理）  
                },
                device: {   如果有设备限制
                    status: 1 可领取 2 已领取  
                }  
            },  
            result: {  
                rewardAmount: 优惠金额
                winTimes: 盈利倍数（盈利翻倍组）  
                totalBetAmount: 总投注金额 （盈利翻倍组）  
                totalWinAmount: 总盈利金额 （盈利翻倍组）  
                betAmount: 如果有，投注额要求  
                betTimes: 如果有，投注额倍数  
                xima: 此优惠是否享受洗码1享受，2不享受  
                providerGroup: 如果有大厅组限制列出大厅组，没有不返回
                topUpAmountInterval：本周期现在的存款金额总数 （幸运注单）  
                quantityLimit：可以申请的次数 （幸运注单、提升存留、盈利翻倍组）  
                appliedCount：已经申请的次数 （幸运注单、提升存留、盈利翻倍组）  
                quantityLimitInInterval: 周期内放出总数量 (提升存留)  
                totalValidConsumptionAmount: 总有效投注额（推荐人优惠组 - 投注条件模式）
                totalDepositAmount: 总存款金额（推荐人优惠组 - 存款条件模式）
                depositPlayerCount: 周期内符合条件的存款人数（推荐人优惠组 - 存款条件模式）
                recommendFriendCount: 推荐人有效期内总绑定人数（推荐人优惠组）
            }  
        }
    }`,

    applyRewardEvent:`{
        status: 200
        data: {
            rewardAmount: 优惠额度
            selectedReward: {
                //随机抽奖组优惠
                rewardType: 1 - 现金; 2 - 优惠代码-B(需存款)；3-优惠代码-B（不存款）；4- 优惠代码 C; 5- 积分； 6- 实物奖励
            }
        }
    }`,

    getConsumeRebateAmount:`{
        "status": 200／4xx,  //状态
        "data": {
            "7": {  //游戏类型，对应获取游戏类型接口
                "consumptionAmount": 1000,  //消费额度
                "returnAmount": 50,  //返点额度
                "ratio": 0.05  //返点比例
        },
        "totalAmount": 50,  //总返点额度
        settleTime: {
            "startTime": "2017-12-14T04:00:00.000Z", // 开始时间
            "endTime": "2017-12-15T04:00:00.000Z" // 结束时间
        }
    }`,

    getConsumeRebateDetail:`{
       "status": 200／4xx,  //状态
       "data": {
           "totalAmount": 1.5, //总返点额度
           "totalConsumptionAmount": 150,
           "startTime": "2019-02-25T04:00:00.000Z", //周期开始时间
           "endTime": "2019-03-04T04:00:00.000Z" //周期结束时间
           "event": {
               "_id": "5a52f16878041f09a9083182",
               "name": "XIMA",
               "code": "ximacode",
               "validStartTime": "2017-12-01T04:18:51.000Z",
               "validEndTime": "2019-07-11T04:18:51.000Z",
               "platform": "5733e26ef8c8a9355caf49d8",
               "type": "5732da364382378f5e90d37d",
               "executeProposal": "57b6c9ef26ed84ff58279f41",
               "__v": 0,
               "display": [],
               "settlementPeriod": "2",
               "needSettlement": false,
               "param": {
                   "reward": [],
                   "ratio": {
                       "0": {
                           "5": 0.01,
                           "6": 0.01,
                           "7": 0.01,
                           "8": 0.01,
                           "9": 0.01
                        }
                    },
                   "consumptionTimesRequired": 2,
                   "earlyXimaMinAmount": 1,
                   "imageUrl": [
                   ""
                   ]
                },
               "showInRealServer": true,
               "canApplyFromClient": true,
               "needApply": true,
               "priority": 0
           },
           “list”: [{
               "providerList": [{
                   "providerId": "18",
                   "nickName": "腾讯游戏12"
                }], //玩家没投注返回 []
               “nonXIMAAmt”: 0 //不可惜吗额度
               "consumptionAmount": 1000,  //消费额度
               "returnAmount": 50,  //返点额度
               "ratio": 0.05  //返点比例
               “gameType”: “老虎机” //游戏类型，对应获取游戏类型接口
            }]
       }
    }`,

    getPlayerReferralList:`{
        "status": 200／4xx,  //状态
        "data":{
            "stats": {
                "totalCount": 1,  //查询记录总数量，用于分页
                "startIndex": 0  //查询结果记录开始index
            },
            "records": [{
                "name": vince,  //玩家姓名
                "playerId": v001,  //玩家id
                registrationTime: xxx  //玩家注册时间
                topUpSum: 100  //玩家充值总额
                …  //玩家详细信息其余字段
                "rewardStatus": “Valid”  //推荐奖励状态：Valid(可申请), Invalid(未达到条件), Expired(已过期), Applied(已申请)
            }, ... ]
        }
    }`,

    getConsecutiveLoginRewardDay:`{
        "status": 200,
        "data": {
            "dayIndex": 1,  //累计签到奖励天数
            "isApplied": false  //是否已领取
        }
    }`,

    getPromoCode:`{
        "status": 200,
        "data": {
            "showInfo": 1,
            "usedList": [ //已经使用的名单{
                "title": "5元",
                "validBet": 10,
                "games": [
                    "HGLIVETEST",
                    "KGKENOTEST"
                ],
                "condition": "无",
                "expireTime": "2017-10-27T16:00:00.000Z",
                "bonusCode": 5220,
                "tag": "周年庆",
                "bonusUrl": "yunvincejohnny13",
                "isViewed”: true
            }],
            "noUseList": [], //尚未使用
            "expiredList": [ //到期名单{
                "title": "1元",
                "validBet": 1,
                "games": [],
                "condition": "有新存款 (1以上) ，且尚未投注",
                "expireTime": "2017-09-26T16:00:00.000Z",
                "bonusCode": 6547,
                "isViewed”: false
            }],
            "bonusList": [] // 中奖名单列表
        }
    }`,

    getLimitedOffers:`{
        "status": 200,
        "data": {
            "time": 所有礼包时间,
            "secretList": [不显示价格列表{
                "_id": 申请ID,
                "status": 礼包状态,
                "imgUrl": 礼包图片URL,
                "countDownTime": 倒数时间(分),
                "outStockDisplayTime": 下架时间(分),
                "inStockDisplayTime": 上架时间(分),
                "min": 开始时间(分),
                "hrs": 开始时间(时),
                "bet": 流水倍数,
                "limitTime": 充值过期倒数(分),
                "limitPerson": 每人限定购数,
                "qty": 礼包总数额,
                "offerPrice": 优惠价,
                "oriPrice": 原价,
                "name": 礼包名,
                "displayOrder": 显示排行,
                "startTime": 开始时间,
                "upTime": 上架时间,
                "downTime": 下架时间,
                "providers": 游戏平台
                "timeLeft”: 倒数开始时间(秒)
            },],
            "normalList": [显示价格列表]
        }
    }`,

    applyLimitedOffers:`{
        "status": 200,
        "data": {
            "_id": "5a543f9df6f6cf61677ac492",
            "proposalId": "152201", //提案号
            "mainType": "Others",
            "status": "Approved",
            "inputDevice": 1,
            "settleTime": "2018-01-09T04:05:49.131Z",
            "expirationTime": "9999-12-31T23:59:59.000Z",
            "noSteps": true,
            "userType": "0",
            "entryType": "0",
            "priority": "0",
            "data": {
                "proposalPlayerLevel": "Diamond",
                "playerLevelName": "Diamond",
                "proposalPlayerLevelValue": 3,
                "playerStatus": 1,
                "platformId": "5732dad105710cf94b5cfaaa",
                "repeatDay": "Mon, Tue, Wed, Thu, Fri, Sat, Sun",
                "limitedOfferApplyTime": "2018-01-09T04:05:49.104Z",
                "startTime": "2018-01-09T10:40:00.104Z",
                "topUpDuration": "5分钟", //存款时效
                "limitApplyPerPerson": 1, //每人单期抢购次数
                "Quantity": 2, //每期释出数量
                "originalPrice": "3（显示）", //原价
                "remark": "event name: 秒杀1",
                "requiredLevel": "Normal", //要求玩家等级
                "eventCode": "miaosha",
                "eventName": "秒杀 Intention",
                "eventId": "5a3330926752015811bccc2c",
                "expirationTime": "2018-01-09T04:10:49.104Z",
                "limitedOfferName": "秒杀1",
                "spendingAmount": 6,
                "rewardAmount": 2,
                "applyAmount": 1,
                "limitedOfferObjId": "5a3333756752015811bccc2f",
                "platformObjId": "5732dad105710cf94b5cfaaa",
                "realName": "aaa",
                "playerName": "vpaaa",
                "playerId": "vp6997",
                "playerObjId": "5a123bd8e137794ae578b60e"
            },
            "timeLeft": 299 //剩余时间
        }
    }`,

    getLimitedOfferBonus:`{
        "status": 200,
        "data": [{
            "accountNo": "XXX",
            "bonus": 200,
            "time": "2018-01-09T01:03:39.288Z"
        }]
    }`,

    getSignInfo:`{
        "status": 200,
        "data": {
            "startTime": "2017-11-01T07:55:08.633Z", // 周期开始时间
            "endTime": "2018-05-25T07:55:08.656Z", // 周期结束时间
            "deposit": 15, // 需求存款额度
            "effectiveBet": 15, // 需求流水额度
            "list": [{ // 签到阶级记录列表
                “step”: 1 // 第几天
                "status": 1, // 0 - 玩家不符合优惠条件, 1 - 玩家不符合优惠条件，能够申请/领取, 2 - 玩家已申请/领取优惠
                "bonus": 200, // 奖金
                "requestedTimes": 20, // 流水倍数
            }]
        }
    }`,

    getTopUpPromoList:`{
        "status": 200,
        "data": [{
            "bValid": false, // 支付状态 （跟status一样，不过是以boolean显示，只限支付宝转账支付出现）
            "singleLimit": 0, // 单次充值最高允许额度 （只限支付宝转账支付出现）
            "type": 99, // 充值方式表, 1 - 9 请参照 充值方式表, 98 - 微信转账支付, 99 - 支付宝转账支付
            "status": 2, // 支付状态 （玩家目前是否能使用此支付方式）: 1 - 能, 2 - 不能
            "rewardPercentage": 3 // 奖励比率 （如果是3，充值后优惠数是充值总数的3%）
            },{
            "type": 98,
            "status": 2,
            "rewardPercentage": 3
            },{
            "type": 2,
            "status": 2,
            "rewardPercentage": 3
        }]
    }`,

    getSlotInfo:`{
       "startTime": "2017-11-22 00:00:00",//开始时间
       "endTime": "2017-12-31 23:59:59",//结束时间
       "list":[{
           "minDeposit": "100",//最低存款
           "status": "0",//0:初始状态,1:可以领取,2:已领取
           "promoRate": "30%",//赠送比例
           "promoLimit": "388",//优惠上限
           "betTimes": "22"//流水倍数
       },{
           "minDeposit": "100",
           "status": "0",
           "promoRate": "32%",
           "promoLimit": "388",
           "betTimes": "21"
       }],
       “maxApplyTimes” : 5, // 周期内最高领取优惠次数，设置后才会出现
       “appliedTimes”: 0, // 周期内已领取优惠次数，设置最高领取数后才会出现
    }`,

    getTopUpRewardDayLimit:`{
        applied: 已申请数量
        balance: 剩余数量
    }`,

    applyPromoCode:`{
        "status": 200,
        "data": {
            "_id": "59c0bb967227a82de217fa65",
            "expirationTime": "2017-09-19T16:00:00.000Z",
            "amount": 1,
            "minTopUpAmount": 1,
            "requiredConsumption": 1,
            "promoCodeTypeObjId": "59bf6fcbe258135745cd7f59",
            "platformObjId": "5733e26ef8c8a9355caf49d8",
            "smsContent": "hiha",
            "playerObjId": "59bf32fb682ba564e0c94076",
            "code": 3696,
            "status": 1,
            "__v": 0,
            "isActive": false,
            "createTime": "2017-09-19T06:39:18.264Z",
            "allowedProviders": [],
            "disableWithdraw": true
        }
    }`,

    markPromoCodeAsViewed:`{
        "status": 200,
        "data":{
            "_id": "59c0bb967227a82de217fa65",
            "expirationTime": "2017-09-19T16:00:00.000Z",
            "amount": 1,
            "minTopUpAmount": 1,
            "requiredConsumption": 1,
            "promoCodeTypeObjId": "59bf6fcbe258135745cd7f59",
            "platformObjId": "5733e26ef8c8a9355caf49d8",
            "smsContent": "hiha",
            "playerObjId": "59bf32fb682ba564e0c94076",
            "code": 3696,
            "status": ,
            "__v": 0,
            "isActive": false,
            "createTime": "2017-09-19T06:39:18.264Z",
            "allowedProviders": [],
            "disableWithdraw": true
        }
    }`,

    getOpenPromoCode:`{
        "status": 200,
        "data": {
            "showInfo": 1,
            "usedList": [], //已经使用的名单
            "noUseList": [ //尚未使用{
                "name": "testpromo1",
                "amount": 100, //优惠金額
                "minTopUpAmount": 0, //最低存款
                "requiredConsumption": 1, // 总流水/非倍数
                "expirationTime": "2019-04-18T16:00:00.000Z", //期限
                "type": "A", // A = 优惠類型-B(需存款), B = 优惠類型-B(不存款), C = 优惠类型-C
                "code": 151,
                "status": 1,
                "isSharedWithXIMA": true, // 共享洗码
                "createTime": "2019-03-30T10:27:38.169Z", //创建时间
                "games": [
                    "中国手游" // 游戏提供商
                ],
                "groupName": "group1", //大廳限制
                "applyLimitPerPlayer": 20, //个人领取数量上限
                "ipLimit": 20, //同IP领取上限
                "totalApplyLimit": 20 // 总领取提案数量上限
                ],
                "expiredList": [], //到期名单
                "bonusList": [] // 中奖名单列表
            }
        }
    }`,

    getValidFirstTopUpRecordList:`{
        "status": 200,  //200:成功 / 4xx:失败
        "data": {
            "stats": {
                "totalCount": 1,  //查询记录总数量，用于分页
                "totalAmount": 100,  //查询结果总额度
                "startIndex": 0  //查询结果记录开始index
            },
            "records": [  //查询记录列表{
                "_id": "57e493bd4616da05674073eb",
                "playerId": "Yun1068",
                "platformId": "4",
                "topUpType": "2",
                "merchantTopUpType": "1",
                "bankCardType": "1",
                "amount": 100,
                "createTime": "2016-09-23T02:30:21.196Z",
                "__v": 0,
                bDirty: false //充值记录是否已使用
            }]
        }
    }`,

    getValidTopUpReturnRecordList:`{
        "status": 200,  //200:成功 / 4xx:失败
        "data": {
            "stats": {
                "totalCount": 1,  //查询记录总数量，用于分页
                "totalAmount": 100,  //查询结果总额度
                "startIndex": 0  //查询结果记录开始index
            },
            "records": [  //查询记录列表{
                "_id": "57e493bd4616da05674073eb",
                "playerId": "Yun1068",
                "platformId": "4",
                "topUpType": "2",
                "merchantTopUpType": "1",
                "bankCardType": "1",
                "amount": 100,
                "createTime": "2016-09-23T02:30:21.196Z",
                "__v": 0,
                bDirty: false //充值记录是否已使用
            }]
        }
    }`,

    getValidTopUpRewardRecordList:`{
        "status": 200,  //200:成功 / 4xx:失败
        "data": {
            "stats": {
                "totalCount": 1,  //查询记录总数量，用于分页
                "totalAmount": 100,  //查询结果总额度
                "startIndex": 0  //查询结果记录开始index
            },
            "records": [  //查询记录列表 {
                "_id": "57e493bd4616da05674073eb",
                "playerId": "Yun1068",
                "platformId": "4",
                "topUpType": "2",
                "merchantTopUpType": "1",
                "bankCardType": "1",
                "amount": 100,
                "createTime": "2016-09-23T02:30:21.196Z",
                "__v": 0,
                bDirty: false //充值记录是否已使用
            }]
        }
    }`,
}

let reward = {
    name:"优惠",
    func: {
        getRewardList:{
            title: "获取奖励活动列表",
            serviceName: "reward",
            functionName: "getRewardList",
            desc:"获取玩家所在平台正在举行的奖励活动列表",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "clientType", mandatory: "否", type: "String", content: "1：WEB，2：H5，4：APP，5: Android APP, 6: IOS APP" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getRewardList
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        getRewardTask:{
            title: "获取玩家奖励任务",
            serviceName: "reward",
            functionName: "getRewardTask",
            desc:"获取玩家正在执行的玩家奖励任务，当前系统仅支持一个奖励任务",
            requestContent:[
                { param: "playerId", mandatory: "是", type: "String", content: "玩家ID" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getRewardTask
            },
            respondFailure: {
                status: "40x",
                data: "null"
            }
        },
        getPlayerRewardList:{
            title: "获取玩家申请奖励",
            serviceName: "reward",
            functionName: "getPlayerRewardList",
            desc:"获取玩家以申请的奖励",
            requestContent:[
                { param: "playerId", mandatory: "是", type: "String", content: "玩家ID" },
                { param: "startIndex", mandatory: "是", type: "int", content: "-" },
                { param: "requestCount", mandatory: "是", type: "int", content: "-" },
                { param: "rewardType", mandatory: "是", type: "int", content: "-" },
                { param: "startTime", mandatory: "是", type: "Date time", content: "-" },
                { param: "endTime", mandatory: "是", type: "Date time", content: "-" },
                { param: "eventCode", mandatory: "是", type: "int", content: "优惠活动代码" },
                { param: "status", mandatory: "是", type: "int", content: "-" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPlayerRewardList
            },
            respondFailure: {
                status: "40x",
                data: "null"
            }
        },

        getRewardApplicationData:{
            title: "获取申请优惠相关信息",
            serviceName: "reward",
            functionName: "getRewardApplicationData",
            desc:"获取申请优惠需要的条件信息",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "code", mandatory: "是", type: "String", content: "优惠唯一代码" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getRewardApplicationData
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息"
            }
        },

        applyRewardEvent:{
            title: "申请奖励活动",
            serviceName: "reward",
            functionName: "applyRewardEvent",
            desc:"玩家申请当前平台的奖励活动",
            requestContent:[
                { param: "code", mandatory: "是", type: "String", content: "优惠唯一代码" },
                { param: "topUpRecordId", mandatory: "否", type: "String", content: "存款唯一ID (存送金组, 提升留存组)" },
                { param: "festivalItemId", mandatory: "否", type: "String", content: "特别节日列表单一节日的objId, 可从接口getRewardApplicationData取得" },
                { param: "appliedObjIdList", mandatory: "否", type: "String Array", content: "幸运单注的投注列表的objId(数组中有一个可领 返回200 会忽略数组中不满足条件的id" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.applyRewardEvent
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息"
            }
        },
        // getRewardRanking

        requestConsumeRebate:{
            title: "申请提前洗码",
            serviceName: "reward",
            functionName: "requestConsumeRebate",
            desc:"玩家向系统提前申请未结算的洗码。结算结果将以通知的方式告诉客户端。这里将返回是否启动了结算。",
            requestContent:[
                { param: "playerId", mandatory: "是", type: "String", content: "玩家ID" },
                { param: "eventCode", mandatory: "否", type: "int", content: "该洗码的优惠代码，用在有两种洗码的情况" }
            ],
            respondSuccess:{
                status: 200
            },
            respondFailure: {
                status: "40x"
            }
        },

        getConsumeRebateAmount:{
            title: "获取消费返点额度",
            serviceName: "reward",
            functionName: "getConsumeRebateAmount",
            desc:"获取玩家消费返点额度",
            requestContent:[
                { param: "eventCode", mandatory: "是", type: "int", content: "优惠活动代码" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getConsumeRebateAmount
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        getConsumeRebateDetail:{
            title: "获取玩家洗码数据",
            serviceName: "reward",
            functionName: "getConsumeRebateDetail",
            desc:"获取玩家洗码数据",
            requestContent:[
                { param: "eventCode", mandatory: "是", type: "int", content: "优惠活动代码" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getConsumeRebateDetail
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        getLimitedOffers:{
            title: "秒杀礼包列表",
            serviceName: "reward",
            functionName: "getLimitedOffers",
            desc:"秒杀礼包列表",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "优惠活动代码" },
                { param: "status", mandatory: "是", type: "String", content: "0:初始状态, 1:可以秒杀, 2:秒杀成功, 3:付款成功, 4:已售完, 5:已弃标" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getLimitedOffers
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        applyLimitedOffers:{
            title: "申请秒杀礼包（意向）",
            serviceName: "reward",
            functionName: "applyLimitedOffers",
            desc:"申请秒杀礼包（意向）",
            requestContent:[
                { param: "limitedOfferObjId", mandatory: "是", type: "String", content: "秒杀礼包ID" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.applyLimitedOffers
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        getLimitedOfferBonus:{
            title: "获取时间内产生秒杀礼包的优惠",
            serviceName: "reward",
            functionName: "getLimitedOfferBonus",
            desc:"获取时间内产生秒杀礼包的优惠",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "int", content: "平台ID" },
                { param: "period", mandatory: "否", type: "int", content: "小时（几个小时内的产生的秒杀礼包优惠）" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getLimitedOfferBonus
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        setLimitedOfferShowInfo:{
            title: "设置秒杀礼包对玩家的显示",
            serviceName: "reward",
            functionName: "setLimitedOfferShowInfo",
            desc:"设置秒杀礼包对玩家的显示",
            requestContent:[
                { param: "showInfo", mandatory: "是", type: "int", content: "0:不显示,1:显示" }
            ],
            respondSuccess:{
                status: 200
            },
            respondFailure: {
                status: "40x",
                errorMessage: "错误信息"
            }
        },

        getSignInfo:{
            title: "设置秒杀礼包对玩家的显示",
            serviceName: "reward",
            functionName: "getSignInfo",
            desc:"设置秒杀礼包对玩家的显示",
            requestContent:[
                { param: "code", mandatory: "否", type: "String", content: "优惠系统代码，选填，不填则获取最新签到优惠" },
                { param: "platformId", mandatory: "否", type: "int", content: "优惠系统代码，选填，不填则获取最新签到优惠" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getSignInfo
            },
            respondFailure: {
                status: "40x",
                errorMessage: "错误信息"
            }
        },

        getConsecutiveLoginRewardDay:{
            title: "获取玩家累计签到信息",
            serviceName: "reward",
            functionName: "getConsecutiveLoginRewardDay",
            desc:"获取玩家累计签到信息, 需要玩家登陆才可请求该接口. 注：这是对应旧的全勤签到。若要获取『全勤签到（组）』的相关资料，请使用getSignBonus",
            requestContent:[
                { param: "code", mandatory: "是", type: "String", content: "ljqd" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getConsecutiveLoginRewardDay
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        getSignBonus:{
            title: "获取签到奖励",
            serviceName: "reward",
            functionName: "getSignBonus",
            desc:"一键领取所有可获得的签到奖励。若没有，则返回报错",
            requestContent:[
                { param: "eventCode", mandatory: "否", type: "String", content: "系统代码" }
            ],
            respondSuccess:{
                status: 200,
                data: "{}"
            },
            respondFailure: {
                status: "40x",
                data: "-null"
            }
        },

        getTopUpPromoList:{
            title: "获取充值优惠",
            serviceName: "reward",
            functionName: "getTopUpPromoList",
            desc:"获取目前正在进行中的充值优惠",
            requestContent:[
                { param: "clientType", mandatory: "是", type: "String", content: "1–浏览器, 2–手机App" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getTopUpPromoList
            },
            respondFailure: {
                status: "40x",
                data: "-null"
            }
        },

        getSlotInfo:{
            title: "获取存送金信息",
            serviceName: "reward",
            functionName: "getSlotInfo",
            desc:"获取玩家存送金优惠状态。即使没登入，只要发送平台ID仍可获取。可否获取奖励是以最新的存款来判断",
            requestContent:[
                { param: "code", mandatory: "否", type: "String", content: "优惠系统代码，选填，不填则获取最新存送金优惠" },
                { param: "platformId", mandatory: "否", type: "int", content: "选填，若要在非登入状态下获取信息则必填" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getSlotInfo
            },
            respondFailure: {
                status: "40x",
                data: "-null"
            }
        },

        getTopUpRewardDayLimit:{
            title: "获取存送申请日限剩余可领取值",
            serviceName: "reward",
            functionName: "getTopUpRewardDayLimit",
            desc:"需要先在后台设定优惠日限",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "rewardCode", mandatory: "是", type: "String", content: "优惠唯一代码" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getTopUpRewardDayLimit
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息"
            }
        },

        setBonusShowInfo:{
            title: "设置优惠代码显示",
            serviceName: "reward",
            functionName: "setBonusShowInfo",
            desc:"设置优惠代码显示",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "int", content: "平台ID" },
                { param: "showInfo", mandatory: "是", type: "int", content: "0:不显示,1:显示" }
            ],
            respondSuccess:{
                status: 200,
            },
            respondFailure: {
                status: "40x",
                errorMessage: "错误信息"
            }
        },

        getPromoCode:{
            title: "获取优惠代码",
            serviceName: "reward",
            functionName: "getPromoCode",
            desc:"获取优惠代码",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台Id" },
                { param: "status", mandatory: "是", type: "String", content: "1 未领取 AVAILABLE, 2 已领取 ACCEPTED, 3 已过期 EXPIRED" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPromoCode
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        applyPromoCode:{
            title: "获取优惠代码",
            serviceName: "reward",
            functionName: "applyPromoCode",
            desc:"获取优惠代码",
            requestContent:[
                { param: "promoCode", mandatory: "是", type: "String", content: "优惠代码" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.applyPromoCode
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        markPromoCodeAsViewed:{
            title: "标记优惠代码已读",
            serviceName: "reward",
            functionName: "markPromoCodeAsViewed",
            desc:"标记优惠代码已读",
            requestContent:[
                { param: "promoCode", mandatory: "是", type: "String", content: "优惠代码" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.markPromoCodeAsViewed
            },
            respondFailure: {
                status: "40x",
                data: "-null"
            }
        },

        getOpenPromoCode:{
            title: "标记优惠代码已读",
            serviceName: "reward",
            functionName: "getOpenPromoCode",
            desc:"标记优惠代码已读",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台Id" },
                { param: "status", mandatory: "否", type: "String", content: "1 未领取 AVAILABLE, 2 已领取 ACCEPTED, 3 已过期 EXPIRED" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getOpenPromoCode
            },
            respondFailure: {
                status: "40x",
                data: "-null"
            }
        },

        getPlayerReferralList:{
            title: "获取推荐玩家列表",
            serviceName: "reward",
            functionName: "getPlayerReferralList",
            desc:"获取推荐玩家列表",
            requestContent:[
                { param: "requestCount", mandatory: "是", type: "int", content: "10" },
                { param: "startIndex", mandatory: "是", type: "int", content: "0" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPlayerReferralList
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        getValidFirstTopUpRecordList:{
            title: "获取符合首冲条件的充值记录",
            serviceName: "payment",
            functionName: "getValidFirstTopUpRecordList",
            desc:"获取符合首冲条件的充值记录",
            requestContent:[
                { param: "period", mandatory: "是", type: "int", content: "1:首冲 2:周首冲 3:月首冲" },
                { param: "startIndex", mandatory: "否", type: "int", content: "记录开始index， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "int", content: "请求记录数量，用于分页" },
                { param: "sort", mandatory: "否", type: "Boolean", content: "按时间排序, false:降序， true：正序" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getValidFirstTopUpRecordList
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        getValidTopUpReturnRecordList:{
            title: "获取符合充值返点的充值记录",
            serviceName: "payment",
            functionName: "getValidTopUpReturnRecordList",
            desc:"获取符合充值返点的充值记录",
            requestContent:[
                { param: "startIndex", mandatory: "否", type: "int", content: "记录开始index， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "int", content: "请求记录数量，用于分页" },
                { param: "sort", mandatory: "否", type: "Boolean", content: "按时间排序, false:降序， true：正序" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getValidTopUpReturnRecordList
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },

        getValidTopUpRewardRecordList:{
            title: "获取符合充值奖励的充值记录",
            serviceName: "payment",
            functionName: "getValidTopUpReturnRecordList",
            desc:"获取符合充值奖励的充值记录",
            requestContent:[
                { param: "startIndex", mandatory: "否", type: "int", content: "记录开始index， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "int", content: "请求记录数量，用于分页" },
                { param: "sort", mandatory: "否", type: "Boolean", content: "按时间排序, false:降序， true：正序" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getValidTopUpRewardRecordList
            },
            respondFailure: {
                status: "40x",
                error: "错误对象"
            }
        },


    },
}

export default reward;