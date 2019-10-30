'use strict';

/* Controllers */

angular.module('myApp.controllers', ['ui.grid', 'ui.grid.edit', 'ui.grid.exporter', 'ui.grid.resizeColumns', 'ui.grid.moveColumns', 'ngSanitize', 'ngCsv']).controller('AppCtrl', function ($scope, $state, $window, $http, $location, $cookies, localStorageService, AppService, authService, socketService, utilService, CONFIG, $translate, $filter, $timeout, commonService) {
    let $trans = $filter('translate');
    let $roundToTwoDecimalPlacesString = $filter('roundToTwoDecimalPlacesString');
    let noDecimalPlacesString = $filter('noDecimalPlacesString');
    //set up socket service
    socketService.authService = authService;
    socketService.curScope = $scope;

    $scope.isLoading = false;

    // Dev log switch
    let consoleLog, consoleInfo;
    $scope.enableLogging = $cookies.get('devLog') ? JSON.parse($cookies.get('devLog')) : false;
    $scope.toggleDevLog = (isFirstLoad) => {
        if (!isFirstLoad) {
            $scope.enableLogging = !$scope.enableLogging;
        }

        if (!$scope.enableLogging) {
            consoleLog = console.log;
            consoleInfo = console.info;
            window['console']['log'] = () => {};
            window['console']['info'] = () => {};
            $cookies.put('devLog', 'false');
        } else {
            if (!consoleLog || !consoleInfo) {
                return;
            }

            window['console']['log'] = consoleLog;
            window['console']['info'] = consoleInfo;
            $cookies.put('devLog', 'true');
        }
    };
    $scope.toggleDevLog(true);

    $scope.constMaxDateTime = new Date('9999-12-31T23:59:59Z');
    function forceRelogin() {
        socketService.showErrorMessage("Your session has expired.  Redirecting you to login page...");

        setTimeout(function () {
            $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + "/#?loginRequired=yes"
        }, 2000);
    }

    let wsProtocol = "ws://";

    function connectSocket() {
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
            timeout: 10000,
            reconnectionDelay: 30000,
            reconnection: true,
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
            // $scope.$broadcast('socketConnected', 'socketConnected');
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
            $scope.isLoading = false;
        }).on('disconnect', function () {
            console.warn('Management server disconnected');
            $scope.isLoading = false;
        }).on('connect_failed', function (err) {
            console.warn('connection failed', err);
            $scope.isLoading = false;
        }).on('connect_error', function (err) {
            console.warn('connection err', err);
            $scope.isLoading = false;
            // $scope.AppSocket.disconnect();
            //socketService.showErrorMessage("Cannot connect to server!");
        });

        $scope.AppSocket.on('error', function (data) {
            $scope.isLoading = false;
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
        }, 30000);

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

                    setTimeout(() => {
                        serverPing.disconnect();
                        resolve(serverPing.close());
                    }, 30000);
                });

                serverPing.emit('ping');
            })
        }
    };

    if (!$scope.isLoading) {
        $scope.isLoading = true;
        connectSocket();
    }

    $scope.connectSocket = connectSocket;

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

    $scope.getServerTime = function (callback) {
        socketService.$socket($scope.AppSocket, 'getServerTime', {}, onSuccess, onFail, true);

        function onSuccess(data) {
            $scope.serverTime = data.data;
            console.log("serverTime:", $scope.serverTime);
            if (callback) {
                callback.call(this);
            }
        }

        function onFail(error) {
            console.error("Failed to get serverTime!", error);
            if (callback) {
                callback.call(this, error);
            }
        }
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

        $('#cssmenu .navbar-brand  a').parent().removeClass('active');
        $('#cssmenu .navbar-brand  a[name*="' + location + '"]').parent().addClass('active');

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
            let storedPlatform = $cookies.get('platform');
            if (storedPlatform) {
                $scope.searchAndSelectPlatform(storedPlatform, option);
            } else {
                $cookies.put('platform', $scope.allPlatformData[0].name);
                $scope.searchAndSelectPlatform($scope.allPlatformData[0].name, option);
            }

        }, function (err) {
            $('#platformRefresh').removeClass('fa-spin');
        });
    };

    $scope.buildPlatformList = data => {
        $scope.platformList = [];
        function sortPlatform(a, b) {
            if (a.hasOwnProperty("platformId") && b.hasOwnProperty("platformId")) {
                let dataA = parseInt(a.platformId);
                let dataB = parseInt(b.platformId);
                if (!isNaN(dataA) && !isNaN(dataB)) {
                    return dataA - dataB;
                }
            }
            return 0;
        }
        if (data.length) {
            data = data.sort(sortPlatform);
        }
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
        sendAllProfitData();
    };

    $scope.createPlatformNode = function (v) {
        var obj = {
            text: v.platformId + ". " + v.name,
            id: v._id,
            selectable: true,
            data: v,
            image: {
                url: v.icon,
                width: 30,
                height: 30,
            },
            platformName: v.name,
            platformId: v.platformId
        };

        return obj;
    };

    $scope.searchAndSelectPlatform = function (text, option) {
        // var findNodes = $('#platformTreeHeader').treeview('search', [text, {
        //     ignoreCase: false,
        //     exactMatch: true
        // }]);
        var findNodes = $scope.platformList.filter(e => e.platformName === text);
        if (!findNodes.length) {
            findNodes = [$scope.platformList[0]];
        }
        if (findNodes && findNodes.length > 0) {
            $scope.selectPlatformNode(findNodes[0], option);
            $('#platformTreeHeader').treeview('selectNode', [findNodes[0], {silent: true}]);
        }
    };

    $scope.selectPlatformNode = function (node, option) {
        $scope.selectedPlatform = node;
        $scope.curPlatformText = node.text;
        $scope.curPlatformId = node.platformId;
        authService.updatePlatform($cookies, node.platformName);
        console.log("$scope.selectedPlatform", node.platformName);
        $cookies.put("platform", node.platformName);
        if (option && !option.loadAll) {
            $scope.safeApply();
            return;
        }

        loadPlatformInfo();
        $scope.getUsableChannelList();
        $scope.getServerTime();
        $scope.$broadcast('switchPlatform');
        $scope.fontSizeAdaptive(document.getElementById('selectedPlatformNodeTitle'));
    };

    $scope.fontSizeAdaptive = function(element){
        if( element ){
            element.style.fontSize = '20px';
            let parentWidth = parseInt(window.getComputedStyle(element.parentElement).width);
            let elemWidth = parseInt(window.getComputedStyle(element).width);
            elemWidth = isNaN(elemWidth) ? 0 : elemWidth;

            if (elemWidth > parentWidth-50){
                element.style.fontSize = '16px';
            }
        }
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

    // AppService.getData().then(function (data) {
    //     $scope.inbox = data.inbox;
    //     $scope.processes = data.processes;
    // });

    $scope.pairResultType = ['', "Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"];

    $scope.merchantUseTypeJson = {
        '1': 'MerchantUse_CreateAccount',
        '2': 'MerchantUse_Normal'
    };

    $scope.financialPointsList = {
        1: "TOPUPMANUAL",
        2: "TOPUPONLINE",
        3: "TOPUPALIPAY",
        4: "TOPUPWECHAT",
        5: "PLAYER_BONUS",
        6: "PARTNER_BONUS",
        7: "FINANCIAL_POINTS_ADD_SYSTEM",
        8: "FINANCIAL_POINTS_DEDUCT_SYSTEM"
    }

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
        '13': 'PCard',
        '14': 'JDWAP',
        '15': 'WXBARCODE'
    };
    $scope.depositMethod = {
        1: "网银转账(Online Transfer)",
        2: "自动取款机(ATM)",
        3: "银行柜台(Counter)",
        4: "支付宝转账(AliPay Transfer)",
        5: "微信转帐(WeChatPay Transfer)",
        6: "云闪付(CloudFlashPay)",
        7: "云闪付转账(CloudFlashPay Transfer)"
    };

    $scope.depositMethodList = {
        Online: 1,
        ATM: 2,
        Counter: 3,
        AliPayTransfer: 4,
        weChatPayTransfer: 5,
        CloudFlashPay: 6,
        CloudFlashPayTransfer: 7
    };

    $scope.counterDepositType = {
        1:'Bankcard',
        2:'Cash'
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
        '0': "Backstage"
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

    $scope.festivalType = {
        '1': 'MemberBirthday',
        '2': 'SpecialEvent(Custom)'
    }
    $scope.commissionTypeList = {
        1: "DAILY_BONUS_AMOUNT",
        2: "WEEKLY_BONUS_AMOUNT",
        3: "BIWEEKLY_BONUS_AMOUNT",
        4: "MONTHLY_BONUS_AMOUNT",
        5: "WEEKLY_CONSUMPTION",
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

    $scope.constPartnerCommissionLogStatus = {
        PREVIEW: 0,
        EXECUTED: 1,
        RESET_THEN_EXECUTED: 2,
        EXECUTED_THEN_RESET: 3,
        SKIPPED: 4
    };

    $scope.rewardInterval = {
        1: "Daily",
        2: "Weekly",
        3: "Biweekly",
        4: "Monthly",
        6: "LastMonth",
        7: "Yearly",
        5: "No Interval",
    };

    $scope.rewardApplyType = {
        1: "Manual Apply",
        2: "Auto Apply",
        3: "Batch Apply",
        4: "Manual Subscribe Auto Apply"
    };

    $scope.randomRewardType = {
        0: "",
        1: "Credit",
        2: "Promo Code-B (With Deposit)",
        3: "Promo Code-B (Without Deposit)",
        4: "Promo Code-C",
        5: "Reward Points",
        6: "Real Prize"
    };

    $scope.randomRewardMode = {
        0: "possibility",
        1: "topupCondition"
    }

    $scope.bonusDoubledRewardModal = {
        1: "Principal x Multiplier/100",
        2: "Fixed reward amount based on the multiplier"
    };

    $scope.bonusDoubledDefination = {
        1: "Win-lose credit/Tranferred-in credit"
    };

    $scope.intervalType = {
        1: "Greater and equal to (>=)",
        2: "Less than and equal to (<=)",
        3: "Equal to (=)",
        4: "Interval (>=, <)"
    };

    $scope.operatorType = {
        1: ">=",
        2: "<=",
        3: "=",
        4: "~"
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
        23: "2300",
        24: "2400"
    };

    $scope.monthDate = {
        "": "",
        1: "01",
        2: "02",
        3: "03",
        4: "04",
        5: "05",
        6: "06",
        7: "07",
        8: "08",
        9: "09",
        10: "10",
        11: "11",
        12: "12",
        13: "13",
        14: "14",
        15: "15",
        16: "16",
        17: "17",
        18: "18",
        19: "19",
        20: "20",
        21: "21",
        22: "22",
        23: "23",
        24: "24",
        25: "25",
        26: "26",
        27: "27",
        28: "28",
        29: "29",
        30: "30",
        31: "31"
    };

    $scope.loseValueType = {
        1: "deposit - withdrawal",
        2: "consumption - reward",
        3: "consumtion sum"
    };

    $scope.playerLoginMode = {
        1: "ACCUMULATIVE_LOGIN_DAY",
        2: "EXACT_LOGIN_DATE",
        3: "ACCUMULATIVE_LOGIN_DAY_COUNT_WHEN_APPLY",
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
        6: 'APP_AGENT',
        7: 'APP_NATIVE_PLAYER',
        8: 'APP_NATIVE_PARTNER',
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

    $scope.constDevice = {
        "0": "BACKSTAGE",
        // for player
        "1": "WEB_PLAYER",
        "1403": "WEB_PLAYER_EU",
        "1402": "WEB_PLAYER_V68",
        "1401": "WEB_PLAYER_EU_CHESS",
        "2": "H5_PLAYER",
        "2403": "H5_PLAYER_EU",
        "2402": "H5_PLAYER_V68",
        "2401": "H5_PLAYER_EU_CHESS",
        "3403": "APP_PLAYER_ANDROID_EU",
        "3401": "APP_PLAYER_ANDROID_EU_CHESS",
        "3402": "APP_PLAYER_ANDROID_V68",
        "4403": "APP_PLAYER_IOS_EU",
        "4401": "APP_PLAYER_IOS_EU_CHESS",
        "4402": "APP_PLAYER_IOS_V68",
        // for partner
        "P1": "WEB_PARTNER",
        "P1403": "WEB_PARTNER_EU",
        "P1402": "WEB_PARTNER_V68",
        "P1401": "WEB_PARTNER_EU_CHESS",
        "P2": "H5_PARTNER",
        "P2403": "H5_PARTNER_EU",
        "P2402": "H5_PARTNER_V68",
        "P2401": "H5_PARTNER_EU_CHESS",
        "P3403": "APP_PARTNER_ANDROID_EU",
        "P3401": "APP_PARTNER_ANDROID_EU_CHESS",
        "P3402": "APP_PARTNER_ANDROID_V68",
        "P4403": "APP_PARTNER_IOS_EU",
        "P4401": "APP_PARTNER_IOS_EU_CHESS",
        "P4402": "APP_PARTNER_IOS_V6"
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
        7: "PERIOD_POINT_CONVERSION",
        8: "POINT_REDUCTION_CANCELLED",
        9: "EARLY_POINT_CONVERSION_CANCELLED",
        10: "PERIOD_POINT_CONVERSION_CANCELLED"
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

    $scope.constPlayerCreditTransferStatus = {
        1: "SUCCESS",
        2: "FAIL",
        3: "REQUEST",
        4: "SEND",
        5: "TIMEOUT"
    };

    $scope.constPartnerCommissionSettlementType = {
        1: "DAILY_BONUS_AMOUNT",
        2: "WEEKLY_BONUS_AMOUNT",
        3: "BIWEEKLY_BONUS_AMOUNT",
        4: "MONTHLY_BONUS_AMOUNT",
        5: "WEEKLY_CONSUMPTION",
        7: "DAILY_CONSUMPTION",
    };

    $scope.constCallOutMissionStatus = {
        CREATED: 0,
        ON_GOING: 1,
        PAUSED: 2,
        FINISHED: 3,
        CANCELLED: 4
    };

    $scope.constCallOutMissionCalleeStatus = {
        CREATED: 0,
        SUCCEEDED: 1,
        FAILED: 2
    };

    $scope.zeroOne = {
        zero: 0,
        one: 1
    };

    $scope.constPhoneArea = {
        山东: ["济南", "滨州", "东营", "淄博", "烟台", "潍坊", "临沂", "日照", "枣庄", "威海", "青岛", "聊城", "德州", "泰安", "济宁", "菏泽", "莱芜"],
        江苏: ["常州", "南京", "无锡", "镇江", "连云港", "盐城", "宿迁", "徐州", "南通", "淮安", "扬州", "泰州", "苏州"],
        安徽: ["巢湖", "合肥", "蚌埠", "芜湖", "淮南", "铜陵", "宿州", "六安", "淮北", "阜阳", "马鞍山", "宣城", "安庆", "滁州", "池州", "黄山", "亳州"],
        四川: ["宜宾", "自贡", "攀枝花", "南充", "遂宁", "达州", "泸州", "内江", "绵阳", "凉山", "乐山", "眉山", "德阳", "广元", "成都", "资阳", "甘孜藏族自治州", "阿坝藏族羌族自治州", "巴中", "广安", "雅安", "凉山彝族自治州", "阿坝", "甘孜"],
        陕西: ["西安", "渭南", "咸阳", "汉中", "宝鸡", "铜川", "延安", "榆林", "商洛", "安康"],
        湖北: ["武汉", "黄冈", "孝感", "随州", "襄阳", "十堰", "荆州", "江汉（天门/仙桃/潜江）区", "荆门", "宜昌", "恩施土家族苗族自治州", "黄石", "鄂州", "咸宁", "恩施", "仙桃", "江汉", "潜江", "神农架林区"],
        北京: ["北京"],
        河北: ["唐山", "秦皇岛", "廊坊", "沧州", "邢台", "邯郸", "衡水", "石家庄", "保定", "张家口", "承德"],
        广东: ["汕尾", "揭阳", "梅州", "河源", "潮州", "清远", "韶关", "云浮", "深圳", "中山", "佛山", "东莞", "广州", "汕头", "肇庆", "湛江", "阳江", "茂名", "珠海", "惠州", "江门"],
        广西: ["防城港", "百色", "钦州", "河池", "贵港", "南宁", "柳州", "桂林", "玉林", "梧州", "北海", "贺州", "来宾", "崇左"],
        山西: ["太原", "晋中", "运城", "临汾", "大同", "晋城", "长治", "忻州", "朔州", "吕梁", "阳泉"],
        江西: ["九江", "景德镇", "吉安", "抚州", "南昌", "鹰潭", "上饶", "宜春", "新余", "萍乡", "赣州"],
        青海: ["海北藏族自治州", "海西", "西宁", "海东", "海南藏族自治州", "海西蒙古族藏族自治州", "玉树藏族自治州", "果洛藏族自治州", "黄南藏族自治州", "海北", "海南", "黄南", "果洛"],
        贵州: ["贵阳", "遵义", "安顺", "铜仁", "黔东南", "黔南", "六盘水", "黔西南", "毕节", "都匀", "黔南布依族苗族自治州", "黔东南苗族侗族自治州", "黔西南布依族苗族自治州"],
        宁夏: ["石嘴山", "吴忠", "固原", "银川", "中卫"],
        吉林: ["辽源", "松原", "白城", "白山", "延边", "吉林", "通化", "长春", "四平", "延边朝鲜族自治州"],
        辽宁: ["丹东", "抚顺", "葫芦岛", "本溪", "营口", "大连", "沈阳", "辽阳", "阜新", "盘锦", "朝阳", "锦州", "铁岭", "鞍山"],
        云南: ["大理白族自治州", "丽江", "临沧", "怒江傈僳族自治州", "红河哈尼族彝族自治州", "楚雄彝族自治州", "曲靖", "玉溪", "昆明", "文山壮族苗族自治州", "普洱", "保山", "德宏傣族景颇族自治州", "西双版纳傣族自治州", "迪庆藏族自治州", "昭通", "西双版纳", "迪庆", "红河", "怒江", "德宏"],
        甘肃: ["嘉峪关", "张掖", "武威", "兰州", "白银", "酒泉", "定西", "临夏回族自治州", "庆阳", "天水", "平凉", "甘南藏族自治州", "陇南", "金昌", "临夏"],
        新疆: ["喀什地区", "吐鲁番地区", "乌鲁木齐", "昌吉回族自治州", "石河子", "巴音郭楞", "哈密地区", "阿克苏地区", "伊犁", "博尔塔拉", "伊犁哈萨克自治州", "克拉玛依", "克孜勒苏柯尔克孜", "和田地区", "塔城地区", "阿勒泰地区", "克孜勒苏柯尔克孜自治州", "哈密", "博尔塔拉蒙古自治州", "巴音郭楞蒙古自治州", "和田", "阿克苏"],
        河南: ["濮阳", "三门峡", "鹤壁", "郑州", "洛阳", "安阳", "开封", "焦作", "新乡", "许昌", "漯河", "平顶山", "信阳", "驻马店", "周口", "商丘", "南阳", "济源"],
        内蒙古: ["兴安盟", "锡林郭勒", "包头", "呼和浩特", "乌兰察布", "鄂尔多斯", "巴彦淖尔", "乌海", "呼伦贝尔", "通辽", "赤峰", "兴安", "阿拉善", "阿拉善盟", "海拉尔", "临河", "集宁", "锡林郭勒盟"],
        湖南: ["怀化", "岳阳", "长沙", "湘潭", "株洲", "衡阳", "郴州", "常德", "益阳", "娄底", "邵阳", "张家界", "永州", "湘西", "吉首", "湘西土家族苗族自治州"],
        天津: ["天津"],
        上海: ["上海"],
        浙江: ["温州", "宁波", "嘉兴", "湖州", "舟山", "绍兴", "衢州", "金华", "台州", "丽水", "杭州"],
        黑龙江: ["佳木斯", "哈尔滨", "齐齐哈尔", "牡丹江", "大庆", "绥化", "黑河", "鸡西", "七台河", "鹤岗", "双鸭山", "伊春", "大兴安岭地区", "大兴安岭"],
        福建: ["福州", "莆田", "厦门", "漳州", "泉州", "三明", "宁德", "南平", "龙岩"],
        重庆: ["重庆"],
        海南: ["海口"],
        香港: ["香港"],
        西藏: ["拉萨", "日喀则地区", "山南地区", "林芝地区", "昌都", "那曲地区", "阿里地区"]
    };

    $scope.constNavigationTag = {
        1: {name: "优惠活动", type: "功能"},
        2: {name: "优惠详情", type: "网页"},
        3: {name: "赛事直播", type: "功能"},
        4: {name: "体育赛事", type: "功能"},
        5: {name: "真人", type: "功能"},
        6: {name: "棋牌", type: "功能"},
        7: {name: "电子", type: "功能"},
        8: {name: "捕鱼", type: "功能"},
        9: {name: "充值", type: "功能"},
        10: {name: "提款", type: "功能"},
        11: {name: "绑定手机号", type: "功能"},
        12: {name: "绑定银行卡", type: "功能"},
        13: {name: "客服", type: "功能"},
        14: {name: "在线客服", type: "网页"},
        15: {name: "任务", type: "功能"},
        16: {name: "商城", type: "功能"},
        17: {name: "分享", type: "功能"},
        18: {name: "代理", type: "功能"}
    };

    $scope.frontEndSettingDevice = {
        1: "PC",
        2: "H5",
        4: "App"
    };

    $scope.referralInterval = {
        1: "Daily",
        2: "Weekly",
        3: "Monthly",
        4: "Yearly",
        5: "No Interval"
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

    $scope.getNumberArray = (number) => {
        return new Array(number);
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

    $scope.getUsableChannelList = function (callback) {
        $scope.usableChannelList = $scope.usableChannelList && $scope.usableChannelList.length > 0 ? $scope.usableChannelList : [4]; // Bubles said default to channel 4 if get channel connection error
        socketService.$socket($scope.AppSocket, 'getUsableChannelList', {platformId: $scope.curPlatformId || 4}, onSuccess, onFail, true);

        function onSuccess(data) {
            $scope.usableChannelList = data.data.channels.filter(item => {
                return (item != 1) && (item != '1'); //channel 1 is only for sending sms code
            });

            if (!$scope.usableChannelList || !$scope.usableChannelList.length) {
                $scope.usableChannelList = [4]
            }

            $scope.channelList = $scope.usableChannelList;
            console.log("Got usable channelList:", $scope.usableChannelList);
            if (callback) {
                callback.call(this);
            }
        }

        function onFail(error) {
            console.error("Failed to get usable channelList!", error);
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
            if (error && error.error && error.error.originalMessage) {
                if (error.error.originalMessage.errorMessage) {
                    socketService.showErrorMessage(error.error.originalMessage.errorMessage)
                } else if (error.error.originalMessage.errorMsg) {
                    socketService.showErrorMessage(error.error.originalMessage.errorMsg)
                } else {
                    socketService.showErrorMessage(error.error.originalMessage)
                }
            }
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
    $scope.makePhoneCall = function (platformId, isTs) {
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

            if (!adminData.did && !adminData.tsdid) {
                alert("还没设置前缀。。。");
                return;
            }

            // let url = "http://eu.tel400.me/cti/previewcallout.action";//http://101.78.133.213/cti/previewcallout.action";

            let urls = [
                "http://jsh.tel400.me/cti/previewcallout.action",
                "http://jinbailinewcro.tel400.me/cti/previewcallout.action",
                "http://blb.tel400.me/cti/previewcallout.action",
                "http://rb.tel400.me/cti/previewcallout.action",
                "http://xbettz.tel400.me/cti/previewcallout.action",
            ];

            if (platformId == '6') {
                urls = [
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action",
                    "http://ruibodl.tel400.me/cti/previewcallout.action",
                    "http://jbldl.tel400.me/cti/previewcallout.action",
                    "http://jinbailitw.tel400.me/cti/previewcallout.action",
                    "http://jinbailitz.tel400.me/cti/previewcallout.action",
                ];
            } else if (platformId == '7') {
                urls = [
                    "http://bbet8dl.tel400.me/cti/previewcallout.action",
                    "http://bbet8.tel400.me/cti/previewcallout.action",
                    "http://b8a.tel400.me/cti/previewcallout.action",
                    "http://xindelitz.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action",
                ];
            } else if (platformId == '8') {
                urls = [
                    "http://bbetasiadl.tel400.me/cti/previewcallout.action",
                    "http://bbetasiatw.tel400.me/cti/previewcallout.action",
                    "http://buyuhuang.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action",
                ];
            } else if (platformId == '5') {
                urls = [
                    "http://haomendl.tel400.me/cti/previewcallout.action",
                    "http://hm.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action",
                ];
            } else if (platformId == '3' || platformId == '9') {
                urls = [
                    "http://buyuhuang.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action",
                ];
            } else if (platformId == '4') {
                urls = [
                    "http://eudl.tel400.me/cti/previewcallout.action",
                    "http://eu.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action",
                ];
            }
            else if (platformId == '2') {
                urls = [
                    "http://xbettz.tel400.me/cti/previewcallout.action",
                    "http://xbetdx.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action"
                ];
            }
            else if (platformId == '10') {
                urls = [
                    "http://jiabo.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action"
                ];
            }
            else if (platformId == '29') {
                urls = [
                    "http://newpj.tel400.me/cti/previewcallout.action",
                    "http://xinpjdl.tel400.me/cti/previewcallout.action",
                    "http://jinbailinewcro.tel400.me/cti/previewcallout.action"
                ];
            }

            if (adminData.ctiUrl || adminData.ctiTsUrl) {
                let usedUrl = adminData.ctiUrl || adminData.ctiTsUrl;
                if (isTs) {
                    usedUrl = adminData.ctiTsUrl || adminData.ctiUrl;
                }
                urls = [`http://${usedUrl}/cti/previewcallout.action`];
            }

            performPhoneCall();

            function performPhoneCall(triedTimes) {
                triedTimes = triedTimes || 0;
                if (triedTimes >= urls.length) {
                    alert("呼叫失败。。。");
                    return;
                }
                let nextTriedTimes = triedTimes + 1;
                let url = urls[triedTimes];

                let now = new Date();
                let formattedNow = $filter('date')(now, "yyyyMMdd");
                let firstLevelMd5 = convertToMD5(adminData.callerId + "");
                let password = convertToMD5(firstLevelMd5 + formattedNow);
                //http://ipaddress:port/cti/previewcallout.action?User=***&Password=***&Callee=***&Taskid=***&isMessage=***&MessageUrl=***&DID=***;
                let did = adminData.did || adminData.tsDid;
                if (isTs) {
                    did = adminData.tsDid || adminData.did;
                }
                let urlWithParams = url + "?User=" + adminData.callerId + "&Password=" + password + "&Callee=" + did + $scope.phoneCall.phone + "&username=" + $scope.phoneCall.username + "&Taskid=&isMessage=0&MessageUrl=&DID=";


                socketService.$socket($scope.AppSocket, 'callTel400', {url: urlWithParams},
                    function(res){
                        console.log(res);
                        // 1：成功
                        // -1：失败，入参的参数不合法
                        // -2：失败，坐席工号不存在
                        // -3：失败，密码错误
                        // -4：失败，系统错误
                        // -5: 失败，URL错误
                        if (res && res.data && res.data.result == "1") {
                            alert("正在呼叫。。。");
                        }
                        else {
                            performPhoneCall(nextTriedTimes);
                        }
                    },
                    function(error){
                        console.error(error);
                        performPhoneCall(nextTriedTimes);
                    },
                    true
                );

                // let xhttp = new XMLHttpRequest();
                // xhttp.onreadystatechange = function() {
                //     if (this.readyState == 4 && this.status == 200) {
                //         // Typical action to be performed when the document is ready:
                //         console.log(xhttp.responseText);
                //     }
                // };
                // xhttp.open("GET", urlWithParams, true);
                // xhttp.setRequestHeader("Access-Control-Allow-Origin", "*")
                // xhttp.send();

                // $.ajax({
                //     url: urlWithParams,
                //     // contentType: "application/json; charset=utf-8",
                //     dataType: "text",
                //     type: "get",
                //     success: function (e) {
                //         console.log("ok", e);
                //         //{“result”:”1”}
                //         // 1：成功
                //         // -1：失败，入参的参数不合法
                //         // -2：失败，坐席工号不存在
                //         // -3：失败，密码错误
                //         // -4：失败，系统错误
                //         // -5: 失败，URL错误
                //         if (e.result && e.result == "1") {
                //             alert("正在呼叫。。。");
                //         }
                //         else if (e.result && e.result == "-1") {
                //             alert("失败，入参的参数不合法。");
                //             performPhoneCall(nextTriedTimes);
                //         }
                //         else if (e.result && e.result == "-2") {
                //             alert("失败，坐席工号不存在。");
                //             performPhoneCall(nextTriedTimes);
                //         }
                //         else if (e.result && e.result == "-3") {
                //             alert("失败，密码错误。");
                //             performPhoneCall(nextTriedTimes);
                //         }
                //         else if (e.result && e.result == "-4") {
                //             alert("失败，系统错误。");
                //             performPhoneCall(nextTriedTimes);
                //         }
                //         else if (e.result && e.result == "-5") {
                //             alert("失败，URL错误。");
                //             performPhoneCall(nextTriedTimes);
                //         }
                //         else {
                //             alert("失败，Uknown错误。" + e);
                //             performPhoneCall(nextTriedTimes);
                //         }
                //     },
                //     error: function (xhr,status,error) {
                //         console.log("error", error);
                //         console.log("error", xhr.responseText);
                //         console.log("error", xhr.responseJSON);
                //         if (error && error.result != "1") {
                //             alert("正在呼叫。。。");
                //             // alert("再次呼叫。。。");
                //             // performPhoneCall(nextTriedTimes);
                //         } else {
                //             alert("正在呼叫。。。");
                //         }
                //     },
                //     complete: function (xhr,status,e) {
                //         console.log("error", xhr);
                //     }
                // });
            }

            // urls.forEach(
            //     url => {
            //         let now = new Date();
            //         let formattedNow = $filter('date')(now, "yyyyMMdd");
            //         let firstLevelMd5 = convertToMD5(adminData.callerId + "");
            //         let password = convertToMD5(firstLevelMd5 + formattedNow);
            //         //http://ipaddress:port/cti/previewcallout.action?User=***&Password=***&Callee=***&Taskid=***&isMessage=***&MessageUrl=***&DID=***;
            //         let urlWithParams = url + "?User=" + adminData.callerId + "&Password=" + password + "&Callee=" + adminData.did + $scope.phoneCall.phone + "&username=" + $scope.phoneCall.username + "&Taskid=&isMessage=0&MessageUrl=&DID=";
            //
            //         $.ajax({
            //             url: urlWithParams,
            //             dataType: "jsonp",
            //             type: "get",
            //             success: function (e) {
            //                 console.log("ok", e);
            //                 //{“result”:”1”}
            //                 // 1：成功
            //                 // -1：失败，入参的参数不合法
            //                 // -2：失败，坐席工号不存在
            //                 // -3：失败，密码错误
            //                 // -4：失败，系统错误
            //                 // -5: 失败，URL错误
            //                 if (e.result && e.result == "1") {
            //                     alert("正在呼叫。。。");
            //                 }
            //                 else if (e.result && e.result == "-1") {
            //                     alert("失败，入参的参数不合法。");
            //                 }
            //                 else if (e.result && e.result == "-2") {
            //                     alert("失败，坐席工号不存在。");
            //                 }
            //                 else if (e.result && e.result == "-3") {
            //                     alert("失败，密码错误。");
            //                 }
            //                 else if (e.result && e.result == "-4") {
            //                     alert("失败，系统错误。");
            //                 }
            //                 else if (e.result && e.result == "-5") {
            //                     alert("失败，URL错误。");
            //                 }
            //                 else {
            //                     alert("失败，Uknown错误。" + e);
            //                 }
            //             },
            //             error: function (e) {
            //                 console.log("error", e);
            //                 if (e && e.status == 200) {
            //                     alert("正在呼叫。。。");
            //                 } else {
            //                     alert("呼叫超时请重试");
            //                 }
            //             }
            //         });
            //     }
            // );
        }

        function onFail(error) {
            if (callback) {
                callback.call(this, error);
            }
        }
    };
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
        console.log("$scope.safeApply");
        // console.trace("$scope.safeApply");
        if ($scope.$root && $scope.$root.$$phase == '$apply' || $scope.$root.$$phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            $scope.$digest(fn);
        }
    };

    $location.path();

    function initPage() {
        if (!$scope.AppSocket.connected) {
            $("#pageWrapper").hide();
            $("#pageConnectionLoader").html('<i class="fa fa-spin fa-spinner fa-pulse fa-3x fa-fw margin-bottom"></i>');
        } else {
            $("#pageWrapper").show();
            $("#pageConnectionLoader").empty();
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
                $scope.$evalAsync(() => {
                    $scope.serverStatus.server = $scope.AppSocket.connected;
                    $scope.serverStatus.cpServer = data.cpms;
                    $scope.serverStatus.pServer = data.pms;
                })
            }
        });

        $scope.getUsableChannelList();
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
    // $scope.fetchAdminMailDebounced = $scope.debounce(fetchAdminMail, 10 * 1000, true);
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
    };

    $scope.dateReformat = function (data) {
        return $scope.timeReformat(data).slice(0, 10);
    };

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
        connectSocket();
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

    /* Calculate total sum of value in array, key1 and key2 are object keys (put "" if no key is required) */
    $scope.calculateTotalSum = function (dataArray, key1, key2) {
        let total = 0;
        if (dataArray) {
            if (key1 && key1.length > 0) {
                if (key2 && key2.length > 0) {
                    total = dataArray.length !== 0 ? dataArray.reduce((a, item) => a + (Number.isFinite(item[key1][key2]) ? item[key1][key2] : 0), 0) : 0;
                }
                else {
                    total = dataArray.length !== 0 ? dataArray.reduce((a, item) => a + (Number.isFinite(item[key1]) ? item[key1] : 0), 0) : 0;
                }
            }
            else {
                total = dataArray.length !== 0 ? dataArray.reduce((a, item) => a + (Number.isFinite(item) ? item : 0), 0) : 0;
            }
        }

        return $roundToTwoDecimalPlacesString(total);
    };

    $scope.PROPOSAL_SEARCH_MAX_TIME_FRAME = 604800000 // 7 days ( 7 * (1000*3600*24))

    $scope.$fixTwoDecimalStr = (value) => {
        if (typeof value != 'number') {
            return value;
        }
        return $filter('noRoundTwoDecimalPlaces')(value).toFixed(2);
    };

    $scope.fixModalScrollIssue = () => {
        $('.modal').off('hidden.bs.modal');
        $('.modal').on('hidden.bs.modal', function (e) {
            if ($('.modal').filter(':visible').length) {
                $('body').addClass('modal-open');
            }
        });
    };

    function updateFinancialNotificationShowed() {
        let sendData = {
            query: {_id: authService.adminId},
            updateData: {$addToSet: {financialPointsNotificationShowed: $scope.selectedPlatform.data.platformId}}
        }
        socketService.$socket($scope.AppSocket, 'updateAdmin', sendData, function success(data) {});
    }

    var callBackTimeOut;
    var profileDetailTimeOut;


    $scope.loadAllProfitDetail = function () {
        $("#modalAllProfitData").modal('show');
    };


    async function sendAllProfitData() {
        $scope.allProfitDetailList = [];
        for (let i = 0; i < $scope.platformList.length; i++) {
            $scope.allProfitDetailList.push(await loadProfitDetail($scope.platformList[i].id, $scope.platformList[i].text));
        }
        $scope.$evalAsync() ;
        sendProfitData();
    }

    async function sendProfitData(){
        for (let i = 0; i < $scope.allProfitDetailList.length; i++) {
            await new Promise((resolve) => {
                $scope.$evalAsync(() => {
                    setTimeout(() => {
                        $scope.platformTexts = $scope.allProfitDetailList[i].platformTexts;
                        $scope.netProfitDetailIncome = $scope.allProfitDetailList[i].netProfitDetailIncome;
                        $scope.profitDetailConsumptionAmount = $scope.allProfitDetailList[i].profitDetailConsumptionAmount;
                        $scope.profitDetailNewPlayer = $scope.allProfitDetailList[i].profitDetailNewPlayer;
                        $scope.profitDetailTopUpAmount = $scope.allProfitDetailList[i].profitDetailTopUpAmount;
                        $scope.profitDetailConsumptionPlayer = $scope.allProfitDetailList[i].profitDetailConsumptionPlayer;
                        $scope.profitDetailBonusAmount = $scope.allProfitDetailList[i].profitDetailBonusAmount;
                        $scope.profitDetailIncome = $scope.allProfitDetailList[i].profitDetailIncome;
                        $scope.financialPoints = $scope.allProfitDetailList[i].financialPoints;
                        resolve('success');
                    }, 30000);
                })
            });
        }
        sendProfitData();
    }

    $scope.filterProfitDetail = function(data) {
        return data.financialPoints !== 0 || data.netProfitDetailIncome !== "0" ||
               data.profitDetailConsumptionAmount !== "0" || data.profitDetailNewPlayer !== 0 ||
               data.profitDetailTopUpAmount !== "0" || data.profitDetailConsumptionPlayer !== 0 ||
               data.profitDetailBonusAmount !== "0" || data.profitDetailIncome !== "0";
    };


     function loadProfitDetail(id, text) {

        clearTimeout(callBackTimeOut);
        clearTimeout(profileDetailTimeOut);

        // let queryDone = [false, false, false, false, false];
        let sendData = {
            platformId: id,
            startDate: utilService.getTodayStartTime(),
            endDate: utilService.getTodayEndTime(),
        };
        let allProfitDetail = {};

        sendData.topUpType = ['PlayerTopUp', 'ManualPlayerTopUp', 'PlayerAlipayTopUp', 'PlayerWechatTopUp'];
        sendData.playerBonusType = 'PlayerBonus';
        sendData.partnerBonusType = 'PartnerBonus';

         return $scope.$socketPromise('getProfitDisplayDetailByPlatform', sendData).then(function (data) {

                allProfitDetail.platformTexts = text;
                allProfitDetail.profitDetailIncome = 0;
                allProfitDetail.profitDetailBonusAmount = 0;
                allProfitDetail.profitDetailTopUpAmount = 0;

                let playerBonusAmount = data.data[0][0] !== undefined ? data.data[0][0].amount : 0;
                let topUpAmount = data.data[1][0] !== undefined ? data.data[1][0].amount : 0;
                let partnerBonusAmount = data.data[2][0] !== undefined ? data.data[2][0].amount : 0;

                allProfitDetail.profitDetailIncome = noDecimalPlacesString(topUpAmount - playerBonusAmount - partnerBonusAmount);
                allProfitDetail.profitDetailBonusAmount = noDecimalPlacesString(playerBonusAmount + partnerBonusAmount);
                allProfitDetail.profitDetailTopUpAmount = noDecimalPlacesString(topUpAmount);

                let sendData3 = {
                    platformId: id,
                    startDate: utilService.getThisMonthStartTime(),
                    endDate: utilService.getThisMonthEndTime(),
                    topUpType: ['PlayerTopUp', 'ManualPlayerTopUp', 'PlayerAlipayTopUp', 'PlayerWechatTopUp'],
                    playerBonusType: 'PlayerBonus',
                    partnerBonusType: 'PartnerBonus',
                };

                return $scope.$socketPromise('getProfitDisplayDetailByPlatform', sendData3)

                // queryDone[0] = true;

         }).then(function (totalAmount) {
                 allProfitDetail.netProfitDetailIncome = 0;

                 let totalPlayerBonusAmount = totalAmount.data[0][0] !== undefined ? totalAmount.data[0][0].amount : 0;
                 let totalTopUpAmount = totalAmount.data[1][0] !== undefined ? totalAmount.data[1][0].amount : 0;
                 let totalPartnerBonusAmount = totalAmount.data[2][0] !== undefined ? totalAmount.data[2][0].amount : 0;

                 allProfitDetail.netProfitDetailIncome = noDecimalPlacesString(totalTopUpAmount - totalPlayerBonusAmount - totalPartnerBonusAmount);

                 // queryDone[3] = true;

             return $scope.$socketPromise('getPlayerConsumptionDetailByPlatform', sendData)
              
         }).then(function success(data) {
                 let consumptionAmount = data.data[0] != undefined ? data.data[0].totalAmount : 0;

                 allProfitDetail.profitDetailConsumptionAmount = noDecimalPlacesString(consumptionAmount);
                 allProfitDetail.profitDetailConsumptionPlayer = data.data[0] != undefined ? data.data[0].userIds.length.toLocaleString() : 0;

                 // queryDone[1] = true;

             let sendData2 = {
                 platform: id,
                 startDate: utilService.getTodayStartTime(),
                 endDate: utilService.getTodayEndTime(),
             };

             return $scope.$socketPromise('countNewPlayers', sendData2)

         }).then(function success(data) {
                 allProfitDetail.profitDetailNewPlayer = data.data[0] != undefined ? data.data[0].number.toLocaleString() : 0;

                 // queryDone[2] = true;

             return $scope.$socketPromise('getOnePlatformSetting', {_id: id})

         }).then(function success(data) {
                 allProfitDetail.financialPoints = data.data.financialPoints || 0;

                 if (data.data.hasOwnProperty("financialPoints") && data.data.financialSettlement && !data.data.financialSettlement.financialSettlementToggle && data.data.financialSettlement.hasOwnProperty("minFinancialPointsNotification")
                     && data.data.financialSettlement.financialPointsNotification && data.data.financialPoints < data.data.financialSettlement.minFinancialPointsNotification) {
                     socketService.$socket($scope.AppSocket, 'getAdminInfo', {
                         _id: authService.adminId
                     },  data => {
                         if (data.data && data.data.financialPointsNotificationShowed && data.data.financialPointsNotificationShowed.indexOf($scope.selectedPlatform.data.platformId) < 0) {
                             // $("#modalFinancialPointsNotification").modal('show');
                             updateFinancialNotificationShowed();
                         }
                     });
                 }
                 // queryDone[4] = true;
             return allProfitDetail;
         });


        //  callback();
        //
        // function callback() {
        //
        //     if (queryDone[0] && queryDone[1] && queryDone[2] && queryDone[3] && queryDone[4]){
        //         profileDetailTimeOut = setTimeout(loadProfitDetail, 60000);
        //         return profileDetailTimeOut; // update every minute
        //     }
        //     else{
        //         callBackTimeOut = setTimeout(callback, 30000);
        //         return callBackTimeOut;
        //     }
        // }
    }

    function loadPlatformInfo() {
        // Clear some variable before load
        $scope.merchantNoNameObj = {};
        $scope.merchantGroupObj = [];
        $scope.merGroupName = {};

        // Load merchantTypes, merchantGroupObj
        socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {platform: $scope.selectedPlatform.id}, function (data) {
            $scope.$evalAsync(() => {
                let merGroupList = {};

                data.data.merchantTypes.forEach(mer => {
                    $scope.merGroupName[mer.merchantTypeId] = mer.name;
                });

                $scope.merchantTypes = data.data.merchantTypes;
                $scope.merchantGroupObj = utilService.createMerGroupList($scope.merGroupName, merGroupList);
            })
        });

        // Load merchantLists, merchantNoList, merchantCloneList, merchantGroupObj
        socketService.$socket($scope.AppSocket, 'getMerchantNBankCard', {platformId: $scope.curPlatformId}, function (data) {
            $scope.$evalAsync(() => {
                if (data.data && data.data.merchants) {
                    let merGroupList = {};

                    $scope.merchantLists = data.data.merchants;
                    $scope.merchantNoList = data.data.merchants.filter(mer => {
                        $scope.merchantNoNameObj[mer.merchantNo] = mer.name;
                        return mer.status !== 'DISABLED';
                    });

                    $scope.merchantNoList.forEach(item => {
                        merGroupList[item.merchantTypeId] = merGroupList[item.merchantTypeId] || {list: []};
                        merGroupList[item.merchantTypeId].list.push(item.merchantNo);
                    });

                    Object.keys($scope.merchantNoList).forEach(item => {
                        let merchantTypeId = $scope.merchantNoList[item].merchantTypeId;
                        if (String(merchantTypeId) === "9999") {
                            $scope.merchantNoList[item].merchantTypeName = $trans('BankCardNo');
                        } else if (String(merchantTypeId) === "9998") {
                            $scope.merchantNoList[item].merchantTypeName = $trans('PERSONAL_WECHAT_GROUP');
                        } else if (String(merchantTypeId) === "9997") {
                            $scope.merchantNoList[item].merchantTypeName = $trans('PERSONAL_ALIPAY_GROUP');
                        } else if (String(merchantTypeId) !== "9997" && String(merchantTypeId) !== "9998" && String(merchantTypeId) !== "9999") {
                            let merchantInfo = $scope.merchantTypes && $scope.merchantTypes.filter(mitem => String(mitem.merchantTypeId) === String(merchantTypeId)) || [];
                            $scope.merchantNoList[item].merchantTypeName = merchantInfo[0] ? merchantInfo[0].name : "";
                        } else {
                            $scope.merchantNoList[item].merchantTypeName = '';
                        }
                    });
                    $scope.merchantCloneList = angular.copy($scope.merchantNoList);
                    $scope.merchantGroupObj = utilService.createMerGroupList($scope.merGroupName, merGroupList);
                    $scope.merchantGroupCloneList = $scope.merchantGroupObj;
                }
            });
        });
    }

});
