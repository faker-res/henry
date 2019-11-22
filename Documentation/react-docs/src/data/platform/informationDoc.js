
let information = {
    name:"平台设置/信息",
    func: {
        getPlatformAnnouncements:{
            title: " 获取平台公告",
            serviceName: "partner",
            functionName: "getPlatformAnnouncements",
            desc: "备注: 调用结果以json格式返回",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "String", content: "平台ID" },
                { param: "partnerId", mandatory: "否", type: "int", content: "代理ID" },
                { param: "phoneNumber", mandatory: "否", type: "int", content: "手机号, 代理有登入会忽略" },
                { param: "newPhoneNumber", mandatory: "否", type: "int", content: "新手机号" },
                { param: "captcha", mandatory: "否", type: "String", content: "图片验证码" }
            ],
            respondSuccess:{
                status: 200,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxx"

            }
        },
    }
}

export default information