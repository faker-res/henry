const sampleData = {
getGameList: `{ //游戏信息列表和总数量
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "startIndex": 0  //查询结果记录开始index
    },"gameList": []  //查询列表
}`,
transferToProvider: `{
    playerId: 'etest3',
    providerId: '18,
    providerCredit: '500.00',
    playerCredit: '0.00',
    rewardCredit: '0.00',
    transferCredit: {
        playerCredit: '400.00',
        rewardCredit: '100.00'
    }
}`,
transferFromProvider: `{
    playerId: 'etest3',
    providerId: '18,
    providerCredit: '0.00',
    playerCredit: '400.00',
    rewardCredit: '100.00',
    transferCredit: {
        playerCredit: '0.00',
        rewardCredit: '0.00'
    }
}`,
getLoginURL: `{ //成功申请到的登录游戏的URL.
    "gameURL": "[http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc](http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc)"
}`,
getTestLoginURL: `{ //成功申请到的登录游戏的URL.
    "gameURL": "[http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc](http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc)"
}`,
getTestLoginURLWithOutUser: `{ //成功申请到的登录游戏的URL.
    "gameURL": "[http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc](http://cache.download.banner.mightypanda88.com/casinoclient.html?nolobby=1&language=ZH-CN&game=gtsfc)"
}`,
getGameUserInfo: `{ //username, platformId, providerId用于给FPMS进行函数的路由
    platformId: “001”,
    providerId: “002”,
    gameUser: “blgSven”, //玩家游戏账号名.
    password: “gswet3fk” //玩家游戏密码
}`,
// We have two modifyGamePassword method in service implement, that one return data like below, is no longer use.
// modifyGamePassword: `{ //username, platformId, providerId用于给FPMS进行函数的路由
//     username: “gSven”,
//     platformId: “YunYou”,
//     providerId:“Billizard”
// }`,

grabPlayerTransferRecords: `{ 
    // CPMS会调用添加消费记录API来添加新收录到的消费记录。 201–正在收录中，可以通过查看progressContent内容来得到处理内容。
    // platformId, providerId用于给FPMS进行函数的路由
    
    username: “gSven”,
    platformId: “001”,
    providerId: “002”,
    progressContent: “xxxxxx” //处理流程的内容
}`,
getGameGroupList: `{ 
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "startIndex": 0  //查询结果记录开始index
    },
    "gameList": []  //查询列表
}`,
getGameGroupInfo: `{ 
    "name": "hot1",
    "code": "2",
    "displayName": "火热",
    "games": {
        "stats": {
            "totalCount": 256,
            "startIndex": 0
        },
        "gameList": [{
            "_id" : ObjectId("57a05c4da7ba70af4263d7f5"),
            "bigShow" : "http://img99.neweb.me/PlunderTheSea.jpg",
            "code" : "PlunderTheSea",
            "gameId" : "082452B5-9F09-4A38-A080-109A987C072E",
            "name" : "掠夺大海",
            "gameDisplay":1// 1.横屏 2.竖屏 3.横竖屏 4. 无需设置…..
        },{
        gameObj
        } ...]
        "index":1 // 游戏排列顺序（可在FPMS游戏组中配置）
    }
}`,
getGameGroupTreeInfo: `{ 
    "stats": {
        "totalCount": 1,  //查询记录总数量，用于分页
        "startIndex": 0  //查询结果记录开始index
    },
    "gameGroups": []  //查询列表
    “gameGroupIconUrl”: //游戏组的图标位置（若有 CDN/FTP 相对路径将会拼凑）
}`,
getGameProviderCredit: `{ 
    "providerId": "20",
    "credit": "0.0"
}`,
getLiveGameInfo: `{ 
    "stats": {  
        "totalCount": 1,  
    }  
    "list": [{  
        tableNumber: '123123',  
        dealerName: ‘翠花’,  
        status: 0, 
        totalMakers: 6, //庄赢总数
        totalPlayer: 6, //闲赢总数
        totalTie: 1, //和局总数
        countdown: 15,  
        historyList: [{  
            bureauNo: 12，  
            result: 0，  
            makersPoints：8，  
            playerPoints： 10，  
            pair： 1  
        }]  
    }]
}`,
notifyLiveGameStatus: `{ 
    tableNumber： ‘aaa111’,  
    dealerName: ‘翠花’,  
    result: 0,  
    status: 1,  
    countdown: 15，  
    makersPoints: 8，  
    playerPoints: 6  
    pair： 1，  
}`,

getGameTypeList: `[
// 游戏类型列表
    {
      "gameTypeId": "1",
      "code": "CASUAL",
      "name": "Casual"
    },
    {
      "gameTypeId": "2",
      "code": "CARD",
      "name": "Card"
    },
    {
      "gameTypeId": "3",
      "code": "SPORTS",
      "name": "Sports"
    },
    {
      "code": "SPORT",
      "gameTypeId": "6",
      "name": "体育"
    },
    {
      "code": "SLOT",
      "gameTypeId": "7",
      "name": "老虎机"
    },
    {
      "code": "CHESS",
      "gameTypeId": "8",
      "name": "棋牌"
    },
    {
      "code": "VIDEO",
      "gameTypeId": "9",
      "name": "电子"
    },
    {
      "gameTypeId": "testGameTypeCode1488508292478",
      "code": "testGameTypeCode21488508292478",
      "name": "testGameTypeName21488508292478"
    },
    {
      "gameTypeId": "testGameTypeCode1488509959162",
      "code": "testGameTypeCode21488509959162",
      "name": "testGameTypeName21488509959162"
    },
    {
      "gameTypeId": "testGameTypeCode1490155321259",
      "code": "testGameTypeCode21490155321259",
      "name": "testGameTypeName21490155321259"
    },
    {
      "gameTypeId": "testGameTypeCode1490170048556",
      "code": "testGameTypeCode21490170048556",
      "name": "testGameTypeName21490170048556"
    }
]`,
    getProviderList: `[
    // 游戏提供商信息列表， 返回形式为 ARRAY OBJECT
    {
      "providerId": "20",
      "name": "捕鱼王游戏",
      "chName": "",
      "prefix": "",
      "status": 2
    }...
]`,
    removeFavoriteGame: `{
     "ok": 1,
    "nModified": 1,
    "n": 1
}`,
    getFavoriteGames: `[
    // 游戏信息列表， 返回形式为 ARRAY OBJECT
    {
      "_id": "57a0771bf253b2ca4377b9ac",
      "gameId": "19D207EB-C09C-4E87-8CFE-0C0DF71CE232",
      "type": "5",
      "code": "6",
      "name": "捕鱼王",
      "title": "",
      "bigShow": "http://img99.neweb.me/3739bd0b-a296-4514-a479-8791c6f47256.jpg",
      "smallShow": "http://img99.neweb.me/3739bd0b-a296-4514-a479-8791c6f47256.jpg",
      "showPriority": 1,
      "provider": "20",
      "status": 1,
      "description": "捕鱼王",
      "canTrial": false,
      "visible": true,
      "__v": 0,
      "playGameType": "1",
      "progressivegamecode": "",
      "isFavorite": true
    }
]`,
    searchGame: `[
    // 游戏列表， 返回形式为 ARRAY OBJECT
    {
      "_id": "57a0771bf253b2ca4377b9ac",
      "gameId": "19D207EB-C09C-4E87-8CFE-0C0DF71CE232",
      "type": "5",
      "code": "6",
      "name": "捕鱼王",
      "title": "",
      "bigShow": "http://img99.neweb.me/3739bd0b-a296-4514-a479-8791c6f47256.jpg",
      "smallShow": "http://img99.neweb.me/3739bd0b-a296-4514-a479-8791c6f47256.jpg",
      "showPriority": 1,
      "provider": "20",
      "status": 1,
      "description": "捕鱼王",
      "canTrial": false,
      "visible": true,
      "__v": 0,
      "playGameType": "1",
      "progressivegamecode": "",
      "isFavorite": true
    }
]`,
    searchGameByGroup: `[
    // 根据游戏组查询游戏， 返回形式为 ARRAY OBJECT
    {
      "_id": "57a05c4da7ba70af4263d7f1",
      "bigShow": "http://img99.neweb.me/FireHawk.jpg",
      "code": "FireHawk",
      "gameId": "0796679D-3F00-4993-BFCB-436DF1875423",
      "name": "FireHawk",
      "showPriority": 1,
      "smallShow": "http://img99.neweb.me/FireHawk.jpg",
      "title": "",
      "type": "9",
      "provider": "19",
      "status": 1,
      "description": "",
      "canTrial": true,
      "visible": true,
      "__v": 0,
      "playGameType": "1",
      "progressivegamecode": "",
      "gameDisplay": "1"
    }
]`,
    getGamePassword: `[{gameUserObj // 需从CPMS获取}]`,
    modifyGamePassword: `[{gameUserObj // 需从CPMS获取}]`,

}


let game = {
    name: "游戏服务",
    func: {
        getGameTypeList:{
            title: "获取游戏类型列表",
            serviceName: "game",
            functionName: "getGameTypeList",
            desc:"从服务端获取游戏类型列表",
            requestContent:[
                { param: "requestId", mandatory: "否", type: "String", content: "" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getGameTypeList,
            },
            respondFailure: {
                status: "4xx",
                data: "null"
            }
        },
        getGameList:{
            title: "获取游戏列表",
            serviceName: "game",
            functionName: "getGameList",
            desc:"通过相关参数，获取游戏列表。如果不传游戏类型参数，则取排名(待议)靠前的N个游戏。\n 游戏状态分类：1–正常， 2–维护, 3–关闭",
            requestContent:[
                { param: "type", mandatory: "否", type: "String", content: "游戏类型，可选参数，默认查询所有类型排名靠前的N个游戏。" },
                { param: "providerId", mandatory: "否", type: "String", content: "游戏提供商ID, 可选参数，默认查询所有游戏提供商的游戏。" },
                { param: "playGameType", mandatory: "否", type: "Int", content:`1: flash
                                                                           2: html5` },
                { param: "requestCount", mandatory: "否", type: "Int", content: "取出N条数据, 可选参数， 默认查询20条游戏数据" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "返回数据跳过个数，用于分页，可选参数， 默认值为0" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getGameList
            },
            respondFailure: {
                status: "4xx",
                data: "null"
            }
        },
        getProviderList:{
            title: "获取内容提供商(CP)列表",
            serviceName: "game",
            functionName: "getProviderList",
            desc:"获取玩家所在平台的所有游戏提供商列表。",
            requestContent:[
                { param: "playerId", mandatory: "否", type: "String", content: "玩家ID 没有平台ID的情况下是必填" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getProviderList
            },
            respondFailure: {
                status: "4xx",
                data: "null"
            }
        },
        transferToProvider:{
            title: "转入额度到游戏",
            serviceName: "game",
            functionName: "transferToProvider",
            desc:"将本地额度入到CP账号的游戏额度。此函数支持游戏间互换。",
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.transferToProvider
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "",
            }
        },
        transferFromProvider:{
            title: "转出额度到本地",
            serviceName: "game",
            functionName: "transferFromProvider",
            desc:"将游戏额度从CP账号转出到本地额度。",
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.transferFromProvider
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "",
            }
        },
        getLoginURL:{
            title: "获取登录游戏的URL",
            serviceName: "game",
            functionName: "getLoginURL",
            desc:"需要玩家登陆",
            requestContent:[
                { param: "gameId", mandatory: "是", type: "String", content: "游戏Id " },
                { param: "clientDomainName", mandatory: "是", type: "String", content: "客户端域名  " },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.getLoginURL
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: `""`
            }
        },
        getTestLoginURL:{
            title: "获取试玩游戏的URL",
            serviceName: "game",
            functionName: "getTestLoginURL",
            desc:"需要玩家登陆",
            requestContent:[
                { param: "gameId", mandatory: "是", type: "String", content: "游戏Id " },
                { param: "clientDomainName", mandatory: "是", type: "String", content: "客户端域名 " },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.getTestLoginURL
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: `""`
            }
        },
        getTestLoginURLWithOutUser:{
            title: "获取试玩游戏的URL（无需登入)",
            serviceName: "game",
            functionName: "getTestLoginURLWithOutUser",
            desc:"不需要玩家登陆",
            requestContent:[
                { param: "gameId", mandatory: "是", type: "String", content: "游戏Id " },
                { param: "clientDomainName", mandatory: "是", type: "String", content: "客户端域名 " },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.getTestLoginURLWithOutUser
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: `""`
            }
        },
        getGameUserInfo:{
            title: "获取玩家游戏中的账户信息",
            serviceName: "game",
            functionName: "getGameUserInfo",
            desc:"",
            requestContent:[
                { param: "username", mandatory: "否", type: "String", content: "玩家在平台的用户名" },
                { param: "providerId", mandatory: "是", type: "String", content: "游戏提供商Id " },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.getGameUserInfo
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "xxxxxxx"
            }
        },
        grabPlayerTransferRecords:{
            title: "请求立即收录玩家的消费记录",
            serviceName: "game",
            functionName: "grabPlayerTransferRecords",
            desc:"请求立即收录玩家最新的消费记录。响应内容会有不同，会响应收录处理过程的内容。状态会返回201, 并返回progressContent来报告处理的过程。收录完成之后，CPMS会向FPMS调用添加消费记录API来添加玩家的消费记录。",
            requestContent:[
                { param: "providerId", mandatory: "是", type: "String", content: "游戏提供商Id, 如果Id为null, 则查询玩家所有平台的消费记录 " },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.grabPlayerTransferRecords
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        addFavoriteGame:{
            title: "收藏游戏",
            serviceName: "game",
            functionName: "addFavoriteGame",
            desc:"",
            requestContent:[
                { param: "gameId", mandatory: "是", type: "String", content: "游戏Id" },

            ],
            respondSuccess:{
                status: 200,
                data:"true"
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        removeFavoriteGame:{
            title: "删除收藏游戏",
            serviceName: "game",
            functionName: "removeFavoriteGame",
            desc:"",
            requestContent:[
                { param: "gameId", mandatory: "是", type: "String", content: "游戏Id" },

            ],
            respondSuccess:{
                status: 200,
                data: sampleData.removeFavoriteGame,
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "错误信息"
            }
        },
        getFavoriteGames:{
            title: "获取收藏游戏",
            serviceName: "game",
            functionName: "getFavoriteGames",
            desc:"",
            requestContent:[
                { param: "device", mandatory: "否", type: "String", content: `装置//默认：0 
                                                                              0-全部
                                                                              1-网页
                                                                              2-H5` },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getFavoriteGames,
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        getGameGroupList:{
            title: "获取游戏分组列表",
            serviceName: "game",
            functionName: "getGameGroupList",
            desc:"",
            requestContent:[
                { param: "requestCount", mandatory: "否", type: "Int", content: "查询记录总数量，用于分页" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "查询结果记录开始index" },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.getGameGroupList
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        getGameGroupInfo:{
            title: "获取游戏分组详细信息",
            serviceName: "game",
            functionName: "getGameGroupInfo",
            desc:"获取游戏分组游戏，子组信息",
            requestContent:[
                { param: "code", mandatory: "是", type: "String", content: "分游组代码" },
                { param: "providerId", mandatory: "否", type: "String", content: "(默认全部） 供应商ID，过滤组内的游戏供应商" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求数据量， 默认查询100条游戏" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "回数据跳过个数，用于分页，可选参数， 默认值为0" },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.getGameGroupInfo
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        getGameGroupTreeInfo:{
            title: "获取游戏分组树信息",
            serviceName: "game",
            functionName: "getGameGroupTreeInfo",
            desc:"获取游戏分组树信息",
            requestContent:[
                { param: "code", mandatory: "否", type: "String", content: "分游组代码" },
                { param: "containGames", mandatory: "否", type: "Boolean", content: "是否包含游戏信息" },
                { param: "startIndex", mandatory: "否", type: "Int", content: "回数据跳过个数，用于分页，可选参数， 默认值为0" },
                { param: "requestCount", mandatory: "否", type: "Int", content: "请求数据量， 默认查询100条游戏" },
            ],
            respondSuccess:{
                status: 200,
                data:sampleData.getGameGroupTreeInfo
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        searchGame:{
            title: "搜索游戏",
            serviceName: "game",
            functionName: "searchGame",
            desc:"",
            requestContent:[
                { param: "providerId", mandatory: "否", type: "String", content: "(默认全部） 供应商ID，过滤组内的游戏供应商" },
                { param: "name", mandatory: "否", type: "String", content: "模糊查询游戏名字" },
                { param: "type", mandatory: "否", type: "String", content: "(/默认全部）游戏类型由CPMS提供，可在游戏提供商功能查询" },
                { param: "groupCode", mandatory: "否", type: "Int", content: "(默认所有在组内的游戏）游戏组代码。" },
                { param: "playGameType", mandatory: "否", type: "Int", content: `游戏载体 
                                                                                 1: flash 
                                                                                 2: html5` },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.searchGame
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        getGameProviderCredit:{
            title: "查询游戏提供商额度",
            serviceName: "game",
            functionName: "getGameProviderCredit",
            desc:"",
            requestContent:[
                { param: "providerId", mandatory: "是", type: "String", content: "提供商Id" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getGameProviderCredit
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        searchGameByGroup:{
            title: "根据游戏组查询游戏",
            serviceName: "game",
            functionName: "searchGameByGroup",
            desc:"",
            requestContent:[
                { param: "groups", mandatory: "是", type: "Array", content: "游戏分组code数组" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.searchGameByGroup
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        getGamePassword:{
            title: "获取游戏账号密码",
            serviceName: "game",
            functionName: "getGamePassword",
            desc:"",
            requestContent:[
                { param: "providerId", mandatory: "是", type: "String", content: "提供商Id" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.getGamePassword
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        modifyGamePassword:{
            title: "修改游戏密码",
            serviceName: "game",
            functionName: "modifyGamePassword",
            desc:"",
            requestContent:[
                { param: "providerId", mandatory: "是", type: "String", content: "提供商ID" },
                { param: "newPassword", mandatory: "是", type: "String", content: "新密碼" },
            ],
            respondSuccess:{
                status: 200,
                data: sampleData.modifyGamePassword
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        getLiveGameInfo:{
            title: "获取真人游戏实时详情",
            serviceName: "game",
            functionName: "getLiveGameInfo",
            desc:"",
            requestContent:[
                { param: "count", mandatory: "否", type: "String", content: "" },
                { param: "switchNotify", mandatory: "否", type: "Boolean", content: `notifyLiveGameStatus的开关，false则不返回资料和关闭推送 注意，这里的platformId主要是给notifyLiveGameStatus。当调用getLiveGameInfo后，notifyLiveGameStatus 才会推送。` },
],
            respondSuccess:{
                status: 200,
                data: sampleData.getLiveGameInfo
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },
        notifyLiveGameStatus:{
            title: "服务器推送真人游戏变化",
            serviceName: "game",
            functionName: "notifyLiveGameStatus",
            desc:"",
            requestContent:[],
            respondSuccess:{
                status: 200,
                data: sampleData.notifyLiveGameStatus
            },
            respondFailure: {
                status: "4xx",
                errorMessage: "错误信息"
            }
        },

    }
}
export default game;