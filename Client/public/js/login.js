'use strict';

define(['js/services/authService', 'js/login', 'js/wsconfig'], function () {
    let myLoginApp = angular.module('myApp');
    myLoginApp.requires.push('pascalprecht.translate', 'ngCookies', 'LocalStorageModule', 'authService');
    myLoginApp.config(function ($translateProvider) {
        $translateProvider.useStaticFilesLoader({
            prefix: 'languages/',
            suffix: '.json'
        });

        $translateProvider.useSanitizeValueStrategy('escape');
        $translateProvider.preferredLanguage('en_US');
    });

    myLoginApp.controller('loginCtrl', function ($scope, $rootScope, $http, $window, $location, $cookies, localStorageService, $log, authService, CONFIG) {
        //if there is token(user login), go to dashboard page for authentication
        if (authService.isValid($cookies, localStorageService)) {
            // The client may think his cookie is valid, even though the server does not!  (E.g. if server caches were cleared, or cookie expiry time was reduced on the server.)
            // In such cases, attempting to auto-login here by visiting `/mainPage` would just send us back here, creating an infinite loop!
            // To avoid that, when the server rejects the client's authentication we send the client to `/#?loginRequired=yes` to disable auto-login.
            var noAuto = $location.$$search.loginRequired || $location.$$search.resetPasswordToken;

            if (!noAuto) {
                // Attempt to auto log in by visiting the main page.
                $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + "/dashboard";
                return;
            }
        }

        if ($location.$$search.resetPasswordToken) {
            // The user has clicked the link in an email that allows a password reset
            performPasswordReset($location.$$search.resetPasswordToken);
        }

        var showError = function (errorMessage) {
            $log.debug(errorMessage);
            $scope.showError = true;
            $scope.errorMessage = errorMessage;
            $scope.$apply();
        };

        //todo::temp fix, should show view after angular translate are fully configured
        setTimeout(function () {
            $("#loginContainer").show();
        }, 200);

        let fastestServer = '', lowestLatency = 9999;

        // FPMS Server List
        WSCONFIG.Default = CONFIG[CONFIG.NODE_ENV];
        $scope.mgntServerList = WSCONFIG;

        for (let server in WSCONFIG) {
            if (server === 'Default') {
                pingHTTPServer(CONFIG[CONFIG.NODE_ENV].MANAGEMENT_SERVER_URL, server);
            } else {
                pingHTTPServer(WSCONFIG[server].socketURL, server);
            }
        }

        /* login user button handler */
        $scope.login = function () {
            let formData = {};
            let userName = $('#username').val();
            let password = $('#password').val();
            let selectedServer = $('#mgntServer').val();

            formData['username'] = userName;
            formData['password'] = password;

            $scope.showError = false;

            selectedServer = selectedServer === '' ? fastestServer : selectedServer;
            $cookies.put('curFPMSServer', selectedServer);
            let url = 'http://' + WSCONFIG[selectedServer].socketURL;

            if (selectedServer === 'Default') {
                url = CONFIG[CONFIG.NODE_ENV].MANAGEMENT_SERVER_URL;
            }

            function gotoPage(page) {
                if (page) {
                    page = '/' + page.toLowerCase();
                    $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + page;
                } else {
                    $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + "/dashboard";
                }
            }

            $.ajax(
                {
                    type: 'post',
                    data: formData,
                    url: url + '/login',
                    timeout: 5000
                }
            )
                .done(function (data) {
                    if (data.token && data.adminName) {
                        var exp = new Date();
                        //set token expiration time to be 5 hours from now(the same time on server)
                        exp.setSeconds(exp.getSeconds() + 60 * 60 * 12);

                        authService.storeAuth($cookies, localStorageService, data.token, data._id, data.adminName, data.departments, data.roles, data.language, exp);
                        setTimeout(
                            function () {
                                //Go to dashboard page after user login successfully
                                var page = null;
                                if (data && data.roles && data.roles[0] && data.roles[0].views) {
                                    page = Object.keys(data.roles[0].views)[0];
                                }
                                gotoPage(page);
                                // $window.location.href = $location.protocol() + "://" + $location.host() + ":" + $location.port() + "/dashboard";
                            }, 500
                        );
                    }
                    else {
                        //if there is error, show the error message
                        showError(data.error.message);
                    }
                })
                .fail(function (error) {
                    if (error.responseText) {
                        showError(error.responseText);
                    }
                    else {
                        showError('Service is not available, please try again later.');
                    }
                });
        };

        $scope.requestPasswordReset = function () {
            var formData = {
                email: $('form[name=reset-password-form] input[name=email]').val()
            };

            $scope.showError = false;

            var url = CONFIG[CONFIG.NODE_ENV].MANAGEMENT_SERVER_URL;
            $.ajax(
                {
                    type: 'post',
                    data: formData,
                    url: url + '/requestPasswordReset'
                }
            )
                .done(function (data) {
                    if (data.success) {
                        // Not actually an error, but we want to display a message, and this suits our needs!
                        showError(data.message);
                    } else {
                        var errorMessage = data.error && data.error.message || "Unknown error";
                        showError(errorMessage);
                    }
                })
                .fail(function (error) {
                    if (error.responseText) {
                        showError(error.responseText);
                    }
                    else {
                        showError('Service is not available, please try again later.');
                    }
                });
        };

        $scope.toggleShowResetPasswordForm = function () {
            $scope.showResetPasswordForm = !$scope.showResetPasswordForm;
            $scope.showError = false;
        };

        function performPasswordReset(resetPasswordToken) {
            var url = CONFIG[CONFIG.NODE_ENV].MANAGEMENT_SERVER_URL;
            $.ajax({
                type: 'post',
                url: url + '/resetPassword',
                data: {resetPasswordToken: resetPasswordToken}
            })
                .done(function (data) {
                    if (data.success) {
                        $('#username').val(data.username);
                        $('#password').val(data.password);
                        $scope.login();
                    } else {
                        var errorMessage = data.error && data.error.message || "Unknown error";
                        showError(errorMessage);
                    }
                })
                .fail(function (error) {
                    if (error.responseText) {
                        showError(error.responseText);
                    }
                    else {
                        showError('Service is not available, please try again later.');
                    }
                });
        }

        // internal function to ping server
        function pingHTTPServer(serverURL, server) {
            let sendTime, receiveTime, latency;

            if (!serverURL.startsWith("http")) {
                serverURL = "http://" + serverURL;
            }

            $.ajax({
                type: "HEAD",
                url: serverURL,
                timeout: 3000,
                beforeSend: () => {
                    sendTime = (new Date()).getTime();
                },
                success: function () {
                    receiveTime = (new Date()).getTime();
                    latency = receiveTime - sendTime;
                    WSCONFIG[server].latency = latency;

                    if (latency < lowestLatency) {
                        lowestLatency = latency;
                        fastestServer = server;
                    }

                    WSCONFIG[server].isAvailable = true;
                    $scope.$apply();
                },
                error: function (data) {
                    WSCONFIG[server].isAvailable = false;
                }
            });
        }
    });
});