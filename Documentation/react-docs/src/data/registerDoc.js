
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
                { param: "referralId", mandatory: "否", type: 'Int', content: '邀请码' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },
            ],
            respondSuccess: {
                status: 200,
                data: "玩家对象 (包含token，用于重新建立链接, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）)",
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
    }
};

export default register;
