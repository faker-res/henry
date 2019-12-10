const sampleData = {
    login: `{
    "_id": "5ad6bdb1598a74283a091494",
    "partnerId": "14043",  //代理ID
    "level": {  //代理等级
        "_id": "5733e26ef8c8a9355caf49d9",
        "name": "Normal",  //等级名称
        "value": 0,  //等级值
        "platform": "5733e26ef8c8a9355caf49d8",  //平台
        "demoteWeeks": 4,
        "limitPlayers": 20,
        "consumptionAmount": 20,  //投注额度
        "consumptionReturn": 0.2,  //代理洗码
        "__v": 0
    },
    "domain": "localhost",  //域名
    "partnerName": "testpartner4", //代理名称
    "password": "xxxx", //密码
    "realName": "testpartner44", //真实姓名
    "remarks": "i am testpartner4", //备注
    "platform": "5733e26ef8c8a9355caf49d8", //平台
    "isNewSystem": true,
    "commissionType": 1, //佣金种类
    "loginTimes": 6, //登录次数
    "registrationInterface": 0,
    "status": 1,  //状态
    "permission": { //权限
        "disableCommSettlement": false,  //禁用代理佣金结算
        "SMSFeedBack": true,  //短信回访
        "phoneCallFeedback": true,  //电话回访
        "forbidPartnerFromLogin": false,  //登入网站
        "applyBonus": true  //申请提款
    },
    "commissionAmountFromChildren": 10,  //下线佣金额
    "lastChildrenCommissionSettleTime": "1970-01-01T00:00:00.000Z",
    "lastCommissionSettleTime": "1970-01-01T00:00:00.000Z",
    "negativeProfitAmount": 0,
    "commissionHistory": [],
    "ownDomain": [],
    "userAgent": [  //装置{
        "browser": "Chrome",  //浏览器
        "device": "",  //设备
        "os": "Linux"  //操作系统
    }],
    "dateConsumptionReturnRewardWasLastAwarded": "1970-01-01T00:00:00.000Z",
    "datePartnerLevelMigrationWasLastProcessed": "1970-01-01T00:00:00.000Z",
    "parent": null,  //上线
    "children": [],  //下线
    "depthInTree": 0,
    "failMeetingTargetWeeks": 0,
    "validReward": 0,  //有效优惠
    "validConsumptionSum": 0,  //有效投注额（总）
    "activePlayers": 2,  //活跃玩家
    "validPlayers": 2,  //有效玩家
    "totalReferrals": 2,  //推荐玩家（总数）
    "credits": 68.788,  //额度
    "isLogin": true,  //查看是否已登录
    "lastAccessTime": "2018-05-23T08:19:11.858Z",  //上次登录时间
    "registrationTime": "2018-04-18T03:38:25.992Z",  //注册时间
    "phoneNumber": "123******8923",  //电话号码
    "email": "tes*********************4.com",  //邮箱
    "DOB": "1989-12-31T16:00:00.000Z",  //生日
    "gender": true,  //性别
    "__v": 0,
    "bankName": "1",  //银行名
    "bankAccountName": "testpartner4",  //银行用户名
    "bankAccount": "123456******1213",  //银行账号
    "bankAccountType": "2",  //银行账户类别
    "bankAccountDistrict": "东城区",  //银行账户所在区
    "bankAccountCity": "北京市",  //银行账户所在市
    "bankAccountProvince": "北京",  //银行账户所在省
    "bankAddress": "1",  //银行地址
    "lastLoginIp": "127.0.0.1",  //上次登录IP
    "totalChildrenDeposit": 767,  //下线总（存-提）
    "totalChildrenBalance": 11544.85,  //下线总（余额）
    "weeklyActivePlayer": 1,  //活跃玩家（周）
    "dailyActivePlayer": 1,  //活跃玩家（日）
    "monthlyActivePlayer": 2,  //活跃玩家（月）
    "totalPlayerDownline": 2,  //下线总数（玩家）
    "totalSettledCommission": -12.4  //已结佣金（总）
},
"token": "xxxx", //用于重新建立连接`,
}

let loginLogout = {
    name:"登入/登出",
    func: {
        login:{
            title: "代理登录",
            serviceName: "partner",
            functionName: "login",
            desc: "代理登录接口",
            requestContent:[
                { param: "name", mandatory: "是", type: "String", content: "登录用户名" },
                { param: "password", mandatory: "是", type: "String", content: "登录密码" },
                { param: "clientDomain", mandatory: "否", type: "String", content: "登录域名" },
                { param: "captcha", mandatory: "否", type: "String", content: "验证码" },
                { param: "deviceType", mandatory: "否", type: "int", content: "设备类型列表" },
                { param: "subPlatformId", mandatory: "否", type: "int", content: "子平台列表" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.login
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx"

            }
        },

        logout:{
            title: "代理会员登出",
            serviceName: "partner",
            functionName: "logout",
            desc: "代理会员登出接口",
            requestContent:[
                { param: "partnerId", mandatory: "是", type: "String", content: "渠道ID" }
            ],
            respondSuccess:{
                status: 200,
            },
            respondFailure: {
                status: "40x",
                data: "null"

            }
        },
    }
}

export default loginLogout;