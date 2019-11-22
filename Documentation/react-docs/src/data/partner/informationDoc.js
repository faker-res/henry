const sampleData = {
get: `//代理对象，详见下面说的
{
    partnerId: “xxxxxx”, //渠道ID
    name:”test1”, //账号
    realName: “Elisa ”, //姓名
    phoneNumber:”13412345678”, //手机号
    qq:”123456”, //QQ号码
    bankAccount:””, //银行账号
    bankUserName:””, //收款人姓名
    bankName:””, //开户银行
    bankAccountType:””, //银行类型
    bankAccountCity:””, //开户城市
    bankBranch:””, //开户网点
}`,
getStatistics:`{
    queryType: “day/week/month”, //查询类型
    topup: 2000,    //下线玩家充值额
    getBonus: 180,  //下线玩家兑奖额
    bonus: 200, //所获奖励额
    playerWin: 424.5,   //下线玩家赢利额
    newPlayers: 10, //新注册下线玩家数
    activePlayers: 2,   //活跃玩家数
    subPartners: 0  //新注册下线渠道
}`,
getPlayerSimpleList:`{
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "startIndex": 0  //查询结果记录开始index
  		},
    "records": [  //查询记录列表{
        id: “u83535”    //玩家id
        name:”ut446823”, //玩家用户名
        realName:”李四”, //真实姓名
        registrationTime: "2016-12-05T11:41:15.714Z" //注册时间
        lastLoginIP: “158.56.2.45” //最后登录IP
    }]
}`,
getPartnerChildrenReport:`{
    "stats": {
        "startIndex": 0,
        "totalCount": 1
    },"children": [  //下线列表{
        "partnerId": "20",
        "partnerName": "渠道1",
        "realName": "渠道",
        "activePlayers": 0,  //本周活跃玩家数
        "totalReferrals": 0,  //下线玩家总数
        "credits": 0,  //额度
        "lastAccessTime": "2016-09-20T07:11:52.982Z",
        "registrationTime": "2016-09-20T07:11:52.982Z",
        “playerTopUpSum": 504,  //玩家总充值额度
        "playerBonusSum": 0  //玩家总兑奖额度
    }],
    "summary": {  //报表小记
        "totalPlayerTopUpSum": 0,
        "totalActivePlayers": 0
    }
}`,
getPartnerPlayerPaymentReport:`{
    "stats": {
  			"totalCount": 1,
  			"startIndex": 0
  		},
    "summary": {  //总计
  			"totalTopUpTimes": 5,  //玩家总充值次数
  			"totalBonusTimes": 0,  //玩家总兑奖次数
  			"totalTopUpAmount": 504,  //玩家总充值额度
  			"totalBonusAmount": 0,  //玩家总兑奖额度
  			"topUpTimes": 5,  //玩家搜索时间内充值次数
  			"bonusTimes": 0,  //玩家搜索时间内兑奖次数
  			"topUpAmount": 504,  //玩家搜索时间内充值额度
  			"bonusAmount": 0  //玩家搜索时间内兑奖额度,
  			“totalValidConsumptionAmount: 0”,  //玩家搜索时间内有效消费额度
  			“totalBonusConsumptionAmount: 0”,  //玩家搜索时间内奖励消费额度
  			"totalConsumptionAmount": 770,  //玩家总消费额
  			"totalConsumptionTimes": 2,  //玩家总消费次数
    },"pageSummary": {  //本页小记
  			"totalTopUpTimes": 5,
  			"totalBonusTimes": 0,
  			"totalTopUpAmount": 504,
  			"totalBonusAmount": 0,
  			"totalConsumptionAmount": 0,
  			"totalConsumptionTimes": 0,
  			"topUpTimes": 5,
  			"bonusTimes": 0,
  			"topUpAmount": 504,
  			"bonusAmount": 0，
  			“totalValidConsumptionAmount: 0”,
  			“totalBonusConsumptionAmount: 0”
    },"players": [  //玩家报表内容{
  			"playerName": "YunVincevince73",
  			"registrationTime": "2016-12-22T07:22:32.807Z",
  			"lastAccessTime": "2016-12-22T07:22:32.807Z",
  			"lastBonusTime": null,  //最近兑奖时间
  			“lastTopUpTime”: null,  //最近充值时间
  			"totalTopUpTimes": 0,
  			"totalBonusTimes": 0,
  			"totalTopUpAmount": 0,
  			"totalBonusAmount": 0,
  			"topUpTimes": 0,
  			"bonusTimes": 0,
  			"topUpAmount": 0,
  			"bonusAmount": 0，
  			“totalValidConsumptionAmount: 0”,
  			“totalBonusConsumptionAmount: 0”
    }]
}`,
getPartnerPlayerRegistrationReport:`{
    "stats": {
        "startIndex": 0,
        "totalCount": 1
    },"players": [  //下线玩家列表{
        "playerId": "20",
        "name": "渠道1",
        "realName": "渠道",
        "lastAccessTime": "2016-09-20T07:11:52.982Z",
        "registrationTime": "2016-09-20T07:11:52.982Z",
        “lastLoginIp”: xxxx,
        “topUpTimes”: 3,
        “domain”: xxxx
    }]
}`,
getPartnerPlayerRegistrationStats:`{
    "totalNewPlayers": 5,  //总开户人数
    "totalNewOnlinePlayers": 1,  //在线开户数
    "totalNewManualPlayers": 4,  //手工开户数
    "totalTopUpPlayers": 1,  //存款人数
    "totalValidPlayers": 0,  //有效开户数
    "totalSubPlayers": 2  //代理下级开户数
}`,

getCrewActiveInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式  
    activeCrewNumbers:2, //活跃人数共2人  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getCrewDepositInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式  
    depositCrewNumbers:2, //存款人数共2人  
    totalDepositAmount:500 //存款总金额  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getCrewWithdrawInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式  
    withdrawCrewNumbers:2, //提款人数共2人  
    totalwithdrawAmount:500 //提款总金额  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getCrewBetInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式
    betCrewNumbers:2, //总投注人数（算笔数>0）  
    totalvalidBet:500, //总有效投注额  
    totalCrewProfit:-6000, //下线总输6000元  
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }, {  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getNewCrewInfo:`[{
    date:2018-05-09T08:20:28.915Z, //必须是时间格式
    newCrewNumbers:2, //总新注册人数
    list:[{  
        crewAccount:sallen888, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    },{  
        crewAccount:sallen999, //下线帐号  
        depositAmount:200, //充值额度  
        depositCount:3, //充值次数  
        validBet:200, //有效投注额  
        betCounts:10, //投注笔数  
        withdrawAmount:100, //提款金额  
        crewProfit:-300, //下线投注记录输300元  
    }]
}]`,
getPartnerFeeRate:`[{
    "defaultPromoRate": "5", //这里5代表5% //预设优惠比例
    "defaultPlatformRate": "5", //预设总平台费比例
    "defaultTotalDepositRate": "5",//预设存款费用比例
    "defaultTotalWithdrawalRate": "5",//预设取款费用比例
    "list": [{
        "providerGroupId": 1,
        "providerGroupName": "group1",
        "defaultRate": "5",//锁定组平台费
        "customizedRate": "7"//锁定组客制化平台费（有才出现）
    },{
        "providerGroupId": 2,
        "providerGroupName": "group2",
        "defaultRate": "5",
        "customizedRate": "8"
    }],
    "customizedPromoRate": "6",// 客制化比例（有才出现)
    "customizedTotalDepositRate": "15",
    "customizedPlatformRate": "11",//有锁定组的话不显示，根据锁定组的比例
    "customizedTotalWithdrawalRate": "6"
}]`,
getPartnerConfig:`{
    accountMaxLength:12 // （代理帐号）最大长度  
    accountMinLength:6 // （代理帐号）最低长度  
    needSMSForRegister:1 // （代理帐号）注册需短信验证 ( 0-否/1-是）  
    needSMSForModifyPassword:1 // （代理帐号）修改密码需短信验证 ( 0-否/1-是）  
    needSMSForModifyBankInfo:1 // （代理帐号）修改支付资料需短信验证 ( 0-否/1-是）  
    needImageCodeForLogin:1 // （代理帐号）登录时需图片验证码 ( 0-否/1-是）
    needImageCodeForSendSMSCode:1 // （代理帐号）发送短信验证码时需图片验证 码 ( 0-否/1-是）
    twoStepsForModifyPhoneNumber:1 // （代理帐号）更改手机号码2步验证 ( 0-否/1- 是）
    defaultCommissionType:1// （代理帐号）新注册的佣金预设组（关闭：0，一天输赢:1,七天输赢:2,半月输赢:3,一月输赢:4,七天投注额:5，前端自选：6）
    passwordMaxLength:12 // （代理帐号）的密码最大长度
    passwordMinLength:6 // （代理帐号）的密码最短长度
    accountPrefix:p // （代理帐号）前坠（可多位）
    prefixForPartnerCreatePlayer:h //（代理帐号）开出的下线前坠（可多位）
    cdnOrFtpLink // 后台配置的：代理 CDN/FTP 相对路径配置
    themeStyle:精简风格 //主题类型
    themeID:black //主题ID
    themeIDList:[ //该网站选中的主题类型中，所有主题ID的List
    0:{
        themeID:123 // 主题ID，可能该类型中有多个，从 0 开始列
    }"partnerEmail": [{
        "isImg": 0,
        "content": "12"
    }],"partnerCSPhoneNumber": [{
        "isImg": 1,
        "content": "12"
    }],"partnerCSQQNumber": [{
        "isImg": 1,
        "content": "12"
    }],"partnerCSWechatNumber": [{
        "isImg": 0,
        "content": "12
    }],"partnerActivityList": [{
        showInRealServer:1 // 正式站是否展示（0：不展示、1：展示、预设1）
        "code": "come ON",
        "status": 1,
        "bannerImg": "http://www.freepngimg.com.png",
        "btnList": [{
            "btn": "activityBtn1",
            "btnImg": "data:image/png;base64"
        },{
            "btn": "activityBtn2"
        }]
    }],"partnerCSWechatQRUrl": [{
        "isImg": 1,
        "content": "test.com",
    },{
        "content": "sda.com",
        "isImg": 1,
    }],"partnerCSSkypeNumber": [{
        "isImg": 0,
        "content": "12"
    }],"partnerDisplayUrl": [{
        "isImg": 1,
        "content": "displayurl.com",
    },{
        "isImg": 0,
        "content": "12"
    }],"partnerPlatformLogoUrl": [{
        "isImg": 0,
        "content": "123"
    },{
        "content": "4564",
        "isImg": 0
    }],"partnerLive800Url": [{
        "isImg": 1,
        "content": "12"
    }],"partnerSpreadUrl": [{
        "isImg": 1,
        "content": "12"
    }]
}`,
getDownPartnerInfo:`{
    "stats": {  
        "totalCount": 100, //数据总数  
        "totalPage": 10, //一共多少页  
        "currentPage": 1, //当前页  
        "downstreamTotal": 10000 //下级代理总人数  
    }  
    "list": [{  
        "name": "abc", //下级代理账号  
        "commissionType": 1，//下级代理结算周期  
        "monthContribution": 1000 //下级代理本月（1号到查询当天）贡献值（即本月给上线贡献了多少钱）  
    }]
    
    // 没有下级代理时，list为空数组[]  
}`,
getDownPartnerContribution:`{
    // 当只传platformId和partnerId时，默认返回当前月的数据
    "stats": {  
        "totalCount": 100, //数据总数  
        "totalPage": 10, //一共多少页  
        "currentPage": 1, //当前页  
        "totalAmount": 1000 //查询结果总贡献值  
    }  
    "list": [{  
        “username”: "ptest", //下级代理账号  
        "contribution": 100, //贡献值  
        "commissionType": 1，//下级代理结算周期  
        "time": "2018-08-06T01:02:08.957Z", //结算时间  
        "status": "Success" //提案状态  
        "proposalId": "412665" //提案号
    }]
    
    // 没有下级代理时，list为空数组[]  
}`,
getPartnerTransferList:`{
    // 当只传platformId和partnerId时，默认返回当前月的数据
    "stats": {  
        "totalCount": 100, //数据总数  
        "totalPage": 10, //一共多少页  
        "currentPage": 1, //当前页  
        "totalTransferAmount": 1000 //查询结果总转账金额  
    }  
    "list": [{  
        amount: 1000, //该条数据总金额  
        time: "2018-08-06T01:02:08.957Z", //结算时间  
        status: "Success", //提案状态  
        proposalId: "412665" //提案号  
        transferList: [  {  
            username: 'test01', //玩家账号  
            transferAmount: 500, //转账金额  
            providerGroupId: 1, //锁大厅ID  
            withdrawConsumption: 5000 //流水（非倍数）  
        },{  
            username: 'test02', //玩家账号  
            transferAmount: 500, //玩家账号  
            providerGroupId: “”, //当 “” 代表是自由额度  
            withdrawConsumption: 0 //流水（非倍数）  
        }]  
    }]  
   
    // 当没有数据时候，为[] (即空数组)  
}`,
checkAllCrewDetail:`{
    "startIndex": 1,
    "totalCount": 4,//总人数
    "list": [{
        crewRegisterTime: //下线注册时间  
        crewLastLoginTime: //下线最后登入时间
        "crewAccount": "yunvincetestpromo2",
        "playerId":12345
        "depositAmount": 600,
        "depositCount": 5,
        "validBet": 360,
        "betCounts": 18,
        "withdrawAmount": 190,
        "crewProfit": 540
    },{
        "crewAccount": "yunvincedx5227",
        "playerId":77777
        "depositAmount": 100,
        "depositCount": 1,
        "validBet": 3260,
        "betCounts": 73,
        "withdrawAmount": 0,
        "crewProfit": 2190
    },{
        "crewAccount": "yunvincedx3231",
        "playerId":88888
        "depositAmount": 0,
        "depositCount": 0,
        "validBet": 20,
        "betCounts": 1,
        "withdrawAmount": 0,
        "crewProfit": -400
    }]
}`,
getPromoShortUrl: `{
    "shortUrl": "http://t.cn/AiQwVM4y",
    "partnerName": "testmk12"
}`,
getDownLinePlayerInfo: `{
    "stats": {
        "totalActivePlayer": 3, 活跃会员总数
        "totalCount": 3, //数据总数
        "totalPage": 1, //一共多少页
        "currentPage": 1, //当前页
        "totalNewPlayerCount": 0, // 新增会员总数  （只随period变动而变动）
        "totalValidCrewPlayer": 0, // 有效会员总数    (只随period变动而变动）
        "totalDepositAmount": 0,  // 总存款额
        "totalWithdrawAmount": 0, // 总提款数
        "totalPromoAmount": 0, // 总优惠金额
        "totalCrewProfit": 0, // 总输赢金额
        "totalPlatformFee": 0, // 总平台费
        "totalDepositWithdrawFee": 0,  // 总存取款手续费
        "totalValidBet": 0  // 总有效投注额
    },
    "list": [{
        "crewAccount": "vptest004", //玩家账号
        "crewRegisterTime": "2019-09-12T02:31:07.156Z", // 注册时间
        "crewLastLoginTime": "2019-09-12T02:31:07.156Z", // 最后登录时间
        "crewProfit": 0, // 输赢金额
        "depositAmount": 0, // 存款金额
        "withdrawAmount": 0, // 提款金额
        "validBet": 0, // 有效投注额
        "promoAmount": 0, // 优惠金额
        "platformFee": 0, // 平台手续费
        "totalDepositWithdrawFee": 0 // 存取款手续费
    }]
}`,
getDownLinePartnerInfo: `{
    "stats": {
        "totalCount": 3, //数据总数
        "totalPage": 1, //一共多少页
        "currentPage": 1, //当前页
        "totalNewPartnerCount": 0, // 新增代理总数  （只随period变动而变动）
        "totalPartnerCount": 1, // 总代理人数
        "totalDepositAmount": 0, // 总存金额
        "totalWithdrawAmount": 0, // 总提款金额
        "totalPromoAmount": 0,  // 总优惠金额
        "totalCrewProfit": 0,  // 总输赢金额
        "totalPlatformFee": 0, // 总平台费
        "totalHandlingFee": 0, // 总存取款手续费
        "totalCommission": 0 // 总贡献佣金
    },
    "list": [{
        "partnerAccount": "pptest002", //代理账号
        "partnerRegisterTime": "2019-09-12T01:54:24.534Z", // 注册时间
        "partnerLastLoginTime": "2019-09-12T01:54:24.535Z", // 最后登录时间
        "commissionType": 1,  // 佣金模式
        "partnerLevel": 3,  // 代理等级
        "crewProfit": 0,  // 输赢金额
        "depositAmount": 0,  // 存款金额
        "withdrawAmount": 0,  // 提款金额
        "validBet": 0, // 有效投注额
        "promoAmount": 0, // 优惠金额
        "platformFee": 0, // 平台手续费
        "totalDepositWithdrawFee": 0,  // 存取款手续费 
        "commission": 0 // 贡献佣金
    }]  
}`,
getPartnerPoster:`{
    qrcode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgCMnl9X1Q4eFRpkwZ', // base64 图片
    poster: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgCMnl9X1Q4eFRpkwZ' // base64 图片
}`,

getPartnerBillBoard:`{
   // 1：累积存款排行
   "allCrewDeposit": {
        "partnerRanking": { // 代理排行，有填partnerId并且有排行才会出现
        "amount": 12200,
        "rank": 1,
        "name": "te***artne1"
   },
   "boardRanking": [ // 排行榜{
        "amount": 12200,
        "rank": 1,
        "name": "te***artne1"
   },{
        "amount": 3849,
        "rank": 2,
        "name": "te***artne2"
   }]
   
   // 2: 累积投注额排行
   "allCrewValidBet": {
        "partnerRanking": {
            "amount": 6900,
            "rank": 5,
            "name": "te***artne1"
        },"boardRanking": [{
            "amount": 377800,
            "rank": 1,
            "name": "vi***p4"
        },{
            "amount": 210927,
            "rank": 2,
            "name": "pt***vin1"
        }]
   }
   
   // 3:累积输赢排行
   "allCrewProfit": {
        "partnerRanking": {
            "amount": -4602,// 负数代表玩家输钱
            "rank": 1,
            "name": "te***artne1"
        },"boardRanking": [{
            "amount": -4602,
            "rank": 1,
            "name": "te***artne1"
        },{
            "amount": -1450,
            "rank": 2,
            "name": "te***artne2"
            }]
   }
   
   //4: 累积下线人数排行
   "allCrewHeadCount": {
        "partnerRanking": {
            "count": 4,
            "rank": 3,
            "name": "te***artne1"
        },"boardRanking": [{
            "count": 5,
            "rank": 1,
            "name": "te***artne2"
        },{
            "count": 4,
            "rank": 2,
            "name": "pt***vin1"
        }]
   }
   
   // 5: 活跃下线人数排行  注意不能查询无周期
   "activeCrewHeadCount": {
        "partnerRanking": {
            "count": 3,
            "rank": 1,
            "name": "te***artne1"
        },"boardRanking": [{
            "count": 3,
            "rank": 1,
            "name": "te***artne1"
        },{
            "count": 1,
            "rank": 2,
            "name": "te***artne2"
        }]
   }
   
   // 6: 累积佣金排行 
   "totalcommission ": {
        "partnerRanking": {
            "amount": -490.3,
            "rank": 2,
            "name": "te***artne1"
        },
        "boardRanking": [{
            "amount": 90.3,
            "rank": 1,
            "name": "te***artne2"
        },{
            "amount": -490.3,
            "rank": 2,
            "name": "te***artne1"
        }]
   }
}`
}

let information = {
    name: "代理信息/资料",
    func: {
        get: {
            title: "获取代理会员用户信息",
            serviceName: "partner",
            functionName: "get",
            desc: "客户端获取推广的基本信息，包括手机，地址，以及银行资料详细信息。通过这个接口，还会返回更多的玩家信息。\n 代理登入login后能直接调用",
            requestContent: [],
            respondSuccess: {
                status: 200,
                data:sampleData.get,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        getStatistics: {
            title: "获取代理统计信息注册create",
            serviceName: "partner",
            functionName: "getStatistics",
            desc: "按周期查询代理统计信息。",
            requestContent: [
                { param: "queryType", mandatory: "是", type: "String", content: "查询类型，分为 day(日)/week(周)/month(月)" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getStatistics,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPlayerSimpleList: {
            title: "获取代理下线玩家列表",
            serviceName: "partner",
            functionName: "getPlayerSimpleList",
            desc: "获取该代理的下线玩家列表",
            requestContent: [
                { param: "partnerId", mandatory: "是", type: "String", content: "代理Id" },
                { param: "queryType", mandatory: "否", type: "String", content: "分两种类型: registrationTime注册时间查询 | lastAccessTime最后登录时间查询" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
                { param: "sort", mandatory: "否", type: "Boolean", content: "排序方向 true–正序, false–降序" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPlayerSimpleList,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPlayerDetailList: {
            title: "获取代理下线玩家详情列表",
            serviceName: "partner",
            functionName: "getPlayerDetailList",
            desc: "请参考上一个接口 【获取代理下线玩家列表】（getPlayerSimpleList），同理。"
        },
        getPartnerChildrenReport: {
            title: "获取代理下线报表",
            serviceName: "partner",
            functionName: "getPartnerChildrenReport",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerChildrenReport,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPartnerPlayerPaymentReport: {
            title: "代理其下玩家充值兑奖情况记录",
            serviceName: "partner",
            functionName: "getPartnerPlayerPaymentReport",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerPlayerPaymentReport,
            },
            respondFailure: {
                status: "4xx",
            }
        },
        getPartnerPlayerRegistrationReport: {
            title: "查询代理下线玩家开户来源报表",
            serviceName: "partner",
            functionName: "getPartnerPlayerRegistrationReport",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间" },
                { param: "domain", mandatory: "否", type: "String", content: "域名" },
                { param: "playerName", mandatory: "否", type: "String", content: "玩家名字" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "记录开始索引， 用于分页" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求记录数量, 用于分页" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerPlayerRegistrationReport,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPartnerPlayerRegistrationStats: {
            title: "查询代理下线玩家开户统计",
            serviceName: "partner",
            functionName: "getPartnerPlayerRegistrationStats",
            desc: "",
            requestContent: [
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerPlayerRegistrationStats,
            },
            respondFailure: {
                status: "4xx",
            }
        },
        updatePhoneNumberWithSMS: {
            title: "通过短信验证码修改代理手机号",
            serviceName: "partner",
            functionName: "updatePhoneNumberWithSMS",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "partnerId", mandatory: "是", type: "String", content: "代理ID" },
                { param: "phoneNumber", mandatory: "是", type: "String", content: "新手机号" },
                { param: "smsCode", mandatory: "是", type: "String", content: "短信验证码" },
                { param: "captcha", mandatory: "否", type: "String", content: "图片验证码" }
            ],
            respondSuccess:{
                status: 200,
                data: `{}`
            },
            respondFailure: {
                status: "4xx",
                errorMessage: ""

            }
        },
        getCrewActiveInfo: {
            title: "获取下线玩家活跃信息",
            serviceName: "partner",
            functionName: "getCrewActiveInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewActiveInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getCrewDepositInfo: {
            title: "获取下线玩家存款信息",
            serviceName: "partner",
            functionName: "getCrewDepositInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewDepositInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getCrewWithdrawInfo: {
            title: "获取下线玩家提款信息",
            serviceName: "partner",
            functionName: "getCrewWithdrawInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewWithdrawInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getCrewBetInfo: {
            title: "获取下线玩家提款信息",
            serviceName: "partner",
            functionName: "getCrewBetInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。" },
                { param: "providerGroupId", mandatory: "否", type: "String", content: "锁大厅组ID" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getCrewBetInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getNewCrewInfo: {
            title: "获取新注册下线玩家信息",
            serviceName: "partner",
            functionName: "getNewCrewInfo",
            desc: "注：代理必须登入",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "period", mandatory: "是", type: "Int", content: "周期// 日 - 1，周 - 2，半月 - 3， 月 - 4" },
                { param: "circleTimes", mandatory: "是", type: "Int", content: "需要7个周期的数据，含目前周期" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询起始时间 （ISO格式：只要日期T）" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间 （ISO格式：只要日期T）如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）" },
                { param: "needsDetail", mandatory: "否", type: "Boolean", content: "(查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。" },
                { param: "detailCircle", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询单一玩家不适用）开始的分页，默认 0" },
                { param: "count", mandatory: "否", type: "Int", content: "(查询单一玩家不适用）每页需要数据条数，默认10" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getNewCrewInfo,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPartnerFeeRate: {
            title: "获取代理费用比例详情",
            serviceName: "partner",
            functionName: "getPartnerFeeRate",
            desc: "",
            requestContent: [
                { param: "partnerId", mandatory: "否", type: "String", content: "不填只显示平台设置的代理佣金比例" },
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerFeeRate,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getPartnerConfig: {
            title: "获取平台-代理页面的设置",
            serviceName: "partner",
            functionName: "getPartnerConfig",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "device", mandatory: "否", type: "Int", content: "" },

            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerConfig,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getDownPartnerInfo: {
            title: "获取下级代理信息",
            serviceName: "partner",
            functionName: "getDownPartnerInfo",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "partnerId", mandatory: "是", type: "String", content: "代理ID" },
                { param: "requestPage", mandatory: "否", type: "String", content: "请求第几页" },
                { param: "count", mandatory: "否", type: "String", content: "每页数据条数（默认为10条）" },

            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getDownPartnerInfo,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getDownPartnerContribution: {
            title: "获取下级代理贡献值详情",
            serviceName: "partner",
            functionName: "getDownPartnerContribution",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "partnerId", mandatory: "是", type: "String", content: "代理ID" },
                { param: "requestPage", mandatory: "否", type: "String", content: "请求第几页" },
                { param: "count", mandatory: "否", type: "String", content: "每页数据条数（默认为10条）" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "开始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "结束时间" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getDownPartnerContribution,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getPartnerTransferList: {
            title: "获取代理转账记录",
            serviceName: "partner",
            functionName: "getPartnerTransferList",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "partnerId", mandatory: "是", type: "String", content: "代理ID" },
                { param: "requestPage", mandatory: "否", type: "String", content: "请求第几页" },
                { param: "count", mandatory: "否", type: "String", content: "每页数据条数（默认为10条）" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "开始时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "结束时间" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerTransferList,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        checkAllCrewDetail: {
            title: "查询所有下线玩家详情",
            serviceName: "partner",
            functionName: "checkAllCrewDetail",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID 只显示此下线" },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家账号" },
                { param: "singleSearchMode", mandatory: "否", type: "String", content: "(单一玩家搜寻模式/给crewAccount用 ）| '0'：精准搜索（默认值/代表只搜索此准确帐号）| '1'：模糊搜索（如搜p1，会出现p12,p13开头帐号）" },
                { param: "sortMode", mandatory: "是", type: "String", content: "”1“:充值 | ”2“:提款 | “3”:输赢（负）最多 | “4”:有效投注额" },
                { param: "startTime", mandatory: "否", type: "Date Time", content: "查询开始时间，没填入默认代理注册时间" },
                { param: "endTime", mandatory: "否", type: "Date Time", content: "查询结束时间，没填入默认现在时间。" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "数据请求从第 0 条开始（代表有分页）" },
                { param: "count", mandatory: "否", type: "Int", content: "默认100条（代表有分页）" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.checkAllCrewDetail,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getPromoShortUrl: {
            title: "代理推广域名防红和短链转换",
            serviceName: "partner",
            functionName: "getPromoShortUrl",
            desc: "",
            requestContent: [
                { param: "url", mandatory: "是", type: "String", content: "代理网址" },
                { param: "partnerId", mandatory: "是", type: "String", content: "代理Id" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPromoShortUrl,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getDownLinePlayerInfo: {
            title: "查询代理的下级会员信息",
            serviceName: "partner",
            functionName: "getDownLinePlayerInfo",
            desc: "该接口需要登录",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID " },
                { param: "period", mandatory: "是", type: "Int", content: "1:本日 | 2:本周 | 3:本月" },
                { param: "whosePlayer", mandatory: "是", type: "Int", content: "1:全部 | 2: 直属下线会员 | 3:下线代理会员 " },
                { param: "playerType", mandatory: "是", type: "Int", content: "1:全部 | 2: 新增会员 | 3:活跃会员 " },
                { param: "crewAccount", mandatory: "否", type: "String", content: "玩家账号 （用于单一搜索） " },
                { param: "requestPage", mandatory: "否", type: "Int", content: "请求第几页（从1开始） " },
                { param: "count", mandatory: "否", type: "Int", content: "每页数据条数（默认为10条）" },
                { param: "sortType", mandatory: "否", type: "Int", content: "1:充值 | 2:提款 | 3:输赢值 | 4:有效投注额 | 5:优惠金额 | 6: 平台费 | 7: 存取款手续费 " },
                { param: "sort", mandatory: "否", type: "Boolean", content: "true 升序 | false 降序（默认)" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getDownLinePlayerInfo,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getDownLinePartnerInfo: {
            title: "查询代理的下级代理信息",
            serviceName: "partner",
            functionName: "getDownLinePartnerInfo",
            desc: "该接口需要登录",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID " },
                { param: "period", mandatory: "是", type: "Int", content: "1:本日 | 2:本周 | 3:本月" },
                { param: "partnerType", mandatory: "是", type: "Int", content: "1:全部 | 2: 新增会员 | 3:活跃会员 " },
                { param: "partnerAccount", mandatory: "否", type: "String", content: "代理账号 （用于单一搜索） " },
                { param: "requestPage", mandatory: "否", type: "Int", content: "请求第几页（从1开始） " },
                { param: "count", mandatory: "否", type: "Int", content: "每页数据条数（默认为10条）" },
                { param: "sortType", mandatory: "否", type: "Int", content: "1:充值 | 2:提款 | 3:输赢值 | 4:有效投注额 | 5:优惠金额 | 6: 平台费 | 7: 存取款手续费 " },
                { param: "sort", mandatory: "否", type: "Boolean", content: "true 升序 | false 降序（默认)" },
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getDownLinePartnerInfo,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        getPartnerPoster: {
            title: "代理获取推广二维码和推广海报",
            serviceName: "partner",
            functionName: "getPartnerPoster",
            desc: "该接口需要登录",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID " },
                { param: "url", mandatory: "是", type: "String", content: "需要生成二维码的地址" },
                { param: "device", mandatory: "否", type: "Int", content: "0: WEB | 1: H5 | 不填: 都找 （优先获取排列顺序高且可用的海报）" },
                { param: "production", mandatory: "否", type: "Boolean", content: "true: 只获取正式站可用（默认) |false: 可获取非正式站可用海报" },

            ],
            respondSuccess: {
                status: 200,
                data:sampleData.getPartnerPoster,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage:`""`
            }
        },
        updatePassword: {
            title: "修改代理会员密码",
            serviceName: "partner",
            functionName: "updatePassword",
            desc: "",
            requestContent: [
                { param: "partnerId", mandatory: "是", type: "String", content: "平台ID " },
                { param: "oldPassword", mandatory: "是", type: "String", content: "旧密码" },
                { param: "newPassword", mandatory: "是", type: "String", content: "新密码" },

            ],
            respondSuccess: {
                status: 200,
            },
            respondFailure: {
                status: "40x",
                errorMessage: "错误信息",
            }
        },
        fillBankInformation: {
            title: "设置代理银行资料",
            serviceName: "partner",
            functionName: "fillBankInformation",
            desc: "银行账号名称第一次绑定时会同步玩家的真实姓名。",
            requestContent: [
                { param: "partnerId", mandatory: "是", type: "String", content: "代理ID " },
                { param: "bankAccount", mandatory: "是", type: "String", content: "银行账户" },
                { param: "bankAccountName", mandatory: "是", type: "String", content: "账号姓名" },
                { param: "bankAccountCity", mandatory: "是", type: "String", content: "开户城市" },
                { param: "bankAccountProvince", mandatory: "是", type: "String", content: "开户省份" },
                { param: "bankName", mandatory: "是", type: "String", content: "银行名称, 请用代号：1,2,3,4" },
                { param: "bankAddress", mandatory: "否", type: "String", content: "账户支行" },
                { param: "bankAccountType", mandatory: "否", type: "String", content: "账号类型，信用卡： 1 | 借记卡：2 （不需要了）" },
                { param: "smsCode", mandatory: "否", type: "String", content: "短信验证码 （代理帐号）修改支付资料需短信验证 -没勾选可不填" },
            ],
            respondSuccess: {
                status: 200,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息",
            }
        },
        bindPartnerPlayer: {
            title: "绑定代理玩家",
            serviceName: "partner",
            functionName: "bindPartnerPlayer",
            desc: "",
            requestContent: [
                { param: "playerName", mandatory: "是", type: "String", content: "玩家姓名 " },
            ],
            respondSuccess: {
                status: 200,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx",
            }
        },
        getPartnerBillBoard: {
            title: "代理充值投注排行榜",
            serviceName: "partner",
            functionName: "getPartnerBillBoard",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID " },
                { param: "mode", mandatory: "是", type: "String", content: "1:累积存款排行 | 2:累积投注额排行 | 3:累积输赢排行 | 4: 累积下线人数排行 排行 | 5: 活跃下线人数排行 | 6: 累积佣金排行 " },
                { param: "periodCheck", mandatory: "是", type: "String", content: "1: 本日 | 2: 本周 | 3: 半月 | 4: 本月 | 5: 无周期 " },
                { param: "recordCount", mandatory: "否", type: "Int", content: "数字，预设10。排行榜数据数量 " },
                { param: "partnerId", mandatory: "否", type: "String", content: "代理ID。查询此代理排行 " },
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getPartnerBillBoard
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: `""`
            }
        },
    }
}
export default information;