const sampleData = {
    sendWCGroupControlSessionToFPMS: `{
    "__v": 0,
    "deviceId": "abc123",
    "deviceNickName": "abc123",
    "csOfficer": "57b6c8b33d71e6c469f2aa20",
    "status": 1,
    "platformObjId": "5733e26ef8c8a9355caf49d8",
    "lastActiveTime": "2018-11-30T07:36:14.995Z",
    "_id": "5c00e86ea74e6513542c6398",
    "createTime": "2018-11-30T07:36:14.997Z",
    "connectionAbnormalClickTimes": 0
}`,

    sendWechatConversationToFPMS: `{
    "__v": 0,
    "wcGroupControlSessionId": "5c00e9dca74e6513542c6399",
    "deviceId": "abc123",
    "deviceNickName": "abc123",
    "platformObjId": "5733e26ef8c8a9355caf49d8",
    "csOfficer": "57b6c8b33d71e6c469f2aa20",
    "playerWechatRemark": "player123",
    "csReplyTime": "2018-11-30T07:42:00.000Z",
    "csReplyContent": "player 123 test content 333",
    "_id": "5c00ea00a74e6513542c639a",
    "createTime": "2018-11-30T07:42:56.012Z"
}`,
    bindPlayerWechatInfo:`{
    "deviceId": "abc456",  //手机设备号
    "platformObjId": "5733e26ef8c8a9355caf49d8", 
    "playerWechatRemark": "player45", //备注
    "playerWechatId": "player456", //玩家微信号
    "playerWechatNickname": "dfgdfg", //玩家昵称
    "_id": "5de8a08306dae20345f88c21",
    "createTime": "2019-12-05T06:15:31.657Z"
}`
}

let wcControl = {
    name:"微信群控",
    func: {
        sendWCGroupControlSessionToFPMS:{
            title: " 群控发送心跳包维持链接",
            serviceName: "wcgroupcontrol",
            functionName: "sendWCGroupControlSessionToFPMS",
            desc: "必须在后台微信群控设置手机设备号、绑定设备腻称",
            requestContent:[
                { param: "deviceId", mandatory: "是", type: "String", content: "手机设备号" },
                { param: "adminId", mandatory: "否", type: "String", content: "FPMS登入帐号" },
                { param: "status", mandatory: "否", type: "int", content: `系统状态:
                                                                           1 - 在线
                                                                           2 - 离线` },
                { param: "connectionAbnormalClickTimes", mandatory: "否", type: "int", content: "本次连线异常点击" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.sendWCGroupControlSessionToFPMS
            },
            respondFailure: {
                status: "4xx",

            }
        },

        sendWechatConversationToFPMS:{
            title: " 客服与玩家对话",
            serviceName: "wcgroupcontrol",
            functionName: "sendWechatConversationToFPMS",
            desc: "连线后通过此函数发送客服对话",
            requestContent:[
                { param: "deviceId", mandatory: "是", type: "String", content: "手机设备号" },
                { param: "playerWechatRemark", mandatory: "是", type: "String", content: "备注" },
                { param: "csReplyTime", mandatory: "是", type: "Date Time", content: "客服发送的对话时间" },
                { param: "csReplyContent", mandatory: "否", type: "String", content: "客服发送的对话内容" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.sendWechatConversationToFPMS
            },
            respondFailure: {
                status: "4xx",

            }
        },

        bindPlayerWechatInfo:{
            title: " 绑定玩家微信号+昵称+备注",
            serviceName: "wcgroupcontrol",
            functionName: "bindPlayerWechatInfo",
            desc: "客服登陆群控时会使用此函数操做绑定玩家微信号+昵称+备注",
            requestContent:[
                { param: "deviceId", mandatory: "是", type: "String", content: "手机设备号" },
                { param: "playerWechatRemark", mandatory: "是", type: "String", content: "备注" },
                { param: "playerWechatId", mandatory: "是", type: "String", content: "玩家微信号" },
                { param: "playerWechatNickname", mandatory: "否", type: "String", content: "玩家昵称" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.bindPlayerWechatInfo
            },
            respondFailure: {
                status: "4xx",

            }
        },
    }
}

export default wcControl;