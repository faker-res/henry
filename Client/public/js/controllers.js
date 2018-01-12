'use strict';

/* Controllers */

angular.module('myApp.controllers', ['ui.grid', 'ui.grid.edit', 'ui.grid.exporter', 'ui.grid.resizeColumns', 'ui.grid.moveColumns', 'ngSanitize', 'ngCsv']).controller('AppCtrl', function ($scope, $state, $window, $http, $location, $cookies, localStorageService, AppService, authService, socketService, utilService, CONFIG, $translate, $filter, $timeout) {
    //todo::disable console log for production
    // if(CONFIG.NODE_ENV != "local"){
    //     window.console = { log: function(){}, warn: function(){}, error: function(){}, info: function(){} };
    // }

    //set up socket service
    socketService.authService = authService;
    socketService.curScope = $scope;

    // Simulate latency by delaying all calls to socketService.$socket
    // Useful for testing purposes
    // Todo: It would be more realistic to delay the callback functions than delay the outgoing messages, as we do now.
    //var real$socket = socketService.$socket;
    //socketService.$socket = function () {
    //    var args = arguments;
    //    setTimeout(function () {
    //        real$socket.apply(socketService, args);
    //    }, 500 + 1500 * Math.random());
    //};

    $scope.constMaxDateTime = new Date('9999-12-31T23:59:59Z');
    function forceRelogin() {
        socketService.showErrorMessage("Your session has expired.  Redirecting you to login page...");

        setTimeout(function () {
            $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + "/#?loginRequired=yes"
        }, 2000);
    }

    let wsProtocol = "ws://";

    $scope.connectSocket = function () {
        if (!authService.isValid($cookies, localStorageService)) {
            forceRelogin();
            return;
        }

        $scope.langKey = authService.language || "zh_CN";
        $translate.use($scope.langKey);

        WSCONFIG.Default = CONFIG[CONFIG.NODE_ENV];
        $scope.mgntServerList = WSCONFIG;

        let url;
        let token = authService.token;
        let serverCookie = $cookies.get('curFPMSServer');

        if (!WSCONFIG[serverCookie]) {
            serverCookie = 'Default';
            $cookies.put('curFPMSServer', 'Default');
        }

        $scope.mgntServer = serverCookie;

        if (serverCookie === 'Default') {
            url = wsProtocol + CONFIG[CONFIG.NODE_ENV].MANAGEMENT_SERVER_URL.substr(7);
        } else {
            url = wsProtocol + WSCONFIG[serverCookie].socketURL
        }

        $scope.AppSocket = io.connect(url, {
            query: 'token=' + token,
            //todo::add secure flag for https
            //secure: true
            //set connection timeout to 30 seconds
            timeout: 30000,
            reconnectionDelay: 60000,
            reconnection: false,
            "transports": ["websocket"]
        });

        //check socket connection status after 10 seconds, if can't connect, login again
        // setTimeout(function () {
        //     if (!$scope.AppSocket.connected) {
        //         console.error("Can't connect to socket server!");
        //         $scope.logout();
        //     }
        // }, 1000000);

        $scope.AppSocket.on('connect', function () {
            $scope.$broadcast('socketConnected', 'socketConnected');
            console.log('Management server connected');
            initPage();
            authService.getAllActions($scope.AppSocket, function () {
                //todo::temp fix, should show view after angular translate are fully configured
                setTimeout(function () {
                    console.log("#wrapper show!");
                    $("#wrapper").show();
                }, 100);
            });
            socketService.setAppSocket($scope.AppSocket);
            //console.log("route reload!");
            //$state.reload();

            $scope.checkForExpiredPassword();
        }).on('disconnect', function () {
            console.log('Management server disconnected');
        }).on('connect_failed', function (err) {
            console.log('connection failed', err);
        }).on('connect_error', function (err) {
            console.log('connection err', err);
            // $scope.AppSocket.disconnect();
            //socketService.showErrorMessage("Cannot connect to server!");
        });

        $scope.AppSocket.on('error', function (data) {
            // The server sends this message if cookie authentication fails
            if (data.message === 'jwt expired' || data.code === 'invalid_token' || data.type === 'UnauthorizedError') {
                forceRelogin();
            }
        });

        $scope.AppSocket.on('PermissionUpdate', function () {
            console.log("PermissionUpdate event");
            authService.updateRoleDataFromServer($scope, $cookies, $state);
        });

        // 6 seconds interval to poll server status and ping
        setInterval(() => {
            $scope.AppSocket.emit('getAPIServerStatus', {});

            for (let server in WSCONFIG) {
                pingServer(server);
            }
        }, 6000);

        // internal function to ping server
        function pingServer(server) {
            let urlToPing = WSCONFIG[server].socketURL;

            if (server === 'Default') {
                urlToPing = CONFIG[CONFIG.NODE_ENV].MANAGEMENT_SERVER_URL.substr(7);
            }

            return new Promise((resolve, reject) => {
                let serverPing = io.connect(urlToPing, {
                    query: 'token=' + authService.token,
                    timeout: 50000,
                    reconnection: false,
                    "transports": ["websocket"]
                });

                serverPing.on('pong', (latency) => {
                    WSCONFIG[server].latency = latency * 2;
                    //todo::too much safe apply here. use a different way
                    //$scope.safeApply();

                    setTimeout(() => {
                        resolve(serverPing.disconnect());
                    }, 1000);
                });

                serverPing.emit('ping');
            })
        }
    };
    //$scope.connectSocket();

    //init messages
    $scope.errorMessages = [];
    $("#errorMessageFrame").show();
    $scope.confirmMessages = [];
    $("#confirmMessageFrame").show();

    $scope.checkForExpiredPassword = function () {
        setTimeout(function () {
            // Check if admin's password needs to be changed
            $scope.AppSocket.emit("getFullAdminInfo", {adminName: $scope.getUserName()});
            $scope.AppSocket.once("_getFullAdminInfo", function (data) {
                var lastPasswordUpdateTime = new Date(data.data.lastPasswordUpdateTime);
                if (Date.now() >= lastPasswordUpdateTime.getTime() + 1000 * 60 * 60 * 24 * 31) {
                    // Display the change password dialog
                    $scope.newPasswordNeeded = true;
                    $scope.userNewPassword = $scope.passwordVerify = '';
                    $scope.safeApply();
                    $('#modalUpdatePassword').modal({
                        show: true,
                        //keyboard: false   // Prevents the user from closing the modal by hitting Escape
                    });
                }
            });
        }, 1000);
    };

    $scope.getUserName = function () {
        return authService.adminName;
    };

    // logout handler
    $scope.logout = function () {
        // disconnect socket
        $scope.AppSocket.disconnect();

        authService.logout($cookies, localStorageService);

        setTimeout(
            function () {
                $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port();
            }, 500
        );
        return;
    };

    $scope.changeLogo = function () {
        $scope.companyLogo = $scope.logolist[++$scope.logoIndex % $scope.logolist.length];
    };

    //translate language:
    $scope.logolist = [
        //'images/header/logo.png',
        //'images/header/fantasy logo1.png',
        //'images/header/fantasy logo2.png',
        //'images/header/fantasy logo3.png',
        'images/header/updated logo1.png',
        //'images/header/logo.gif',
    ];
    var oldLoggerFunc = console.log;
    $scope.changeShowConsole = function () {
        $scope.isShowConsole = !$scope.isShowConsole;
        if ($scope.isShowConsole) {
            window.console.log = oldLoggerFunc;
        } else {
            window.console.log = function () {
            }
        }
    }
    $scope.getConsoleStatusAfterClicking = function () {
        return $scope.isShowConsole ? "Hide Console" : "Show Console";
    }
    $scope.logoIndex = 0;
    $scope.companyLogo = null; //$scope.logolist[0];
    $scope.changeLanguage = function () {
        switch ($scope.langKey) {
            case "ch_SP":
                $scope.langKey = "en_US";
                break;
            case "en_US":
                $scope.langKey = "ch_SP";
                break;
        }
        $translate.use($scope.langKey);
        $scope.safeApply();

        socketService.$socket($scope.AppSocket, 'updateAdmin', {
            query: {_id: authService.adminId},
            updateData: {language: $scope.langKey}
        }, null, null, true);
        authService.updateLanguage($cookies, $scope.langKey);

        return;
    };
    $scope.Datefn = function (messageDate) {
        return AppService.Datefn(messageDate);
    };
    $scope.TruncMessage = function (message) {
        return AppService.Truncatetxt(message);
    };

    $scope.openTestPage = function () {
        var win = window.open("http://ec2-54-255-174-69.ap-southeast-1.compute.amazonaws.com/TestPage/", '_blank');
        win.focus();
    };

    $scope.openHeaderPanel = function (header) {
        if ($scope.openInNewTab) {
            var win = window.open(($location.protocol() + "://" + $location.host() + ":" + $location.port() + "/" + header), '_blank');
            win.focus();
        }
        else {
            //$window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + "/" + header;
            $location.path(header); // path not hash
            $translate(header).then(
                data => {
                    window.document.title = data
                }
            );
        }
    };

    $scope.setClickedHeaderIcon = function () {
        var location = $location.path().slice(1);

        if (location == "platform")
            $('#cssmenu .navbar-brand  a[name*="platform"]').parent().addClass('clickedWebsiteBusiness');
        else
            $('#cssmenu .navbar-brand  a[name*="platform"]').parent().removeClass('clickedWebsiteBusiness');

        if (location == "mainPage")
            $('#cssmenu .navbar-brand  a[name*="mainPage"]').parent().addClass('clickedBackstagePrivilege');
        else
            $('#cssmenu .navbar-brand  a[name*="mainPage"]').parent().removeClass('clickedBackstagePrivilege');
    };

    $scope.curPlatformText = $cookies.get(authService.cookiePlatformKey) || "XBet";
    $scope.showPlatformDropDownList = false;

    $scope.switchPlatform = ($event) => {
        $event.stopPropagation();
        $scope.showPlatformDropDownList = !$scope.showPlatformDropDownList;
    };

    $(document).on('click','body',function () {
        // only when the dialog is open , then render it again.
        if($scope.showPlatformDropDownList){
            $scope.showPlatformDropDownList = false;
            $scope.safeApply();
        }
    })
    //get all platform data from server
    $scope.loadPlatformData = option => {
        if ($('#platformRefresh').hasClass('fa-spin')) {
            return
        }
        $('#platformRefresh').addClass('fa-spin');
        socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
            $scope.allPlatformData = data.data;
            if (data.data) {
                $scope.buildPlatformList(data.data);
            }
            $('#platformRefresh').removeClass('fa-spin');

            $('#platformRefresh').addClass('fa-check');
            $('#platformRefresh').removeClass('fa-refresh');
            setTimeout(function () {
                $('#platformRefresh').removeClass('fa-check');
                $('#platformRefresh').addClass('fa-refresh').fadeIn(100);
            }, 1000);

            //select platform from cookies data
            // let storedPlatform = $cookies.get("platform");
            let storedPlatform = $cookies.get(authService.cookiePlatformKey);
            if (storedPlatform) {
                $scope.searchAndSelectPlatform(storedPlatform, option);
            }

        }, function (err) {
            $('#platformRefresh').removeClass('fa-spin');
        });
    };

    $scope.buildPlatformList = data => {
        $scope.platformList = [];
        for (let i = 0; i < data.length; i++) {
            $scope.platformList.push($scope.createPlatformNode(data[i]));
        }

        let searchText = ($scope.platformSearchText || '').toLowerCase();
        let platformsToDisplay = $scope.platformList.filter(platformData => platformData.data.name.toLowerCase().includes(searchText));
        $('#platformTreeHeader').treeview(
            {
                data: platformsToDisplay,
                highlightSearchResults: false,
                showImage: true,
                showIcon: false,
            }
        );
        // vm.selectPlatformNode($('#platformTree').treeview('getNode', 0));
        $('#platformTreeHeader').on('nodeSelected', function (event, data) {
            $scope.$evalAsync($scope.selectPlatformNode(data));
            $scope.showPlatformDropDownList = false;
        });
    };

    $scope.createPlatformNode = function (v) {
        var obj = {
            text: v.name,
            id: v._id,
            selectable: true,
            data: v,
            image: {
                url: v.icon,
                width: 30,
                height: 30,
            }
        };
        return obj;
    };

    $scope.searchAndSelectPlatform = function (text, option) {
        var findNodes = $('#platformTreeHeader').treeview('search', [text, {
            ignoreCase: false,
            exactMatch: true
        }]);
        if (findNodes && findNodes.length > 0) {
            $scope.selectPlatformNode(findNodes[0], option);
            $('#platformTreeHeader').treeview('selectNode', [findNodes[0], {silent: true}]);
        }
    };

    $scope.selectPlatformNode = function (node, option) {
        $scope.selectedPlatform = node;
        $scope.curPlatformText = node.text;
        authService.updatePlatform($cookies, node.text)
        console.log("$scope.selectedPlatform", node.text);
        $cookies.put("platform", node.text);
        if (option && !option.loadAll) {
            $scope.safeApply();
            return;
        }

        $scope.$broadcast('switchPlatform');
    };

    // From: https://davidwalsh.name/javascript-debounce-function
    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    $scope.debounce = function (func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    // Convenience function that does not call its callback until conditionFn is met.
    // The onSuccess parameter is optional: you can provide it with .done() promise form if you prefer.
    /*
     $scope.waitFor = function (conditionFn, onSuccess) {
     var timer = setInterval(function () {
     if (conditionFn()) {
     clearInterval(timer);
     onSuccess();
     }
     }, 100);
     return {
     done: function (_onSuccess) {
     onSuccess = _onSuccess;
     }
     };
     };
     */

    // Rather than specifying times everywhere we call debounce, please call searchDebounce instead, so we can configure all the times from one place (here).
    $scope.debounceSearch = function (func) {
        return $scope.debounce(func, 300, false);
    };

    AppService.getData().then(function (data) {
        $scope.inbox = data.inbox;
        $scope.processes = data.processes;
    });

    $scope.merchantUseTypeJson = {
        '1': 'MerchantUse_CreateAccount',
        '2': 'MerchantUse_Normal'
    };

    // todo :: check if merchantTopupMainTypeJson actually got the index wrong
    $scope.merchantTopupMainTypeJson = {
        1: "Online",
        2: "Manual",
        3: "Alipay",
        4: "Wechatpay"
    };
    $scope.topUpTypeList = {
        1: "TOPUPMANUAL",
        2: "TOPUPONLINE",
        3: "ALIPAY",
        4: "WechatPay"
    };
    $scope.merchantTopupTypeJson = {
        '1': 'NetPay',
        '2': 'WechatQR',
        '3': 'AlipayQR',
        '4': 'WechatApp',
        '5': 'AlipayApp',
        '6': 'FASTPAY',
        '7': 'QQPAYQR',
        '8': 'UnPayQR',
        '9': 'JdPayQR',
        '10': 'WXWAP',
        '11': 'ALIWAP',
        '12': 'QQWAP',
        '13': 'PCard'
    };
    $scope.depositMethod = {
        1: "网银转账(Online Transfer)",
        2: "自动取款机(ATM)",
        3: "银行柜台(Counter)",
        4: "网银跨行(InterBank Transfer)",
        5: "支付宝(AliPay)"
    };
    $scope.merchantTargetDeviceJson = {
        '1': "clientType_Web",
        '2': 'clientType_H5',
        '3': 'clientType_Both',
        '4': "clientType_Application"
    };
    $scope.userAgentType = {
        '1': "WEB",
        '2': "APP",
        '3': "H5",
    }
    $scope.constProposalEntryType = {
        0: "ENTRY_TYPE_CLIENT",
        1: "ENTRY_TYPE_ADMIN",
        2: "ENTRY_TYPE_SYSTEM",
    };

    $scope.constProposalUserType = {
        0: "PLAYERS",
        1: "PARTNERS",
        2: "SYSTEM_USERS",
        3: "TEST_PLAYERS"
    };

    $scope.constPlayerStatus = {
        1: "NORMAL",
        2: "FORBID_GAME",
        3: "FORBID",
        4: "BALCKLIST",
        5: "ATTENTION",
        6: "LOGOFF",
        7: "CHEAT_NEW_ACCOUNT_REWARD",
        8: "TOPUP_ATTENTION",
        9: "HEDGING",
        10: "TOPUP_BONUS_SPAM",
        11: "MULTIPLE_ACCOUNT",
        12: "BANNED",
        13: "FORBID_ONLINE_TOPUP",
        14: "BAN_PLAYER_BONUS"
    };

    $scope.constPartnerStatus = {
        1: "NORMAL",
        2: "FORBID"
    };

    $scope.rewardInterval = {
        1: "Daily",
        2: "Weekly",
        3: "Biweekly",
        4: "Monthly",
        5: "No Interval"
    };

    $scope.rewardApplyType = {
        1: "Manual Apply",
        2: "Auto Apply",
        3: "Batch Apply"
    };

    $scope.intervalType = {
        1: "Greater and equal to (>=)",
        2: "Less than and equal to (<=)",
        3: "Equal to (=)",
        4: "Interval (>=, <)"
    };


    $scope.weekDay = {
        "": "",
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday",
        7: "Sunday"
    };

    $scope.dayTime = {
        "": "",
        0: "0000",
        1: "0100",
        2: "0200",
        3: "0300",
        4: "0400",
        5: "0500",
        6: "0600",
        7: "0700",
        8: "0800",
        9: "0900",
        10: "1000",
        11: "1100",
        12: "1200",
        13: "1300",
        14: "1400",
        15: "1500",
        16: "1600",
        17: "1700",
        18: "1800",
        19: "1900",
        20: "2000",
        21: "2100",
        22: "2200",
        23: "2300"
    };

    $scope.loseValueType = {
        1: "deposit - withdrawal",
        2: "consumption - reward",
        3: "consumtion sum"
    };

    $scope.constRewardPointsTaskCategory = {
        'LOGIN_REWARD_POINTS': 1,
        'TOPUP_REWARD_POINTS': 2,
        'GAME_REWARD_POINTS': 3
    };

    $scope.constPlayerRegistrationInterface = {
        0: 'BACKSTAGE',
        1: 'WEB_PLAYER',
        2: 'WEB_AGENT',
        3: 'H5_PLAYER',
        4: 'H5_AGENT',
        5: 'APP_PLAYER',
        6: 'APP_AGENT'
    };

    $scope.constRewardPointsIntervalPeriod = {
        0: "No Interval",
        1: "Daily",
        2: "Weekly",
        3: "Biweekly",
        4: "Monthly",
        5: "Yearly",
        6: "Custom"
    };

    $scope.constRewardPointsApplyMethod = {
        1: "Manual Apply",
        2: "Auto Apply"
    };

    $scope.constRewardPointsLogCategory = {
        1: "LOGIN_REWARD_POINTS",
        2: "TOPUP_REWARD_POINTS",
        3: "GAME_REWARD_POINTS",
        4: "POINT_REDUCTION",
        5: "POINT_INCREMENT",
        6: "EARLY_POINT_CONVERSION",
        7: "PERIOD_POINT_CONVERSION"
    };

    $scope.constRewardPointsLogStatus = {
        0: "PENDING",
        1: "PROCESSED",
        2: "CANCELLED",
    };

    $scope.constPromoCodeLegend = {
        PROMO_REWARD_AMOUNT: "X",
        PROMO_minTopUpAmount: "D",
        PROMO_CONSUMPTION: "Y",
        PROMO_DUE_DATE: "Z",
        ALLOWED_PROVIDER: "P",
        PROMO_CODE: "Q",
        PROMO_maxTopUpAmount: "M"
    };

    // $scope.consumptionRecordProviderName = {
    //     1: "AGOTHS",
    //     2: "PT",
    //     3: "MG"
    // }

    //////// DOM initialisation operations ////////

    $('[data-toggle="tooltip"]').tooltip();

    utilService.closeAllPopoversWhenClickingOnPage();

    //////// end DOM initialisation operations ////////

    $scope.checkViewPermission = function (category, view, viewName) {
        var isAllowed = authService.checkViewPermission(category, view, viewName);
        //console.log( "checkViewPermission", view, isAllowed );
        return isAllowed;
    };

    //update current admin user password
    $scope.updateUserPassword = function () {
        if ($scope.userNewPassword) {
            socketService.$socket($scope.AppSocket, 'updateAdmin', {
                query: {_id: authService.adminId},
                updateData: {password: $scope.userNewPassword}
            }, onSuccess, null, true);
        }

        function onSuccess() {
            $scope.newPasswordNeeded = false;
        }
    };

    // This is similar to generateRandomPassword in Server/routes/index.js
    function generateRandomPassword() {
        // We exclude commonly confused characters: 1 I l 0 O
        var numbers = "23456789";
        var symbols = "#$%@*^&!~:;?/\\[]{}";
        var dict = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz" + numbers + symbols;
        while (true) {
            var pass = '';
            for (var i = 0; i < 8; i++) {
                var j = Math.random() * dict.length;
                j = (j + Date.now()) % dict.length;
                var c = dict.charAt(j);
                pass = pass + c;
            }
            if (isValidPassword(pass)) {
                break;
            }
        }
        return pass;
    }

    $scope.getChannelList = function (callback) {
        socketService.$socket($scope.AppSocket, 'getSMSChannelList', {}, onSuccess, onFail, true);

        function onSuccess(data) {
            $scope.channelList = data.data.channels.filter(item => {
                return (item != 1) && (item != '1');
            });
            console.log("Got channelList:", $scope.channelList);
            if (callback) {
                callback.call(this);
            }
        }

        function onFail(error) {
            console.error("Failed to get channelList!", error);
            if (callback) {
                callback.call(this, error);
            }
        }
    }
    $scope.sendSMSToPlayer = function (src, callback) {
        socketService.$socket($scope.AppSocket, 'sendSMSToPlayer', src, onSuccess, onFail, true);

        function onSuccess(data) {
            if (callback) {
                callback.call(this, data);
            }
        }

        function onFail(error) {
            if (callback) {
                callback.call(this, error);
            }
        }
    }
    $scope.sendSMSToNewPlayer = function (src, callback) {
        socketService.$socket($scope.AppSocket, 'sentSMSToNewPlayer', src, onSuccess, onFail, true);

        function onSuccess(data) {
            if (callback) {
                callback.call(this, data);
            }
        }

        function onFail(error) {
            if (callback) {
                callback.call(this, error);
            }
        }
    }
    // phone call related....
    $scope.getNewPhoneCaptha = function () {
        $scope.phoneCall.random = Math.random();
        $scope.phoneCall.capthaSrc = "http://www.phoneapichat.com/servlet/GetMaCode?random=" + $scope.phoneCall.random;
        $('#phoneCaptha').prev().show();

        function checkCaptha() {
            var img = $('#phoneCaptha');
            if (img && img[0]) {
                if (img[0].currentSrc == $scope.phoneCall.capthaSrc && img[0].complete) {
                    img.css('width', 60);
                    img.prev().hide();
                } else {
                    img.css('width', 0);
                    return setTimeout(checkCaptha, 100);
                }
            }
        }

        utilService.actionAfterLoaded('#phoneCaptha', checkCaptha);
    }
    $scope.initPhoneCall = function (data) {
        $scope.phoneCall.toText = data.toText;
        $scope.phoneCall.platform = data.platform;
        $scope.phoneCall.phone = data.phone;
        $scope.phoneCall.username = data.toText;
        $scope.getNewPhoneCaptha();
    }
    $scope.makePhoneCall = function () {
        socketService.$socket($scope.AppSocket, 'getAdminInfo', {
            adminName: $scope.getUserName()
        }, onSuccess, onFail, true);

        function onSuccess(data) {
            console.log('admin data', data);
            var adminData = data.data;

            if (!adminData.callerId) {
                alert("还没设置座机。。。");
                return;
            }

            if (!adminData.did) {
                alert("还没设置前缀。。。");
                return;
            }

            // let url = "http://eu.tel400.me/cti/previewcallout.action";//http://101.78.133.213/cti/previewcallout.action";

            let urls = ["http://eu.tel400.me/cti/previewcallout.action", "http://jinbailitw.tel400.me/cti/previewcallout.action", "http://jinbailicro.tel400.me/cti/previewcallout.action"];

            urls.forEach(
                url => {
                    let now = new Date();
                    let formattedNow = $filter('date')(now, "yyyyMMdd");
                    let firstLevelMd5 = convertToMD5(adminData.callerId + "");
                    let password = convertToMD5(firstLevelMd5 + formattedNow);
                    //http://ipaddress:port/cti/previewcallout.action?User=***&Password=***&Callee=***&Taskid=***&isMessage=***&MessageUrl=***&DID=***;
                    let urlWithParams = url + "?User=" + adminData.callerId + "&Password=" + password + "&Callee=" + adminData.did + $scope.phoneCall.phone + "&username=" + $scope.phoneCall.username + "&Taskid=&isMessage=0&MessageUrl=&DID=";

                    $.ajax({
                        url: urlWithParams,
                        dataType: "jsonp",
                        type: "get",
                        success: function (e) {
                            console.log("ok", e);
                            //{“result”:”1”}
                            // 1：成功
                            // -1：失败，入参的参数不合法
                            // -2：失败，坐席工号不存在
                            // -3：失败，密码错误
                            // -4：失败，系统错误
                            // -5: 失败，URL错误
                            if (e.result && e.result == "1") {
                                alert("正在呼叫。。。");
                            }
                            else if (e.result && e.result == "-1") {
                                alert("失败，入参的参数不合法。");
                            }
                            else if (e.result && e.result == "-2") {
                                alert("失败，坐席工号不存在。");
                            }
                            else if (e.result && e.result == "-3") {
                                alert("失败，密码错误。");
                            }
                            else if (e.result && e.result == "-4") {
                                alert("失败，系统错误。");
                            }
                            else if (e.result && e.result == "-5") {
                                alert("失败，URL错误。");
                            }
                            else {
                                alert("失败，Uknown错误。" + e);
                            }
                        },
                        error: function (e) {
                            console.log("error", e);
                            if (e && e.status == 200) {
                                alert("正在呼叫。。。");
                            } else {
                                alert("呼叫超时请重试");
                            }
                        }
                    });
                }
            );
        }

        function onFail(error) {
            if (callback) {
                callback.call(this, error);
            }
        }
    }
    // phone call related....

    //copy from internet, bad naming conventions i know
    function convertToMD5(string) {

        function RotateLeft(lValue, iShiftBits) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
        }

        function AddUnsigned(lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = (lX & 0x80000000);
            lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000);
            lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) {
                return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            }
            if (lX4 | lY4) {
                if (lResult & 0x40000000) {
                    return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                } else {
                    return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                }
            } else {
                return (lResult ^ lX8 ^ lY8);
            }
        }

        function F(x, y, z) {
            return (x & y) | ((~x) & z);
        }

        function G(x, y, z) {
            return (x & z) | (y & (~z));
        }

        function H(x, y, z) {
            return (x ^ y ^ z);
        }

        function I(x, y, z) {
            return (y ^ (x | (~z)));
        }

        function FF(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function GG(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function HH(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function II(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        };

        function ConvertToWordArray(string) {
            var lWordCount;
            var lMessageLength = string.length;
            var lNumberOfWords_temp1 = lMessageLength + 8;
            var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
            var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
            var lWordArray = Array(lNumberOfWords - 1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            return lWordArray;
        };

        function WordToHex(lValue) {
            var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
            }
            return WordToHexValue;
        };

        function Utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";

            for (var n = 0; n < string.length; n++) {

                var c = string.charCodeAt(n);

                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }

            }

            return utftext;
        };

        var x = Array();
        var k, AA, BB, CC, DD, a, b, c, d;
        var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

        string = Utf8Encode(string);

        x = ConvertToWordArray(string);

        a = 0x67452301;
        b = 0xEFCDAB89;
        c = 0x98BADCFE;
        d = 0x10325476;

        for (k = 0; k < x.length; k += 16) {
            AA = a;
            BB = b;
            CC = c;
            DD = d;
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = AddUnsigned(a, AA);
            b = AddUnsigned(b, BB);
            c = AddUnsigned(c, CC);
            d = AddUnsigned(d, DD);
        }

        var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);

        return temp.toLowerCase();
    }

    function isValidPassword(pass) {
        if (!pass) {
            return false;
        }
        var numbers = "0123456789";
        var symbols = "#$%@*^&!~:;?/\\[]{}";
        var lowerCaseAlpha = "abcdefghijklmnopqrstuvwxyz";
        var upperCaseAlpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var hasNumber = pass.match('[' + numbers + ']');
        var hasSymbol = pass.match('[' + symbols.replace(/(\[|\])/g, '\\$1') + ']');
        var hasLower = pass.match('[' + lowerCaseAlpha + ']');
        var hasUpper = pass.match('[' + upperCaseAlpha + ']');
        return hasNumber && hasSymbol && hasLower && hasUpper;
    }

    $scope.generateRandomPassword = generateRandomPassword;
    $scope.isValidPassword = isValidPassword;

    $scope.safeApply = function (fn) {
        if ($scope.$root && $scope.$root.$$phase == '$apply' || $scope.$root.$$phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            $scope.$digest(fn);
        }
    };

    $location.path();
    $scope.$on('childControllerLoaded', function () {
        console.log('Start connecting Management server');
        $scope.connectSocket();
    });

    function initPage() {
        if (!$scope.AppSocket.connected) {
            $("#pageWrapper").html('<i class="fa fa-spin fa-spinner fa-pulse fa-3x fa-fw margin-bottom"></i>');
        }

        var location = $location.path().slice(1);
        $('#cssmenu .navbar-brand  a[name*="' + location + '"]').parent().addClass('active');

        if (location == "platform")
            $('#cssmenu .navbar-brand  a[name*="' + location + '"]').parent().addClass('clickedWebsiteBusiness');
        else if (location == "mainPage")
            $('#cssmenu .navbar-brand  a[name*="' + location + '"]').parent().addClass('clickedBackstagePrivilege');

        $translate(location).then(
            data => {
                window.document.title = data
            }
        );
        $scope.langKey = $cookies.get(authService.cookieLanguageKey);
        $scope.isShowConsole = true;
        $scope.getGeneralDataTableOption = {
            "paging": true,
            dom: 'tpl',
            "aaSorting": [],
            destroy: true,
            "scrollX": true,
            sScrollY: 350,
            scrollCollapse: true,
            lengthMenu: [
                [10, 25, 50, -1],
                ['10', '25', '50', $translate('Show All')]
            ],
        };
        $scope.serverStatus = {};
        $scope.AppSocket.emit('getAPIServerStatus', {});

        // Get API server status response
        $scope.AppSocket.on('_getAPIServerStatus', function (data) {
            if (($scope.serverStatus.server != $scope.AppSocket.connected) || ($scope.serverStatus.cpServer != data.cpms) || ($scope.serverStatus.pServer != data.pms)) {
                $scope.serverStatus.server = $scope.AppSocket.connected;
                $scope.serverStatus.cpServer = data.cpms;
                $scope.serverStatus.pServer = data.pms;
                $scope.safeApply();
            }
        });

        $scope.getChannelList();
        $scope.phoneCall = {};
        utilService.initTranslate($filter('translate'));
        socketService.initTranslate($filter('translate'));

        // Platform switch
        $scope.loadPlatformData();
    }

    $scope.presentActionLog = function () {
        socketService.$socket($scope.AppSocket, 'getAdminActionLog', {
            adminName: $scope.getUserName()
        }, function (reply) {
            console.log("getAdminActionLog reply:", reply);
            $scope.actionLogData = reply.data;
            $scope.safeApply();
            // if (reply.success) {
            //
            //     var tableOptions = {
            //         data: reply.data,
            //         columns: [
            //             {
            //                 title: ('TIME'), data: 'operationTime',
            //                 render: function (data, type, row) {
            //                     return utilService.$getTimeFromStdTimeFormat(data);
            //                 }
            //             },
            //             {title: ('ACTION'), data: 'action'},
            //             {
            //                 title: ('PARAMETERS'),
            //                 data: 'data',
            //                 render: function (data, type, row) {
            //                     //return $("<span>").text( JSON.stringify(data) ).prop('outerHTML');
            //                     return renderParameters(data);
            //                 }
            //             }
            //         ],
            //         "autoWidth": true,
            //         "scrollX": true,
            //         "scrollY": "310px",
            //         "scrollCollapse": true,
            //         "destroy": true,
            //         "paging": true,
            //         //"dom": '<"top">rt<"bottom"il><"clear">',
            //         "language": {
            //             "info": "Total _MAX_ actions"
            //         }
            //     };
            //
            //     var logTable = $('#actionLogDataTable').DataTable(tableOptions);
            //     $('#actionLogDataTable').resize();
            //     $('#actionLogDataTable').resize();
            // }
        });
    };

    function fetchAdminMail() {
        $scope.$socketPromise('getAdminMailList', {
            adminObjId: authService.adminId
        }).then(function (reply) {
            $scope.adminMail = reply.data;
            $scope.adminMailUnreadCount = $scope.adminMail.filter(mail => !mail.hasBeenRead).length;
            $scope.safeApply();
        }).done();
    }

    // Fetch mail pre-emptively, so we can show unread count in the menu
    //setTimeout(fetchAdminMail, 10*1000);
    //setInterval(fetchAdminMail, 4*60*1000);
    $scope.fetchAdminMailDebounced = $scope.debounce(fetchAdminMail, 10 * 1000, true);
    $scope.presentAdminMails = function () {
        fetchAdminMail();
    };
    $scope.adminMailReplyTo = function (mail) {
        $('.modal.in').modal('hide');
        // @todo Open the modal to send a message to mail.senderId
    };
    $scope.adminMailToggleUnread = function (mail) {
        mail.hasBeenRead = !mail.hasBeenRead;
        // @todo Save this change to the playerMail document in the DB
        // Note that adminMailUnreadCount will not update until we call fetchAdminMail again (or pull it out of there)
    };
    $scope.adminMailDeleteMail = function (mail) {
        // @todo Send the delete request to the server
        // Note that adminMailUnreadCount will not update until we call fetchAdminMail again (or pull it out of there)
    };

    $scope.timeReformat = function (data) {
        return utilService.$getTimeFromStdTimeFormat(data);
    }
    $scope.renderParameters = function (data) {
        //console.log("Rendering data:",data);
        var view = $('<div>');
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var value = data[key];
                var fieldView = $("<div>")
                    .append($('<span>').text(key + ':'))
                    .append($('<span>').text(JSON.stringify(value)));
                view.append(fieldView);
            }
        }
        return view.prop('outerHTML');
    }

    $scope.$socketPromise = function (apiHook, requestData, showConfirm) {
        if (typeof requestData === 'undefined') {
            requestData = '';
        }

        return new Q.Promise(function (resolve, reject) {
            socketService.$socket($scope.AppSocket, apiHook, requestData, resolve, reject, showConfirm);
        });
    };

    $scope.getProvinceStr = function (provinceId) {
        if (!provinceId) return Q.resolve('');
        return new Q.Promise(function (resolve, reject) {
            socketService.$socket($scope.AppSocket, "getProvince", {provinceId: provinceId}, resolve, reject);
        });
    };
    $scope.getCityStr = function (cityId) {
        if (!cityId) return Q.resolve('');
        return new Q.Promise(function (resolve, reject) {
            socketService.$socket($scope.AppSocket, "getCity", {cityId: cityId}, resolve, reject);
        });
    };
    $scope.getDistrictStr = function (districtId) {
        if (!districtId) return Q.resolve('');
        return new Q.Promise(function (resolve, reject) {
            socketService.$socket($scope.AppSocket, "getDistrict", {districtId: districtId}, resolve, reject);
        });
    };

    /**
     * Will throw an Error if the condition is not met.
     * But will not explain the parameters.
     * Use a more specific function like assertEqual when possible.
     * @param condition
     */
    $scope.assert = function (condition) {
        if (!condition) {
            throw new Error("Assertion failed.");
        }
    };

    /**
     * Will throw an Error is a is not equal to b.
     */
    $scope.assertEqual = function (a, b) {
        if (a !== b) {
            throw new Error("Assertion failed: Expected " + a + " to equal " + b);
        }
    };
    $('body').click(function (a, b, c) {
        let pop = $(a.target).closest('.popover');
        $(".popover.in").not(pop).popover('hide');
    });

    $scope.changeServer = (server) => {
        $cookies.put('curFPMSServer', server);
        $scope.connectSocket();
    };
    $scope.changeLogoImg = (url) => {
        $scope.companyLogo = url;
    };

    $scope.resetTableSize = function (divName, elem) {
        utilService.actionAfterLoaded(divName, function () {
            $timeout(()=>{
                $(elem).resize();
            },0)
        });

    };
});
