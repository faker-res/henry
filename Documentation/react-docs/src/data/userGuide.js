const userGuideText = `
Interface List:
1. connect
2. wsEvent
3. consumption
4. game
5. partner
6. payment
7. platform
8. player
9. reward

***

1. connect(onOpenHandler, onCloseHandler, defaultErrHandler, defaultLoadHandler, defaultLoadEndHandler)
    a) onOpenHandler
        - default callback to be executed after successful web socket connection (during websocket onopen event)
    b) onCloseHandler
        - default callback to be executed upon unsuccessful re-establishment of web socket connection after disconnection (reconnect fired upon onclose event)
    c) defaultErrHandler
        - default callback to be executed upon receiving a failed status response from an API call,
        only applicable to failed status outside of defaultErrHandlerStatusException array as defined in config.js (400, 420, 404)
    d) defaultLoadHandler
        - default callback to be executed upon sending of an API request.
    e) defaultLoadEndHandler
        - default callback to be executed upon receipt/timed out of all API response.


2. wsEvent
    - wsEvent is an Event object, this object is created to allow data from the server side to pass thru this SDK.
    - Only function names as defined in pendingRequestsException array in config.js are applicable to be passed outside of this SDK.
    - An "onmessage" event will be fired with server side data attached.

    - Add an event listener to wsEvent to listen for such message from the server. Eg:
        fpms.wsEvent.addEventListener("onmessage", (event)=>{console.log(event.data)});


3. consumption
    - This is a function holder. It is an object holding all consumption service functions.

4. game
    - This is a function holder. It is an object holding all game service functions.

5. partner
    - This is a function holder. It is an object holding all partner service functions.

6. payment
    - This is a function holder. It is an object holding all payment service functions.

7. platform
    - This is a function holder. It is an object holding all platform service functions.

8. player
    - This is a function holder. It is an object holding all player service functions.

9. reward
    - This is a function holder. It is an object holding all reward service functions.

***

Interface number 3 to 9 are of same structure, only separated by service type.
Each functions takes 3 parameters as such:
    (object: sendData, [boolean: useDefaultErrHandler], [boolean: useDefaultLoadHandler])

1. sendData
    Expect object type, do not stringify. Mandatory field.
    First parameter is the data to be sent to the server, including service, functionName, and data.

2. useDefaultErrHandler
    Expect boolean type. Optional field, defaults to true if left empty or not boolean type.
    Second parameter is a flag allowing caller to decide if it should execute the defaultErrHandler when criteria meets.
    * see Interface 1. c) defaultErrHandler

3. useDefaultLoadHandler
    Expect boolean type. Optional field, defaults to true if left empty or not boolean type.
    Third parameter is a flag allowing caller to decide if it should execute the defaultLoadHandler when criteria meets.
    * see Interface 1. d) defaultLoadHandler

Eg:
    let sendData = {};
    fpms.consumption.search(sendData, true, true);

***

A Simple Example:

+-------------+
| /INDEX.HTML |
+-------------+
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



+-----------+
| /INDEX.JS |
+-----------+
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


***
`;

/*
    func.*.desc:
    for description of each function, it takes a string and convert '\n' to line break.

*/

let guide = {
    name: "使用说明",
    func: {
        guide: {
            title: "使用说明",
            desc: userGuideText,
        }
    }
}

export default guide;
