const sampleData = {
    sendQQGroupControlSessionToFPMS: `{
      "__v": 0,
      "deviceId": "abc222",
      "deviceNickName": "test2",
      "csOfficer": "57b6c8b33d71e6c469f2aa20",
      "status": 1,
      "platformObjId": "5732dad105710cf94b5cfaaa",
      "lastActiveTime": "2019-10-02T01:34:15.712Z",
      "qqVersion": "1.1.1",
      "_id": "5d93fe9788967fc0eaa38bca",
      "createTime": "2019-10-02T01:34:15.714Z",
      "connectionAbnormalClickTimes": 0
}`,
    sendQQConversationToFPMS: `{
      "__v": 0,
      "qqGroupControlSessionId": "5d94005588967fc0eaa38bcc",
      "deviceId": "222222",
      "deviceNickName": "test2",
      "platformObjId": "5732dad105710cf94b5cfaaa",
      "csOfficer": "57b6c8b33d71e6c469f2aa20",
      "playerQQRemark": "testbindremark22",
      "csReplyTime": "2019-10-02T01:39:00.000Z",
      "csReplyContent": "hi",
      "_id": "5d94005a88967fc0eaa38bcd",
      "createTime": "2019-10-02T01:41:46.761Z"
}`,
    bindPlayerQQInfo: `{
      "__v": 0,
      "deviceId": "abc222",
      "platformObjId": "5732dad105710cf94b5cfaaa",
      "playerQQRemark": "testbindremark22",
      "playerQQId": "testbind2222222",
      "playerQQNickname": "testbindnickname22",
      "_id": "5d93ff4e88967fc0eaa38bcb",
      "createTime": "2019-10-02T01:37:18.569Z"
}`
}
let qqControl = {
    name:"QQ群控",
    func: {
        sendQQGroupControlSessionToFPMS:{
            title: " QQ群控发送心跳包维持链接",
            serviceName: "qqgroupcontrol",
            functionName: "sendQQGroupControlSessionToFPMS",
            desc: "必须在后台QQ群控设置手机设备号、绑定设备腻称",
            requestContent:[
                { param: "deviceId", mandatory: "是", type: "String", content: "手机设备号" },
                { param: "adminId", mandatory: "否", type: "String", content: "FPMS登入帐号" },
                { param: "status", mandatory: "否", type: "int", content: `系统状态:
                                                                           1 - 在线
                                                                           2 - 离线` },
                { param: "connectionAbnormalClickTimes", mandatory: "否", type: "int", content: "本次连线异常点击" },
                { param: "qqVersion", mandatory: "否", type: "String", content: "QQ版本" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.sendQQGroupControlSessionToFPMS
            },
            respondFailure: {
                status: "4xx",

            }
        },

        sendQQConversationToFPMS:{
            title: " QQ群控客服与玩家对话",
            serviceName: "qqgroupcontrol",
            functionName: "sendQQConversationToFPMS",
            desc: "连线后通过此函数发送客服对话",
            requestContent:[
                { param: "deviceId", mandatory: "是", type: "String", content: "手机设备号" },
                { param: "playerQQRemark", mandatory: "是", type: "String", content: "备注" },
                { param: "csReplyTime", mandatory: "是", type: "Date Time", content: "客服发送的对话时间" },
                { param: "csReplyContent", mandatory: "否", type: "String", content: "客服发送的对话内容" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.sendQQConversationToFPMS
            },
            respondFailure: {
                status: "4xx",

            }
        },

        bindPlayerQQInfo:{
            title: " QQ群控绑定玩家QQ号+昵称+备注",
            serviceName: "qqgroupcontrol",
            functionName: "bindPlayerQQInfo",
            desc: "客服登陆群控时会使用此函数操做绑定玩家QQ号+昵称+备注",
            requestContent:[
                { param: "deviceId", mandatory: "是", type: "String", content: "手机设备号" },
                { param: "playerQQRemark", mandatory: "是", type: "String", content: "备注" },
                { param: "playerQQId", mandatory: "是", type: "String", content: "玩家QQ号" },
                { param: "playerQQNickname", mandatory: "否", type: "String", content: "玩家昵称" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.bindPlayerQQInfo
            },
            respondFailure: {
                status: "4xx",

            }
        },
    }
}

export default qqControl;