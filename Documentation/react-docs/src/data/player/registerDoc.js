
let register = {
    name: "注册",
    func: {
        playerLoginOrRegisterWithSMS: {
            title: "电话号码注册与登陆",
            serviceName: "player",
            functionName: "playerLoginOrRegisterWithSMS",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: 'String', content: '平台ID' },
                { param: "phoneNumber", mandatory: "是", type: 'String', content: '玩家电话号码' },
                { param: "smsCode", mandatory: "是", type: 'String', content: '短信验证码' },
                { param: "accountPrefix", mandatory: "否", type: 'String', content: '玩家帐号前缀' },
                { param: "checkLastDeviceId", mandatory: "否", type: 'Boolean', content: '检查上次登入设备是否与这次一样' },
                { param: "referralId", mandatory: "否", type: 'String', content: '邀请码' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },
            ],
            respondSuccess: {
                status: 200,
                data: "玩家对象 // (包含token，用于重新建立链接, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）)",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        registerByPhoneNumberAndPassword: {
            title: "手机号码与密码注册",
            serviceName: "player",
            functionName: "registerByPhoneNumberAndPassword",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: 'String', content: '平台ID' },
                { param: "phoneNumber", mandatory: "是", type: 'String', content: '玩家电话号码' },
                { param: "smsCode", mandatory: "是", type: 'String', content: '短信验证码' },
                { param: "password", mandatory: "是", type: 'String', content: '密码' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },

            ],
            respondSuccess: {
                status: 200,
                data: "玩家对象 (包含token，用于重新建立链接)",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        createGuestPlayer: {
            title: "生成游客账号",
            serviceName: "player",
            functionName: "createGuestPlayer",
            desc: "",
            requestContent: [
                { param: "platformId", mandatory: "是", type: 'String', content: '平台ID' },
                { param: "guestDeviceId", mandatory: "是", type: 'String', content: '设备ID' },
                { param: "phoneNumber", mandatory: "否", type: 'String', content: '填写则绑定电话号码+设备ID' },
                { param: "accountPrefix", mandatory: "否", type: 'String', content: '账号名字前缀 默认 "g"' },
                { param: "referralId", mandatory: "否", type: 'String', content: '推荐人邀请码' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },
                { param: "domain", mandatory: "否", type: 'Int', content: '当下注册域名' },
            ],
            respondSuccess: {
                status: 200,
                data: "玩家对象 (玩家对象(包含token), token–玩家atock, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）)",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        create: {
            title: "玩家开户",
            serviceName: "player",
            functionName: "create",
            desc: "向服务端提交开户申请，开户成功需通过短信验证(1分钟后才能重发，5分钟短信失效).",
            requestContent: [
                { param: "name", mandatory: "是", type: 'String', content: '玩家注册的用户名.(需验证用户是否被占用)' },
                { param: "realName", mandatory: "否", type: 'String', content: '真实姓名' },
                { param: "password", mandatory: "是", type: 'String', content: '玩家密码' },
                { param: "platformId", mandatory: "是", type: 'String', content: '玩家注册平台' },
                { param: "referral", mandatory: "否", type: 'String', content: '推荐人的玩家用户名' },
                { param: "domain", mandatory: "否", type: 'String', content: '当下注册域名' },
                { param: "phoneNumber", mandatory: "否", type: 'String', content: '玩家手机号码' },
                { param: "email", mandatory: "否", type: 'String', content: '玩家邮箱' },
                { param: "gender", mandatory: "否", type: 'Int', content: '性别 // 1-男，0-女,' },
                { param: "DOB", mandatory: "否", type: 'Date', content: '生日' },
                { param: "smsCode", mandatory: "否", type: 'String', content: '短信验证码' },
                { param: "partnerName", mandatory: "否", type: 'String', content: '代理上线帐号,与代理上线D可则一 （如：p12345）' },
                { param: "partnerId", mandatory: "否", type: 'String', content: '代理上线ID,与代理上线帐号可则一（如：513451）' },
                { param: "qq", mandatory: "否", type: 'String', content: 'qq号码' },
                { param: "captcha", mandatory: "否", type: 'String', content: '图片验证码，代理上线开下线用，将不用smsCode' },
                { param: "sourceUrl", mandatory: "否", type: 'String', content: '注册来源（跳转域名）' },
                { param: "deviceId", mandatory: "否", type: 'String', content: '设备号' },
                { param: "referralId", mandatory: "否", type: 'String', content: '邀请码(推荐人的玩家ID)' },
                { param: "referralUrl", mandatory: "否", type: 'String', content: '邀请码链接' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },
            ],
            respondSuccess: {
                status: 200,
                data: "玩家对象(包含token), token–玩家atock, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        captcha: {
            title: "获取图形验证码",
            serviceName: "player",
            functionName: "captcha",
            desc: "从服务端获取验证码， 验证码以base64格式分发给客户端, 客户端接到之后显示出来。",
            requestContent: [],
            respondSuccess: {
                status: 200,
                data: "验证码base64字符串",
            },
            respondFailure: {
                status: "40x",
                data: "null",
                errorMessage: "",
            }
        },
    }
};

export default register;
