const sampleData = {
    insertPhoneToTask: `{
    message: “您已获得x元奖金，请注意短信接收”
    // 导入任务最多能发3次， 过后会回到 操作失败: 状况2
}`,
    insertPhoneToTaskFailed: `{
    // 状况1 - 号码已经开户
    message: “号码已经开户此号码已注册网站会员罗，新会员才能抽”
    // 状况2 - 号码没开户，但已经加入『同个』任务奖
    message: “此号码已加入此活动了，欢迎介绍朋友抽奖喔！”
    // 状况3 - 同IP一小时内请求超过5次
    message: “该玩家IP地址已在1小时内达申请上限（5）次，请稍后再次尝试。”
}`,

    submitDXCode: `{
    redirect: “foobar.com playerId=yunvince6896&token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoieXVudmluY2V5aDY2ODgiLCJwYXNzd29yZCI6IiQyYSQxMCREejhRSFhmTjJjeWtnWHBrdXVFZHdlVjVlZ1NTeDNIb2NXaEx5VnBzZWU5cWtpMXY3c3dRNiIsImlhdCI6MTUyOTkwODUxNCwiZXhwIjoxNTI5OTI2NTE0fQ.xts8n_iucqybjQG7eDhie-akmlz_YIAi9D-4ZING9nI”
    // playerId: 玩家ID，authenticate用
    // token: 玩家验证，用于重新建立链接
}`,
    submitDXCodeFailed: `{
    // 状况1 - 此电销代码已注册，注册后玩家以修改密码
    message: 密码已更换
    // 状况2 - 此电销代码不存在
    message: 电销代码不存在
    // 状况3 - 电销代码顺利注册/登入
    message: 回文如响应内容
    // 状况4 - 其他异常状况
}`,
}

let teleSales = {
    name:"电销服务",
    func: {
        createPlayerFromTel:{
            title: " 电销系统开户",
            serviceName: "dxmission",
            functionName: "createPlayerFromTel",
            desc: "",
            requestContent:[
                { param: "playerAccount", mandatory: "是", type: "String", content: "玩家账号" },
                { param: "realName", mandatory: "否", type: "String", content: "玩家真实姓名" },
                { param: "password", mandatory: "是", type: "String", content: "玩家账号密码" },
                { param: "phoneNumber", mandatory: "是", type: "String", content: "电话号码" },
                { param: "playerType", mandatory: "是", type: "String", content: "玩家类型" },
                { param: "qq", mandatory: "否", type: "String", content: "玩家qq" },
                { param: "wechat", mandatory: "否", type: "String", content: "玩家微信" },
                { param: "email", mandatory: "否", type: "String", content: "玩家电邮" },
                { param: "gender", mandatory: "否", type: "String", content: "玩家性别" },
                { param: "DOB", mandatory: "否", type: "Date", content: "玩家生日日期" },
                { param: "telSalesName", mandatory: "是", type: "String", content: "电销姓名" },
                { param: "promoMethod", mandatory: "是", type: "String", content: "推荐方式" },
                { param: "fame", mandatory: "是", type: "String", content: "-" },
                { param: "deviceType", mandatory: "否", type: "int", content: "设备类型列表" },
                { param: "subPlatformId", mandatory: "否", type: "int", content: "子平台列表" },
            ],
            respondSuccess:{
                status: 200,
                data: "请参考【玩家】-->【玩家信息/资料】-->【玩家对象】"
            },
            respondFailure: {
                status: "4xx",

            }
        },

        insertPhoneToTask:{
            title: " 单一电话导入现有任务",
            serviceName: "dxmission",
            functionName: "insertPhoneToTask",
            desc: "",
            requestContent:[
                { param: "phoneNumber", mandatory: "是", type: "String", content: "电话号码" },
                { param: "taskName", mandatory: "是", type: "String", content: "任务名字 或者 任务的ObjectId" },
                { param: "autoSMS", mandatory: "否", type: "int", content: `1-发送SMS
                                                                               0-不发送SMS` },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.insertPhoneToTask
            },
            respondFailure: {
                status: "400 / 405",
                data: sampleData.insertPhoneToTaskFailed

            }
        },

        submitDXCode:{
            title: " 提交电销代码",
            serviceName: "dxmission",
            functionName: "submitDXCode",
            desc: "",
            requestContent:[
                { param: "code", mandatory: "是", type: "String", content: "电销注册代码" },
                { param: "domain", mandatory: "是", type: "String", content: "当下注册域名" },
                { param: "deviceType", mandatory: "是", type: "int", content: "设备类型，参见定义说明：设备类型列表" },
                { param: "subPlatformId", mandatory: "否", type: "int", content: "子平台，参见定义说明：子平台列表" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.submitDXCode
            },
            respondFailure: {
                status: "400 / 401 / 431",
                data: sampleData.submitDXCodeFailed

            }
        },
    }
}

export default teleSales;