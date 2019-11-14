// ********************************************* login data ***********************************
const loginRequestContent = [
    {param: "platformId", mandatory: "是", type: 'String', content: '玩家注册平台'},
    {param: "name", mandatory: "是", type: 'String', content: '玩家用户名'},
    {param: "password", mandatory: "是", type: 'String', content: '玩家密码'},
    {param: "captcha", mandatory: "否", type: 'String', content: '验证码 (登录三次失败后需要填验证码)'},
    {param: "clientDomain", mandatory: "否", type: 'String', content: '登陆域名'},
    {param: "deviceId", mandatory: "否", type: 'String', content: '设备号'},
    {param: "checkLastDeviceId", mandatory: "否", type: 'Boolean', content: '检查上次登入设备是否与这次一样'},
    {param: "deviceType", mandatory: "否", type: '', content: '设备类型列表'},
    {param: "subPlatformId", mandatory: "否", type: '', content: '子平台列表'},
];

const loginStatusOfSuccess = {
    status: 200,
    data: "玩家对象",
    token: "玩家token",
};

const loginStatusOfFailed = {
    status: "40x",
    data: "-",
    errorMessage: "错误信息",
};

// ********************************************* isLogin data ***********************************
const isLoginRequestContent = [
    {param: 'playerId', mandatory: "是", type: 'String', content: '玩家ID'},
    {param: 'playerId', mandatory: "是", type: 'String', content: '玩家ID'}
];

const isLoginStatusOfSuccess = {
    status: 200,
    data: "已登录true, 未登录false",
};

const isLoginStatusOfFailed = {
    status: "40x",
    data: "-",
    errorMessage: "错误信息",
};


// ********************************************* Api data *************************************


let apiDoc = {
    login: {
        name: "登入",
        func:{
            login: {
                title:"登录",
                functionName: "login",
                desc:"玩家登录接口",
                requestContent: loginRequestContent ,
                respondSuccess: loginStatusOfSuccess,
                respondFailure: loginStatusOfFailed,
            },
            isLogin: {
                title: "是否已成功登入",
                functionName: "isLogin",
                desc:"查询玩家是否登录",
                requestContent: isLoginRequestContent ,
                respondSuccess: isLoginStatusOfSuccess,
                respondFailure: isLoginStatusOfFailed,
            },

        }
    },
    topup: {
        name: "充值"
    },
    reward: {
        name: "优惠",
    },
    consumtion: {
        name: "投注",
    }
};

export default apiDoc;
