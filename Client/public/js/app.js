'use strict';

define(['js/config','js/commonAPIs', 'js/services/routeResolver', 'js/services/authService', 'js/services/socketService', 'js/services/utilService'], function () {
    var myApp = angular.module('myApp');

    myApp.requires.push(
        'ngRoute',
        'routeResolverServices',
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
        'ngFileUpload',
        'LocalStorageModule',
        'datePicker'
    );

    myApp.config(['$routeProvider', 'routeResolverProvider', '$controllerProvider',
        '$compileProvider', '$filterProvider', '$provide', '$httpProvider', '$locationProvider',
        '$logProvider', '$translateProvider',

        function ($routeProvider, routeResolverProvider, $controllerProvider,
                  $compileProvider, $filterProvider, $provide, $httpProvider, $locationProvider, $logProvider, $translateProvider) {

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

            //Define routes - controllers will be loaded dynamically
            var route = routeResolverProvider.route;

            $routeProvider.
                // when('/dashboard', {
                //     templateUrl: 'category/dashboard/dashboard',
                //     //controller: 'dashboardCtrl'
                // }).
                when('/dashboard',route.resolve('category/dashboard/main', 'dashboardCtrl', 'dashboardController', 'vm')).
                when('/mainPage', route.resolve('category/mainPage/main', 'mainPageCtrl', 'mainPageController', 'vm')).
                // when('/proposal', route.resolve('category/proposal/proposal-home', 'proposalCtrl', 'proposalController', 'vm')).
                when('/platform', route.resolve('category/platform/platform-home', 'platformCtrl', 'platformController', 'vm')).
                when('/payment', route.resolve('category/payment/payment-home', 'paymentCtrl', 'paymentController', 'vm')).
                when('/provider', route.resolve('category/provider/provider-home', 'providerCtrl', 'providerController', 'vm')).
                when('/operation', route.resolve('category/operation/operation-home', 'operationCtrl', 'operationController', 'vm')).
                // when('/reward', route.resolve('category/reward/reward-home', 'rewardCtrl', 'rewardController', 'vm')).
                when('/analysis', route.resolve('category/analysis/analysis-home', 'analysisCtrl', 'analysisController', 'vm')).
                when('/report', route.resolve('category/report/report-home', 'reportCtrl', 'reportController', 'vm')).
                when('/testPage',route.resolve('category/testPage/test-home', 'testRewardCtrl','testRewardController','vm')).
                otherwise({
                    redirectTo: '/dashboard'
                });
            $locationProvider.html5Mode(true);
        }]);

    return myApp;
});