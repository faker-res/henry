'use strict';

define(['js/config', 'js/commonAPIs', 'js/services/authService', 'js/services/socketService', 'js/services/utilService', 'js/services/commonService'], function () {
    let myApp = angular.module('myApp');

    myApp.requires.push(
        'authService',
        'socketService',
        'utilService',
        'commonService',
        'myApp.controllers',
        'myApp.filters',
        'myApp.services',
        'myApp.directives',
        'ngCookies',
        'pascalprecht.translate',
        'flowChart',
        'LocalStorageModule',
        'datePicker',
        'ui.router',
        'angularResizable',
        'colorpicker.module'
    );

    myApp.config(['$controllerProvider',
        '$compileProvider',
        '$filterProvider',
        '$provide',
        '$httpProvider',
        '$locationProvider',
        '$logProvider',
        '$translateProvider',
        '$stateProvider',
        '$urlRouterProvider',
        function ($controllerProvider,
                  $compileProvider,
                  $filterProvider,
                  $provide,
                  $httpProvider,
                  $locationProvider,
                  $logProvider,
                  $translateProvider,
                  $stateProvider,
                  $urlRouterProvider) {

            //Change default views and controllers directory using the following:
            //routeResolverProvider.routeConfig.setBaseDirectories('/app/views', '/app/controllers');
            //TODO::add env config here
            //set debug mode for nodejs logger
            $logProvider.debugEnabled(true);

            //for localization
            $translateProvider.useStaticFilesLoader({
                prefix: 'languages/',
                suffix: '.json'
            });
            $translateProvider.useSanitizeValueStrategy('escape');
            // $translateProvider.preferredLanguage('ch_SP');
            $translateProvider.useLoaderCache(true);

            myApp.register =
                {
                    controller: $controllerProvider.register,
                    directive: $compileProvider.directive,
                    filter: $filterProvider.register,
                    factory: $provide.factory,
                    service: $provide.service
                };

            $locationProvider.html5Mode(true);

            $stateProvider
                .state('dashboard', {
                    url: '/dashboard',
                    templateUrl: 'category/dashboard/main',
                    controller: 'dashboardCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/dashboardController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('mainPage', {
                    url: '/mainPage',
                    templateUrl: 'category/mainPage/main',
                    controller: 'mainPageCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/mainPageController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('platform', {
                    url: '/platform',
                    templateUrl: 'category/platform/platform-home',
                    controller: 'platformCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/platformController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('playerDetail', {
                    url: '/playerDetail/{playerObjId}',
                    templateUrl: 'category/playerDetail/player-detail',
                    controller: 'playerDetailCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope, $stateParams) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/playerDetailController.js"
                            ];

                            $rootScope.targetPlayerObjId = $stateParams.playerObjId;

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('player', {
                    url: '/player',
                    templateUrl: 'category/player/platform-player',
                    controller: 'playerCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/playerController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('partner', {
                    url: '/partner',
                    templateUrl: 'category/partner/partner-home',
                    controller: 'partnerCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/partnerController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('payment', {
                    url: '/payment',
                    templateUrl: 'category/payment/payment-home',
                    controller: 'paymentCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/paymentController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('provider', {
                    url: '/provider',
                    templateUrl: 'category/provider/provider-home',
                    controller: 'providerCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/providerController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('operation', {
                    url: '/operation',
                    templateUrl: 'category/operation/operation-home',
                    controller: 'operationCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/operationController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('analysis', {
                    url: '/analysis',
                    templateUrl: 'category/analysis/analysis-home',
                    controller: 'analysisCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/analysisController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('report', {
                    url: '/report',
                    templateUrl: 'category/report/report-home',
                    controller: 'reportCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/reportController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor', {
                    url: '/monitor',
                    templateUrl: 'category/monitor/monitor-home',
                    controller: 'monitorCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.paymentTotal', {
                    url: '/paymentTotal',
                    templateUrl: 'category/monitor/monitor-payment-total',
                    controller: 'monitorPaymentCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorPaymentController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.wechatGroup', {
                    url: '/wechatGroup',
                    templateUrl: 'category/monitor/monitor-wechat-group',
                    controller: 'monitorWechatCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorWechatController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.qqGroup', {
                    url: '/qqGroup',
                    templateUrl: 'category/monitor/monitor-qq-group',
                    controller: 'monitorQQCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorQQController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.consumptionRecord', {
                    url: '/consumptionRecord',
                    templateUrl: 'category/monitor/monitor-consumption-record',
                    controller: 'monitorPaymentCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorPaymentController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.attemptCreate', {
                    url: '/attemptCreate',
                    templateUrl: 'category/monitor/monitor-attempt-create',
                    controller: 'monitorPaymentCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorPaymentController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.payment', {
                    url: '/payment',
                    templateUrl: 'category/monitor/monitor-payment',
                    controller: 'monitorPaymentCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorPaymentController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.proposalAndPayment', {
                    url: '/proposal_and_payment',
                    templateUrl: 'category/monitor/monitor-proposal-payment',
                    controller: 'monitorProposalAndPaymentCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorProposalAndPaymentController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('monitor.winnerMonitor', {
                    url: '/winner',
                    templateUrl: 'category/monitor/monitor-winner',
                    controller: 'monitorWinnerCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/monitorWinnerController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('qualityInspection', {
                    url: '/qualityInspection',
                    templateUrl: 'category/qualityInspection/inspection-home',
                    controller: 'qualityInspectionCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/qualityInspectionController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('teleMarketing', {
                    url: '/teleMarketing',
                    templateUrl: 'category/teleMarketing/teleMarketing-home',
                    controller: 'teleMarketingCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/teleMarketingController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('teleMarketingPhoneDetail', {
                    url: '/teleMarketing/tsPhone/{tsDistributedPhoneObjId}',
                    templateUrl: 'category/teleMarketing/teleMarketing-phone-detail', // todo :: change this to new file that be create later
                    controller: 'teleMarketingCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope, $stateParams) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/teleMarketingController.js"
                            ];

                            $rootScope.tsDistributedPhoneObjId = $stateParams.tsDistributedPhoneObjId;

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                })
                .state('themeControl', {
                    url: '/themeControl',
                    templateUrl: 'category/themeControl/themeControl-home',
                    controller: 'themeControlCtrl',
                    controllerAs: 'vm',
                    resolve: {
                        load: function ($q, $rootScope) {
                            var deferred = $q.defer();

                            var dependencies = [
                                "/js/controllers/themeControlController.js"
                            ];

                            require(dependencies, function () {
                                $rootScope.$apply(function () {
                                    deferred.resolve();
                                });
                            });

                            return deferred.promise;
                        }
                    }
                });
            // .state('testPage', {
            //     url: '/testPage',
            //     templateUrl: 'category/provider/test-home',
            //     controller: 'testRewardCtrl',
            //     controllerAs: 'vm',
            //     resolve: {
            //         load: function ($q, $rootScope) {
            //             var deferred = $q.defer();
            //
            //             var dependencies = [
            //                 "/js/controllers/testRewardController.js"
            //             ];
            //
            //             require(dependencies, function () {
            //                 $rootScope.$apply(function () {
            //                     deferred.resolve();
            //                 });
            //             });
            //
            //             return deferred.promise;
            //         }
            //     }
            // });

            $urlRouterProvider.otherwise('/player');
        }]);

    return myApp;
});