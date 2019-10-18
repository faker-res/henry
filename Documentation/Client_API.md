# 客户端交互API定义文档

总述: 文档定义玩家客户端与Fantasy Player Management System(FPMS)之间进行交互的API.


### Table of contents
1. [交互流程](#交互流程：)
2. [服务列表](#服务列表：)
    1. [设置语言](#设置语言)
3. [玩家信息服务](#玩家信息服务：)
	1. [玩家开户](#玩家开户)
	2. [获取图形验证码](#获取图形验证码)
	3. [登录](#登录)
	4. [注销](#注销)
	5. [是否已成功登入](#是否已成功登入)
	6. [获取手机验证码](#获取手机验证码)
	7. [获取玩家基本信息](#获取玩家基本信息get)
	8. [修改玩家的支付信息](#修改玩家的支付信息)
	9. [修改玩家登录密码](#修改玩家登录密码)
	10. [设置短信通知(已淘汰)](#设置短信通知)
	10.1. [获取玩家短信状态](#获取玩家短信状态)
	10.2. [设置玩家短信状态](#设置玩家短信状态)
	11. [用户名是否有效](#用户名是否有效)
	12. [登陆状态验证](#登陆状态验证)
	13. [获取玩家站内信](#获取玩家站内信)
	14. [接收新的站内信通知](#接收新的站内信通知)
	15. [标记站内信为已读](#标记站内信为已读)
	16. [获取未读取站内信](#获取未读取站内信)
	17. [删除所有站内信](#删除所有站内信)
	18. [删除站内信](#删除站内信)
	19. [获取玩家额度](#获取玩家额度)
	20. [获取玩家全额消费](#获取玩家全额消费)
	21. [修改玩家头像](#修改玩家头像)
	22. [获取玩家当天状态](#获取玩家当天状态)
	23. [获取玩家本周状态](#获取玩家本周状态)
	24. [获取玩家本月状态](#获取玩家本月状态)
	25. [添加客户端访问记录](#添加客户端访问记录)
	26. [获取玩家最新额度](#获取玩家最新额度)
	27. [修改玩家电话](#修改玩家电话)
	28. [登入后获取手机验证码](#登入后获取手机验证码)
	29. [通过验证码验证手机](#通过验证码验证手机)
	30. [玩家前端自助判断升级](#玩家前端自助判断升级)
	31. [玩家当前额度](#玩家当前额度)
	32. [登入后获取提款信息](#登入后获取提款信息)
	33. [编辑玩家QQ](#编辑玩家QQ)
	34. [编辑玩家wechat](#编辑玩家wechat)
	35. [编辑玩家email](#编辑玩家email)
	36. [登入金百利直播间](#登入金百利直播间)
	37. [获取玩家基本信息](#获取玩家基本信息)
	38. [用户真名是否有效](#用户真名是否有效)
	39. [发送站内信给另一玩家](#发送站内信给另一玩家)
	40. [发送站内信给管理员](#发送站内信给管理员)
	41. [创建试玩玩家](#创建试玩玩家)
	42. [获取玩家客户端数据](#获取玩家客户端数据)
	43. [保存玩家客户端数据](#保存玩家客户端数据)
	44. [玩家充值投注排行榜](#玩家充值投注排行榜)
	45. [获取回电域名图片验证](#获取回电域名图片验证)
	46. [请求回电域名配置](#请求回电域名配置)
	47. [获取玩家当日数据](#获取玩家当日数据)
	48. [客户QnA重置密码](#客户QnA重置密码)
	49. [电话号码查找账号](#电话号码查找账号)
	50. [获取接收代理转账记录](#获取接收代理转账记录)
	51. [生成游客账号](#生成游客账号51)
	52. [电话号码注册与登陆](#电话号码注册与登陆)
	53. [修改生日日期](#修改生日日期)
	54. [玩家电话号码与密码登入](#玩家电话号码与密码登入)
	55. [绑定手机号](#绑定手机号)
	56. [更新设备号](#更新设备号)
	57. [获取更新密码令牌](#获取更新密码令牌)
	58. [令牌更新密码](#令牌更新密码)
	59. [获取玩家最近玩的两个游戏](#获取玩家最近玩的两个游戏)
    60. [APP设置登陆密码](#APP设置登陆密码)
    61. [获取玩家推广域名防红和短链转换](#获取玩家推广域名防红和短链转换)
    62. [手机号码与密码注册](#手机号码与密码注册)
    63. [手机号码与密码登录](#手机号码与密码登录)
    64. [游客账号绑定手机号码与密码](#游客账号绑定手机号码与密码)
    65. [通过电话号码重置密码](#通过电话号码重置密码)
    66. [查询银行卡归属地](#查询银行卡归属地)
4. [注册意向服务](#注册意向服务：)
	1. [添加注册意向记录](#添加注册意向记录)
	2. [修改注册意向记录](#修改注册意向记录)
5. [支付信息服务](#支付信息服务：)
	1. [申请提款](#申请提款)
	2. [获取提款提案列表](#获取提款提案列表)
	3. [取消提款申请](#取消提款申请)
	4. [获取奖品列表](#获取奖品列表)
	5. [获取有效在线充值方式](#获取有效在线充值方式)
	6. [创建在线充值提案](#创建在线充值提案)
	7. [申请手工存款充值](#申请手工存款充值)
	8. [取消手工存款申请单](#取消手工存款申请单)
	9. [延长手工存款申请单有效时间](#延长手工存款申请单有效时间)
	10. [修改手工存款申请单信息](#修改手工存款申请单信息)
	11. [获取手工存款申请单列表](#获取手工存款申请单列表)
	12. [获取支付宝存款申请单列表](#获取支付宝存款申请单列表)
	13. [获取微信存款申请单列表](#获取微信存款申请单列表)
	14. [申请支付宝转账充值](#申请支付宝转账充值)
	15. [申请微信转账充值](#申请微信转账充值)
	16. [申请秒付宝充值](#申请秒付宝充值)
	17. [取消支付宝转账充值](#取消支付宝转账充值)
	18. [取消微信转账充值](#取消微信转账充值)
	19. [手工存款充值状态通知](#手工存款充值状态通知)
	20. [在线充值状态通知](#在线充值状态通知)
	21. [获取充值记录](#获取充值记录)
	22. [获取省份列表](#获取省份列表)
	23. [获取市列表](#获取市列表)
	24. [获取区县列表](#获取区县列表)
	25. [获取银行卡类型列表](#获取银行卡类型列表)
	26. [手工订单超时后的再次确认请求](#手工订单超时后的再次确认请求)
	27. [获取符合首冲条件的充值记录](#获取符合首冲条件的充值记录)
	28. [getValidTopUpReturnRecordLis](#getValidTopUpReturnRecordLis)
	29. [获取符合充值奖励的充值记录](#获取符合充值奖励的充值记录)
	30. [获取充值申请记录](#获取充值申请记录)
	31. [获取支付宝单笔限额](#获取支付宝单笔限额)
	32. [获取手工充值状态](#获取手工充值状态)
	33. [支付宝充值状态](#支付宝充值状态)
	34. [微信充值状态](#微信充值状态)
	35. [是否首冲](#是否首冲)
	36. [获取在线支付单笔限额（微信扫码和支付宝扫码）](#获取在线支付单笔限额(微/支))
	37. [获取pms可用银行卡类型](#获取pms可用银行卡类型)
	38. [(通用充值接口) 创建通用接口充值提案](#创建通用接口充值提案(通用充值接口) )
	39. [(通用充值接口) 获取通用充值最高和最低可接收充值额度](#获取通用充值最高和最低可接收充值额度(通用充值接口))
	40. [获取玩家『总』有效投注额](#获取玩家(总)有效投注额)
	41. [(第三方上下分接口) 快付充值接口](#快付充值接口(第三方上下分接口))
6. [充值意向服务](#充值意向服务：)
	1. [添加充值意向](#添加充值意向)
	2. [修改充值意向](#修改充值意向)
7. [玩家消费记录服务](#玩家消费记录服务：)
	1. [获取最近消费记录](#获取最近消费记录)
	2. [查询消费记录](#查询消费记录)
	3. [新消费通知(以后再做)](#新消费通知(以后再做))
8. [玩家等级服务](#玩家等级服务：)
	1. [获取玩家等级](#获取玩家等级)
	2. [获取等级优惠信息](#获取等级优惠信息)
	3. [获取全部玩家等级](#获取全部玩家等级)
	4. [玩家升级](#玩家升级)
9.  [奖励信息服务](#奖励信息服务：)
	1. [获取奖励活动列表](#获取奖励活动列表)
	2. [获取玩家奖励任务](#获取玩家奖励任务)
	3. [获取玩家申请奖励](#获取玩家申请奖励)
	4. [申请提前洗码](#申请提前洗码)
	5. [获取申请优惠相关信息](#获取申请优惠相关信息)
	6. [申请奖励活动](#申请奖励活动)
	7. [获取消费返点额度](#获取消费返点额度)
	8. [获取推荐玩家列表](#获取推荐玩家列表)
	9. [获取玩家累计签到信息](#获取玩家累计签到信息)
	10. [获取优惠代码](#获取优惠代码)
	11. [申请优惠代码](#申请优惠代码)
	12. [秒杀礼包列表](#秒杀礼包列表)
	13. [获取充值优惠](#获取充值优惠)
	14. [设置优惠代码显示](#设置优惠代码显示)
	15. [获取签到信息](#获取签到信息)
	16. [获取签到奖励](#获取签到奖励)
	17. [标记优惠代码已读](#标记优惠代码已读)
	18. [获取存送金信息](#获取存送金信息)
	19. [获取某优惠领取排行榜](#获取某优惠领取排行榜)
	20. [获取玩家洗码数据](#获取玩家洗码数据)
	21. [获取开放式优惠代码](#获取开放式优惠代码)
	22. [获取存送申请日限剩余可领取值](#获取存送申请日限剩余可领取值)
10. [游戏信息服务](#游戏信息服务：)
	1. [获取游戏类型列表](#获取游戏类型列表)
	2. [获取游戏列表](#获取游戏列表)
	3. [获取内容提供商(CP)列表](#获取内容提供商(CP)列表)
	4. [将本地额度转出到CP账号的游戏额度 (该接口支持游戏间互转)](#将本地额度转出到CP账号的游戏额度)
	5. [将游戏额度从CP账号转入到本地额度)](#将游戏额度从CP账号转入到本地额度)
	6. [获取登录游戏的URL](#获取登录游戏的URL)
	7. [获取试玩游戏的URL](#获取试玩游戏的URL7)
	8. [获取试玩游戏的URL](#获取试玩游戏的URL8)
	9. [获取玩家游戏中的账户信息](#获取玩家游戏中的账户信息)
	10. [修改玩家游戏账号的密码](#修改玩家游戏账号的密码)
	11. [请求立即收录玩家的消费记录](#请求立即收录玩家的消费记录)
	12. [收藏游戏](#收藏游戏)
	13. [删除收藏游戏](#删除收藏游戏)
	14. [获取收藏游戏](#获取收藏游戏)
	15. [获取游戏分组列表](#获取游戏分组列表)
	16. [获取游戏分组详细信息](#获取游戏分组详细信息)
	17. [获取游戏分组树信息](#获取游戏分组树信息)
	18. [搜索游戏](#搜索游戏)
	19. [查询游戏提供商额度](#查询游戏提供商额度)
	20. [根据游戏组查询游戏](#根据游戏组查询游戏)
	21. [获取游戏账号密码](#获取游戏账号密码)
	22. [修改游戏密码](#修改游戏密码)
	23. [获取真人游戏实时详情](#获取真人游戏实时详情)
	24. [服务器推送真人游戏变化](#服务器推送真人游戏变化)
11.  [代理服务](#代理服务：)
		1. [代理会员注册](#代理会员注册)
		2. [代理会员注册用户名有效性验证](#代理会员注册用户名有效性验证)
		3. [代理会员注册验证码](#代理会员注册验证码)
		4. [登录状态验证](#登录状态验证)
		5. [获取代理会员用户信息](#获取代理会员用户信息)
		6. [代理登录](#代理登录)
		7. [代理会员登出](#代理会员登出)
		8. [获取代理会员信息](#获取代理会员信息)
		9. [获取登录验证码](#获取登录验证码)
		10. [修改代理会员密码](#修改代理会员密码)
		11. [设置代理银行资料](#设置代理银行资料)
		12. [获取代理统计信息注册create](#获取代理统计信息注册create)
		13. [获取代理下线玩家列表](#获取代理下线玩家列表)
		14. [获取代理下线玩家详情列表](#获取代理下线玩家详情列表)
		15. [获取代理推广域名](#获取代理推广域名)
		16. [获取代理下线报表](#获取代理下线报表)
		17. [绑定代理玩家](#绑定代理玩家)
		18. [申请兑奖](#申请兑奖)
		19. [获取兑奖列表](#获取兑奖列表)
		20. [取消兑奖申请](#取消兑奖申请(partner))
		21. [代理其下玩家充值兑奖情况记录](#代理其下玩家充值兑奖情况记录)
		22. [查询代理下线玩家开户来源报表](#查询代理下线玩家开户来源报表)
		23. [查询代理下线玩家开户统计](#查询代理下线玩家开户统计)
		24. [查询代理佣金信息](#查询代理佣金信息)
		25. [查询代理佣金详情](#查询代理佣金详情)
		26. [通过短信验证码修改代理手机号码](#通过短信验证码修改代理手机号码)
		27. [更新代理佣金模式](#更新代理佣金模式)
		28. [获取下线玩家活跃信息](#获取下线玩家活跃信息)
		29. [获取下线玩家存款信](#获取下线玩家存款信息)
		30. [获取下线玩家提款信息](#获取下线玩家提款信息)
		31. [获取下线玩家投注信息](#获取下线玩家投注信息)
		32. [获取新注册下线玩家信息](#获取新注册下线玩家信息)
		33. [获取代理佣金比例详情](#获取代理佣金比例详情)
		34. [获取代理费用比例详情](#获取代理费用比例详情)
		35. [预算代理佣金](#预算代理佣金)
		36. [代理充值投注排行榜](#代理充值投注排行榜)
		37. [查询代理佣金提案](#查询代理佣金提案)
		38. [获取平台-代理页面的设置](#获取平台-代理页面的设置)
		39. [代理转金额给下线](#代理转金额给下线)
		40. [获取下级代理信息](#获取下级代理信息)
		41. [获取下级代理贡献值详情](#获取下级代理贡献值详情)
		42. [获取代理转账记录](#获取代理转账记录)
		43. [查询所有下线玩家详情](#查询所有下线玩家详情)
		44. [代理推广域名防红和短链转换](#代理推广域名防红和短链转换)
		45. [查询代理的下级会员信息](#查询代理的下级会员信息)
        46. [查询代理的下级代理信息](#查询代理的下级代理信息)
	12. [平台](#平台：)
		1.  [获取平台公告](#获取平台公告)
		2. [获取平台信息](#获取平台信息)
		3. [获取平台设置](#获取平台设置)
		4. [请求客服会电](#请求客服会电)
		5. [搜索平台投注记录](#搜索平台投注记录)
		6. [埋点](#埋点)
		7. [获取平台客户端数据](#获取平台客户端数据)
		8. [保存平台客户端数据](#保存平台客户端数据)
		9. [电销系统开户](#电销系统开户)
		10. [提取玩家资料](#提取玩家资料)
		11. [获取平台设置](#获取平台设置2)
		12. [获取QR CODE](#获取QRCODE)
		13. [获取模板设置](#获取模板设置)
		14. [IP + 域名log （統計域名瀏覽次數、IP瀏覽次數、以及APP開戶可根據IP抓到來源）](#IP+域名log)
		15. [获取平台锁大厅配置](#获取平台锁大厅配置)
		16. [前端保存数据接口](#前端保存数据接口)
		17. [前端获取数据接口](#前端获取数据接口)
		18. [获取前端設置数据接口](#获取前端設置数据接口)
	13. [奖励点数](#奖励点数：)
		1. [获取积分排名列表](#获取积分排名列表)
		2. [获取登入积分信息](#获取登入积分信息)
		3. [获取游戏积分信息](#获取游戏积分信息)
		4. [获取存款积分信息](#获取存款积分信息)
		5. [手动申请积分活动奖励](#手动申请积分活动奖励)
		6. [获取任务信息](#获取任务信息)
		7. [积分规则](#积分规则)
		8. [积分兑换真钱](#积分兑换真钱)
		9. [扣除积分](#扣除积分)
		10. [扣除积分](#扣除积分2)
		11. [手动批量申请积分活动奖励](#手动批量申请积分活动奖励)
	14. [电销服务](#电销服务：)
		1. [单一电话导入现有任务](#单一电话导入现有任务)
		2. [提交电销代码](#提交电销代码)
	15. [微信群控](#微信群控：)
		1. [群控发送心跳包维持链接](#群控发送心跳包维持链接)
		2. [客服与玩家对话](#客服与玩家对话)
		3. [绑定玩家微信号+昵称+备注](#绑定玩家微信号+昵称+备注)
	16. [拍卖](#拍卖：)
		1. [查找拍卖商品](#查找拍卖商品)
		2. [竞标拍卖商品](#竞标拍卖商品)
    17. [QQ群控](#QQ群控：)
    		1. [QQ群控发送心跳包维持链接](#QQ群控发送心跳包维持链接)
    		2. [QQ群控客服与玩家对话](#QQ群控客服与玩家对话)
    		3. [QQ群控绑定玩家QQ号+昵称+备注](#QQ群控绑定玩家QQ号+昵称+备注)



竞标拍卖商品
# 交互流程：

### 前端SDK链接：[http://54.179.151.35:888/sdk/frontend-sdk.rar](http://54.179.151.35:888/sdk/frontend-sdk.rar)

### 问题：

API说明：
-	服务器地址：[ws://ip/port/](ws://ip.port/)
-	API类型：
		-	请求响应类： 向服务器请求资源，服务器以异步方式响应这个请求。
		-	通知类: 服务器可以向客户端随时发送通知消息。

- 通信格式:
		- 通信双方将使用WebSocket进行通信，传输内容为json格式的字符串，格式如下：

		{"service": "aService","functionName":"get",requestId:xxx,"data":*}


	service属性用来对一组API进行了分组，如玩家信息服务，使用player name属性用来命名操作的名称，如登录功能，名称logindata属性，API之间传输的内容, 详细内容由API定义
# <head1>

#### 状态码定义：

|状态码| 描述 |
|--|--|
| 200／400 | 操作成功／服务器错误 |
| 401 | 用户名或密码无效 |
| 402 | 验证码错误 |
| 403 | 生成验证码错误 |
| 404 | 用户名已存在 |
| 405 | 无效参数 |
| 406 | 无效手机号码 |
| 407 | 原密码错误 |
| 408| 数据库连接失败 |
| 409 | 用户权限不够 |
| 410 | 查询超出范围 |
| 411 | 用户会话失效 |
| 412 |  提案状态错误|
| 413 | 充值方式维护中 |
| 414 | 没有足够的银行卡 |
| 415 |额度不足|
| 416 | 玩家金额消费未满 |
| 417 | 支付信息无效 |
| 418 | 权限不足 |
| 419 | 玩家已有该类型请求 |
| 420 | 用户未登陆 |
| 421 | 奖励活动无效 |
| 422| 玩家不符合奖励条件 |
| 423 |玩家申请奖励失败|
| 424 | 玩家已有奖励任务 |
| 425 | 游戏维护中 |
| 426 | 充值失败 |
| 427 | 查找玩家奖励信息出错 |
| 428 | 转出玩家额度出错 |
| 429 | 转入玩家额度出错 |
| 430 | 玩家被禁用 |
| 431 | 数据错误 |
| 475 | 此操作会对玩家已申请优惠有影响，不能进行此操作报错 |
（状态码需统一，以便于管理）

#### 充值方式表：

| 名称 | 值 |说明|
|--|--|--|
| Netpay |  1|	网银支付|
| WechatQR | 2 |微信二维码支付	|
| AlipayQR |  3|	支付宝二维码支付|
| WechatApp |  4|微信App支付	|
|AlipayApp|  5|	支付宝App支付|
| FastPay | 6 |网银快捷支付(FastPay)	|
|  QqPayQR| 7 |	qq扫码支付(QqPayQR)|
| UnPayQR |  8|	银联扫码支付(UnPayQR)|
| JdPayQR |  9|	京东钱包扫码支付(JdPayQR)|
| WXWAP | 10 |	微信wap|
| ALIWAP | 11 |	支付宝|
|  QQwap| 12 |	QQWAP|
| PCard | 13 |	点卡|
|  JdWAP| 14 |	京东wap|


#### 提案类型表：

|  名称|值  |
|--|--|
|  更新玩家信息|“UpdatePlayerInfo”|
|更新玩家额度|“UpdatePlayerCredit”|
|更新玩家email|"UpdatePlayerEmail"|
|更新玩家电话|"UpdatePlayerPhone"|
|更新玩家支付信息|"UpdatePartnerBankInfo"|
|更新代理电话|"UpdatePartnerPhone"|
|更新代理email|"UpdatePartnerEmail"|
|全勤奖励|"FullAttendance"|
|玩家消费返点奖励|"PlayerConsumptionReturn"|
|玩家首冲奖励|"FirstTopUp"|
|游戏提供商奖励|"GameProviderReward"|
|代理消费返点奖励|"PartnerConsumptionReturn"|
|代理激励奖励|"PartnerIncentiveReward"|
|代理推荐奖励|"PartnerReferralReward"|
|银行转账奖励|"PlatformTransactionReward"|
|玩家手动充值|"ManualPlayerTopUp"|
|玩家在线充值|"PlayerTopUp"|
|玩家兑奖|"PlayerBonus"|
|玩家充值返点|“PlayerTopUpReturn”|
|玩家消费激励|“PlayerConsumptionIncentive”|
|玩家升级|“PlayerLevelUp”|
|玩家支付宝充值|“PlayerAlipayTopUp”验证码|


#### 提案类型表：
|名称|值  |
|--|--|
| 待审批 |“Pending”|
|已审核|“Approved”|
|审批拒绝|“Rejected”|
|提案成功|“Success”|
|提案失败|“Fail”|
|系统异常|“PrePending”|
|取消|“Cancel”|
|处理中|“Processing”|
|自动审核|“AutoAudit”|
|客服待审核|“CsPending”|
|提款待定|“Undetermined”|
|提款恢复处理|“Recover”|


#### 额度变化类型列表：
|名称|值  |
|--|--|
|更新玩家额度|“UpdatePlayerCredit”|
|全勤奖励|"FullAttendance"|
|玩家消费返点奖励|"PlayerConsumptionReturn"|
|玩家首冲奖励|"FirstTopUp"|
|游戏提供商奖励|"GameProviderReward"|
|代理消费返点奖励|"PartnerConsumptionReturn"|
|代理激励奖励|"PartnerIncentiveReward"|
|代理推荐奖励|"PartnerReferralReward"|
|银行转账奖励|"PlatformTransactionReward"|
|玩家手动充值|"ManualPlayerTopUp"|
|玩家在线充值|"PlayerTopUp"|
|玩家兑奖|"PlayerBonus"|
|玩家充值返点|“PlayerTopUpReturn”|
|玩家消费激励|“PlayerConsumptionIncentive”|
|玩家升级|“PlayerLevelUp”|
|玩家支付宝充值|“PlayerAlipayTopUp”|
|转入|“transferIn”|
|转出|“transferOut”|

- **在线支付用途:** （有些平台要求玩家开户时给账号充值 ）
- 普通充值(Normal): 1 (此为默认值)
- 开户充值(CreateAccount): 2
### 客户端类型：
- 浏览器(Browser): 1
- 手机应用程序 (App): 2

### 手工存款充值方式(DepositMethod)：
-  网银转账(OnlineTransfer): 1ATM: 2
- 柜台存款(Counter): 3
- 支付宝转账：4
- 微信转账： 5
- 云闪付转账:6

### 充值提案状态：
-  充值成功(Success): 1
- 充值失败(Failure): 2
- 待处理(Pending): 3 note: 未处理，玩家还可以取消申请
- 处理中(Processing): 4 note: 平台正在处理玩家的申请，不能取消申请了。
- 已取消(Cancelled): 5 note: 玩家可以主动取消申请(只能Pending状态时才能取消)
- 系统异常(PrePending) 支付系统不可用或支付信息出错

# 服务列表：

### 连接服务：
**service: connection**
<div id='设置语言'></div>

功能列表:
* **1. 设置语言**
	* 设置服务器返回信息语言。 name:setLang.
	* 请求内容：`{lang: 1}//1:简体中文，2:英语`
	* 响应内容：`{status: 200/40x}`
	* status：[参见状态码定义](#head1)
	* 成功：200
	* 失败：40x

# 玩家信息服务：
该服务为客户端提供玩家的注册，登录，注销等功能，并提供修改玩家资料等接口。

### service: player
### 功能列表：
<div id='玩家开户'></div>

* **1. 玩家开户**
  - 向服务端提交开户申请，开户成功需通过短信验证(1分钟后才能重发，5分钟短信失效).
  - name: create 	
  - 请求内容：
	  - ```
		    {
			  name: “test1”,
			  password: “123456”,
			  phoneNumber: “74852734”,
			  smsCode: “888888”,
			  email: “[tes1@163.com](mailto:tes1@163.com)”,
			  gender: “0”,
			  "DOB": "2017-01-18",
			  platformId:”xxxxxx”,
			  referral: “player002”,
			  domain: “domain.com”
            }
            
  - name: 玩家注册的用户名.(需验证用户是否被占用)
  - realName: 真实姓名
  - password: 玩家密码
  - platformId: 玩家注册平台
  - referral: 推荐人的玩家用户名
  - domain: 当下注册域名
  - phoneNumber: 玩家手机号码
  - email: 玩家邮箱
  - gender: 性别 // 1-男，0-女,
  - DOB: 生日
  - smsCode: 短信验证码
  - partnerName: //代理上线帐号,与代理上线D可则一 （如：p12345）
  -  _partnerId: //（用string）代理上线ID,与代理上线帐号可则一（如：513451）_
  - qq： qq号码
  - captcha：图片验证码，代理上线开下线用，将不用smsCode
  - sourceUrl：注册来源（跳转域名）
  - deviceId: 设备号
  - referralId: 邀请码(推荐人的玩家ID)
  - referralUrl: 邀请码链接
  - 响应内容：{status: 200/4xx, data: playerObj, token: xxxxxxxx, isHitReferralLimit: true/false}
  - 操作成功： status--200, data--玩家对象(包含token), token--玩家atock, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）
  - 操作失败： status--4xx, data--null

<div id='获取图形验证码'></div>

* **2. 获取图形验证码**
  - 从服务端获取验证码， 验证码以base64格式分发给客户端, 客户端接到之后显示出来。
  - 请求内容：  name: captcha{} //空对象
  - 响应内容：{status: 200/40x, data: “base64;pngXfasagGFFSD”}
  - 操作成功： status--200, data--验证码base64字符串
  - 操作失败： status--40x, data--null

<div id='登录'></div>

* **3. 登录**
    * functionName: login
	* 玩家登录接口
	* 请求内容：
	    ```
        platformId: 必填|String|玩家注册平台
        name: 必填|String|玩家用户名
        password: 必填|String|玩家密码
        captcha: 选填|String|验证码 (登录三次失败后需要填验证码)
        clientDomain: 选填|String|登陆域名
        deviceId: 选填|String|设备号
        checkLastDeviceId: 选填|Boolean|检查上次登入设备是否与这次一样
        ```
	* 操作成功:
	    ```
	    status: 200
	    data: 玩家对象
	    token: 玩家token
	    ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='注销'></div>

* **4. 注销**
    * functionName: logout
	* 玩家注销登录接口
	* 请求内容：
	    ```
	    playerId: 必填|String|玩家ID
	    ```
	* 操作成功:
        ```
        status: 200
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='是否已成功登入'></div>

* **5. 是否已成功登入**
    * functionName: isLogin
	* 查询玩家是否登录.
	* 请求内容：
        ```
        playerId: 必填|String|玩家ID
        ```
    * 操作成功:
        ```
        status: 200
        data: 已登录true, 未登录false
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取手机验证码'></div>

* **6. 获取手机验证码**
    * functionName: getSMSCode
	* 玩家输入有效的手机号之后，点击获取验证码. 获取之后，需1分钟之后才能点击重发。当验证用途是注册时，手机号码超出使用限制便会报错。
	* 请求内容：
        ```
        platformId: 必填|String|平台ID
        phoneNumber: 必填|String|发送短信验证的号码
        oldPhoneNumber: 选填|String|玩家旧的电话号码，当purpose是'newPhoneNumber' ，而且为一步修改电话时，需传送旧的号码核对是否匹配（注意 2 步修改不需要）。
        purpose: 选填|String|详细如下
        name: 选填|String|玩家帐号，请注意只有『注册』、『重置密码』才可以发
        captcha: 选填|String|图片验证码
        playerId: 选填|String|玩家ID，登入的情况发送
        useVoiceCode: 选填|Boolean| 是否使用语音验证码
        ```
	* purpose ( 验证用途，可收入内容如下 )：

	    |Purpose|功能|
	    |-------|---|
	    |resetPassword|重置密码|
	    |inquireAccount|找回账号|
	    |playerLogin|玩家登入|
	    |playerAppLogin|玩家APP登入（专为现金网APP需求而客制化）|
	    |setPhoneNumber|初次设置手机号|
	    |registration|注册|
	    |oldPhoneNumber|修改电话时的电话验证（旧号码）|
	    |newPhoneNumber|修改电话时的电话验证（新号码）// 一步修改电话用此|
	    |updatePassword|更新密码|
	    |updateBankInfo|更新支付信息|
	    |updateBankInfoFirst|首次设置支付信息|
	    |freeTrialReward|免费体验金|
	    |demoPlayer|试玩帐号|
	    |Partner_registration|代理注册|
	    |Partner_oldPhoneNumber|代理电话号码（旧）|
	    |Partner_newPhoneNumber|代理电话号码（新）|
	    |Partner_updatePassword|代理更新密码|
	    |Partner_updateBankInfoFirst|代理银行卡（首次）|
	    |Partner_updateBankInfo|代理银行卡（更换）|

	* 操作成功:
        ```
        status: 200
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取玩家基本信息get'></div>

* **7. 获取玩家基本信息**
    * functionName: get
	* 客户端获取玩家的基本信息，包括邮箱，地址，以及玩家等级详细信息。通过这个接口，还会返回更多的玩家信息。
	* 请求内容：
	    ```
	    playerId: 必填|String|玩家ID
	    ```
	* 操作成功:
        ```
        status: 200
        data: {
            玩家对象
			hasPassword: 玩家是否有修改过密码
            ...
            ...
        }
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='修改玩家的支付信息'></div>

* **8. 修改玩家的支付信息**
    * functionName: updatePaymentInfo
	* 提供一个修改玩家的支付信息的接口
	* 请求内容：
        ```
        playerId: 必填|String|玩家ID
        bankName: 必填|String|银行名称ID
        bankAccount: 必填|String|银行账号
        bankAccountName: 选填|String|账号名称
        bankAccountType: 选填|String|账号类型 -- 1:信用卡 , 2:借记卡（默认2）
        bankAccountProvince: 选填|String|开户省 "130000" (河北省）
        bankAccountCity: 选填|String|开户城市"130700"（张家口）
        bankAccountDistrict: 选填|String|开户地区"130734"（其它区）
        bankAddress: 选填|String|银行地址
        remark: 选填|String|备注
        smsCode: 选填|String|短信验证码
		```
    * 操作成功:
        ```
        status: 200
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='修改玩家登录密码'></div>

* **9. 修改玩家登录密码**
    * functionName: updatePassword
	* 提供一个用于修改玩家密码的接口
	* 请求内容：
        ```
        playerId: 必填|String|玩家ID
        oldPassword: 必填|String|旧密码
        newPassword: 必填|String|新密码
        smsCode: 选填|String|SMS验证码
		```
	* 操作成功:
        ```
        status: 200
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='设置短信通知'></div>

* **10. 设置短信通知 (已淘汰)**
    * functionName: updateSmsSetting
	* 已淘汰 Deprecated

<div id='获取玩家短信状态'></div>

* **10.1 获取玩家短信状态**
    * functionName: getSmsStatus
	* 获取玩家接收短信的事件类型
	* 请求内容：
	    ```
	    {}
	    ```
    * 操作成功:
        ```
        status: 200
        data:
            smsName: 短信分组名称
            smsId: 短信通知分组smsId,可用smsId,来调用setSmsStatus接口，设置开关
            status: 短信分组状态（1:组内的设定都是开启的 0:任一组内设定关闭即为0）
            settings: [{ //短信分组内设定
            	smsName: 短信通知类型名
            	smsId: 短信通知设定
            	status: 设定是否开启 1：开启 0：关闭
            }],
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='设置玩家短信状态'></div>		

* **10.2 设置玩家短信状态**
    * functionName: setSmsStatus
	* 设置玩家接收短信的事件类型
	* 请求内容：
	    ```
	    status: 必填|String|smsId:status, smsId:参考getSmsStatus status:0/1, 例子"1:0,20:1,30:1"
	    ```
    * 操作成功:
        ```
        status: 200
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='用户名是否有效'></div>

* **11. 用户名是否有效**
    * functionName: isValidUsername
	* 用于在注册时，检测玩家的用户名是否有效。
	* 请求内容：
	    ```
	    platformId: 必填|String|玩家注册平台
	    name: 必填|String|要验证的用户名
        ```
    * 操作成功:
        ```
        status: 200
        data: true:有效，false:用户名已被占用
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='登陆状态验证'></div>

* **12. 登陆状态验证**
    * functionName: authenticate
	* 用于验证玩家webSocket链接是否有效。
	* 当玩家已登录，但是webSocket链接断开，再建立链接是可以用token来验证链接
	* 请求内容：
	    ```
	    playerId: 必填|String|玩家ID
	    token: 必填|String|玩家token
        isLogin: 选填|Boolean|是否进行玩家登陆行为
        clientDomain: 选填|String|玩家所在域名
	    ```
	* 操作成功:
        ```
        status: 200
        data: true
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取玩家站内信'></div>

* **13. 获取玩家站内信**
    * functionName: getMailList
	* 获取玩家站内信列表
	* 请求内容：
	    ```
	    {}
	    ```
	* 操作成功:
        ```
        status: 200
        data: [{
            _id: 邮件唯一码
            title: 邮件标题
            content: 邮件内容
            hasBeenRead: 是否被阅读
            createTime: 邮件生成时间
        }]
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='接收新的站内信通知'></div>

* **14. 接收新的站内信通知**
	* functionName: notifyNewMail
	* 监听类型, 呼叫后, 如果有新邮件, 系统会主动推送
	* 请求内容：
        ```
        {}
        ```
	* 操作成功:
        ```
        status: 200
        data: [{
            _id: 邮件唯一码
            title: 邮件标题
            content: 邮件内容
            hasBeenRead: 是否被阅读
            createTime: 邮件生成时间
        }]
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='标记站内信为已读'></div>

* **15. 标记站内信为已读**
	* functionName: readMail
	* 标记站内信为已读
	* 请求内容：
	    ```
	    mailObjId: 必填|String|邮件唯一码
	    ```
    * 操作成功:
        ```
        status: 200
        data:
            _id: 邮件唯一码
            title: 邮件标题
            content: 邮件内容
            hasBeenRead: 是否被阅读
            createTime: 邮件生成时间
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取未读取站内信'></div>

* **16. 获取未读取站内信**
	* functionName: getUnreadMail
    * 获取未读取站内信
	* 请求内容：
	    ```
	    {}
	    ```
	* 操作成功:
        ```
        status: 200
        data: [{
            _id: 邮件唯一码
            title: 邮件标题
            content: 邮件内容
            hasBeenRead: 是否被阅读
            createTime: 邮件生成时间
        }]
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='删除所有站内信'></div>

* **17. 删除所有站内信**
	* functionName: deleteAllMail
	* 请求内容：
	    ```
	    {}
	    ```
	* 操作成功:
        ```
        status: 200
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='删除站内信'></div>

* **18. 删除站内信**
	* functionName: deleteMail
	* 请求内容：
	    ```
	    mailObjId: 必填|String|邮件唯一码
        ```
	* 操作成功:
        ```
        status: 200
        data: [{
            _id: 邮件唯一码
            title: 邮件标题
            content: 邮件内容
            hasBeenRead: 是否被阅读
            createTime: 邮件生成时间
        }]
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取玩家额度'></div>

* **19. 获取玩家额度**
	* functionName: getCredit
	* 请求内容：
        ```
        {}
        ```
	* 操作成功:
        ```
        status: 200
        data:
            gameCredit: 供应商内额度
            validCredit: 自由额度
            pendingRewardAmount: 待审核优惠金额
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取玩家全额消费'></div>

* **20. 获取玩家全额消费**
	* name: getCreditBalance
    * 获取玩家总投注额度
    * 请求内容：
        ```
        {}
        ```
    * 操作成功:
        ```
        status: 200
        data: 总投注额度
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='修改玩家头像'></div>

* **21. 修改玩家头像**
	* functionName: updatePhotoUrl
	* 请求内容：`{photoUrl: “abc”}`
	* 响应内容：`{status: 200/4xx, data: 400}`
	* 操作成功: status--200
	* 操作失败：status--4xx, data-null

<div id='获取玩家当天状态'></div>

* **22. 获取玩家当天状态**
	* Name: getPlayerDayStatus
	* 请求内容：`{providerIds: [“18”, “20”]} // 提供商ID，选填，只获取指定提供商ID的投注记录，不填则全拿`
	* 响应内容：
		*
			```
			{
				"status": 200/4xx,
				"data": {
					"topUpAmount": 110,
					"consumptionAmount": 1000
				}
			}
	* 操作成功: status--200
	* 操作失败：status--4xx, data-null

<div id='获取玩家本周状态'></div>


* **23. 获取玩家本周状态**
	* Name: getPlayerWeekStatus
	* 请求内容：`{providerIds: [“18”, “20”]} // 提供商ID，选填，只获取指定提供商ID的投注记录，不填则全拿`
	* 响应内容：
		*
			```
			{"status": 200/4xx,
				"data": {
					"topUpAmount": 110,
					"consumptionAmount": 1000
				}
			}
	* 操作成功: status--200
	* 操作失败：status--4xx, data-null

<div id='获取玩家本月状态'></div>

* **24. 获取玩家本月状态**
	* Name: getPlayerMonthStatus
	* 请求内容：`{providerIds: [“18”, “20”]} // 提供商ID，选填，只获取指定提供商ID的投注记录，不填则全拿`
	* 响应内容：
		*
			```
			{
				"status": 200/4xx,
				"data": {
					"topUpAmount": 110,
					"consumptionAmount": 1000
				}
			}
	* 操作成功: status--200
	* 操作失败：status--4xx, data-null

<div id='添加客户端访问记录'></div>


* **25. 添加客户端访问记录**
	* Name: addClientSourceLog
	* 请求内容：`{sourceUrl: “google.com”, playerName: “vince”, platformId: “1”, clientType: “web”/”h5”/”app”, accessType: “register”/”login”}`
	* 响应内容：`{"status": 200/4xx}`
	* 操作成功: status--200
	* 操作失败：status--4xx, data-null

<div id='获取玩家最新额度'></div>

* **26. 获取玩家最新额度**
	* functionName: getCreditInfo
	* 获取玩家最新额度信息
	* 请求内容：{}
	* 响应内容：
		*
			```
			{
			"status": 200,
			"data": {
				“gameCredit”: 0,  //额度
				"validCredit": 95,  //有效额度
				"lockedCredit": 139,  //锁定额度
				"taskData": {  //奖励任务信息
					"_id": "587aef85b01dcb0f601146ae",
					"playerId": "586c73ef1a029c91a9d8fc56",
					"type": "PlayerTopUpReturn",
					"rewardType": "PlayerTopUpReturn",  //奖励类型
					"platformId": "381bf8a5d013d2273382edee",
					"eventId": "58522ddd7358ce136acc1a89",
					"useConsumption": true,
					"isUnlock": false,
					"initAmount": 139,
					"currentAmount": 139,  //奖励额度
					"_inputCredit": 0,
					"unlockedAmount": 0,  //已解锁额度
					"requiredUnlockAmount": 2085,  //需要解锁额度
					"inProvider": false,
					"createTime": "2017-01-15T03:41:57.682Z",
					"data": null,
					"targetGames": [],  //目标游戏
					"targetProviders": [],  //目标提供商
					"status": "Started",  //任务状态
					}
				}
			}
	* 操作成功: status--200, data--额度信息
	* 操作失败：status--4xx, data-null

<div id='修改玩家电话'></div>

* **27. 修改玩家电话**
	* Name: updatePhoneNumberWithSMS
	* 请求内容：`（若有验证旧号码和用getSMSCode获取新号码验证码）{platformId: 1, playerId: 123, smsCode: 1234}（若只验证旧号码或无验证）{platformId: 1, playerId: 123, newPhoneNumber: 15876748763, smsCode: 1234}`
	* 响应内容：`{ "status": 200/4xx}`

<div id='登入后获取手机验证码'></div>

* **28. 登入后获取手机验证码**
	* Name:sendSMSCodeToPlayer
	* 请求内容：
		*
			```
			{
				platformId:1,
				purpose: “updateBankInfo”,
				useVoiceCode: true, //选填|Boolean| 是否使用语音验证码
			},
				platformId: 平台ID
				purpose: 验证用途，可收入内容如下：
					“registration” - 注册
					“oldPhoneNumber” - 修改电话时的电话验证（旧号码）
					”updatePassword” - 更新密码
					“updateBankInfo” - 更新支付信息
	* 响应内容：`{“status”: 200/4xx}`

<div id='通过验证码验证手机'></div>

* **29. 通过验证码验证手机**
	* Name: verifyPhoneNumberBySMSCode
	* 请求内容：
		*
			```
			{
				smsCode: “2654
			}
				“smsCode” - SMS 验证码

	* 响应内容：`{"status": 200/4xx}`
	* 操作成功: status--200 （成功验证）
	* 操作失败：status--4xx （验证失败）

<div id='玩家前端自助判断升级'></div>


* **30. 玩家前端自助判断升级**
	* 已登录玩家自助升级
	* name: manualPlayerLevelUp
	* 请求内容：{}
	* 响应内容：
	* 请求成功：status--200,"data": {"message": "恭喜您从 (当前等级) 升级到(当前等级),获得 xx元、xx元共x个礼包"}
	* 请求失败：status--453, errorMessage--充值金额不足, 有效投注不足。

<div id='玩家当前额度'></div>

* **31. 玩家当前额度**
    * functionName: getCreditDetail
	* 获取已登录玩家额度
	* 请求内容：
	    ```
	    {}
	    ```
	* 操作成功：
		```
		status: 200
		data: {  
			gameCreditList: [{  游戏大厅内额度列表  
				nickName: 大厅名称
				chName: 大厅中文名称
				validCredit: 额度
				status: 大厅状态,0表示正常,1表示维护中
				providerId: 大厅ID
			}],
			credit: 本地自由额度
			finalAmount: 帐号中的总馀额（含自由本地+锁定本地+游戏馀额）
			sameLineProviders: {    同一条线路的供应商有哪些
			    例子: 序号: ["大厅ID"]
				0: ["47", "55" ],
				1: ["16", "20", "70", "85"],
			},
			lockedCreditList: [{    锁大厅额度列表   
				nickName: 大厅组名称
				lockCredit: 本地锁大厅额度  
				list: [{    大厅列表  
					providerId: 大厅ID
					nickName: 大厅名称  
					validCredit: 额度
					status: 大厅状态,0表示正常,1表示维护中
				}]  
            }]
        }
        ```
	* 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='登入后获取提款信息'></div>

* **32. 登入后获取提款信息**
	* functionName: getWithdrawalInfo
	* 获取提款信息
	* 请求内容：
	    ```
        platformId: 必填|String|平台ID
        ```
	* 请求成功：
		```
		status: 200
		data:
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
        ```
	* 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='编辑玩家QQ'></div>

* **33. 编辑玩家QQ**
	* Name:updatePlayerQQ
	* 请求内容：`{qq: xxxxx (第一次绑定可选择不填写,第二次修改必填)},`
	* 响应内容：
		* 第一次绑定，没填qq
			```
			 {
				 "status": 200
			}
			编辑，有填qq
			{
				"status": 200
				“data”: 提案资料........
			}
			编辑，没有有填qq
			{
				"status": 405,
				"name": "DataError",
				"message": "INVALID_DATA",
				"errorMessage": "数据无效"
			}
	* 请求失败：`{"status": 420,"errorMessage": "验证失败, 请先登录","data": null}`

<div id='编辑玩家wechat'></div>

* **34. 编辑玩家wechat**
	* Name:updatePlayerWeChat
	* 请求内容：`{wechat: xxxxx (第一次绑定可选择不填写,第二次修改必填)},`
	* 响应内容：
		* 第一次绑定，没填wechat
			```
			{
				"status": 200
			}
			编辑，有填wechat
			{
				"status": 200
				“data”: 提案资料........
				}
			编辑，没有有填wechat
			{
				"status": 405,
				"name": "DataError",
				"message": "INVALID_DATA",
				"errorMessage": "数据无效"
			}
	* 请求失败：`{"status": 420,"errorMessage": "验证失败, 请先登录","data": null}`


<div id='编辑玩家email'></div>

* **35. 编辑玩家email**
	* Name:updatePlayerEmail
	* 请求内容：`{email: xxxxx (第一次绑定可选择不填写,第二次修改必填)},`
	* 响应内容：
		* 第一次绑定，没填email
			```
			{
				"status": 200
			}
			编辑，有填email
			{
				"status": 200
				“data”: 提案资料........
			}
			编辑，没有有填email
			{
				"status": 405,
				"name": "DataError",
				"message": "INVALID_DATA",
				"errorMessage": "数据无效"
			}
	* 请求失败：`{"status": 420,"errorMessage": "验证失败, 请先登录","data": null}`

<div id='登入金百利直播间'></div>

* **36. 登入金百利直播间** //35
	* 注：玩家必须已登入，并且属于金百利平台下的玩家才可使用
	* Name: loginJblShow
	* 请求内容：{},
	* 响应内容：
		*
			```
			{
				"status": 200,
				"data": {
					"url": "[https://www.jblshow.com](https://www.jblshow.com)" // URL 为金百利API所返回的url
					}
				}
	* 请求失败：`{"status": 420,"errorMessage": "验证失败, 请先登录","data": null}`

<div id='获取玩家基本信息'></div>


* **37. 获取玩家基本信息**
	* Function  name: get
	* 请求内容：`{"playerId": "yunvince6989", // 玩家ID，必填}`
	* 响应内容：`{"status": 200,"data": playerObject // 玩家资料}`
	* 请求失败：
		*
			```
			{
				{
					"status": 405,
					"errorMessage": "数据无效",
					"data": null
				}
			}
	* 注：回文新加入开户设备：registrationInterface: 0 - 后台； 1- Web; 3: - H5; 5 - APP

<div id='用户真名是否有效'></div>

* **38. 用户真名是否有效**
	* Function  name: isValidRealName
	* platformId: 平台ID // 必填，
	* realName: 真实姓名 // 必填
	* 请求内容：`{"platformId": "1",”realName”: “xxx” }`
	* 响应内容：`{"status": 200,"data": playerObject // 玩家资料}`
	* 请求失败：
		*
			```
			{
				{
					"status": 405,
					"errorMessage": "数据无效",
					"data": null
				}
			}

<div id='发送站内信给另一玩家'></div>


* **39. 发送站内信给另一玩家**
	* Function  name: sendPlayerMailFromPlayerToPlayer
	* recipientPlayerId: 收信玩家ID // 必填，
	* title: 标题 // 必填
	* content: 内容 // 选添
	* 请求内容：`{"recipientPlayerId": "yunvince6911","title": "Re: Testing","content": "testing 1 2 3"}`
	* 响应内容：
		*
			```
			{
				"status": 200,
				"data": {
					"__v": 0,
					"platformId": "5733e26ef8c8a9355caf49d8",
					"senderType": "player",
					"senderId": "5a5461ce26e75825c0bd60dd",
					"senderName": "yunvincetestapi1",
					"recipientType": "player",
					"recipientId": "5a5461ce26e75825c0bd60dd",
					"title": "Re: Testing",
					"content": "testing 1 2 3",
					"_id": "5a548d4626e75825c0bd60f4",
					"bDelete": false,
					"hasBeenRead": false,
					"createTime": "2018-01-09T09:37:10.950Z"
				}
			}
	* 请求失败：
		*
			```
			{
				{
					"status": 405,
					"errorMessage": "数据无效",
					"data": null
				}
			}

<div id='发送站内信给管理员'></div>


* **40. 发送站内信给管理员**
	* Function  name: sendPlayerMailFromPlayerToAdmin
	* recipientAdminObjId: 管理员ID
	* title: 标题
	* content: 内容
	* 请求内容：
		*
			```
			{
				"recipientAdminObjId": "57579e3987f68123f74f4ec4",
				"title": "Thank you but",
				"content": "The credits still have not appeared in my account"
			}
	* 响应内容：
		*
			```
			{
				"status": 200,
				"data": {
					"__v": 0,
					"platformId": "5733e26ef8c8a9355caf49d8",
					"senderType": "player",
					"senderId": "5a5461ce26e75825c0bd60dd",
					"senderName": "yunvincetestapi1",
					"recipientType": "admin",
					"recipientId"
					"57579e3987f68123f74f4ec4",
					"title": "Thank you but",
					"content": "The credits still have not appeared in my account",
					"_id": "5a548fc626e75825c0bd60f8",
					"bDelete": false,
					"hasBeenRead": false,
					"createTime": "2018-01-09T09:47:50.491Z"
				}
			}
	* 请求失败：
		*
			```
			{
				{
					"status": 405,
					"errorMessage": "数据无效",
					"data": null
				}
			}

<div id='创建试玩玩家'></div>


* **41. 创建试玩玩家**
	* Function  name: createDemoPlayer
	* 请求内容：
		*
			```
			{
				"platformId": "6", // 平台ID，必填
				"phoneNumber": "13999999999",  // 玩家手机号码，需sms验证时必填，否则选填
				"smsCode": “3963” // 需sms验证时必填，否则可无视
			}
	* 响应内容：
		*
			```
			{
				"status": 200,
				"token”: xxx // 自动登陆token
				"data": {
					"_id": "5a77b3d0224af52933fbd5b7",
					"playerId": "yunvince6860",
					"platform": "5733e26ef8c8a9355caf49d8",
					"name": "fa191435",  // 试玩玩家账号
					"password": "a484b5",  // 试玩玩家密码
				}
	* 请求失败：
		*
			```
			{
				{
					"status": 405,
					"errorMessage": "数据无效",
					"data": null
				}
			}

<div id='获取玩家客户端数据'></div>

* **42. 获取玩家客户端数据**
	* Function  name: getClientData
	* 需要登陆
	* 请求内容：{}
	* 响应内容：`{"status": 200,"data": "test:!"}`

<div id='保存玩家客户端数据'></div>


* **43. 保存玩家客户端数据**
	* Function  name: saveClientData
	* 需要登陆
	* 请求内容：`{"clientData": "test:!"}`
	* 响应内容：`{"status": 200,"data": "test:!"}`

<div id='玩家充值投注排行榜'></div>

* **44. 玩家充值投注排行榜**
	* Function  name: getPlayerBillBoard
	* 请求内容：
		*
			```
			{
				"platformId": "1", // 平台ID
				"mode": "1", // （string类型必须） 1到6 1:累积存款排行 2:单笔存款排行 3:累积提款排行4: 累积投注额 排行 5: 累积输赢排行 6: 单笔输赢倍数排行7: 单笔输赢排行
				"periodCheck": "1", //1到4 1: 本日 2: 本周 3: 本月 4: 无周期(只能用在mode: 1 和 3)
				"hourCheck": 5,  //数字1到24 查询N小时前至今的排行(periodCheck/ hourCheck)二选一
				"recordCount": 10, // 数字，预设10。排行榜数据数量
				"playerId": "ktest123" // 玩家ID，可选不放。查询此玩家排行
				“providerId”: [“18”, “56”]  当 mode 为 4、5、6, 7 时候添加该字段 所有mode 当不填该字段时，默认返回所有
			}
	* 响应内容：
		*
			```
			++++++++++++++++++++++
			{ // 1：累积存款排行
				"status": 200,
				"data": {
					"allDeposit": {
						"boardRanking": [  //排行榜
						{
							"name": "yunvincetestunlock1",
							"rank": 1,
							"amount": 7610
						},
						{
							"name": "yunvincetestrewardpoints3",
							"rank": 2,
							"amount": 6600.455
						} ],
						"playerRanking": { //玩家排行
						"name": "yunvincedx23227",
						"amount": 3400,
						"rank": 7
					}
				}
			}
			2:单笔存款排行
			{
				"status": 200,
				"*": {
					"singleDeposit": {
						"playerRanking": {
							"amount": 100,
							"createTime": "2018-04-24T08:01:35.017Z",
							"rank": 2,
							"name": "yunvincedx3231"
						},
						"boardRanking": [
							{
								"amount": 200,
								"createTime": "2018-04-24T08:01:54.387Z",
								"rank": 1,
								"name": "yunvincedx3234"
							}
						]
					}
				}
			}
			3:累积提款排行
			{
				"status": 200,
				"data": {
					"allWithdraw": {
						"boardRanking": [
							{
								"name": "yunvincedx3231",
								"rank": 1,
								"amount": 400
							}
						],
						"playerRanking": {
							"name": "yunvincedx3234",
							"amount": 200,
							"rank": 3
						}
					}
				}
			}
			4: 累积投注额排行
			{
				"status": 200,
				"data": {
					"allValidbet": {
						"playerRanking": {
							"amount": 300,
							"rank": 1,
							"name": "yunvincedx3234",
							"providerName": "中国联众", //供应商
							"gameName": "项目1，项目2" //游戏项目
						},
						"boardRanking": [
							{
								"amount": 300,
								"rank": 1,
								"name": "yunvincedx3234",
								"providerName": "中国联众",
								"gameName": "项目1，项目2"
							}
						]
					}
				}
			}
			5: 累积输赢排行
			{
				"status": 200,
				"data": {
					"allWin": {
						"playerRanking": {
							"amount": -60,
							"rank": 3,
							"name": "yunvincedx3234",
							"providerName": "中国联众",
							"gameName": "项目1，项目2"
						},
						"boardRanking": [
							{
								"amount": 304,
								"rank": 1,
								"name": "yunvincedx23227",
								"providerName": "中国联众, 腾讯游戏",
								"gameName": "项目1，项目2，项目3，项目4"
							}
						]
					}
				}
			}
			6: 单笔输赢倍数排行
			{
			"status": 200,
				"data": {
					"singleWin": {
						"playerRanking": {
							"validAmount": 100, // 投注额
							"bonusAmount": 40, //玩家赢钱
							"createTime": "2018-04-24T02:05:32.474Z",
							"rank": 3,
							"name": "yunvincedx3234",
							“gameCode”: '3AC2AFA6-355658'
							"gameName": "项目1，项目2",
							"providerName": "中国联众"
						},
						"boardRanking": [
							{
								"validAmount": 100,
								"bonusAmount": 102,
								"createTime": "2018-04-24T03:21:22.726Z",
								"rank": 1,
								"name": "yunvincedx23227",
								"gameName": "项目1，项目2",
								"gameCode": "024E509C-A28F-4F77-9BCF-3B513D83DF92",
								"providerName": "腾讯游戏"
							}
						]
					}
				}
			}
			7: 单笔输赢排行
			{
				"status": 200,
				"data": {
					"singleWinAmount": {
						"playerRanking": {
							"validAmount": 100, // 投注额
							"bonusAmount": 40, //玩家赢钱
							"createTime": "2018-04-24T02:05:32.474Z",
							"rank": 3,
							"name": "yunvincedx3234",
							“gameCode”: '3AC2AFA6-355658'
							"gameName": "项目1，项目2",
							"providerName": "中国联众"
						},
						"boardRanking": [
							{
								"validAmount": 100,
								"bonusAmount": 102,
								"createTime": "2018-04-24T03:21:22.726Z",
								"rank": 1,
								"name": "yunvincedx23227",
								"gameName": "项目1，项目2",
								"gameCode": "024E509C-A28F-4F77-9BCF-3B513D83DF92",
								"providerName": "腾讯游戏"
							}
						]
					}
				}
			}
	* 请求失败：`{"status": 400,"errorMessage": "无效排行模式","data": null}`

<div id='获取回电域名图片验证'></div>


* **45. 获取回电域名图片验证**
	* Function  name: getOMCaptcha
	* service:player
	* 请求内容：`{platformId: ‘4’} // 平台ID`
	* 响应内容：
		*
			```
			{
				"status": 200,
					"data": {
						"randomNumber": 0.06721722742407521, // 确认验证码用
						"b64ImgDataUrl":
						"data:image/jpeg;base64,/9j/4...SZ/9k="  // base 64 图片资料
					}
			}

<div id='请求回电域名配置'></div>

* **46. 请求回电域名配置**
	* Function  name: callBackToUser
	* service:player
	* 请求内容：
		*
			```
			{
				platformId: ‘4’  // 平台ID
				phoneNumber: "13969999999",  // 要拨打的电话号码（注：如果号码为：“”空字符，将拨打玩家绑定的手机号）
				"randomNumber": "0.06721722742407521",  // 确认图片验证码用的随机数字
				"captcha": "8353",  // 图片验证码
				"lineId": "0"  // 线路号，客服可在基础数据设置，不填时，初始值为”0”
			}
	* 响应内容：`{"status": 200,"data": true}`

<div id='获取玩家当日数据'></div>


* **47. 获取玩家当日数据**
	* 获取玩家当天的存款、提款、投注与优惠领取额度。
	* Name: getPlayerAnyDayStatus
	* service:player
	* 请求内容：
		*
			```
			{
				providerIds: [“35”,”38”], // 平台ID，可不填，不填时搜索全部
				startTime: “2018-08-06T09:17:01.970Z” // 选择日期，可不填，不填则为当日
			}
	* 响应内容：
		*
			```
			{
				status: 200/4xx,
				data: {
					topUpAmount: 200, // 当日存款额度
					consumptionAmount: 1488, // 当日投注额
					bonusAmount: 0, // 当日输赢值
					rewardAmount: 50 // 当日领取优惠额度
				}
			}
	* 操作成功: status--200, data--新的站内信内容
	* 操作失败：status--4xx, data-null

<div id='客户QnA重置密码'></div>


* **48. 客户QnA重置密码**
	* Name:resetPassword
	* 请求内容：必须根据以下下组合
		* 1.  name （返回密保问题）
		* 2.  name, smsCode, phoneNumber （重置密码方式1）
		* 3.  name, answer （重置密码方式2）
		* 4. name, code （重置密码方式3 code为inquireAccountByPhoneNumber 返回的code）
		*
				```
				{
					platformId: “4” // 必填
					name: “dx44224” // 必填 （玩家账号）
					smsCode: “4422” // 短信验证码
					phoneNumber: “17355544411“ // 玩家电话号码
					answer: [{quesNo: “1”, ans: “1111”}, {quesNo: “2”, ans: “哈哈哈”}] //密保问题和答案
					code : “5678” 识别码（详见：inquireAccountByPhoneNumber）
				},

	* 响应内容：
		*
			```
			{
				"status": 200,
				"data": {
					“phoneNumber”: 117******111 // 组合1（只填写name）时才会出现
					"name": "dx44224",
					"playerId": "8473",
					"createTime": "2018-07-26T03:12:36.763Z",
					“realName”: “隔壁老王”, // 玩家有填写名字才出现
					"password": "888888", // 组合2，3，4 才会出现
					"questionList": [
						{
							"id": 1,
							"type": 1,
							"title": "填写银行账号后4位（必需回答正确）"
							“option”: ‘city’
						} ] // 只填写name时才会返回问题
				}
			}
	* 请求失败：`{"status": 42x,"errorMessage": "","data": null}`

<div id='电话号码查找账号'></div>

* **49. 电话号码查找账号**
	* Name: inquireAccountByPhoneNumber
	* 请求内容：`{platformId: “4” // 必填smsCode: “4422” // 必填, 短信验证码phoneNumber: “17355544411“ // 必填, 玩家电话号码},`
	* 响应内容：
		*
			```
			{
				"status": 200,
				"data": {
					"code": 6309, // 10分钟内有效
					"list": [
						{
							"name": "dx44224",
							"realName": "",
							"playerId": "8473",
							"createTime": "2018-07-26T03:12:36.763Z"
						}
					]
				}
			}
	* 请求失败：`{"status": 42x,"errorMessage": "","data": null}`

<div id='获取接收代理转账记录'></div>

* **50. 获取接收代理转账记录**
	* name: getReceiveTransferList
	* service:player
	* 请求内容：
		* ```
			{
				platformId: “1”, //平台ID - 必填 **
				startTime: “”, //开始时间
				endTime: “”, //结束时间
				requestPage: 1, //请求第几页
				count: 10 //每页数据条数（默认为10条）
			}
			**必需先登录玩家
			**当只传platformId时，默认返回当前月的数据
	* 响应内容：
		* ```
			{
				"status": 200,  
				"data":{  
					"stats": {  
						"totalCount": 100, //数据总数  
						"totalPage": 10, //一共多少页  
						"currentPage": 1, //当前页  
						"totalReceiveAmount": 1000 //查询结果总收账金额  
					}  
					"list": [{
						amount: 1000, //该条数据总金额  
						time: "2018-08-06T01:02:08.957Z", //结算时间
						status: "Success"，//提案状态  
						proposalId: "412665"，//提案号  
						withdrawConsumption： 5000，//流水（非倍数）  
						providerGroupId： 1，//锁大厅ID，当 “” 代表是自由额度  
						}
					]  
				}
	* 操作失败：status--4xx, data-null, errorMessage:””
	* **当没有数据时候，为[] (即空数组)

<div id='生成游客账号51'></div>

* **51. 生成游客账号** //
	* name: createGuestPlayer
	* service:player
	* 请求内容：
		* ```
			{
				platformId: “1”, //平台ID - 必填 **
				guestDeviceId: “DEVICEID120213” // 设备ID, 必填
				phoneNumber: “11755555555” //非必填， 填写则绑定电话号码+设备ID
				accountPrefix: “e” // 账号名字前缀，非必填，默认”g”
				referralId: "4322" //推荐人邀请码
			}
	* 响应内容：`{status: 200/4xx, data: playerObj, token: xxxxxxxx}`
	* 操作成功： status--200, data--玩家对象(包含token), token--玩家atock, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）
	* 操作失败： status--4xx, data--null

<div id='电话号码注册与登陆'></div>

* **52. 电话号码注册与登陆** //
	* name: playerLoginOrRegisterWithSMS
	* service:player
	* 请求内容：
		* ```
			{
				platformId: “1”, //平台ID - 必填
				**phoneNumber: “17355544411“ // 玩家电话号码, 必填
				smsCode: “8888”, // 短信验证码, 必填
				accountPrefix: “e” // 玩家帐号前缀，可不填
				checkLastDeviceId： true // 选填，检查上次登入设备是否与这次一样
				referralId: 邀请码
			}
	* 响应内容：`{status: 200/40x, data: playerObject}`
	* playerObject包含token，用于重新建立链接, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）
	* 操作成功： status--200, data--玩家对象
	* 操作失败： status--4xx, data--null

<div id='修改生日日期'></div>


* **53. 修改生日日期**
	* name: changeBirthdayDate
	* service:player
	* 请求内容：`{date: "2018-08-06T01:02:08.957Z"  // 生日日期, 必填}//需登入`
	* 响应内容：`{status: 200/40x, data: playerObject}`
	* 操作成功： status--200, data--玩家对象
	* 操作失败： status--4xx, data--null

<div id='玩家电话号码与密码登入'></div>


* **54. 玩家电话号码与密码登入**
	* 玩家登录接口.
	* name: phoneNumberLoginWithPassword
	* 请求内容：`{platform Id: “1”, phoneNumber: “01155555555”, password: “13224”, captcha: “34223”}`
	* platform Id: 玩家注册平台
	* phoneNumber: 玩家手机号
	* password: 玩家密码
	* captcha: 验证码 (登录三次失败后需要填验证码)
	* clientDomain: 登陆域名
	* deviceId: 设备号
	* checkLastDeviceId： true // 选填，检查上次登入设备是否与这次一样
	* 响应内容:`{status: 200/40x, data: playerObject} playerObject包含token，用于重新建立链接`
	* 操作成功： status--200, data--玩家对象
	* 操作失败： status--40x, data--null

<div id='绑定手机号'></div>


* **55. 绑定手机号**
	* 玩家登录接口.
	* name: setPhoneNumber
	* 请求内容：`{platform Id: “1”, number: “01155555555”, smsCode: “3223”}`
	* platform Id: 玩家注册平台
	* number: 玩家手机号
	* smsCode: SMS验证码（请到getSMSCode填写setPhoneNumber进purpose获取）
	* 响应内容:`{status: 200/40x, data: {number: “01155555555”}}`
	* 操作成功： status--200
	* 操作失败： status--40x

<div id='更新设备号'></div>

* **56. 更新设备号**
	* service: player
	* name: updateDeviceId
	* 请求内容：`{deviceId: “deviceId123”} //需登入`
	* 响应内容:`{status: 200/40x, data: {number: “01155555555”}}`
	* 操作成功： status--200
	* 操作失败： status--40x

<div id='获取更新密码令牌'></div>

* **57. 获取更新密码令牌**
	* service: player
	* name: generateUpdatePasswordToken
	* 请求内容：
		* ```
			{
				platformId: “4”,
				name: “username1” // 玩家账号
				phoneNumber: “11755444444” // 验证电话号码
				smsCode: “5478” //短信验证码，从getSMSCode获取
			}// 需调用getSMSCode接口, purpose: “updatePassword”
	* 响应内容:`{status: 200/40x, data: {token: “xsda45w7f2d4”}}`
	* 操作成功： status--200
	* 操作失败： status--40x

<div id='令牌更新密码'></div>

* **58. 令牌更新密码**
	* service: player
	* name: updatePasswordWithToken
	* 请求内容：`{token: “token123435435df”,password: “password123” // 玩家要更换的密码}`
	* 响应内容:`{status: 200/40x}`
	* 操作成功： {status--200，data: true}
	* 操作失败： {status--40x，errorMessage: ””}

<div id='获取玩家最近玩的两个游戏'></div>

* **59. 获取玩家最近玩的两个游戏**
	* service: player
	* name: getLastPlayedGameInfo
	* 需登陆: 是
	* 请求内容：{}
	* 响应内容:`{status: 200/40x}`
	* 操作成功： `{status--200，data: true}`
	* 操作失败： `{status--40x，errorMessage: ””}`

<div id='APP设置登陆密码'></div>

* **60. APP设置登陆密码**
    * service: player
    * name: settingPlayerPassword
    * 需登陆: 是
    * 请求内容：{password: 'abc123'}
    * 响应内容:`{status: 200/40x}`
    * 操作成功： `{status--200，data: {text:'密码添加成功'}}`
    * 操作失败： `{status--40x，errorMessage: ””}`

<div id='获取玩家推广域名防红和短链转换'></div>

* **61. 获取玩家推广域名防红和短链转换**
    * name: getPromoShortUrl
    * service:player
    * 请求内容
        * ```
            {
                url: “www.xindeli666.com/123”, // 玩家网址
                playerId: '123' //玩家Id
            }
    * 响应内容：
        * ```
            {
              "status": 200,
              "data": {
                "shortUrl": "http://t.cn/AiQwVM4y",
                "name": "testmk12"
              }
            }
    * 操作失败：status--4xx, data-null, errorMessage:””

<div id='手机号码与密码注册'></div>

* **62. 手机号码与密码注册**
    * name: registerByPhoneNumberAndPassword
    * service:player
    * 请求内容：
        * ```
            {
                platformId: “1”, //平台ID - 必填
                phoneNumber: “17355544411“ // 玩家电话号码, 必填
                smsCode: "2451", // 短信验证码, 必填
                password: "888888", //密码, 必填
            }
    * 响应内容：`{status: 200/40x, data: playerObject}`
    * playerObject包含token，用于重新建立链接
    * 操作成功： status--200, data--玩家对象
    * 操作失败： status--4xx, data--null
    
<div id='手机号码与密码登录'></div>

* **63. 手机号码与密码登录**
    * name: loginByPhoneNumberAndPassword
    * service:player
    * 请求内容：
        * ```
            {
                platformId: “1”, //平台ID - 必填
                phoneNumber: “17355544411“ // 玩家电话号码, 必填
                password: "888888", //密码, 必填
            }
    * 响应内容：`{status: 200/40x, data: playerObject}`
    * playerObject包含token，用于重新建立链接
    * 操作成功： status--200, data--玩家对象
    * 操作失败： status--4xx, data--null
    
<div id='游客账号绑定手机号码与密码'></div>

* **64. 游客账号绑定手机号码与密码**
    * name: setPhoneNumberAndPassword
    * service:player
    * 请求内容：
        * ```
            {
                phoneNumber: "17355544411" // 玩家电话号码, 必填
                password: "888888", //密码, 必填,
                smsCode: "2451", // 短信验证码, 必填
            }
    * 响应内容：
        * ```
            {
              "status": 200,
              "data": {
                "phoneNumber": "12345678802"
              }
            }
    * 操作成功： status--200, data--{"phoneNumber": "12345678802"}
    * 操作失败： status--4xx, data--null
    
<div id='通过电话号码重置密码'></div>

* **65. 通过电话号码重置密码**
    * name: updatePasswordByPhoneNumber
    * service:player
    * 请求内容：
        * ```
            {
                platformId: "1" //平台ID
                phoneNumber: "17355544411" // 玩家电话号码, 必填
                newPassword: "888888", //新密码, 必填
                smsCode: "2451", // 短信验证码, 必填
            }
    * 响应内容：
        * ```
            {
              "status": 200,
              "data": {text:'密码修改成功'}
            }
    * 操作成功： status--200, data--{text:'密码修改成功'}
    * 操作失败： status--4xx, data--null

<div id='查询银行卡归属地'></div>

* **66. 查询银行卡归属地**
    * name: getBankcardInfo
    * service:player
    * 请求内容：
        * ```
            {
                bankcard: "6215982582010042122" //银行卡号
            }
    * 响应内容：
        * ```
            {
              "status": 200,
              "data": {
                  "tel": "95533",
                  "bankName": "建设银行",
                  "cardType": "借记卡",
                  "url": "www.ccb.com",
                  "ret_code": 0,
                  "area": "河南 - 信阳",
                  "brand": "福农卡",
                  "cardNum": "6215982582010042122",
                  "simpleCode": "CCB",
                  "formatBankName": "建设银行",
                  "logo": "http://app2.showapi.com/banklogo/ccb.png"
              }
            }
    * 操作成功： status--200
    * 操作失败： status--4xx, data--null

<div id='设置头像信息'></div>

* **67. 设置头像信息**
	* Name: updatePlayerAvatar
    * service:player
	* 请求内容：
        * ```
            {
                avatar: "myFace.jpg",      //头像
                avatarFrame: "myFrame.jpg" //头像框
            }
	* 响应内容：
		* ```
			{
				"status": 200
				“data”: 玩家资料
			}
    * 操作成功： status--200, data--玩家资料
    * 操作失败： status--4xx, data--null

# 注册意向服务：
用于关注玩家注册过程中是否遇到问题，便于改进登录界面以及在适当的时候为玩家提供帮助。

### service: registrationIntention
### 功能列表：

<div id='添加注册意向记录'></div>

* **1. 添加注册意向记录**
	* name: add
	* 请求内容：`{ createTime: “2016-03-08” operationList:”Input username; Input passowrd”, ipAddress: “127.0.0.1”, status: 1, username: “xxxxx”, mobile: “13566666666”, playerId:”xxxxx”}`
	* createTime: 创建记录的时间 （使用服务端的时间为准）
	* operationList: 操作记录，使用数组保存操作记录
	* ipAddress: 用户的IP地址 （在服务端取）
	* status: 注册过程的状态，分为 1--意向， 2--验证码，3--成功，4--失败
	* username: 玩家注册时使用的用户名
	* mobile: 玩家注册时使用的手机号
	* playerId: 玩家注册成功之后的玩家ID
	* 响应内容：`{status: 200/4xx, data: registrationIntentionObj/null }`
	* 操作成功：status--200, data--带ID 的注册意向记录
	* 操作失败：status--4xx, data--null

<div id='修改注册意向记录'></div>


* **2. 修改注册意向记录**
	* name: update
	* 请求内容：`{_id:”xxxxxx”, createTime:”2016-03-08”, ...}`
	* _id: 注册意向记录ID
	* 其他内容参见添加记录时的说明
	* 响应内容：`{status: 200/40x}`
	* 修改成功： `status--200`
	* 修改失败： `status--4xx`

# 支付信息服务：

为客户端提供支付与兑换相关服务的接口。 客户端系统为玩家提供了两种方式，在线充值和手工存款充值。 同时也提供玩家使用额度进行奖品兑换的操作。

### service: payment
#### 功能列表：

<div id='申请提款'></div>

* **1. 申请提款**
  * 向系统申请提款
  * functionName: applyBonus
  * 请求内容：
      ```
      amount: 必填|Int|提款额度
      bankId: 选填|Int|多银行卡的选择，若不填就是默认银行卡1
      ```
  * 操作成功:
      ```
      status: 200
      data: 提款提案详情
      ```
  * 操作失败:
      ```
      status: 40x
      data: -
      errorMessage: 错误信息
      ```

<div id='获取提款提案列表'></div>

* **2. 获取提款提案列表**
  * 获取玩家所提交的提款申请列表。
  * functionName: getBonusRequestList
  * 请求内容：
      ```
      startTime: 选填|Date|开始时间
      endTime: 选填|Date|结束时间
      status: 选填|String|提案状态(参考提案状态列表，默认：所有状态)
      ```
  * 操作成功:
      ```
      status: 200
      data: {
          stats: {
              totalCount: 提案总数
              startIndex: 当前页面
              requestCount: 页面总提案数
              totalAmount: 提案总额度
          }，
          records: [提案详情]
      }
      ```
  * 操作失败:
      ```
      status: 40x
      data: -
      errorMessage: 错误信息
      ```

<div id='取消提款申请'></div>

* **3. 取消提款申请**
    * 玩家可以取消已提交的提款申请。(前提是提案状态为未处理)
    * functionName: cancelBonusRequest
    * 请求内容：
        ```
        proposalId: 必填|String|提款提案号
        ```

    * 操作成功:
        ```
        status: 200
        data: {
            proposalId: 提款提案号
        }
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取充值记录'></div>

* **4.  获取充值记录**
    * 获取玩家充值记录
    * functionName: getTopupList
    * 请求内容：
        ```
        topUpType: 选填|Int|1:手动充值 2:在线充值 3:支付宝充值 4：个人微信
        startTime：选填|Date|开始时间
        endTime：选填|Date|结束时间
        startIndex: 选填|Int|记录开始index， 用于分页
        requestCount: 选填|Int|请求记录数量，用于分页
        sort: 选填|Boolean|按时间排序, false:降序， true：正序
        bDirty: 选填|Boolean|充值是否已被占用（已申请过奖励）
        bSinceLastConsumption: 选填|Boolean|是否是最后投注后的充值
        bSinceLastPlayerWithDraw: 选填|Boolean|是否是最后提款后的充值
        ```
    * 操作成功:
        ```
        status: 200
        data: {
            stats: {
                totalCount: 提案总数
                startIndex: 当前页面
                requestCount: 页面总提案数
                totalAmount: 提案总额度
            }，
            records: [{  //查询记录列表
                "amount": 充值额度
                "createTime": 充值时间
                bDirty: 充值记录是否已使用
            }]
        }
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取省份列表'></div>

* **5.  获取省份列表**
	* Name: getProvinceList
	* 请求内容：
	    ```
        {}
        ```
	* 响应内容：
		```
        {
            status: 200/4xx,
				data: [{
					id: “001”,
					name: “北京”
				},{
					id: “002”,
					name: “河北”
				}],
			errorMsg: “xxxxxxx”
			}
	* Status: 操作状态， 200--成功， 4xx--失败
	* queryId: 查询Id, 用于对结果进行路由
	* Provinces: 省份列表. 内容Id, name.

<div id='获取市列表'></div>

* **23.  获取市列表**
	* Name: getCityList
	* 请求内容：`{provinceId: “xxxxx”}`
	* provinceId: //省份Id（必填），查询该省中的城市列表。
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:[{
					id: “001”,
					provinceId: “001”,
					name: “北京”
				},{
					id: “002”,
					provinceId: “002”,
					name: “石家庄”
				}], errorMsg: “xxxxxxxxxx”
			}
	* Status: 操作状态，200--成功， 4xx--失败
	* queryId: 查询Id, 用于对结果进行路由
	* Cities: 城市列表

<div id='获取区县列表'></div>

* **24.  获取区县列表**
	* Name: getDistrictList
	* 请求内容：`{provinceId: “xxxxx”, cityId: “xxxxxx”}`
	* provinceId: //查询省份Id（必填）。
	* cityId: //查询城市Id（必填）,查询该省、市下的所有区县列表。
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:[{
					id: “001”,
					provinceId: “001”,
					cityId: “001”,
					name: “朝阳区”
				},{
					id: “002”,
					provinceId: “001”,
					cityId: “001”,
					name: “东城区”
				}]
			}
	* Status: 操作状态， 200--成功， 4xx--失败
	* queryId: 查询Id
	* Districts: 区县列表

<div id='获取银行卡类型列表'></div>

* **25. 获取银行卡类型列表**
	* Name: getBankTypeList
	* 请求内容：{}
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data: [{
					bankTypeId: 001,
					alias: “ICBC”,
					name: “中国工商银行”,
					iconURL: “www.net.com/xxx.png”
				},{
					bankTypeId: 002,
					alias: “BOC”,
					name: “中国银行”,
					iconURL: “”
				}]
			}
	* Status: 操作状态， 200--成功， 4xx--失败
	* data: 银行类型列表, 包含内容如下：
	* bankTypeId: 银行类型Id
	* code: 银行类型代码
	* name: 银行类型名称
	* iconURL: 银行类型logo地址
	* bankflag: 银行类型1或0 // 1 是提款，0 是存款
	* errorMsg: 详细错误信息

<div id='手工订单超时后的再次确认请求'></div>

* **26. 手工订单超时后的再次确认请求**
	* Name: checkExpiredManualTopup
	* 请求内容：`{proposalId: xxxx}`
	* 响应内容：`{status: 200/4xx, data: true/false Todo::返回内容会更新 }`
	* Status: 操作状态， 200--成功， 4xx--失败
	* data: true/false 手动充值成功／手动充值失败
	* errorMsg: 详细错误信息

<div id='获取符合首冲条件的充值记录'></div>

* **27. 获取符合首冲条件的充值记录**
	* Name: getValidFirstTopUpRecordList
	* 请求内容：
		* ```
			{
				period: xxx  //1:首冲 2:周首冲 3:月首冲
				"startIndex": 0,  //记录开始index， 用于分页
				"requestCount": 100  //请求记录数量，用于分页,
				“sort”: true  //按时间排序, false:降序， true：正序
			}
	* 响应内容：
		* ```
			{
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
			}

<div id='getValidTopUpReturnRecordLis'></div>

* **28. getValidTopUpReturnRecordList**
	* 请求内容：获取符合充值返点的充值记录
		* ```
			{
				"startIndex": 0,  //记录开始index， 用于分页
				"requestCount": 100  //请求记录数量，用于分页,
				“sort”: true  //按时间排序, false:降序， true：正序
			}
	* 响应内容：
		* ```
			{
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
			}

<div id='获取符合充值奖励的充值记录'></div>

* **29. 获取符合充值奖励的充值记录**
	* Name: getValidTopUpRewardRecordList
	* 请求内容：
		* ```
			{
				"startIndex": 0,  //记录开始index， 用于分页
				"requestCount": 100  //请求记录数量，用于分页,
				“sort”: true  //按时间排序, false:降序， true：正序
			}
	* 响应内容：
		* ```
			{
				"status": 200,  //200:成功 / 4xx:失败
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"totalAmount": 100,  //查询结果总额度
						"startIndex": 0  //查询结果记录开始index
					},"records": [  //查询记录列表
					{
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
			}

<div id='获取充值申请记录'></div>

* **30. 获取充值申请记录**
	* 获取玩家充值申请记录
	* Name: getTopupHistory
	* 请求内容：
		* ```
			{
				"topUpType": "2",  //1:手动充值 2:在线充值 3:支付宝充值 4.微信充值 5.快捷支付
				"startTime": "xxxx", //date类型
				"endTime": "xxx", //date类型
				"startIndex": 0,  //记录开始index， 用于分页
				"requestCount": 100  //请求记录数量，用于分页,
				“sort”: true  //按时间排序, false:降序， true：正序
				“status”: “Success”  //提案状态（参见提案状态列表）默认：Success
			}
	* 响应内容：
		* ```
			{
				"status": 200,  //200:成功 / 4xx:失败
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"totalAmount": 100,  //查询结果总额度
						"startIndex": 0  //查询结果记录开始index
					},"records": [  //查询记录列表
						"_id": "57ff2909b1a94bd1d796e6ce",
						"proposalId": "Yun399071",  提案id
						"type": "1",  充值类型，1手动 2在线
						"mainType": "TopUp",  提案类型
						"status": "Pending",  提案状态
						"__v": 0,
						"noSteps": true,
						"userType": "2",
						"entryType": "1",
						"priority": "0",
						"data": {  提案详细内容
						"amount": "100",  充值额度
						"lastBankcardNo": "1234",  银行卡号
						"bankTypeId": "DD",  银行卡类型
						"depositMethod": "1",  存款方法
						"provinceId": "1",  省id
						"cityId": "1",  城市id
						"districtId": "1",  区域id
						"playerId": "Yun1071",  玩家id
						"playerObjId": "57be8bf1c8a650901043bbea",
						"platformId": "5733e26ef8c8a9355caf49d8",
						"playerLevel": "57d8b3a20a74d857514bd6fa",
						"bankCardType": "DD",
						"platform": "4",  平台id
						"playerName": "vince1",  玩家名字
						“validTime: “”
						"creator": {
							"type": "player",
							"name": "vince1",
							"id": "Yun1071"
						}]
					}
				}

<div id='获取支付宝单笔限额'></div>

* **31. 获取支付宝单笔限额**
	* Name: getAlipaySingleLimit
	* 需要登陆
	* 请求内容：{}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"bValid": true,
					"singleLimit": 50
				}
			}
	* 获取在线支付单笔限额（微信扫码和支付宝扫码）
	* Name: getMerchantSingleLimits
	* 需要登陆
	* 请求内容：{}
	* 响应内容：`{"service":"payment","functionName":"getMerchantSingleLimits","data":{"status":200,"data":{"bValid":true,"singleLimitList":{"wechat":5000,"alipay":5000}}},"requestId":"87071499767112122"}`

<div id='获取手工充值状态'></div>

* **32. 获取手工充值状态**
	* Name: getCashRechargeStatus
	* 需要登陆
	* 请求内容：{}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"proposalId": "601202",
					"requestId": "99596609802",
					"status": "Pending",
					"result": {
						"validTime": "2017-11-10 12:15:44",
						"createTime": "2017-11-10 11:15:44",
						"cardOwner": "钟清佑",
						"bankCardNo": "6214832019066393",
						"bankTypeId": "11",
						"requestId": "99596609802"
					},
					"inputData": {
						"amount": 100,
						"lastBankcardNo": "123",
						"bankTypeId": "4",
						"depositMethod": "1",
						"provinceId": "1",
						"cityId": "1",
						"districtId": "1",
						"userAgent": {
							"ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.101 Safari/537.36",
								"browser": {
									"major": "60",
									"version": "60.0.3112.101",
									"name": "Chrome"
								},"engine": {
									"version": "537.36",
									"name": "WebKit"
								},"os": {
									"version": "x86_64",
									"name": "Linux"
								},"device": {
									"type": null,
									"model": null,
									"vendor": null
								},"cpu": {
									"architecture": "amd64"
								}
							}
						},
						"restTime": 3592
					}
				}
			}

<div id='支付宝充值状态'></div>

* **33. 支付宝充值状态**
	* Name: getPlayerAliPayStatus
	* 请求内容：
	* bPMSGroup:true // 是否使用 PMS 分配商户组（默认 fales），使用后 FPMS 后台的分组功能将无效，并且回文的 maxDepositAmount 将由 PMS 提供(补充：如果开启了 FPMS 进行财务操作，会忽略此参数，直接由 FPMS 判断自创支付宝卡的状态。）。
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": false(如果有正常状态的支付宝 “data”: {“valid”:true, “maxDepositAmount”: 2000, "lastNicknameOrAccount": "苏晨"})
				minDepositAmount:10 // 玩家该组最低的个人支付宝充值限额。
			}
	* 请求失败:
		* ```
			{
				"status": 413,
				"message": "Payment is not available",
				"errorMessage": "支付维护中"
			}

<div id='微信充值状态'></div>

* **34. 微信充值状态**
	* Name: getPlayerWechatPayStatus
	* 请求内容：`{bPMSGroup:true // 是否使用 PMS 分配商户组（默认 fales），使用后 FPMS 后台的分组功能将无效，并且回文的 maxDepositAmount 将由 PMS 提供（补充：如开启了 FPMS 直接财务操作，将忽略此参数，直接判断自创的 FPMS 微信状态）。}`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": false(如果有正常状态的微信 “data”: {“valid”:true, “maxDepositAmount”: 2000})
			}
	* 请求失败:`{"status": 413,"message": "Payment is not available","errorMessage": "支付维护中"}`


<div id='是否首冲'></div>

* **35. 是否首冲**
	* Name: isFirstTopUp
	* 请求内容：{}
	* 响应内容：`{"status": 200,"data": false(如果是首冲 “data”: true)}`
	* 请求失败:`{"status": 420,"errorMessage": "验证失败, 请先登录","data": null}`

<div id='获取在线支付单笔限额(微/支)'></div>

* **36. 获取在线支付单笔限额（微信扫码和支付宝扫码）**
	* Name: getMerchantSingleLimits
	* 需要登陆
	* 请求内容：{}
	* 响应内容：`{"service":"payment","functionName":"getMerchantSingleLimits","data":{"status":200,"data":{"bValid":true,"singleLimitList":{"wechat":5000,"alipay":5000}}},"requestId":"87071499767112122"}`

<div id='获取pms可用银行卡类型'></div>

* **37. 获取pms可用银行卡类型**
	* Name: requestBankTypeByUserName
	* 需要登陆
	* 请求内容：`{clientType: 1, supportMode: “new”}`
	* clientType: 客户端类型， 1--PC浏览器, 2--h5, 4--app
	* supportMode: “new”/”old” // 从 PMS 派卡有两种版本（旧、新）， 不发送该参数为旧的模式（补充：如果开启 FPMS 直接财务操作，则忽略此参数，由 FPMS 判断可用的银行类型。注意不要与 bPMSGroup 混淆）
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				queryId: “xxxxxxxx”，
				data:[,{
					"depositMethod":"1",
					"data":[{
						"id":11,
						"bankTypeId":11,
						"name":"招商银行",
						"status":"1"
					},{
						"id":174,
						"bankTypeId":174,
						"name":"其它",
						"status":"1"
						}]
					},{
						"depositMethod":"2",
						"data"[{
							"id":11,
							"bankTypeId":11,
							"name":"招商银行",
							"status":"1"
						}]],
						errorMsg: “xxxxx”
					}
	* status: 操作状态， 200--成功，4xx--失败 （包含用户不允许存款的code）
	* queryId:”查询路由”
	* errorMsg: 错误信息
	* despiteMethod：存款方式 // 1:网银转账 2:atm 3：银行柜台 4：支付宝转账 5：微信转账
	* 备注说明：可能其中之一存在了存款方式，但是data中无可用的银行类型。返回有改类型和该类型有银行卡才代表这个类型方式可以用 maxDepositAmount //单笔最高限额，不同 despiteMethod 将有不同限额，此数据由 PMS 传至 FPMS。
	* lastOnlineBankingName //上次网银转帐提案（不分状态）的存款人姓名。当depositMethod:"1"（网银）才会出现。
	* lastDepositProviceId //上次ATM存款提案（不分状态）的『省份id』（注意是玩家提交的、不是派卡的数据）。当depositMethod:"2"（ATM）才会出现。
	* lastDepositCityId //上次ATM存款提案（不分状态）的『城市id』（注意是玩家提交的、不是派卡的数据）。当depositMethod:"2"（ATM）才会出现。
	* lastDepositorName //上次银行柜台提案（不分状态）的存款人姓名。当depositMethod:"3"（银行柜台）才会出现。

<div id='创建通用接口充值提案(通用充值接口)'></div>

* **38. (通用充值接口) 创建通用接口充值提案**
	* 玩家输入在线充值金额，系统返回跳转链接。
	* name: createCommonTopupProposal
	* 请求内容：
		* ```
			{
				amount: 300,
				clientType: xxx，
				bonusCode: 2211,
				limitedOfferObjId: _1255443,
				topUpReturnCode: ‘code_01’
			}
	* amount: 充值金额,
	* clientType (客户端类型):
		* 1-- Web 电脑端
		* 2-- H5 手机端
		* 4-- APP APP端
	* bonusCode: (可选) 优惠代码
	* limitedOfferObjId: (可选) 指定充值应用于哪个秒杀礼包
	* topUpReturnCode: (可选) 指定充值应用于哪个秒存送金
	* 响应内容：`{status: 200/4xx, data:”http://url”, errorMessage: “xxxxxxx”}`
	* isExceedTopUpFailCount: false, // true= 报错 玩家连续 （充值方式）失败 X 次后前端提醒
	* isExceedCommonTopUpFailCount: false, // true= 报错 玩家连续 （通用充值）失败 X 次后前端提醒
	* status: 操作状态， 200--成功， 4xx--失败
	* data: 跳转链接
	* errorMessage: 详细错误信息

<div id='获取通用充值最高和最低可接收充值额度(通用充值接口)'></div>

* **39. (通用充值接口) 获取通用充值最高和最低可接收充值额度**
	* 请求玩家可使用的充值额度
	* name: getMinMaxCommonTopupAmount
	* 请求内容：`{clientType: xxx}`
	* clientType: 客户端类型， 1--浏览器(browser), 2--手机h5，4手机app
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:{xxx},
				errorMessage: “xxxxxxx”
			}
	* status: 操作状态， 200--成功， 4xx--失败
	* data:
		* ```
			{
				minDepositAmount: 最低充值额
				maxDepositAmount: 最高充值额
			}
	* errorMessage: 详细错误信息

<div id='获取玩家(总)有效投注额'></div>

* **40. 获取玩家『总』有效投注额**
	* name: getPlayerConsumptionSum
	* 请求内容：`{platformId: “1”, //平台IDname: “testabc1”, //会员帐号}`
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:{xxx},
				errorMessage: “xxxxxxx”
			}
	* status: 操作状态， 200--成功， 4xx--失败
	* data: `{"consumptionSum": 6875 //『总』有效投注额}`
	* errorMessage: 详细错误信息

<div id='快付充值接口(第三方上下分接口)'></div>

* **41. (第三方上下分接口) 快付充值接口**
	* name: createFKPTopupProposal
	* 请求内容：`{amount: “100”, //充值额度bankCode: “testabc1”, //收银台代码}`
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:{xxx},
				errorMessage: “xxxxxxx”
			}
	* status: 操作状态， 200--成功， 4xx--失败
	* data: {}
	* errorMessage: 详细错误信息

# 充值意向服务：
用于关注玩家充值过程中是否遇到问题，便于改进充值界面以及在适当的时候为玩家提供帮助。

### service: topupIntentionadd
#### 功能列表：

<div id='添加充值意向'></div>

* **1. 添加充值意向**
	* name: add
	* 请求内容：
		* ```
			{
				playerId: “xxxxxx”,
				createTime: “2016-03-08”,
				operationList: “input money”,
				topupChannel:”xxxxxx”,
				topupMoney: 50,
				Status: 3,
				proposalId: “xxxxxx”,
				topupTime: “2016-03-08 11:50:00”,
				finishTime: “2016-03-08 12:00:00”
			}
	* playerId: 玩家ID
	* createTime: 创建时间 (由服务器设置)
	* operationList: 操作记录， 以数组方式保存操作列表
	* topupChannel: 充值渠道
	* topupMoney: 充值金额
	* status(充值的状态):
		* 1--意向
		* 2--充值中
		* 3--成功
		* 4--失败
	* proposalId: 充值产生的提案号
	* topupTime: 充值时间， 玩家点击充值并产生提案号的时间
	* finishTIme: 完成充值的时间， 收到充值服务网关反馈的时间
	* 响应内容:`{status: 200/400, data: topupIntentionObj/null}`
	* 操作成功： status--200, data: 带ID的充值意向对象
	* 操作失败： status--40x, data: null

<div id='修改充值意向'></div>

* **2. 修改充值意向**
	* name: update
	* 请求内容:`{_id:”xxxxx”, playerId: “xxxxxxx”, ...}`
	* _id: 充值意向记录ID
	* 其他信息参见添加记录说明。
	* 响应内容：`{status: 200/40x}`
	* 操作成功： status--200
	* 操作失败： status--40x

# 玩家消费记录服务：
提供玩家消费记录相关服务的接口。

### service: consumption
#### 功能列表：

<div id='获取最近消费记录'></div>

* **1. 获取最近消费记录**
	* 获取玩家最近的15条消费记录
	* name: getLastConsumptions
	* 请求内容：`{playerId: “xxxxxx”, startIndex: 0, requestCount: 15}`
	* requestCount: 请求最近的消费记录条数
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},"records": []  //查询记录列表
				}
			｝
	* 请求成功： status--200, data--消费记录列表和总的记录数量，详细信息见下表。
	* 请求失败： status--4xx, data--null
	* [消费记录信息表](#消费记录信息表)

<div id='消费记录信息表'></div>

# <head>
### 消费记录信息表
|**字段名**|**字段说明**|
|--|--|
|id|消费记录ID|
|playerId|玩家ID|
|providerId|游戏提供商ID|
|gameId|游戏ID|
|gameType|游戏类型|
|amount|消费额度|
|createTime|消费时间|
|detail|消费详细信息|
# <head>

<div id='查询消费记录'></div>

* **2. 查询消费记录**
	* 根据条件查询消费记录信息
	* name: search
	* 请求内容：
		* ```
			{
				startTime: “2016-03-08”,
				endTime: “2016-03-10”,
				providerId: “xxxx”,
				gameId: “xxxxx”,
				startIndex: 0,
				requestCount: 15
			}
	* startTime: 查询消费开始时间
	* endTime: 查询消费结束时间 (默认为本周)
	* providerId: 内容提供商ID (可不填)
	* gameId: 游戏ID (可不填)
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},"records": []  //查询记录列表
				}
			｝
	* 操作成功： status--200, data--查询到的消费记录列表
	* 操作失败： status--4xx, data--null

<div id='新消费通知(以后再做)'></div>

* **3. 新消费通知(以后再做)**
	* 玩家有新的消费记录之后，向客户端发出通知，主要用于显示玩家等级的提升。
	* name: newConsumption
	* 下发内容：`{status: 200/4xx, data: consumptionRecord}`
	* 下发成功：status--200, data--消费记录
	* 下发失败：status--4xx, data--null

# 玩家等级服务：
提供玩家等级相关接口服务

### service: playerLevel
#### 功能列表：

<div id='获取玩家等级'></div>

* **1. 获取玩家等级**
	* 获取玩家等级信息
	* name: getLevel
	* 请求内容：`{playerId: “xxxxxxxx”}`
	* 响应内容：`{status: 200/4xx, data: playerLevelObj}`
	* 操作成功：status--200, data--玩家等级信息, 详情参见下表
	* 操作失败：status--4xx, data--null
	* 玩家等级信息表//todo

<div id='获取等级优惠信息'></div>

* **2. 获取等级优惠信息**
	* 获取玩家当前等级的
	* name: getLevelReward
	* 请求内容：`{“playerId”: “1”}`
	* playerLevelId: 玩家等级ID
	* 响应内容：`{status: 200/4xx, data: levelRewardObj/null}`
	* 操作成功：status--200, data--等级优惠信息对象

<div id='获取全部玩家等级'></div>

* **3. 获取全部玩家等级**
	* name： getAllLevel
	* 请求内容：`{“playerId”: “1”}`
	* playerId: 玩家ID
	* 响应内容：`{status: 200/4xx, data: playerLevels/null}`
	* 操作成功：status--200, data--玩家所在平台的全部等级信息
	* 成功时：
		* ```
			{
				status: 200/4xx,
				"data": {
					[{
						levelUpConfig: [ //升级设定{
							andConditions: true, //true =>AND, false =>OR// 玩家最小充值额
							topupLimit: 2000,//玩家最小消费额
							topupPeriod: “WEEK”, //值可以是“DAY”, “WEEK”, “NONE”
							consumptionLimit: 20000,
							consumptionPeriod: “WEEK”,//值可以是“DAY”, “WEEK”, “NONE”//本例说明玩家在一个星期内必须同时充值2000以上以及消费20000以上才能达到下一个等级
							consumptionSourceProviderId: [“16”] 游戏提供商ID,用来检测投注额。 [ ]空 代表全部提供商
						},...],
						Name: “Normal”, //等级名
						Value: 0, //等级值
						Reward: [{
							bonusCredit: 20 //奖励额
						}],
						list:[{
							displayTextContent: "内文",
							displayTitle: "标题",
							displayId: "0",
							playerLevel:xxx
						}]
					},...]
				｝

<div id='玩家升级'></div>

* **4. 玩家升级**
	* name: upgrade
	* 请求内容：{}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"message": "恭喜您从 普通会员 升级到 高级,获得30元共1个礼包"
				}
			}
	* 请求失败:
		* ```
			{
				"status": 420,
				"errorMessage": "验证失败, 请先登录",
				"data": null
			}

# 奖励信息服务：
提供一组与奖励活动相关的服务接口

### service: reward
#### 功能列表：

<div id='获取奖励活动列表'></div>

* **1. 获取奖励活动列表**
	* functionName: getRewardList
    * 获取玩家所在平台正在举行的奖励活动列表
    * 请求内容：
        ```
        platformId: 必填|String|平台ID
        clientType: 选填|String|1：WEB，2：H5，4：APP
        ```
    * 操作成功:
        ```
        status: 200
        data: {
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
                  }
            
        }
        ```
    * 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取玩家奖励任务'></div>

* **2. 获取玩家奖励任务**
	* 获取玩家正在执行的玩家奖励任务，当前系统仅支持一个奖励任务。
	* name: getRewardTask
	* 请求内容：`{playerId: “xxxxx”}`
	* playerId: 玩家ID
	* 响应内容：
		* ```
			{
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
					"targetProviders": [  目标提供商{
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
					}],
					"status": "Started"
				}
			}
	* 请求成功：status--200, data--奖励任务对象, 详情参见下表。
	* 请求失败：status--4xx, data--null
	* 奖励任务对象说明// todo 与客户端进行沟通之后再定

<div id='获取玩家申请奖励'></div>

* **3. 获取玩家申请奖励**
	* 获取玩家以申请的奖励。
	* name: getPlayerRewardList
	* 请求内容：
		* ```
			{
				playerId: “xxxxx”,
				startIndex: 0,
				requestCount: 10,
				rewardType: xxx,
				startTime:xxx,
				endTime: xxx，
				eventCode: xxx,
				 status:xxx
				}
	* status 请参考提案状态表// 特殊eventCode
	* "YHDM”: 优惠代码
	* playerId: 玩家ID
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},
					"records": [{
						“playerId”: //玩家id
						“playerName”: //玩家名
						“createTime”: //生成时间
						“rewardType”: //优惠类型
						"rewardAmount”: //优惠金额
						"eventName”: //优惠名
						“eventCode”: //优惠识别码
						“status”: //优惠领取状态
						"promoCodeName”: //优惠代码名, 只有优惠代码优惠会显示
					}]  //查询列表
				}
			｝
	* 请求成功：status--200, data--奖励列表。
	* 请求失败：status--4xx, data--null

<div id='申请提前洗码'></div>

* **4. 申请提前洗码**
	* 玩家向系统提前申请未结算的洗码。
	* name: requestConsumeRebate
	* 请求内容：`{playerId: “xxxxxx”, eventCode: xxx}`
	* playerId: //玩家ID
	* eventCode:XXXX //（非必填/默认所有代码）该洗码的优惠代码，用在有两种洗码的情况
	* 响应内容：`{status: 200/4xx }`
	* 结算结果将以通知的方式告诉客户端。这里将返回是否启动了结算。
	* 请求成功：status--200
	* 请求失败：status--4xx

<div id='获取申请优惠相关信息'></div>

* **5. 获取申请优惠相关信息**
    * functionName: getRewardApplicationData
	* 获取申请优惠需要的条件信息
	* 请求内容：
	    ```
	    platformId: 必填|String|平台ID
	    code: 必填|String|优惠唯一代码
	    ```
	* 操作成功：
		```
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
        ```
	* 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='申请奖励活动'></div>

* **6. 申请奖励活动**
	* 玩家申请当前平台的奖励活动
	* functionName: applyRewardEvent
	* 请求内容：
	    ```
	    code: 必填|String|优惠唯一代码
	    topUpRecordId: 选填|String|存款唯一ID (存送金组)
	    festivalItemId: 选填|String|特别节日列表单一节日的objId, 可从接口getRewardApplicationData取得
	    appliedObjIdList: 选填|String Array|幸运单注的投注列表的objId(数组中有一个可领 返回200 会忽略数组中不满足条件的id
	    ```
	* 操作成功：
	    ```
	    status: 200
	    data: {
	        rewardAmount: 优惠额度
	        selectedReward: {
	            //随机抽奖组优惠
	            rewardType: 1 - 现金; 2 - 优惠代码-B(需存款)；3-优惠代码-B（不存款）；4- 优惠代码 C; 5- 积分； 6- 实物奖励
	        }
        }
        ```
	* 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

<div id='获取消费返点额度'></div>

* **7. 获取消费返点额度**
	* 获取玩家消费返点额度
	* name: getConsumeRebateAmount
	* 请求内容：{eventCode: xxxx}
	* 响应内容：
		* ```
			{
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
			}
	* 正常响应内容：status--200, data--消费返点数据：成功, false：失败
	* 异常响应内容：status--4xx, error: Object

<div id='获取推荐玩家列表'></div>

* **8. 获取推荐玩家列表**
	* 获取推荐玩家列表
	* name: getPlayerReferralList
	* 请求内容：`{requestCount: 10, startIndex： 0}`
	* 响应内容：
		* ```
			{
				"status": 200／4xx,  //状态
				"data":{
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},"records": [  {
						"name": vince,  //玩家姓名
						"playerId": v001,  //玩家id
						registrationTime: xxx  //玩家注册时间
						topUpSum: 100  //玩家充值总额
						…  //玩家详细信息其余字段
						"rewardStatus": “Valid”  //推荐奖励状态：Valid(可申请), Invalid(未达到条件), Expired(已过期), Applied(已申请)
					}, ... ]
				}
			}
	* 正常响应内容：status--200, data--推荐玩家列表数据：成功, false：失败
	* 异常响应内容：status--4xx, error: Object

<div id='获取玩家累计签到信息'></div>

* **9. 获取玩家累计签到信息**
	* 获取玩家累计签到信息, 需要玩家登陆才可请求该接口. 注：这是对应旧的全勤签到。若要获取『全勤签到（组）』的相关资料，请使用getSignBonus
	* name: getConsecutiveLoginRewardDay
	* 请求内容：`{code: “ljqd”}`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"dayIndex": 1,  //累计签到奖励天数
					"isApplied": false  //是否已领取
				}
			}
	* 正常响应内容：status--200,成功, false：失败
	* 异常响应内容：status--4xx, error: Object

<div id='获取优惠代码'></div>

* **10. 获取优惠代码**
	* name: getPromoCode
	* 请求内容:`{"platformId": "1", "status": "1"}`
	* playerId: 玩家Id
	* platformId: 平台Id
	* status （选填):
		* 1 未领取 AVAILABLE
		* 2 已领取 ACCEPTED
		* 3 已过期 EXPIRED
	* 响应内容:
		* ```
			{
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
						"condition": "有新存款<span class=\"c_color\">(1以上)</span> 且尚未投注",
						"expireTime": "2017-09-26T16:00:00.000Z",
						"bonusCode": 6547,
						"isViewed”: false
					}],
					"bonusList": [] // 中奖名单列表
				}
			}
	* 正常响应内容：status--200,成功, false：失败
	* 异常响应内容：status--4xx, error: Object

<div id='申请优惠代码'></div>

* **11. 申请优惠代码**
	* name: applyPromoCode
	* 请求内容:`{"promoCode": "7620"}`
	* 响应内容:
		* ```
			{
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
			}
	* 正常响应内容：status--200,成功, false：失败
	* 异常响应内容：status--4xx, error: Object

<div id='秒杀礼包列表'></div>

* **12. 秒杀礼包列表**
	* name:getLimitedOffers
	* request:`{ "platformId": "6","status": "5"}`
	* Status:
		* 0:初始状态
		* 1:可以秒杀
		* 2:秒杀成功
		* 3:付款成功
		* 4:已售完
		* 5:已弃标
	* Success response:
		* ```
			{
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
			}
	* Failed Response: status--4xx, error: Object
	* 申请秒杀礼包（意向）
	* name: applyLimitedOffers
	* 请求内容：`{limitedOfferObjId: “xxx”}`
	* limitedOfferObjId : 秒杀礼包ID
	* 响应内容：
		* ```
			{
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
			}
	* 获取时间内产生秒杀礼包的优惠
	* name: getLimitedOfferBonus
	* 请求内容：`{platformId: 6, period:0 }`
	* period : 小时（几个小时内的产生的秒杀礼包优惠）
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
					"accountNo": "XXX",
					"bonus": 200,
					"time": "2018-01-09T01:03:39.288Z"
				}]
			}
	* 设置秒杀礼包对玩家的显示
	* name: setLimitedOfferShowInfo
	* 请求内容：`{showInfo: 0 }`
	* showInfo : 0:不显示,1:显示
	* 响应内容：`{status: 200/4xx, errorMessage: “xxxxxxx”}`

<div id='获取充值优惠'></div>

* **13. 获取充值优惠**
	* 获取目前正在进行中的充值优惠。
	* name: getTopUpPromoList
	* 请求内容：`{"clientType": "1"}`
	* clientType (客户端类型):
		*  1--浏览器
		*  2--手机App
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
					"bValid": false,
					"singleLimit": 0,
					"type": 99,
					"status": 2,
					"rewardPercentage": 3
				},{
					"type": 98,
					"status": 2,
					"rewardPercentage": 3
				},{
					"type": 2,
					"status": 2,
					"rewardPercentage": 3
				}]
			}
	* 请求成功：status--200, data--奖励任务对象, 详情参见下表。
	* 请求失败：status--4xx, data--null
	* type: 充值方式表
		* 1 - 9 请参照 充值方式表
		* 98 - 微信转账支付
		* 99 - 支付宝转账支付
	* status: 支付状态 （玩家目前是否能使用此支付方式）
		* 1 - 能
		* 2 - 不能
	* rewardPercentage: 奖励比率 （如果是3，充值后优惠数是充值总数的3%）
	* singleLimit: 单次充值最高允许额度 （只限支付宝转账支付出现）
	* bValid: 支付状态 （跟status一样，不过是以boolean显示，只限支付宝转账支付出现）
	* 注： 若支付并没有优惠，就不会显示再此API内。但是若有设置此支付的优惠但是优惠比率为空，充值方式便仍然会出现。

<div id='设置优惠代码显示'></div>

* **14. 设置优惠代码显示**
	* name: setBonusShowInfo
	* 请求内容：`{ platformId: 6, showInfo:0 }`
	* showInfo : 0:不显示,1:显示
	* 响应内容：`{status: 200/4xx, errorMessage: “xxxxxxx”}`

<div id='获取签到信息'></div>

* **15. 获取签到信息**
	* 当有签到奖励时，显示每一阶的领取状态
	* name: getSignInfo
	* 请求内容：
		* ```
			{
				"code": "cunsongjin02",  // 优惠系统代码，选填，不填则获取最新签到优惠
				“platformId”: 1  // 选填，若要在非登入状态下获取信息则必填
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"startTime": "2017-11-01T07:55:08.633Z",
					"endTime": "2018-05-25T07:55:08.656Z",
					"deposit": 15,
					"effectiveBet": 15,
					"list": [{
						“step”: 1
						"status": 1,
						"bonus": 200,
						"requestedTimes": 20,
					}]
				}
			}
	* 请求成功：status--200, data--奖励任务对象, 详情参见下表。
	* 请求失败：status--4xx, data--null
	* startTime: 周期开始时间
	* endTime: 周期结束时间
	* deposit: 需求存款额度
	* effectiveBet: 需求流水额度
	* list: 签到阶级记录列表
	* status: 领取优惠状态
		* 0 - 玩家不符合优惠条件
		* 1 - 玩家不符合优惠条件，能够申请/领取
		* 2 - 玩家已申请/领取优惠
	* bonus: 奖金
	* step: 第几天
	* requestedTimes: 流水倍数

<div id='获取签到奖励'></div>

* **16. 获取签到奖励**
	* 一键领取所有可获得的签到奖励。若没有，则返回报错。
	* name: getSignBonus
	* 请求内容：`{eventCode: “knxyz”}`
	* 响应内容：`{ "status": 200,"data": {}}`
	* 请求成功：status--200
	* 请求失败：status--4xx, data--null
	* eventCode: 系统代码 (optional)

<div id='标记优惠代码已读'></div>

* **17. 标记优惠代码已读**
	* 标记优惠代码已读。
	* name: markPromoCodeAsViewed
	* 请求内容：`{"promoCode": "7620"}` // 优惠代码
	* 响应内容：
		* ```
			{
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
			}
	* 请求成功：status--200
	* 请求失败：status--4xx, data--null

<div id='获取存送金信息'></div>

* **18. 获取存送金信息**
	* 获取玩家存送金优惠状态。即使没登入，只要发送平台ID仍可获取。可否获取奖励是以最新的存款来判断。
	* name: getSlotInfo
	* 请求内容：
		* ```
			{
				"code": "cunsongjin02",  // 优惠系统代码，选填，不填则获取最新存送金优惠
				“platformId”: 6  // 选填，若要在非登入状态下获取信息则必填
			}
	* 响应内容：
		* ```
			{
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
			}
	* 请求成功：status--200
	* 请求失败：status--4xx, data--null

* **19. 获取某优惠领取排行榜**
	* 获取申请优惠需要的条件信息。
	* name: getRewardRanking
	* 请求内容：
		* ```
			{
				"platformId": "1", //平台ID-必填
				“playerId”: “abc123”, //玩家ID （当需要玩家自身排行的位置时填写该字段）
				"code": "778", //优惠code-必填
				"sortType": 1, //以什么类型排行-必填1.单笔最高优惠金额2.总累积最高金额3.累积成功领取次数4.领取时间
				"startTime": "2018-12-03T00:00", //开始时间
				"endTime": "2018-12-07T23:59", //结束时间
				"usePaging": true, //是否使用分页（默认是 true）
				"requestPage": 1, //请求第几页（默认是 1 第一页）
				"count": 100 //每页数据条数（默认为10条）
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"stats": {
						"totalCount": 1, //数据总数
						"totalPage": 1, //一共多少页
						"currentPage": 1, //当前页
						"totalReceiveCount": 1, //优惠总领取次数
						"totalAmount": 30, //优惠总金额
						"totalPlayerCount": 1 //总参与人数
					},** 当没有数据时候，为[] (即空数组)
					"rewardRanking": [{
						"username": "yunvincetest001", //玩家账号
						"receiveCount": 1, //该玩家领取次数
						"totalReceiveAmount": 30, //该玩家总领取金额
						"highestAmount": "30", //单笔最高优惠金额
						"data": { //本次（最近一次）优惠相关数据（投注记录拿领取优惠的最近一次数据）
							"rewardAmount": "30", //优惠金额
							"depositAmount": “100”,//存款金额 （存送金组、秒杀礼包、提升留存组）
							"rewardTime": "2018-12-05T06:48:30.455Z", //领取时间
							"betTime": "2018-12-05T09:38:40.460Z", //下注时间 （幸运注单，盈利翻倍组，投注优惠额组, 等等）
							"betType": "和", //下注类型 （幸运注单，盈利翻倍组，投注优惠额组, 等等）
							"betAmount": 200, //下注金额 （幸运注单，盈利翻倍组，投注优惠额组, 等等）
							"winAmount": -200, //派彩金额 （幸运注单，盈利翻倍组，投注优惠额组, 等等）
							"winTimes": -1 //盈利倍数 （幸运注单，盈利翻倍组，投注优惠额组, 等等）
						}
					}] //当发生数据有playerId的时候返回该字段
					playerRanking: { // 玩家自身排行信息  
						index: 99 // 玩家自己当前排名位置  
						username: 'etest00001'，  
						highestAmount: 1000,  
						receiveCount: 10,  
						totalReceiveAmount: 1000,  
						data: {  
							rewardAmount: 100，  
							depositAmount: 100,  
							rewardTime: "2018-08-06T01:02:08.957Z",  
							betTime: "2018-08-06T01:02:08.957Z",  
							betAmount: 10,  
							betType: '和',  
							winAmount: 100,  
							winTimes: 10  
						}  
					}
				}
			}
	* 请求成功：status--200
	* 请求失败：status--4xx

<div id='获取玩家洗码数据'></div>

* **20. 获取玩家洗码数据**
	* 获取玩家洗码数据
	* name: getConsumeRebateDetail
	* 请求内容：`{eventCode: xxxx}` // 必填
	* 响应内容：
		* ```
			{
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
	* 正常响应内容：status--200, data--消费返点数据：成功, false：失败
	* 异常响应内容：status--4xx, error: Object

<div id='获取开放式优惠代码'></div>

* **21. 获取开放式优惠代码**
	* name: getOpenPromoCode
	* 请求内容: `{"platformId": "1", "status": "1"}`
	* playerId: 玩家Id
	* platformId: 平台Id
	* status （选填):
		* 1 未领取 AVAILABLE
		* 2 已领取 ACCEPTED
		* 3 已过期 EXPIRED
  * 响应内容:
	  * ```
		  {
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
			}
   * 正常响应内容：status--200,成功, false：失败
   * 异常响应内容：status--4xx, error: Object

* **22. 获取存送申请日限剩余可领取值**
    * functionName: getTopUpRewardDayLimit
	* 需要先在后台设定优惠日限
	* 请求内容：
        ```
        platformId: 必填|String|平台ID
        rewardCode: 必填|String|优惠唯一代码
        ```
	* 操作成功：
		```
        status: 200,  
        data: {
            applied: 已申请数量
            balance: 剩余数量
        }
        ```
	* 操作失败:
        ```
        status: 40x
        data: -
        errorMessage: 错误信息
        ```

# 游戏信息服务：
提供游戏信息相关服务的接口.

### service: game
#### 功能列表：

<div id='获取游戏类型列表'></div>

* **1. 获取游戏类型列表**
	* 从服务端获取游戏类型列表
	* name: getGameTypeList
	* 请求内容：`{requestId: “4895863”}`
	* 响应内容：`{status: 200/4xx, data: gameTypeList}`
	* 成功： status--200, data--游戏类型列表, 详情请参见下表。
	* 失败： status--4xx, data--null
	* 游戏类型对象信息 (todo)
# <head>
| Property Name | Property Description |
|--|--|
|  |  |
|  |  |
|  |  |
# <head>

<div id='获取游戏列表'></div>

* **2. 获取游戏列表**
	* 通过相关参数，获取游戏列表。如果不传游戏类型参数，则取排名(待议)靠前的N个游戏。
	* 游戏状态分类：1--正常， 2--维护, 3--关闭
	* name: getGameList
	* 请求内容：
		* ```
			{
				type: “xxxx”,
				providerId: “xxxxxx”,
				playGameType: 1,
				requestCount: 20,
				startIndex: 0
			}
	* type: 游戏类型，可选参数，默认查询所有类型排名靠前的N个游戏。
	* providerId: 游戏提供商ID, 可选参数，默认查询所有游戏提供商的游戏。
	* playGameType: 1: flash, 2: html5
	* requestCount: 取出N条数据, 可选参数， 默认查询20条游戏数据
	* startIndex: 返回数据跳过个数，用于分页，可选参数， 默认值为0
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},"gameList": []  //查询列表
				}
			｝
	* 成功： status--200, data: 游戏信息列表和总数量, 详情参见下表。
	* 失败： status--4xx, data: null
	* 游戏信息对象属性表 (todo)
# <head>
|Property Name| Property Description |
|--|--|
|  |  |
|  |  |
|  |  |
|  |  |

# <head>

<div id='获取内容提供商(CP)列表'></div>

* **3. 获取内容提供商(CP)列表**
	* 获取玩家所在平台的所有游戏提供商列表。
	* name: getProviderList
	* 请求内容：`{platformId: “x”}` or `{playerId: “xxxxxxxx”}`
	* 响应内容：`{status: 200/4xx, data: [providerObject]/null}`
	* 成功： status--200, data--游戏提供商信息列表，详情参见下表。
	* 失败： status--4xx, data--null,
	* 游戏提供商对象属性表(todo)

# <head>
|Property Name|Property Description  |
|--|--|
|  |  |
|  |  |
|  |  |
# <head>

<div id='将本地额度转出到CP账号的游戏额度'></div>

* **4.  将本地额度转出到CP账号的游戏额度 (该接口支持游戏间互转)**
	* name: transferToProvider
	* 请求内容：`{playerId: “xxxxxx”, providerId: “xxxxxxxx”}`
	* playerId: 玩家ID (必填)
	* providerId: 内容提供商ID (必填)
	* 响应内容: `{status: 200/4xx, data: true/false/null}`
	* 成功：status--200, data--转出成功, true; 转出
	* 失败：status--200, data--null

<div id='将游戏额度从CP账号转入到本地额度'></div>

* **5.  将游戏额度从CP账号转入到本地额度**
	* name: transferFromProvider
	* 请求内容：`{playerId: “xxxxxx”, providerId: “xxxxxxxxx”}`
	* playerId: 玩家ID (必填)
	* providerId: 内容提供商ID (必填)
	* 响应内容：`{status: 200/4xx, data: true/false/null}`
	* 成功：status--200, data--转出成功, true; 转出
	* 失败：status--200, data--null

<div id='获取登录游戏的URL'></div>

* **6.  获取登录游戏的URL**
	* 需要玩家登陆
	* name: getLoginURL
	* 请求内容：`{gameId: “002”, clientDomainName: “xxx”, clientType: 1}`
	* gameId: 游戏Id
	* clientDomainName: 客户端域名
	* clientType: 1：pc，2: 手机
	* 响应内容：
		* ```
			{
				"status": "200",
				"errorMessage": "No Error",
				data: { "gameURL": "[http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc](http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc)" }
			}
	* Status: 成功--200, 失败--4xx。
	* errorMessage: 失败时，失败的详细原因。
	* gameURL: 成功申请到的登录游戏的URL.

<div id='获取试玩游戏的URL7'></div>

* **7.  获取试玩游戏的URL**
	* 需要玩家登陆
	* name: getTestLoginURL
	* 请求内容：`{gameId: “002”，clientDomainName: “xxx”, clientType:1}`
	* gameId: 游戏Id
	* clientDomainName: 客户端域名
	* clientType: 1. Browser 2.App
	* 响应内容：
		* ```
			{
				"status": "200",
				"errorMessage": "No Error",
				data: {
					"gameURL":
					"[http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc](http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc)" }
				}
	* Status: 成功--200, 失败--4xx。
	* errorMessage: 失败时，失败的详细原因。
	* gameURL: 成功申请到的登录游戏的URL.

<div id='获取试玩游戏的URL8'></div>

* **8.  获取试玩游戏的URL**
	* 不需要玩家登陆
	* name: getTestLoginURLWithOutUser
	* 请求内容：
		* ```
			{
				platformId:“4”,　
				gameId: “002”,　
				clientDomainName: “xxx”,
				clientType:1
			}
	* gameId: 游戏Id
	* 响应内容：
		* ```
			{
				"status": "200",
				"errorMessage": "No Error",
				data: {
					"gameURL":
					"[http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc](http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc)" }
				}
	* Status: 成功--200, 失败--4xx。
	* errorMessage: 失败时，失败的详细原因。
	* gameURL: 成功申请到的登录游戏的URL.

<div id='获取玩家游戏中的账户信息'></div>

* **9.  获取玩家游戏中的账户信息**
	* Name: getGameUserInfo
		* `{username: “gSven”, platformId: “001”, providerId: “002”}`
	* platformId: 平台Id
	* providerId: 游戏提供商Id
	* 响应内容：
		* ```
			{
				status: “200/4xx”,
				data: {
					platformId: “001”,
					providerId: “002”,
					gameUser: “blgSven”,
					password: “gswet3fk”
				},
				errorMessage: “xxxxxxx”
			}
	* status: 成功--200, 失败--4xx
	* username, platformId, providerId用于给FPMS进行函数的路由
	* errorMessage: 失败时，失败的详细原因
	* gameUser: 玩家游戏账号名.
	* Password: 玩家游戏密码

<div id='修改玩家游戏账号的密码'></div>

* **10.  修改玩家游戏账号的密码**
	* name: modifyGamePassword
	* 请求内容：
		* ```
			{
				username: “gSven”,
				platformId: “YunYou”,
				providerId: “Billizard”,
				oldPassword: “xxxxx”,
				newPassword: “cccccc”
			}
	* username: 玩家在平台的用户名
	* platformId: 平台Id
	* providerId: 游戏提供商Id
	* oldPassword: 旧密码
	* newPassword: 新密码
	* 响应内容：
		* ```
			{
				status: “200/4xx”,
				data: {
					username: “gSven”,
					platformId: “YunYou”,
					providerId:“Billizard”
				},
				errorMessage: “xxxxxx”
			}
	* status: 成功--200, 失败--4xx
	* username, platformId, providerId用于给FPMS进行函数的路由
	* errorMessage: 失败时，失败的详细原因

<div id='请求立即收录玩家的消费记录'></div>

* **11.  请求立即收录玩家的消费记录**
	* 请求立即收录玩家最新的消费记录。响应内容会有不同，会响应收录处理过程的内容。状态会返回201, 并返回progressContent来报告处理的过程。收录完成之后，CPMS会向FPMS调用添加消费记录API来添加玩家的消费记录。
	* name: grabPlayerTransferRecords
	* 请求内容：`{platformId: “001”, providerId: “002”}`
	* platformId: 平台Id
	* providerId: 游戏提供商Id, 如果Id为null, 则查询玩家所有平台的消费记录。
	* 响应内容：
		* ```
			{
				status: “20x/4xx”,
				data : {
					username: “gSven”,
					platformId: “001”,
					providerId: “002”,
					progressContent: “xxxxxx”
				},
				errorMessage: “xxxxx”,
			}
	* Status: 200--收录完成，CPMS会调用添加消费记录API来添加新收录到的消费记录。 201--正在收录中，可以通过查看progressContent内容来得到处理内容。 4xx--收录过程出现异常，可以查看errorMessage来得到错误内容。
	* platformId, providerId用于client进行函数的路由
	* progressContent: 处理流程的内容
	* errorMessage: 错误信息

<div id='收藏游戏'></div>

* **12.  收藏游戏**
	* name: addFavoriteGame
	* 请求内容：`{gameId: “1”}`
	* gameId: 游戏Id
	* 响应内容：`{status: “20x/4xx”, data/errorMessage: “xxxxx”}`
	* Status: 200--收藏成功， 4xx--收藏失败
	* errorMessage: 错误信息

<div id='删除收藏游戏'></div>

* **13.  删除收藏游戏**
	* name: removeFavoriteGame
	* 请求内容：`{gameId: “1”}`
	* gameId: 游戏Id
	* 响应内容：`{status: “20x/4xx”, data:null/errorMessage: “xxxxx”}`
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='获取收藏游戏'></div>

* **14.  获取收藏游戏**
	* name: getFavoriteGames
	* 请求内容：`{device：0 //装置/非必填/默认：0（0-全部 , 1-网页，2-H5）`
	* 响应内容：`{status: “20x/4xx”, data: {[gameObj]}/errorMessage: “xxxxx”}`
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='获取游戏分组列表'></div>

* **15.  获取游戏分组列表**
	* name: getGameGroupList
	* 请求内容：`{platformId: “xxx”, requestCount: 10, startIndex}`
	* platformId: 平台Id
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},
					"gameList": []  //查询列表
				}
			｝
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='获取游戏分组详细信息'></div>

* **16.  获取游戏分组详细信息**
	* name: getGameGroupInfo
	* 获取游戏分组游戏，子组信息
	* 请求内容：`{platformId: “xxx”, code: “001”, requestCount: 10, startIndex: 0}`
	* providerId:16 //（非必填/默认全部）供应商ID，过滤组内的游戏供应商
	* platformId: //平台Id
	* code: //分游组代码
	* requestCount: //请求数据量， 默认查询100条游戏
	* startIndex: //返回数据跳过个数，用于分页，可选参数， 默认值为0
	* 响应内容：
		* ```
			{
				status: “20x/4xx”,
				data: {
					"name": "hot1",
					"code": "2",
					"displayName": "火热",
					"games": {
						"stats": {
							"totalCount": 256,
							"startIndex": 0
						},
						"gameList": [{
							"_id" : ObjectId("57a05c4da7ba70af4263d7f5"),
							"bigShow" : "http://img99.neweb.me/PlunderTheSea.jpg",
							"code" : "PlunderTheSea",
							"gameId" : "082452B5-9F09-4A38-A080-109A987C072E",
							"name" : "掠夺大海",
							"gameDisplay":1// 1.横屏 2.竖屏 3.横竖屏 4. 无需设置…..
						},{
						gameObj
						} ...]
					"index":1 // 游戏排列顺序（可在FPMS游戏组中配置）
				}
			}
	* errorMessage: “xxxxx”／null}
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='获取游戏分组树信息'></div>

* **17.  获取游戏分组树信息**
	* name: getGameGroupTreeInfo
	* 获取游戏分组树信息
	* 请求内容：
		* ```
			{
				platformId: “xxx”,
				code: “001”,
				containGames: true/false,
				startIndex: 0,
				requestCount: 10
			}
	* platformId: 平台Id
	* code: 游戏分组code
	* containGames: 是否包含游戏信息
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				"data": {
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},
					"gameGroups": []  //查询列表
					“gameGroupIconUrl”: //游戏组的图标位置（若有 CDN/FTP 相对路径将会拼凑）
				}
			｝
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='搜索游戏'></div>

* **18.  搜索游戏**
	* name: searchGame
	* 请求内容：
		* ```
			{
				platformId: “xxx”,
				providerId:16,
				name: “xxx”,
				type: “1”,
				groupCode: “002”,
				playGameType: 1
			}
	* providerId:16 //（非必填/默认全部）供应商ID，过滤组内的游戏供应商
	* platformId: //平台Id
	* name： //模糊查询游戏名字
	* type： //（非必填/默认全部）游戏类型由CPMS提供，可在游戏提供商功能查询
	* groupCode: //(非必填/默认所有在组内的游戏）游戏组代码。
	* playGameType: //游戏载体 （1: flash, 2: html5）
	* 响应内容：
		* ```
			{
				status: “20x/4xx”,
				data: {[gameObj]}/errorMessage: “xxxxx”
			}
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='查询游戏提供商额度'></div>

* **19.  查询游戏提供商额度**
	* name: getGameProviderCredit
	* 请求内容：`{providerId: “xxx”}`
	* providerId: 提供商Id
	* 响应内容：
		* ```
			{
				status: “20x/4xx”,
				data: { {
					"providerId": "xxx",
					"credit": "0.0"
				} }/errorMessage: “xxxxx”
			}
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='根据游戏组查询游戏'></div>

* **20.  根据游戏组查询游戏**
	* name: searchGameByGroup
	* 请求内容：`{groups: [ “001”, “002” ]}`
	* groups: 游戏分组code数组
	* 响应内容：`{status: “20x/4xx”, data: { [gameObj] }/errorMessage: “xxxxx”}`
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='获取游戏账号密码'></div>

* **21.  获取游戏账号密码**
	* name: getGamePassword
	* 请求内容：`{platformId: xxx, providerId: xxx}`
	* 响应内容：`{status: “20x/4xx”, data: { [gameUserObj] }/errorMessage: “xxxxx”}`
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='修改游戏密码'></div>

* **22.  修改游戏密码**
	* name: modifyGamePassword
	* 请求内容：`{providerId: xxx，newPassword: xxx}`
	* 响应内容：`{status: “20x/4xx”, data: { [gameUserObj] }/errorMessage: “xxxxx”}`
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='获取真人游戏实时详情'></div>

* **23.  获取真人游戏实时详情**
	* name: getLiveGameInfo
	* 请求内容：
		* ```
			{
				platformId: “4” // 必填
				count: 30 // 非必填
				switchNotify: true // notifyLiveGameStatus的开关，false则不返回资料和关闭推送
			}注意，这里的platformId主要是给notifyLiveGameStatus。当调用getLiveGameInfo后，notifyLiveGameStatus 才会推送。
	* 响应内容：
		* ```
			{
				status: “20x/4xx”,
				"data":{  
					"stats": {  
						"totalCount": 1,  
					}  
					"list": [{  
						tableNumber: '123123',  
						dealerName: ‘翠花’,  
						status: 0, 
						totalMakers: 6, //庄赢总数
						totalPlayer: 6, //闲赢总数
						totalTie: 1, //和局总数
						countdown: 15,  
						historyList: [{  
							bureauNo: 12，  
							result: 0，  
							makersPoints：8，  
							playerPoints： 10，  
							pair： 1  
						}]  
					}]/errorMessage: “xxxxx”
				}
			}
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

<div id='服务器推送真人游戏变化'></div>

* **23.  服务器推送真人游戏变化**
	* name: notifyLiveGameStatus
	* 请求内容：{}
	* 响应内容：
		* ```
			{
				status: “20x/4xx”,
				"data":{
					tableNumber： ‘aaa111’,  
					dealerName: ‘翠花’,  
					result: 0,  
					status: 1,  
					countdown: 15，  
					makersPoints: 8，  
					playerPoints: 6  
					pair： 1，  
				}/errorMessage: “xxxxx”
			}
	* Status: 200--操作成功， 4xx--操作失败
	* errorMessage: 错误信息

# 代理服务：
提供代理相关服务的接口。

### service: partner
#### 功能列表：

<div id='代理会员注册'></div>

* **1. 代理会员注册**
	* 代理会员注册接口
	* name:register
	* 请求内容：
		* ```
			{
				name:String,
				platformId: String,
				password:String,
				realName:String,// 非必填
				phoneNumber:Number,
				captcha:String,
			}
	* name: // 代理账号
	* platformId: // 平台id
	* password: // 注册的密码
	* realName: // 代理真实姓名
	* phoneNumber: // 代理手机号
	* captcha: // 使用图片验证码，不需短信验证直接开户
	* smsCode: // 使用短信验证码，则不用图片验证（5/29 目前尚无）
	* email: // 代理邮箱
	* gender: // 代理性别, 1-男，0-女,
	* DOB: // 代理生日
	* qq: // 代理qq号码
	* commissionType: // 非必填，当代理基础数据的『佣金设置』＝前端自选时，可请求（1天输赢:1,7天输赢:2,半月输赢:3,1月输赢:4,7天投注额:5）(5/29 尚无）
	* 响应内容：`{status:200/4xx}`
	* 操作成功： status--200
	* 操作失败： status--4xx

<div id='代理会员注册用户名有效性验证'></div>

* **2. 代理会员注册用户名有效性验证**
	* 用于在注册时，检测玩家的用户名是否有效。
	* name: isValidUsername
	* 请求内容：
		* ```
			{
				name: String
				platformId: String,
			}
	* name: 要验证的用户名
	* platformId:平台id
	* 响应内容：`{status: 200/4xx,data: true/false/null}`
	* 操作成功: status--200, data--true, 有效，false, 用户名已被占用
	* 操作失败：status--4xx, data-null

<div id='代理会员注册验证码'></div>

* **3. 代理会员注册验证码**
	* 代理会员注册验证码接口,从服务端获取验证码， 验证码以base64格式分发给客户端, 客户端接到之后显示出来。
	* name: captcha
	* 请求内容：{}//空对象
	* 响应内容：`{status: 200/40x,data: “base64;pngXfasagGFFSD”}`
	* 操作成功： status--200, data--验证码base64字符串
	* 操作失败： status--40x, data--null

<div id='登录状态验证'></div>

* **4. 登录状态验证**
	* 用于验证玩家webSocket链接是否有效。
	* 当玩家已登录，但是webSocket链接断开，再建立链接时可以用token来验证链接是否仍然有效.
	* name: authenticate
	* 请求内容：`{partnerId: “xxxxxxxxx”,token: “xxxxxxx”获奖}`
	* partnerId: 已登录的代理会员id
	* 响应内容： `{status: 200/4xx,data: true/false/null}`
	* 操作成功: status--200, data--true, 有效，false, 鉴定失败
	* 操作失败：status--4xx, data-null

<div id='获取代理会员用户信息'></div>

* **5. 获取代理会员用户信息**
	* 客户端获取推广的基本信息，包括手机，地址，以及银行资料详细信息。通过这个接口，还会返回更多的玩家信息。
	* name: get
	* 请求内容：
	* 代理登入login后能直接调用
	* 响应内容：`{status: 200/4xx,data: partnerObj/null}`
	* 操作成功：status--200, data--代理对象，详见下面说的.
	* 操作失败：status--4xx, data--null
	* 代理对象详细说明：
		* ```
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
			}

<div id='代理登录'></div>

* **6. 代理登录**
	* 代理登录接口.
	* name: login
	* 请求内容：
		* ```
			{
				"platformId": "1",  //代理注册平台
				"name": "testpartner4",  //登录用户名
				"password": "123456",  //登录密码
				"clientDomain": "xxxx",  //登录域名
				"captcha": "2425"  //验证码
			}
	* 响应内容：
		* ```
			{
				"status": 200/4xx,
				"data": { //代理详细信息
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
				},"token": "xxxx", //用于重新建立连接
				“errorMessage”: “xxxx” //错误消息, 失败时该字段才有效
			}
	* status: 操作成功--200， 操作失败--4xx
	* data: 代理详细信息
	* token: 用于重新建立连接
	* errorMsg: 错误消息, 失败时该字段才有效。

<div id='代理会员登出'></div>

* **7. 代理会员登出**
	* 代理会员登出接口
	* name:logout
	* 请求内容:  `{partnerId: “xxxxxxx”}`
	* partnerId: 渠道ID
	* 响应内容： `{status: 200/40x, playerId: “xxxxxxx”}`
	* 注销成功：status--200, partnerId--渠道ID
	* 注销失败：status--40x, partnerId--渠道ID

<div id='获取代理会员信息'></div>

* **8. 获取代理会员信息**
	* name: get
	* 请求内容：{}
	* 响应内容：`{status: 200/4xx,data: partnerObj,errorMsg: “xxx”}`
	* status: 操作成功--200， 操作失败--4xx
	* data: 渠道详细信息
	* errorMsg: 错误消息,失败时该字段才有效。

<div id='获取登录验证码'></div>

* **9. 获取登录验证码**
	* 用户三次登录失败之后， 客户端调用获取登录验证码，让玩家输入正确的验证码才能登录。
	* Name: captcha
	* 请求内容：{}
	* 响应内容：`{status: 200/4xx, data: “base64;pngGlkgaslkhfljgsd”, errorMsg: “xxxx”}`
	* status: 操作成功 -- 200, 操作失败--4xx
	* data: base64格式的图片
	* errorMsg: 错误消息, 操作失败时字段有效.

<div id='修改代理会员密码'></div>

* **10. 修改代理会员密码**
	* name: updatePassword
	* 请求内容：`{partnerId: “xxxxxxxxxx”, oldPassword: “4321”, newPassword: “1234”}`
	* partnerId: 渠道Id
	* oldPassword: 旧密码
	* newPassword: 新密码
	* 响应内容：`{status: 200/40x, errorMsg: “xxxxx”}`
	* status: 操作成功--200, 操作失败--4xx
	* errorMsg: 错误信息，操作失败时字段有效

<div id='设置代理银行资料'></div>

* **11. 设置代理银行资料**
	* 银行账号名称第一次绑定时会同步玩家的真实姓名。
	* name: fillBankInformation
	* 请求内容：
		* ```
			{
				partnerId: “xxxxx”,
				bankName: “1”,
				bankAccount: “123456789”,
				bankAccountName: “陈小名”,
				bankAccountType: “1”,
				bankAccountProvince: “110000”,
				bankAccountCity: “110100”,
				bankAddress: “望京支行”,
				smsCode:”5558”
			}
	* bankAccount: // （必填）银行账
	* bankAccountCity: // （必填）开户城市
	* bankAccountName: // （必填）账号姓名
	* bankAccountProvince: // （必填）开户省份
	* bankAccountType: // 账号类型，信用卡： 1 ，借记卡：2 （不需要了）
	* bankAddress: //（非必填）账户支行
	* bankName: // （必填）银行名称, 请用代号：1,2,3,4
	* partnerId: // 代理 ID
	* smsCode: //短信验证码 （代理帐号）修改支付资料需短信验证 -没勾选可不填
	* 响应内容：`{status: 200/4xx, errorMsg: “xxxx”}`
	* status: 操作成功--200, 操作失败--4xx
	* errorMsg: 错误信息， 操作失败时字段有效

<div id='获取代理统计信息注册create'></div>

* **12. 获取代理统计信息注册create**
	* 按周期查询代理统计信息。
	* name: getStatistics
	* 请求内容：`{queryType: “day/week/month”}`
	* queryType: 查询类型，分为 day(日)/week(周)/month(月)
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:{
					queryType: “day/week/month”,
					topup: 2000,
					getBonus: 180,
					bonus: 200,
					playerWin: 424.5,
					newPlayers: 10,
					activePlayers: 2,
					subPartners: 0
				}, errorMsg: “xxxxx”
			}
	* status: 操作成功--200, 操作失败--4xx
	* data: 统计数据
	* queryType: 查询类型。
	* topup: 下线玩家充值额
	* getBonus: 下线玩家兑奖额
	* bonus: 所获奖励额
	* playerWin: 下线玩家赢利额
	* newPlayers: 新注册下线玩家数
	* activePlayers: 活跃玩家数
	* subPartner: 新注册下线渠道
	* errorMsg: 错误信息， 操作失败时字段有效

<div id='获取代理下线玩家列表'></div>

* **13. 获取代理下线玩家列表**
	* 获取该代理的下线玩家列表
	* name: getPlayerSimpleList
	* 请求内容：
		* ```
			{
				partnerId: “xxxxxx”,
				queryType: “registrationTime/lastAccessTime”,
				startTime: “2016-10-20 00:00:00”,
				endTime: “2016-10-22 00:00:00”,
				startIndex: 0,
				requestCount: 100,
				sort: true
			}
	* partnerId: 代理Id
	* queryType(查询类型)分两种类型:
		*  registrationTime注册时间查询
		*  lastAccessTime最后登录时间查询
	* startTime: 查询起始时间
	* endTime: 查询结束时间
	* startIndex: 记录开始索引， 用于分页
	* requestCount: 请求记录数量, 用于分页
	* sort: 排序方向 true--正序, false--降序
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:{
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},
					"records": [  //查询记录列表{
						id: “u83535”
						name:”ut446823”,
						realName:”李四”,
						registrationTime: "2016-12-05T11:41:15.714Z"
						lastLoginIP: “158.56.2.45”
					}]
				},
				errorMsg: “xxxxxx”
			}
	* status: 操作成功--200, 操作失败--4xx
	* data: 查询到的玩家结果
	* stats: 统计信息
	* totalCount: 查询记录总数
	* startIndex: 查询结果记录开始索引
	* records: 玩家列表
	* id: 玩家id
	* playerName: 玩家用户名
	* realName: 真实姓名
	* registerTime: 注册时间
	* lastLoginIP: 最后登录IP
	* errorMsg: 错误信息，操作失败时该字段有效

<div id='获取代理下线玩家详情列表'></div>

* **14. 获取代理下线玩家详情列表**
	* 获取该代理的下线玩家列表
	* name: getPlayerDetailList
	* 请求内容：
		* ```
			{
				partnerId: “xxxxxx”,
				queryType: “registrationTime/lastAccessTime”,
				startTime: “2016-10-20 00:00:00”,
				endTime: “2016-10-22 00:00:00”,
				startIndex: 0,
				requestCount: 100,
				sort: true
			}
	* partnerId: 代理Id
	* queryType(查询类型) 分两种类型:
		* registrationTime注册时间查询,
		* lastAccessTime最后登录时间查询
	* startTime: 查询起始时间
	* endTime: 查询结束时间
	* startIndex: 记录开始索引， 用于分页
	* requestCount: 请求记录数量, 用于分页
	* sort: 排序方向
		* true--正序
		* false--降序
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data:{
					"stats": {
						"totalCount": 1,  //查询记录总数量，用于分页
						"startIndex": 0  //查询结果记录开始index
					},"records": [  //查询记录列表{
						id: “u83535”
						name:”ut446823”,
						realName:”李四”,
						registrationTime: "2016-12-05T11:41:15.714Z"
						lastLoginIP: “158.56.2.45”
					}]
				},
				errorMsg: “xxxxxx”
			}
	* status: 操作成功--200, 操作失败--4xx
	* data: 查询到的玩家结果
	* stats: 统计信息
	* totalCount: 查询记录总数
	* startIndex: 查询结果记录开始索引
	* records: 玩家列表
	* id: 玩家id
	* playerName: 玩家用户名
	* realName: 真实姓名
	* registerTime: 注册时间
	* lastLoginIP: 最后登录IP
	* errorMsg: 错误信息，操作失败时该字段有效

<div id='获取代理推广域名'></div>

* **15. 获取代理推广域名**
	* 获取代理的推广域名列表，方便渠道进行推广。
	* name: getDomainList，该接口已弃用
	* 请求内容：{}
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data: {
					playerSpreadUrl: “[www.xxx1.com/spread.html?p=4356354](http://www.xxx1.com/spread.html?p=4356354)”,
					selfSpreadUrl: [“[www.play17173.com](http://www.play17173.com)”, “xxxxx”]
					partnerSpreadUrl: “[www.xxx1.com/pSpread.html?pn=4356354](http://www.xxx1.com/pSpread.html?pn=4356354)”
					},
					errorMsg: “xxxxx”
				}
	* Status: 操作成功--200, 操作失败--4xx
	* Data: 推广域名列表
	* playerSpreadUrl: 用于向玩家的进行推广的URL.
	* selfSpreadUrl: 代理自己用于推广的独立域名
	* partnerSpreadUrl: 用于向其他代理推广下线的URL.
	* errorMsg: 错误信息，操作失败时该字段有效

<div id='获取代理下线报表'></div>

* **16. 获取代理下线报表**
	* Name: getPartnerChildrenReport
	* 请求内容：`{startTime: xxx, endTime: xxx, startIndex: 0, requestCount: 10}`
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data: {
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
				},
				errorMsg: “xxxxx”
			}

<div id='绑定代理玩家'></div>

* **17. 绑定代理玩家**
	* name: bindPartnerPlayer
	* 请求内容：`{playerName: xxx}`
	* 响应内容：`{status: 200/4xx,data: {},errorMsg: “xxxxx”}`
	* Status: 操作成功--200, 操作失败--4xx

<div id='申请兑奖'></div>

* **18. 申请兑奖**
	* name: applyBonus
	* 请求内容：`{bonusId: “001”, amount: 1, honoreeDetail: {mobile: 13500101111}}`
	* bonusId: 奖品Id
	* amount:兑奖数量
	* honoreeDetail: 领奖人明细信息，里面的内容会根据奖品的信息变化。
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data: {
					proposalId: “000123”,
					proposalType: “003”,
					status: “001”,
					requestDetail: {
						bonusId: “001”,
						amount: 1,
						honoreeDetail: {
							mobile: 13500101111
						}
					},
						createTime: “2016-08-15 12:00:00”,...
					},
					errorMessage: “xxxxxx”
				}
	* Status：操作状态， 200--操作成功， 4xx--操作失败
	* Proposal: 申请成功之后产生的提案。包含信息：
	* proposalId: 提案Id,
	* proposalType: 提案类型
	* Status: 提案状态
	* requestDetail: 兑奖明细, 包含申请兑奖的明细信息。
	* createTime: 创建时间
	* … 更多提案的明细信息
	* errorMessage: 详细错误信息

<div id='获取兑奖列表'></div>

* **19. 获取兑奖列表**
	* 获取代理所提交的兑奖申请单列表。
	* name: getBonusRequestList
	* 请求内容：`{startTime: “2016-08-10 0:0:0”, endTime: “2016-08-15: 23:59:59”, status:”Success”}`
	* 查询条件：
	* startTime: 开始时间
	* endTime: 结束时间
	* status: 提案状态(参考提案状态列表，默认：所有状态)
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data: {
					stats: {
						totalCount: 20,
						startIndex: 5
					},
					records: [{
						proposalId:”001”,
						proposalType: “002”
					...},{
						proposalId:”002”,
						proposalType: “002”
					...}]
				},
				errorMessage: “xxxxxxxx”
			}
	* status:操作状态，200--操作成功，4xx--操作失败
	* data: 申请兑奖提案列表，提案详细信息参见上面的兑奖申请。

<div id='取消兑奖申请(partner)'></div>

* **20. 取消兑奖申请**
	* 玩家可以取消已提交的兑奖申请。(前提是提案状态为未处理)
	* name:cancelBonusRequest
	* 请求内容：`{proposalId: “0001”}`
	* proposalId: 兑奖申请提案号
	* 响应内容：`{status: 200/4xx, errorMessage: “xxxxxxx”}`
	* Status: 操作状态， 200--操作成功, 4xx--操作失败. 主要是操作状态不对的情况。
	* errorMessage: 详细错误信息
	*
<div id='代理其下玩家充值兑奖情况记录'></div>

* **21. 代理其下玩家充值兑奖情况记录**
	* name: getPartnerPlayerPaymentReport
	* 请求内容：`{startTime: xxx, endTime: xxx, startIndex: 0, requestCount: 10}`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
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
				}
			}

<div id='查询代理下线玩家开户来源报表'></div>

* **22. 查询代理下线玩家开户来源报表**
	* name: getPartnerPlayerRegistrationReport
	* 请求内容：`{startTime: xxx, endTime: xxx, domain: xxx, playerName: xxx, startIndex: 0, requestCount: 10}`
	* 响应内容：
		* ```
			{
				status: 200/4xx,
				data: {
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
				},
				errorMsg: “xxxxx”
			}

<div id='查询代理下线玩家开户统计'></div>

* **23. 查询代理下线玩家开户统计**
	* name: getPartnerPlayerRegistrationStats
	* 请求内容：`{startTime: xxx, endTime: xxx}`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"totalNewPlayers": 5,  //总开户人数
					"totalNewOnlinePlayers": 1,  //在线开户数
					"totalNewManualPlayers": 4,  //手工开户数
					"totalTopUpPlayers": 1,  //存款人数
					"totalValidPlayers": 0,  //有效开户数
					"totalSubPlayers": 2  //代理下级开户数
				}
			}

<div id='查询代理佣金信息'></div>

* **24. 查询代理佣金信息**
	* name: getPartnerCommission
	* 请求内容：`{startTime: xxx, endTime: xxx, startIndex: 0, requestCount: 10}`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"stats": {
						"startIndex": 0,
						"totalCount": 4
					},
				"total": {
					"totalValidAmount": 770,  //总有效消费额度
					"totalBonusAmount": 20,  //总奖励消费额度
					"operationAmount": 750,  //总经营额度
					"totalRewardAmount": 210,  //总奖励额度
					"serviceFee": 7.5,  //总服务费
					"platformFee": 7.5,  //总平台费
					"profitAmount": 525  //总利润
					“commissionAmount”: 100  //总佣金
					"operationCost": 179.54000000000002,  推广费用
					"preNegativeProfitAmount": 0  之前累计负赢利额度
				},"playerCommissions": [{
					"playerName": "vince",  //玩家用户名
					"totalValidAmount": 770,  //有效投注
					"totalBonusAmount": 20,  投注输赢
					"operationAmount": 750,  运营额度
					"totalRewardAmount": 210,  奖励额度
					"serviceFee": 7.5,  服务费
					"platformFee": 7.5,  平台费
					"profitAmount": 525,  总利润
					“totalTopUpAmount”: 123  总充值
					“totalPlayerBonusAmount”: 100  总提款,
					"operationCost": 179.54000000000002,  推广费用
				}]
			}}

<div id='查询代理佣金详情'></div>

* **25. 查询代理佣金详情**
	* name: getPartnerCommissionValue
	* 请求内容：{}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"amount": 93,  //当前佣金
					"validAmount": 93,  //可领佣金
					"bonusAmount": 5  //以领佣金
				}
			}

<div id='通过短信验证码修改代理手机号码'></div>

* **26. 通过短信验证码修改代理手机号码**
	* name: getSMSCode
	* 请求内容：
		* ```
			{
				"platformId": 平台ID,
				"partnerId": 代理ID,
				"phoneNumber": 手机号, //代理有登入会忽略
				"newPhoneNumber": 新手机号,
				“captcha”: “1234” 图片验证码
			}
	* 响应内容：
		* ```
			{
				“status”: 200/4xx,
				“errorMessage“: “xxxxx”
				”data”: {},
			}
	* Status: 操作成功--200, 操作失败--4xx
	* name: updatePhoneNumberWithSMS
	* 请求内容：
		* ```
			{
				"platformId": 平台ID,
				"partnerId": 代理ID,
				"phoneNumber": 手机号,
				"newPhoneNumber": 新手机号
			}
	* 响应内容：
		* ```
			{
				“status”: 200/4xx,
				“errorMessage“: “xxxxx”
				”data”: {},
			}
	*	Status: 操作成功--200, 操作失败--4xx
	*	data: 渠道详细信息
	*	errorMessage: 错误消息,失败时该字段才有效。

<div id='更新代理佣金模式'></div>

* **27. 更新代理佣金模式**
	* name: updatePartnerCommissionType
	* 请求内容：`{"commissionType": 1,}`
	* commisionType:
		* "1天-输赢值": 1
		* "7天-输赢值": 2
		* "半月-输赢值": 3
		* "1月-输赢值": 4
		* "7天-投注额": 5
	* 响应内容：`{“status”: 200/4xx,“errorMessage“: “xxxxx””data”: {},}`
	* Status: 操作成功--200, 操作失败--4xx

<div id='获取下线玩家活跃信息'></div>

* **28. 获取下线玩家活跃信息**
	* name: getCrewActiveInfo
	* 注：代理必须登入
	* 请求内容：
		* ```
			{
				"platformId": 1,  // 平台ID
				“period”: 1,  // 周期// 日 - 1，周 - 2，半月 - 3， 月 - 4
				“circleTimes”: 7  // 需要7个周期的数据，含目前周期
				“startTime“: // 查询开始时间（ISO格式：只要日期T）
				“endTime“: // 查询结束时间（ISO格式：只要日期T）//  如果period=1 （日）的时候选择性使用，输入『开始+结 束』时间。（此时可选择不用 circleTimes）
				“needsDetail”:true //（非必填，查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。
				“detailCircle”:0 //（非必填，查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。
				“startIndex“：0 //（非必填，查询单一玩家不适用）开始的分页，默认 0
				“count“：10 //（非必填，查询单一玩家不适用）每页需要数据条数，默认10
			}
	* 响应内容：
		* ```
			{
				“status”: 200/4xx,
				“errorMessage“: “xxxxx”
				”data”: [{  
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
				}],
			}
	* Status: 操作成功--200, 操作失败--4xx

<div id='获取下线玩家存款信息'></div>

* **29. 获取下线玩家存款信息**
	* name: getCrewDepositInfo
	* 注：代理必须登入
	* 请求内容：
		* ```
			{
				"platformId": 1,  // 平台ID
				“period”: 1,  // 周期 // 日 - 1，周 - 2，半月 - 3， 月 - 4
				“circleTimes”: 7  // 需要7个周期的数据，含目前周期
				“playerId”: 1234 //（非必填/玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。
				“crewAccount”: sallen //（非必填/玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。
				“startTime“: // 查询开始时间（ISO格式：只要日期T）
				“endTime“: // 查询结束时间（ISO格式：只要日期T）//  如果period=1 （日）的时候选择性使用，输入『开始+结束』时间。（此时可选择不用 circleTimes）
				“needsDetail”:true //（非必填，查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。
				“detailCircle”:0 //（非必填，查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。
				“startIndex“：0 //（非必填，查询单一玩家不适用）开始的分页，默认 0
				“count“：10 //（非必填，查询单一玩家不适用）每页需要数据条数，默认10
				}
	*	响应内容：
		*	```
			{
				“status”: 200/4xx,
				“errorMessage“: “xxxxx”
				”data”: [{  
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
				}],
			}
	* Status: 操作成功--200, 操作失败--4xx

<div id='获取下线玩家提款信息'></div>

* **30. 获取下线玩家提款信息**
	* name: getCrewWithdrawInfo
	* 注：代理必须登入
	* 请求内容：
		* ```
			{
				"platformId": 1,  // 平台ID
				“period”: 1,  // 周期// 日 - 1，周 - 2，半月 - 3， 月 - 4
				“circleTimes”: 7  // 需要7个周期的数据，含目前周期
				“playerId”: 1234 //（非必填/玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。
				“crewAccount”: sallen //（非必填/玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。
				“startTime“: // 查询开始时间（ISO格式：只要日期T）
				“endTime“: // 查询结束时间（ISO格式：只要日期T）//  如果period=1 （日）的时候选择性使用，输入『开始+结束』时间。（此时可选择不用 circleTimes）
				“needsDetail”:true //（非必填，查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。
				“detailCircle”:0 //（非必填，查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。
				“startIndex“：0 //（非必填，查询单一玩家不适用）开始的分页，默认 0
				“count“：10 //（非必填，查询单一玩家不适用）每页需要数据条数，默认10
			}
	* 响应内容：
		* ```
			{
				“status”: 200/4xx,
				“errorMessage“: “xxxxx”
				”data”: [{  
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
				}],
			}
	* Status: 操作成功--200, 操作失败--4xx

<div id='获取下线玩家投注信息'></div>

* **31. 获取下线玩家提款信息**
	* name: getCrewBetInfo
	* 注：代理必须登入
	* 请求内容：
		* ```
			{
				"platformId": 1,  // 平台ID
				“period”: 1,  // 周期// 日 - 1，周 - 2，半月 - 3， 月 - 4
				“circleTimes”: 7,  // 需要7个周期的数据，含目前周期
				“playerId”: 1234 //（非必填/玩家ID，与玩家帐号二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。
				“crewAccount”: sallen //（非必填/玩家帐号，与玩家ID二选一）可以单独查询此下线的x周期状况，请注意如果字段内数据是0，仍含会填入0返回。
				providerGroupId:"0"  // 锁大厅组ID
				“startTime“: // 查询开始时间（ISO格式：只要日期T）
				“endTime“: // 查询结束时间（ISO格式：只要日期T）//  如果period=1 （日）的时候选择性使用，输入『开始+结束』时间。（此时可选择不用 circleTimes）
				“needsDetail”:true //（非必填，查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。
				“detailCircle”:0 //（非必填，查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。
				“startIndex“：0 //（非必填，查询单一玩家不适用）开始的分页，默认 0
				“count“：10 //（非必填，查询单一玩家不适用）每页需要数据条数，默认10
			}
	* 响应内容：
		* ```
			{
				“status”: 200/4xx,
				“errorMessage“: “xxxxx”
				”data”: [{  
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
					}],
				}
	* Status: 操作成功--200, 操作失败--4xx

<div id='获取新注册下线玩家信息'></div>

* **32. 获取新注册下线玩家信息**
	* name: getNewCrewInfo
	* 注：代理必须登入
	* 请求内容：
		* ```
			{
				"platformId": 1,  // 平台ID
				“period”: 1,  // 周期// 日 - 1，周 - 2，半月 - 3， 月 - 4
				“circleTimes”: 7,  // 需要7个周期的数据，含目前周期
				“startTime“: // 查询开始时间（ISO格式：只要日期T）
				“endTime“: // 查询结束时间（ISO格式：只要日期T）//  如果period=1 （日）的时候选择性使用，输入『开始+结束』时间。（此时可选择不用 circleTimes）
				“needsDetail”:true //（非必填，查询单一玩家不适用）批量查询时，是否需要每个单一玩家详情，默认需要（TRUE）。
				“detailCircle”:0 //（非必填，查询单一玩家不适用）指定哪个周期需要详情。0 表示最靠近现在的周期（如用 startTime、endTime 则 0 为 endTime），不填则 默认0。
				“startIndex“：0 //（非必填，查询单一玩家不适用）开始的分页，默认 0
				“count“：10 //（非必填，查询单一玩家不适用）每页需要数据条数，默认10
			}
	* 响应内容：
		* ```
			{
				“status”: 200/4xx,
				“errorMessage“: “xxxxx”
				”data”: [{  
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
				}],
			}
	* Status: 操作成功--200, 操作失败--4xx

<div id='获取代理佣金比例详情'></div>

* **33. 获取代理佣金比例详情**
	* name: getCommissionRate
	* 请求内容：
		* ```
			{
				partnerId: “15085” //可选择不填，不填只显示平台设置的代理佣金比例
				platformId: “4”, //必填
				commissionType: “1” //必填
			}
	* commissionType:
		* "1天-输赢值": 1
		* "7天-输赢值": 2
		* "半月-输赢值": 3
		* "1月-输赢值": 4
		* "7天-投注额": 5
* 响应内容：
	* ```
		{
			"status": 200,
			"data": [{
				"providerGroupId": 1, // 锁大厅组1，每个锁大厅有不同的比例。
				"providerGroupName": "group1", // 锁大厅组1的名字
				"list": [{
					"defaultCommissionRate": 0.1, // 预设佣金比例
					"activePlayerValueTo": “-”, // 活跃下线人数最大值，-代表无限
					"activePlayerValueFrom": 1, // 活跃下线人数最小值
					"playerConsumptionAmountTo": 9999, // 下线最大输值（或投注额）
					"playerConsumptionAmountFrom": 0, // 下线最小输值（或投注额）
					“customizedCommissionRate”： 0.15 //客制化佣金比例
				},{
					"defaultCommissionRate": 0.11,
					"activePlayerValueTo": 8888,
					"activePlayerValueFrom": 2,
					"playerConsumptionAmountTo": 8888,
					"playerConsumptionAmountFrom": 0
				}]
			},{
				"providerGroupId": 2,
				"providerGroupName": "group2",
				"list": [{
					"defaultCommissionRate": 0.1,
					"activePlayerValueTo": "-",
					"activePlayerValueFrom": 1,
					"playerConsumptionAmountTo": 9999,
					"playerConsumptionAmountFrom": 0
				}]
			}]
		}
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='获取代理费用比例详情'></div>

* **34. 获取代理费用比例详情**
	* name: getPartnerFeeRate
	* 请求内容：
		* ```
			{
				partnerId: “15085” //可选择不填，不填只显示平台设置的代理佣金比例
				platformId: “4”, //必填
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
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
				}]
			}
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='预算代理佣金'></div>

* **35. 预算代理佣金**
	* name: preditCommission
	* 注：代理必须登入
	* 请求内容：
		* ```
			{
				platformId: “4”, //必填
				searchPreviousPeriod:0 //（非必填）搜寻前 X 周期，预设0＝本周期。
			}
	* 响应内容：
		* ```
				{
					"status": 200,
					"data": {
						activeCrewNumbers:"2",  // 活跃下线人数
						totalDepositAmount:"500", //本周期的所有存款总和
						depositFeeRate:"0.1"  //存款手续费比例
						totalDepositFee:"50",  // 存款费用
						totalWithdrawAmount:"500", //本周期的所有取款总和
						withdrawFeeRate:"0.1" //取款手续费比例
						totalWithdrawFee:"50",  // 提款费用
						totalBonusAmount:"1000" //本周期的所有优惠总和
						bonusFeeRate:"0.01" //优惠费用扣除比例
						totalBonusFee:"10"  // 所有优惠费用总和
						totalProviderFee:"5000"  // 所有平台费用总和
						totalCommission:"20000"  // 所有锁定组的佣金总和（没扣除费用）
						depositCrewDetail:[ // 下线存款详情表（有记录>0才会列出）
						0:{
							crewAccount:sallen888 //有存款的下线玩家
							crewDepositAmount:200 //该玩家的存款金额
						}]
						withdrawCrewDetail:[ // 下线提款详情表（有记录>0才会列出）
							0:{
								crewAccount:sallen888 //有提款的下线玩家
								crewWithdrawAmount:200 //该玩家的提款金额
							}]
							bonusCrewDetail:[ // 下线优惠详情表（有记录>0才会列出）
								0:{
									crewAccount:sallen888 //有优惠的下线玩家
									crewBonusAmount:200 //该玩家的优惠金额（包含手工、代码等）
								}
								list: [
									providerGroupId:"0",
									providerGroupName:"百家乐（真人）",
									crewProfit："-300" //单一组的下线报表输赢
									commissionRate:"0.35" //单一组对应『输赢、活跃玩家数量』的佣金比 例
									crewProfitDetail:[ // 下线玩家报表输赢详情（有记录>0才会列出）
									0:{
										crewAccount:sallen888 //下线有投注的玩家帐号
										singleCrewProfit:200 //单一投注玩家的报表输赢
									}]
									providerGroupCommission:"5000",
									providerGroupFeeRate:"0.10" //单一组的平台费用比例
									providerGroupFee:"1500"
									]
								}
							}
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='代理充值投注排行榜'></div>

* **36. 代理充值投注排行榜**
	* Function  name: getPartnerBillBoard
	* 请求内容：
		* ```
				{
					"platformId": "1", // 平台ID
					"mode": "1", // 1到6 1:累积存款排行 2:累积投注额排行 3:累积输赢排行4: 累积下线人数排行 排行 5: 活跃下线人数排行 6: 累积佣金排行
					"periodCheck": "1", // 1: 本日 2: 本周 3: 半月 4: 本月 5: 无周期
					"recordCount": 10, // (可不填）数字，预设10。排行榜数据数量
					"partnerId": "15085" // （可不填）代理ID。查询此代理排行
				}
	* 响应内容：
		* ```
				{ // 1：累积存款排行
					"status": 200,
					"data": {
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
					}
				}
			}2: 累积投注额排行{
				"status": 200,
				"data": {
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
				}
			}
			3:累积输赢排行{
				"status": 200,
				"data": {
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
					}
				}4: 累积下线人数排行{
					"status": 200,
					"data": {
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
					}
				}5: 活跃下线人数排行{ //注意不能查询无周期
					"status": 200,
					"data": {
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
					}
				}6: 累积佣金排行{
					"status": 200,
					"data": {
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
					}
				}
	* 请求失败：`{"status": 4xx,"errorMessage": "","data": null}`

<div id='查询代理佣金提案'></div>

* **37. 查询代理佣金提案**
	* name: getCommissionProposalList
	* 注：代理必须登入
	* 请求内容：
		* ```
			{
				platformId: “4”, //必填
				startTime: “2018-05-19T00:37:48.080Z”, // 开始时间（与 searchProposalCounts 二选一）
				endTime: “2018-05-20T00:37:48.080Z”, // 结束时间（与 searchProposalCounts 二选一）
				status: “Approved” // 请参考提案状态表, 不填代表全部
				searchProposalCounts:4 // 往前搜寻提案数量（与查询时间二选一）
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
					"proposalId": "697236",
					"status": "Approved", //提案状态
					"proposalAmount": -490.3, //提案金额
					"createTime": "2018-05-21T06:55:12.618Z",//提交时间//结算的佣金周期 （哪一天 ～ 哪一天）
					"commissionPeriod": "2018-04-30T16:00:00.000Z ~ 2018-05-14T15:59:59.000Z",
					"activeCrewNumbers": 1, //活跃玩家数量
					"totalDepositFee": 90, //需扣除的总存款手续费
					"totalWithdrawFee": 0, //需扣除的总取款手续费
					"totalBonusFee": 3.3, //需扣除的优惠
					"list": [{
						"providerGroupId": "1",
						"providerGroupName": "group1",
						"providerGroupCommission": -397, //单一组的佣金
						"providerGroupFee": 0 //单一组的平台费
					},{
						"providerGroupId": "2",
						"providerGroupName": "group2",
						"providerGroupCommission": 0,
						"providerGroupFee": 0
					}],
					"successTime": "2018-05-21T06:55:12.653Z", // success/cancelTime 只出一种
					"cancelTime": "2018-05-21T06:52:43.529Z",
					"totalProviderFee": 0, // 所有平台费用总和
					"totalCommission": -397 //// 所有锁定组的佣金总和（没扣除费用）
				}]
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='获取平台-代理页面的设置'></div>

* **38. 获取平台-代理页面的设置**
	* name: getPartnerConfig
	* service:partner
	* 请求内容：
		* ```
			{
				platformId: “1”, //必填
				device:1
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
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
				}
			}
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='代理转金额给下线'></div>

* **39. 代理转金额给下线**
	* name: partnerCreditToPlayer
	* service:partner
	* 请求内容：
		* ```
			{
				platformId: “1”, //平台ID - 必填
				partnerId: “1234”, //代理ID - 必填
				targetList: [{
					username: ‘test01’,
					amount: 100,
					providerGroupId: 4,
					spendingTimes: 10
				}, {
					username: ‘test02’,
					amount: 10
				}] //转账明细数组 - username: “abc”, //玩家账号 - 必填, providerGroupId: 1, //锁大厅ID(当不填该字段，代表转入自由额度（此处的锁大厅ID 是 后台基础设置 -> 锁大厅设置的id）), spendingTimes: 10, //流水倍数(providerGroupId字段填写后，该字段必填)
			}
	* 响应内容：
		* ```
			{  
				"status": 200,
				"data":{  
					amount: 2000，//返回转账金额,
					balance: 5000 //账户余额
				}
			}
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='获取下级代理信息'></div>

* **40. 获取下级代理信息**
	* name: getDownPartnerInfo
	* service:partner
	* 请求内容：
		* ```
			{
				platformId: “1”, //平台ID - 必填
				partnerId: “1234”, //代理ID - 必填
				requestPage: 1, //请求第几页
				count: 10, //每页数据条数（默认为10条）
			}
	* 响应内容：
		* ```
			{  
				"status": 200,  
				"data":{  
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
				}  
			}
	* 操作失败：status--4xx, data-null, errorMessage:””
	* 没有下级代理时，list为空数组[]

<div id='获取下级代理贡献值详情'></div>

* **41. 获取下级代理贡献值详情**
	* name: getDownPartnerContribution
	* service:partner
	* 请求内容：
		* ```
			{
				platformId: “1”, //平台ID - 必填
				partnerId: “1234”, //代理ID - 必填
				requestPage: 1, //请求第几页
				count: 10, //每页数据条数（默认为10条）
				startTime: “”, //开始时间
				endTime: “” //结束时间
			}
	* 当只传platformId和partnerId时，默认返回当前月的数据
	* 响应内容：
		* ```
			{  
				"status": 200,  
				"data":{  
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
				}  
			}
	* 操作失败：status--4xx, data-null, errorMessage:””
	* 没有下级代理时，list为空数组[]

<div id='获取代理转账记录'></div>

* **42. 获取代理转账记录**
	* name: getPartnerTransferList
	* service:partner
	* 请求内容：
		* ```
			{
				platformId: “1”, //平台ID - 必填
				partnerId: “1234”, //代理ID - 必填
				startTime: “”, //开始时间
				endTime: “”, //结束时间
				requestPage: 1, //请求第几页
				count: 10 //每页数据条数（默认为10条）
			}
	* 当只传platformId和partnerId时，默认返回当前月的数据
	* 响应内容：
		* ```
			{  
				"status": 200,  
				"data":{  
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
				}
	* 操作失败：status--4xx, data-null, errorMessage:””
	* 当没有数据时候，为[] (即空数组)

<div id='查询所有下线玩家详情'></div>

* **43. 查询所有下线玩家详情**
	* name: checkAllCrewDetail
	* service:partner
	* 请求内容
		* ```
			{
				platformId: “4”, //平台ID
				playerId: “11335”, //玩家ID（可不填），只显示此下线
				crewAccount: “yunvince8431” // 玩家账号（可不填）
				singleSearchMode: “0” // （非必填/单一玩家搜寻模式/给crewAccount用 ）
				“0”：精准搜索（默认值/代表只搜索此准确帐号）  
				“1”：模糊搜索（如搜p1，会出现p12,p13开头帐号）
				sortMode: “1”, // ”1“:充值 ”2“:提款 “3”:输赢（负）最多 “4”:有效投注额
				startTime: “2018-05-11T06:55:12.618Z”, //查询开始时间，没填入默认代理注册时间
				endTime: “2018-05-21T06:55:12.618Z”,//查询结束时间，没填入默认现在时间。
				startIndex: 0,//数据请求从第 0 条开始（代表有分页）
				count: 100//默认100条（代表有分页）
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
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
				}
			}
	* 操作失败：status--4xx, data-null, errorMessage:””
<div id='代理推广域名防红和短链转换'></div>

* **44. 代理推广域名防红和短链转换**
    * name: getPromoShortUrl
    * service:partner
    * 请求内容
        * ```
            {
                url: “www.xindeli666.com/123”, // 代理网址
                partnerId:'270', //代理Id
            }
    * 响应内容：
        * ```
            {
              "status": 200,
              "data": {
                "shortUrl": "http://t.cn/AiQwVM4y",
                "partnerName": "testmk12"
              }
            }
    * 操作失败：status--4xx, data-null, errorMessage:””
    
<div id='查询代理的下级会员信息'></div>

* **45. 查询代理的下级会员信息**
    * name: getDownLinePlayerInfo
    * service:partner
    * 请求内容
        * ```
            {
                platformId: "1" //平台ID - 必填
                period: 1  //1:本日  2:本周 3:本月 - 必填
                whosePlayer: 1 //1:全部  2: 直属下线会员  3:下线代理会员 - 必填
                playerType: 1 //1:全部 2: 新增会员 3:活跃会员- 必填
                crewAccount: "vptest001" //玩家账号 （用于单一搜索）
                requestPage: 1 //请求第几页（从1开始）
                count: 10 //每页数据条数（默认为10条）
                sortType: 1 //"1:充值   2:提款  3:输赢值  
                              4:有效投注额  5:优惠金额  6: 平台费  
                              7: 存取款手续费"
                sort: true //true 升序、false 降序（默认）
            }
    * 响应内容：
        * ```
            {
              "status": 200,
              "data": {
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
                "list": [
                  {
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
                  }
                ]
              }
            }
    * 操作失败：status--4xx, data-null, errorMessage:””
    * 该接口需要登录
    
<div id='查询代理的下级代理信息'></div>

* **46. 查询代理的下级代理信息**
    * name: getDownLinePartnerInfo
    * service:partner
    * 请求内容
        * ```
            {
                platformId: "1" //平台ID - 必填
                period: 1 //1:本日   2:本周  3:本月  4: 本期（当期实时佣金） - 必填
                partnerType: 1 //1:全部 2: 新增下级代理- 必填
                partnerAccount: "pptest001" //代理账号 （用于单一搜索）
                requestPage: 1 //请求第几页（从1开始）
                count: 10 //每页数据条数（默认为10条）
                sortType: 1 //"1:充值   2:提款  3:输赢值  
                              4:有效投注额  5:优惠金额  6: 平台费  
                              7: 存取款手续费 8: 贡献佣金"
                              如果不传该参数，默认按照注册时间顺序排序
                sort: true //true 升序、false 降序（默认）
            }
    * 响应内容：
        * ```
            {
              "status": 200,
              "data": {
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
                  "list": [
                    {
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
                    }
                  ]
                }
            }
    * 操作失败：status--4xx, data-null, errorMessage:””
    * 该接口需要登录
    
<!--文档没有华语名称，因此暂时命名“平台”-->
# 平台：
提供平台相关服务的接口。

### service: platform
#### 功能列表：

<div id='获取平台公告'></div>

* **1. 获取平台公告**
	* 数据接口定义：
		* 名称 : getPlatformAnnouncements
		* 备注: 调用结果以json格式返回
	* [参数说明](#参数说明表)
	* [返回参数说明](#返回参数说明表)
	* JSON返回示例：
		* ```
			{
				"status": 200,
				"data":{
					"list":[{
						"_id":"588567aa725d17143a4c9435",
						"reach":1,
						"title":"testAnnoucement", //公告标题
						"content"::"test annoucement message", //公告内容
						"date": "2017-01-31 22:10:10:00", //创建日期
					}]
				}
			}
# <head>
<div id='参数说明表'></div>

**参数说明**

|**字段名称**|**必填**|**类型**|**说明**|**备注**|
|--|--|--|--|--|
|platformId|是|Num|平台ID||
|reach|否|Str|返回对应类型的公告，默认返回所有|players：玩家 partner：代理，conditional：定制|

# <head>

<div id='返回参数说明表'></div>

**返回参数说明**

|**字段名称**|**必填**|**类型**|**说明**|**备注**|
|--|--|--|--|--|
|list|是|Arr|返回功能列表|为空返回 []|
|title|是|Str|返回公告标题||
|content|是|Str|返回公告内容||
|createTime|是|Str|返回公告创建时间|需返回北京时间，非格林威治时间 (GMT)|
|reach|是|Num|返回请求公告类型||

# <head>

<div id='获取平台信息'></div>

* **2. 获取平台信息**
	* name: getPlatformDetails
	* 请求内容：`{platformId:1}`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
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
						}],"gameTypeCountScores": [{
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
						}],"criteriaScoreRatio": {
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
			}}

	* 请求失败: `{"status": 200,"data": null}`


<div id='获取平台设置'></div>

* **3. 获取平台设置**
	* name: getConfig
	* 请求内容：`{platformId:1,device: 1 }`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
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
						}"wechatList": [{
							"isImg": 0,
							"content": "yunGamePlatform"
						},{
							"isImg": 1,
							"content": "test"
						}],"qqList": [{
							"isImg": 0,
							"content": "4359374512"
						}],"telList": [{
							"isImg": 0,
							"content": "4008009988"
						}],"live800": "test123","activityList": [{
							showInRealServer:1 // 正式站是否展示（0：不展示、1：展示、预设1）
							"code": "test",
							"bannerImg":
							"getHashFile(\"https://rbftp.kingbaly.net/ruibo/web-slider/wsb-201712-xmas.jpg\")",
							"btnList": [{
								"btn": "activityBtn",
								"extString": "style(\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\") my_href=\"\""
							},{
								"btn": "activityBtn2",
								"extString": "style(\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\") my_href=\"\""
							}]
						},{
							"code": "test1",
							"title": [{
								"name": "BBB"
							}],"btnList": [{
								"btn": "activityBtn1",
								"extString": "style(\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\") my_href=\"\""
							},{
								"btn": "activityBtn3",
								"extString": "style(\"position:absolute; width: 195px; height: 80px; top:150px; left: 500px\") my_href=\"\""
							}]
						}],
						"platformLogoUrl": [{
							"isImg": 1,
							"content": "4008009988"
						}],"SkypeList": [{
							"isImg": 0,
							"content": "4008009988"
						}],"emailList": [{
							"isImg": 0,
							"content": "4008009988"
						}],"wechatQRUrl": [{
							"isImg": 0,
							"content": "4008009988"
						}],"displayUrl": [{
							"isImg": 0,
							"content": "4008009988"
						}],"playerSpreadUrl": [{
							"isImg": 0,
							"content": "4008009988"
						}],
					}
				}
				getPartnerConfig
	* 请求失败: `{"status": 400,"errorMessage": "No platform exists with id: 11","data": null}`

<div id='请求客服会电'></div>

* **4. 请求客服会电**
	* name: playerPhoneChat
	* 请求内容：`{platform: xxx, phone: xxx, captcha:xxx, random: xxx}`
	* 响应内容：`{"status": 200,"data": {}}`

<div id='搜索平台投注记录'></div>

* **5. 搜索平台投注记录**
	* name: searchConsumptionRecord
	* 请求内容：
		* ```
			{
				platformId: xxx,
				startTime: xxx,
				endTime:xxx,
				minBonusAmount: xxx,
				minAmount: xxx,
				minValidAmount: xxx,
				startIndex: xxxx,
				requestCount: xxxx
			}
	* minBonusAmount: 最小输赢值（必须大于等于0）
	* minAmount： 最小投注额
	* minValidAmount： 最小有效投注额
	* requestCount: 请求个数，最大1000
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
					"_id": "5a6058c1ff8545b2a2184387",
					"platformId": "9c23b22853e93cb452bde61b",
					"providerId": "18",
					"gameId": {
						"name": "樱桃之恋"
					}，
					"roundNo": "1",
					"orderNo": "11",
					"gameType": "16",
					"insertTime": "2018-01-18T08:20:17.355Z",
					"isDuplicate": false,
					"bDirty": false,
					"usedEvent": [],
					"commissionAmount": 0,
					"bonusAmount": 100,
					"validAmount": 50,
					"amount": 50,
					"createTime": "2018-01-18T08:20:17.354Z",
					"__v": 0,
					"playerName": "et***st009"
				]}

<div id='埋点'></div>

* **6. 埋点**
	* name: clickCount
	* 请求内容：
		* ```
			{
				platform: 6,
				device: H5玩家,
				pageName: 首页,
				buttonName: 头像
				domain: 域名
				registerClickApp: true / registerClickWeb: true / registerClickH5: true (任一或非强制） 添加到注册按钮
			}
	* 响应内容：{"status": 200}

<div id='获取平台客户端数据'></div>

* **7. 获取平台客户端数据**
	* Function  name: getClientData
	* 需要登录
	* 请求内容：`{platformId: xxx}`
	* 响应内容：`{"status": 200,"data": "test:!"}`

<div id='保存平台客户端数据'></div>

* **8. 保存平台客户端数据**
	* Function  name: saveClientData
	* 需要登录
	* 请求内容：`{platformId: xxx"clientData": "test:!"}`
	* 响应内容：`{"status": 200,"data": "test:!"}`

<div id='电销系统开户'></div>

* **9. 电销系统开户**
	* Function  name: createPlayerFromTel
	* 请求内容：
		* ```
			{
				"playerAccount": "xxx",
				"realName": "xxx",
				"password": "xxx",
				"platformId": "xxx",
				"phoneNumber": "xxx",
				"playerType": "xxx",
				"qq": "xxx",
				"wechat": "xxx",
				"email": "xxx",
				"gender": "x",
				"DOB": "xxxx-xx-xx",
				"telSalesName": "xxx",
				"promoMethod": "xxx",
				"fame": "xxxx"
			}
	* 响应内容：`{"status": 200,"data": {} // player data}`

<div id='提取玩家资料'></div>

* **10. 提取玩家资料**
	* Function  name: extractUserFromFpms
	* 请求内容：
		* ```
			{
				"status": 200,
				"data": {
					"title": "xxxxxx",
					"sourcePlatformId": "4",
					"targetPlatformId": "1",
					"players": [{
						"playerAccount": "yunvinceyh5522",
						"realName": "xx",
						"gender": true,
						"DOB": null,
						"phoneNumber": "138******5522",
						"email": "xxxx@xxxx.xx",
						"registerTime": "2018-04-18T06:56:33.256Z",
						"lastLoginTime": "2018-04-18T06:56:33.256Z",
						"totalLoginTimes": 0,
						"totalDepositTimes": 8,
						"totalDepositAmount": 500,
						"fame": [‘xx’, ‘xxx’],
						"playerValue": 3.5,
						"playerLevel": "特邀贵宾",
						"totalWithdrawTimes": 0,
						"gameLobby": [‘xxxx’, ‘xx8’]
					},{
						"playerAccount": "yunvinceyh7777",
						"realName": "xx",
						"gender": true,
						"DOB": null,
						"phoneNumber": "134******7777",
						"email": "",
						"registerTime": "2018-04-18T07:15:23.840Z",
						"lastLoginTime": "2018-04-18T07:15:23.840Z",
						"totalLoginTimes": 0,
						"totalDepositTimes": 0,
						"totalDepositAmount": 0,
						"fame": [],
						"playerValue": 3.1,
						"playerLevel": "普通会员",
						"totalWithdrawTimes": 0,
						"gameLobby": []
					}]
				}
			}
	* 响应内容：`{"status": 200,"data": {} // player data}`

<div id='获取平台设置2'></div>

* **11. 获取平台设置**
	* Function  name: getPlatformSetting
	* 请求内容：`{platformId: “xxx”}`
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"platformId": "1",
					"platformName": "xxxx",// 平台名称
					"playerAccountPrefix": "xxxx",// 玩家帐号字首
					"partnerAccountPrefix": "xxxx"// 代理帐号字首
				}
			}
	* 失败内容：`{"status": 4XX}`

<div id='获取QRCODE'></div>

* **12. 获取QR CODE**
	* Function  name: turnUrlToQr
	* 请求内容：
		* ```
			{
				targetUrl: “[www.facebook.com](http://www.facebook.com)”
				service:platform
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAACECAYAAABRRIOnAAAAAklEQVR4AewaftIAAAONSURBVO3BQY7kRgADwWSh///l9Bx84EmAIPWsvWBE/MHMvw4z5TBTDjPlMFMOM+UwUw4z5TBTDjPlMFMOM+UwUw4z5TBTDjPlw0NJ+E0qb0pCU7mShCsqLQm/SeWJw0w5zJTDTPnwMpU3JeGJJLxJ5QmVNyXhTYeZcpgph5ny4cuScIfKHUm4Q6Ul4UoSmkpLQlO5Iwl3qHzTYaYcZsphpnz4y6hcSUJTuaJyReVvcpgph5lymCkf/jJJuCMJT6j8TQ4z5TBTDjPlw5ep/EkqLQlNpSXhjiQ0lTtU/ksOM+UwUw4z5cPLkvAnqbQkNJWWhKbSktBUWhLuSMJ/2WGmHGbKYaZ8eEjlv0zlikpLQlNpSbhD5f/kMFMOM+UwUz48lISm0pLwJpWmciUJTaUloam0JDSVO5LwJpVvOsyUw0w5zJQPX6ZyJQlN5YkkNJWWhKZyReVKEppKU2lJaCp3JKGpvOkwUw4z5TBT4g9+URKaSkvCFZU3JaGpXEnCHSpXktBUWhLuUHniMFMOM+UwUz48lISm0pLwhEpLQlP5piQ0lZaEJ1RaEppKS0JTedNhphxmymGmxB+8KAl3qLQkXFFpSXhC5U1JuKLSkvAmlScOM+UwUw4z5cNDSWgqLQl3qFxJwhWVO5Jwh0pLQlO5koSmciUJV1TedJgph5lymCnxBw8koak8kYRvUrmShDeptCQ0lZaEJ1SeOMyUw0w5zJQPf1gSrqhcSUJTaUm4koQrKnck4QmVK0loKm86zJTDTDnMlA+/LAlXVFoSrqi0JDyh0pLwRBKuJOGJJDSVJw4z5TBTDjMl/uB/LAlNpSWhqTyRhCsqdyShqVxJQlN502GmHGbKYabEHzyQhN+kciUJTaUl4YrKHUloKi0JTaUl4U0qTxxmymGmHGbKh5epvCkJV5JwJQlXVK4koancoXKHyh1JeNNhphxmymGmfPiyJNyh8iaVloQ7VFoSriThiSRcUfmmw0w5zJTDTPnwl0tCU2lJ+E0qLQlXVFoSvukwUw4z5TBTPvxlVO5QaUm4otKS0FSuJKGp3KHSkvCmw0w5zJTDTPnwZSrfpNKScEWlJeGKSkvCm5LQVP6kw0w5zJTDTPnwsiT8piS8SaUl4YpKS0JTaSpXkvAnHWbKYaYcZkr8wcy/DjPlMFMOM+UwUw4z5TBTDjPlMFMOM+UwUw4z5TBTDjPlMFMOM+UfwNqREWPXra8AAAAASUVORK5CYII="
			}
	* 失败内容：`{"status": 4XX}`

<div id='获取模板设置'></div>

* **13. 获取模板设置**
	* Function  name: getTemplateSetting // 请对应FPMS 功能（前端功能模版配置）
	* 请求内容：
		* ```
			{
				Platform ID: “1”
				url: “[www.google.com](http://www.google.com)” // 当下域名（非必填），无填入则返回预设模版配置。有域名则查询是否在特殊模版中，返回特殊模版的配置。
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
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
				}]
			}
	* 失败内容：`{"status": 4XX}`

<div id='IP+域名log'></div>

* **14. IP + 域名log （統計域名瀏覽次數、IP瀏覽次數、以及APP開戶可根據IP抓到來源）**
	* Function name: addIpDomainLog
	* 请求内容：
		* ```
			{
				platformId: “1”, //必填
				domain: “google.com”, //必填, 不要http, www, 和开户网址配置的相同,
				sourceUrl: “[www.baidu.com](http://www.baidu.com)” //跳转至官网网址, 用户来源
				partnerId: ‘123’ 代理ID
			}
	* 响应内容：`{"status": 200}`

<div id='获取平台锁大厅配置'></div>

* **15. 获取平台锁大厅配置**
	* name: getLockedLobbyConfig
	* service:platform
	* 请求内容： `{platformId: “1”, //平台ID - 必填(该接口获取的是平台的锁大厅配置，不需要登陆状态)}`
	* 响应内容：
		* ```
			{  
				"status": 200,  
				"data":[{  
					nickName: '真人游戏', //锁大厅名称(无名称是 为 '' 例如：nickName： ‘’ )  
					id: 1, //锁大厅ID(该id为后台设置锁大厅配置时候填入的id（注意：不是游戏平台id）)
				}]
	* 操作失败：status--4xx, data-null, errorMessage:””
	* 无配置时候，返回[] 即空数组


<div id='前端保存数据接口'></div>

* **16. 前端保存数据接口**
	* name: saveFrontEndData
	* service:platform
	* 请求内容：
		* ```
			{
				platformId: 1, //平台ID - 必填
				token: “6624afw6gfdgw234”, //FPMS用户验证token- 必填
				page: 1, //请求页面- 必填
				data: “abc” //保存的数据- 必填
			}
	* 响应内容：
		* ```
			{  
				"status": 200,
				"data": {
					"_id": "5bc59fb8aed7af825a9e0248",
					"page": 1,
					"platform": "5733e26ef8c8a9355caf49d8",
					"__v": 0,
					"data": "abc"
				}
			}
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='前端获取数据接口'></div>

* **17. 前端获取数据接口**
	* name: getFrontEndData
	* service:platform
	* 请求内容：
		* ```
			{
				platformId: 1, //平台ID - 必填
				page: 1, //请求页面- 必填
			}
	* 响应内容：`{  "status": 200,"data": "abc"  }`
	* 操作失败：status--4xx, data-null, errorMessage:””

<div id='获取前端設置数据接口'></div>

* **18. 获取前端設置数据接口**
	* name: getFrontEndConfig
	* service:platform
	* 请求内容：
		* ```
			{
				platformId: 1, //平台ID - 必填
				code: ‘reward’, // 设置的code- 必填
				clientType: 1 设备-必填//
			}
	* 响应内容：`{  "status": 200,"data": [{}]  }`
	* 操作失败：status--4xx, data-null, errorMessage:””
	* 特注：
		* clientType： 1 - PC; 2- H5; 4- APP
		* displayFormat: 1 - 背景展示; 2 - 平铺2项1列; 3 - 平铺3项1列; 5 - 平铺5项1列
		* onClickAction: 1 - 打开新页面； 2 - 活动详情； 3 - 跳转优惠页面； 4 - 跳转官网页面； 5 - 启动游戏； 6 - 啥都不干; 7 - 自定义文本
		* topButtonClick, rightButtonClick, bottomButtonClick, rewardButtonClick: 1 - 前往指定页面； 2 - 返回； 3 - 申请优惠； 4 - 联络客服
		* code: 
		    * recommendation - 热门推荐
			* rewardPoint - 积分说明
			* game - 游戏配置
			* carousel - 轮播配置
			* advertisement - 弹窗广告
			* pageSetting - 网站配置
			* skin - 皮肤管理
			* reward - 优惠配置 (新增全部分类组: 排序号 orderNumber)
			* description - 文本说明
			* registrationGuidance - 注册引导
			* partnerCarousel - 代理轮播配置
			* partnerPageSetting - 代理网站配置
			* partnerSkin - 代理皮肤管理

<!--文档没有华语名称，因此暂时命名“奖励点数”-->
# 奖励点数：
提供奖励点数相关服务的接口。

### service: rewardPoints
#### 功能列表：

<div id='获取积分排名列表'></div>

* **1. 获取积分排名列表**
	* name: getRewardPointsRanking
	* 请求内容：
		* ```
			{
				platformId:1, // 平台ID，必填
				totalRank:10 //显示数量，选填，不填时初始值为10
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"data": [{
						"playerName": "yu***nceplatinumdragon", // 玩家名称
						"playerLevel": "普通会员", // 玩家等级
						"lastUpdate": "2017-12-01T09:27:55.916Z",  // 最后更新时间
						"points": 67  // 分数
					},{
						"playerName": "yu***ncetopazdragon",
						"playerLevel": "普通会员",
						"lastUpdate": "2017-12-18T07:02:38.172Z",
						"points": 9
					},… // 重复次数根据totalRank
				}
			}

<div id='获取登入积分信息'></div>

* **2. 获取登入积分信息**
	* name: getLoginRewardPoints
	* 登入
		* 请求内容：无
	* 没登入
		* 请求内容：`{platformId:1}`
		* 响应内容：
			* ```
				{
					"status": 200,
					"data": {
						"data": [{
							"period": 6, // 0:无周期,1:每日,2:每周,3:每半个月,4:每月,5:每年,6:自定义周期
							"index": 1, //排序
							"consecutiveCount": 1, //累积登入天数
							"rewardPoints": 20,
							"rewardTitle": "test points",
							"rewardContent": "test definition",  //内文说明
							"status": true,  //登入积分开关
							"createTime": "2017-12-06T06:36:41.801Z",
							"progress": {
								"isApplicable": false,  //能否领取
								"isApplied": false,  //已领取
								"count": 0  //玩家登入天数
							},
							"startTime": "2017-12-21T16:00:00.000Z",  //周期开始时间
							"endTime": "2017-12-29T16:00:00.000Z"  //周期结束时间
						},{
							"period": 4,
							"index": 2,
							"consecutiveCount": 1,
							"rewardPoints": 30,
							"rewardTitle": "test month",
							"rewardContent": "test month defi",
							"status": false,
							"createTime": "2017-12-06T06:53:30.690Z",
							"progress": {
								"count": 1,
								"isApplied": true,
								"isApplicable": true
							},
							"startTime": "2017-11-30T16:00:00.000Z",
							"endTime": "2017-12-31T15:59:59.999Z"
						}]
					}
				}

<div id='获取游戏积分信息'></div>

* **3. 获取游戏积分信息**
	* name: getGameRewardPoints
	* 登入
		* 请求内容：无
	* 没登入
		* 请求内容：`{platformId:1}`
		* 响应内容：
			* ```
				{
					"status": 200,
					"data": {
						"data": [{
							"period": 1, // 0:无周期,1:每日,2:每周,3:每半个月,4:每月,5:每年,6:自定义周期
							"index": 1, //排序
							"consecutiveCount": 1, //累积登入天数
							"rewardPoints": 9,
							"rewardTitle": "test game", // 奖励标题
							"rewardContent": "game test", // 奖励内容
							"target": {
								"dailyValidConsumptionAmount": 11
							},
							"status": true, //登入积分开关
							"createTime": "2017-12-26T02:01:11.414Z",
							"progress": { //玩家进度，会根据target参数返回不同progress
								"isApplicable": false,
								"isApplied": false,
								"count": 0,
								"todayConsumptionAmountProgress": 0
							},
							"startTime": "2017-12-25T16:00:00.000Z",
							"endTime": "2017-12-26T16:00:00.000Z",
							"eventObjId": "5a41ad677ea92401a75ad310"
						},{
						"period": 2,
						"index": 2,
						"rewardTitle": "test game2",
						"rewardContent": "game test 2",
						"target": {
							"singleConsumptionAmount": 10,
							"dailyConsumptionCount": 2
						},
						"status": true,
						"createTime": "2017-12-26T03:18:02.568Z",
						"consecutiveCount": 1,
						"rewardPoints": 8,
						"progress": {
							"isApplicable": false,
							"isApplied": false,
							"count": 0,
							"todayConsumptionCount": 1
						},
						"startTime": "2017-12-24T16:00:00.000Z",
						"endTime": "2017-12-31T16:00:00.000Z",
						"eventObjId": "5a41bf6a3c157c6376e98c18"
					},{
						"period": 1,
						"index": 3,
						"consecutiveCount": 1,
						"rewardPoints": 7,
						"rewardTitle": "test game3",
						"rewardContent": "game test 3",
						"target": {
							"dailyWinGameCount": 2
						},
						"status": true,
						"createTime": "2017-12-26T03:21:14.401Z",
						"progress": {
							"isApplicable": false,
							"isApplied": false,
							"count": 0,
							"todayWinCount": 1
						},
						"startTime": "2017-12-25T16:00:00.000Z",
						"endTime": "2017-12-26T16:00:00.000Z",
						"eventObjId": "5a41c02a3c157c6376e98c1d"
					}]
				}}

<div id='获取存款积分信息'></div>

* **4. 获取存款积分信息**
	* name: getTopUpRewardPointsEvent
	* 请求内容：`{platformId:xxxxxx}`  // 平台ID
	* 响应内容：
		* ```
			{
			 "status": 200,
			 "data":[{
				 "_id": "5a4217464ab51805447f9d00",  // 活动ID
				 "period": 1,  // 期间
				 "consecutiveCount": 1,  // 必须要在周期内 N 天达成才能领取积分
				 "rewardPoints": 8,  // 领取积分数量
				 "rewardTitle": "50块送8",  // 积分活动名称
				 "target": {  // 达成目标
					 "dailyTopupAmount": 50  // 需求当日存款额度
				},
				"status": true,
				"createTime": "2017-12-26T09:32:54.164Z",  //创建时间
				"progress": {  // 玩家活动进度
					"isApplicable": false,  // 可申请
					"isApplied": false,  // 已领取
					"count": 0  // 已达成天数
				},
				"startTime": "2017-12-25T16:00:00.000Z",  // 开始时间
				"endTime": "2017-12-26T16:00:00.000Z"  // 结束时间
			}]}
	* 注： 期间：  
		* 1 - 每日
		* 2 - 每周
		* 3 - 每半月
		* 4 - 每月
		* 5 - 无周期
	* （一般上可以直接参考开始时间和结束时间）

<div id='手动申请积分活动奖励'></div>

* **5. 手动申请积分活动奖励**
	* **注：需登入后才能申请**
	* name: applyRewardPoint
	* 请求内容：`{eventObjectId: "5a3e14d97417383af4f7d54b"}`  // 活动ID
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"rewardPointsObjId": "5ae14a5bb61984f65c6a80aa",
					"creator": "yunvincetest0013", //提案人
					"category": 1, //积分任务类型
					"rewardTitle": "login 1",
					"rewardContent": "login 1",
					"userAgent": 1, //装置
					"status": 1, //提案状态
					"playerName": "yunvincetest0013", //玩家账号
					"oldPoints": 0, //变化前积分
					"newPoints": 5, //变化后积分
					"amount": 5, //积分变量
					"currentDayAppliedAmount": 0, //单日积分上限
					"maxDayApplyAmount": 10, //单日获取积分上限
					"playerLevelName": "高级",
					"remark": "",
					"rewardTarget": {
						"targetDestination": [
							"",
							"57970a907f46b02427067245",
							"57985b83611cd9d838274d9a",
							"5799d77b9803c16f52ec8e68",
							"5799d6bc9803c16f52ec8e67",
							"57bc008b2157c3ee35e81ca1"
						], //积分目标。如：登入目标
						"gameProviderPT": false
					}
				}
			}
	* 失败内容：`{"status": 4XX}`

<div id='获取任务信息'></div>

* **6. 获取任务信息**
	* name: getMissonList
	* 请求内容：`{platformId:xxxxxx}`  // 平台ID
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"pointRanking": [{
						"account": "yu***ncetest0013", //玩家账号
						"grade": "高级", //等级
						"totalPoint": 171, //总分数
						"rank": 1 //排名
					}],"playerPointInfo": [{
						"rank": 136, //目前登陆玩家排名
						"grade": "高级", 目前登陆玩家等级
						"totalPoint": 0 //目前登陆玩家分数
					}],"gamePointList": [{
						"id": "5abd9fa2dad91c60c98839e7",
						"refreshPeriod": "Daily", //刷新周期
						"device": "全选", //装置
						"gameType": "百家乐", //游戏类别
						"betDetail": ["闲“], //下注项目
						"title": "xxxx",
						"gradeLimit": 0, //等级限制
						"gradeName": "普通会员",
						"point": 1,//获得积分
						"status": 0, //0代表初始状态,不可领取,1:可领取,2:已领取
						"dailyRequestBetCountsAndAmount": [0,1],//（三选一）的项目之一，（前：每日投注笔数）+（后：每笔最低单笔投注金额）
						"dailyBetConsumption": 10,//（三选一）有效投注额,
						"dailyWinBetCounts": 0, //（三选一）每日胜利次数
						"providerId": ["56"],
						"goal": 1,// 累积天数
						"currentGoal": 0// 目前满足条件的天数
					}],"loginPointList": [{
						"id": "5ae01b32a4c7f3a54222f08f",
						"refreshPeriod": "Daily",// 刷新周期
						"device": "全选",//装置
						"title": "login 1",
						"content": "login 1",
						"gradeLimit": 0,//等级限制,用户等级必须>=此等级时才可以领取,不然就报错:您的等级不够
						"gradeName": "普通会员",
						"point": 5,//获得积分
						"status": 1,//0代表初始状态,不可领取,1:可领取,2:已领取
						"providerId": ["16"],
						"goal": 1,// 累积天数
						"currentGoal": 1// 目前满足条件的天数
						"turnQualifiedLoginDate": 2018-05-09T // 准确转成合格的登入日期(举例：任务本月累积5天登入（7/1、7/3、7/5、7/7、7/9），则 turnQualifiedLoginDate：7/9）
					}],
					"rechargePointList": [{
						"id":"05ae01b32a4c7f3a54222f08",
						"refreshPeriod":"monthly",// 刷新周期
						"device":“h5玩家” //装置
						"depositType":"在线充值,个人微信",//存款类型，可从FPMS获得
						"onlineTopupType":"0,1,2,3",//在线充值类型（如：微信扫码,快捷支付）
						"manualTopupType":"0,1,2,3, // 手工存款方式（如：ATM、网银支付）
						"bankCardType":"0,1,2,3,"//银行卡类型（如：中国银行,农业银行）
						"dailyRequestDeposit":100 // 每日充值金额
						"title":"存款200元",
						"content":"存款200元以上可获得积分",
						"gradeLimit":"2",
						"point":20,//获得积分
						"status":0,
						"goal":7, // 累积充值天数
						"currentGoal":4 // 目前满足条件的充值天数
					}]
				}
	* 失败内容：`{"status": 4XX}`

<div id='积分规则'></div>

* **7. 积分规则**
	* name: getPointRule
	* 请求内容：{platformId:xxxxxx}  // 平台ID
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					"preDailyExchangedPoint": 0,
					"preDailyAppliedPoint": 0,
					"refreshPeriod": "Weekly",
					"list": [{
						"gradeId": 0,
						"gradeName": "普通会员",
						"dailyGetMaxPoint": 1000, //单日获取积分上限
						"preExchangeRate": 8, //提前兑换真钱比例
						"preDailyExchangeMaxPoint": 2, // 提前、单日最高可兑换积分
						"endExchangeRate": 6, // 到期兑换比例
						"endExchangeMaxPoint": 6, //到期最高可兑换积分
						"requestedValidBetTimes": 5, //兑换真钱后，真钱的流水倍数
						"lockedGroupId": "", //锁大厅组的ID
						"lockedGroupName": "自由额度" // 锁大厅组的名字
					}]
				}
			}
	* 失败内容：`{"status": 4XX}`

<div id='积分兑换真钱'></div>

* **8. 积分兑换真钱**
	* name: applyPointToCredit
	* 请求内容：`{point: xxxxxx}`  // 欲兑换的积分
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": {
					“message”: “领取成功: 使用 (30) 积分， 兑换 (1) 真钱”
				}
	* 失败内容：
		* ```
			{
				"status": 4XX,
				“name”: “DataError”,
				“errorMessage”: “兑换失败，欲兑换的点数不足最低金额（1）元”
			}
	* "status":200, // 状况1：有足够的积分可以兑换真钱，没有积分馀数（真钱＝整数且馀0）。如：300（积分）/30（兑换比例）＝10（现金） 馀 0（积分）  
msg:"兑换成功，已用（300）积分,换取（10）元。"
	* "status":200, // 状况2：有足够的积分可以兑换真钱，且『有』积分馀数。如：329（积分）/30（兑换比例）＝10 （现金）馀 29（积分）  
msg:"兑换成功，已用（300）积分,换取（10）元。剩馀（29）积分不足兑换（1）元，已返回帐户。"
	* "status":200, // 状况3：有足够的积分可以兑换真钱，但部分积分超出单日可兑换限额。如欲兑换：300（积分）/30（兑换比例）＝10（现金） 馀 0（积分），但今日 180（积分）  
	* msg:"兑换成功，已用（180）积分,换取（6）元。剩馀（120）积分超出单日兑换上限（180）积分，已返回帐户。"  
	* "status":465, // 状况4：兑换失败，兑换的点数，不足最低金额 1 元。如：29（积分）/30（兑换比例）＝0（现金）馀 29（积分）  
	* errorMessage:"兑换失败，欲兑换的点数不足最低金额 （1） 元"  
	* "status":465, // 状况5：兑换失败，今日已达兑换上限。如：今日已经兑换了 180 分（满了），欲再次兑换 30 分。  
	* errorMessage:"兑换失败，今日已达兑换上限（180）积分"

<div id='扣除积分'></div>

* **9. 扣除积分**
	* name: deductPointManually
	* 需要玩家登入
	* 请求内容：
		* ```
			{
				requestId:”0.8575614151388058”, //非必填
				pointToDeduct:-50, //扣除的分数（一定要负数）
				remark: “remark sample”
			}
	* 响应内容：`{"status": 200}`
	* 失败内容：`{"status": 4XX}`

<div id='扣除积分2'></div>
<!--这里可能存在命名错误，或许叫“获取积分变换记录” ？-->

* **10. 扣除积分**
	* name: getPointChangeRecord
	* 需要玩家登入
	* 请求内容：
		* ```
			{
				startTime: 2018-06-02T00:00,
				endTime: 2018-06-30T00:00,
				pointType:1,  // 积分类型：不填-所有（预设）、1-登入积分、2-存款积分、3-游戏积分、4-积分扣除、5-积分增加、6-提前积分兑换、7-到期积分兑换、8-积分扣除（取消退还）、9-提前积分兑换（取消退还）、10-到期积分兑换（取消退还）
				status: 1, //积分变化状态：不填-所有（预设), 0-待审核, 1-已执行, 2-已取消
				platformId：”4” //平台id
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
					"pointRecordId": "1774", //积分ID
					"pointType": 2,
					"title": "15 p", //文字标题
					"device": "WEB玩家", //装置（TEXT 形式）
					"status": 1,
					"beforePoint": 30, //变化前积分
					"afterPoint": 45, //变化后积分
					"pointChange": 15, //积分变量（注意有可能负号）
					"dailyClaimedPoint": 30, //当下单日已获得积分（栏位：单日积分上限的分子）
					"dailyClaimMaxPoint": 200, //单日积分上限（栏位：单日积分上限的分母）
					"createTime": "2018-06-08T03:21:31.540Z",
					"playerLevelText": "高级", //会员等级名称（TEXT 的形式）
					"remark": "" //备注中的内容
				},{
					"pointRecordId": "1773",
					"pointType": 2,
					"title": "haha top up",
					"device": "WEB玩家",
					"status": 1,
					"beforePoint": 0,
					"afterPoint": 30,
					"pointChange": 30,
					"dailyClaimedPoint": 0,
					"dailyClaimMaxPoint": 200,
					"createTime": "2018-06-08T03:21:24.053Z",
					"playerLevelText": "高级",
					"remark": ""
				}]
			}
	* 失败内容：`{"status": 4XX}`

<div id='手动批量申请积分活动奖励'></div>

* **11. 手动批量申请积分活动奖励**
	* 注：需登入后才能申请
	* name: applyRewardPoints
	* 请求内容：
		* ```
			{
				eventObjectIds: [  // 活动ID
					"5a3e14d97417383af4f7d54b",
					“5a3e14d97417383af4f7d54c”,
				]
			}
	* 响应内容：
		* ```
			{
				"status": 200,
				"data": [{
					"rewardPointsObjId": "5ae14a5bb61984f65c6a80aa",
					"creator": "yunvincetest0013", //提案人
					"category": 1, //积分任务类型
					"rewardTitle": "login 1",
					"rewardContent": "login 1",
					"userAgent": 1, //装置
					"status": 1, //提案状态
					"playerName": "yunvincetest0013", //玩家账号
					"oldPoints": 0, //变化前积分
					"newPoints": 5, //变化后积分
					"amount": 5, //积分变量
					"currentDayAppliedAmount": 0, //单日积分上限
					"maxDayApplyAmount": 10, //单日获取积分上限
					"playerLevelName": "高级",
					"remark": "",
					"rewardTarget": {
						"targetDestination": [
							"",
							"57970a907f46b02427067245",
							"57985b83611cd9d838274d9a",
							"5799d77b9803c16f52ec8e68",
							"5799d6bc9803c16f52ec8e67",
							"57bc008b2157c3ee35e81ca1"
						], //积分目标。如：登入目标
						"gameProviderPT": false
					}
				}
			}]
	* 失败内容：`{"status": 4XX}`


# 电销服务：
提供电销服务相关服务的接口。

### service: dxmission
#### 功能列表：

<div id='单一电话导入现有任务'></div>

* **1. 单一电话导入现有任务**
	* name:  insertPhoneToTask
	* 请求内容：`{platformId:”1”, phoneNumber: “10000000001”, taskName: “task1”, autoSMS: 1}`
	* platformId: 玩家注册平台
	* phoneNumber: 电话号码
	* taskName: 任务名字 或者 任务的ObjectId
	* autoSMS: 1-发送SMS， 0-不发送SMS // number
	* 响应内容：`{ status: 200/400/405, data: {message: “xxxx”} }`
	* 操作成功：status--200
	* 操作失败：status--400/405
	* 状况1 - 号码已经开户
	* status: 400
	* message：号码已经开户此号码已注册网站会员罗，新会员才能抽
	* 状况2 - 号码没开户，但已经加入『同个』任务奖
	* status: 400
	* message：此号码已加入此活动了，欢迎介绍朋友抽奖喔！
	* 状况3 - 号码顺利导入任务(最多能发3次， 过后会回到状况2)
	* status:200
	* message：您已获得x元奖金，请注意短信接收。
	* 状况4 - 同IP一小时内请求超过5次
	* status: 400
	* message：该玩家IP地址已在1小时内达申请上限（5）次，请稍后再次尝试。

<div id='提交电销代码'></div>

* **2. 提交电销代码**
	* name:  submitDXCode
	* 请求内容：`{code: “4g83123d”, domain: “eu23333.com”}`
	* code: 电销注册代码
	* domain: 当下注册域名
	* 响应内容：
		* ```
			{
				status: 200/400/405,
				data: {
					redirect: “foobar.com playerId=yunvince6896&token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoieXVudmluY2V5aDY2ODgiLCJwYXNzd29yZCI6IiQyYSQxMCREejhRSFhmTjJjeWtnWHBrdXVFZHdlVjVlZ1NTeDNIb2NXaEx5VnBzZWU5cWtpMXY3c3dRNiIsImlhdCI6MTUyOTkwODUxNCwiZXhwIjoxNTI5OTI2NTE0fQ.xts8n_iucqybjQG7eDhie-akmlz_YIAi9D-4ZING9nI”
				}
			}
	* 操作成功：status--200
	* playerId: 玩家ID，authenticate用
	* token: 玩家验证，用于重新建立链接
	* 操作失败：status--200/400/401/431
	* 状况1 - 此电销代码已注册，注册后玩家以修改密码
	* status: 401
	* message：密码已更换
	* 状况2 - 此电销代码不存在
	* status: 431
	* message：电销代码不存在
	* 状况3 - 电销代码顺利注册/登入
	* 回文如响应内容
	* 状况4 - 其他异常状况
	* status: 400


# 微信群控：
提供电销服务相关服务的接口。

### service: wcgroupcontrol
#### 功能列表：

<div id='群控发送心跳包维持链接'></div>

* **1. 群控发送心跳包维持链接**
	* name:  sendWCGroupControlSessionToFPMS
	* 必须在后台微信群控设置手机设备号、绑定设备腻称
	* 请求内容:
		* ```
			{
				deviceId - String // - 手机设备号 - 必填 //”abc123”
				adminId - String //FPMS登入帐号 //”admin”
				status - Num //系统状态 (1 - 在线, 2 - 离线) //1
				connectionAbnormalClickTimes - Num //本次连线异常点击 //1
			}
	* 响应内容:
		* ```
			{
				"status": 200,
				"data": {
					"__v": 0,
					"deviceId": "abc123",
					"deviceNickName": "abc123",
					"csOfficer": "57b6c8b33d71e6c469f2aa20",
					"status": 1,
					"platformObjId": "5733e26ef8c8a9355caf49d8",
					"lastActiveTime": "2018-11-30T07:36:14.995Z",
					"_id": "5c00e86ea74e6513542c6398",
					"createTime": "2018-11-30T07:36:14.997Z",
					"connectionAbnormalClickTimes": 0
				}
			}
	* 操作成功：status--200
	* 操作失败：status--4xx

<div id='客服与玩家对话'></div>

* **2. 客服与玩家对话**
	* name:  sendWechatConversationToFPMS
	* 连线后通过此接口发送客服对话
	* 请求内容:
		* ```
			{
				deviceId - String // - 手机设备号 - 必填 //“abc123”
				playerWechatRemark - String //备注 - 必填 //”player123”
				csReplyTime - Date //客服发送的对话时间 - 必填 // "2018-11-30T07:42:00.000Z"
				csReplyContent - String //客服发送的对话内容 //"player 123 test content 333"
			}
	* 响应内容:
		* ```
			{
				"status": 200,
				"data": {
					"__v": 0,
					"wcGroupControlSessionId": "5c00e9dca74e6513542c6399",
					"deviceId": "abc123",
					"deviceNickName": "abc123",
					"platformObjId": "5733e26ef8c8a9355caf49d8",
					"csOfficer": "57b6c8b33d71e6c469f2aa20",
					"playerWechatRemark": "player123",
					"csReplyTime": "2018-11-30T07:42:00.000Z",
					"csReplyContent": "player 123 test content 333",
					"_id": "5c00ea00a74e6513542c639a",
					"createTime": "2018-11-30T07:42:56.012Z"
				}
			}
	* 操作成功：status--200
	* 操作失败：status--4xx

<div id='绑定玩家微信号+昵称+备注'></div>

* **3. 绑定玩家微信号+昵称+备注**
	* **客服登陆群控时会使用此接口操做绑定玩家微信号+昵称+备注**
	* name:  bindPlayerWechatInfo
	* 请求内容:
		* ```
			{
				deviceId - String // - 手机设备号 - 必填 //”abc123”
				playerWechatRemark - String //备注 - 必填 //”player123”
				playerWechatId - String //玩家微信号 - 必填 //”wxplayer123”
				playerWechatNickname - String //玩家昵称 //”abcplayer123”
			}
	* 响应内容: `{"status": 200 / 4xx}`
	* 操作成功：status--200
	* 操作失败：status--4xx

# 拍卖：
提供拍卖相关服务的接口。

### service: auction
#### 功能列表：

<div id='查找拍卖商品'></div>

* **1. 查找拍卖商品**
	* name: getAuctions
	* 请求内容: {}
	* 响应内容:
		* ```
			{
				"status": 200,
				"data": [{
					"_id": "5c4132d7019cd1774d42f93f",
					"productName": "马年大拍卖",
					"registerStartTime": "2015-12-31T16:00:00.000Z",
					"registerEndTime": "2019-03-30T16:00:00.000Z",
					"startPeriod": [
						"2019-01-28T01:00:00.000Z",
						"2019-02-01T01:00:00.000Z"
					],"endPeriod": [
						"2019-02-03T22:00:00.000Z",
						"2019-02-02T23:00:00.000Z"
					],
					"reservePrice": 10,
					"startingPrice": 10,
					"priceIncrement": 5,
					"directPurchasePrice": 97,
					"productStartTime": 60,
					"productEndTime": 60,
					"rewardInterval": "weekly",
					"seller": "loah",
					"rewardData": {
						"messageContent": "打开",
						"messageTitle": "打卡",
						"useConsumption": false,
						"rewardAmount": 500,
						"unlockAmount": 300,
						"gameProviderGroup": "",
						"rewardType": "promotion"
					},
					"isExclusive": false,
					"publish": true,
					"status": 1
				},{
					"_id": "5c25f32de1e16011f81a4006",
					"productName": "年初大拍卖",
					"registerStartTime": "2016-01-01T00:00:00.000Z",
					"registerEndTime": "2019-03-31T00:00:00.000Z",
					"startPeriod": [
						"2019-02-01T01:00:00.000Z"
					],
					"endPeriod": [
						"2019-03-02T23:00:00.000Z"
					],
					"reservePrice": 10,
					"startingPrice": 0,
					"priceIncrement": 5,
					"directPurchasePrice": 100,
					"productStartTime": 10,
					"productEndTime": 10,
					"rewardInterval": "monthly",
					"seller": "koh",
					"rewardData": {
						"rewardType": "openPromoCode",
						"promoCode": "",
						"openPromoCode": "",
						"productImageUrl": "",
						"messageTitle": "",
						"messageContent": "",
						"gameProviderGroup": "",
						"unlockAmount": "",
						"rewardAmount": 10,
						"useConsumption": false,
						"realPrizeDetails": "",
						"rewardPointsVariable": "",
						"minimumTopUpAmount": 10,
						"spendingAmount": 10,
						"dueDateInDay": 10
					},"isExclusive": false,
					"publish": true,
					"status": 1
				}]
			}

<div id='竞标拍卖商品'></div>

* **2. 竞标拍卖商品**
	* name:  bidAuctionItem
	* 请求内容:
		* ```
			{
				platformId: String // 6
				productName: String // "年初大拍卖"
				bidAmount: String // 30
				rewardType: String //'promoCode' : 优惠代码竟拍,//'openPromoCode' : 开放代码竟拍//'promotion' : 促销优惠竟拍//'realPrize' : 实体奖品竟拍//'rewardPointsChange' : 积分变化竟拍
			}
	* 响应内容:
		* ```
			{
				"status": 200,
				"data": {
					"_id": "5c501518c3c8b63f531d7417",
					"proposalId": "405799",
					"status": "Pending",
					"type": {
						"_id": "5c3315c88d9f8d70605a7135",
						"platformId": "a71a6b88616ad166d2b92e30",
						"name": "AuctionRealPrize",
						"process": "5c3315c88d9f8d70605a712e",
						"executionType": "executeAuctionRealPrize",
						"rejectionType": "rejectAuctionRealPrize"
					},"inputDevice": 1,
						"settleTime": "2019-01-29T08:55:52.345Z",
						"expirationTime": "9999-12-31T23:59:59.000Z",
						"noSteps": true,
						"userType": "2",
						"entryType": "1",
						"priority": "0",
						"data": {
							"realNameBeforeEdit": "觉传传",
							"proposalPlayerLevel": "Normal",
							"playerLevelName": "Normal",
							"proposalPlayerLevelValue": 0,
							"directPurchasePrice": 100,
							"startingPrice": 10,
							"isExclusive": false,
							"rewardPointsVariable": "",
							"playerName": "pp2kkman33",
							"useConsumption": false,
							"seller": "opel",
							"updateAmount": 15,
							"auction": "5c25f32de1e16011f81a4006",
							"remark": "年初大拍卖",
							"currentBidPrice": 15,
							"productName": "年初大拍卖",
							"platformId": "a71a6b88616ad166d2b92e30",
							"playerObjId": "5bc42e1a331bbf500fc70467"
						},
						"createTime": "2019-01-29T08:55:52.345Z",
						"creator": {
							"name": "opel"
						},
						"__v": 0
					}
				}
	* 操作成功：status--200
	* 操作失败：status--4xx
	
# QQ群控：
提供QQ群控服务相关服务的接口。

### service: qqgroupcontrol
#### 功能列表：

<div id='QQ群控发送心跳包维持链接'></div>

* **1. QQ群控发送心跳包维持链接**
	* name:  sendQQGroupControlSessionToFPMS
	* 必须在后台QQ群控设置手机设备号、绑定设备腻称
	* 请求内容:
		* ```
			{
				deviceId - String // - 手机设备号 - 必填 //”abc222”
				adminId - String //FPMS登入帐号 //”admin”
				status - Num //系统状态 (1 - 在线, 2 - 离线) //1
				connectionAbnormalClickTimes - Num //本次连线异常点击 //1,
				qqVersion - String //QQ版本 //1.1.1
			}
	* 响应内容:
		* ```
			{
				"status": 200,
				"data": {
                    "__v": 0,
                    "deviceId": "abc222",
                    "deviceNickName": "test2",
                    "csOfficer": "57b6c8b33d71e6c469f2aa20",
                    "status": 1,
                    "platformObjId": "5732dad105710cf94b5cfaaa",
                    "lastActiveTime": "2019-10-02T01:34:15.712Z",
                    "qqVersion": "1.1.1",
                    "_id": "5d93fe9788967fc0eaa38bca",
                    "createTime": "2019-10-02T01:34:15.714Z",
                    "connectionAbnormalClickTimes": 0
                }
			}
	* 操作成功：status--200
	* 操作失败：status--4xx

<div id='QQ群控客服与玩家对话'></div>

* **2. QQ群控客服与玩家对话**
	* name:  sendQQConversationToFPMS
	* 连线后通过此接口发送客服对话
	* 请求内容:
		* ```
			{
				deviceId - String // - 手机设备号 - 必填 //“abc222”
				playerQQRemark - String //备注 - 必填 //”player123”
				csReplyTime - Date //客服发送的对话时间 - 必填 // "2018-11-30T07:42:00.000Z"
				csReplyContent - String //客服发送的对话内容 //"player 123 test content 333"
			}
	* 响应内容:
		* ```
			{
				"status": 200,
				"data": {
                    "__v": 0,
                    "qqGroupControlSessionId": "5d94005588967fc0eaa38bcc",
                    "deviceId": "222222",
                    "deviceNickName": "test2",
                    "platformObjId": "5732dad105710cf94b5cfaaa",
                    "csOfficer": "57b6c8b33d71e6c469f2aa20",
                    "playerQQRemark": "testbindremark22",
                    "csReplyTime": "2019-10-02T01:39:00.000Z",
                    "csReplyContent": "hi",
                    "_id": "5d94005a88967fc0eaa38bcd",
                    "createTime": "2019-10-02T01:41:46.761Z"
                }
			}
	* 操作成功：status--200
	* 操作失败：status--4xx

<div id='QQ群控绑定玩家QQ号+昵称+备注'></div>

* **3. QQ群控绑定玩家QQ号+昵称+备注**
	* **客服登陆群控时会使用此接口操做绑定玩家QQ号+昵称+备注**
	* name:  bindPlayerQQInfo
	* 请求内容:
		* ```
			{
				deviceId - String // - 手机设备号 - 必填 //”abc222”
				playerQQRemark - String //备注 - 必填 //”testbindremark22”
				playerQQId - String //玩家QQ号 - 必填 //”testbind2222222”
				playerQQNickname - String //玩家昵称 //”testbindnickname22”
			}
	* 响应内容: 
	    * ```
            {
                "status": 200,
                "data":  {
                    "__v": 0,
                    "deviceId": "abc222",
                    "platformObjId": "5732dad105710cf94b5cfaaa",
                    "playerQQRemark": "testbindremark22",
                    "playerQQId": "testbind2222222",
                    "playerQQNickname": "testbindnickname22",
                    "_id": "5d93ff4e88967fc0eaa38bcb",
                    "createTime": "2019-10-02T01:37:18.569Z"
                }
            }
	* 操作成功：status--200
	* 操作失败：status--4xx
