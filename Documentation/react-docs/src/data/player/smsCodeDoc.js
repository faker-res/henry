
let smsCode = {
    name: "短信验证码",
    func: {
        getSMSCode: {
            title: "获取手机验证码",
            serviceName: "player",
            functionName: "getSMSCode",
            desc: `玩家输入有效的手机号之后，点击获取验证码. 获取之后，需1分钟之后才能点击重发。当验证用途是注册时，手机号码超出使用限制便会报错。`,
            requestContent: [
                {param: "phoneNumber", mandatory: "是", type: 'String', content: '发送短信验证的号码'},
                {param: "oldPhoneNumber", mandatory: "否", type: 'String', content: '玩家旧的电话号码，当purpose是 "newPhoneNumber" ，而且为一步修改电话时，需传送旧的号码核对是否匹配（注意 2 步修改不需要）。'},
                {param: "purpose", mandatory: "否", type: 'String', content: '请参考 【定义】-->【手机验证码 验证用途】列表'},
                {param: "name", mandatory: "否", type: 'String', content: '玩家帐号，请注意只有『注册』、『重置密码』才可以发'},
                {param: "captcha", mandatory: "否", type: 'String', content: '图片验证码'},
                {param: "useVoiceCode", mandatory: "否", type: 'Boolean', content: '是否使用语音验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "true //发送验证码成功",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        sendSMSCodeToPlayer: {
            title: "登入后获取手机验证码",
            serviceName: "player",
            functionName: "sendSMSCodeToPlayer",
            desc: "",
            requestContent: [
                {param: "useVoiceCode", mandatory: "否", type: 'Boolean', content: '是否使用语音验证码'},
                {param: "purpose", mandatory: "否", type: 'String', content: `验证用途，可收入内容如下: 
                                                                              "registration" - 注册
		                                                                      "oldPhoneNumber" - 修改电话时的电话验证（旧号码)
		                                                                      "updatePassword" - 更新密码
		                                                                      "updateBankInfo" - 更新支付信息`},
            ],
            respondSuccess: {
                status: 200,
                data: "true //发送验证码成功",
            },
            respondFailure: {
                status: "4xx",
                data: "-",
                errorMessage: "",
            }
        },
        verifyPhoneNumberBySMSCode: {
            title: "通过验证码验证手机",
            serviceName: "player",
            functionName: "verifyPhoneNumberBySMSCode",
            desc: "",
            requestContent: [
                {param: "smsCode", mandatory: "是", type: 'String', content: 'SMS 验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "true // 成功验证",
            },
            respondFailure: {
                status: "4xx",
                data: "-",
                errorMessage: "验证失败",
            }
        },

    }
}

export default smsCode;
