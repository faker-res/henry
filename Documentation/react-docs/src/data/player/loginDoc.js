import loginFlow from './../../img/login.jpg';
/*
    func.*.desc:
    for description of each function, it takes a string and convert '\n' to line break.

*/

let loginLogout = {
    name: "登入/登出",
    desc:`<img src=${loginFlow} />`,
    func: {
        login: {
            title: "登录",
            serviceName: "player",
            functionName: "login",
            desc: "玩家登录函数",
            requestContent: [
                { param: "name", mandatory: "是", type: 'String', content: '玩家用户名' },
                { param: "password", mandatory: "是", type: 'String', content: '玩家密码' },
                { param: "captcha", mandatory: "否", type: 'String', content: '验证码 (登录三次失败后需要填验证码)' },
                { param: "clientDomain", mandatory: "否", type: 'String', content: '登陆域名' },
                { param: "deviceId", mandatory: "否", type: 'String', content: '设备号' },
                { param: "checkLastDeviceId", mandatory: "否", type: 'Boolean', content: '检查上次登入设备是否与这次一样' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },
            ],
            respondSuccess: {
                status: 200,
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】",
                token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiZ2kwaWFvbjlnIiwicGFzc3dvcmQiOiIkMmIkMTAkOUVuQ0ZVTkFwTUFXTUVobVRJcHFvLlZoNWlUczFtNENGbExuYWJjWnM2WEx5WW9Tb04uL3UiLCJpYXQiOjE1NzUwMTk0OTAsImV4cCI6MTU3NTAzNzQ5MH0.QgNb5qR1BezK6Z-ojIEs9i7rYUejSwP3p3H9b6UB8iI",
            },
            respondFailure: {
                status: "40x",
                data: "null",
                errorMessage: "错误信息",
            }
        },
        isLogin: {
            title: "是否已成功登入",
            serviceName: "player",
            functionName: "isLogin",
            desc: "查询玩家是否登录。\n如果玩家已经登入，将会返回 true，\n如果尚未登入，则会返回 false。",
            requestContent: [
                { param: 'playerId', mandatory: "是", type: 'String', content: '玩家ID' }
            ],
            respondSuccess: {
                status: 200,
                data: "true / false",
            },
            respondFailure: {
                status: "40x",
                data: "null",
                errorMessage: "错误信息",
            },
        },
        authenticate: {
            title: "登陆状态验证",
            serviceName: "player",
            functionName: "authenticate",
            desc: "用于验证玩家webSocket链接是否有效。\n当玩家已登录，但是webSocket链接断开，再建立链接是可以用token来验证链接",
            requestContent: [
                { param: 'playerId', mandatory: "是", type: 'String', content: '玩家ID' },
                { param: 'token', mandatory: "是", type: 'String', content: '玩家token' },
                { param: 'isLogin', mandatory: "否", type: 'Boolean', content: '是否进行玩家登陆行为' },
                { param: 'clientDomain', mandatory: "否", type: 'String', content: '玩家所在域名' },
            ],
            respondSuccess: {
                status: 200,
                data: "true",
            },
            respondFailure: {
                status: "40x",
                data: "null",
                errorMessage: "错误信息",
            },
        },
        playerLoginOrRegisterWithSMS: {
            title: "电话号码注册与登陆",
            serviceName: "player",
            functionName: "playerLoginOrRegisterWithSMS",
            desc: "通过电话号码注册或登入 playerObject包含token，用于重新建立链接, isHitReferralLimit-是否达到推荐人上限（true/false-给前端处理信息）",
            requestContent: [
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
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】",
            },
            respondFailure: {
                status: '4xx',
                data: "null",
            },
        },
        phoneNumberLoginWithPassword: {
            title: "玩家电话号码与密码登入",
            serviceName: "player",
            functionName: "phoneNumberLoginWithPassword",
            desc: "使用电话号码和密码登入 玩家登录函数",
            requestContent: [
                { param: "phoneNumber", mandatory: "是", type: 'String', content: '玩家手机号' },
                { param: "password", mandatory: "是", type: 'String', content: '玩家密码' },
                { param: "captcha", mandatory: "否", type: 'String', content: '验证码 (登录三次失败后需要填验证码)' },
                { param: "clientDomain", mandatory: "否", type: 'String', content: '登陆域名' },
                { param: "deviceId", mandatory: "否", type: 'String', content: '设备号' },
                { param: "checkLastDeviceId", mandatory: "否", type: 'Boolean', content: '检查上次登入设备是否与这次一样' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },
            ],
            respondSuccess: {
                status: 200,
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】",
            },
            respondFailure: {
                status: '40x',
                data: "null",
            },
        },
        createGuestPlayer: {
            title: "生成游客账号",
            serviceName: "player",
            functionName: "createGuestPlayer",
            desc: "",
            requestContent: [
                { param: "guestDeviceId", mandatory: "是", type: 'String', content: '设备ID' },
                { param: "phoneNumber", mandatory: "否", type: 'String', content: '填写则绑定电话号码+设备ID' },
                { param: "accountPrefix", mandatory: "否", type: 'String', content: '账号名字前缀 默认 "g"' },
                { param: "referralId", mandatory: "否", type: 'String', content: '推荐人邀请码' },
                { param: "deviceType", mandatory: "否", type: 'Int', content: '设备类型列表' },
                { param: "subPlatformId", mandatory: "否", type: 'Int', content: '子平台列表' },
                { param: "domain", mandatory: "否", type: 'String', content: '当下注册域名' },
            ],
            respondSuccess: {
                status: 200,
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】",
                token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiZ2kwaWFvbjlnIiwicGFzc3dvcmQiOiIkMmIkMTAkOUVuQ0ZVTkFwTUFXTUVobVRJcHFvLlZoNWlUczFtNENGbExuYWJjWnM2WEx5WW9Tb04uL3UiLCJpYXQiOjE1NzUwMTk0OTAsImV4cCI6MTU3NTAzNzQ5MH0.QgNb5qR1BezK6Z-ojIEs9i7rYUejSwP3p3H9b6UB8iI",
                isHitReferralLimit: "false //是否达到推荐人上限（true/false-给前端处理信息)"
            },
            respondFailure: {
                status: "4xx",
                data: "null",
            }
        },
        logout: {
            title: "注销",
            serviceName: "player",
            functionName: "logout",
            desc: "",
            requestContent: [],
            respondSuccess: {
                status: 200,
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
    }
}

export default loginLogout;
