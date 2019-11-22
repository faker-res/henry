const sampleData = {
    getPlatformAnnouncements: `{
    "list":[{
        "_id":"588567aa725d17143a4c9435",
        "reach":1,
        "title":"testAnnoucement", //公告标题
        "content"::"test annoucement message", //公告内容
        "date": "2017-01-31 22:10:10:00", //创建日期
    }]
}`
}
let information = {
    name:"平台设置/信息",
    func: {
        getPlatformAnnouncements:{
            title: " 获取平台公告",
            serviceName: "platform",
            functionName: "getPlatformAnnouncements",
            desc: "备注: 调用结果以json格式返回",
            requestContent:[
                { param: "platformId", mandatory: "是", type: "int", content: "平台ID" },
                { param: "reach", mandatory: "否", type: "String", content: "返回对应类型的公告，默认返回所有, players：玩家 partner：代理，conditional：定制" }
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getPlatformAnnouncements
            },
            respondFailure: {
                status: "4xx",
            }
        },
    }
}

export default information