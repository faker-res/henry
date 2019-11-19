// 状态码定义：（状态码需统一，以便于管理）
const statusCode = {
    title: "状态码定义",
    fields: {
        name: "状态码",
        desc: "描述"
    },
    definitionData: [
        {name: "200/400", desc:"操作成功／服务器错误"},
        {name: "401", desc:"用户名或密码无效"},
        {name: "402", desc:"验证码错误"},
        {name: "403", desc:"生成验证码错误"},
        {name: "404", desc:"用户名已存在"},
        {name: "405", desc:"无效参数"},
        {name: "406", desc:"无效手机号码"},
        {name: "407", desc:"原密码错误"},
        {name: "408", desc:"数据库连接失败"},
        {name: "409", desc:"用户权限不够"},
        {name: "410", desc:"查询超出范围"},
        {name: "411", desc:"用户会话失效"},
        {name: "412", desc:"提案状态错误"},
        {name: "413", desc:"充值方式维护中"},
        {name: "414", desc:"没有足够的银行卡"},
        {name: "415", desc:"额度不足"},
        {name: "416", desc:"玩家金额消费未满"},
        {name: "417", desc:"支付信息无效"},
        {name: "418", desc:"权限不足"},
        {name: "419", desc:"玩家已有该类型请求"},
        {name: "420", desc:"用户未登陆"},
        {name: "421", desc:"奖励活动无效"},
        {name: "422", desc:"玩家不符合奖励条件"},
        {name: "423", desc:"玩家申请奖励失败"},
        {name: "424", desc:"玩家已有奖励任务"},
        {name: "425", desc:"游戏维护中"},
        {name: "426", desc:"充值失败"},
        {name: "427", desc:"查找玩家奖励信息出错"},
        {name: "428", desc:"转出玩家额度出错"},
        {name: "429", desc:"转入玩家额度出错"},
        {name: "430", desc:"玩家被禁用"},
        {name: "431", desc:"数据错误"},
        {name: "475", desc:"此操作会对玩家已申请优惠有影响，不能进行此操作报错"},
    ]
};

//充值方式表：
const topupType = {
    title: "充值方式表",
    fields: {
        name: "名称",
        value: "值",
        desc: "说明"
    },
    definitionData:[
        {name: 'Netpay', value: '1', desc:'网银支付'},
        {name: 'WechatQR', value: '2', desc:'微信二维码支付'},
        {name: 'AlipayQR', value: '3', desc:'支付宝二维码支付'},
        {name: 'WechatApp', value: '4', desc:'微信App支付'},
        {name: 'AlipayApp', value: '5', desc:'支付宝App支付'},
        {name: 'FastPay', value: '6', desc:'网银快捷支付(FastPay)'},
        {name: 'QqPayQR', value: '7', desc:'qq扫码支付(QqPayQR)'},
        {name: 'UnPayQR', value: '8', desc:'银联扫码支付(UnPayQR)'},
        {name: 'JdPayQR', value: '9', desc:'京东钱包扫码支付(JdPayQR)'},
        {name: 'WXWAP', value: '10', desc:'微信wap'},
        {name: 'ALIWAP', value: '11', desc:'支付宝'},
        {name: 'QQwap', value: '12', desc:'QQWAP'},
        {name: 'PCard', value: '13', desc:'点卡'},
        {name: 'JdWAP', value: '14', desc:'京东wap'},
    ]
};

//提案类型表：
const proposalType = {
    title: "提案类型表",
    fields: {
        name: "名称",
        value: "值",
    },
    definitionData:[
        {name:"更新玩家信息", value: "UpdatePlayerInfo"},
        {name:"更新玩家额度", value:"UpdatePlayerCredit"},
        {name:"更新玩家email", value:"UpdatePlayerEmail"},
        {name:"更新玩家电话", value:"UpdatePlayerPhone"},
        {name:"更新玩家支付信息", value:"UpdatePartnerBankInfo"},
        {name:"更新代理电话", value:"UpdatePartnerPhone"},
        {name:"更新代理email", value:"UpdatePartnerEmail"},
        {name:"全勤奖励",	 value:"FullAttendance"},
        {name:"玩家消费返点奖励", value:"PlayerConsumptionReturn"},
        {name:"玩家首冲奖励",	value:"FirstTopUp"},
        {name:"游戏提供商奖励", value:"GameProviderReward"},
        {name:"代理消费返点奖励", value:"PartnerConsumptionReturn"},
        {name:"代理激励奖励",	value:"PartnerIncentiveReward"},
        {name:"代理推荐奖励",	value:"PartnerReferralReward"},
        {name:"银行转账奖励",	value:"PlatformTransactionReward"},
        {name:"玩家手动充值",	value:"ManualPlayerTopUp"},
        {name:"玩家在线充值", value:"PlayerTopUp"},
        {name:"玩家兑奖",	 value:"PlayerBonus"},
        {name:"玩家充值返点",	value:"PlayerTopUpReturn"},
        {name:"玩家消费激励",	value:"PlayerConsumptionIncentive"},
        {name:"玩家升级",	 value:"PlayerLevelUp"},
        {name:"玩家支付宝充值", value:"PlayerAlipayTopUp 验证码"},
    ]
};

//提案类型表：
const proposalStatusType = {
    title: "提案类型表",
    fields: {
        name: "名称",
        value: "值",
    },
    definitionData:[
        {name:'待审批', value:'Pending'},
        {name:'已审核', value:'Approved'},
        {name:'审批拒绝',	 value:'Rejected'},
        {name:'提案成功',	 value:'Success'},
        {name:'提案失败',	 value:'Fail'},
        {name:'系统异常',	 value:'PrePending'},
        {name:'取消'	, value:'Cancel'},
        {name:'处理中', value:'Processing'},
        {name:'自动审核',	 value:'AutoAudit'},
        {name:'客服待审核', value: 'CsPending'},
        {name:'提款待定', value:'Undetermined'},
        {name:'提款恢复处理',value:'Recover'},
    ]
};

//额度变化类型列表：
const amountVariety = {
    title: "额度变化类型列表",
    fields: {
        name: "名称",
        value: "值",
    },
    definitionData:[
        {name:'更新玩家额度', value:'	UpdatePlayerCredit'},
        {name:'全勤奖励', value:'	FullAttendance'},
        {name:'玩家消费返点奖励', value:'PlayerConsumptionReturn'},
        {name:'玩家首冲奖励', value:'	FirstTopUp'},
        {name:'游戏提供商奖励', value:'GameProviderReward'},
        {name:'代理消费返点奖励', value:'PartnerConsumptionReturn'},
        {name:'代理激励奖励', value:'	PartnerIncentiveReward'},
        {name:'代理推荐奖励', value:'	PartnerReferralReward'},
        {name:'银行转账奖励', value:'	PlatformTransactionReward'},
        {name:'玩家手动充值', value:'	ManualPlayerTopUp'},
        {name:'玩家在线充值', value:'	PlayerTopUp'},
        {name:'玩家兑奖', value:'	PlayerBonus'},
        {name:'玩家充值返点', value:'	PlayerTopUpReturn'},
        {name:'玩家消费激励', value:'	PlayerConsumptionIncentive'},
        {name:'玩家升级', value:'	PlayerLevelUp'},
        {name:'玩家支付宝充值', value:'PlayerAlipayTopUp'},
        {name:'转入', value:'transferIn'},
        {name:'转出', value:'transferOut'},
    ]
};

//在线支付用途: （有些平台要求玩家开户时给账号充值 ）
const onlinePayment = {
    title: "在线支付用途（有些平台要求玩家开户时给账号充值）",
    fields: {
        name: "名称",
        value: "值",
        desc: "说明"
    },
    definitionData:[
        {name:'普通充值(Normal)', value:'1', desc:'此为默认值'},
        {name:'开户充值(CreateAccount)', value:'2'},
    ]
};

//客户端类型：
const clientType = {
    title: "客户端类型（DepositMethod）",
    fields: {
        name: "名称",
        value: "值",
    },
    definitionData:[
        {name:'浏览器(Browser)', value:'1'},
        {name:'手机应用程序(App)', value:'2'},
    ]
};


//手工存款充值方式(DepositMethod)
const depositMethod = {
    title: "手工存款充值方式",
    fields: {
        name: "名称",
        value: "值",
    },
    definitionData:[
        {name:'网银转账(OnlineTransfer)', value:'1'},
        {name:'ATM', value:'2'},
        {name:'柜台存款(Counter)', value:'3'},
        {name:'支付宝转账', value:'4'},
        {name:'微信转账', value:'5'},
        {name:'云闪付转账', value:'6'},
    ]
};


//充值提案状态：
const topupProposalStatus = {
    title:"充值提案状态",
    fields: {
        name: "名称",
        value: "值",
        desc: "说明"
    },
    definitionData:[
        {name:'充值成功(Success)', value:'1', desc: ''},
        {name:'充值失败(Failure)', value:'2', desc: ''},
        {name:'待处理(Pending)', value:'3', desc:'未处理，玩家还可以取消申请'},
        {name:'处理中(Processing)', value:'4', desc:'平台正在处理玩家的申请，不能取消申请了'},
        {name:'已取消(Cancelled)', value:'5', desc:'玩家可以主动取消申请(只能Pending状态时才能取消)'},
        {name:'系统异常(PrePending)', value:'', desc:'支付系统不可用或支付信息出错'},
    ]
};

//设备类型列表：
const deviceType = {
    title: "设备类型列表",
    fields: {
        name: "名称",
        value: "值",
    },
    definitionData:[
        {name:'浏览器(Browser)', value:'1'},
        {name:'H5', value:'2'},
        {name:'安卓 APP', value:'3'},
        {name:'IOS APP', value:'4'},

    ]
};

//子平台列表：
const subPlatform = {
    title:"子平台列表",
    fields: {
        name: "名称",
        value: "值",
    },
    definitionData:[
        {name:'易游棋牌', value:'401'},
        {name:'v68', value:'402'},
        {name:' 易游', value:'403'},
    ]
};


let definition = {
    name: "定义",
    def: {
        statusCode,
        topupType,
        proposalType,
        proposalStatusType,
        amountVariety,
        onlinePayment,
        clientType,
        depositMethod,
        topupProposalStatus,
        deviceType,
        subPlatform
    }
};

export default definition;