
let smsCode = {
    name:"短信验证码",
    func: {
        getSMSCode:{
            title: " 通过短信验证码修改代理手机号码",
            serviceName: "partner",
            functionName: "getSMSCode",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "int", content: "平台ID" },
                { param: "partnerId", mandatory: "否", type: "int", content: "代理ID" },
                { param: "phoneNumber", mandatory: "是", type: "int", content: "手机号, 代理有登入会忽略" },
                { param: "newPhoneNumber", mandatory: "否", type: "int", content: "新手机号" },
                { param: "captcha", mandatory: "否", type: "String", content: "图片验证码" }
            ],
            respondSuccess:{
                status: 200,
                data: "-"
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx"

            }
        },
    }
}

export default smsCode;