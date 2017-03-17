'use strict';

/* Controllers */

angular.module('myApp.controllers', []).controller('AppCtrl', function ($scope, $route, $window, $http, $location, $cookies, localStorageService, AppService, authService, socketService, utilService, CONFIG, $translate, $filter) {
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

    function forceRelogin() {
        socketService.showErrorMessage("Your session has expired.  Redirecting you to login page...");

        setTimeout(function () {
            $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + "/#?loginRequired=yes"
        }, 2000);
    }

    $scope.connectSocket = function () {
        if (!authService.isValid($cookies, localStorageService)) {
            forceRelogin();
            return;
        }

        $scope.langKey = authService.language;
        $translate.use($scope.langKey);

        var token = authService.token;

        // create socket connection
        var url = CONFIG[CONFIG.NODE_ENV].MANAGEMENT_SERVER_URL;
        $scope.AppSocket = io.connect(url, {
            query: 'token=' + token,
            //todo::add secure flag for https
            //secure: true
            //set connection timeout to 50 seconds
            timeout: 50000,
            reconnectionDelay: 2000,
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
            console.log('Management server connected');
            authService.getAllActions($scope.AppSocket, function () {
                //todo::temp fix, should show view after angular translate are fully configured
                setTimeout(function () {
                    console.log("#wrapper show!");
                    $("#wrapper").show();
                }, 100);
            });

            //console.log("route reload!");
            //$route.reload();

            $scope.checkForExpiredPassword();
        }).on('disconnect', function () {
            console.log('Management server disconnected');
        }).on('connect_failed', function (err) {
            console.log('connection failed', err);
        }).on('connect_error', function (err) {
            console.log('connection err', err);
            // $scope.AppSocket.disconnect();
            socketService.showErrorMessage("Cannot connect to server!");
        });

        $scope.AppSocket.on('error', function (data) {
            // The server sends this message if cookie authentication fails
            if (data.message === 'jwt expired' || data.code === 'invalid_token' || data.type === 'UnauthorizedError') {
                forceRelogin();
            }
        });

        $scope.AppSocket.on('PermissionUpdate', function () {
            console.log("PermissionUpdate event");
            authService.updateRoleDataFromServer($scope, $cookies, $route);
        });
    };
    $scope.connectSocket();

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
    $scope.companyLogo = $scope.logolist[0];
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
    $scope.merchantTopupTypeJson = {
        '1': 'NetPay',
        '2': 'WechatQR',
        '3': 'AlipayQR',
        '4': 'WechatApp',
        '5': 'AlipayApp'
    };
    $scope.merchantTargetDeviceJson = {
        '1': "clientType_Web",
        '2': "clientType_Application",
        '3': 'clientType_Both'
    };
    $scope.constProposalEntryType = {
        0: "ENTRY_TYPE_CLIENT",
        1: "ENTRY_TYPE_ADMIN",
        2: "ENTRY_TYPE_SYSTEM",
    }
    $scope.constProposalUserType = {
        0: "PLAYERS",
        1: "PARTNERS",
        2: "SYSTEM_USERS",
        3: "TEST_PLAYERS"
    };
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
            $scope.channelList = data.data.channels;
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
        $scope.getNewPhoneCaptha();

    }
    $scope.makePhoneCall = function () {
        socketService.$socket($scope.AppSocket, 'getAdminInfo', {
            adminName: $scope.getUserName()
        }, onSuccess, onFail, true);
        function onSuccess(data) {
            console.log('admin data', data);
            var adminData = data.data;
            
            var sendStr = "http://www.phoneapichat.com/servlet/CallOut"
                + "?calleeid=" + $scope.phoneCall.phone
                + "&did=" + adminData.did
                + "&callerid=" + adminData.callerId;

            $.ajax({
                url: sendStr, //"http://www.phoneapichat.com/servlet/TelephoneApplication",
                dataType: "jsonp",
                type: "get",
                // data: {
                //     calleeid: $scope.phoneCall.phone,
                //     did: adminData.did,
                //     callerid: adminData.callerId,
                // },
                success: function (e) {
                    console.log("ok", e);
                    alert("正在呼叫。。。");
                },
                error: function (e) {
                    console.log("error", e);
                    if( e && e.status == 200 ){
                        alert("正在呼叫。。。");
                    }else{
                        alert("呼叫超时请重试");
                    }
                }
            });
        }

        function onFail(error) {
            if (callback) {
                callback.call(this, error);
            }
        }
    }
    // phone call related....


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
            $scope.$apply(fn);
        }
    };

    $location.path();
    $scope.$on('$viewContentLoaded', function () {
        setTimeout(
            function () {
                if (!$scope.AppSocket.connected) {
                    $("#pageWrapper").html('<i class="fa fa-spin fa-spinner fa-pulse fa-3x fa-fw margin-bottom"></i>');
                }

                var location = $location.path().slice(1);
                $('#cssmenu .navbar-brand  a[name*="' + location + '"]').parent().addClass('active');
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
                setInterval(() => {
                    $scope.AppSocket.emit('getAPIServerStatus', {});
                }, 6000);
                $scope.AppSocket.on('_getAPIServerStatus', function (data) {
                    if (($scope.serverStatus.server != $scope.AppSocket.connected) || ($scope.serverStatus.cpServer != data.cpms) || ($scope.serverStatus.pServer != data.pms)) {
                        $scope.serverStatus.server = $scope.AppSocket.connected;
                        $scope.serverStatus.cpServer = data.cpms;
                        $scope.serverStatus.pServer = data.pms;
                        $scope.$apply();
                    }
                })
                $scope.getChannelList();
                $scope.phoneCall = {};
                utilService.initTranslate($filter('translate'));
                socketService.initTranslate($filter('translate'));
            }, 10
        );
    });

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
        var pop = $(a.target).closest('.popover');
        $(".popover.in").not(pop).popover('hide');
    })

});
