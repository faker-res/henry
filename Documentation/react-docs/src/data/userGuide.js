const text = `
FPMS 前端 SDK 包含了 17 个函数，其中主要的 2 项是链接与事件相关，其他 15 项则是以服务分类的接口：

<h4><b>函数列表：</b></h4>
    1. connect
    2. wsEvent
    3. auction
    4. dxMission
    5. payment
    6. playerLevel
    7. rewardPoints
    8. connection
    9. game
    10. platform
    11. registrationIntention
    12. topUpIntention
    13. consumption
    14. partner
    15. player
    16. reward
    17. wcGroupControl

* 从第 3 开始到 第 17 项都是接口相关必要时才需要调用。


<h4><b>开启后端连接：</b></h4>

<b>格式：</b>
    connect(host, platformObj, onOpenHandler, onCloseHandler, defaultErrHandler, defaultLoadHandler, defaultLoadEndHandler, onReconnectHandler)

<b>参数注解：</b>
    <b>host（后端链接地址）</b>
    用作与后端服务器建立连接，使用 WebSocket 协议。

    <b>platformObj（平台对象）</b>
    将在此获取的 平台号 与 客户类型 保存，并在每次的接口请求自动将其附上。
    格式如下：
        {
            platformId: "4"
            clientType: "1"
        }

    <b>onOpenHandler（连接成功回调）</b>
    连接成功的默认回调函数。
    在 WebSocket 协议连接成功后，执行此函数。

    <b>onCloseHandler（重连失败回调）</b>
    连接关闭（重连失败）的默认回调函数。
    WebSocket 连接在非正常情况下关闭（断线）时，SDK 将会自动尝试重连。
    如果重连失败，将会执行此函数。
    
    <b>defaultErrHandler（接口返回失败回调）</b>
    接口返回失败/异常的默认回调函数。
    在任何一个发至后端的接口返回状态为失败或异常时，将会执行此函数。
    注，config.js 里的 defaultErrHandlerStatusExclusion 数组内所有的状态值例外。
    在此数组内设定的状态将不会触发执行此默认回调函数。默认值为（400, 420, 404）。

    <b>defaultLoadHandler（发送请求回调）</b>
    发送请求至后端接口的默认回调函数。
    在每次发送请求至后端之后将会执行此函数。
    可在发送时选择性不执行此函数。默认为执行。
    
    <b>defaultLoadEndHandler（接口返回后回调）</b>
    所有接口都已返回/超时后的默认回调函数。
    在发送请求后，待所有已发请求的接口关闭（返回/超时）后，执行此函数。
    一般为一个接口，但若同时开启超过一个接口（发送请求），将会等待所有接口关闭才会执行此函数。
    
    <b>onReconnectHandler（重连回调）</b>
    在 SDK 自动尝试重连时，执行此函数。


<h4><b>事件相关：</b></h4>

此函数的功能是让接收到的后端数据传到 SDK 外，让前端开发能自主处理其内容。
目前用于处理后端发起的数据发送，例如：notifyNewMail。
SDK 在接到后端的数据后将会发起 onmessage 事件。
所有在 config.js 里的 pendingRequestsExclusion 数组内设置的接口都会通过这个方式把数据传到 SDK 外。

<b>格式：</b>
    wsEvent.addEventListener(type, callback)
    wsEvent.removeEventListener(type, callback)

<b>参数注解：</b>
    <b>type（类别）</b>
    为字符串 String 。
    这是用作分辨不同类别的事件会触发不同的函数。

    <b>callback（回调函数）</b>
    为函数 Function 。
    这是将会触发的回调函数。取决于以上类别的归纳。



<h4><b>服务分类：</b></h4>

以上【函数列表】中的第 3 项至第 17 项的服务分类都用以下的格式。
详细功能请参考文档（玩家、代理、平台）。

<b>格式：</b>
    player.login(sendData, useDefaultErrHandler, useDefaultLoadHandler， useCacheConfig).then();

<b>参数注解：</b>
    <b>sendData（发送数据）</b>
    为对象 Object 。
    发送请求时所需要的数据都需要包含在这个对象里面。
    
    <b>useDefaultErrHandler（使用接口返回失败回调）</b>
    为布尔值 Boolean ，选填，默认为 true 。
    是否使用接口返回失败/异常的默认回调函数。
    请参考【开启后端连接】内的 defaultErrHandler 参数。
    
    <b>useDefaultLoadHandler（使用发送请求回调）</b>
    为布尔值 Boolean ，选填，默认为 true 。
    是否使用发送请求至后端接口的默认回调函数。
    请参考【开启后端连接】内的 defaultLoadHandler 参数。
    
    <b>useCacheConfig（使用缓存设置对象）</b>
    为对象 Object 或 布尔值 Boolean ，选填，默认为 null 。
    是否使用缓存数据，不向后端发送请求。
    若值为 {} 或 true，则使用缓存，但不会刷新。
    格式如下：
        {
            refreshRateSecs: 10,
            cacheIndex: "1"
        }
        <b>refreshRateSecs</b>
        刷新缓存间隔，以秒为单位。
        <b>cacheIndex</b>
        为字符串。唯一识别码，为了辨别在多次不同的参数下调用同一个接口而设计的。

`;

const exampleCode = {
'index.html': `
<html>
    <head>
        <script src="index.js" type="module"></script>
    </head>
    <body>
        test HTML page loaded.
        <br/>
        <button id="login">LOGIN</button>
    </body>
</html>
`,
'index.js': `
import FPMS from './sdk/main.js';

let errHandling = () => {};
let loadHandling = () => {};
let loadEndHandling = () => {console.log("load ended")};;
let onOpenHandler = () => {console.log("SUCCESSFULLY CONNECTED")};
let onCloseHandler = () => {console.log("UNABLE TO RECONNECT! CONNECTION HAS BEEN CLOSED!")};

let onMessageHandler = (data) => {console.log("ONMESSAGE!",data)};

let fpms = FPMS;
fpms.connect(onOpenHandler, onCloseHandler, errHandling, loadHandling, loadEndHandling);
fpms.wsEvent.addEventListener('onmessage', onMessageHandler);

// to login
function login() {
    let sendData = {
        platformId: '1',
        name:"yunvincehuat8",
        password:"888888"
    }
    fpms.player.login(sendData).then(retData => {
        console.log('success', retData);
    }, err => {
        console.log('failed', err)
    });
}
document.getElementById("login").addEventListener("click", login);
`};

let guide = {
    name: "使用说明",
    text,
    exampleCode,
}

export default guide;
