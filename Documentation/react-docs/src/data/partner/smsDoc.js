
let smsCode = {
    name:"短信验证码",
    func: {
        getSMSCode: {
            title: "获取手机验证码",
            serviceName: "partner",
            functionName: "getSMSCode",
            requestContent: [
                {param: "purpose", mandatory: "否", type: 'String', content: '请参考 【定义】-->【手机验证码 验证用途】列表\n注：不能是“newPhoneNumber"，请使用 【代理】-->【通过短信验证码修改代理手机号】。'},
                {param: "name", mandatory: "否", type: 'String', content: '代理帐号'},
                {param: "captcha", mandatory: "否", type: 'String', content: '图片验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "true // 发送验证码成功",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        }
    }
}

export default smsCode;