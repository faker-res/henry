'use strict';

define(['js/config', 'js/commonAPIs', 'js/services/authService', 'js/services/socketService', 'js/services/utilService'], function () {
    var myApp = angular.module('myApp');

    myApp.requires.push(
        'authService',
        'socketService',
        'utilService',
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
            //$translateProvider.preferredLanguage('en_US');

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

            $urlRouterProvider.otherwise('/platform');
        }]);

    return myApp;
});