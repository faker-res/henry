// ********************************************* login data ***********************************

const loginRequestContent = {
    platformId: "必填|String|玩家注册平台",
    name: "必填|String|玩家用户名",
    password: "必填|String|玩家密码",
    captcha: "选填|String|验证码 (登录三次失败后需要填验证码)",
    clientDomain: "选填|String|登陆域名",
    deviceId: "选填|String|设备号",
    checkLastDeviceId: "选填|Boolean|检查上次登入设备是否与这次一样",
    deviceType: "选填|设备类型列表",
    subPlatformId: "选填|子平台列表"
};

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
const isLoginRequestContent = {
    playerId: "必填|String|玩家ID"
};

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
        login: {
            title:"登录",
            functionName: "Login",
            desc:"玩家登录接口",
            // requestContent: loginRequestContent ,
            // statusOfSuccess: loginStatusOfSuccess,
            // statusOfFailed: loginStatusOfFailed,
        },
        isLogin: {
            title: "是否已成功登入",
            functionName: "isLogin",
            desc:"查询玩家是否登录",
            requestContent: isLoginRequestContent ,
            statusOfSuccess: isLoginStatusOfSuccess,
            statusOfFailed: isLoginStatusOfFailed,
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