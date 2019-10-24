'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$sce', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'CONFIG', 'utilService', '$timeout', 'commonService'];

    var analysisController = function ($sce, $scope, $filter, $location, $log, authService, socketService, CONFIG, utilService, $timeout, commonService) {
        var $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let $roundToTwoDecimalPlacesString = $filter('roundToTwoDecimalPlacesString');
        var vm = this;

        // For debugging:
        // window.VM = vm;

        vm.inputDevice = {
            BACKSTAGE: 0,
            WEB_PLAYER: 1,
            WEB_AGENT: 2,
            H5_PLAYER: 3,
            H5_AGENT: 4,
            APP_PLAYER: 5,
            APP_AGENT: 6,
            APP_NATIVE_PLAYER: 7,
            APP_NATIVE_PARTNER: 8
        };

        vm.allNewPlayerType = {
            1: "allNewRegistrationCount",
            2: "rechargedPlayer",
            3: "multipleTopUpPlayer",
            4: "Valid Player"
        };

        vm.clientSourcePara = {
            accessType: ["register", "login"]
        };

        vm.constPlayerTopUpTypes = {
            MANUAL: "MANUAL",
            ONLINE: "ONLINE",
            ALIPAY: "ALIPAY",
            WECHAT: "WECHAT",
            QUICKPAY: "QUICKPAY"
        };

        vm.proposalStatusList = { // removed APPROVED and REJECTED
            PREPENDING: "PrePending",
            PENDING: "Pending",
            PROCESSING: "Processing",
            SUCCESS: "Success",
            FAIL: "Fail",
            CANCEL: "Cancel",
            EXPIRED: "Expired",
            UNDETERMINED: "Undetermined",
            CSPENDING: "CsPending",
            NOVERIFY: "NoVerify"
        };

        vm.constDepositMethod = {
            Online: 1 ,
            ATM: 2,
            Counter: 3,
            AliPayTransfer: 4,
            WechatTransfer: 5,
            CloudFlashPay: 6,
            CloudFlashPayTransfer: 7
        };

        vm.constDemoPlayerStatus = {
            OLD_PLAYER: "1",
            PRE_CONVERT: "2",
            POST_CONVERT: "3",
            CANNOT_CONVERT: "4"
        };

        vm.constInputDevice = {
            1: 'WEB_PLAYER',
            2: 'WEB_AGENT',
            3: 'H5_PLAYER',
            4: 'H5_AGENT',
            5: 'APP_PLAYER',
            6: 'APP_AGENT'
        };

        vm.deviceType = {
            1:'WEB',
            2:'H5',
            3:'APP-ANDROID',
            4:'APP-IOS',
            5:'PC-DOWNLOAD',
        }

        vm.countryCode = {
            '安道尔共和国':'AD',
            '阿拉伯联合酋长国':'AE',
            '阿富汗':'AF',
            '安提瓜和巴布达':'AG',
            '安圭拉岛':'AI',
            '阿尔巴尼亚':'AL',
            '亚美尼亚':'AM',
            '安哥拉':'AO',
            '阿根廷':'AR',
            '奥地利':'AT',
            '澳大利亚':'AU',
            '阿塞拜疆':'AZ',
            '巴巴多斯':'BB',
            '孟加拉国':'BD',
            '比利时':'BE',
            '布基纳法索':'BF',
            '保加利亚':'BG',
            '巴林':'BH',
            '布隆迪':'BI',
            '贝宁':'BJ',
            '巴勒斯坦':'BL',
            '百慕大群岛':'BM',
            '文莱':'BN',
            '玻利维亚':'BO',
            '巴西':'BR',
            '巴哈马':'BS',
            '博茨瓦纳':'BW',
            '白俄罗斯':'BY',
            '伯利兹':'BZ',
            '加拿大':'CA',
            '中非共和国':'CF',
            '刚果':'CG',
            '瑞士':'CH',
            '库克群岛':'CK',
            '智利':'CL',
            '喀麦隆':'CM',
            '中国':'CN',
            '哥伦比亚':'CO',
            '哥斯达黎加':'CR',
            '捷克':'CS',
            '古巴':'CU',
            '塞浦路斯':'CY',
            '捷克':'CZ',
            '德国':'DE',
            '吉布提':'DJ',
            '丹麦':'DK',
            '多米尼加共和国':'DO',
            '阿尔及利亚':'DZ',
            '厄瓜多尔':'EC',
            '爱沙尼亚':'EE',
            '埃及':'EG',
            '西班牙':'ES',
            '埃塞俄比亚':'ET',
            '芬兰':'FI',
            '斐济':'FJ',
            '法国':'FR',
            '加蓬':'GA',
            '英国':'GB',
            '格林纳达':'GD',
            '格鲁吉亚':'GE',
            '法属圭亚那':'GF',
            '加纳':'GH',
            '直布罗陀':'GI',
            '冈比亚':'GM',
            '几内亚':'GN',
            '希腊':'GR',
            '危地马拉':'GT',
            '关岛':'GU',
            '圭亚那':'GY',
            '香港特别行政区':'HK',
            '洪都拉斯':'HN',
            '海地':'HT',
            '匈牙利':'HU',
            '印度尼西亚':'ID',
            '爱尔兰':'IE',
            '以色列':'IL',
            '印度':'IN',
            '伊拉克':'IQ',
            '伊朗':'IR',
            '冰岛':'IS',
            '意大利':'IT',
            '牙买加':'JM',
            '约旦':'JO',
            '日本':'JP',
            '肯尼亚':'KE',
            '吉尔吉斯坦':'KG',
            '柬埔寨':'KH',
            '朝鲜':'KP',
            '韩国':'KR',
            '科特迪瓦共和国':'KT',
            '科威特':'KW',
            '哈萨克斯坦':'KZ',
            '老挝':'LA',
            '黎巴嫩':'LB',
            '圣卢西亚':'LC',
            '列支敦士登':'LI',
            '斯里兰卡':'LK',
            '利比里亚':'LR',
            '莱索托':'LS',
            '立陶宛':'LT',
            '卢森堡':'LU',
            '拉脱维亚':'LV',
            '利比亚':'LY',
            '摩洛哥':'MA',
            '摩纳哥':'MC',
            '摩尔多瓦':'MD',
            '马达加斯加':'MG',
            '马里':'ML',
            '缅甸':'MM',
            '蒙古':'MN',
            '澳门':'MO',
            '蒙特塞拉特岛':'MS',
            '马耳他':'MT',
            '毛里求斯':'MU',
            '马尔代夫':'MV',
            '马拉维':'MW',
            '墨西哥':'MX',
            '马来西亚':'MY',
            '莫桑比克':'MZ',
            '纳米比亚':'NA',
            '尼日尔':'NE',
            '尼日利亚':'NG',
            '尼加拉瓜':'NI',
            '荷兰':'NL',
            '挪威':'NO',
            '尼泊尔':'NP',
            '瑙鲁':'NR',
            '新西兰':'NZ',
            '阿曼':'OM',
            '巴拿马':'PA',
            '秘鲁':'PE',
            '法属玻利尼西亚':'PF',
            '巴布亚新几内亚':'PG',
            '菲律宾':'PH',
            '巴基斯坦':'PK',
            '波兰':'PL',
            '波多黎各':'PR',
            '葡萄牙':'PT',
            '巴拉圭':'PY',
            '卡塔尔':'QA',
            '罗马尼亚':'RO',
            '俄罗斯':'RU',
            '沙特阿拉伯':'SA',
            '所罗门群岛':'SB',
            '塞舌尔':'SC',
            '苏丹':'SD',
            '瑞典':'SE',
            '新加坡':'SG',
            '斯洛文尼亚':'SI',
            '斯洛伐克':'SK',
            '塞拉利昂':'SL',
            '圣马力诺':'SM',
            '塞内加尔':'SN',
            '索马里':'SO',
            '苏里南':'SR',
            '圣多美和普林西比':'ST',
            '萨尔瓦多':'SV',
            '叙利亚':'SY',
            '斯威士兰':'SZ',
            '乍得':'TD',
            '多哥':'TG',
            '泰国':'TH',
            '塔吉克斯坦':'TJ',
            '土库曼斯坦':'TM',
            '突尼斯':'TN',
            '汤加':'TO',
            '土耳其':'TR',
            '特立尼达和多巴哥':'TT',
            '台湾省':'TW',
            '坦桑尼亚':'TZ',
            '乌克兰':'UA',
            '乌干达':'UG',
            '美国':'US',
            '乌拉圭':'UY',
            '乌兹别克斯坦':'UZ',
            '圣文森特岛':'VC',
            '委内瑞拉':'VE',
            '越南':'VN',
            '也门':'YE',
            '南斯拉夫':'YU',
            '南非':'ZA',
            '赞比亚':'ZM',
            '扎伊尔':'ZR',
            '津巴布韦':'ZW'
        }

        vm.playerRegistrationInterfaceType = {
            1:'WEB',
            2:'H5',
            3:'APP',
            0:'Backstage'
        }

        vm.avgPlayerLogin = 0;
        // For debugging:
        window.VM = vm;

        vm.selectPlatform = function (id) {
            vm.operSelPlatform = false;
            vm.platformOverviewClass = 'btn-primary';
            $.each(vm.platformList, function (i, v) {
                if (v._id == id) {
                    vm.selectedPlatform = v;
                    console.log('vm.selectedPlatform', vm.selectedPlatform);
                    $scope.safeApply();
                    return;
                }
            });
            vm.showPageName = "NEW_PLAYER";
            vm.getPlatformProvider(id);
            vm.getMerchantList();
            vm.getMerchantType();
        };
        vm.loadPage = function (choice) {
            $scope.$evalAsync(() => {
                socketService.clearValue();
                vm.platformOverviewClass = 'btn-danger';
                vm.showPageName = choice;
            });
        };
        vm.loadPageFunc = function (choice) {
            $timeout(function () {
                switch (choice) {
                    case "PLATFORM_OVERVIEW":
                        vm.initSearchParameter('allActivePlayer', null, 4, function () {
                            vm.queryPara.allActivePlayer = {date: utilService.getNdayagoStartTime(1)}
                        });

                        vm.initSearchParameter('allNewPlayer', true, 4);
                        vm.initSearchParameter('allPlayerConsumption', true, 4);
                        vm.initSearchParameter('allPlayerBonus', true, 4);
                        vm.initSearchParameter('allPlayerTopup', true, 4);
                        vm.initSearchParameter('allApiResponseTime', true, 1);
                        vm.initSearchParameter('allOnlineTopupSuccessRate', true, 1, function () {
                            vm.allPlatformOnlineTopupSuccessAnalysisSort = {};
                            vm.queryPara.allOnlineTopupSuccessRate.analysisCategory = 'onlineTopupType';
                            vm.allPlatformOnlineTopupSuccessTableSort = {
                                WEB: 'totalCount',
                                APP: 'totalCount',
                                H5: 'totalCount'
                            };
                            vm.queryPara.allOnlineTopupSuccessRate.timeOperator = '>=';
                            vm.queryPara.allOnlineTopupSuccessRate.platformList = vm.platformObjIdList;
                            vm.getMerchantType();
                            vm.getAllPlatformMerchantList();
                            $scope.$evalAsync();
                        });

                        vm.newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('Platform'),
                            }],
                            yaxes: [{
                                position: 'left',
                                axisLabel: $translate('AMOUNT'),
                            }],
                        }

                        //todo:: need to optimize this part
                        // socketService.$socket($scope.AppSocket, 'getApiLoggerAllServiceName', {service: 'player'},
                        //     function success(data) {
                        //         console.log('get func name', data);
                        //         vm.apiRespServiceNames = data.data || [];
                        //         if (vm.apiRespServiceNames.length > 0) {
                        //             vm.queryPara.allApiResponseTime.service = vm.apiRespServiceNames[0];
                        //             vm.updateApiResponseFuncNames(vm.queryPara.allApiResponseTime.service, function (data1) {
                        //                 console.log('vm.apiRespFuncNames', vm.apiRespFuncNames);
                        //                 vm.queryPara.allApiResponseTime.funcName = vm.apiRespFuncNames[0];
                        //                 vm.plotAllPlatformApiResponseTime();
                        //                 $scope.safeApply();
                        //             });
                        //         }
                        //     });

                        vm.plotAllPlatformActivePlayerPie();
                        vm.plotAllPlatformNewPlayerPie();
                        vm.plotAllPlatformCreditPie();
                        vm.plotAllPlatformTopUpPie();
                        vm.plotAllPlatformPlayerBonusPie();
                        vm.getAllOnlineToupSuccessRateData();
                        break;
                    case "NEW_PLAYER":
                        vm.platformNewPlayerAnalysisSort = {};
                        vm.initSearchParameter('newPlayer', 'day', 3);
                        vm.queryPara.newPlayer.userType='all';
                        vm.getPartnerLevelConfig();
                        $scope.safeApply();
                        //vm.plotNewPlayerLine();
                        break;
                    case "LOGIN_PLAYER":
                        vm.platformLoginPlayerAnalysisSort = {};
                        vm.initSearchParameter('loginPlayer', 'day', 3);
                        vm.initSearchParameter('loginPlayerDevice', 'day', 3);
                        vm.queryPara.loginPlayer.userType='all';
                        vm.queryPara.loginPlayerDevice.userType='all';
                        $scope.safeApply();
                        //vm.plotLoginPlayerLine();
                        break;
                    case "APP_PLAYER":
                        vm.platformAppPlayerAnalysisSort = {};
                        vm.initSearchParameter('appPlayer', 'day', 3);
                        vm.queryPara.appPlayer.playerType = 'new_registration';
                        vm.queryPara.appPlayer.deviceType = 'all';
                        vm.platformAppPlayerAnalysisData = null;
                        vm.platformAppPlayerAverage = null;
                        vm.platformAppPlayerTotalSum = null;
                        $scope.$evalAsync();
                        break;
                    case "ACTIVE_PLAYER":
                        vm.platformActivePlayerAnalysisSort = {};
                        vm.initSearchParameter('activePlayer', 'day', 3);
                        vm.queryPara.activePlayer.userType='all';
                        $scope.safeApply();
                        //vm.plotActivePlayerLine();
                        break;
                    case "VALID_ACTIVE_PLAYER":
                        vm.platformValidActivePlayerAnalysisSort = {validActivePlayerSort:'date'};
                        vm.initSearchParameter('validActivePlayer', 'day', 3);
                        vm.queryPara.validActivePlayer.userType='all';
                        $scope.safeApply();
                        //vm.plotValidActivePlayerLine();
                        break;
                    case "PEAK_HOUR":
                        // vm.plotPeakhourOnlinePlayerLine();
                        // vm.plotPeakhourCreditspendLine();
                        // vm.plotPeakhourTopupLine();
                        break;
                    case "PLAYER_PHONE_LOCATION":
                    case "PLAYER_IP_LOCATION":
                        vm.showCountryTable = true;
                        $.getScript("js/lib/ammap/ammap.js").done(
                            () => {
                                $.when(
                                    $.getScript("js/lib/ammap/worldHigh.js"),
                                    $.getScript("js/lib/ammap/chinaHigh.js"),
                                    $.getScript("js/lib/ammap/singaporeHigh.js"),
                                    $.getScript("js/lib/ammap/light.js"),
                                    $.getScript("js/lib/ammap/cityLocationData.js"),
                                    $.getScript("dataSource/data.js"),
                                    $.Deferred(function (deferred) {
                                        $(deferred.resolve);
                                    })
                                ).done(function (data, textStatus, jqxhr) {
                                    setTimeout(function () {
                                        vm.latlong = $.extend({}, latlong);
                                        vm.allCountryName = $.extend({}, AmCharts.maps.worldHigh.svg.g.path);
                                        vm.allProvinceId = {};
                                        AmCharts.maps.chinaHigh.svg.g.path.map(item => {
                                            vm.allProvinceId[item.hanTitle] = item.id;
                                            vm.allProvinceId[item.id] = item.hanTitle;
                                        });
                                        vm.initSearchParameter('playerLocation', true, 2, function (height) {
                                            vm.queryPara.playerLocation.player = 'all';
                                            vm.queryPara.playerLocation.date = 'lastAccessTime';
                                            var setHeight = height - 50;
                                            $(".analysisLocationTable").height(setHeight + "px");
                                            vm.queryPara.playerLocation.userType = 'all';
                                            $scope.safeApply();
                                            //vm.playerLocationPage();
                                        });
                                    });
                                });
                            }
                        );
                        break;
                    case "REWARD_ANALYSIS":
                        vm.checkRewardWithRetentionRate = false;
                        vm.playerInputDevice = $scope.constPlayerRegistrationInterface;
                        vm.platformRewardAnalysisSort = {};
                        vm.selectReward = {};
                        vm.initSearchParameter('reward', 'day', 3);
                        vm.rewardAnalysisInit(vm.plotRewardLine);
                        break;
                    case "PLAYER_LOGIN_DEVICE_ANALYSIS":
                        vm.newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('User Agent')
                            }],
                            yaxes: [{
                                position: 'left',
                                axisLabel: $translate('AMOUNT')
                            }]
                        };
                        vm.initSearchParameter('playerDevice', true, 2, function () {
                            vm.queryPara.playerDevice.type = 'os';
                            vm.queryPara.playerDevice.queryRequirement = 'register';
                            vm.queryPara.playerDevice.userType = 'all';
                            //vm.deviceAnalysisInit();
                        });
                        break;
                    case "PLAYER_DOMAIN_ANALYSIS":
                        vm.newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('Domain Name')
                            }],
                            yaxes: [{
                                position: 'left',
                                axisLabel: $translate('AMOUNT')
                            }]
                        };
                        vm.initSearchParameter('playerDomain', true, 2, function () {
                            //vm.domainAnalysisInit();
                        });
                        vm.queryPara.playerDomain.userType = 'all';
                        $scope.safeApply();
                        break;
                    case "PLAYER_RETENTION":
                        vm.initSearchParameter('playerRetention', null, 2, function () {
                            vm.queryPara.playerRetention.days = [1, 2, 3, 5, 7, 10, 12, 14, 16, 18, 21, 23, 25, 27, 30];
                            vm.queryPara.playerRetention.playerType = "1"; //set default value
                            vm.dayListLength = [];
                            for (var i = 1; i < 31; i++) {
                                vm.dayListLength.push(i);
                            }
                            vm.queryPara.playerRetention.device = "all";
                            vm.queryPara.playerRetention.userType = "all";
                            vm.checkDomainList('playerRetention');
                            vm.playerRetentionInit(function () {
                                //vm.getPlayerRetention();
                            }, 'playerRetention');
                            $scope.safeApply();
                        });
                        break;
                    case "PLAYER_EXPENSES":
                        vm.platformConsumptionAnalysisSort = {};
                        vm.playerConsumptionTrendAnalysisSort = {};
                        vm.initSearchParameter('playerCredit', 'day', 3, function () {
                            vm.queryPara.playerCredit.filterGameProvider = 'all';
                            //vm.drawPlayerCreditLine('PLAYER_EXPENSES');
                            //vm.plotPlayerCreditLine('PLAYER_EXPENSES');
                        });
                        break;
                    case "PLAYER_TOPUP":
                        vm.initSearchParameter('playerCredit', 'day', 3, function () {
                            // vm.drawPlayerCreditLine();
                            // vm.drawPlayerCreditCountLine();
                        });
                        break;
                    case "BONUS_AMOUNT":
                        vm.platformBonusAnalysisSort = {};
                        vm.initSearchParameter('bonusAmount', 'day', 3, function () {
                            //vm.drawPlayerBonusAmount('BONUS_AMOUNT');
                        });
                        break;
                    case "CLIENT_SOURCE":
                        vm.initSearchParameter('clientSource', true, 3, function () {
                            //vm.initClientSourcePara(vm.getClientSourceData);
                        });
                        vm.queryPara.clientSource.userType='all';
                        $scope.safeApply();

                        break;
                    case "GAME_ANALYSIS":
                        // vm.getAllProvider();
                        break;
                    case "CONSUMPTION_INTERVAL":
                        vm.consumptionInterval = {};
                        vm.initSearchParameter('consumptionInterval', null, 1);
                        vm.consumptionInterval.pastDay = '1';
                        //vm.getConsumptionIntervalData();
                        break;
                    case "ONLINE_TOPUP_SUCCESS_RATE":
                        vm.platformOnlineTopupSuccessAnalysisSort = {};
                        vm.platformOnlineTopupAnalysisDetailPeriod = 'day';
                        vm.initSearchParameter('onlineTopupSuccessRate', 'day', 1);
                        vm.queryPara.analysisCategory = 'onlineTopupType';
                        vm.platformOnlineTopupSuccessTableSort = {
                            WEB: 'totalCount',
                            APP: 'totalCount',
                            H5: 'totalCount'
                        };
                        vm.queryPara.onlineTopupSuccessRate.timeOperator = '>=';
                        //vm.getOnlineToupSuccessRateData();
                        break;
                    case "TOPUPMANUAL":
                        vm.platformTopUpAnalysisSort = {};
                        vm.initSearchParameter('topUp', 'day', 3, function () {
                            //vm.drawPlayerTopUp('TOPUPMANUAL');
                        });
                        vm.platformTopupTableSort = {
                            amountSort: 'date',
                            countSort: 'date',
                            headCountSort: 'date',
                            rateSort: 'date',
                            methodSort: 'date',
                            bankSort: 'date'
                        }
                        break;
                    case "PlayerAlipayTopUp":
                        vm.platformTopUpAnalysisSort = {};
                        vm.initSearchParameter('topUp', 'day', 3, function () {
                            //vm.drawPlayerTopUp('PlayerAlipayTopUp');
                        });
                        vm.platformTopupTableSort = {
                            amountSort: 'date',
                            countSort: 'date',
                            headCountSort: 'date',
                            rateSort: 'date'
                        }
                        break;
                    case "PlayerWechatTopUp":
                        vm.platformTopUpAnalysisSort = {};
                        vm.initSearchParameter('topUp', 'day', 3, function () {
                           // vm.drawPlayerTopUp('PlayerWechatTopUp');
                        });
                        vm.platformTopupTableSort = {
                            amountSort: 'date',
                            countSort: 'date',
                            headCountSort: 'date',
                            rateSort: 'date'
                        }
                        break;
                    case "TOPUP_METHOD_RATE":
                        vm.initSearchParameter('topupMethod', 'day', 3, function () {
                            //vm.drawTopupMethodLine();
                            //vm.drawTopupMethodCountLine();
                            //vm.drawTopupMethodSuccessHeadCountLine();
                        });
                        break;
                    case "DEMO_PLAYER":
                        vm.averageData = {};
                        vm.dailyStatusData = [];
                        $('#demoPlayerStatusTable').hide();
                        vm.initSearchParameter('demoPlayer', 'day', 3, function () {

                        });
                        break;
                    case "CLICK_COUNT":
                        vm.newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('Device, Page Name'),
                            }],
                            yaxes: [{
                                position: 'left',
                                axisLabel: $translate('Click Count'),
                            }],
                        };
                        vm.initSearchParameter('clickCount', 'day', 3, function () {

                        });
                        vm.getClickCountDeviceAndPage();
                        // vm.getClickCountPageName();
                        vm.clickCountTimes = 1;
                        break;
                    case "MANUAL_APPROVAL_PERCENTAGE":
                        vm.getPlatformProviderGroup();
                        vm.playerBonusDetailTableIsHide = true;
                        vm.updatePlayerDetailTableIsHide = true;
                        vm.updatePartnerDetailTableIsHide = true;
                        vm.rewardDetailTableIsHide = true;
                        vm.othersDetailTableIsHide = true;
                        vm.allDetailTableIsHide = true;

                        vm.dataSort = {
                            playerBonus: 'date',
                            updatePlayer: 'date',
                            updatePartner: 'date',
                            allReward: 'date',
                            miscellaneous: 'date',
                            all: 'date',
                        }
                        vm.initSearchParameter('manualApproval', 'day', 3, function () {});
                        vm.getAllBankTypeAndGameTypeList();
                        // vm.drawManualApprovalRate();
                        break;
                    case "FRONT_END_REGISTRATION_ATTRITION_RATE":
                        vm.dataSort = {
                            web: 'date',
                            app: 'date',
                            H5: 'date',
                            frontEnd: 'date'
                        }
                        vm.initSearchParameter('registrationAttritionRate', 'day', 3, function () {});
                        // vm.drawFrontEndRegistrationAttritionRate();
                        break;
                    case "WITHDRAWAL_SPEED":
                        vm.withdrawSuccessDetailTableIsHide = true;
                        vm.withdrawFailedDetailTableIsHide = true;
                        vm.withdrawSuccessPayDetailTableIsHide = true;
                        vm.withdrawSuccessPayTotalDetailTableIsHide = true;

                        vm.dataSort = {
                            withdrawSuccess: 'date',
                            withdrawFailed: 'date',
                            withdrawSuccessPay: 'date',
                            withdrawSuccessPayTotal: 'date'
                        }
                        vm.initSearchParameter('withdrawalSpeed', 'day', 3, function () {});
                        vm.getAllBankTypeAndGameTypeList();
                        // vm.drawWithdrawSpeed();
                        break;
                    case "PLAYER_ONLINE_TIME":
                        vm.initSearchParameter('playerOnlineTime', 'day', 3, function () {});
                        break;
                    case "DOMAIN_VISIT_AMOUNT":
                        vm.initSearchParameter('ipDomain', 'day', 3);
                        vm.initSearchParameter('ipDomainUnique', 'day', 3);
                        vm.queryPara.ipDomain.domain = '';
                        vm.queryPara.ipDomainUnique.domain = '';
                        vm.getIpDomainOption();
                        vm.getIpDomainUniqueOption();
                        vm.queryPara["ipDomain"].startTime.off('changeDate');
                        vm.queryPara["ipDomain"].endTime.off('changeDate');
                        vm.queryPara["ipDomainUnique"].startTime.off('changeDate');
                        vm.queryPara["ipDomainUnique"].endTime.off('changeDate');
                        vm.queryPara["ipDomain"].startTime.on('changeDate', vm.getIpDomainOptionDebounce);
                        vm.queryPara["ipDomain"].endTime.on('changeDate', vm.getIpDomainOptionDebounce);
                        vm.queryPara["ipDomainUnique"].startTime.on('changeDate', vm.getIpDomainUniqueOptionDebounce);
                        vm.queryPara["ipDomainUnique"].endTime.on('changeDate', vm.getIpDomainUniqueOptionDebounce);

                        break;
                }
                // $(".flot-tick-label.tickLabel").addClass("rotate330");
                //
                // $scope.safeApply();
            });
        };
        // platform overview start =================================================
        //vm.generateData = function () {
        //    vm.data1 = vm.getData(15, 100, 10);
        //    vm.data2 = vm.getData(15, 100, 10);
        //    vm.data3 = vm.getData(15, 100, 10);
        //    vm.data4 = vm.getData(15, 100, 10);
        //};
        //vm.getData = function (qty, maxValue, step) {
        //    var data = [];
        //    for (var i = 0; i < qty; i++) {
        //        data.push([i, parseInt(Math.random() * maxValue / step) * step])
        //    }
        //    return data;
        //};
        vm.getXlabelsFromdata = function (data) {
            var xAxis = [];
            for (var i = 0; i < data.length; i++) {
                xAxis.push([i, data[i].label]);
            }
            return xAxis;
        }
        vm.getLinedata = function (data) {
            var xAxis = [];
            for (var i = 0; i < data.length; i++) {
                //xAxis.push({data: [i, data[i].data], color: (data[i].color ? data[i].color : "black")});//, color: vm.colors[i]
                xAxis.push([i, data[i].data]);
            }
            return {label: vm.setGraphName(data[0].label), data: xAxis};
        }
        vm.getBardataFromPiedata = function (data) {
            var xAxis = [];
            for (var i = 0; i < data.length; i++) {
                //xAxis.push({data: [i, data[i].data], color: (data[i].color ? data[i].color : "black")});//, color: vm.colors[i]
                xAxis.push([i, data[i].data]);
            }
            return xAxis;
        }

        vm.plotAllPlatformActivePlayerPie = function () {
            var placeholder = "#pie-all-activePlayer";

            var sendData = {
                date: utilService.setLocalDayStartTime(vm.queryPara.allActivePlayer.date)
            }
            socketService.$socket($scope.AppSocket, 'countActivePlayerALLPlatform', sendData, function success(data1) {
                console.log('allActivePlayers', data1);
                var data = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.number};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                socketService.$plotPie(placeholder, data, {}, 'activePlayerPieClickData');

                var placeholderBar = "#bar-all-activePlayer";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(data), vm.newOptions, vm.getXlabelsFromdata(data));

                var listen = $scope.$watch(function () {
                    return socketService.getValue('activePlayerPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformActivePie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        };

        vm.plotAllPlatformPlayerBonusPie = function(){
            var placeholder = "#pie-all-bonusAmount";
            var sendData = {
                startDate: vm.queryPara.allPlayerBonus.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allPlayerBonus.endTime.data('datetimepicker').getLocalDate(),
                platformId:vm.selectedPlatform ?vm.selectedPlatform._id:null,
                status:['Success','Approved']
            };

            socketService.$socket($scope.AppSocket, 'getAnalysisBonusRequestList', sendData, function success(data1) {
                console.log('getAnalysisBonusRequestList', data1);
                var data = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    var platformName = vm.platformList.filter(function( item ){ return item._id == obj._id})
                    return {label: vm.setGraphName(platformName[0]['name']), data: obj.number};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                socketService.$plotPie(placeholder, data, {}, 'playerBonusPieClickData');

                var placeholderBar = "#bar-all-bonusAmount";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(data), vm.newOptions, vm.getXlabelsFromdata(data));

                var listen = $scope.$watch(function () {
                    return socketService.getValue('playerBonusPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformActivePie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        }
        vm.plotAllPlatformNewPlayerPie = function () {
            var placeholder = "#pie-all-newPlayer";
            var sendData = {
                startDate: vm.queryPara.allNewPlayer.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allNewPlayer.endTime.data('datetimepicker').getLocalDate(),
            };
            socketService.$socket($scope.AppSocket, 'countNewPlayers', sendData, function success(data1) {
                console.log('allplayers', data1);
                var pieData = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.number};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                socketService.$plotPie(placeholder, pieData, '', 'newPlayerPieClickData');
                var placeholderBar = "#bar-all-newPlayer";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));

                var listen = $scope.$watch(function () {
                    return socketService.getValue('newPlayerPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformNewPie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        };
        vm.plotAllPlatformCreditPie = function () {
            var placeholder = "#pie-all-creditSpend";
            var sendData = {
                startDate: vm.queryPara.allPlayerConsumption.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allPlayerConsumption.endTime.data('datetimepicker').getLocalDate(),
            };

            socketService.$socket($scope.AppSocket, 'getPlayerConsumptionSumForAllPlatform', sendData, function success(data1) {
                console.log('allplayersconsumption', data1);
                var pieData = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.totalAmount.toFixed(2)};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                if (pieData.length > 0) {
                    socketService.$plotPie(placeholder, pieData, {}, 'creditPieClickData');
                } else {
                    $(placeholder).text($translate("No consumption records found"));
                }
                var placeholderBar = "#bar-all-creditSpend";

                utilService.actionAfterLoaded('#bar-all-creditSpend', function () {
                    socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
                    var listen = $scope.$watch(function () {
                        return socketService.getValue('creditPieClickData');
                    }, function (newV, oldV) {
                        if (newV !== oldV) {
                            vm.allPlatformCreditPie = newV.series.label;
                            console.log('pie clicked', newV);
                            if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                                listen();
                            }
                        }
                    });
                });
            });
        };
        vm.plotAllPlatformTopUpPie = function () {
            var placeholder = "#pie-all-topUpAmount";
            var sendData = {
                startDate: vm.queryPara.allPlayerTopup.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allPlayerTopup.endTime.data('datetimepicker').getLocalDate(),
            };
            socketService.$socket($scope.AppSocket, 'getTopUpTotalAmountForAllPlatform', sendData, function success(data1) {
                console.log('allplayerstopup', data1);
                var pieData = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.totalAmount};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })
                if (pieData.length > 0) {
                    socketService.$plotPie(placeholder, pieData, {}, 'topupPieClickData');
                } else {
                    $(placeholder).text($translate("No Top Up record is found."));
                }
                var placeholderBar = "#bar-all-topUpAmount";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
                var listen = $scope.$watch(function () {
                    return socketService.getValue('topupPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformTopUpPie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        };

        vm.updateApiResponseFuncNames = function (service, callback) {
            socketService.$socket($scope.AppSocket, 'getApiLoggerAllFunctionNameOfService', {service: service}, function success(data) {
                console.log('get field name', data);
                vm.apiRespFuncNames = data.data || [];
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });

        }
        vm.plotAllPlatformApiResponseTime = function () {
            var placeholder = "#line-all-apiResponseTime";
            var sendData = {
                startDate: vm.queryPara.allApiResponseTime.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allApiResponseTime.endTime.data('datetimepicker').getLocalDate(),
                service: vm.queryPara.allApiResponseTime.service,
                functionName: vm.queryPara.allApiResponseTime.funcName,
                providerId: vm.queryPara.allApiResponseTime.providerId
            };
            $('#allApiResponseTimeAnalysis .block-query > *').last().show();
            socketService.$socket($scope.AppSocket, 'getApiResponseTimeQuery', sendData, function success(data) {
                $('#allApiResponseTimeAnalysis .block-query > *').last().hide();
                console.log('resData', data);
                var allData = data.data || [];
                var data = [];
                for (var i = 0; i < allData.length; i++) {
                    data.push([i, allData[i].responseTime, utilService.getFormatTime(allData[i].createTime)])
                }
                var newOptions = {};
                newOptions.yaxes = [{
                    position: 'left',
                    axisLabel: $translate('Milliseconds'),
                }];
                newOptions.xaxes = [{
                    position: 'bottom',
                    axisLabel: $translate('Index')
                }];
                socketService.$plotLine(placeholder, [{data: data, label: $translate("TIME")}], newOptions);
                vm.bindHover(placeholder, function (obj) {
                    var x = obj.datapoint[0],
                        y = obj.datapoint[1].toFixed(0);
                    var t0 = obj.series.data[obj.dataIndex][2];
                    $("#tooltip").html($translate("API_start_time") + " : " + t0 + '<br>' + $translate("API_Duration") + " : " + y + 'ms')
                        .css({top: obj.pageY + 5, left: obj.pageX + 5})
                        .fadeIn(200);
                })
            });
        }

        vm.calculateAverageData = (data, key1, key2) => {
            let average = null;
            if (key2) {
                average = data.length !== 0 ? Math.floor(data.reduce((a, item) => a + (Number.isFinite(item[key1][key2]) ? item[key1][key2] : 0), 0) / data.length) : 0;
            }else{
                average = data.length !== 0 ? Math.floor(data.reduce((a, item) => a + (Number.isFinite(item[key1]) ? item[key1] : 0), 0) / data.length) : 0;
            }

            return average
        };

        vm.generateLineData = (data, label, key1, key2) => {
            var graphData = {};

            data.forEach(item => {
                for (let i = 0; i < label.length; i++){
                    if (!graphData[label[i]]){
                        graphData[label[i]]=[];
                    }
                    graphData[label[i]].push([item.date, Number.isFinite(item[key1[i]][key2]) ? item[key1[i]][key2] : 0]);
                }
            })
            return [label,graphData];
        };

        vm.calculateAverageDataWithDecimalPlace = (data, key1, key2) => {
            let average = null;
            if (key2) {
                average = data.length !== 0 ? $noRoundTwoDecimalPlaces(data.reduce((a, item) => a + (Number.isFinite(item[key1][key2]) ? item[key1][key2] : 0), 0) / data.length) : 0;
            }else{
                average = data.length !== 0 ? $noRoundTwoDecimalPlaces(data.reduce((a, item) => a + (Number.isFinite(item[key1]) ? item[key1] : 0), 0) / data.length) : 0;
            }

            return average
        };

        vm.plotPie = function (tag, data, clickedDataClick) {
            //var placeholder = tag
            var pieData = data.filter(function (obj) {
                return (obj.id);
            }).map(function (obj) {
                return {label: obj.id, data: obj.number};
            }).sort(function (a, b) {
                return b.data - a.data;
            })

            socketService.$plotPie(tag, pieData, {}, clickedDataClick);
        };

        vm.generatedLineDataFromCalculatedAvgValue = (dataSet, avgData, key, label, appendKey) => {
            var graphData = [];
            let averageData = [];

            dataSet.forEach( item => {
                graphData.push([new Date(item.date), Number.isFinite(item[key]) ? item[key] : item[key].length]);
                averageData.push([new Date(item.date), avgData]);
            })

            if (appendKey){
                return {lineData: [{label: appendKey + $translate(label), data: graphData},{label: $translate('average line'), data: averageData}]};
            }
            else{
                return {lineData: [{label: $translate(label), data: graphData},{label: $translate('average line'), data: averageData}]};
            }

        };

        vm.dataArraySort = (type , sortField) => {
            vm.dataSort[type] = vm.dataSort[type] === sortField ? '-'+sortField : sortField;
        };

        vm.setAnchor = function (anchor) {
            location.hash = '';
            location.hash = anchor.toString();
        };

        // platform overview end =================================================

        // online topup success rate start =============================================
        vm.getOnlineToupSuccessRateData = () => {
            let startDate = vm.queryPara.onlineTopupSuccessRate.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.onlineTopupSuccessRate.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                startDate: startDate,
                endDate: endDate,
                analysisCategory: vm.queryPara.analysisCategory,
                operator:  vm.queryPara.onlineTopupSuccessRate.timeOperator,
                timesValue: vm.queryPara.onlineTopupSuccessRate.timesValue,
                timesValueTwo: vm.queryPara.onlineTopupSuccessRate.timesValueTwo
            };
            vm.platformOnlineTopupAnalysisAnalysisCategory = vm.queryPara.analysisCategory;
            vm.isShowLoadingSpinner('#onlineTopupSuccessRateAnalysis', true);
            socketService.$socket($scope.AppSocket, 'getOnlineTopupAnalysisByPlatform', sendData, data => {
                $scope.$evalAsync(()=>{
                    console.log('data.data', data.data);
                    vm.platformOnlineTopupAnalysisData = data.data[0];

                    for (let i = 0; i < vm.platformOnlineTopupAnalysisData.length; i++) {
                        for (let j = 0; j < vm.platformOnlineTopupAnalysisData[i].length; j++) {
                            for (let k = vm.platformOnlineTopupAnalysisData[i][j].length - 1; k >= 0; k--) {
                                let analysisData =  vm.platformOnlineTopupAnalysisData[i][j][k];
                                if (typeof analysisData._id == "string") {
                                    for (let l = vm.platformOnlineTopupAnalysisData[i][j].length - 1; l >= 0; l--) {
                                        let analysisData2 = vm.platformOnlineTopupAnalysisData[i][j][l];
                                        if (Number(analysisData._id) == analysisData2._id && typeof analysisData2._id == 'number') {
                                            analysisData.amount += analysisData2.amount;
                                            analysisData.count += analysisData2.count;
                                            analysisData.successCount += analysisData2.successCount;
                                            analysisData.successUserCount += analysisData2.successUserCount;
                                            analysisData.userCount += analysisData2.userCount;
                                            vm.platformOnlineTopupAnalysisData[i][j].splice(l,1);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }


                    vm.platformOnlineTopupAnalysisDataTotalUserCount = data.data[1].totalUserCount;
                    vm.platformOnlineTopupAnalysisTotalUserCount = vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[1].userAgentUserCount,0);
                    let totalSuccessCount = vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.successCount, 0), 0);
                    let totalUnsuccessCount = vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.count, 0), 0) - totalSuccessCount;
                    let totalCount = totalSuccessCount + totalUnsuccessCount;
                    let proposalCount = vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.proposalArr.length, 0),0);
                    vm.platformOnlineTopupAnalysisTotalData = {
                        totalCount: totalCount,
                        successCount: totalSuccessCount,
                        successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((totalSuccessCount / totalCount) * 100),
                        receivedAmount: vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.amount, 0),0),
                        amountRatio: 100,
                        userCount: vm.platformOnlineTopupAnalysisDataTotalUserCount,
                        userCountRatio: 100,
                        proposalCount: proposalCount
                    };
                    vm.platformOnlineTopupAnalysisByType = [];
                    if(vm.queryPara.analysisCategory !== 'onlineTopupType') {
                        // add merchantTypeId & merchantTypeName to data
                        vm.platformOnlineTopupAnalysisData = vm.platformOnlineTopupAnalysisData.map(
                            data1 => {
                                data1[0] = data1[0].map(
                                    data2 => {
                                        data2.merchantData = data2.merchantData.map(
                                            data3 => {
                                                let merchant = vm.merchantList.merchants.filter(merchant => merchant.merchantNo == data3._id);
                                                data3.merchantTypeId = merchant && merchant[0] ? merchant[0].merchantTypeId : '';
                                                let merchantType = vm.merchantTypes.filter(merchantType => merchantType.merchantTypeId == data3.merchantTypeId);
                                                data3.merchantTypeName = merchantType && merchantType[0] ? merchantType[0].name  : '';
                                                return data3;
                                            }
                                        );
                                        return data2;
                                    }
                                );
                                return data1;
                            }
                        );
                    }

                    Object.keys($scope.userAgentType).forEach(
                        userAgentTypeKey => {
                            if (vm.platformOnlineTopupAnalysisAnalysisCategory === 'thirdPartyPlatform') {
                                // thirdPartyPlatform
                                Object.keys($scope.merchantTopupTypeJson).forEach(key => {
                                    vm.merchantTypes.forEach(
                                        merchantType => {
                                            if(merchantType.name && userAgentTypeKey != 0){
                                                let calculatedData = vm.calculateOnlineTopupTypeData(key, userAgentTypeKey-1, merchantType.merchantTypeId);
                                                if(calculatedData.totalCount) // if no data dont show
                                                    vm.platformOnlineTopupAnalysisByType.push(calculatedData);
                                            }
                                        }
                                    );
                                });
                            } else if(vm.platformOnlineTopupAnalysisAnalysisCategory === 'merchantNo') {
                                // merchantNo
                                let merchantListWithoutRepeatMerchantNo = [];
                                let existMerchantNoArr = [];
                                vm.merchantList.merchants.forEach(
                                    merchant => {
                                        if(!existMerchantNoArr.includes(merchant.merchantNo)){
                                            existMerchantNoArr.push(merchant.merchantNo);
                                            merchantListWithoutRepeatMerchantNo.push(merchant);
                                        }
                                    }
                                );
                                Object.keys($scope.merchantTopupTypeJson).forEach(key => {
                                    merchantListWithoutRepeatMerchantNo.forEach(
                                        merchant => {
                                            if (userAgentTypeKey == 0) return;
                                            let calculatedData = vm.calculateOnlineTopupTypeData(key, userAgentTypeKey-1, merchant.merchantTypeId, merchant.merchantNo);
                                            if(calculatedData.totalCount) // if no data dont show
                                                vm.platformOnlineTopupAnalysisByType.push(calculatedData);
                                        }
                                    );
                                });
                            } else {
                                // onlineTopupType
                                Object.keys($scope.merchantTopupTypeJson).forEach(key => {
                                    if (userAgentTypeKey == 0) return;
                                    vm.platformOnlineTopupAnalysisByType.push(vm.calculateOnlineTopupTypeData(key, userAgentTypeKey-1));
                                });
                            }
                        }
                    );
                    vm.platformOnlineTopupAnalysisSubTotalData = {
                        WEB: vm.calculateOnlineTopupTypeSubtotalData(1),
                        APP: vm.calculateOnlineTopupTypeSubtotalData(2),
                        H5: vm.calculateOnlineTopupTypeSubtotalData(3)
                    };

                    vm.platformOnlineTopupAnalysisDetailMerchantId = null;
                    // console.log('vm.platformOnlineTopupAnalysisData', vm.platformOnlineTopupAnalysisData);
                    // console.log('vm.platformOnlineTopupAnalysisTotalData', vm.platformOnlineTopupAnalysisTotalData);
                    // console.log('vm.platformOnlineTopupAnalysisByType', vm.platformOnlineTopupAnalysisByType);
                    // console.log('vm.platformOnlineTopupAnalysisSubTotalData', vm.platformOnlineTopupAnalysisSubTotalData);
                    vm.isShowLoadingSpinner('#onlineTopupSuccessRateAnalysis', false);
                });
            });
        };

        /*
         * Combine unique element from 2 arrays
         */
        function orArrays (array1, array2) {
            let res = [];
            let has = {};
            for (let i = 0, max = array1.length; i < max; i++) {
                res.push(array1[i]);
                has[array1[i]] = true;
            }
            for (let i = 0, max = array2.length; i < max; i++) {
                if (!has[array2[i]]) {
                    res.push(array2[i]);
                    has[array2[i]] = true;
                }
            }
            return res;
        }

        vm.onlineTopupTypeDataSort = (type, sortField) => {
            vm.platformOnlineTopupSuccessTableSort[type] = vm.platformOnlineTopupSuccessTableSort[type] === sortField ? '-'+sortField : sortField;
        };

        vm.calculateOnlineTopupTypeData = (merchantTopupTypeId, userAgent, merchantTypeId, merchantNo) => {
            let proposalArr = null;
            let typeData = vm.platformOnlineTopupAnalysisData[userAgent][0].filter(data => data._id == merchantTopupTypeId)[0];
            if(merchantTypeId && !merchantNo) {
                // third party platform analysis
                typeData = typeData ? typeData.merchantData.filter(data => data.merchantTypeId == merchantTypeId) : typeData;
                if(typeData && typeData[0]) {
                    let successUserIds = [];
                    let proposalArrList = [];
                    // remove repeat user among different merchantNo to get merchant platform unique user
                    typeData.forEach(
                        data => {
                            successUserIds = orArrays(successUserIds, data.successUserIds);
                            proposalArrList = proposalArrList.concat(data.proposalArr);
                        }
                    );
                    // one platform might have multi merchant no, so need sum all data together
                    typeData = {
                        amount: typeData.reduce((a, data) => a + data.amount, 0),
                        userCount:typeData.reduce((a, data) => a + data.userCount, 0),
                        successUserCount: successUserIds.length,
                        _id: merchantTopupTypeId,
                        count: typeData.reduce((a, data) => a + data.count, 0),
                        successCount: typeData.reduce((a, data) => a + data.successCount, 0),
                        merchantTypeName: typeData[0].merchantTypeName,
                        proposalArr: proposalArrList
                    };
                } else {
                    typeData = null; // empty array is not false, so set to null then later will set default object to typeData
                }
            } else if(merchantTypeId && merchantNo && typeData) {
                // merchantNo analysis
                let merchantNoData = typeData.merchantData.filter(data => data._id == merchantNo)[0];
                typeData = merchantNoData ?  merchantNoData : null;
            }

            typeData = typeData ? typeData : {amount:0, userCount:0, successUserCount:0, _id: merchantTopupTypeId, count:0, successCount: 0, proposalArr: []};

            if (typeData.proposalArr){
                proposalArr = typeData.proposalArr;
            }
            let totalCount = typeData.count;
            let returnObj =  {
                totalCount: totalCount,
                successCount: typeData.successCount,
                successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.successCount / totalCount) * 100),
                receivedAmount: typeData.amount,
                merchantTopupTypeId: merchantTopupTypeId,
                amountRatio: vm.platformOnlineTopupAnalysisTotalData.receivedAmount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.amount / vm.platformOnlineTopupAnalysisTotalData.receivedAmount) * 100),
                userCount: typeData.successUserCount,
                userCountRatio: vm.platformOnlineTopupAnalysisDataTotalUserCount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.successUserCount / vm.platformOnlineTopupAnalysisDataTotalUserCount) * 100),
            };
            if(typeData.merchantTypeName) returnObj.merchantTypeName = typeData.merchantTypeName;
            if(merchantTypeId) returnObj.merchantTypeId = merchantTypeId;
            if(merchantNo) returnObj.merchantNo = merchantNo;

            if (proposalArr){
                returnObj.proposalArr = proposalArr;
            }

            returnObj.name = $scope.merchantTopupTypeJson[merchantTopupTypeId];
            returnObj.userAgent = userAgent + 1;
            returnObj.type = $scope.userAgentType[returnObj.userAgent];
            return returnObj;
        };
        vm.calculateOnlineTopupTypeSubtotalData = (userAgent) => {
            let typeData =  vm.platformOnlineTopupAnalysisByType.filter(data => data.userAgent === userAgent);
            let dataContainRecord = typeData.filter(data => data.totalCount > 0).length;
            let totalCount = typeData.reduce((a, data) => a + data.totalCount ,0);
            let successCount = typeData.reduce((a, data) => a + data.successCount ,0);
            let proposalCount = typeData.reduce((a, data) => a + (data.proposalArr ? data.proposalArr.length : 0), 0);
            return {
                data: typeData,
                totalCount: totalCount,
                successCount: successCount,
                successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((successCount / totalCount) *100),
                receivedAmount: typeData.reduce((a, data) => a + data.receivedAmount ,0),
                amountRatio: $noRoundTwoDecimalPlaces(typeData.reduce((a, data) => a + data.amountRatio ,0)),
                userCount: vm.platformOnlineTopupAnalysisData[userAgent-1][1].userAgentUserCount,
                userCountRatio: $noRoundTwoDecimalPlaces(typeData.reduce((a, data) => a + data.userCountRatio ,0)),
                name: $scope.userAgentType[userAgent],
                proposalCount: proposalCount
            };
        };

        vm.initProposalDetail = (proposalArr) => {
            if (proposalArr && proposalArr.length > 0){

                if (vm.queryPara.onlineTopupSuccessRate.timeOperator != 'range'){
                    if (typeof vm.queryPara.onlineTopupSuccessRate.timesValue == 'number'){
                        vm.titleTag = $translate("successCount") + " (" + $translate("Preset-Processing Time") + " " + vm.queryPara.onlineTopupSuccessRate.timeOperator + " " + vm.queryPara.onlineTopupSuccessRate.timesValue + $translate("Minutes") + ") ";
                    }
                    else{
                        vm.titleTag = $translate("successCount") + " (" + $translate("Preset-Processing Time") + ") " ;
                    }
                }
                else{
                    if (typeof vm.queryPara.onlineTopupSuccessRate.timesValue == 'number' && typeof vm.queryPara.onlineTopupSuccessRate.timesValueTwo == 'number') {
                        vm.titleTag = $translate("successCount") + " (" + vm.queryPara.onlineTopupSuccessRate.timesValue  + $translate("Minutes") + " <= " + $translate("Preset-Processing Time") + " >= " + vm.queryPara.onlineTopupSuccessRate.timesValueTwo  + $translate("Minutes") + ") ";
                    }
                    else{
                        vm.titleTag = $translate("successCount") + " (" + $translate("Preset-Processing Time") + ") " ;
                    }
                }
                vm.onlineTopUpSuccessProposal =proposalArr.map(item => {
                    item.involveAmount$ = 0;
                    if (item.data.updateAmount) {
                        item.involveAmount$ = item.data.updateAmount;
                    } else if (item.data.amount) {
                        item.involveAmount$ = item.data.amount;
                    } else if (item.data.rewardAmount) {
                        item.involveAmount$ = item.data.rewardAmount;
                    } else if (item.data.commissionAmount) {
                        item.involveAmount$ = item.data.commissionAmount;
                    } else if (item.data.negativeProfitAmount) {
                        item.involveAmount$ = item.data.negativeProfitAmount;
                    }
                    item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                    item.typeName$ = $translate(item.type.name || "Unknown");
                    item.mainType$ = $translate(item.mainType || "Unknown");
                    if (item.mainType === "PlayerBonus")
                        item.mainType$ = $translate("Bonus");
                    item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                    if (item.data && item.data.remark) {
                        item.remark$ = item.data.remark;
                    }
                    item.status$ = $translate(item.type.name === "BulkExportPlayerData" || item.mainType === "PlayerBonus" || item.mainType === "PartnerBonus" ? vm.getStatusStrfromRow(item) == "Approved" ? "approved" : vm.getStatusStrfromRow(item) : vm.getStatusStrfromRow(item));

                    if (item.hasOwnProperty('creator')) {
                        item.creator$ = item.creator.name;
                    } else {
                        item.creator$ = $translate('System');
                        if (item && item.data && item.data.playerName) {
                            item.creator$ += "(" + item.data.playerName + ")";
                        }
                    }

                    if (item.inputDevice){
                        for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                            if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == item.inputDevice) {
                                item.inputDevice$ = $translate(Object.keys(vm.inputDevice)[i]);
                            }
                        }
                    }

                    if (item.hasOwnProperty('creator') && item.data.creator.type == 'player') {
                        item.$involvedAcc = item.data.creator.name;
                    }
                    if (item.data && item.data.playerName) {
                        item.$involvedAcc = item.data.playerName;
                    }
                    else if (item.data && item.data.partnerName) {
                        item.$involvedAcc = item.data.partnerName;
                    }
                    else {
                        item.$involvedAcc = "";
                    }

                    return item;
                })
            }
        };

        vm.platformOnlineTopupAnalysisShowDetail = (merchantTopupTypeId, userAgent, merchantTypeId, merchantNo) => {
            vm.platformOnlineTopupAnalysisDetailMerchantId = merchantTopupTypeId;
            vm.platformOnlineTopupAnalysisDetailUserAgent = userAgent;
            vm.platformOnlineTopupAnalysisDetailMerchantTypeId = merchantTypeId;
            vm.platformOnlineTopupAnalysisDetailMerchantNo = merchantNo;
            let merchantType = vm.merchantTypes.filter(merchantType => merchantType.merchantTypeId == merchantTypeId)[0];
            vm.platformOnlineTopupAnalysisDetailMerchantName = merchantType ? merchantType.name : '';
            let typeName = $scope.merchantTopupTypeJson[merchantTopupTypeId];
            let startDate = vm.queryPara.onlineTopupSuccessRate.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.onlineTopupSuccessRate.endTime.data('datetimepicker').getLocalDate();
            let sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.platformOnlineTopupAnalysisDetailPeriod,
                merchantTopupTypeId: merchantTopupTypeId,
                startDate: startDate,
                endDate: endDate,
                userAgent: userAgent,
                analysisCategory: vm.platformOnlineTopupAnalysisAnalysisCategory,
                merchantTypeId: merchantTypeId,
                merchantNo:merchantNo
            };
            socketService.$socket($scope.AppSocket, 'getOnlineTopupAnalysisDetailUserCount', sendData, data => {
                $scope.$evalAsync(()=>{
                    console.log('data.data', data.data);
                    let detailDataByDate = data.data;
                    let typeData = vm.platformOnlineTopupAnalysisByType.filter(data => data.name == typeName && data.userAgent == userAgent)[0];
                    let periodDateData = [];
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.platformOnlineTopupAnalysisDetailPeriod, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }
                    vm.platformOnlineTopupAnalysisDetailData = [];
                    detailDataByDate.forEach(
                        data => {
                            vm.platformOnlineTopupAnalysisDetailData.push({
                                date: data.date,
                                totalCount: data.totalCount,
                                successCount: data.successCount,
                                successRate: data.totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((data.successCount / data.totalCount) * 100),
                                receivedAmount: data.receivedAmount,
                                amountRatio: data.totalReceivedAmount === 0 ? 0 : $noRoundTwoDecimalPlaces((data.receivedAmount / data.totalReceivedAmount) * 100),
                                userCount: data.successUserCount,
                                userCountRatio: data.totalUserCount === 0 ? 0 : $noRoundTwoDecimalPlaces((data.successUserCount / data.totalUserCount) * 100)
                            });
                        }
                    );
                    vm.platformOnlineTopupAnalysisDetailTotalData = {};
                    vm.platformOnlineTopupAnalysisDetailTotalData.totalCount = Math.floor(vm.platformOnlineTopupAnalysisDetailData.reduce((a, data) => a + data.totalCount, 0) / vm.platformOnlineTopupAnalysisDetailData.length);
                    vm.platformOnlineTopupAnalysisDetailTotalData.successCount = Math.floor(vm.platformOnlineTopupAnalysisDetailData.reduce((a, data) => a + data.successCount, 0) / vm.platformOnlineTopupAnalysisDetailData.length);
                    vm.platformOnlineTopupAnalysisDetailTotalData.successRate = $noRoundTwoDecimalPlaces(vm.platformOnlineTopupAnalysisDetailData.reduce((a, data) => a + data.successRate, 0) / vm.platformOnlineTopupAnalysisDetailData.length);
                    vm.platformOnlineTopupAnalysisDetailTotalData.receivedAmount = $noRoundTwoDecimalPlaces(vm.platformOnlineTopupAnalysisDetailData.reduce((a, data) => a + data.receivedAmount, 0) / vm.platformOnlineTopupAnalysisDetailData.length);
                    vm.platformOnlineTopupAnalysisDetailTotalData.userCount = Math.floor(vm.platformOnlineTopupAnalysisDetailData.reduce((a, data) => a + data.userCount, 0) / vm.platformOnlineTopupAnalysisDetailData.length);
                    vm.platformOnlineTopupAnalysisDetailTotalData.amountRatio = $noRoundTwoDecimalPlaces(vm.platformOnlineTopupAnalysisDetailData.reduce((a, data) => a + data.amountRatio, 0) / vm.platformOnlineTopupAnalysisDetailData.length);
                    vm.platformOnlineTopupAnalysisDetailTotalData.userCountRatio = $noRoundTwoDecimalPlaces(vm.platformOnlineTopupAnalysisDetailData.reduce((a, data) => a + data.userCountRatio, 0) / vm.platformOnlineTopupAnalysisDetailData.length);
                    let successRate = [];
                    let amountRatio = [];
                    let userCountRatio = [];
                    vm.platformOnlineTopupAnalysisDetailData.forEach(
                        data => {
                            successRate.push([new Date(data.date), data.successRate]);
                            amountRatio.push([new Date(data.date), data.amountRatio]);
                            userCountRatio.push([new Date(data.date), data.userCountRatio]);
                        }
                    );
                    let lineData = [
                        {label: $translate('successRate'), data: successRate},
                        {label: $translate('amountRatio'), data: amountRatio},
                        {label: $translate('userCountRatio'), data: userCountRatio}
                    ];
                    vm.plotLineByElementId("#line-onlineTopupSuccessRate", lineData, $translate('PERCENTAGE'), $translate('DAY'));
                    console.log('vm.platformOnlineTopupAnalysisDetailData', vm.platformOnlineTopupAnalysisDetailData);
                })
            });
        };

        vm.getMerchantList = () => {
            return $scope.$socketPromise('getMerchantList', {platformId: vm.selectedPlatform.platformId}).then(function (data) {
                vm.merchantList = data.data;
            });
        };

        vm.getMerchantType = () => {
            let query = vm.selectedPlatform && vm.selectedPlatform._id ? {platform: vm.selectedPlatform._id} : null;
            return $scope.$socketPromise('getMerchantTypeList', query).then(function (data) {
                vm.merchantTypes = data.data.merchantTypes;
                console.log('vm.merchantTypes',vm.merchantTypes);
                $scope.safeApply();
            });
        };

        vm.getAllPlatformMerchantList = () => {
            return $scope.$socketPromise('getAllPlatformMerchantList', {}).then(function (data) {
                vm.allPlatformMerchantList = data.data;
            });
        };
        // online topup success rate end =============================================

        // manual approval rate start ===================================================

        vm.getPlatformProviderGroup = () => {
            $scope.$socketPromise('getPlatformProviderGroup', {platformObjId: vm.selectedPlatform._id}).then(function (data) {
                vm.gameProviderGroup = data.data;
                $scope.safeApply();
            });
        };

        vm.getAllBankTypeAndGameTypeList = () => {
            vm.allBankTypeList = {};
            vm.allGameTypesList = [];
            vm.allGameTypes = {};
            Promise.all([
                commonService.getBankTypeList($scope, vm.selectedPlatform._id).catch(err => Promise.resolve({})),
                commonService.getAllGameTypes($scope).catch(err => Promise.resolve([[], []]))])
                .then(data => {
                    if (data){
                        vm.allBankTypeList = data[0] ? data[0] : {};
                        vm.allGameTypesList = data[1] && data[1][0] ? data[1][0] : [];
                        vm.allGameTypes = data[1] && data[1][1] ? data[1][1] : {};
                    }
                });
        }
        // display  proposal detail
        vm.showProposalDetailField = function (obj, fieldName, val) {
            if (!obj) return '';
            var result = val ? val.toString() : (val === 0) ? "0" : "";
            if (obj.type.name === "UpdatePlayerPhone" && (fieldName === "updateData" || fieldName === "curData")) {
                var str = val.phoneNumber
                result = val.phoneNumber; //str.substring(0, 3) + "******" + str.slice(-4);
            } else if (obj.status === "Expired" && fieldName === "validTime") {
                var $time = $('<div>', {
                    class: 'inlineBlk margin-right-5'
                }).text(utilService.getFormatTime(val));
                var $btn = $('<button>', {
                    class: 'btn common-button btn-primary delayTopupExpireDate',
                    text: $translate('Delay'),
                    'data-proposal': JSON.stringify(obj),
                });
                utilService.actionAfterLoaded(".delayTopupExpireDate", function () {
                    $('#ProposalDetail .delayTopupExpireDate').off('click');
                    $('#ProposalDetail .delayTopupExpireDate').on('click', function () {
                        var $tr = $(this).closest('tr');
                        vm.delayTopupExpirDate(obj, function (newData) {
                            $tr.find('td:nth-child(2)').first().text(utilService.getFormatTime(newData.newValidTime));
                            vm.needRefreshTable = true;
                            $scope.safeApply();
                        });
                    })
                });
                result = $time.prop('outerHTML') + $btn.prop('outerHTML');
            } else if (fieldName.indexOf('providerId') > -1 || fieldName.indexOf('targetProviders') > -1) {
                result = val ? val.map(item => {
                    return vm.getProviderText(item);
                }) : '';
                result = result.join(',');
            } else if (fieldName.indexOf('providerGroup') > -1) {
                result = vm.getProviderGroupNameById(val) ? vm.getProviderGroupNameById(val) : $translate("LOCAL_CREDIT");
            } else if ((fieldName.indexOf('time') > -1 || fieldName.indexOf('Time') > -1) && val) {
                result = utilService.getFormatTime(val);
            } else if ((fieldName.indexOf('amount') > -1 || fieldName.indexOf('Amount') > -1) && val) {
                result = Number.isFinite(parseFloat(val)) ? $noRoundTwoDecimalPlaces(parseFloat(val)).toString() : val;
            } else if (fieldName == 'bankAccountType') {
                switch (parseInt(val)) {
                    case 1:
                        result = $translate('Credit Card');
                        break;
                    case 2:
                        result = $translate('Debit Card');
                        break;
                    case 3:
                        result = "储存卡";
                        break;
                    case 4:
                        result = "储蓄卡";
                        break;
                    case 5:
                        result = "商务理财卡";
                        break;
                    case 6:
                        result = "工商银行一卡通";
                        break;
                    default:
                        result = val;
                        break;
                }
            } else if (fieldName == 'clientType') {
                result = $translate($scope.merchantTargetDeviceJson[val]);
            } else if (fieldName == 'merchantUseType') {
                result = $translate($scope.merchantUseTypeJson[val])
            } else if (fieldName == 'topupType') {
                result = $translate($scope.merchantTopupTypeJson[val])
            } else if (fieldName == 'periodType') {
                result = $translate(firstTopUpPeriodTypeJson[val])
            } else if (fieldName == 'playerId' && val && val.playerId && val.name) {
                result = val.playerId;
                vm.selectedProposalDetailForDisplay.playerName = val.name;
            } else if (fieldName == 'bankTypeId' || fieldName == 'bankCardType' || fieldName == 'bankName') {
                result = vm.allBankTypeList && vm.allBankTypeList[val] ? vm.allBankTypeList[val] : (val + " ! " + $translate("not in bank type list"));
            } else if (fieldName == 'depositMethod') {
                result = $translate(vm.getDepositMethodbyId[val])
            } else if (fieldName === 'playerStatus') {
                result = $translate($scope.constPlayerStatus[val]);
            } else if (fieldName == 'allowedProviders') {
                let providerName = '';
                for (var v in val) {
                    providerName += val[v].name + ', ';
                }
                result = providerName;
            } else if (fieldName === 'proposalPlayerLevel') {
                result = $translate(val);
            } else if (fieldName === 'applyForDate') {
                result = new Date(val).toLocaleDateString("en-US", {timeZone: "Asia/Singapore"});
            } else if (fieldName === 'DOB') {
                result = commonService.convertDOBDateFormat(val);
            } else if (fieldName === 'returnDetail') {
                // Example data structure : {"GameType:9" : {"ratio" : 0.01, "consumeValidAmount" : 6000}}
                let newReturnDetail = {};
                Object.keys(val).forEach(
                    key => {
                        if (key && key.indexOf(':') != -1) {
                            let splitGameTypeIdArr = key.split(':');
                            let gameTypeId = splitGameTypeIdArr[1];
                            newReturnDetail[splitGameTypeIdArr[0]+':'+ vm.allGameTypes[gameTypeId]] = val[key];
                        }
                    });
                result = JSON.stringify(newReturnDetail || val)
                    .replace(new RegExp('GameType',"gm"), $translate('GameType'))
                    .replace(new RegExp('ratio','gm'), $translate('RATIO'))
                    .replace(new RegExp('consumeValidAmount',"gm"), $translate('consumeValidAmount'));
            } else if (fieldName === 'nonXIMADetail') {
                let newNonXIMADetail = {};
                Object.keys(val).forEach(
                    key => {
                        if (key && key.indexOf(':') != -1) {
                            let splitGameTypeIdArr = key.split(':');
                            let gameTypeId = splitGameTypeIdArr[1];
                            newNonXIMADetail[splitGameTypeIdArr[0]+':'+ vm.allGameTypes[gameTypeId]] = val[key];
                        }
                    });
                result = JSON.stringify(newNonXIMADetail || val)
                    .replace(new RegExp('GameType',"gm"), $translate('GameType'))
                    .replace(new RegExp('nonXIMAAmt',"gm"), $translate('totalNonXIMAAmt'));
            } else if (typeof(val) == 'object') {
                result = JSON.stringify(val);
            } else if (fieldName === "upOrDown") {
                result = $translate(val);
            }
            return $sce.trustAsHtml(result);
        };
        // end iof proposal detail

        vm.getProviderGroupNameById = (grpId) => {
            let result = '';
            $.each(vm.gameProviderGroup, function (i, v) {
                if (grpId == v._id) {
                    result = v.name;
                    return true;
                }
            });
            return result;
        };

        vm.showProposalModalNew = function (proposalId, platformObjId) {
            vm.proposalDetailStyle = {};
            vm.proposalDialog = 'proposal';
            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: platformObjId || vm.selectedPlatform._id,
                proposalId: proposalId
            }, function (data) {
                vm.selectedProposal = data.data;

                vm.selectedProposal.data = commonService.setFixedPropDetail($scope, $translate, $noRoundTwoDecimalPlaces, vm);

                if (vm.selectedProposal.data.inputData) {
                    if (vm.selectedProposal.data.inputData.provinceId) {
                        //vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                        commonService.getProvinceName($scope, vm.selectedProposal.data.inputData.provinceId).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data.provinceName = data;
                        });
                    }
                    if (vm.selectedProposal.data.inputData.cityId) {
                        //vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                        commonService.getCityName($scope, vm.selectedProposal.data.inputData.cityId).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data.cityName = data;
                        });
                    }
                } else {
                    if (vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]) {
                        //vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE" )
                        commonService.getProvinceName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE" ] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE" ];
                        });
                    }
                    if (vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]) {
                        //vm.getCityName(vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"], "RECEIVE_BANK_ACC_CITY")
                        commonService.getCityName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"];
                        });
                    }
                }

                $('#modalProposalDetail').modal('show');
                $('#modalProposalDetail').on('shown.bs.modal', function (e) {
                    $scope.safeApply();
                })

            })
        };

        vm.getStatusStrfromRow = function (row) {
            if (row.status) {
                return row.status;
            } else if (row.process) {
                return row.process.status;
            } else return 'Unknown';
        };

        vm.drawWithdrawSpeed = function () {
            vm.withdrawSuccessAvg = {};
            vm.withdrawFailedAvg = {};
            vm.withdrawSuccessPayAvg = {};
            vm.withdrawSuccessPayTotalAvg = {};

            vm.isShowLoadingSpinner('#withdrawalSpeedAnalysis', true);
            var sendData = {
                period: vm.queryPara.withdrawalSpeed.periodText,
                startDate: vm.queryPara.withdrawalSpeed.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.withdrawalSpeed.endTime.data('datetimepicker').getLocalDate(),
                platformObjId: vm.selectedPlatform._id
            }

            socketService.$socket($scope.AppSocket, 'getWithdrawalProposal', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if (!data && !data[0] && !data[1] && !data[2] && !data[3]) {
                            return Q.reject({name: 'DataError', message: 'Can not find the proposal data'})
                        }

                        vm.isShowLoadingSpinner('#withdrawalSpeedAnalysis', false);

                        vm.withdrawSuccessData = data.data[0];
                        vm.withdrawFailedData = data.data[1];
                        vm.withdrawSuccessPayData = data.data[2];
                        vm.withdrawSuccessPayTotalData = data.data[3];

                        let withdrawSuccessPieLabel = ["WITHDRAWAL_SUCCESS_TOTAL_TIMES", "0~1", "1~3", "3~5", "5~10", "10~20", "20~30", "30~45", "45~60", "60"];
                        let withdrawFailedPieLabel = ["WITHDRAWAL_FAILED_TOTAL_TIMES", "0~1", "1~3", "3~5", "5~10", "10~20", "20~30", "30~45", "45~60", "60"];

                        // Withdraw Success (Submit ~ Approved)
                        vm.mapWithdrawalSpeedData(vm.withdrawSuccessAvg, vm.withdrawSuccessData, "#pie-withdrawSuccess", withdrawSuccessPieLabel);
                        // Withdraw Fail/Reject
                        vm.mapWithdrawalSpeedData(vm.withdrawFailedAvg, vm.withdrawFailedData, "#pie-withdrawFailed", withdrawFailedPieLabel);
                        // Withdraw Success (Approved ~ Success)
                        vm.mapWithdrawalSpeedData(vm.withdrawSuccessPayAvg, vm.withdrawSuccessPayData, "#pie-withdrawSuccessPay", withdrawSuccessPieLabel);
                        // Withdraw Success (Submit ~ Success)
                        vm.mapWithdrawalSpeedData(vm.withdrawSuccessPayTotalAvg, vm.withdrawSuccessPayTotalData, "#pie-withdrawSuccessPayTotal", withdrawSuccessPieLabel);

                    });

                }, function (data) {
                    vm.isShowLoadingSpinner('#withdrawalSpeedAnalysis', false);
                    console.log("Failed to retrieve the data", data);
                }
            )
        };

        vm.mapWithdrawalSpeedData = function (averageObj, withdrawData, pieChartName, predefinedPieLabel) {
            averageObj.totalCount = vm.calculateAverageData(withdrawData, "totalCount");
            averageObj.count1 = vm.calculateAverageData(withdrawData, "count1");
            averageObj.count2 = vm.calculateAverageData(withdrawData, "count2");
            averageObj.count3 = vm.calculateAverageData(withdrawData, "count3");
            averageObj.count4 = vm.calculateAverageData(withdrawData, "count4");
            averageObj.count5 = vm.calculateAverageData(withdrawData, "count5");
            averageObj.count6 = vm.calculateAverageData(withdrawData, "count6");
            averageObj.count7 = vm.calculateAverageData(withdrawData, "count7");
            averageObj.count8 = vm.calculateAverageData(withdrawData, "count8");
            averageObj.count9 = vm.calculateAverageData(withdrawData, "count9");

            let withdrawPieArr = [];
            let pieLabel = predefinedPieLabel;
            for (let i = 0; i < Object.keys(averageObj).length; i++) {
                if (i == 0) {
                    continue;
                }
                let pieObj = {
                    count: averageObj[Object.keys(averageObj)[i]]
                };
                pieObj.label = pieLabel[i] + $translate("mins");
                if (i == 9) {
                    pieObj.label = pieObj.label + $translate("above");
                }
                withdrawPieArr.push(pieObj)
            }
            vm.drawManualApprovalPieChart(withdrawPieArr, pieChartName);
        };

        vm.hideExpandWithdrawSpeedProposalDetail = function (hideTableName) {
            vm.withdrawSuccessDetailTableIsHide = true;
            vm.withdrawFailedDetailTableIsHide = true;
            vm.withdrawSuccessPayDetailTableIsHide = true;
            vm.withdrawSuccessPayTotalDetailTableIsHide = true;
            vm[hideTableName] = false;
        }

        vm.drawPlayerOnlineTime = function () {
            // vm.withdrawSuccessAvg = {};
            // vm.withdrawFailedAvg = {};

            vm.playerOnlineTimeTotal = {};
            vm.isShowLoadingSpinner('#playerOnlineTimeAnalysis', true);

            let sendData = {
                period: vm.queryPara.playerOnlineTime.periodText,
                startTime: vm.queryPara.playerOnlineTime.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerOnlineTime.endTime.data('datetimepicker').getLocalDate(),
                platformObjId: vm.selectedPlatform._id
            };

            socketService.$socket($scope.AppSocket, 'getOnlineTimeLogByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    console.log('getOnlineTimeLogByPlatform', data);
                    if (!data && !data.data) {
                        return Promise.reject({name: 'DataError', message: 'Can not find the proposal data'})
                    }

                    vm.isShowLoadingSpinner('#playerOnlineTimeAnalysis', false);

                    vm.playerOnlineTimeData = data.data;
                    vm.playerOnlineTimeData.forEach( item => {
                        if (item && item.date){
                            item.date = new Date(item.date);
                        }
                    });

                    data.data.forEach( item => {
                        if (item && item.date && item.result){
                            vm.playerOnlineTimeTotal.totalCount = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.totalCount, 0);
                            vm.playerOnlineTimeTotal.count1 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count1, 0);
                            vm.playerOnlineTimeTotal.count2 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count2, 0);
                            vm.playerOnlineTimeTotal.count3 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count3, 0);
                            vm.playerOnlineTimeTotal.count4 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count4, 0);
                            vm.playerOnlineTimeTotal.count5 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count5, 0);
                            vm.playerOnlineTimeTotal.count6 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count6, 0);
                            vm.playerOnlineTimeTotal.count7 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count7, 0);
                            vm.playerOnlineTimeTotal.count8 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count8, 0);
                            vm.playerOnlineTimeTotal.count9 = vm.playerOnlineTimeData.reduce( (a,b) => a + b.result.count9, 0);
                        }
                    })

                    let onlineTimePieArr = [];
                    let pieLabel = ["PLAYER_ONLINE_TIME", "10", "11~30", "31~60", "1~5", "5~10", "10~15", "15~30", "30~60", "60"];
                    for (let i = 0; i < Object.keys(vm.playerOnlineTimeTotal).length; i++) {
                        if (i == 0) {
                            continue;
                        }
                        let pieObj = {
                            count: vm.playerOnlineTimeTotal[Object.keys(vm.playerOnlineTimeTotal)[i]]
                        };
                        if (i == 1) {
                            pieObj.label = pieLabel[i] + $translate("Seconds (Within)");
                        }
                        else if ( i == 2 || i == 3){
                            pieObj.label = pieLabel[i] + $translate("Seconds");
                        }
                        else if (i > 3 && i <= 8){
                            pieObj.label = pieLabel[i] + $translate("Minutes");
                        }
                        else if (i == 9) {
                            pieObj.label = pieLabel[i] + $translate("Minutes (Above)");
                        }
                        onlineTimePieArr.push(pieObj)
                    }
                    vm.drawManualApprovalPieChart(onlineTimePieArr, "#pie-playerOnlineTime");

                    // vm.withdrawFailedData = data.data[1];
                    // vm.withdrawFailedAvg.totalCount = vm.calculateAverageData(vm.withdrawFailedData, "totalCount");
                    // vm.withdrawFailedAvg.count1 = vm.calculateAverageData(vm.withdrawFailedData, "count1");
                    // vm.withdrawFailedAvg.count2 = vm.calculateAverageData(vm.withdrawFailedData, "count2");
                    // vm.withdrawFailedAvg.count3 = vm.calculateAverageData(vm.withdrawFailedData, "count3");
                    // vm.withdrawFailedAvg.count4 = vm.calculateAverageData(vm.withdrawFailedData, "count4");
                    // vm.withdrawFailedAvg.count5 = vm.calculateAverageData(vm.withdrawFailedData, "count5");
                    // vm.withdrawFailedAvg.count6 = vm.calculateAverageData(vm.withdrawFailedData, "count6");
                    // vm.withdrawFailedAvg.count7 = vm.calculateAverageData(vm.withdrawFailedData, "count7");
                    // vm.withdrawFailedAvg.count8 = vm.calculateAverageData(vm.withdrawFailedData, "count8");
                    // vm.withdrawFailedAvg.count9 = vm.calculateAverageData(vm.withdrawFailedData, "count9");
                    //
                    // let withdrawFailedPieArr = [];
                    // let pieLabel2 = ["WITHDRAWAL_FAILED_TOTAL_TIMES", "0~1", "1~3", "3~5", "5~10", "10~20", "20~30", "30~45", "45~60", "60"];
                    // for (let j = 0; j < Object.keys(vm.withdrawFailedAvg).length; j++) {
                    //     if (j == 0) {
                    //         continue;
                    //     }
                    //     let pieObj = {
                    //         count: vm.withdrawFailedAvg[Object.keys(vm.withdrawFailedAvg)[j]]
                    //     };
                    //     pieObj.label = pieLabel2[j] + $translate("mins");
                    //     if (j == 9) {
                    //         pieObj.label = pieObj.label + $translate("above");
                    //     }
                    //     withdrawFailedPieArr.push(pieObj)
                    // }
                    // vm.drawManualApprovalPieChart(withdrawFailedPieArr,"#pie-withdrawFailed");

                });

                },
            err => {
                    vm.isShowLoadingSpinner('#withdrawalSpeedAnalysis', false);
                    console.log("Failed to retrieve the data", err);
            })
        };

        vm.clickWithdrawDetail = function (proposalObjId) {
            if (proposalObjId && proposalObjId.length) {
                $scope.$socketPromise('getProposalByObjId', {proposalObjId}).then(res => {
                    if (res.data) {
                        vm.withdrawDataToDraw = res.data.map(item => {
                            item.involveAmount$ = 0;
                            if (item.data.updateAmount) {
                                item.involveAmount$ = item.data.updateAmount;
                            } else if (item.data.amount) {
                                item.involveAmount$ = item.data.amount;
                            } else if (item.data.rewardAmount) {
                                item.involveAmount$ = item.data.rewardAmount;
                            } else if (item.data.commissionAmount) {
                                item.involveAmount$ = item.data.commissionAmount;
                            } else if (item.data.negativeProfitAmount) {
                                item.involveAmount$ = item.data.negativeProfitAmount;
                            }
                            item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                            item.typeName = $translate(item.type.name || "Unknown");
                            item.mainType$ = $translate(item.mainType || "Unknown");
                            if (item.mainType === "PlayerBonus")
                                item.mainType$ = $translate("Bonus");
                            item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                            if (item.data && item.data.remark) {
                                item.remark$ = item.data.remark;
                            }
                            item.status$ = $translate(item.type.name === "BulkExportPlayerData" || item.mainType === "PlayerBonus" || item.mainType === "PartnerBonus" ? vm.getStatusStrfromRow(item) == "Approved" ? "approved" : vm.getStatusStrfromRow(item) : vm.getStatusStrfromRow(item));

                            if (item.hasOwnProperty('creator')) {
                                item.creator$ = item.creator.name;
                            } else {
                                let creator = $translate('System');
                                if (item && item.data && item.data.playerName) {
                                    creator += "(" + item.data.playerName + ")";
                                }
                                item.creator$ = creator;
                            }

                            for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                                if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == item.inputDevice) {
                                    item.inputDevice$ = $translate(Object.keys(vm.inputDevice)[i]);
                                }
                            }

                            if (item && item.data && item.data.PROMO_CODE_TYPE) {
                                item.typeName$ = item.data.PROMO_CODE_TYPE;
                            } else if (item && item.data && item.data.eventName) {
                                item.typeName$ = item.data.eventName;
                            } else {
                                item.typeName$ = item.typeName;
                            }

                            if (item.hasOwnProperty('creator') && item.creator.type == 'player') {
                                item.involvedAcc$ = item.creator.name;
                            }
                            if (item && item.data && item.data.playerName) {
                                item.involvedAcc$ = item.data.playerName;
                            }
                            else if (item && item.data && item.data.partnerName) {
                                item.involvedAcc$ = item.data.partnerName;
                            }
                            else {
                                item.involvedAcc$ = "";
                            }

                            if (item.data && item.data.autoAuditRemarkChinese) {
                                if (item.remark$) {
                                    item.remark$ += item.data.autoAuditRemarkChinese;
                                } else {
                                    item.remark$ = item.data.autoAuditRemarkChinese;
                                }
                            }

                            if (item.data && item.data.rejectRemark) {
                                if (item.remark$) {
                                    item.remark$ += item.data.rejectRemark;
                                } else {
                                    item.remark$ = item.data.rejectRemark;
                                }
                            }

                            return item;
                        })
                        $scope.safeApply();
                    }
                })
            }
        };



        vm.clickForDetail = function(date, code, period, type, status){
            //vm.isShowLoadingSpinner('#manualApprovalAnalysis', true);
            var sendData = {
                period: period,
                startDate: date,
                status: status
            }

            switch (type){
                case 'playerBonus':
                    sendData.typeList = vm.playerBonusProposalTypeList;
                    break;
                case 'updatePlayer':
                    sendData.typeList = vm.updatePlayerProposalTypeList;
                    break;
                case 'updatePartner':
                    sendData.typeList = vm.updatePartnerProposalTypeList;
                    break;
                case 'reward':
                    sendData.typeList = vm.rewardProposalTypeList;
                    break;
                case 'others':
                    sendData.typeList = vm.othersProposalTypeList;
                    break;
                case 'all':
                    sendData.typeList = vm.allProposalTypeList;
                    break;
            }

            $scope.$socketPromise('getSpecificTypeOfManualApprovalRecords', sendData).then( res => {
                if(res.data){
                    vm.dataToDraw = res.data.map(item => {
                        item.involveAmount$ = 0;
                        if (item.data.updateAmount) {
                            item.involveAmount$ = item.data.updateAmount;
                        } else if (item.data.amount) {
                            item.involveAmount$ = item.data.amount;
                        } else if (item.data.rewardAmount) {
                            item.involveAmount$ = item.data.rewardAmount;
                        } else if (item.data.commissionAmount) {
                            item.involveAmount$ = item.data.commissionAmount;
                        } else if (item.data.negativeProfitAmount) {
                            item.involveAmount$ = item.data.negativeProfitAmount;
                        }
                        item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                        item.typeName = $translate(item.type.name || "Unknown");
                        item.mainType$ = $translate(item.mainType || "Unknown");
                        item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                        if (item.data && item.data.remark) {
                            item.remark$ = item.data.remark;
                        }

                        if (item.data && item.data.autoAuditRemarkChinese) {
                            if (item.remark$) {
                                item.remark$ += item.data.autoAuditRemarkChinese;
                            } else {
                                item.remark$ = item.data.autoAuditRemarkChinese;
                            }
                        }

                        if (item.data && item.data.rejectRemark) {
                            if (item.remark$) {
                                item.remark$ += item.data.rejectRemark;
                            } else {
                                item.remark$ = item.data.rejectRemark;
                            }
                        }

                        item.status$ = $translate(item.type.name === "BulkExportPlayerData" || item.mainType === "PlayerBonus" || item.mainType === "PartnerBonus" ? vm.getStatusStrfromRow(item) == "Approved" ? "approved" : vm.getStatusStrfromRow(item) : vm.getStatusStrfromRow(item));

                        if (item.hasOwnProperty('creator')) {
                            item.creator$ = item.creator.name;
                        } else {
                            let creator = $translate('System');
                            if (item && item.data && item.data.playerName) {
                                creator += "(" + item.data.playerName + ")";
                            }
                            item.creator$ = creator;
                        }

                        for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                            if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == item.inputDevice) {
                                item.inputDevice$ = $translate(Object.keys(vm.inputDevice)[i]);
                            }
                        }

                        if (item && item.data && item.data.PROMO_CODE_TYPE) {
                            item.typeName$ = item.data.PROMO_CODE_TYPE;
                        } else if (item && item.data && item.data.eventName) {
                            item.typeName$ = item.data.eventName;
                        } else {
                           item.typeName$ = item.typeName;
                        }

                        if (item.hasOwnProperty('creator') && item.creator.type == 'player') {
                            item.involvedAcc$ = item.creator.name;
                        }
                        if (item && item.data && item.data.playerName) {
                            item.involvedAcc$ = item.data.playerName;
                        }
                        else if (item && item.data && item.data.partnerName) {
                            item.involvedAcc$ = item.data.partnerName;
                        }
                        else {
                            item.involvedAcc$ = "";
                        }

                        return item;
                    })
                    $scope.safeApply();
                }
            })

        };

        vm.drawManualApprovalRate = function () {
            vm.playerBonusAvgData = {};
            vm.updatePlayerAvgData = {};
            vm.othersAvgData = {};
            vm.rewardAvgData = {};
            vm.allAvgData = {};
            vm.updatePartnerAvgData = {};

            vm.isShowLoadingSpinner('#manualApprovalAnalysis', true);
            var sendData = {
                period: vm.queryPara.manualApproval.periodText,
                startDate: vm.queryPara.manualApproval.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.manualApproval.endTime.data('datetimepicker').getLocalDate(),
            }

            $scope.$socketPromise('getAllProposalTypeByPlatformId', {
                platformId: vm.selectedPlatform._id,
            }).then(
                res => {
                    if (res.data && res.data.length > 0){
                        // categorize the proposalType

                        vm.playerBonusProposalTypeList = [];
                        vm.updatePlayerProposalTypeList = [];
                        vm.updatePartnerProposalTypeList = [];
                        vm.rewardProposalTypeList = [];
                        vm.othersProposalTypeList = [];
                        vm.allProposalTypeList = [];


                        res.data.forEach ( inData => {

                            let typeName = null;
                            typeName = utilService.getProposalGroupValue(inData, false);

                            if (typeName){
                                switch (typeName) {
                                    case "Bonus Proposal":
                                        vm.playerBonusProposalTypeList.push(inData._id);
                                        break;
                                    case "PLAYER_INFORMATION":
                                        vm.updatePlayerProposalTypeList.push(inData._id);
                                        break;
                                    case "PARTNER_INFORMATION":
                                        vm.updatePartnerProposalTypeList.push(inData._id);
                                        break;
                                    case "Reward Proposal":
                                        vm.rewardProposalTypeList.push(inData._id);
                                        break;
                                    case "Others":
                                        vm.othersProposalTypeList.push(inData._id);
                                        break;
                                }
                            }
                        })

                        vm.allProposalTypeList = vm.playerBonusProposalTypeList.concat( vm.updatePlayerProposalTypeList,  vm.updatePartnerProposalTypeList, vm.rewardProposalTypeList, vm.othersProposalTypeList);

                        sendData.playerBonus = vm.playerBonusProposalTypeList;
                        sendData.updatePlayerList = vm.updatePlayerProposalTypeList;
                        sendData.updatePartnerList = vm.updatePartnerProposalTypeList;
                        sendData.reward = vm.rewardProposalTypeList;
                        sendData.others = vm.othersProposalTypeList;
                        sendData.all = vm.allProposalTypeList;

                        socketService.$socket($scope.AppSocket, 'getManualApprovalRecords', sendData, function (data) {

                            $scope.$evalAsync(() => {
                                if (!data && !data[0] && !data[1] && !data[2] && !data[3] && !data[4] && !data[5]) {
                                    return Q.reject({name: 'DataError', message: 'Can not find the proposal data'})
                                }

                                vm.isShowLoadingSpinner('#manualApprovalAnalysis', false);

                                // draw playerBonus
                                vm.playerBonusData = data.data[0];
                                vm.playerBonusAvgData.totalCount = vm.calculateAverageData(vm.playerBonusData, "totalCount");
                                vm.playerBonusAvgData.successCount = vm.calculateAverageData(vm.playerBonusData, "successCount");
                                vm.playerBonusAvgData.rejectCount = vm.calculateAverageData(vm.playerBonusData, "rejectCount");
                                vm.playerBonusAvgData.manualCount = vm.calculateAverageData(vm.playerBonusData, "manualCount");

                                vm.drawManualApprovalPieChart([{count:vm.playerBonusAvgData.totalCount-vm.playerBonusAvgData.manualCount, label: $translate("Total_AutoApproval")}, {count: vm.playerBonusAvgData.manualCount, label: $translate("Total_ManualApproval")}], "#pie-playerBonusManualApproval");

                                // draw updatePlayer
                                vm.updatePlayerData = data.data[1];
                                vm.updatePlayerAvgData.totalCount = vm.calculateAverageData(vm.updatePlayerData, "totalCount");
                                vm.updatePlayerAvgData.successCount = vm.calculateAverageData(vm.updatePlayerData,"successCount");
                                vm.updatePlayerAvgData.rejectCount = vm.calculateAverageData(vm.updatePlayerData, "rejectCount");
                                vm.updatePlayerAvgData.manualCount = vm.calculateAverageData(vm.updatePlayerData, "manualCount");

                                vm.drawManualApprovalPieChart([{count:vm.updatePlayerAvgData.totalCount-vm.updatePlayerAvgData.manualCount, label: $translate("Total_AutoApproval")}, {count: vm.updatePlayerAvgData.manualCount, label: $translate("Total_ManualApproval")}], "#pie-updatePlayerManualApproval");

                                // draw updatePartner
                                vm.updatePartnerData = data.data[2];
                                vm.updatePartnerAvgData.totalCount = vm.calculateAverageData(vm.updatePartnerData, "totalCount");
                                vm.updatePartnerAvgData.successCount = vm.calculateAverageData(vm.updatePartnerData, "successCount");
                                vm.updatePartnerAvgData.rejectCount = vm.calculateAverageData(vm.updatePartnerData, "rejectCount");
                                vm.updatePartnerAvgData.manualCount = vm.calculateAverageData(vm.updatePartnerData, "manualCount");

                                vm.drawManualApprovalPieChart([{count:vm.updatePartnerAvgData.totalCount-vm.updatePartnerAvgData.manualCount, label: $translate("Total_AutoApproval")}, {count: vm.updatePartnerAvgData.manualCount, label: $translate("Total_ManualApproval")}], "#pie-updatePartnerManualApproval");

                                // draw reward
                                vm.rewardData = data.data[3];
                                vm.rewardAvgData.totalCount = vm.calculateAverageData(vm.rewardData, "totalCount");
                                vm.rewardAvgData.successCount = vm.calculateAverageData(vm.rewardData, "successCount");
                                vm.rewardAvgData.rejectCount = vm.calculateAverageData(vm.rewardData, "rejectCount");
                                vm.rewardAvgData.manualCount = vm.calculateAverageData(vm.rewardData, "manualCount");

                                vm.drawManualApprovalPieChart([{count:vm.rewardAvgData.totalCount-vm.rewardAvgData.manualCount, label: $translate("Total_AutoApproval")}, {count: vm.rewardAvgData.manualCount, label: $translate("Total_ManualApproval")}], "#pie-rewardManualApproval");

                                // draw others
                                vm.othersData = data.data[4];
                                vm.othersAvgData.totalCount = vm.calculateAverageData(vm.othersData, "totalCount");
                                vm.othersAvgData.successCount = vm.calculateAverageData(vm.othersData, "successCount");
                                vm.othersAvgData.rejectCount = vm.calculateAverageData(vm.othersData, "rejectCount");
                                vm.othersAvgData.manualCount = vm.calculateAverageData(vm.othersData, "manualCount");

                                vm.drawManualApprovalPieChart([{count:vm.othersAvgData.totalCount-vm.othersAvgData.manualCount, label: $translate("Total_AutoApproval")}, {count: vm.othersAvgData.manualCount, label: $translate("Total_ManualApproval")}], "#pie-othersManualApproval");

                                // draw all
                                vm.allManualApprovalData = data.data[5];
                                vm.allAvgData.totalCount = vm.calculateAverageData(vm.allManualApprovalData, "totalCount");
                                vm.allAvgData.successCount = vm.calculateAverageData(vm.allManualApprovalData, "successCount");
                                vm.allAvgData.rejectCount = vm.calculateAverageData(vm.allManualApprovalData, "rejectCount");
                                vm.allAvgData.manualCount = vm.calculateAverageData(vm.allManualApprovalData, "manualCount");

                                vm.drawManualApprovalPieChart([{count:vm.allAvgData.totalCount-vm.allAvgData.manualCount, label: $translate("Total_AutoApproval")}, {count: vm.allAvgData.manualCount, label: $translate("Total_ManualApproval")}], "#pie-allManualApproval");

                            });

                        }, function (data) {
                                vm.isShowLoadingSpinner('#manualApprovalAnalysis', false);
                                console.log("Failed to retrieve the data", data);
                            }
                        )
                    }
                    else{
                        vm.isShowLoadingSpinner('#manualApprovalAnalysis', false);
                        console.log("Failed to retrieve the data", res);
                    }

                }
            );

        };

        vm.drawManualApprovalPieChart = function (srcData, pieChartName) {
            var placeholder = pieChartName;

            var pieData = srcData.filter(function (obj) {
                return (obj.count);
            }).map(function (obj) {
                return {label: obj.label, data: obj.count};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            socketService.$plotPie(placeholder, pieData, {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        //tilt: 0.5,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.80
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                },
                colors: [
                    '#e6194b',
                    '#3cb44b',
                    '#ffe119',
                    '#0082c8',
                    '#f58231',
                    '#911eb4',
                    '#46f0f0',
                    '#f032e6',
                    '#d2f53c',
                    '#fabebe',
                    '#008080',
                    '#10ff10',
                    '#10ffbc',
                    '#bc10ff',
                    '#1010ff',
                    '#c49102',
                    '#e6beff',
                    '#aa6e28',
                    '#fffac8',
                    '#800000',
                    '#aaffc3',
                    '#808000',
                    '#ffd8b1',
                    '#ff1010',
                    '#000080',
                    '#99ee34',
                ],
            }, '');
            vm.bindHoverTitle(pieChartName);
        };
        // manual approval rate end =====================================================
        vm.bindHoverTitle = function(pieChartName){
            $(pieChartName).bind("plothover", function (event, pos, item) {
                console.log(item);
                if (!item || !item.seriesIndex) { return; }
                $('.pieLabel').css('z-index',1);
                $('.pieLabelBackground').css('z-index',1);
                $('#pieLabel'+item.seriesIndex).css('z-index',999).prev('.pieLabelBackground').css('z-index',999);
            });
        };




        // font end registration attrition rate start ===================================================
        vm.drawFrontEndRegistrationAttritionRate = function () {
            vm.playerBonusAvgData = {};
            vm.updatePlayerAvgData = {};
            vm.othersAvgData = {};
            vm.rewardAvgData = {};
            vm.allAvgData = {};
            vm.updatePartnerAvgData = {};

            vm.isShowLoadingSpinner('#registrationAttritionRateAnalysis', true);
            var sendData = {
                period: vm.queryPara.registrationAttritionRate.periodText,
                startDate: vm.queryPara.registrationAttritionRate.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.registrationAttritionRate.endTime.data('datetimepicker').getLocalDate(),
                platform: vm.selectedPlatform._id
            }

            $scope.$socketPromise('getSpecificProposalTypeByName', {platform: vm.selectedPlatform._id, proposalType: "PlayerRegistrationIntention"}).then(
                result => {
                    if (result) {

                        sendData.proposalTypeId = result.data._id;
                        $scope.$socketPromise('getRegistrationClickCountRecords', sendData).then(
                            res => {
                                vm.webRegistration = [];
                                vm.appRegistration = [];
                                vm.H5Registration = [];
                                vm.frontEndRegistration = [];

                                if (res.data && res.data.length > 0) {
                                    vm.registrationRecord = res.data;

                                    vm.registrationRecord.forEach(data => {
                                        let webAvg = (data.webUniqueCount == 0 ? 0 : 1 - data.webCount / data.webUniqueCount).toFixed(2);
                                        let appAvg = (data.appUniqueCount == 0 ? 0 : 1 - data.appCount / data.appUniqueCount).toFixed(2);
                                        let H5Avg = (data.H5UniqueCount == 0 ? 0 : 1 - data.H5Count / data.H5UniqueCount).toFixed(2);
                                        let frontEndAvg = (data.frontEndUniqueCount == 0 ? 0 : 1 - data.frontEndCount / data.frontEndUniqueCount).toFixed(2);

                                        data.webAttritionRate$ = $roundToTwoDecimalPlacesString(webAvg * 100);
                                        data.webAttritionRate = $noRoundTwoDecimalPlaces(webAvg * 100);
                                        data.appAttritionRate$ = $roundToTwoDecimalPlacesString(appAvg * 100);
                                        data.appAttritionRate = $noRoundTwoDecimalPlaces(appAvg * 100);
                                        data.H5AttritionRate$ = $roundToTwoDecimalPlacesString(H5Avg * 100);
                                        data.H5AttritionRate = $noRoundTwoDecimalPlaces(H5Avg * 100);
                                        data.frontEndAttritionRate$ = $roundToTwoDecimalPlacesString(frontEndAvg * 100);
                                        data.frontEndAttritionRate = $noRoundTwoDecimalPlaces(frontEndAvg * 100);
                                    })

                                    // count avg value for web registration
                                    vm.webRegistration.avgCount = vm.calculateAverageData(vm.registrationRecord, 'webCount');
                                    vm.webRegistration.uniqueAvgCount = vm.calculateAverageData(vm.registrationRecord, 'webUniqueCount');
                                    let webAvgVal = (vm.webRegistration.uniqueAvgCount == 0 ? 0 : 1 - vm.webRegistration.avgCount / vm.webRegistration.uniqueAvgCount).toFixed(2);
                                    vm.webRegistration.attritionAvgRate$ = $roundToTwoDecimalPlacesString(webAvgVal * 100);
                                    vm.webRegistration.attritionAvgRate = $noRoundTwoDecimalPlaces(webAvgVal * 100);

                                    let webLineResult = vm.generatedLineDataFromCalculatedAvgValue(vm.registrationRecord, vm.webRegistration.attritionAvgRate, 'webAttritionRate', 'REGISTRATION_ATTRITION_RATE', 'WEB');
                                    vm.plotLineByElementId("#line-webRegistrationAttritionRate", webLineResult.lineData, "WEB" + $translate("REGISTRATION_ATTRITION_RATE"), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.registrationAttritionRate.periodText.toUpperCase()));

                                    // count avg value for app registration
                                    vm.appRegistration.avgCount = vm.calculateAverageData(vm.registrationRecord, 'appCount');
                                    vm.appRegistration.uniqueAvgCount = vm.calculateAverageData(vm.registrationRecord, 'appUniqueCount');
                                    let appAvgVal = (vm.appRegistration.uniqueAvgCount == 0 ? 0 : 1 - vm.appRegistration.avgCount / vm.appRegistration.uniqueAvgCount).toFixed(2);
                                    vm.appRegistration.attritionAvgRate$ = $roundToTwoDecimalPlacesString(appAvgVal * 100);
                                    vm.appRegistration.attritionAvgRate = $noRoundTwoDecimalPlaces(appAvgVal * 100);

                                    let appLineResult = vm.generatedLineDataFromCalculatedAvgValue(vm.registrationRecord, vm.appRegistration.attritionAvgRate, 'appAttritionRate', 'REGISTRATION_ATTRITION_RATE', 'APP');
                                    vm.plotLineByElementId("#line-appRegistrationAttritionRate", appLineResult.lineData, "APP" + $translate("REGISTRATION_ATTRITION_RATE"), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.registrationAttritionRate.periodText.toUpperCase()));

                                    // count avg value for H5 registration
                                    vm.H5Registration.avgCount = vm.calculateAverageData(vm.registrationRecord, 'H5Count');
                                    vm.H5Registration.uniqueAvgCount = vm.calculateAverageData(vm.registrationRecord, 'H5UniqueCount');
                                    let H5AvgVal = (vm.H5Registration.uniqueAvgCount == 0 ? 0 : 1 - vm.H5Registration.avgCount / vm.H5Registration.uniqueAvgCount).toFixed(2);
                                    vm.H5Registration.attritionAvgRate$ = $roundToTwoDecimalPlacesString(H5AvgVal * 100);
                                    vm.H5Registration.attritionAvgRate = $noRoundTwoDecimalPlaces(H5AvgVal * 100);

                                    let H5LineResult = vm.generatedLineDataFromCalculatedAvgValue(vm.registrationRecord, vm.H5Registration.attritionAvgRate, 'H5AttritionRate', 'REGISTRATION_ATTRITION_RATE', 'H5');
                                    vm.plotLineByElementId("#line-H5RegistrationAttritionRate", H5LineResult.lineData, "H5" + $translate("REGISTRATION_ATTRITION_RATE"), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.registrationAttritionRate.periodText.toUpperCase()));


                                    // count avg value for all font-end registation
                                    vm.frontEndRegistration.avgCount = vm.calculateAverageData(vm.registrationRecord, 'frontEndCount');
                                    vm.frontEndRegistration.uniqueAvgCount = vm.calculateAverageData(vm.registrationRecord, 'frontEndUniqueCount');
                                    let frontEndAvgVal = (vm.frontEndRegistration.uniqueAvgCount == 0 ? 0 : 1 - vm.frontEndRegistration.avgCount / vm.frontEndRegistration.uniqueAvgCount).toFixed(2);
                                    vm.frontEndRegistration.attritionAvgRate$ = $roundToTwoDecimalPlacesString(frontEndAvgVal * 100);
                                    vm.frontEndRegistration.attritionAvgRate = $noRoundTwoDecimalPlaces(frontEndAvgVal * 100);

                                    let frontEndLineResult = vm.generatedLineDataFromCalculatedAvgValue(vm.registrationRecord, vm.frontEndRegistration.attritionAvgRate, 'frontEndAttritionRate', 'FRONT_END_REGISTRATION_ATTRITION_RATE');
                                    vm.plotLineByElementId("#line-frontEndRegistrationAttritionRate", frontEndLineResult.lineData, +$translate("FRONT_END_REGISTRATION_ATTRITION_RATE"), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.registrationAttritionRate.periodText.toUpperCase()));

                                    vm.isShowLoadingSpinner('#registrationAttritionRateAnalysis', false);
                                    $scope.safeApply();

                                }
                                else {
                                    vm.isShowLoadingSpinner('#registrationAttritionRateAnalysis', false);
                                    console.log("Failed to retrieve the data");
                                }
                            })
                    }
                    else{
                        vm.isShowLoadingSpinner('#registrationAttritionRateAnalysis', false);
                        console.log("Failed to retrieve the proposalType");
                    }

                })

        };
        // font end registration attrition rate end =====================================================


        //topup method rate start ====================================================
        vm.drawTopupMethodLine = function () {
            vm.isShowLoadingSpinner('#topupMethodAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.topupMethod.periodText,
                startDate: vm.queryPara.topupMethod.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.topupMethod.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'getTopUpMethodAnalysisByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.topupMethodData = data.data;
                    console.log('vm.topupMethodData', vm.topupMethodData);
                    vm.isShowLoadingSpinner('#topupMethodAnalysis', false);

                    vm.drawTopupMethodPie(vm.topupMethodData, "#topupMethodAnalysis");
                    vm.drawTopupMethodTable(vm.topupMethodData, "#topupMethodAnalysisTable");
                })
            }, function (data) {
                vm.isShowLoadingSpinner('#topupMethodAnalysis', false);
                console.log("topup method data not", data);
            });
        }

        vm.drawTopupMethodCountLine = function () {
            let sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.topupMethod.periodText,
                type: 'topup',
                startDate: vm.queryPara.topupMethod.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.topupMethod.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'getTopUpMethodCountByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.topupMethodCountData = data.data;
                    console.log('vm.topupMethodCountData', vm.topupMethodCountData);

                    vm.drawTopupMethodPie(vm.topupMethodCountData, "#topupMethodCountAnalysis");
                    vm.drawTopupMethodTable(vm.topupMethodCountData, "#topupMethodCountAnalysisTable");
                })
            }, function (data) {
                console.log("topup method data not", data);
            });
        }

        vm.drawTopupMethodSuccessHeadCountLine = function () {
            vm.isShowLoadingSpinner('#topupMethodSuccessHeadCountAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.topupMethod.periodText,
                startDate: vm.queryPara.topupMethod.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.topupMethod.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'getTopUpMethodSuccessHeadCountByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.topupMethodSuccessHeadCountData = data.data;
                    console.log('vm.topupMethodSuccessHeadCountData', vm.topupMethodSuccessHeadCountData);
                    vm.isShowLoadingSpinner('#topupMethodSuccessHeadCountAnalysis', false);

                    vm.drawTopupMethodPie(vm.topupMethodSuccessHeadCountData, "#topupMethodSuccessHeadCountAnalysis");
                    vm.drawTopupMethodTable(vm.topupMethodSuccessHeadCountData, "#topupMethodSuccessHeadCountAnalysisTable");
                })
            }, function (data) {
                vm.isShowLoadingSpinner('#topupMethodSuccessHeadCountAnalysis', false);
                console.log("topup method success data not", data);
            });
        }

        vm.drawTopupMethodPie = function (srcData, pieChartName) {
            let placeholder = pieChartName + ' div.graphDiv';
            let finalizedPieData = [];

            srcData.map(s => {
                let total = 0;
                if(s && s.length > 0){
                    s.map(data => {
                        if(data){
                            let indexNo = finalizedPieData.findIndex(f => f.label == $translate(data._id.topUpType))
                            if(indexNo != -1){
                                finalizedPieData[indexNo].data += data.number;
                            }else{
                                finalizedPieData.push({label: $translate(data._id.topUpType), data: data.number});
                            }
                        }
                    })
                }
            })

            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            var options = {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.8
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0.0
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };

            socketService.$plotPie(placeholder, finalizedPieData, options, 'clientSourceClickData');

        }

        vm.drawTopupMethodTable = function (srcData, tableName) {
            let tableData = [];

            srcData.map(item => {
                if(item && item.length > 0){
                    item.forEach(i => {
                        let indexNo = tableData.findIndex(t => t.date == i._id.date);

                        if(indexNo == -1){
                            tableData.push({date: i._id.date, MANUAL: 0, ALIPAY: 0, ONLINE: 0, WECHAT: 0})
                            indexNo = tableData.findIndex(t => t.date == i._id.date);
                        }

                        if(i._id.topUpType == vm.constPlayerTopUpTypes.MANUAL){
                            tableData[indexNo].MANUAL += i.number;
                        }else if(i._id.topUpType == vm.constPlayerTopUpTypes.ALIPAY){
                            tableData[indexNo].ALIPAY += i.number;
                        }else if(i._id.topUpType == vm.constPlayerTopUpTypes.ONLINE){
                            tableData[indexNo].ONLINE += i.number;
                        }else if(i._id.topUpType == vm.constPlayerTopUpTypes.WECHAT){
                            tableData[indexNo].WECHAT += i.number;
                        }

                    })
                }
            })

            tableData.map(data => {
                if(data){
                    if(data.date){
                        data.date = String(utilService.$getTimeFromStdTimeFormat(new Date(data.date))).substring(0, 10);
                    }
                }
            })

            let manualAverageNo = ((tableData.reduce((a,b) => a + (b.MANUAL ? b.MANUAL : 0),0)) / tableData.length).toFixed(2);
            let alipayAverageNo = ((tableData.reduce((a,b) => a + (b.ALIPAY ? b.ALIPAY : 0),0)) / tableData.length).toFixed(2);
            let onlineAverageNo = ((tableData.reduce((a,b) => a + (b.ONLINE ? b.ONLINE : 0),0)) / tableData.length).toFixed(2);
            let wechatAverageNo = ((tableData.reduce((a,b) => a + (b.WECHAT ? b.WECHAT : 0),0)) / tableData.length).toFixed(2);

            tableData.splice(0,0,{date: $translate('average value'), MANUAL: manualAverageNo, ALIPAY: alipayAverageNo, ONLINE: onlineAverageNo, WECHAT: wechatAverageNo});

            var dataOptions = {
                data: tableData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false, sClass: "text-center"}
                ],
                columns: [
                    {title: $translate(vm.queryPara.topupMethod.periodText), data: "date"},
                    {title: $translate('MANUAL_TOP_UP'), data: "MANUAL"},
                    {title: $translate('ALIPAY'), data: "ALIPAY"},
                    {title: $translate('TOPUPONLINE'), data: "ONLINE"},
                    {title: $translate('WECHAT'), data: "WECHAT"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $(tableName).DataTable(dataOptions);
            a.columns.adjust().draw();
        }
        //topup method rate end =======================================================

        // demo player START ====================================================
        vm.getDemoPlayerAnalysis = function () {
            vm.isShowLoadingSpinner('#demoPlayerAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.demoPlayer.periodText,
                startDate: vm.queryPara.demoPlayer.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.demoPlayer.endTime.data('datetimepicker').getLocalDate(),
            };
            console.log('sendData', sendData);

            socketService.$socket($scope.AppSocket, 'getDemoPlayerAnalysis', sendData, function (data) {
                console.log('getDemoPlayerAnalysis', data);
                $scope.$evalAsync(() => {
                    vm.demoPlayerDeviceData = data.data.deviceGroup;
                    vm.demoPlayerStatusData = data.data.statusGroup;
                    vm.isShowLoadingSpinner('#demoPlayerAnalysis', false);

                    vm.drawDemoPlayerDevicePie(vm.demoPlayerDeviceData, '#demoPlayerAnalysis');
                    vm.drawDemoPlayerDeviceTable(vm.demoPlayerDeviceData, '#demoPlayerDeviceAnalysisTable');
                    vm.drawDemoPlayerStatusPie(vm.demoPlayerStatusData, '#demoPlayerStatusAnalysis');
                    vm.drawDemoPlayerStatusTable(vm.demoPlayerStatusData);
                    vm.drawDemoPlayerConvertRatePie(vm.demoPlayerStatusData, '#demoPlayerConvertRateAnalysis')
                });
            }, function (data) {
                vm.isShowLoadingSpinner('#demoPlayerAnalysis', false);
                console.log("demo player data not found?", data);
            });
        };

        vm.drawDemoPlayerDevicePie = (srcData, pieChartName) => {
            let placeholder = pieChartName + ' div.graphDiv';
            let finalizedPieData = [];

            let deviceTotal = {
                "0": {label: $translate("BACKSTAGE"), data: 0},
                "1": {label: "WEB", data: 0},
                "3": {label: "H5", data: 0},
                "5": {label: "APP", data: 0}
            };

            if (srcData) {
                srcData.map(dateData => {
                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(deviceData => {
                            if (deviceData && deviceData._id && deviceData._id.device && deviceTotal[deviceData._id.device]) {
                                deviceTotal[deviceData._id.device].data += deviceData.calc;
                            }
                        });
                    }
                });
            }

            finalizedPieData.push(deviceTotal["0"]);
            finalizedPieData.push(deviceTotal["1"]);
            finalizedPieData.push(deviceTotal["3"]);
            finalizedPieData.push(deviceTotal["5"]);

            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            var options = {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.8
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0.0
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };

            socketService.$plotPie(placeholder, finalizedPieData, options, 'demoPlayerSourceData');
        };

        vm.drawDemoPlayerDeviceTable = (srcData, tableName) => {
            let deviceTotal = {
                "0": {label: $translate("BACKSTAGE"), data: 0},
                "1": {label: "WEB", data: 0},
                "3": {label: "H5", data: 0},
                "5": {label: "APP", data: 0}
            };
            let dailyDeviceData = [];

            if (srcData) {
                srcData.map(dateData => {
                    let dayData = {
                        date: String(utilService.$getTimeFromStdTimeFormat(new Date(dateData.date))).substring(0, 10),
                        total: 0,
                        WEB: 0,
                        H5: 0,
                        APP: 0,
                        BACKSTAGE: 0
                    };

                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(deviceData => {
                            if (deviceData && deviceData._id && deviceData._id.device && deviceTotal[deviceData._id.device]) {
                                deviceTotal[deviceData._id.device].data += deviceData.calc;
                            }

                            dayData.total += deviceData.calc;

                            switch (deviceData._id.device) {
                                case "0":
                                    dayData.BACKSTAGE += deviceData.calc;
                                    break;
                                case "1":
                                    dayData.WEB += deviceData.calc;
                                    break;
                                case "3":
                                    dayData.H5 += deviceData.calc;
                                    break;
                                case "5":
                                    dayData.APP += deviceData.calc;
                                    break;
                            }
                        });

                    }
                    dailyDeviceData.push(dayData);
                });
            }

            let numberOfPeriod = srcData.length;

            let averageData = {
                date: $translate("average value"),
                total: ((deviceTotal["0"].data + deviceTotal["1"].data + deviceTotal["3"].data + deviceTotal["5"].data) / numberOfPeriod).toFixed(2),
                BACKSTAGE: ((deviceTotal["0"].data) / numberOfPeriod).toFixed(2),
                WEB: ((deviceTotal["1"].data) / numberOfPeriod).toFixed(2),
                H5: ((deviceTotal["3"].data) / numberOfPeriod).toFixed(2),
                APP: ((deviceTotal["5"].data) / numberOfPeriod).toFixed(2)
            };

            dailyDeviceData.splice(0, 0, averageData);

            let dataOptions = {
                data: dailyDeviceData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false, sClass: "text-center"}
                ],
                columns: [
                    {title: $translate(vm.queryPara.demoPlayer.periodText), data: "date"},
                    {title: $translate("TOTAL_REGISTRATION"), data: "total"},
                    {title: 'WEB', data: "WEB"},
                    {title: 'H5', data: "H5"},
                    {title: 'APP', data: "APP"},
                    {title: $translate('BACKSTAGE'), data: "BACKSTAGE"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            let a = $(tableName).DataTable(dataOptions);
            a.columns.adjust().draw();
        };

        vm.drawDemoPlayerStatusPie = (srcData, pieChartName) => {
            let placeholder = pieChartName + ' div.graphDiv';
            let finalizedPieData = [];

            let statusTotal = {
                "1": {label: $translate("OLD_PLAYER"), data: 0},
                "2": {label: $translate("PRE_CONVERT"), data: 0},
                "3": {label: $translate("POST_CONVERT"), data: 0},
                "4": {label: $translate("CANNOT_CONVERT"), data: 0}
            };

            if (srcData) {
                srcData.map(dateData => {
                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(statusData => {
                            if (statusData && statusData._id && statusData._id.status && statusTotal[statusData._id.status]) {
                                statusTotal[statusData._id.status].data += statusData.calc;
                            }
                        });
                    }
                });
            }

            finalizedPieData.push(statusTotal["4"]);
            finalizedPieData.push(statusTotal["1"]);
            finalizedPieData.push(statusTotal["2"]);
            finalizedPieData.push(statusTotal["3"]);

            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            var options = {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.8
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0.0
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };

            socketService.$plotPie(placeholder, finalizedPieData, options, 'demoPlayerStatusData');
        };

        vm.drawDemoPlayerStatusTable = (srcData) => {
            vm.averageData = {};
            vm.dailyStatusData = [];
            let statusTotal = {
                "1": {label: "OLD_PLAYER", data: 0},
                "2": {label: "PRE_CONVERT", data: 0},
                "3": {label: "POST_CONVERT", data: 0},
                "4": {label: "CANNOT_CONVERT", data: 0}
            };
            let dailyStatusData = [];

            if (srcData) {
                srcData.map(dateData => {
                    let dayData = {
                        date: String(utilService.$getTimeFromStdTimeFormat(new Date(dateData.date))).substring(0, 10),
                        total: 0,
                        OLD_PLAYER: 0,
                        PRE_CONVERT: 0,
                        POST_CONVERT: 0,
                        CANNOT_CONVERT: 0
                    };

                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(statusData => {
                            if (statusData && statusData._id && statusData._id.status && statusTotal[statusData._id.status]) {
                                statusTotal[statusData._id.status].data += statusData.calc;
                            }

                            dayData.total += statusData.calc;

                            switch (statusData._id.status) {
                                case "1":
                                    dayData.OLD_PLAYER += statusData.calc;
                                    break;
                                case "2":
                                    dayData.PRE_CONVERT += statusData.calc;
                                    break;
                                case "3":
                                    dayData.POST_CONVERT += statusData.calc;
                                    break;
                                case "4":
                                    dayData.CANNOT_CONVERT += statusData.calc;
                                    break;
                            }
                        });

                    }
                    dailyStatusData.push(dayData);
                });
            }

            let numberOfPeriod = srcData.length;

            let averageData = {
                date: $translate("average value"),
                total: ((statusTotal["1"].data + statusTotal["2"].data + statusTotal["3"].data + statusTotal["4"].data) / numberOfPeriod).toFixed(2),
                OLD_PLAYER: ((statusTotal["1"].data) / numberOfPeriod).toFixed(2),
                PRE_CONVERT: ((statusTotal["2"].data) / numberOfPeriod).toFixed(2),
                POST_CONVERT: ((statusTotal["3"].data) / numberOfPeriod).toFixed(2),
                CANNOT_CONVERT: ((statusTotal["4"].data) / numberOfPeriod).toFixed(2)
            };

            vm.averageData = averageData;
            vm.dailyStatusData = dailyStatusData;
            $('#demoPlayerStatusTable').show();
        };

        vm.drawDemoPlayerConvertRatePie = (srcData, pieChartName) => {
            let placeholder = pieChartName + ' div.graphDiv';
            let finalizedPieData = [];

            let statusTotal = {
                "1": {label: $translate("OLD_PLAYER"), data: 0},
                "2": {label: $translate("PRE_CONVERT"), data: 0},
                "3": {label: $translate("POST_CONVERT"), data: 0},
                "4": {label: $translate("CANNOT_CONVERT"), data: 0}
            };

            if (srcData) {
                srcData.map(dateData => {
                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(statusData => {
                            if (statusData && statusData._id && statusData._id.status && statusTotal[statusData._id.status]) {
                                statusTotal[statusData._id.status].data += statusData.calc;
                            }
                        });
                    }
                });
            }

            // finalizedPieData.push(statusTotal["4"]);
            // finalizedPieData.push(statusTotal["1"]);
            finalizedPieData.push(statusTotal["2"]);
            finalizedPieData.push(statusTotal["3"]);

            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            var options = {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.8
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0.0
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };

            socketService.$plotPie(placeholder, finalizedPieData, options, 'demoPlayerStatusData');
        };
        // demo player END   ====================================================

        // click count START ====================================================
        vm.initSelectButtonClickCount = function (device, pageName) {
            vm.selectedDeleteButton = {};
            vm.selectedDeleteButton.device = device;
            vm.selectedDeleteButton.page = pageName;
            vm.deleteClickCountButton[pageName] = vm.deleteClickCountButton[pageName] || {};
            // for cancel use - before edit
            vm.deleteClickCountButtonCopy = JSON.parse(JSON.stringify(vm.deleteClickCountButton));
            vm.deleteClickCountPageCopy = JSON.parse(JSON.stringify(vm.deleteClickCountPage));

            $("#modalSelectClickCountDomain").modal('show');
        }

        vm.cancelSelectDomainClickCount = function () {
            vm.deleteClickCountButton = JSON.parse(JSON.stringify(vm.deleteClickCountButtonCopy));
            vm.deleteClickCountPage = JSON.parse(JSON.stringify(vm.deleteClickCountPageCopy));
        }

        vm.selectPageButton = function (device, pageName) {
            if (vm.deleteClickCountPage[device] && vm.deleteClickCountPage[device].hasOwnProperty(pageName)) {
                let isSelect = false;
                if (vm.deleteClickCountPage[device][pageName]) {
                    isSelect = true
                }

                if (vm.clickCountDevice) {
                    if (vm.clickCountButtonNameObj[device] && vm.clickCountButtonNameObj[device][pageName] && vm.clickCountButtonNameObj[device][pageName].length) {
                        vm.clickCountButtonNameObj[device][pageName].forEach(domainName => {
                            vm.deleteClickCountButton[device][pageName][domainName] = isSelect;
                        })
                    }
                }
            }
        }

        vm.clickCountDeleteCheckParent = function (device, pageName, domain) {
            if (domain && pageName && device) {
                if (vm.deleteClickCountButton[device][pageName][domain]) {
                    vm.deleteClickCountPage[device][pageName] = true;
                    vm.deleteClickCountDevice[device] = true;
                } else {
                    let isCheckPage = false;
                    let isCheckDevice = false;
                    for (let key in vm.deleteClickCountButton[device][pageName]) {
                        if (vm.deleteClickCountButton[device][pageName][key]) {
                            isCheckPage = true;
                            break;
                        }
                    }
                    if (!isCheckPage) {
                        vm.deleteClickCountPage[device][pageName] = false;
                        for (let key in  vm.deleteClickCountPage[device]) {
                            if (vm.deleteClickCountPage[device][key]) {
                                isCheckDevice = true;
                                break;
                            }
                        }
                        if (!isCheckDevice) {
                            vm.deleteClickCountDevice[device] = false;
                        }
                    }
                }
            } else if (pageName && device) {
                if (vm.deleteClickCountPage[device][pageName]) {
                    vm.deleteClickCountDevice[device] = true;
                } else {
                    let isCheckDevice = false;
                    for (let key in  vm.deleteClickCountPage[device]) {
                        if (vm.deleteClickCountPage[device][key]) {
                            isCheckDevice = true;
                            break;
                        }
                    }
                    if (!isCheckDevice) {
                        vm.deleteClickCountDevice[device] = false;
                    }
                }
            }

        }

        vm.initDeleteClickCountModal = function () {
            vm.deleteClickCountDevice = {};
            vm.deleteClickCountPage = {};
            vm.deleteClickCountButton = {};
            if (vm.clickCountDevice) {
                for (let key in vm.clickCountDevice) {
                    let device = vm.clickCountDevice[key];
                    vm.deleteClickCountPage[device] = {};
                    if (vm.pageNameDataObj && vm.pageNameDataObj[device] && vm.pageNameDataObj[device].length) {
                        vm.pageNameDataObj[device].forEach(pageName => {
                            vm.deleteClickCountButton[device] = vm.deleteClickCountButton[device] || {};
                            vm.deleteClickCountButton[device][pageName] = vm.deleteClickCountButton[device][pageName] || {};
                        })
                    };
                }
            }
            $("#modalDeleteClickCount").modal('show');
        }

        vm.selectDevicePage = function (device) {
            if (vm.deleteClickCountDevice.hasOwnProperty(device) && vm.pageNameDataObj[device]) {
                let isSelect = false;
                if (vm.deleteClickCountDevice[device]) {
                    isSelect = true
                }
                for (let i = 0; i < vm.pageNameDataObj[device].length; i++) {
                    vm.deleteClickCountPage[device][vm.pageNameDataObj[device][i]] = isSelect;
                    vm.selectPageButton(device, vm.pageNameDataObj[device][i]);
                }
            }
        }

        vm.deleteClickCountRecord = function () {
            let isDelete = false; // to avoid delete all data when no data is select
            let sendData = {
                platform: vm.selectedPlatform._id
            };
            for (let device in vm.deleteClickCountDevice) {
                if (vm.deleteClickCountDevice[device] && vm.deleteClickCountPage[device]) {
                    let selectedPage = [];
                    let selectedButtonName = [];
                    for (let page in vm.deleteClickCountPage[device]) {
                        if (vm.deleteClickCountPage[device][page]) {
                            selectedPage.push(page);
                            if (vm.deleteClickCountButton[device][page]) {
                                for (let domain in vm.deleteClickCountButton[device][page]) {
                                    if (vm.deleteClickCountButton[device][page][domain]) {
                                        selectedButtonName.push(domain);
                                    }
                                }
                            }
                        }
                    }

                    if (selectedPage && selectedPage.length && selectedButtonName && selectedButtonName.length) {
                        isDelete = true;
                        if (!sendData["$or"]) {
                            sendData["$or"] = [];
                        }
                        sendData["$or"].push({
                            device: device,
                            pageName: {"$in": selectedPage},
                            buttonName: {"$in": selectedButtonName}
                        })
                    }
                }
            }

            if (isDelete) {
                socketService.$socket($scope.AppSocket, 'deleteClickCountRecord', sendData, function () {
                    console.log("click count record delete success")
                    vm.getClickCountDeviceAndPage();
                })
            }
        }

        vm.getClickCountDeviceAndPage = function () {
            let sendData = {
                platformId: vm.selectedPlatform._id
            };

            socketService.$socket($scope.AppSocket, 'getClickCountDeviceAndPage', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.clickCountDevice = {};
                    vm.deviceData = data.data.device;
                    vm.pageNameDataObj = data.data.devicePage;
                    vm.clickCountDomainObj = data.data.domain;
                    vm.clickCountButtonNameObj = data.data.buttonName;

                    // replace object key with device name
                    for (let i = 0; i < Object.keys(vm.deviceData).length; i++) {
                        vm.clickCountDevice[vm.deviceData[Object.keys(vm.deviceData)[i]]] = vm.deviceData[Object.keys(vm.deviceData)[i]];
                    }

                    // set first device name as default selected device name
                    vm.queryPara.clickCount.inputDevice = vm.clickCountDevice[Object.keys(vm.clickCountDevice)[0]] || "";
                    vm.getClickCountPageName(vm.queryPara.clickCount.inputDevice);
                });
            }, function (data) {
                console.log("clickCount device data not found?", data);
            });
        };

        vm.getClickCountPageName = function (device) {
            vm.clickCountPageName = {};
            vm.pageNameData = vm.pageNameDataObj[device] || [];

            for (let i = 0; i < vm.pageNameData.length; i++) {
                vm.clickCountPageName[vm.pageNameData[i]] = vm.pageNameData[i];
            }

            // set first page name as default selected page name
            vm.queryPara.clickCount.pageName = vm.clickCountPageName[Object.keys(vm.clickCountPageName)[0]] || "";
            vm.getClickCountDomain(vm.queryPara.clickCount.inputDevice, vm.queryPara.clickCount.pageName);

            // let sendData = {
            //     platformId: vm.selectedPlatform._id,
            //     device: device
            // };
            //
            // socketService.$socket($scope.AppSocket, 'getClickCountPageName', sendData, function (data) {
            //     $scope.$evalAsync(() => {
            //         vm.clickCountPageName = {};
            //         vm.pageNameData = data.data;
            //
            //         // replace object key with page name
            //         for (let i = 0; i < Object.keys(vm.pageNameData).length; i++) {
            //             vm.clickCountPageName[vm.pageNameData[Object.keys(vm.pageNameData)[i]]] = vm.pageNameData[Object.keys(vm.pageNameData)[i]];
            //         }
            //
            //         // set first page name as default selected page name
            //         vm.queryPara.clickCount.pageName = vm.clickCountPageName[Object.keys(vm.clickCountPageName)[0]] || "";
            //         vm.getClickCountDomain(vm.queryPara.clickCount.inputDevice, vm.queryPara.clickCount.pageName);
            //     });
            // }, function (data) {
            //     console.log("clickCount page name data not found?", data);
            // });
        };

        vm.getClickCountDomain = function (device, pageName) {
            vm.clickCountDomain = {};
            vm.domainData = vm.clickCountDomainObj[device][pageName] || [];

            //replace object key with domain
            for (let i = 0; i < vm.domainData.length; i++) {
                vm.clickCountDomain[vm.domainData[i]] = vm.domainData[i];
            }

            // set first domain as default selected domain
            vm.queryPara.clickCount.domain = vm.clickCountDomain[Object.keys(vm.clickCountDomain)[0]] || "";
            vm.getClickCountButtonName(vm.queryPara.clickCount.inputDevice, vm.queryPara.clickCount.pageName, vm.queryPara.clickCount.domain);


            // let sendData = {
            //     platformId: vm.selectedPlatform._id,
            //     device: device,
            //     pageName: pageName
            // };
            //
            // socketService.$socket($scope.AppSocket, 'getClickCountDomain', sendData, function (data) {
            //     $scope.$evalAsync(() => {
            //         vm.clickCountDomain = {};
            //         vm.domainData = data.data;
            //
            //         // replace object key with domain
            //         for (let i = 0; i < Object.keys(vm.domainData).length; i++) {
            //             vm.clickCountDomain[vm.domainData[Object.keys(vm.domainData)[i]]] = vm.domainData[Object.keys(vm.domainData)[i]];
            //         }
            //
            //         // set first domain as default selected domain
            //         vm.queryPara.clickCount.domain = vm.clickCountDomain[Object.keys(vm.clickCountDomain)[0]] || "";
            //         vm.getClickCountButtonName(vm.queryPara.clickCount.inputDevice, vm.queryPara.clickCount.pageName, vm.queryPara.clickCount.domain);
            //     });
            // }, function (data) {
            //     console.log("clickCount domain data not found?", data);
            // });
        };

        vm.getClickCountButtonName = function (device, pageName, domain) {
            let sendData = {
                platformId: vm.selectedPlatform._id,
                device: device,
                pageName: pageName,
                domain: domain
            };

            socketService.$socket($scope.AppSocket, 'getClickCountButtonName', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.clickCountButtonName = data.data.sort();
                });
            }, function (data) {
                console.log("clickCount button name data not found?", data);
            });
        };

        vm.getClickCountAnalysis = function (device, pageName, domain) {
            vm.clickCountTable = "clickCountAnalysisTable"+vm.clickCountTimes;
            vm.clickCountTimes2 = vm.clickCountTimes - 1;
            vm.clickCountTable2 = vm.clickCountTable.slice(0, -1) + vm.clickCountTimes2;
            vm.clickCountTableID = '#'+vm.clickCountTable; // new table ID (increment)
            vm.clickCountTableID2 = '#'+vm.clickCountTable2; // previous table ID after first search (need to be replaced)

            // vm.getClickCountButtonName(device, pageName, domain);
            vm.isShowLoadingSpinner('#clickCountAnalysis', true);
            let sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.clickCount.periodText,
                startDate: vm.queryPara.clickCount.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.clickCount.endTime.data('datetimepicker').getLocalDate(),
                device: device,
                pageName: pageName,
                domain: domain
            };

            socketService.$socket($scope.AppSocket, 'getClickCountAnalysis', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.clickCountData = data.data;
                    vm.isShowLoadingSpinner('#clickCountAnalysis', false);
                    // vm.drawClickCountPie(vm.clickCountData, '#clickCountAnalysis'); // draw pie chart
                    vm.drawClickCountBar(vm.clickCountData, '#clickCountAnalysisBar', device, pageName); // draw bar chart

                    if (vm.clickCountTimes === 1) {
                        vm.drawClickCountTable(vm.clickCountData, vm.clickCountTableID); // draw first table
                        vm.clickCountTimes++;
                    } else {
                        $(vm.clickCountTableID2).DataTable().destroy(); // destroy previous table ID
                        $(vm.clickCountTableID2).empty();
                        document.getElementById(vm.clickCountTable2).setAttribute("id",vm.clickCountTable); // replace previous table ID
                        vm.drawClickCountTable(vm.clickCountData, vm.clickCountTableID); // draw new table (2nd table onwards)
                        vm.clickCountTimes++;
                    }
                });
            }, function (data) {
                vm.isShowLoadingSpinner('#clickCountAnalysis', false);
                console.log("click count data not found?", data);
            });
        };

        vm.drawClickCountBar = (srcData, barChartName, device, pageName) => {
            let placeholderBar = barChartName;
            let finalizedBarData = [];
            let click = {};
            let clickTotal = {};
            let totalClick = 0;

            for (let i = 0; i < vm.clickCountButtonName.length; i++) {
                let buttonName = vm.clickCountButtonName[i];
                click[i] = {label: $translate(buttonName), data: 0};
            }

            // replace object key with button label name
            for (let i = 0; i < Object.keys(click).length; i++) {
                clickTotal[click[Object.keys(click)[i]].label] = click[Object.keys(click)[i]];
            }

            if (srcData) {
                srcData.map(dateData => {
                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(buttonData => {
                            if (buttonData && buttonData._id && buttonData._id.buttonName && clickTotal[$translate(buttonData._id.buttonName)]) {
                                clickTotal[$translate(buttonData._id.buttonName)].data += buttonData.total;
                                totalClick += buttonData.total;
                            }
                        });
                    }
                });
            }

            for (let index in clickTotal) {
                finalizedBarData.push(clickTotal[index]);
            }

            // bar chart: highest value on left side
            function descendSort(b,a) {
                if (a.data < b.data)
                    return -1;
                if (a.data > b.data)
                    return 1;
                return 0;
            }

            finalizedBarData.sort(descendSort);

            function barNumberFormatter (value) {
                if (value === 0) return '';
                else return value + ' (' + ((value / totalClick) * 100).toFixed(2) + '%)';
            }

            let barOptions = {
                bars: {
                    numbers: {
                        show: true,
                        formatter: barNumberFormatter
                    },
                    show: true,
                    barWidth: 0.7
                },
                xaxes: [{
                    position: 'bottom',
                    axisLabel: $translate(device) + ", " + $translate(pageName),
                }],
                yaxes: [{
                    position: 'left',
                    axisLabel: $translate('Click Count (Total)'),
                }],
            };

            utilService.actionAfterLoaded('#clickCountAnalysisBar', function () {
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(finalizedBarData), barOptions, vm.getXlabelsFromdata(finalizedBarData));
            });
        };

        vm.drawClickCountPie = (srcData, pieChartName) => {
            let placeholder = pieChartName + ' div.graphDiv';
            let finalizedPieData = [];
            let click = {};
            let clickTotal = {};

            for (let i = 0; i < vm.clickCountButtonName.length; i++) {
                let buttonName = vm.clickCountButtonName[i];
                click[i] = {label: $translate(buttonName), data: 0};
            }

            // replace object key with button label name
            for (let i = 0; i < Object.keys(click).length; i++) {
                clickTotal[click[Object.keys(click)[i]].label] = click[Object.keys(click)[i]];
            }

            if (srcData) {
                srcData.map(dateData => {
                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(buttonData => {
                            if (buttonData && buttonData._id && buttonData._id.buttonName && clickTotal[$translate(buttonData._id.buttonName)]) {
                                clickTotal[$translate(buttonData._id.buttonName)].data += buttonData.total;
                            }
                        });
                    }
                });
            }

            for (let index in clickTotal) {
                finalizedPieData.push(clickTotal[index]);
            }

            function labelFormatter(label, series) {
                return "<div style='font-size:12pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            let options = {
                series: {
                    pie: {
                        show: true
                        // radius: 1,
                        // label: {
                        //     show: true,
                        //     radius: 1,
                        //     formatter: labelFormatter,
                        //     background: {
                        //         opacity: 0.8
                        //     }
                        // },
                        // combine: {
                        //     color: "#999",
                        //     threshold: 0.0
                        // }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };

            socketService.$plotPie(placeholder, finalizedPieData, options, 'clickCountData');
        };

        vm.drawClickCountTable = (srcData, tableName) => {
            let dailyClickData = [];
            let click = {};
            let clickTotal = {};

            for (let i = 0; i < vm.clickCountButtonName.length; i++) {
                let buttonName = vm.clickCountButtonName[i];
                click[i] = {label: $translate(buttonName), data: 0};
            }

            // replace object key with button label name
            for (let i = 0; i < Object.keys(click).length; i++) {
                clickTotal[click[Object.keys(click)[i]].label] = click[Object.keys(click)[i]];
            }

            if (srcData) {
                srcData.map(dateData => {
                    let dayData = {
                        date: String(utilService.$getTimeFromStdTimeFormat(new Date(dateData.date))).substring(0, 10),
                        total: 0,
                    };

                    for (let x = 0; x < vm.clickCountButtonName.length; x++) {
                        let buttonName = vm.clickCountButtonName[x];
                        dayData[$translate(buttonName)] = 0;
                    }

                    if (dateData && dateData.data instanceof Array) {
                        dateData.data.map(buttonData => {
                            if (buttonData && buttonData._id && buttonData._id.buttonName && clickTotal[$translate(buttonData._id.buttonName)]) {
                                clickTotal[$translate(buttonData._id.buttonName)].data += buttonData.total;
                            }

                            dayData.total += buttonData.total;
                            dayData[$translate(buttonData._id.buttonName)] += buttonData.total;
                        });
                    }

                    dailyClickData.push(dayData);
                });
            }

            let numberOfPeriod = srcData.length;

            let averageData = {
                date: $translate("average value"),
                total: 0,
            };

            for (let x = 0; x < vm.clickCountButtonName.length; x++) {
                let buttonName = vm.clickCountButtonName[x];
                averageData.total += clickTotal[$translate(buttonName)].data;
                averageData[$translate(buttonName)] = ((clickTotal[$translate(buttonName)].data) / numberOfPeriod).toFixed(2);
            }
            averageData.total = (averageData.total / numberOfPeriod).toFixed(2);

            dailyClickData.splice(0, 0, averageData);

            let dataOptions = {
                data: dailyClickData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false, sClass: "text-center"}
                ],
                columns: [
                    {title: $translate(vm.queryPara.clickCount.periodText), data: "date", sTitle: $translate(vm.queryPara.clickCount.periodText), mData: "date"},
                    {title: $translate('TOTAL_CLICK_COUNT'), data: "total", sTitle: $translate('TOTAL_CLICK_COUNT'), mData: "total"},
                ],
                "paging": false,
            };

            for (let x = 0; x < vm.clickCountButtonName.length; x++) {
                let buttonName = vm.clickCountButtonName[x];
                let buttonObj = {title: $translate(buttonName), data: $translate(buttonName), sTitle: $translate(buttonName), mData: $translate(buttonName)};
                dataOptions.columns[x+2] = buttonObj; // first 2 columns already populated
            }

            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            let aTable = $(tableName).DataTable(dataOptions);
            aTable.columns.adjust().draw();
        };
        // click count END   ====================================================

        // new player start =============================================
        vm.getNextDateByPeriodAndDate = (period, startDate) => {
            let date = new Date(startDate);
            switch (period) {
                case 'day':
                    date = new Date(date.setDate(date.getDate() + 1));
                    break;
                case 'week':
                    date = new Date(date.setDate(date.getDate() + 7));
                    break;
                case 'biweekly':
                    date = new Date(date.setDate(date.getDate() + 15));
                    break;
                case 'month':
                    date = new Date(new Date(date.setMonth(date.getMonth() + 1)).setDate(1));
                    break;
                case 'season':
                    date = new Date(new Date(date.setMonth(date.getMonth() + 3)).setDate(1));
                    break
            }
            return date;
        };

        vm.isShowLoadingSpinner = (containerId, isShow) => {
            let loadingSpinner = "<i style='width: auto;' class='fa fa-spin fa-refresh margin-left-5 text-danger collapse'></i>";
            if (isShow)
                if ($(containerId).children('.block-query').length !== 0)
                    $(containerId).children('.block-query').find("button.common-button").parent().append(loadingSpinner);
                else
                    $(containerId).find("button.common-button").parent().append(loadingSpinner);
            else
                $(containerId + ' .fa.fa-spin.fa-refresh').remove();
        };

        vm.plotNewPlayerLine = function () {
            // var placeholder = "#line-newPlayer";
            // var periodText = $('#analysisNewPlayer select').val();

            let startDate = vm.queryPara.newPlayer.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.newPlayer.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                //period: vm.queryPara.newPlayer.periodText,
                startDate: startDate,
                endDate: endDate,
            };

            switch (vm.queryPara.newPlayer.userType) {
                case 'all':
                   sendData.isRealPlayer = true;
                   sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            vm.isShowLoadingSpinner('#newPlayerAnalysis', true);
            socketService.$socket($scope.AppSocket, 'countNewPlayerbyPlatform', sendData, function success(data1) {
                //var newPlayerData = data1.data[0];
                let periodDateData = [];
                while (startDate.getTime() <= endDate.getTime()) {
                    let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.newPlayer.periodText, startDate);
                    periodDateData.push(startDate);
                    startDate = dayEndTime;
                }
                //vm.platformNewPlayerAnalysisData = data1.data[0];
                vm.platformNewPlayerData = data1.data;
                vm.platformNewPlayerAnalysisData = [];
                for(let i = 0; i<periodDateData.length; i++){
                    let newPlayerWithinPeriod = vm.platformNewPlayerData.filter(player => new Date(player.registrationTime).getTime() >= periodDateData[i].getTime() && new Date(player.registrationTime).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.newPlayer.periodText, periodDateData[i]));
                    vm.platformNewPlayerAnalysisData.push({
                        date: periodDateData[i],
                        players: newPlayerWithinPeriod,
                        topupPlayer: newPlayerWithinPeriod.filter(player => player.topUpTimes > 0 ),
                        multiTopupPlayer: newPlayerWithinPeriod.filter(player => player.topUpTimes > 1),
                        validPlayer: newPlayerWithinPeriod.filter(player => player.topUpTimes >= vm.partnerLevelConfig.validPlayerTopUpTimes && player.topUpSum >= vm.partnerLevelConfig.validPlayerTopUpAmount && player.consumptionTimes >= vm.partnerLevelConfig.validPlayerConsumptionTimes && player.consumptionSum >= vm.partnerLevelConfig.validPlayerConsumptionAmount && player.valueScore >= vm.partnerLevelConfig.validPlayerValue),
                    });
                }
                vm.platformNewPlayerDataPeriodText = vm.queryPara.newPlayer.periodText;
                console.log('vm.platformNewPlayerAnalysisData', vm.platformNewPlayerAnalysisData);

                let calculatedNewPlayerData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'players', 'New Players');
                vm.platformNewPlayerAverage = calculatedNewPlayerData.average;
                vm.plotLineByElementId("#line-newPlayer", calculatedNewPlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));

                let calculatedNewPlayerTopupData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'topupPlayer', 'Player with Top-ups');
                vm.platformNewPlayerTopupAverage = calculatedNewPlayerTopupData.average;
                vm.plotLineByElementId("#line-newPlayerTopup", calculatedNewPlayerTopupData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));

                let calculatedNewPlayerMultiTopupData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'multiTopupPlayer', 'Player with Top-ups Multiple Times');
                vm.platformNewPlayerMultiTopupAverage = calculatedNewPlayerMultiTopupData.average;
                vm.plotLineByElementId("#line-newPlayerMultiTopup", calculatedNewPlayerMultiTopupData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));

                let calculatedNewPlayerValidPlayerData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'validPlayer', 'Valid Player');
                vm.platformNewPlayerValidPlayerAverage = calculatedNewPlayerValidPlayerData.average;
                vm.plotLineByElementId("#line-newPlayerValidPlayer", calculatedNewPlayerValidPlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));
                vm.isShowLoadingSpinner('#newPlayerAnalysis', false);
                $scope.safeApply();
            });

        }
        vm.calculateLineDataAndAverage = (data, key, label) => {
            var graphData = [];
            let averageData = [];
            let average = data.length !== 0 ?Math.floor(data.reduce((a, item) => a + (Number.isFinite(item[key]) ? item[key] : item[key].length), 0) / data.length) : 0;
            data.map(item => {
                graphData.push([new Date(item.date), Number.isFinite(item[key]) ? item[key] : item[key].length]);
                averageData.push([new Date(item.date), average]);
            })
            return {lineData: [{label: $translate(label), data: graphData},{label: $translate('average line'), data: averageData}], average: average};
        };
        vm.getPartnerLevelConfig = function () {
            return $scope.$socketPromise('getPartnerLevelConfig', {platform: vm.selectedPlatform._id})
                .then(function (data) {
                    vm.partnerLevelConfig = data.data[0];
                    $scope.safeApply();
                });
        };
        vm.plotLineByElementId = (elementId, data, yLabel, xLabel) => {
            var newOptions = {
                xaxis: {
                    tickLength: 0,
                    mode: "time",
                    minTickSize: [1, vm.queryPara.newPlayer.periodText],
                }
            };

            newOptions.yaxes = [{
                position: 'left',
                axisLabel: yLabel,
            }];
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: xLabel,
            }];

            newOptions.colors = ["#00afff", "#FF0000",'#00ff00'];
            socketService.$plotLine(elementId, data, newOptions);
            $(elementId).bind("plothover", function (event, pos, obj) {
                var previousPoint;
                if (!obj) {
                    $("#tooltip").hide();
                    previousPoint = null;
                    return;
                } else {
                    if (previousPoint != obj.dataIndex) {
                        previousPoint = obj.dataIndex;

                        var x = obj.datapoint[0],
                            y = $noRoundTwoDecimalPlaces(obj.datapoint[1]);

                        var date = new Date(x);
                        var dateString = utilService.getFormatDate(date)
                        // console.log('date', x, date);
                        $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.newPlayer.periodText) + " : " + dateString)
                            .css({top: obj.pageY + 5, left: obj.pageX + 5})
                            .fadeIn(200);
                    }
                }
            });
        };
        vm.plotComboLineBarByElementId = (elementId, data, xLabel) => {
            if (data && data.length > 0) {
                let leftAxis = data[0];
                let rightAxis = data[1];

                let yLabelLeft = leftAxis.label;
                let yLabelRight = rightAxis.label;

                let newOptions = {
                    xaxis: {
                        axisLabel: xLabel,
                        axisLabelUseCanvas: true,
                        tickLength: 0,
                        mode: "time",
                        minTickSize: [1, vm.queryPara.newPlayer.periodText],
                    },
                    yaxes: [{
                        axisLabel: yLabelLeft,
                        axisLabelUseCanvas: true
                    }, {
                        position: "right",
                        axisLabel: yLabelRight,
                        axisLabelUseCanvas: true
                    }]
                };

                let dataSet = [
                    {
                        label: yLabelLeft,
                        data: leftAxis.data,
                        bars: {
                            show: true,
                            align: "center",
                            barWidth: 24 * 60 * 60 * 600,
                            lineWidth: 1
                        }
                    },
                    {
                        label: yLabelRight,
                        data: rightAxis.data,
                        yaxis: 2
                    }
                ];

                $.plot(elementId, dataSet, newOptions);
            }
        };

        // new player end   =============================================

        // active Player start= =========================================
        vm.plotActivePlayerLine = function () {
            let startDate = vm.queryPara.activePlayer.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.activePlayer.endTime.data('datetimepicker').getLocalDate();
            //var placeholder = "#line-activePlayer";
            // var periodText = $('#analysisActivePlayer select').val();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.activePlayer.periodText,
                startDate: startDate,
                endDate: endDate,
            };

            switch (vm.queryPara.activePlayer.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            vm.isShowLoadingSpinner('#activePlayerAnalysis', true);
            vm.isLoadingctivePlayer = true;
            socketService.$socket($scope.AppSocket, 'countActivePlayerbyPlatform', sendData, function success(data1) {
                vm.platformActivePlayerDataPeriodText = vm.queryPara.activePlayer.periodText;
                vm.platformActivePlayerAnalysisData = [];
                Object.keys(data1.data).forEach(function(key) {
                    vm.platformActivePlayerAnalysisData.push({date: new Date(key), number: data1.data[key]});
                });
                console.log('vm.platformActivePlayerAnalysisData', vm.platformActivePlayerAnalysisData);
                let calculatedActivePlayerData = vm.calculateLineDataAndAverage(vm.platformActivePlayerAnalysisData, 'number', 'Active Player');
                vm.platformActivePlayerAverage = calculatedActivePlayerData.average;
                vm.plotLineByElementId("#line-activePlayer", calculatedActivePlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.activePlayer.periodText.toUpperCase()));
                vm.isShowLoadingSpinner('#activePlayerAnalysis', false);
                vm.isLoadingctivePlayer = false;
                $scope.safeApply();
            },() => {
                vm.isShowLoadingSpinner('#activePlayerAnalysis', false);
                vm.isLoadingctivePlayer = false;
            });
        }
        // active Player end= =========================================

        // valid active Player start==========================================

        //Find unique elements exit in 2 arrays
        function andArraysForValidActivePlayer(array1, array2) {
            let res = [];
            let has = {};
            for (let i = 0, max = array1.length; i < max; i++) {
                has[array1[i]._id._id] = true;
            }
            for (let i = 0, max = array2.length; i < max; i++) {
                if (has[array2[i]._id._id]) {
                    res.push(array2[i]);
                }
            }
            return res;
        }


        //Find elements that are in array2 but not array1
        function difArraysForValidActivePlayer (array1, array2) {
            var res = [];
            var has = {};
            for (let i = 0, max = array1.length; i < max; i++) {
                has[array1[i]._id._id] = true;
            }
            for (let i = 0, max = array2.length; i < max; i++) {
                if (!has[array2[i]._id._id]) {
                    res.push(array2[i]);
                }
            }
            return res;
        }

        vm.compareValidActivePlayerDataBetweenPeriod = (previousPeriodData, currentPeriodData, period) => {
            let previousPeriodPlayerData = previousPeriodData.playerData;
            let currentPeriodPlayerData = currentPeriodData.playerData;
            let previousPeriodDate = previousPeriodData.date;
            let currentPeriodDate = currentPeriodData.date;
            let nextPeriodDate = vm.getNextDateByPeriodAndDate(period, currentPeriodDate);

            let lostPlayerData = difArraysForValidActivePlayer(currentPeriodPlayerData, previousPeriodPlayerData);
            let activePlayerData = andArraysForValidActivePlayer(previousPeriodPlayerData, currentPeriodPlayerData);
            let growPlayerData = difArraysForValidActivePlayer(previousPeriodPlayerData, currentPeriodPlayerData);

            // DEFINE of
            // Active: player active in both period (previous period & current period)
            // Grow: player active in current period, but not active in previous period
            // Lost: player active in previous period, but not active in current period

            //  Active
            let activeNewPlayer = activePlayerData.filter(player =>
                new Date(player._id.registrationTime).getTime() >= previousPeriodDate.getTime() &&
                new Date(player._id.registrationTime).getTime() < currentPeriodDate.getTime());
            let activeOldPlayer = activePlayerData.filter(player =>
                new Date(player._id.registrationTime).getTime() < previousPeriodDate.getTime() ||
                new Date(player._id.registrationTime).getTime() >= currentPeriodDate.getTime());
            // Grow
            let growPreviousPeriodNewPlayer = growPlayerData.filter(player =>
                new Date(player._id.registrationTime).getTime() >= previousPeriodDate.getTime() &&
                new Date(player._id.registrationTime).getTime() < currentPeriodDate.getTime());
            let growCurrentPeriodNewPlayer = growPlayerData.filter(player =>
                new Date(player._id.registrationTime).getTime() >= currentPeriodDate.getTime() &&
                new Date(player._id.registrationTime).getTime() < nextPeriodDate.getTime());
            let growOldPlayer = growPlayerData.filter(player =>
                new Date(player._id.registrationTime).getTime() < previousPeriodDate.getTime());
            // Lost
            let lostPreviousPeriodNewPlayer = lostPlayerData.filter(player =>
                new Date(player._id.registrationTime).getTime() >= previousPeriodDate.getTime() &&
                new Date(player._id.registrationTime).getTime() < currentPeriodDate.getTime());
            let lostOldPlayer = lostPlayerData.filter(player =>
                new Date(player._id.registrationTime).getTime() < previousPeriodDate.getTime() ||
                new Date(player._id.registrationTime).getTime() >= currentPeriodDate.getTime());

            let totalGrow = growPreviousPeriodNewPlayer.length + growCurrentPeriodNewPlayer.length + growOldPlayer.length;
            let totalLost = lostPreviousPeriodNewPlayer.length + lostOldPlayer.length;
            let totalNetGrow = totalGrow - totalLost;
            return {
                date: previousPeriodDate,
                totalPlayerCount: previousPeriodPlayerData.length,
                activeNewPlayer: activeNewPlayer,
                activeOldPlayer: activeOldPlayer,
                growPreviousPeriodNewPlayer: growPreviousPeriodNewPlayer,
                growCurrentPeriodNewPlayer: growCurrentPeriodNewPlayer,
                growOldPlayer: growOldPlayer,
                lostPreviousPeriodNewPlayer: lostPreviousPeriodNewPlayer,
                lostOldPlayer: lostOldPlayer,
                totalGrow: totalGrow,
                totalLost: totalLost,
                totalNetGrow: totalNetGrow,
            }
        };

        vm.plotValidActivePlayerLine = function () {
            let startDate = vm.queryPara.validActivePlayer.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.validActivePlayer.endTime.data('datetimepicker').getLocalDate();
            //var placeholder = "#line-activePlayer";
            // var periodText = $('#analysisActivePlayer select').val();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.validActivePlayer.periodText,
                startDate: startDate,
                endDate: endDate,
            };
            switch (vm.queryPara.validActivePlayer.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }
            vm.isShowLoadingSpinner('#validActivePlayerAnalysis', true);
            vm.isLoadingValidActivePlayer = true;

            socketService.$socket($scope.AppSocket, 'countValidActivePlayerbyPlatform', sendData, function success(data1) {
                $scope.$evalAsync(() => {
                    vm.platformValidActivePlayerDataPeriodText = vm.queryPara.validActivePlayer.periodText;
                    vm.platformValidActivePlayerAnalysisData = [];
                    Object.keys(data1.data).forEach(function(key) {
                        vm.platformValidActivePlayerAnalysisData.push({date: new Date(key), playerData: data1.data[key]});
                    });

                    vm.platformValidActivePlayerAnalysisCalculatedData = [];
                    for(let i = vm.platformValidActivePlayerAnalysisData.length; i > 1; i--){
                        vm.platformValidActivePlayerAnalysisCalculatedData.push(
                            vm.compareValidActivePlayerDataBetweenPeriod(vm.platformValidActivePlayerAnalysisData[i - 2], vm.platformValidActivePlayerAnalysisData[i - 1], vm.platformValidActivePlayerDataPeriodText)
                        );
                    };
                    console.log('vm.platformValidActivePlayerAnalysisData', vm.platformValidActivePlayerAnalysisData);
                    console.log('vm.platformValidActivePlayerAnalysisCalculatedData', vm.platformValidActivePlayerAnalysisCalculatedData);
                    let calculatedValidActivePlayerData = vm.calculateLineDataAndAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'totalPlayerCount', 'ValidActivePlayer');
                    vm.platformValidActivePlayerAverage = {
                        calculatedValidActivePlayerData: calculatedValidActivePlayerData.average,
                        calculatedActiveNewPlayerData: vm.calculateDataAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'activeNewPlayer'),
                        calculatedActiveOldPlayerData: vm.calculateDataAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'activeOldPlayer'),
                        calculatedGrowPreviousPeriodNewPlayerData: vm.calculateDataAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'growPreviousPeriodNewPlayer'),
                        calculatedGrowCurrentPeriodNewPlayerData: vm.calculateDataAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'growCurrentPeriodNewPlayer'),
                        calculatedGrowOldPlayerData: vm.calculateDataAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'growOldPlayer'),
                        calculatedLostPreviousPeriodNewPlayerData: vm.calculateDataAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'lostPreviousPeriodNewPlayer'),
                        calculatedLostOldPlayerData: vm.calculateDataAverage(vm.platformValidActivePlayerAnalysisCalculatedData, 'lostOldPlayer'),
                    };
                    let totalActivePlayerValidPlayer = vm.platformValidActivePlayerAnalysisCalculatedData.reduce((a, data) => a + data.totalPlayerCount,0);
                    vm.platformValidActivePlayerAverageRatio = {
                        calculatedActiveNewPlayerRatio: vm.calculateValidActivePlayerDataRatio(totalActivePlayerValidPlayer, vm.platformValidActivePlayerAnalysisCalculatedData, 'activeNewPlayer'),
                        calculatedActiveOldPlayerRatio: vm.calculateValidActivePlayerDataRatio(totalActivePlayerValidPlayer, vm.platformValidActivePlayerAnalysisCalculatedData, 'activeOldPlayer'),
                        calculatedGrowPreviousPeriodNewPlayerRatio: vm.calculateValidActivePlayerDataRatio(totalActivePlayerValidPlayer, vm.platformValidActivePlayerAnalysisCalculatedData, 'growPreviousPeriodNewPlayer'),
                        calculatedGrowCurrentPeriodNewPlayerRatio: vm.calculateValidActivePlayerDataRatio(totalActivePlayerValidPlayer, vm.platformValidActivePlayerAnalysisCalculatedData, 'growCurrentPeriodNewPlayer'),
                        calculatedGrowOldPlayerRatio: vm.calculateValidActivePlayerDataRatio(totalActivePlayerValidPlayer, vm.platformValidActivePlayerAnalysisCalculatedData, 'growOldPlayer'),
                        calculatedLostPreviousPeriodNewPlayerRatio: vm.calculateValidActivePlayerDataRatio(totalActivePlayerValidPlayer, vm.platformValidActivePlayerAnalysisCalculatedData, 'lostPreviousPeriodNewPlayer'),
                        calculatedLostOldPlayerRatio: vm.calculateValidActivePlayerDataRatio(totalActivePlayerValidPlayer, vm.platformValidActivePlayerAnalysisCalculatedData, 'lostOldPlayer'),
                    };
                    vm.plotLineByElementId("#line-validActivePlayer", calculatedValidActivePlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.validActivePlayer.periodText.toUpperCase()));
                    /**********Calculate validActivePlayerGrowAndLost lineGraph Data**************/
                    let totalGrow = [];
                    let totalLost = [];
                    let totalNetGrow = [];

                    let totalNewActivePlayer = [];
                    let totalOldActivePlayer = [];

                    vm.platformValidActivePlayerAnalysisCalculatedData.forEach(data => {
                        totalGrow.push([new Date(data.date), data.totalGrow]);
                        totalLost.push([new Date(data.date), data.totalLost]);
                        totalNetGrow.push([new Date(data.date), data.totalNetGrow]);

                        totalNewActivePlayer.push([new Date(data.date), data.activeNewPlayer.length]);
                        totalOldActivePlayer.push([new Date(data.date), data.activeOldPlayer.length]);
                    });
                    let validActivePlayerGrowAndLostLineData = [
                        {label: $translate('totalGrow'), data: totalGrow},
                        {label: $translate('totalLost'), data: totalLost},
                        {label: $translate('totalNetGrow'), data: totalNetGrow}
                    ];

                    let validActivePlayerComboData = [
                        {label: $translate('active') + $translate('(old player)') + $translate("HEAD_COUNT"), data: totalOldActivePlayer},
                        {label: $translate('active') + $translate('(previous period new player)') + $translate("HEAD_COUNT"), data: totalNewActivePlayer},
                    ];

                    vm.plotLineByElementId(
                        "#line-validActivePlayerGrowAndLost",
                        validActivePlayerGrowAndLostLineData,
                        $translate('AMOUNT'),
                        $translate('PERIOD') + ' : ' + $translate(vm.queryPara.validActivePlayer.periodText.toUpperCase())
                    );
                    vm.plotComboLineBarByElementId(
                        "#line-validActivePlayerCombo",
                        validActivePlayerComboData,
                        $translate('PERIOD') + ' : ' + $translate(vm.queryPara.validActivePlayer.periodText.toUpperCase())
                    );
                    vm.isShowLoadingSpinner('#validActivePlayerAnalysis', false);
                    vm.isLoadingValidActivePlayer = false;
                })
            },() => {
                vm.isShowLoadingSpinner('#activePlayerAnalysis', false);
                vm.isLoadingValidActivePlayer = false;
            });
        };
        vm.calculateValidActivePlayerDataRatio = (totalCount, data, key) => {
            return $noRoundTwoDecimalPlaces(totalCount === 0 ? 0 : data.reduce((a, data) => a + data[key].length,0) / totalCount * 100);
        };

        vm.calculateDataAverage = (data, key) => {
            return data.length !== 0 ?Math.floor(data.reduce((a, item) => a + (Number.isFinite(item[key]) ? item[key] : item[key].length), 0) / data.length) : 0;
        };
        // valid active Player end==========================================

        // login Player start= =========================================
        vm.plotLoginPlayerLine = function () {
            //todo::add graph code here
            vm.isShowLoadingSpinner('#loginPlayerAnalysis', true);
            var placeholder = "#line-loginPlayer";
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.loginPlayer.periodText,
                startDate: vm.queryPara.loginPlayer.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.loginPlayer.endTime.data('datetimepicker').getLocalDate(),
            };

            switch (vm.queryPara.loginPlayer.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }
            // only display player without duplicate login
            sendData.isDuplicateLogin = false;

            socketService.$socket($scope.AppSocket, 'countLoginPlayerDevicebyPlatform', sendData, function success(data1) {
                $scope.$evalAsync(() => {
                    vm.avgTotalPlayerLogin = { avg:0, device:{ 'WEB':0,'H5':0, 'APP-ANDROID':0,'APP-IOS':0,'PC-DOWNLOAD':0 } };
                    vm.avgPlayerLogin = 0;
                    vm.platformLoginPlayerDataPeriodText = vm.queryPara.loginPlayer.periodText;
                    vm.platformLoginPlayerAnalysisData = vm.sumTotalDeviceType(data1, false, 1);
                    vm.platformLoginPlayerGraphData = data1.data.map(item => {
                        let graphData = {
                            date:item._id,
                            number:item.playerLogin
                        }
                        return graphData;
                    });

                    let calculatedLoginPlayerData = vm.calculateLineDataAndAverage(vm.platformLoginPlayerGraphData, 'number', 'Login Player');
                    vm.platformLoginPlayerAverage = calculatedLoginPlayerData.average;
                    vm.plotLineByElementId("#line-loginPlayer", calculatedLoginPlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.loginPlayer.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#loginPlayerAnalysis', false);
                });
            });
        };
        // login Player end= =========================================

        // Login Player Device start= =========================================
        vm.plotLoginPlayerDeviceLine = function () {
            //todo::add graph code here
            vm.isShowLoadingSpinner('#loginPlayerDeviceAnalysis', true);
            var placeholder = "#line-loginPlayer";
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.loginPlayerDevice.periodText,
                // startDate: vm.queryPara.loginPlayer.startTime,
                // endDate: vm.queryPara.loginPlayer.endTime,
                startDate: vm.queryPara.loginPlayerDevice.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.loginPlayerDevice.endTime.data('datetimepicker').getLocalDate(),
            };

            switch (vm.queryPara.loginPlayerDevice.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            // only display player with duplicate login
            sendData.isDuplicateLogin = true;

            socketService.$socket($scope.AppSocket, 'countLoginPlayerDevicebyPlatform', sendData, function success(data1) {
                $scope.$evalAsync(() => {
                    vm.avgTotalDevice = { avg:0, device:{ 'WEB':0,'H5':0, 'APP-ANDROID':0,'APP-IOS':0,'PC-DOWNLOAD':0 } };
                    vm.platformLoginPlayerDeviceAnalysisData = data1.data;

                    var data = vm.sumTotalDeviceType(data1, true, 2);
                    var pieData = []
                    Object.keys(data).forEach(item=>{
                        if(item!='total'){
                            pieData.push({label: vm.setGraphName(item), data: data[item]});
                        }
                    })

                    var placeholderBar = "#pie-loginPlayerDevice";
                    socketService.$plotPie(placeholderBar, pieData, {}, 'activePlayerPieClickData');

                    var listen = $scope.$watch(function () {
                        return socketService.getValue('activePlayerPieClickData');
                    }, function (newV, oldV) {
                        if (newV !== oldV) {
                            vm.allPlatformActivePie = newV.series.label;
                            console.log('pie clicked', newV);
                            if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                                listen();
                            }
                        }
                    });
                    vm.isShowLoadingSpinner('#loginPlayerDeviceAnalysis', false);
                });
            });
        };
        // login player device end

        // calculate the (avg/sum) of (playerlogin/devicelogin) times
        vm.sumTotalDeviceType = function(data, isPieChart, graph){
            let dataList = {
              'WEB':0,
              'H5':0,
              'APP-ANDROID':0,
              'APP-IOS':0,
              'PC-DOWNLOAD':0,
              'total':0
            }
            let countPlayerLogin = 0;
            let countTotalDeviceAmt = 0;

            var dataLength = (data && data.data && data.data.length) || 0;
            data.data.forEach(item=>{
                countPlayerLogin += item.playerLogin;
                countTotalDeviceAmt += item.subTotal;
                let keys = Object.keys(item.device);
                keys.forEach(key=>{
                  if(key!='_id'){
                      dataList[key] += item['device'][key];
                      dataList['total'] += item['device'][key];
                  }
                })
            })

            if(dataLength > 0){
                // calculate the avg of device/playerLogin times
                if(graph==1){
                    // calculate the first avg of table
                    vm.avgTotalPlayerLogin.avg = (countPlayerLogin / dataLength).toFixed(1);
                    vm.avgPlayerLogin = (countPlayerLogin / dataLength).toFixed(1);
                    vm.countAvgDevice(dataLength, dataList, graph);
                }else{
                    // calculate the second avg of table
                    vm.avgTotalDevice.avg = (countTotalDeviceAmt /dataLength).toFixed(1);
                    vm.countAvgDevice(dataLength, dataList, graph);
                }

            }

            if(isPieChart){
                return dataList;
            }else{
                return data.data;
            }

        }
        vm.countAvgDevice = function(dataLength, dataList, graph){
            if(dataLength <= 0){
                return;
            }

            Object.keys(dataList).forEach(key=>{
                if(dataList[key]!=0){
                    if(graph == 1){
                        vm.avgTotalPlayerLogin['device'][key] = (dataList[key] / dataLength).toFixed(1);
                    }else{
                        vm.avgTotalDevice['device'][key] = (dataList[key] / dataLength).toFixed(1);
                    }

                }
            })
        }

        vm.getLoginUserList = function(date, period, inputDeviceType, graph){

            socketService.$socket($scope.AppSocket, 'getPlayerLoginRecord', {
                startDate:date, endDate:date, platform: vm.selectedPlatform._id, period:period, inputDeviceType: inputDeviceType
            }, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerLoginRecords = (data && data.data) ? data.data:[];
                });
            });
            if(graph == 1){
                vm.displayPeriodText = vm.queryPara.loginPlayer.periodText;
            }else{
                vm.displayPeriodText = vm.queryPara.loginPlayerDevice.periodText;
            }

            $('#modalLoginDevice').modal('show');
        }


        // peak hour start        =================================================
        vm.plotPeakhourOnlinePlayerLine = function () {
            var placeholder = "#line-peakhour-onlinePlayer";
            var data1 = [], data2 = [], series = 10;
            for (var i = 0; i < series; i++) {
                data1[i] = {
                    label: "platform1 " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
                data2[i] = {
                    label: "platform2 " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            var newOption = {
                xaxis: {
                    axisLabel: 'times',
                    tickLength: 1,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                },
                yaxis: {
                    axisLabel: 'Number of Player',
                    min: 0,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                        //return val < axis.max ? val.toFixed(2) : (val.toFixed(2) + "/Num");
                    }
                },
                series: {
                    points: {
                        show: true,
                        radius: 4,
                        symbol: //"circle" // or callback
                            function (ctx, x, y, radius, shadow) {
                                // pi * r^2 = (2s)^2  =>  s = r * sqrt(pi)/2
                                var size = radius * Math.sqrt(Math.PI) / 2;
                                ctx.rect(x - size, y - size, size + size, size + size);
                            }
                    }
                }
            };
            socketService.$plotLine(placeholder, [vm.getLinedata(data1), vm.getLinedata(data2)], newOption, 'peakhour');
            var listen = $scope.$watch(function () {
                return socketService.getValue('peakhour');
            }, function (newV, oldV) {
                if (newV !== oldV) {
                    console.log('pie clicked', newV);
                    if (vm.showPageName !== "PEAK_HOUR") {
                        listen();
                    }
                }
            });
        }
        vm.plotPeakhourCreditspendLine = function () {
            var placeholder = "#line-peakhour-creditSpend";
            var data = [], series = 10;
            for (var i = 0; i < series; i++) {
                data[i] = {
                    label: "platform " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            var newOption = {
                xaxis: {
                    axisLabel: 'times',
                    tickLength: 1,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                },
                yaxis: {
                    axisLabel: 'Number of Player',
                    min: 0,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                }
            };
            socketService.$plotLine(placeholder, [vm.getLinedata(data)], newOption);
        }
        vm.plotPeakhourTopupLine = function () {
            var placeholder = "#line-peakhour-topup";
            var data = [], series = 10;
            for (var i = 0; i < series; i++) {
                data[i] = {
                    label: "platform " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            socketService.$plotLine(placeholder, [vm.getLinedata(data)]);
        }
        // peak hour end  ================================================

        // player location start ================================================
        vm.playerLocationPage = function (province) {
            var sendData = {
                platform: vm.selectedPlatform._id,
                player: vm.queryPara.playerLocation.player,
                date: vm.queryPara.playerLocation.date,
                // startTime: vm.queryPara.playerLocation.startTime,
                // endTime: vm.queryPara.playerLocation.endTime,
                startTime: vm.queryPara.playerLocation.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerLocation.endTime.data('datetimepicker').getLocalDate(),
            };

            switch (vm.queryPara.playerLocation.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            vm.currentProvince = '';
            var queryStr = '';
            if (province) {
                vm.currentProvince = province;
                sendData.phoneProvince = province;
                queryStr = 'getPlayerPhoneLocationInProvince'
            } else if (vm.showPageName == "PLAYER_PHONE_LOCATION") {
                queryStr = 'getPlayerPhoneLocation'
            } else if (vm.showPageName == "PLAYER_IP_LOCATION") {
                queryStr = 'getPlayerLoginLocation'
            }
            vm.getLocationData(sendData, queryStr)
        };

        vm.getLocationData = function (sendData, queryStr) {
            socketService.$socket($scope.AppSocket, queryStr, sendData, function (data) {
                console.log('location', data);
                if (vm.currentProvince) {
                    vm.playerPhoneInProvince = data.data;
                    vm.setProvinceData('phoneCity', vm.playerPhoneInProvince, function () {
                        $scope.$evalAsync(() => {
                            vm.mapName = "chinaHigh";
                            vm.drawMap(function (data) {
                                //this function is to zoom to province immediately after clicking
                                vm.map.clickMapObject(vm.map.getObjectById(vm.allProvinceId[vm.currentProvince]));
                            });
                            vm.drawLocationCityGraphByElementId("#playerLocationPie", vm.playerPhoneInProvince, "phoneLocation");
                        });
                    });
                } else if (vm.showPageName == 'PLAYER_IP_LOCATION') {
                    vm.playerLocationCountries = data.data;
                    vm.playerLocationCountries.forEach(item => {
                        // this map libray , only accept country code, like .'CN', 'US', so we do a conversion for it.
                        item._id.countryCode = ( item._id && item._id.country ) ? vm.countryCode[item._id.country] : '';
                        return item;
                    })
                    vm.totalPlayerLocationCountries = vm.playerLocationCountries.map(item => {return item.amount}).reduce((a, b) => {return a + b},0);
                    vm.setAreaData('country', vm.playerLocationCountries, function () {
                        vm.mapName = "worldHigh";
                        vm.drawMap();
                        $scope.safeApply();
                    });
                    vm.drawLocationCountryGraphByElementId("#playerLocationPie", vm.playerLocationCountries, "IPLocation");
                } else if (vm.showPageName == 'PLAYER_PHONE_LOCATION') {
                    vm.playerPhoneProvince = data.data;
                    vm.totalPlayerPhoneProvince = vm.playerPhoneProvince.map(item => {return item.amount}).reduce((a, b) => {return a + b},0);
                    $scope.safeApply();
                    vm.setProvinceData('phoneProvince', vm.playerPhoneProvince, function () {
                        vm.mapName = "chinaHigh";
                        vm.drawMap(function (data) {
                            //this func is to complete all data and change province name from spelling to hanzi
                            data.dataProvider.areas = data.dataProvider.areas.map(item => {
                                item.title = vm.allProvinceId[item.id];
                                item.value = item.value || 0;
                                return item;
                            })
                        });
                        vm.drawLocationCountryGraphByElementId("#playerLocationPie", vm.playerPhoneProvince, "phoneLocation");
                        $scope.safeApply();
                    });
                }
            });
        }
        vm.setProvinceData = function (type, dataSource, callback) {
            var maxBulletSize = 50;
            var max = -Infinity;
            for (var i = 0; i < dataSource.length; i++) {
                if (dataSource[i]._id[type] && dataSource[i].amount > max) {
                    max = dataSource[i].amount;
                }
            }
            var maxSquare = maxBulletSize * maxBulletSize;
            var squareUnit = maxSquare / max;

            vm.areasIDArray = [];
            vm.areasDataArray = [];
            for (var j in dataSource) {
                var name = dataSource[j]._id[type];
                var value = dataSource[j].amount;
                var square = value * squareUnit;
                var size = Math.sqrt(square);

                var id = dataSource[j]._id[type];
                if (id) {
                    vm.areasIDArray.push({'id': vm.allProvinceId[id], value: value, color: "#DD22DD"});
                    var pos;
                    if (type == 'phoneProvince' && cityLocationData[name]) {
                        pos = cityLocationData[name][name];
                    } else if (type == 'phoneCity' && cityLocationData[vm.currentProvince]) {
                        pos = cityLocationData[vm.currentProvince][vm.currentProvince + id]
                    }
                    if (pos) {
                        dataSource[j].showMap = true;
                        vm.areasDataArray.push({
                            type: "circle",
                            width: size,
                            height: size,
                            longitude: pos.longitude,
                            latitude: pos.latitude,
                            title: name,
                            value: value,
                            "color": "#00CC00"
                        })
                    } else {
                        dataSource[j].showMap = false;
                    }
                }
            }
            $scope.safeApply();
            if (callback) {
                callback();
            }
        }
        vm.setAreaData = function (type, dataSource, callback) {
            var maxBulletSize = 50;
            var max = -Infinity;
            for (var i = 0; i < dataSource.length; i++) {
                var name = dataSource[i]._id.country || dataSource[i]._id.city;
                if (name) {
                    if (dataSource[i].amount > max) {
                        max = dataSource[i].amount;
                    }
                }
            }
            var maxSquare = maxBulletSize * maxBulletSize;
            var squareUnit = maxSquare / max;

            vm.areasIDArray = [];
            vm.areasDataArray = [];
            for (var j in dataSource) {
                var value = dataSource[j].amount;
                var square = value * squareUnit;
                var size = Math.sqrt(square);

                var id = dataSource[j]._id[type];
                if (id) {
                    vm.areasIDArray.push({'id': id, value: value, color: "#DD22DD"});
                    var longitude = (vm.latlong[id]) ? vm.latlong[id].longitude : dataSource[j]._id.longitude;
                    var latitude = (vm.latlong[id]) ? vm.latlong[id].latitude : dataSource[j]._id.latitude;

                    vm.areasDataArray.push({
                        type: "circle",
                        width: size,
                        height: size,
                        longitude: longitude,
                        latitude: latitude,
                        title: vm.getCountryTitle(id),
                        value: value,
                        "color": "#00CC00"
                    })
                }
            }
            $scope.safeApply();
            if (callback) {
                callback();
            }
        }
        vm.drawMap = function (callback) {
            var map = AmCharts.makeChart("locationMap", {
                "type": "map",
                "theme": "none",
                colorSteps: 20,
                "dataProvider": {
                    mapVar: AmCharts.maps[vm.mapName],
                    "areas": vm.areasIDArray,
                    images: vm.areasDataArray,
                    getAreasFromMap: true
                },

                imagesSettings: {
                    rollOverColor: "#089282",
                    // rollOverScale: 3,
                    // selectedScale: 3,
                    selectedColor: "#089282",
                    color: "#13564e",
                    alpha: 0.5,
                    "balloonText": "[[title]]: <strong>[[value]]</strong>"
                },

                "areasSettings": {
                    "autoZoom": true,
                    rollOverColor: "#089282",
                    "selectedColor": "#CC0000",
                    "balloonText": "[[title]]: <strong>[[value]]</strong>",
                    alpha: 0.7
                },
                "smallMap": {},
                zoomDuration: .1
            });
            if (vm.showPageName == 'PLAYER_IP_LOCATION') {
                map.addListener("clickMapObject", function (event) {
                    if (!vm.showCountryTable) return;
                    vm.showCountryTable = false;
                    vm.countryId = event.mapObject.id;
                    var longitude = (vm.latlong[vm.countryId]) ? vm.latlong[vm.countryId].longitude : false;
                    var latitude = (vm.latlong[vm.countryId]) ? vm.latlong[vm.countryId].latitude : false;
                    var sendData = {
                        platform: vm.selectedPlatform._id,
                        player: vm.queryPara.playerLocation.player,
                        date: vm.queryPara.playerLocation.date,
                        country: vm.getMapName(event.mapObject.id),
                        startTime: vm.queryPara.playerLocation.startTime.data('datetimepicker').getLocalDate(),
                        endTime: vm.queryPara.playerLocation.endTime.data('datetimepicker').getLocalDate(),
                    };

                    switch (vm.queryPara.playerLocation.userType) {
                        case 'all':
                            sendData.isRealPlayer = true;
                            sendData.isTestPlayer = false;
                            break;
                        case 'individual':
                            sendData.isRealPlayer = true;
                            sendData.isTestPlayer = false;
                            sendData.hasPartner = false;
                            break;
                        case 'underPartner':
                            sendData.isRealPlayer = true;
                            sendData.isTestPlayer = false;
                            sendData.hasPartner = true;
                            break;
                        case 'test':
                            sendData.isRealPlayer = false;
                            sendData.isTestPlayer = true;
                            break;
                    }

                    if (typeof sendData.hasPartner !== 'boolean'){
                        sendData.hasPartner = null;
                    }

                    socketService.$socket($scope.AppSocket, 'getPlayerLoginLocationInCountry', sendData, function (data) {
                        console.log('city data', data);
                        vm.playerLocationCities = data.data;
                        var mapStr = '';
                        if (event.mapObject.id == "CN") {
                            vm.mapName = 'chinaHigh';
                        } else if (event.mapObject.id == "SG") {
                            vm.mapName = 'singaporeHigh';
                        } else {
                            vm.mapName = "worldHigh";
                        }
                        vm.setAreaData('city', vm.playerLocationCities, function () {
                            map.dataProvider.mapVar = AmCharts.maps[vm.mapName];
                            map.dataProvider.images = vm.areasDataArray;
                            map.validateNow();
                            if (longitude && latitude && (vm.mapName == "worldHigh")) {
                                var mapObject = map.getObjectById(vm.countryId);
                                map.zoomToObject(mapObject);
                            }
                        });
                        vm.drawLocationCityGraphByElementId('#playerLocationPie', vm.playerLocationCities, 'IPLocation');
                    });
                });
            }
            $scope.safeApply();
            vm.map = map;
            if (callback) {
                callback(map);
            }
        }
        vm.getMapName = function (id) {
            // our db country save countryName, ex: '中国' ， so we need to do a conversion from CN -> '中国'
            let result = id;
            let mapName = Object.keys(vm.countryCode).forEach( key => {
                if (vm.countryCode[key] == id) {
                    result = key;
                }
            })
            return result;
        }
        vm.goWorld = function () {
            vm.showCountryTable = true;
            vm.setAreaData('country', vm.playerLocationCountries, function () {
                vm.mapName = 'worldHigh';
                vm.drawMap();
            });
            vm.drawLocationCountryGraphByElementId("#playerLocationPie", vm.playerLocationCountries, "IPLocation");
        }
        vm.getCountryTitle = function (AA) {
            if (!AA) return '';
            for (var i in vm.allCountryName) {
                if (vm.allCountryName[i].id == AA) {
                    return vm.allCountryName[i].title;
                }
            }
            return AA;
        }
        vm.locationCountryClicked = function (id) {
            var mapObj = vm.map.getObjectById(id);
            if (mapObj) {
                vm.map.clickMapObject(mapObj);
            }
        }
        vm.locationCountryHover = function (id, type) {
            if (!id) {
                return;
            }
            var mapObj = vm.map.getObjectById(id);
            if (type == 'in') {
                vm.map.rollOverMapObject(mapObj, vm.map, MouseEvent);
            } else if (type == 'out') {
                vm.map.rollOutMapObject(mapObj, vm.map, MouseEvent);
            }
        }

        vm.locationProvinceHover = function (id, type) {
            if (!id) {
                return;
            }
            var mapObj = vm.map.getObjectById(vm.allProvinceId[id]);
            if (type == 'in') {
                vm.map.rollOverMapObject(mapObj, vm.map, null);
            } else if (type == 'out') {
                vm.map.rollOutMapObject(mapObj, vm.map, null);
            }
        }
        // player location end ================================================

        //reward analysis clicked ================================================
        vm.toggleRewardRetentionCheckAll = function () {
            if (vm.retentionCheckAll) {
                for (var i in vm.rewardRetentionData) {
                    vm.showRetention[i] = true;
                }
            } else {
                vm.showRetention = {};
            }
            $scope.$evalAsync();
            vm.drawRewardRetentionGraph();
        };

        vm.drawRewardRetentionGraph = function () {
            vm.allRetentionLineData = [];
            $.each(vm.rewardRetentionData, function (day, obj) {
                var rowData = [];
                if (vm.showRetention[day]) {
                    $.each(obj, function (a, b) {
                        if (a != 'day0' && a != 'date' && a != '$$hashKey') {
                            if (obj.day0 != 0) {
                                rowData.push([a, b / obj.day0 * 100]);
                            } else {
                                rowData.push([a, 0]);
                            }
                        }
                    });
                    rowData.sort((a, b) => {
                        return a[0] - b[0];
                    });
                    var lineData = {label: obj.date == $translate("average line") ? $translate("average line") : vm.dateReformat(obj.date), data: rowData};
                    vm.allRetentionLineData.push(lineData);
                }
            })
            var xLabel = [];
            for (var j in vm.queryPara.reward.days) {
                xLabel.push([vm.queryPara.reward.days[j], vm.queryPara.reward.days[j]]);
            }
            var placeholder = '#line-playerRewardRetention';
            var newOptions = {};
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: 'day N',
            }];
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: 'Retention %',
            }];
            newOptions.xaxis = {
                ticks: xLabel,
            };

            let retentionGraph = socketService.$plotLine(placeholder, vm.allRetentionLineData, newOptions)

            if (retentionGraph.getData()[0] && retentionGraph.getData()[0].data){
                $.each(retentionGraph.getData()[0].data, function (i, el) {
                    var o = retentionGraph.pointOffset({x: el[0], y: el[1]});
                    $('<div class="data-point-label">' + el[1].toFixed(1) + '%</div>').css({
                        position: 'absolute',
                        left: o.left + 4,
                        top: o.top - 15,
                        display: 'none'
                    }).appendTo(retentionGraph.getPlaceholder()).fadeIn('slow');
                });
            }

            vm.bindHover(placeholder, function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);

                var fre = $translate('DAY');
                $("#tooltip").html("% : " + y + '<br>' + fre + " : " + x)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })
        };

        vm.getRewardPlayerRetention = function () {
            vm.isShowLoadingSpinner('#rewardAnalysis', true);
            // vm.rewardRetentionGraphData = [];
            vm.showRetention = {0: true};//set default
            vm.retentionCheckAll = false;
            vm.allRetentionLineData = [];

            if (vm.selectedPlatform && vm.selectedPlatform._id && vm.selectReward && vm.selectReward._id) {
                let sendData = {
                    platform: vm.selectedPlatform._id,
                    days: vm.queryPara.reward.days,
                    startTime: vm.queryPara.reward.startTime,
                    endTime: vm.queryPara.reward.endTime,
                    playerType: vm.queryPara.reward.playerType,
                    eventObjId: vm.selectReward._id
                };

                if (vm.queryPara.reward && vm.queryPara.reward.domain && vm.queryPara.reward.domain.length > 0) {
                    sendData.domainList = vm.queryPara.reward.domain;
                }

                switch (vm.queryPara.reward.userType) {
                    case 'all':
                        sendData.isRealPlayer = true;
                        sendData.isTestPlayer = false;
                        break;
                    case 'individual':
                        sendData.isRealPlayer = true;
                        sendData.isTestPlayer = false;
                        sendData.hasPartner = false;
                        break;
                    case 'underPartner':
                        sendData.isRealPlayer = true;
                        sendData.isTestPlayer = false;
                        sendData.hasPartner = true;
                        break;
                    case 'test':
                        sendData.isRealPlayer = false;
                        sendData.isTestPlayer = true;
                        break;
                }

                // 开户设备： 5 & 6 treated as H5, upon Echo's request
                switch (vm.queryPara.reward.device) {
                    case 'app':
                        sendData.devices = ["7", "8", 7, 8];
                        break;
                    case 'web':
                        sendData.devices = ["1", "2", 1, 2];
                        break;
                    case 'h5':
                        sendData.devices = ["3", "4", "5","6", 3, 4, 5, 6];
                        break;
                    case 'backstage':
                        sendData.devices = ["0", 0];
                        break;
                }

                if (typeof sendData.hasPartner !== 'boolean') {
                    sendData.hasPartner = null;
                }

                socketService.$socket($scope.AppSocket, 'getPlayerRewardRetention', sendData, function (data) {
                    console.log("retention data", data);
                    vm.rewardRetentionData = data.data;
                    let dataLength = vm.rewardRetentionData.length;
                    vm.averageRetention = {};
                    vm.rewardRetentionData.forEach(retentionData => {
                        for (let key in retentionData) {
                            if (retentionData[key] != "date") {
                                if (vm.averageRetention[key]) {
                                    vm.averageRetention[key] += retentionData[key];
                                } else {
                                    vm.averageRetention[key] = retentionData[key];
                                }
                            }
                        }
                    });
                    for (let key in vm.averageRetention) {
                        if (vm.averageRetention.hasOwnProperty(key)) {
                            vm.averageRetention[key] = (vm.averageRetention[key] / dataLength);
                        }
                    }
                    vm.averageRetention.date = $translate("average line");
                    vm.rewardRetentionData.splice(0, 0, vm.averageRetention);

                    $scope.safeApply();
                    vm.drawRewardRetentionGraph();
                    vm.isShowLoadingSpinner('#rewardAnalysis', false);
                }, function (data) {
                    vm.isShowLoadingSpinner('#rewardAnalysis', false);
                    console.log("retention data not", data);
                });
            }
        };

        vm.changeToRetentionMode = function (isTrue) {
            if (isTrue){
                vm.initSearchParameter('reward', null, 2, function () {
                    vm.queryPara.reward.days = [1, 2, 3, 5, 7, 10, 12, 14, 16, 18, 21, 23, 25, 27, 30];
                    vm.queryPara.reward.playerType = "1"; //set default value
                    vm.dayListLength = [];
                    for (var i = 1; i < 31; i++) {
                        vm.dayListLength.push(i);
                    }
                    vm.queryPara.reward.playerType = "1"; // default as 总开户人数（全部）
                    vm.queryPara.reward.device = "all";
                    vm.queryPara.reward.userType = "all"; // default as 真钱玩家（全）
                    vm.queryPara.reward.periodText = null;
                    vm.checkDomainList('reward');
                    vm.playerRetentionInit(function () {
                        //vm.getPlayerRetention();
                    }, 'reward');
                    $scope.$evalAsync();
                }, true);
            }
            else{
                vm.queryPara.reward.playerType = null; // default as 总开户人数（全部）
                vm.queryPara.reward.userType = null; // default as 真钱玩家（全）
                vm.queryPara.reward.periodText = null;
                vm.queryPara.reward.device = null;
                vm.queryPara.reward.domain = null;
                vm.queryPara.reward.days = null;
                vm.queryPara.reward.periodText = "day";

            }
        };

        vm.rewardAnalysisInit = function (callback) {
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform._id}, function (data) {
                vm.rewardList = data.data;
                if (vm.rewardList.length > 0) {
                    vm.selectReward = vm.rewardList[0];
                }
                console.log('vm.rewardList', vm.rewardList);
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
        }
        vm.rewardClicked = function (v) {
            vm.selectReward = v;
            console.log('v', v);
            $scope.safeApply();
            if (!vm.checkRewardWithRetentionRate){
                vm.plotRewardLine();
            }
            else{
                vm.checkDomainList('reward');
            }
        }
        vm.plotRewardLine = function () {
            if (!vm.selectReward.type) return;
            vm.isShowLoadingSpinner('#rewardAnalysis', true);
            console.log('vm.selectReward', vm.selectReward);

            let startDate = vm.queryPara.reward.startTime;
            let endDate =  vm.queryPara.reward.endTime;
            var sendData = {
                platformId: vm.selectReward.platform,
                period: vm.queryPara.reward.periodText,
                startTime: startDate,
                endTime: endDate,
                type: vm.selectReward.type.name,
                eventName: vm.selectReward.name
            };

            socketService.$socket($scope.AppSocket, 'getPlatformRewardAnalysis', sendData, function success(data1) {

                $scope.$evalAsync(() => {
                    let periodDateData = [];
                    startDate = utilService.setThisDayStartTime(startDate);
                    endDate = utilService.setThisDayEndTime(endDate);
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.reward.periodText, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }

                    vm.platformRewardData = data1.data;
                    vm.platformRewardAnalysisData = [];
                    for(let i = 0; i<periodDateData.length; i++){
                        let rewardWithinPeriod = vm.platformRewardData.filter(reward => new Date(reward.settleTime).getTime() > periodDateData[i].getTime() && new Date(reward.settleTime).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.reward.periodText, periodDateData[i]));
                        vm.platformRewardAnalysisData.push({
                            date: periodDateData[i],
                            rewards: rewardWithinPeriod,
                        });
                    }
                    vm.platformRewardDataPeriodText = vm.queryPara.reward.periodText;
                    console.log('vm.platformRewardAnalysisData', vm.platformRewardAnalysisData);

                    // redefine the amount for line graph
                    vm.platformRewardAnalysisAmount = [];
                    vm.platformRewardAnalysisData.forEach(item => {

                        let totalRewardAmount = item.rewards.length > 0 ? item.rewards.reduce((a, b) => a + (b.data.rewardAmount ? b.data.rewardAmount : 0), 0) : 0;

                        vm.platformRewardAnalysisAmount.push({
                            date: item.date,
                            rewards: totalRewardAmount
                        });

                    });

                    let calculatedRewardData = vm.calculateLineDataAndAverage(vm.platformRewardAnalysisAmount, 'rewards', 'Reward amount');
                    vm.platformRewardAmountAverage = calculatedRewardData.average;
                    vm.plotLineByElementId("#line-reward-amount", calculatedRewardData.lineData, $translate('Reward amount'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.reward.periodText.toUpperCase()));

                    let calculatedRewardNumber = vm.calculateLineDataAndAverage(vm.platformRewardAnalysisData, 'rewards', 'Reward number');
                    vm.platformRewardNumberAverage = calculatedRewardNumber.average;
                    vm.plotLineByElementId("#line-reward-number", calculatedRewardNumber.lineData, $translate('Reward number'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.reward.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#rewardAnalysis', false);
                });
            })

        };
        //reward analysis clicked end ================================================

        //player device analysis clicked ================================================
        vm.deviceAnalysisInit = function (callback) {
            vm.isShowLoadingSpinner('#playerDeviceAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                type: vm.queryPara.playerDevice.type,
                // startDate: vm.queryPara.playerDevice.startTime,
                // endDate: vm.queryPara.playerDevice.endTime
                startDate: vm.queryPara.playerDevice.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.playerDevice.endTime.data('datetimepicker').getLocalDate(),
                queryRequirement: vm.queryPara.playerDevice.queryRequirement
            }

            switch (vm.queryPara.playerDevice.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            socketService.$socket($scope.AppSocket, 'getPlayerDeviceAnalysisData', sendData, function (data) {
                vm.playerDeviceList = data.data;
                console.log('device data', vm.playerDeviceList);
                $scope.safeApply();
                vm.plotPlayerDevice();
                vm.isShowLoadingSpinner('#playerDeviceAnalysis', false);
            });
        }
        vm.plotPlayerDevice = function (data) {
            var placeholder = '#pie-all-playerDevice'
            var pieData = vm.playerDeviceList.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: vm.setGraphNameWithoutCutString(obj._id.name), data: obj.number};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            socketService.$plotPie(placeholder, pieData, {}, 'newPlayerPieClickData');
            var placeholderBar = "#bar-all-playerDevice";

            if(vm.newOptions && vm.newOptions.xaxes){
                if(vm.newOptions.xaxes.length > 0){
                    let axisLabel = "";

                    if(vm.queryPara && vm.queryPara.playerDevice && vm.queryPara.playerDevice.type){
                        axisLabel = vm.queryPara.playerDevice.type[0].toUpperCase() + vm.queryPara.playerDevice.type.slice(1);
                    }

                    vm.newOptions.xaxes[0].axisLabel = $translate(axisLabel);
                }
            }

            socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
        }
        //player device analysis clicked end ================================================

        //player domain analysis clicked ================================================
        vm.domainAnalysisInit = function (callback) {
            var sendData = {
                platformId: vm.selectedPlatform._id,
                startTime: vm.queryPara.playerDomain.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerDomain.endTime.data('datetimepicker').getLocalDate(),
            }

            switch (vm.queryPara.playerDomain.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            socketService.$socket($scope.AppSocket, 'getPlayerDomainAnalysisData', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerDomainList = data.data;
                    console.log('domain data', vm.playerDomainList);
                    vm.plotPlayerDomain();
                })
            });
        }
        vm.plotPlayerDomain = function (data) {
            var placeholder = '#pie-all-playerDomain';
            var pieData = vm.playerDomainList.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                console.log(obj);
                let label = obj._id.replace(/(^http:\/\/)|(www\.)|(\:\d{1,}$)/mgi,"");
                return {label: vm.setGraphNameWithoutCutString(label), data: obj.number};
            }).sort(function (a, b) {
                return b.data - a.data;
            });

            vm.totalPlayerDomainRecord = pieData.reduce((a,b) => a + (b.data ? b.data : 0),0);

            pieData.map(p => {
                if(p && p.data && vm.totalPlayerDomainRecord){
                    p.percentage = (p.data / vm.totalPlayerDomainRecord * 100).toFixed(2);
                }
            });

            vm.playerDomainPieData = pieData;

            socketService.$plotPie(placeholder, pieData, {}, 'playerDomainPieClickData');
            //var placeholderBar = "#bar-all-playerDomain";
            //socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
        };
        //player domain analysis clicked end ================================================

        //player retention start ==================================================================
        vm.retentionAddDay = function (key) {
            vm.queryPara[key].days.push(parseInt(vm.newDay));
            vm.playerRetentionInit(null, key);
        };

        vm.retentionRemoveDay = function (key) {
            vm.queryPara[key].days.pop();
            if (vm.queryPara[key].days.length == 0) {
                vm.queryPara[key].days = [1];
            }
            vm.playerRetentionInit(null, key);
        };

        vm.playerRetentionInit = function (callback, key) {
            vm.newDay = (vm.queryPara[key].days.slice(-1).pop() + 1).toString();
            $scope.safeApply();
            if (callback) {
                callback();
            }
        };

        vm.checkDomainList = function (key){
            vm.domainList = null;
            var sendData = {
                platformId: vm.selectedPlatform._id,
                startTime: vm.queryPara[key].startTime,
                endTime: vm.queryPara[key].endTime,
                playerType: vm.queryPara[key].playerType,
                eventObjId: vm.selectReward && vm.selectReward._id ? vm.selectReward._id : null
            };

            switch (vm.queryPara[key].userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }
            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            socketService.$socket($scope.AppSocket, 'getDomainList', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.domainList = data && data.data && data.data[0] && data.data[0].urls ? data.data[0].urls : [];
                    console.log('domain data', vm.domainList);
                })
            });

        };

        vm.retentionFilterOnChange = function (key, notCheckDomain) {
            $scope.$evalAsync( () => {
                if (key == 'playerRetention') {
                    vm.queryPara[key].minTime = utilService.getFormatDate(vm.queryPara["playerRetention"].startTime);
                }

                if (!notCheckDomain) {
                    vm.checkDomainList(key);
                }

            })
        };

        vm.tableDataReformat = function (data) {
            if (Number.isInteger(data)) {
                return data;
            } else {
                if(data && data.toFixed(1) != "0.0"){
                    return data.toFixed(1);
                }else{
                    return "0";
                }
            }
        };

        vm.getPlayerRetention = function () {
            vm.isShowLoadingSpinner('#analysisPlayerRetention', true);
            vm.retentionGraphData = [];
            vm.showRetention = {0: true};//set default
            vm.retentionCheckAll = false;
            vm.allRetentionLineData = [];
            var sendData = {
                platform: vm.selectedPlatform._id,
                days: vm.queryPara.playerRetention.days,
                startTime: vm.queryPara.playerRetention.startTime,
                endTime: vm.queryPara.playerRetention.endTime,
                playerType: vm.queryPara.playerRetention.playerType,
                device:vm.queryPara.playerRetention.device
            }

            if (vm.chosenDomain && vm.chosenDomain.length > 0 && vm.chosenDomain.length != vm.domainList.length){
                sendData.domainList = vm.chosenDomain;
            }

            switch (vm.queryPara.playerRetention.userType) {
                case 'all':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    break;
                case 'individual':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = false;
                    break;
                case 'underPartner':
                    sendData.isRealPlayer = true;
                    sendData.isTestPlayer = false;
                    sendData.hasPartner = true;
                    break;
                case 'test':
                    sendData.isRealPlayer = false;
                    sendData.isTestPlayer = true;
                    break;
            }

            switch (vm.queryPara.playerRetention.device){
                case 'app':
                    sendData.devices = ["5","6","7","8",5,6,7,8];
                    break;
                case 'web':
                    sendData.devices = ["1","2",1,2];
                    break;
                case 'h5':
                    sendData.devices = ["3","4",3,4];
                    break;
                case 'backstage':
                    sendData.devices = ["0",0];
                    break;
            }

            if (typeof sendData.hasPartner !== 'boolean'){
                sendData.hasPartner = null;
            }

            socketService.$socket($scope.AppSocket, 'getPlayerRetention', sendData, function (data) {
                console.log("retention data", data);
                vm.retentionData = data.data;
                let dataLength = vm.retentionData.length;
                vm.averageRetention = {};
                vm.retentionData.forEach(retentionData => {
                    for (let key in retentionData) {
                        if (retentionData[key] != "date") {
                            if (vm.averageRetention[key]) {
                                vm.averageRetention[key] += retentionData[key];
                            } else {
                                vm.averageRetention[key] = retentionData[key];
                            }
                        }
                    }
                });
                for (let key in vm.averageRetention) {
                    if (vm.averageRetention.hasOwnProperty(key)){
                        vm.averageRetention[key] = (vm.averageRetention[key] / dataLength);
                    }
                }
                vm.averageRetention.date = $translate("average line");
                vm.retentionData.splice(0,0,vm.averageRetention);

                $scope.safeApply();
                vm.drawRetentionGraph();
                vm.isShowLoadingSpinner('#analysisPlayerRetention', false);
            }, function (data) {
                vm.isShowLoadingSpinner('#analysisPlayerRetention', false);
                console.log("retention data not", data);
            });
        }
        vm.toggleRetentionCheckAll = function () {
            if (vm.retentionCheckAll) {
                for (var i in vm.retentionData) {
                    vm.showRetention[i] = true;
                }
            } else {
                vm.showRetention = {};
            }
            $scope.safeApply();
            vm.drawRetentionGraph();
        }
        vm.drawRetentionGraph = function () {
            vm.allRetentionLineData = [];
            $.each(vm.retentionData, function (day, obj) {
                var rowData = [];
                if (vm.showRetention[day]) {
                    $.each(obj, function (a, b) {
                        if (a != 'day0' && a != 'date' && a != '$$hashKey') {
                            if (obj.day0 != 0) {
                                rowData.push([a, b / obj.day0 * 100]);
                            } else {
                                rowData.push([a, 0]);
                            }
                        }
                    });
                    rowData.sort((a, b) => {
                        return a[0] - b[0];
                    });
                    var lineData = {label: obj.date == $translate("average line") ? $translate("average line") : vm.dateReformat(obj.date), data: rowData};
                    vm.allRetentionLineData.push(lineData);
                }
            })
            var xLabel = [];
            for (var j in vm.queryPara.playerRetention.days) {
                xLabel.push([vm.queryPara.playerRetention.days[j], vm.queryPara.playerRetention.days[j]]);
            }
            var placeholder = '#line-playerRetention';
            var newOptions = {};
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: 'day N',
            }];
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: 'Retention %',
            }];
            newOptions.xaxis = {
                ticks: xLabel,
            };

            let retentionGraph = socketService.$plotLine(placeholder, vm.allRetentionLineData, newOptions)
                $.each(retentionGraph.getData()[0].data, function(i, el){
                    var o = retentionGraph.pointOffset({x: el[0], y: el[1]});
                    $('<div class="data-point-label">' + el[1].toFixed(1) + '%</div>').css( {
                        position: 'absolute',
                        left: o.left + 4,
                        top: o.top - 15,
                        display: 'none'
                    }).appendTo(retentionGraph.getPlaceholder()).fadeIn('slow');
                });

            vm.bindHover(placeholder, function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);

                var fre = $translate('DAY');
                $("#tooltip").html("% : " + y + '<br>' + fre + " : " + x)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })
        }
        //player retention end ==================================================================


        //game analysis start  =================================================
        vm.getAllProvider = function () {
            socketService.$socket($scope.AppSocket, 'getAllGameProviders', '', function (data) {
                vm.allGameProvider = data.data;
                $scope.safeApply();
                //vm.buildProviderList(vm.allGameProvider);
            }, function (data) {
                console.log("create not", data);
            });
        };
        vm.getPlatformProvider = function (id) {
            if (!id) return;
            socketService.$socket($scope.AppSocket, 'getPlatform', {_id: id}, function (data) {
                vm.allProviders = data.data.gameProviders;
                console.log('vm.allProviders', vm.allProviders);
                $scope.safeApply();
                }, function (data) {
                console.log("create not", data);
            });
        };
        vm.providerOptClicked = function (i, v) {
            vm.highlightProvider = {};
            vm.selectedProvider = v;
            vm.highlightProvider[i] = 'bg-bright';
            drawProviderActivePlayerLine();
            $scope.safeApply();
        }
        function drawProviderActivePlayerLine() {
            var placeholder = "#line-gameana-player";
            var data1 = [], data2 = [], series = 10;
            for (var i = 0; i < series; i++) {
                data1[i] = {
                    label: "game " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
                data2[i] = {
                    label: "game " + (i + 2),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            var newOption = {
                xaxis: {
                    axisLabel: 'any label to specify',
                    tickLength: 1,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                },
                yaxis: {
                    axisLabel: $translate('Active Player'),
                    min: 0,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                }
            };
            socketService.$plotLine(placeholder, [vm.getLinedata(data1), vm.getLinedata(data2)], newOption);
        }

        //game analysis end  =================================================

        //player credit start ====================================================
        vm.plotPlayerCreditLine = function (type) {
            // var placeholder = "#line-playerCredit";
            let opt = '';
            if (type == 'PLAYER_EXPENSES') {
                opt = 'consumption';
            }
            vm.isShowLoadingSpinner('#playerCreditAnalysis', true);
            let startDate = vm.queryPara.playerCredit.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.playerCredit.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.playerCredit.periodText,
                type: opt,
                providerId: !vm.queryPara.playerCredit.filterGameProvider ? 'all' : vm.queryPara.playerCredit.filterGameProvider,
                startDate: startDate,
                endDate: endDate,
            };
            socketService.$socket($scope.AppSocket, 'countConsumptionByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    let periodDateData = [];
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.playerCredit.periodText, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }

                    vm.platformConsumptionData = data.data.playerConsumption || [];
                    vm.platformConsumptionAnalysisData = [];
                    for (let i = 0; i < periodDateData.length; i++) {
                        let consumptionWithinPeriod = vm.platformConsumptionData.filter(consumption => new Date(consumption.date).getTime() >= periodDateData[i].getTime() && new Date(consumption.date).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.playerCredit.periodText, periodDateData[i]));
                        vm.platformConsumptionAnalysisData.push({
                            date: periodDateData[i],
                            consumptions: consumptionWithinPeriod});
                    }
                    vm.platformConsumptionDataPeriodText = vm.queryPara.playerCredit.periodText;
                    console.log('vm.platformConsumptionAnalysisData', vm.platformConsumptionAnalysisData);

                    vm.platformConsumptionAnalysisAmount = [];
                    vm.platformConsumptionAnalysisData.forEach(item => {
                        let totalConsumptionAmount = item.consumptions.length > 0 ? item.consumptions.reduce((a, b) => a + (b.validAmount ? b.validAmount : 0), 0) : 0;
                        vm.platformConsumptionAnalysisAmount.push({
                            date: item.date,
                            consumptions: $noRoundTwoDecimalPlaces(totalConsumptionAmount)
                        });
                    });

                    let calculatedConsumptionData = vm.calculateLineDataAndAverage(vm.platformConsumptionAnalysisAmount, 'consumptions', 'PLAYER_EXPENSES');
                    vm.platformConsumptionAmountAverage = calculatedConsumptionData.average;
                    vm.plotLineByElementId("#line-playerCredit", calculatedConsumptionData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.playerCredit.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#playerCreditAnalysis', false);

                    if (data && data.data && data.data.playerCount) {
                        vm.playerCountConsumption = data.data.playerCount;
                        let calculatedConsumptionPlayerCount = vm.calculateLineDataAndAverage(vm.playerCountConsumption, 'totalCount', 'PLAYER_CONSUMPTION_TREND');
                        vm.playerCountConsumptionAvg = calculatedConsumptionPlayerCount.average;
                        vm.plotLineByElementId("#line-playerConsumptionTrend", calculatedConsumptionPlayerCount.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.playerCredit.periodText.toUpperCase()));
                    }
                });
            });

        };

        vm.drawPlayerCreditLine = function () {
            vm.isShowLoadingSpinner('#playerCreditAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.playerCredit.periodText,
                startDate: vm.queryPara.playerCredit.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.playerCredit.endTime.data('datetimepicker').getLocalDate(),
                // startDate: vm.queryPara.playerCredit.startTime,
                // endDate: vm.queryPara.playerCredit.endTime
            }
            socketService.$socket($scope.AppSocket, 'countTopUpbyPlatform', sendData, function (data) {
                let averageNumber = 0;
                vm.playerCreditData = data.data;
                console.log('vm.playerCreditData', vm.playerCreditData);
                averageNumber = ((data.data.reduce((a,b) => a + (b.number ? b.number : 0),0)) / data.data.length).toFixed(2);
                // $scope.safeApply();
                vm.isShowLoadingSpinner('#playerCreditAnalysis', false);
                return vm.drawPlayerCreditGraph(vm.playerCreditData, sendData, averageNumber);
            }, function (data) {
                vm.isShowLoadingSpinner('#playerCreditAnalysis', false);
                console.log("player credit data not", data);
            });
        }

        vm.drawPlayerCreditGraph = function (srcData, sendData, averageNumber) {
            var placeholder = '#line-playerCredit';
            var playerCreditObjData = {};
            // for (var i = 0; i < srcData.length; i++) {
            //     switch (vm.queryPara.playerCredit.periodText) {
            //         case 'day':
            //             playerCreditObjData[srcData[i]._id.date] = srcData[i].number;
            //             break;
            //         case 'week':
            //             playerCreditObjData[srcData[i]._id.week] = srcData[i].number;
            //             break;
            //         case 'month':
            //             playerCreditObjData[srcData[i]._id.year + '' + srcData[i]._id.month] = srcData[i].number;
            //             break;
            //     }
            // }
            var graphData = [];
            var averageData = [];
            srcData.map(item => {
                graphData.push([new Date(item._id.date), item.number])
                averageData.push([new Date(item._id.date), averageNumber])
            })
            var newOptions = {};
            // var nowDate = new Date(sendData.startDate);
            var xText = '';
            switch (vm.queryPara.playerCredit.periodText) {
                case 'day':
                    // do {
                    //     var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toLocaleString());
                    //     graphData.push([nowDate.getTime(), (playerCreditObjData[dateText] || 0)]);
                    //     nowDate.setDate(nowDate.getDate() + 1);
                    // } while (nowDate <= sendData.endDate);
                    xText = 'DAY';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "day"],
                        }
                    };
                    break;
                case 'week':
                    // var k = 0;
                    // do {
                    //     graphData.push([nowDate.getTime(), (playerCreditObjData[k] || 0)]);
                    //     nowDate.setDate(nowDate.getDate() + 7);
                    //     k++;
                    // } while (nowDate <= sendData.endDate);
                    xText = 'WEEK';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [6, "day"],
                        }
                    };
                    break;
                case 'month' :
                    // nowDate.setDate(1);
                    // do {
                    //     var nowYear = nowDate.getFullYear();
                    //     var nowMonth = nowDate.getMonth() + 1;
                    //     console.log('nowMonth', nowYear + '' + nowMonth);
                    //     graphData.push([nowDate.getTime(), (playerCreditObjData[nowYear + '' + nowMonth] || 0)]);
                    //     nowDate.setMonth(nowDate.getMonth() + 1);
                    //
                    // } while (nowDate <= sendData.endDate);
                    xText = 'MONTH';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "month"],
                        }
                    };
                    break;
            }
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: $translate('AMOUNT'),
            }]
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: $translate('PERIOD') + ' : ' + $translate(xText)
            }]

            newOptions.colors = ["#00afff", "#FF0000"];

            socketService.$plotLine(placeholder, [{label: $translate(vm.showPageName), data: graphData},{label: $translate('average line'), data: averageData}], newOptions);

            vm.bindHover(placeholder, function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);

                var date = new Date(x);
                var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())

                var yText = $translate('AMOUNT');
                var fre = $translate(vm.queryPara.playerCredit.periodText.toUpperCase());
                $("#tooltip").html(yText + " : " + y + '<br>' + fre + " : " + dateString)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })

            //draw table

            var tableData = [];
            for (var i in graphData) {
                var obj = {};
                obj.date = String(utilService.$getTimeFromStdTimeFormat(new Date(graphData[i][0]))).substring(0, 10);
                let amount = graphData[i][1] || 0;
                obj.amount = amount.toFixed(2);
                tableData.push(obj);
            }
            tableData.push({date: $translate('average value'), amount: averageNumber});
            var dataOptions = {
                data: tableData,
                columns: [
                    {title: $translate(vm.queryPara.playerCredit.periodText), data: "date"},
                    {title: $translate('amount'), data: "amount"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $('#playerCreditAnalysisTable').DataTable(dataOptions);
            a.columns.adjust().draw();
        }

        vm.drawPlayerCreditCountLine = function () {
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.playerCredit.periodText,
                type: 'topup',
                startDate: vm.queryPara.playerCredit.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.playerCredit.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'countTopUpCountByPlatform', sendData, function (data) {
                let averageNumber = 0;
                vm.playerCreditData = data.data;
                console.log('vm.playerCreditData', vm.playerCreditData);
                averageNumber = ((data.data.reduce((a,b) => a + (b.number ? b.number : 0),0)) / data.data.length).toFixed(2);

                // $scope.safeApply();
                return vm.drawPlayerCreditCountGraph(vm.playerCreditData, sendData, averageNumber);
            }, function (data) {
                console.log("player credit data not", data);
            });
        }

        vm.drawPlayerCreditCountGraph = function (srcData, sendData, averageNumber) {
            var placeholder = '#line-playerCreditCount';
            var playerCreditObjData = {};

            var graphData = [];
            var averageData = [];
            srcData.map(item => {
                graphData.push([new Date(item._id.date), item.number])
                averageData.push([new Date(item._id.date), averageNumber])
            })
            var newOptions = {};
            // var nowDate = new Date(sendData.startDate);
            var xText = '';
            switch (vm.queryPara.playerCredit.periodText) {
                case 'day':
                    xText = 'DAY';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "day"],
                        }
                    };
                    break;
                case 'week':
                    xText = 'WEEK';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [6, "day"],
                        }
                    };
                    break;
                case 'month' :
                    xText = 'MONTH';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "month"],
                        }
                    };
                    break;
            }
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: $translate('COUNT'),
            }]
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: $translate('PERIOD') + ' : ' + $translate(xText)
            }]

            newOptions.colors = ["#00afff", "#FF0000"];

            socketService.$plotLine(placeholder, [{label: $translate(vm.showPageName), data: graphData},{label: $translate('average line'), data: averageData}], newOptions);

            vm.bindHover(placeholder, function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);

                var date = new Date(x);
                var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())

                var yText = $translate('COUNT');
                var fre = $translate(vm.queryPara.playerCredit.periodText.toUpperCase());
                $("#tooltip").html(yText + " : " + y + '<br>' + fre + " : " + dateString)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })

            //draw table

            var tableData = [];
            for (var i in graphData) {
                var obj = {};
                obj.date = String(utilService.$getTimeFromStdTimeFormat(new Date(graphData[i][0]))).substring(0, 10);
                let count = graphData[i][1] || 0;
                obj.count = count.toFixed(0);
                tableData.push(obj);
            }
            tableData.push({date: $translate('average value'), count: averageNumber});
            var dataOptions = {
                data: tableData,
                columns: [
                    {title: $translate(vm.queryPara.playerCredit.periodText), data: "date"},
                    {title: $translate('COUNT'), data: "count"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $('#playerCreditCountAnalysisTable').DataTable(dataOptions);
            a.columns.adjust().draw();
        }
        //player credit end =======================================================

        //bonus amount
        vm.drawPlayerBonusAmount = function (type) {
            var opt = '';
            if (type == 'PLAYER_EXPENSES') {
                opt = 'consumption';
            } else if (type == 'PLAYER_TOPUP') {
                opt = 'topup';
            }
            vm.isShowLoadingSpinner('#bonusAmountAnalysis', true);
            let startDate = vm.queryPara.bonusAmount.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.bonusAmount.endTime.data('datetimepicker').getLocalDate();

            var sendData = {
                platform: vm.selectedPlatform._id,
                period: vm.queryPara.bonusAmount.periodText,
                type: opt,
                startDate: startDate,
                endDate: endDate,
            };

            socketService.$socket($scope.AppSocket, 'getAnalysisSingleBonusRequestList', sendData, function (data) {

                $scope.$evalAsync(() => {
                    let periodDateData = [];
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.bonusAmount.periodText, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }

                    vm.platformBonusData = data.data;
                    vm.platformBonusAnalysisData = [];

                    for (let i = 0; i < periodDateData.length; i++) {
                        let bonusWithinPeriod = vm.platformBonusData.filter(bonus => new Date(bonus.createTime).getTime() > periodDateData[i].getTime() && new Date(bonus.createTime).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.bonusAmount.periodText, periodDateData[i]));
                        vm.platformBonusAnalysisData.push({
                            date: periodDateData[i],
                            bonus: bonusWithinPeriod,
                        });
                    }
                    vm.platformBonusDataPeriodText = vm.queryPara.bonusAmount.periodText;
                    console.log('vm.platformBonusAnalysisData', vm.platformBonusAnalysisData);

                    vm.platformBonusAnalysisAmount = [];
                    vm.platformBonusAnalysisData.forEach(item => {

                        let totalBonusAmount = item.bonus.length > 0 ? item.bonus.reduce((a, b) => a + (b.data.amount ? b.data.amount : 0), 0) : 0;

                        vm.platformBonusAnalysisAmount.push({
                            date: item.date,
                            bonus: totalBonusAmount
                        });

                    });

                    let calculatedBonusData = vm.calculateLineDataAndAverage(vm.platformBonusAnalysisAmount, 'bonus', 'BONUS_AMOUNT');
                    vm.platformBonusAmountAverage = calculatedBonusData.average;
                    vm.plotLineByElementId("#line-bonusAmount", calculatedBonusData.lineData, $translate('BONUS_AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.bonusAmount.periodText.toUpperCase()));

                    let calculatedBonusNumber = vm.calculateLineDataAndAverage(vm.platformBonusAnalysisData, 'bonus', 'WITHDRAW_COUNT');
                    vm.platformBonusNumberAverage = calculatedBonusNumber.average;
                    vm.plotLineByElementId("#line-bonusCount", calculatedBonusNumber.lineData, $translate('WITHDRAW_COUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.bonusAmount.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#bonusAmountAnalysis', false);
                });
            });
        }
        //player bonus end

        // top up manual
        vm.drawPlayerTopUp = function (type) {
            var opt = '';
            let socketName = null;

            if (type == 'TOPUPMANUAL') {
                opt = 'ManualPlayerTopUp';
                vm.queryPara.topUp.amountTag = 'TOPUPMANUAL_AMOUNT';
                vm.queryPara.topUp.countTag = 'TOPUPMANUAL_COUNT';
                vm.queryPara.topUp.headCountTag = 'TOPUPMANUAL_HEADCOUNT';
                vm.queryPara.topUp.successRateTag = 'TOPUPMANUAL_SUCCESSRATE';
               //  socketName = 'getManualTopUpAnalysisList';
            } else if (type == 'PlayerAlipayTopUp') {
                opt = type;
                vm.queryPara.topUp.amountTag = 'TOPUPALIPAY_AMOUNT';
                vm.queryPara.topUp.countTag = 'TOPUPALIPAY_COUNT';
                vm.queryPara.topUp.headCountTag = 'TOPUPALIPAY_HEADCOUNT';
                vm.queryPara.topUp.successRateTag = 'TOPUPALIPAY_SUCCESSRATE';
            } else if (type == 'PlayerWechatTopUp'){
                opt = type;
                vm.queryPara.topUp.amountTag = 'TOPUPWECHAT_AMOUNT';
                vm.queryPara.topUp.countTag = 'TOPUPWECHAT_COUNT';
                vm.queryPara.topUp.headCountTag = 'TOPUPWECHAT_HEADCOUNT';
                vm.queryPara.topUp.successRateTag = 'TOPUPWECHAT_SUCCESSRATE';
            }else {

            }

            let startDate = vm.queryPara.topUp.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.topUp.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                startDate: startDate,
                endDate: endDate,
                type: opt,
                period: vm.queryPara.topUp.periodText
            };


            vm.platformTopUpDataPeriodText = vm.queryPara.topUp.periodText;
            vm.isShowLoadingSpinner('#topUpAnalysis', true);
            socketService.$socket($scope.AppSocket, 'getTopupAnalysisByPlatform', sendData, function (data) {

                $scope.$evalAsync(() => {

                    if (data) {
                        let returnData = null;
                        let bankData = null;
                        let methodData = null;

                        if (vm.showPageName == 'TOPUPMANUAL') {
                            if (data.data[0] && data.data[1] && data.data[2] && data.data[0].length > 0 && data.data[1].length > 0 && data.data[2].length > 0){
                                returnData = data.data[0];
                                bankData = data.data[1];
                                methodData = data.data[2];
                            }else{
                                vm.isShowLoadingSpinner('#topUpAnalysis', false);
                                return Q.reject({name: "DataError", message: "Invalid proposal data"});
                            }

                        } else {
                            if (data.data && data.data.length > 0){
                                returnData = data.data;
                            }else {
                                vm.isShowLoadingSpinner('#topUpAnalysis', false);
                                return Q.reject({name: "DataError", message: "Invalid proposal data"});
                            }

                        }

                        let index = null;

                        vm.platformTopUpAnalysisData = [];

                        returnData.forEach(item => {
                            let backStageData= { amount: 0, successCount: 0, headCount: 0, count: 0, successRate: 0};
                            let webData = {amount: 0, successCount: 0, headCount: 0, count: 0, successRate: 0};
                            let H5Data = {amount: 0, successCount: 0, headCount: 0, count: 0, successRate: 0};
                            let AppData = {amount: 0, successCount: 0, headCount: 0, count: 0, successRate: 0};
                            let defaultData = [backStageData, webData, H5Data, AppData];

                            if (item.data[0] && item.data[0].length > 0) {

                                item.data[0].forEach(inputDeviceData => {
                                    if (inputDeviceData._id != null){
                                        if (inputDeviceData._id == 3){
                                            index = parseInt(inputDeviceData._id - 1);
                                        }else if (inputDeviceData._id == 5){
                                            index = parseInt(inputDeviceData._id - 2);
                                        }else{
                                            index = parseInt(inputDeviceData._id);
                                        }
                                        defaultData[index].amount = inputDeviceData.amount ? Math.floor(inputDeviceData.amount) : 0;
                                        defaultData[index].successCount = inputDeviceData.successCount ? inputDeviceData.successCount : 0;
                                        defaultData[index].count = inputDeviceData.count ? inputDeviceData.count : 0;
                                        defaultData[index].successRate = inputDeviceData.successCount/inputDeviceData.count == 'NaN' ? 0 : $noRoundTwoDecimalPlaces(inputDeviceData.successCount/inputDeviceData.count*100);
                                        defaultData[index].headCount = inputDeviceData.userIds ? inputDeviceData.userIds.filter(a => a != 0).length : 0;
                                    }
                                })
                            }

                            vm.platformTopUpAnalysisData.push({
                                date: new Date(item.date),
                                totalHeadCount: item.data[1].totalUserCount,
                                totalSuccessCount: defaultData[0].successCount + defaultData[1].successCount + defaultData[2].successCount + defaultData[3].successCount,
                                totalSum: defaultData[0].amount + defaultData[1].amount + defaultData[2].amount + defaultData[3].amount,
                                backStage: defaultData[0],
                                web: defaultData[1],
                                H5: defaultData[2],
                                App: defaultData[3],
                            })
                        });

                        vm.platformTopUpCountAverage = {
                            average: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'totalSuccessCount'),
                            web: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'web', 'successCount'),
                            H5: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'H5', 'successCount'),
                            App: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'App', 'successCount'),
                            backStage: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'backStage', 'successCount')
                        };

                        vm.platformTopUpAmountAverage = {
                            average: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'totalSum'),
                            web: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'web', 'amount'),
                            H5: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'H5', 'amount'),
                            App: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'App', 'amount'),
                            backStage: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'backStage', 'amount')
                        };

                        vm.platformTopUpHeadCountAverage = {
                            average: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'totalHeadCount'),
                            web: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'web', 'headCount'),
                            H5: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'H5', 'headCount'),
                            App: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'App', 'headCount'),
                            backStage: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'backStage', 'headCount')
                        };

                        vm.platformTopUpSuccessRateAverage = {
                            web: $noRoundTwoDecimalPlaces(vm.calculateAverageDataWithDecimalPlace(vm.platformTopUpAnalysisData, 'web', 'successRate')),
                            H5: $noRoundTwoDecimalPlaces(vm.calculateAverageDataWithDecimalPlace(vm.platformTopUpAnalysisData, 'H5', 'successRate')),
                            App: $noRoundTwoDecimalPlaces(vm.calculateAverageDataWithDecimalPlace(vm.platformTopUpAnalysisData, 'App', 'successRate')),
                            webTotalCount: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'web', 'count'),
                            H5TotalCount: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'H5', 'count'),
                            AppTotalCount: vm.calculateAverageData(vm.platformTopUpAnalysisData, 'App', 'count')
                        };


                        let calculatedTopUpAmount = vm.calculateLineDataAndAverage(vm.platformTopUpAnalysisData, 'totalSum', vm.queryPara.topUp.amountTag);
                        vm.plotLineByElementId("#line-topUpAmount", calculatedTopUpAmount.lineData, $translate(vm.queryPara.topUp.amountTag), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.topUp.periodText.toUpperCase()));
                        let calculatedTopUpCount = vm.calculateLineDataAndAverage(vm.platformTopUpAnalysisData, 'totalSuccessCount', vm.queryPara.topUp.countTag);
                        vm.plotLineByElementId("#line-topUpCount", calculatedTopUpCount.lineData, $translate(vm.queryPara.topUp.countTag), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.topUp.periodText.toUpperCase()));
                        let calculatedTopUpHeadCount = vm.calculateLineDataAndAverage(vm.platformTopUpAnalysisData, 'totalHeadCount', vm.queryPara.topUp.headCountTag);
                        vm.plotLineByElementId("#line-topUpHeadCount", calculatedTopUpHeadCount.lineData, $translate(vm.queryPara.topUp.headCountTag), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.topUp.periodText.toUpperCase()));

                        let returnedLineData = vm.generateLineData(vm.platformTopUpAnalysisData, ['WEB', 'H5', 'APP'], ['web', 'H5', 'App'], 'successRate');
                        if (returnedLineData) {
                            let lineData = [];
                            for (let i = 0; i < returnedLineData[0].length; i++) {
                                lineData.push({
                                    label: returnedLineData[0][i] + $translate('successRate'),
                                    data: returnedLineData[1][returnedLineData[0][i]]
                                })
                            }

                            vm.plotLineByElementId("#line-topUpSuccessRate", lineData, $translate('PERCENTAGE'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.topUp.periodText.toUpperCase()));
                        }

                        // bank data analysis
                        if (bankData && bankData.length > 0){
                            socketService.$socket($scope.AppSocket, 'getBankTypeList', {platform: vm.selectedPlatform._id},
                                data => {

                                    $scope.$evalAsync(() => {
                                        if (data && data.data && data.data.data) {
                                            vm.allBankTypeList = {};
                                            vm.manualTopUpBankInfo = [];
                                            Object.assign(vm.allBankTypeList, data.data.data);

                                            bankData.forEach( bank => {
                                                let Info = [];
                                                if (bank.data.length > 0) {
                                                    bank.data.forEach(bankData =>
                                                    {
                                                        let bankTypeName = null;
                                                        for (let i = 0; i < Object.keys(vm.allBankTypeList).length; i++) {
                                                            if (vm.allBankTypeList[i].id == bankData._id) {
                                                                bankTypeName = vm.allBankTypeList[i].name;
                                                                break;
                                                            }
                                                        }

                                                        if (bankTypeName != null){
                                                            Info.push({bank: bankTypeName, amount: bankData.amount ? Math.floor(bankData.amount) : 0 });
                                                        }

                                                    })
                                                }
                                                vm.manualTopUpBankInfo.push({
                                                    date: bank.date,
                                                    bankInfo: Info,
                                                })

                                            });

                                            // loop through the data, to obtain the banks that are involved
                                            vm.synchronizeDataField(vm.manualTopUpBankInfo);

                                            vm.manualTopUpBankInfo.map(data1 => {
                                                data1.totalAmount = vm.calculateTotalAmount(data1,'bankInfo','amount');

                                                return data1
                                            });

                                            vm.totalAverageAmount = vm.calculateAverageData(vm.manualTopUpBankInfo,'totalAmount');
                                            vm.plotPie('#pie-all-bank-receivedAmount', vm.bankAverageAmount, 'bankAverageAmountClickedData');

                                        }
                                    });
                                });
                        }

                        // top up deposit method analysis
                        if (methodData && methodData.length > 0) {

                            vm.manualTopUpMethod = [];
                            methodData.forEach(method => {
                                let Online = {amount: 0};
                                let ATM = {amount: 0};
                                let Counter = {amount: 0};
                                let AliPayTransfer = {amount: 0};
                                let wechatPayTransfer = {amount: 0};
                                let CloudFlashPay = {amount: 0};
                                let CloudFlashPayTransfer = {amount: 0};

                                if (method.data && method.data.length > 0) {

                                    method.data.forEach(methodDetail => {
                                        switch (parseInt(methodDetail._id,10)){
                                            case (vm.constDepositMethod.Online):
                                                Online.amount += methodDetail.amount ? Math.floor(methodDetail.amount) : 0;
                                                break;
                                            case (vm.constDepositMethod.ATM):
                                                ATM.amount += methodDetail.amount ? Math.floor(methodDetail.amount) : 0;
                                                break;
                                            case (vm.constDepositMethod.Counter):
                                                Counter.amount += methodDetail.amount ? Math.floor(methodDetail.amount) : 0;
                                                break;
                                            case (vm.constDepositMethod.AliPayTransfer):
                                                AliPayTransfer.amount += methodDetail.amount ? Math.floor(methodDetail.amount) : 0;
                                                break;
                                            case (vm.constDepositMethod.WechatTransfer):
                                                wechatPayTransfer.amount += methodDetail.amount ? Math.floor(methodDetail.amount) : 0;
                                                break;
                                            case (vm.constDepositMethod.CloudFlashPay):
                                                CloudFlashPay.amount += methodDetail.amount ? Math.floor(methodDetail.amount) : 0;
                                                break;
                                            case (vm.constDepositMethod.CloudFlashPayTransfer):
                                                CloudFlashPayTransfer.amount += methodDetail.amount ? Math.floor(methodDetail.amount) : 0;
                                                break;
                                        }
                                    })
                                }

                                vm.manualTopUpMethod.push({
                                    date: new Date(method.date),
                                    totalSum: Online.amount + ATM.amount + Counter.amount + AliPayTransfer.amount + wechatPayTransfer.amount + CloudFlashPay.amount + CloudFlashPayTransfer.amount,
                                    Online: Online,
                                    ATM: ATM,
                                    Counter: Counter,
                                    AliPayTransfer: AliPayTransfer,
                                    weChatPayTransfer: wechatPayTransfer,
                                    CloudFlashPay: CloudFlashPay,
                                    CloudFlashPayTransfer: CloudFlashPayTransfer
                                })

                            })

                            vm.manualTopUpMethodAmountAverage = {
                                average: vm.calculateAverageData(vm.manualTopUpMethod, 'totalSum'),
                                Online: vm.calculateAverageData(vm.manualTopUpMethod, 'Online', 'amount'),
                                ATM: vm.calculateAverageData(vm.manualTopUpMethod, 'ATM', 'amount'),
                                Counter: vm.calculateAverageData(vm.manualTopUpMethod, 'Counter', 'amount'),
                                AliPayTransfer: vm.calculateAverageData(vm.manualTopUpMethod, 'AliPayTransfer', 'amount'),
                                weChatPayTransfer: vm.calculateAverageData(vm.manualTopUpMethod, 'weChatPayTransfer', 'amount'),
                                CloudFlashPay: vm.calculateAverageData(vm.manualTopUpMethod, 'CloudFlashPay', 'amount'),
                                CloudFlashPayTransfer: vm.calculateAverageData(vm.manualTopUpMethod, 'CloudFlashPayTransfer', 'amount')
                            };

                            vm.methodAverageAmount = [];
                            for (let i = 1; i < Object.keys(vm.manualTopUpMethodAmountAverage).length; i++) {
                                vm.methodAverageAmount.push({
                                    id: $translate(Object.keys(vm.manualTopUpMethodAmountAverage)[i]),
                                    number: vm.manualTopUpMethodAmountAverage[Object.keys(vm.manualTopUpMethodAmountAverage)[i]]
                                });
                            }

                            vm.plotPie('#pie-all-methodAmount', vm.methodAverageAmount, 'bankAverageAmountClickedData');
                        }
                    }

                    vm.isShowLoadingSpinner('#topUpAnalysis', false);

                });

            });

        };

        vm.typeDataSort = (type, sortField, index) => {
            if (Number.isInteger(index)){
                vm.platformTopupTableSort[type] = vm.platformTopupTableSort[type] === sortField + '[' + index + '].amount' ? '-'+sortField + '[' + index + '].amount'  : sortField + '[' + index + '].amount' ;
            }else{
                vm.platformTopupTableSort[type] = vm.platformTopupTableSort[type] === sortField ? '-'+sortField : sortField;
            }

        };

        vm.synchronizeDataField = (data) => {
           vm.selectedBank = [];
           vm.bankAverageAmount = [];

            data.map(data1 => {

                data1.bankInfo.forEach( detail => {
                    if (vm.selectedBank.indexOf(detail.bank) == -1){
                        vm.selectedBank.push(detail.bank);
                    }
                });
            });

            // check the data if contains the bank, else append 0
            let bankSum = [];
            let counter = 0;
            vm.selectedBank.forEach(bank => {
                bankSum[counter] = {id: bank, number: 0};
                counter++;
            });

            data.map(data1 => {
                let bankDetail =[];
                let bankSeq = [];
                data1.bankInfo.forEach( detail => {
                    if (bankDetail.indexOf(detail.bank) == -1){
                        bankDetail.push(detail.bank);
                    }
                })

                vm.selectedBank.forEach(bank => {
                    if (bankDetail.indexOf(bank) == -1){
                        data1.bankInfo.push({bank: bank, amount: 0});
                    }
                })

                // to synchronize the sequence of bank data & generate the average data according to the bank seqeunce
                counter =0;
                vm.selectedBank.forEach( bank => {
                    data1.bankInfo.forEach( detail => {
                        if(detail.bank == bank){
                            bankSeq.push(detail);
                            bankSum[counter].number += isNaN(detail.amount) ? 0 : parseFloat(detail.amount);
                            counter++;
                        }
                    })

                })
                data1.bankInfo = bankSeq;
                return data1
            })
            bankSum.forEach( sum => {
                vm.bankAverageAmount.push({id:sum.id, number:Math.floor(sum.number/data.length)});
            })

        };
        vm.calculateTotalAmount = (data, key1, key2) => {
           let total = data[key1].length !== 0 ? Math.floor(data[key1].reduce((a, item) => a + (Number.isFinite(item[key2]) ? item[key2] : 0), 0)) : 0;
           return total;
        };
        // top up manual end

        //client source start =======================================
        // vm.initClientSourcePara = function (callback) {
        //     vm.clientSourcePara = {loading: true};
        //     socketService.$socket($scope.AppSocket, 'getClientSourcePara', {}, function (data) {
        //         vm.clientSourcePara = data.data;
        //         $scope.safeApply();
        //         if (callback) {
        //             callback.apply(this);
        //         }
        //     });
        // }
        vm.getClientSourceData = function () {
            var sendObj = {};
            vm.isShowLoadingSpinner('#clientSourceAnalysis', true);
            sendObj.accessType = vm.queryPara.clientSource.accessType;
            //sendObj.clientType = vm.queryPara.clientSource.clientType;
            sendObj.platformId = vm.selectedPlatform.platformId;
            sendObj.startDate = vm.queryPara.clientSource.startTime.data('datetimepicker').getLocalDate();
            sendObj.endDate = vm.queryPara.clientSource.endTime.data('datetimepicker').getLocalDate();

            switch (vm.queryPara.clientSource.userType) {
                case 'all':
                    sendObj.isRealPlayer = true;
                    sendObj.isTestPlayer = false;
                    break;
                case 'individual':
                    sendObj.isRealPlayer = true;
                    sendObj.isTestPlayer = false;
                    sendObj.hasPartner = false;
                    break;
                case 'underPartner':
                    sendObj.isRealPlayer = true;
                    sendObj.isTestPlayer = false;
                    sendObj.hasPartner = true;
                    break;
                case 'test':
                    sendObj.isRealPlayer = false;
                    sendObj.isTestPlayer = true;
                    break;
            }

            if (typeof sendObj.hasPartner !== 'boolean'){
                sendObj.hasPartner = null;
            }


            socketService.$socket($scope.AppSocket, 'getClientSourceQuery', sendObj, function (data) {
                console.log('data', data);
                vm.clientSourceTblData = data.data || [];
                vm.clientSourceTotalCount = data.data.reduce((a,b) => a + (b.count ? b.count : 0),0);
                vm.drawClientSourcePie(vm.clientSourceTblData);
                vm.drawClientSourceTable(vm.clientSourceTblData,vm.clientSourceTotalCount);
                vm.isShowLoadingSpinner('#clientSourceAnalysis', false);
            });
        }
        vm.drawClientSourcePie = function (srcData) {
            var placeholder = '#clientSourceAnalysis div.graphDiv';
            var pieData = srcData.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: vm.setGraphNameWithoutCutString(obj._id), data: obj.count};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            socketService.$plotPie(placeholder, pieData, {}, 'clientSourceClickData');
        }
        vm.drawClientSourceTable = function (tblData, count) {
            tblData.push({_id: $translate("Total"), count: count ? count : 0, ratio: "100%"})
            var options = $.extend({}, $scope.getGeneralDataTableOption, {
                data: tblData,
                columns: [
                    {title: $translate("Domain Name"), data: "_id"},
                    {title: $translate('amount'), data: "count"},
                    {title: $translate('ratio'), data: "ratio"}
                ],
                "paging": false
            });

            $('#clientSourceAnalysis table').dataTable(options);
        }
        //client source =============================================

        //consumption interval ////////////////////////////////////
        vm.getConsumptionIntervalData = function () {
            var sendObj = {
                platform: vm.selectedPlatform._id,
                days: vm.consumptionInterval.pastDay
            }
            socketService.$socket($scope.AppSocket, 'getConsumptionIntervalData', sendObj, function (data) {
                console.log('data', data);
                vm.consumptionInterval.data = data.data || [];
                var graphData = [];
                vm.consumptionInterval.data.forEach(item => {
                    graphData.push([new Date(item.time0), item.count, new Date(item.time1)]);
                })
                vm.drawConsumptionIntervalLine('#line-consumptionInterval', graphData, {});
            });
        };
        vm.drawConsumptionIntervalLine = function (dom, graphData, option) {
            var data = {label: '', data: graphData};
            var newOptions = {};
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: $translate('amount'),
            }];
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: $translate('TIME')
            }];
            newOptions.xaxis = {
                tickLength: 0,
                mode: "time",
                minTickSize: [1, "minute"],
                timezone: "browser"
            }
            socketService.$plotLine('#line-consumptionInterval', [data], newOptions);
            vm.bindHover('#line-consumptionInterval', function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);
                var t0 = obj.series.data[obj.dataIndex][0];
                var t1 = obj.series.data[obj.dataIndex][2];
                var showText = $translate('from') + ' : ' + utilService.getFormatTime(t0) + '<br>'
                    + $translate('to') + ' : ' + utilService.getFormatTime(t1) + '<br>'
                    + $translate('amount') + ' : ' + y;
                $("#tooltip").html(showText)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })
        }

        //common functions======================================================
        vm.bindHover = function (placeholder, callback) {
            $(placeholder).bind("plothover", function (event, pos, obj) {
                var previousPoint;
                if (!obj) {
                    $("#tooltip").hide();
                    previousPoint = null;
                    return;
                } else {
                    if (previousPoint != obj.dataIndex) {
                        previousPoint = obj.dataIndex;

                        if (callback) {
                            callback(obj);
                        }
                    }
                }
            });
        }

        vm.toggleGraphSettingPanel = function (id, optionName) {
            $(id).toggle();
            if ($(id).is(":visible")) {
                vm.optionText[optionName] = "Hide Options";
            } else {
                vm.optionText[optionName] = "Show Options";
            }
            $scope.safeApply();
        }

        vm.initSearchParameter = function (field, period, graphType, callback, noResetTime) {
            if (!noResetTime){
                vm.queryPara[field] = {};
            }
            vm.optionText[field] = "Hide Options";

            if(noResetTime) {
                // do nothing
            }
            else if (field && field === 'appPlayer') {
                utilService.actionAfterLoaded(('#' + field + 'Analysis'), function () {
                    let today = new Date();
                    let todayEndTime = today.setHours(23, 59, 59, 999);
                    vm.queryPara[field].startTime = utilService.createDatePickerWithoutTime('#' + field + 'Analysis .startTime');
                    vm.queryPara[field].endTime = utilService.createDatePickerWithoutTime('#' + field + 'Analysis .endTime');
                    vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
                    vm.queryPara[field].endTime.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                })
            } else {
                if (period && field != 'reward') {
                    utilService.actionAfterLoaded(('#' + field + 'Analysis'), function () {
                        vm.queryPara[field].startTime = utilService.createDatePicker('#' + field + 'Analysis .startTime');
                        vm.queryPara[field].endTime = utilService.createDatePicker('#' + field + 'Analysis .endTime');
                        vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                        vm.queryPara[field].endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    })
                } else {
                    vm.queryPara[field].startTime = utilService.setNDaysAgo(new Date(), 1);
                    if (field == 'playerRetention') {
                        vm.queryPara[field].endTime = utilService.setNDaysAfter(new Date(), 28);
                        vm.queryPara[field].minTime = utilService.getFormatDate(vm.queryPara[field].startTime);
                    } else {
                        vm.queryPara[field].endTime = new Date();
                    }
                }
            }

            if (period) {
                vm.queryPara[field].periodText = period;
            }
            var returnHeight = 0;
            if (graphType == 1) { // 1 graph
                var tablePanel = $('#' + field + 'Analysis .rightPanel');
                var height = $(tablePanel).width() * .3;
                $(tablePanel).css('height', height + 'px');
            } else if (graphType == 2) {// 2 graph
                $('#analysisPanel .section').each(function (i, j) {
                    var leftPanel = $(j).find('.col-md-5 .panel')[0];
                    var rightPanel = $(j).find('.col-md-7 .panel')[0];
                    var height = $(leftPanel).width() * .8;
                    $(leftPanel).height(height);
                    $(rightPanel).height(height);
                    returnHeight = height;
                });
            } else if (graphType == 3) {//left graph, right table
                var tablePanel = $('#' + field + 'Analysis .tableDiv');
                var graphPanel = $('#' + field + 'Analysis .graphDiv');
                var height = $(tablePanel).width() * .7;
                $(graphPanel).height(height);
                $(tablePanel).css('max-height', height + 'px');
            } else if (graphType == 4) {//left graph, right table
                var tablePanel = $('#' + field + 'Analysis .leftPanel');
                var graphPanel = $('#' + field + 'Analysis .rightPanel');
                var height = $(graphPanel).width() * .6;
                $(graphPanel).css('height', height + 'px');
                $(tablePanel).css('height', height + 'px');
            }
            if (callback) {
                callback(returnHeight);
            }
        }

        vm.dateReformat = function (data) {
            return utilService.$getTimeFromStdTimeFormat(data);
        };

        vm.setGraphName = function (data, ltr, num) {
            //data=src string, ltr=bool (from left to right?) , digits= number of character
            if (!data) return $translate("Unknown");
            if (data.length == 0) {
                return $translate('Unknown');
            }
            ltr = Boolean(ltr || true);
            num = num || 6;
            if (data.length < 10) {
                return data;
            } else {
                return ltr ? data.substring(0, num).concat('...') : data.substr(data.length - num).concat('...');
            }
        }

        vm.setGraphNameWithoutCutString = function (data, ltr, num) {
            //data=src string, ltr=bool (from left to right?) , digits= number of character
            if (!data) return $translate("Unknown");
            if (data.length == 0) {
                return $translate('Unknown');
            }
            ltr = Boolean(ltr || true);
            num = num || 6;

            return data;
        }

        //common functions======================================================

////////////////Mark::$viewContentLoaded function//////////////////
//##Mark content loaded function
        // $scope.$on('$viewContentLoaded', function () {
        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
        }
        $scope.$on(eventName, function (e, d) {
            $scope.$evalAsync(() => {
                vm.getAllProvider();
                vm.optionText = {};
                vm.queryPara = {};
                vm.loadPage("PLATFORM_OVERVIEW");

                $("<div id='tooltip'></div>").css({
                    position: "absolute",
                    border: "1px solid #fdd",
                    padding: "2px",
                    "background-color": "#fee",
                    opacity: 0.80
                }).appendTo("body");

                if (!authService.checkViewPermission('Analysis', 'Analysis', 'Read')) {
                    return;
                }

                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.platformList = data.data;
                        if (vm.platformList.length == 0)return;
                        vm.platformObjIdList = vm.platformList.map(item => item._id);
                        vm.selectedPlatform = vm.platformList[0];
                        vm.selectedPlatformID = vm.selectedPlatform._id;
                    })
                });
            })
        });

        vm.drawLocationCityGraphByElementId = function (elementId, data, tag) {
            let pieData=[];
            if (tag == "IPLocation") {
                pieData = data.map(item => {
                    let data = {
                        label: item._id.city || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }
            if (tag == "phoneLocation") {
                pieData = data.map(item => {
                    let data = {
                        label: item._id.phoneCity || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }

            socketService.$plotPie(elementId, pieData, {});
        };


        vm.drawLocationCountryGraphByElementId = function (elementId, data, tag) {
            let pieData=[];
            if (tag == "IPLocation"){
                pieData = data.map(item => {
                    let data = {
                        label: vm.getCountryTitle(item._id.country) || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }
            if (tag == "phoneLocation"){
                pieData = data.map(item => {
                    let data = {
                        label: item._id.phoneProvince || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }

            socketService.$plotPie(elementId, pieData, {});
        };

        vm.initDemoPlayerLog = function (status, selectedDate) {
            vm.status = status;
            vm.selectedDate = selectedDate;
            vm.demoPlayerLog = {};
            utilService.actionAfterLoaded('#modalDemoPlayerLog.in #demoPlayerLogTblPage', function () {
                vm.demoPlayerLog.pageObj = utilService.createPageForPagingTable("#demoPlayerLogTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "demoPlayerLog", vm.getDemoPlayerLogData);
                });
                vm.getDemoPlayerLogData(true);
            });
        };

        vm.getDemoPlayerLogData = function (newSearch) {

            let sendQuery = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.demoPlayer.periodText,
                status: vm.status,
                selectedDate: vm.selectedDate,
                index: newSearch ? 0 : vm.demoPlayerLog.index,
                limit: newSearch ? 10 : vm.demoPlayerLog.limit,
                sortCol: vm.demoPlayerLog.sortCol || null
            };

            socketService.$socket($scope.AppSocket, 'getDemoPlayerLog', sendQuery, function (data) {
                console.log("getDemoPlayerLog", data);
                let tblData = data && data.data ? data.data.data : [];
                let total = data.data ? data.data.total : 0;
                vm.demoPlayerLog.totalCount = total;
                if (tblData && tblData.length > 0) {
                    let count = sendQuery.index || 0;
                    tblData.map(data => {
                        if (data.status == vm.constDemoPlayerStatus.OLD_PLAYER || data.status == vm.constDemoPlayerStatus.POST_CONVERT) {
                            if (data.phoneNumber) {
                                let str = data.phoneNumber;
                                data.phoneNumber = str.substring(0, 3) + "******" + str.slice(-4);
                            }
                        }
                        count += 1;
                        data.rowNumber = count;
                    });
                }
                vm.drawDemoPlayerLogTable(newSearch, tblData, total);
            });
        };

        vm.drawDemoPlayerLogTable = function (newSearch, tblData, size) {
            let tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('order'), data: "rowNumber"},
                    {title: $translate('Demo Player Account'), data: "name"},
                    {title: $translate('phoneNumber'), data: "phoneNumber"},
                ],
                "paging": false,
                "searching": false,
                "info": false,
                "destroy": true,
                "scrollCollapse": true,
                "language": {
                    "emptyTable": $translate("No data available in table"),
                }
            });
            let aTable = $("#demoPlayerLogTbl").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            vm.demoPlayerLog.pageObj.init({maxCount: size}, newSearch);
            $('#demoPlayerLogTbl').resize();
            $('#demoPlayerLogTbl').off('order.dt');
            $scope.safeApply();
        };

        vm.analyseIpDomain = function (canRepeat) {
            let keyword = canRepeat ? "ipDomain" : "ipDomainUnique";

            if (!vm.queryPara || !vm.queryPara[keyword]) return;

            let sendQuery = {
                platformObjId: vm.selectedPlatform._id,
                startTime: vm.queryPara[keyword].startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara[keyword].endTime.data('datetimepicker').getLocalDate(),
                canRepeat: canRepeat
            };

            if (vm.queryPara[keyword].domain) {
                if (canRepeat) {
                    vm.ipDomainAnalysisDay = true;
                } else {
                    vm.ipDomainUniqueAnalysisDay = true;
                }

                sendQuery.domain = vm.queryPara[keyword].domain;
            } else {
                if (canRepeat) {
                    vm.ipDomainAnalysisDay = false;
                } else {
                    vm.ipDomainUniqueAnalysisDay = false;
                }
            }

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getIpDomainAnalysis', sendQuery, function (data) {
                console.log('getIpDomainAnalysis output', data);

                if (canRepeat && vm.ipDomainAnalysisDay) {
                    let calculatedIpDomainAnalysisDayData = vm.calculateLineDataAndAverage(data.data, 'count', 'AMOUNT');
                    vm.ipDomainAnalysisDayAverage = calculatedIpDomainAnalysisDayData.average;
                    vm.plotLineByElementId("#line-ipDomainDayCount", calculatedIpDomainAnalysisDayData.lineData, $translate('AMOUNT'), $translate("DAY"));
                    vm.drawIpDomainDayTable(data.data, "#ipDomainDayAnalysisTable");
                } else if (canRepeat) {
                    vm.drawIpDomainPie(data.data, "#ipDomainAnalysis .pieChart");
                    vm.drawIpDomainTable(data.data, "#ipDomainAnalysisTable");
                } else if (vm.ipDomainUniqueAnalysisDay) {
                    let calculatedIpDomainUniqueAnalysisDayData = vm.calculateLineDataAndAverage(data.data, 'count', 'AMOUNT');
                    vm.ipDomainUniqueAnalysisDayAverage = calculatedIpDomainUniqueAnalysisDayData.average;
                    vm.plotLineByElementId("#line-ipDomainUniqueDayCount", calculatedIpDomainUniqueAnalysisDayData.lineData, $translate('AMOUNT'), $translate("DAY"));
                    vm.drawIpDomainDayTable(data.data, "#ipDomainUniqueDayAnalysisTable");
                } else {
                    vm.drawIpDomainPie(data.data, "#ipDomainUniqueAnalysis .pieChart");
                    vm.drawIpDomainTable(data.data, "#ipDomainUniqueAnalysisTable");
                }
            });
        };

        vm.getIpDomainOption = function () {
            let sendQuery = {
                platformObjId: vm.selectedPlatform._id,
                startTime: vm.queryPara["ipDomain"].startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara["ipDomain"].endTime.data('datetimepicker').getLocalDate()
            };

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getUniqueIpDomainsWithinTimeFrame', sendQuery, function (data) {
                console.log('getUniqueIpDomainsWithinTimeFrame output', data);

                if (data && data.data && data.data.length) {
                    vm.ipDomainOption = data.data;
                } else {
                    vm.ipDomainOption = [];
                }

                $scope.$evalAsync();
            });
        };

        vm.getIpDomainUniqueOption = function () {
            let sendQuery = {
                platformObjId: vm.selectedPlatform._id,
                startTime: vm.queryPara["ipDomainUnique"].startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara["ipDomainUnique"].endTime.data('datetimepicker').getLocalDate()
            };

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getUniqueIpDomainsWithinTimeFrame', sendQuery, function (data) {
                console.log('getUniqueIpDomainsWithinTimeFrame output', data);

                if (data && data.data && data.data.length) {
                    vm.ipDomainUniqueOption = data.data;
                } else {
                    vm.ipDomainUniqueOption = [];
                }

                $scope.$evalAsync();
            });
        };

        vm.getIpDomainOptionDebounce = $scope.debounceSearch(vm.getIpDomainOption);
        vm.getIpDomainUniqueOptionDebounce = $scope.debounceSearch(vm.getIpDomainUniqueOption);

        vm.drawIpDomainPie = function (srcData, pieChartName) {
            let placeholder = pieChartName + ' div.graphDiv';
            let finalizedPieData = [];

            srcData.map(s => {
                finalizedPieData.push({label: s.domain, data: s.count});
            });

            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            var options = {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.8
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0.0
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            };

            socketService.$plotPie(placeholder, finalizedPieData, options, 'clientSourceClickData');

        };

        vm.drawIpDomainTable = function (srcData, tableName) {
            let tableData = [];
            let total = 0;
            let tableAmountColumnName = $translate("VISITED_TIMES") + "(" + $translate("IP_REPEAT") + ")";

            srcData.map(item => {
                total += item.count;
            });

            srcData.map(item => {
                item.ratio = Number(item.count / total * 100).toFixed(2);
                tableData.push(item);
            });

            if (tableName == "#ipDomainUniqueAnalysisTable") {
                tableAmountColumnName = $translate("VISITED_IP_AMOUNT");
            }

            tableData.push({domain: $translate("total"), count: total, ratio: "100%"});

            var dataOptions = {
                data: tableData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false, sClass: "text-center"}
                ],
                columns: [
                    {title: $translate("VISITED_DOMAIN"), data: "domain"},
                    {title: tableAmountColumnName, data: "count"},
                    {title: $translate('ratio'), data: "ratio", bSortable: true}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $(tableName).DataTable(dataOptions);
            a.columns.adjust().draw();
        };

        vm.drawIpDomainDayTable = function (srcData, tableName) {
            let tableData = [];
            let total = 0;
            let tableAmountColumnName = $translate("VISITED_TIMES") + "(" + $translate("IP_REPEAT") + ")";

            let keyword = "ipDomain";

            if (tableName == "#ipDomainUniqueDayAnalysisTable") {
                keyword = "ipDomainUnique";
                tableAmountColumnName = $translate("VISITED_TIMES") + "(" + $translate("IP_NOT_REPEAT") + ")";
            }

            srcData.map(item => {
                tableData.push(item);
                total += item.count;
            });

            tableData.map(data => {
                if(data){
                    if(data.date){
                        data.date = String(utilService.$getTimeFromStdTimeFormat(new Date(data.date))).substring(0, 10);
                    }
                }
            });
            tableData.push({date: $translate("total"), count: total});

            var dataOptions = {
                data: tableData,
                "aaSorting": [],
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false, sClass: "text-center"}
                ],
                columns: [
                    {title: $translate("DAY") + "(" + vm.queryPara[keyword].domain + ")", data: "date"},
                    {title: tableAmountColumnName, data: "count"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $(tableName).DataTable(dataOptions);
            a.columns.adjust().draw();
        };

        vm.commonPageChangeHandler = function (curP, pageSize, objKey, searchFunc) {
            var isChange = false;
            if (!curP) {
                curP = 1;
            }
            if (pageSize != vm[objKey].limit) {
                isChange = true;
                vm[objKey].limit = pageSize;
            }
            if ((curP - 1) * pageSize != vm[objKey].index) {
                isChange = true;
                vm[objKey].index = (curP - 1) * pageSize;
            }
            if (isChange) return searchFunc.call(this);
        };

        //#region All Platform Online Top Up Success Rate
        vm.getAllOnlineToupSuccessRateData = () => {
            let startDate = vm.queryPara.allOnlineTopupSuccessRate.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.allOnlineTopupSuccessRate.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformList: vm.queryPara.allOnlineTopupSuccessRate.platformList,
                startDate: startDate,
                endDate: endDate,
                analysisCategory: vm.queryPara.allOnlineTopupSuccessRate.analysisCategory,
                operator:  vm.queryPara.allOnlineTopupSuccessRate.timeOperator,
                timesValue: vm.queryPara.allOnlineTopupSuccessRate.timesValue,
                timesValueTwo: vm.queryPara.allOnlineTopupSuccessRate.timesValueTwo
            };
            vm.allPlatformOnlineTopupAnalysisCategory = vm.queryPara.allOnlineTopupSuccessRate.analysisCategory;
            vm.isShowLoadingSpinner('#allOnlineTopupSuccessRateAnalysis', true);
            socketService.$socket($scope.AppSocket, 'getAllOnlineTopupAnalysis', sendData, data => {
                $scope.$evalAsync(()=>{
                    console.log('data.data', data.data);
                    vm.allPlatformOnlineTopupAnalysisData = data.data[0];

                    for (let i = 0; i < vm.allPlatformOnlineTopupAnalysisData.length; i++) {
                        for (let j = 0; j < vm.allPlatformOnlineTopupAnalysisData[i].length; j++) {
                            for (let k = vm.allPlatformOnlineTopupAnalysisData[i][j].length - 1; k >= 0; k--) {
                                let analysisData =  vm.allPlatformOnlineTopupAnalysisData[i][j][k];
                                if (typeof analysisData._id == "string") {
                                    for (let l = vm.allPlatformOnlineTopupAnalysisData[i][j].length - 1; l >= 0; l--) {
                                        let analysisData2 = vm.allPlatformOnlineTopupAnalysisData[i][j][l];
                                        if (Number(analysisData._id) == analysisData2._id && typeof analysisData2._id == 'number') {
                                            analysisData.amount += analysisData2.amount;
                                            analysisData.count += analysisData2.count;
                                            analysisData.successCount += analysisData2.successCount;
                                            analysisData.successUserCount += analysisData2.successUserCount;
                                            analysisData.userCount += analysisData2.userCount;
                                            vm.allPlatformOnlineTopupAnalysisData[i][j].splice(l,1);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    vm.allPlatformOnlineTopupAnalysisDataTotalUserCount = data.data[1].totalUserCount;
                    vm.allPlatformOnlineTopupAnalysisTotalUserCount = vm.allPlatformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[1].userAgentUserCount,0);
                    let totalSuccessCount = vm.allPlatformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.successCount, 0), 0);
                    let totalUnsuccessCount = vm.allPlatformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.count, 0), 0) - totalSuccessCount;
                    let totalCount = totalSuccessCount + totalUnsuccessCount;
                    let proposalCount = vm.allPlatformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.proposalArr.length, 0),0);
                    vm.allPlatformOnlineTopupAnalysisTotalData = {
                        totalCount: totalCount,
                        successCount: totalSuccessCount,
                        successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((totalSuccessCount / totalCount) * 100),
                        receivedAmount: vm.allPlatformOnlineTopupAnalysisData.reduce((a, data) =>  a + data[0].reduce((b, data1) => b + data1.amount, 0),0),
                        amountRatio: 100,
                        userCount: vm.allPlatformOnlineTopupAnalysisDataTotalUserCount,
                        userCountRatio: 100,
                        proposalCount: proposalCount
                    };
                    vm.allPlatformOnlineTopupAnalysisByType = [];
                    vm.allPlatformOnlineTopupDetailData = [];
                    vm.allPlatformOnlineTopupDetailDataByType = [];

                    if (data && data.data[0] && data.data[0].length) {
                        for (let i = 0; i < data.data[0].length; i++) {
                            if (i === 0) {
                                vm.allPlatformOnlineTopupDetailData.push({userAgent: "WEB", data: data.data[0][i][2]});
                            } else if (i === 1) {
                                vm.allPlatformOnlineTopupDetailData.push({userAgent: "APP", data: data.data[0][i][2]});
                            } else if (i === 2) {
                                vm.allPlatformOnlineTopupDetailData.push({userAgent: "H5", data: data.data[0][i][2]});
                            }
                        }
                    }

                    Object.keys($scope.userAgentType).forEach(
                        userAgentTypeKey => {
                            if (vm.allPlatformOnlineTopupAnalysisCategory === 'thirdPartyPlatform') {
                                // thirdPartyPlatform
                                Object.keys($scope.merchantTopupTypeJson).forEach(key => {
                                    vm.merchantTypes.forEach(
                                        merchantType => {
                                            if(merchantType.name && userAgentTypeKey != 0){
                                                let calculatedData = vm.calculateAllOnlineTopupTypeData(key, userAgentTypeKey-1, merchantType.name);
                                                if(calculatedData.totalCount) // if no data dont show
                                                    vm.allPlatformOnlineTopupAnalysisByType.push(calculatedData);
                                            }
                                        }
                                    );
                                });
                            } else if(vm.allPlatformOnlineTopupAnalysisCategory === 'merchantNo') {
                                let merchantListWithoutRepeatMerchantNo = [];
                                let existMerchantNoArr = [];
                                vm.allPlatformMerchantList.forEach(
                                    merchant => {
                                        if(!existMerchantNoArr.includes(merchant.merchantNo)){
                                            existMerchantNoArr.push(merchant.merchantNo);
                                            merchantListWithoutRepeatMerchantNo.push(merchant);
                                        }
                                    }
                                );
                                Object.keys($scope.merchantTopupTypeJson).forEach(key => {
                                    merchantListWithoutRepeatMerchantNo.forEach(
                                        merchant => {
                                            if (userAgentTypeKey == 0) return;
                                            let calculatedData = vm.calculateAllOnlineTopupTypeData(key, userAgentTypeKey-1, null, merchant.merchantNo);
                                            if(calculatedData.totalCount) // if no data dont show
                                                vm.allPlatformOnlineTopupAnalysisByType.push(calculatedData);
                                        }
                                    );
                                });
                            } else {
                                // onlineTopupType
                                Object.keys($scope.merchantTopupTypeJson).forEach(key => {
                                    if (userAgentTypeKey == 0) return;
                                    vm.allPlatformOnlineTopupAnalysisByType.push(vm.calculateAllOnlineTopupTypeData(key, userAgentTypeKey-1));
                                });
                            }
                        }
                    );
                    vm.allPlatformOnlineTopupAnalysisSubTotalData = {
                        WEB: vm.calculateAllOnlineTopupTypeSubtotalData(1),
                        APP: vm.calculateAllOnlineTopupTypeSubtotalData(2),
                        H5: vm.calculateAllOnlineTopupTypeSubtotalData(3)
                    };

                    vm.allPlatformOnlineTopupAnalysisDetailMerchantId = null;
                    vm.isShowLoadingSpinner('#allOnlineTopupSuccessRateAnalysis', false);
                });
            });
        };

        vm.allPlatformOnlineTopupAnalysisShowDetail = (merchantTopupTypeId, userAgent, type, totalAmount, totalUser, merchantNo, merchantTypeName) => {
            vm.allPlatformOnlineTopupDetailDataByType = [];
            vm.allPlatformOnlineTopupAnalysisDetailMerchantId = merchantTopupTypeId;
            vm.allPlatformOnlineTopupAnalysisDetailUserAgent = userAgent;
            vm.allPlatformOnlineTopupAnalysisDetailMerchantNo = merchantNo || '';
            vm.allPlatformOnlineTopupAnalysisDetailMerchantName = merchantTypeName || '';

            vm.allPlatformOnlineTopupDetailData.forEach(
                data => {
                    if (data && data.userAgent && data.userAgent === type) {
                        data.data.forEach(item => {
                            if (item && item.type && item.type.toString() === merchantTopupTypeId.toString()) {
                                item.data.forEach(topupData => {
                                    vm.allPlatformOnlineTopupDetailDataByType.push({
                                        type: item.type,
                                        platformObjId: topupData.platform,
                                        platformName: topupData.platformName,
                                        proposalArr: topupData.proposalArr,
                                        totalCount: topupData.count,
                                        successCount: topupData.successCount,
                                        successRate: topupData.count === 0 ? 0 : $noRoundTwoDecimalPlaces((topupData.successCount / topupData.count) * 100),
                                        receivedAmount: topupData.amount,
                                        amountRatio: totalAmount === 0 ? 0 : $noRoundTwoDecimalPlaces((topupData.amount / totalAmount) * 100),
                                        userCount: topupData.successUserCount,
                                        userCountRatio: totalUser === 0 ? 0 : $noRoundTwoDecimalPlaces((topupData.successUserCount / totalUser) * 100)
                                    });
                                })
                            }
                        });
                    }
                }
            );

            let totalSuccessCount = 0;
            let totalCount = 0;
            let totalProposalCount = 0;
            if (vm.allPlatformOnlineTopupDetailDataByType && vm.allPlatformOnlineTopupDetailDataByType.length > 0) {
                totalSuccessCount = vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.successCount, 0);
                totalCount = vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.totalCount, 0);

                vm.allPlatformOnlineTopupDetailDataByType.forEach(item => {
                    if (item && item.proposalArr && item.proposalArr.length > 0) {
                        totalProposalCount += item.proposalArr.length;
                    }
                });
            }

            vm.allPlatformOnlineTopupAnalysisDetailTotalData = {};
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.totalCount = vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.totalCount, 0);
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.successCount = vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.successCount, 0);
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.successRate = totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((totalSuccessCount / totalCount) * 100);
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.receivedAmount = vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.receivedAmount, 0);
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.userCount =vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.userCount, 0);
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.amountRatio = $noRoundTwoDecimalPlaces(vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.amountRatio, 0));
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.userCountRatio = $noRoundTwoDecimalPlaces(vm.allPlatformOnlineTopupDetailDataByType.reduce((a, data) => a + data.userCountRatio, 0));
            vm.allPlatformOnlineTopupAnalysisDetailTotalData.proposalCount = totalProposalCount;
        };

        vm.initOnlineTopUpAnalysisProposalDetail = (proposalArr) => {
            if (proposalArr && proposalArr.length > 0){

                if (vm.queryPara.allOnlineTopupSuccessRate.timeOperator != 'range'){
                    if (typeof vm.queryPara.allOnlineTopupSuccessRate.timesValue == 'number'){
                        vm.titleTag = $translate("successCount") + " (" + $translate("Preset-Processing Time") + " " + vm.queryPara.allOnlineTopupSuccessRate.timeOperator + " " + vm.queryPara.allOnlineTopupSuccessRate.timesValue + $translate("Minutes") + ") ";
                    }
                    else{
                        vm.titleTag = $translate("successCount") + " (" + $translate("Preset-Processing Time") + ") " ;
                    }
                }
                else{
                    if (typeof vm.queryPara.allOnlineTopupSuccessRate.timesValue == 'number' && typeof vm.queryPara.allOnlineTopupSuccessRate.timesValueTwo == 'number') {
                        vm.titleTag = $translate("successCount") + " (" + vm.queryPara.allOnlineTopupSuccessRate.timesValue  + $translate("Minutes") + " <= " + $translate("Preset-Processing Time") + " >= " + vm.queryPara.allOnlineTopupSuccessRate.timesValueTwo  + $translate("Minutes") + ") ";
                    }
                    else{
                        vm.titleTag = $translate("successCount") + " (" + $translate("Preset-Processing Time") + ") " ;
                    }
                }

                vm.allOnlineTopUpSuccessProposal = proposalArr.map(item => {
                    item.involveAmount$ = 0;
                    if (item.data.updateAmount) {
                        item.involveAmount$ = item.data.updateAmount;
                    } else if (item.data.amount) {
                        item.involveAmount$ = item.data.amount;
                    } else if (item.data.rewardAmount) {
                        item.involveAmount$ = item.data.rewardAmount;
                    } else if (item.data.commissionAmount) {
                        item.involveAmount$ = item.data.commissionAmount;
                    } else if (item.data.negativeProfitAmount) {
                        item.involveAmount$ = item.data.negativeProfitAmount;
                    }
                    item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                    item.typeName$ = $translate(item.type.name || "Unknown");
                    item.mainType$ = $translate(item.mainType || "Unknown");
                    if (item.mainType === "PlayerBonus")
                        item.mainType$ = $translate("Bonus");
                    item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                    if (item.data && item.data.remark) {
                        item.remark$ = item.data.remark;
                    }
                    item.status$ = $translate(item.type.name === "BulkExportPlayerData" || item.mainType === "PlayerBonus" || item.mainType === "PartnerBonus" ? vm.getStatusStrfromRow(item) == "Approved" ? "approved" : vm.getStatusStrfromRow(item) : vm.getStatusStrfromRow(item));

                    if (item.hasOwnProperty('creator')) {
                        item.creator$ = item.creator.name;
                    } else {
                        item.creator$ = $translate('System');
                        if (item && item.data && item.data.playerName) {
                            item.creator$ += "(" + item.data.playerName + ")";
                        }
                    }

                    if (item.inputDevice){
                        for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                            if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == item.inputDevice) {
                                item.inputDevice$ = $translate(Object.keys(vm.inputDevice)[i]);
                            }
                        }
                    }

                    if (item.hasOwnProperty('creator') && item.data.creator.type == 'player') {
                        item.$involvedAcc = item.data.creator.name;
                    }
                    if (item.data && item.data.playerName) {
                        item.$involvedAcc = item.data.playerName;
                    }
                    else if (item.data && item.data.partnerName) {
                        item.$involvedAcc = item.data.partnerName;
                    }
                    else {
                        item.$involvedAcc = "";
                    }

                    return item;
                })
            }
        };

        vm.calculateAllOnlineTopupTypeData = (merchantTopupTypeId, userAgent, merchantTypeName, merchantNo) => {
            let proposalArr = null;
            let typeData = vm.allPlatformOnlineTopupAnalysisData[userAgent][0].filter(data => data._id == merchantTopupTypeId)[0];
            if(merchantTypeName && !merchantNo) {
                // third party platform analysis
                typeData = typeData && typeData.merchantData ? typeData.merchantData.filter(data => data && data._id && data._id.merchantUseName && data._id.merchantUseName === merchantTypeName) : typeData;

                if(typeData) {
                    let successUserIds = [];
                    let proposalArrList = [];
                    // remove repeat user among different merchantNo to get merchant platform unique user
                    typeData.forEach(
                        data => {
                            successUserIds = orArrays(successUserIds, data.successUserIds);
                            proposalArrList = proposalArrList.concat(data.proposalArr);
                        }
                    );
                    // one platform might have multi merchant no, so need sum all data together
                    typeData = {
                        amount: typeData.reduce((a, data) => a + data.amount, 0),
                        userCount:typeData.reduce((a, data) => a + data.userCount, 0),
                        successUserCount: successUserIds.length,
                        _id: merchantTopupTypeId,
                        count: typeData.reduce((a, data) => a + data.count, 0),
                        successCount: typeData.reduce((a, data) => a + data.successCount, 0),
                        proposalArr: proposalArrList
                    };
                } else {
                    typeData = null; // empty array is not false, so set to null then later will set default object to typeData
                }
            } else if(merchantNo && typeData) {
                // merchantNo analysis
                let merchantNoData = typeData.merchantData.filter(data => data._id.merchantNo == merchantNo)[0];
                typeData = merchantNoData ?  merchantNoData : null;
            }

            typeData = typeData ? typeData : {amount:0, userCount:0, successUserCount:0, _id: merchantTopupTypeId, count:0, successCount: 0, proposalArr: []};

            if (typeData.proposalArr){
                proposalArr = typeData.proposalArr;
            }
            let totalCount = typeData.count;
            let returnObj =  {
                totalCount: totalCount,
                successCount: typeData.successCount,
                successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.successCount / totalCount) * 100),
                receivedAmount: typeData.amount,
                merchantTopupTypeId: merchantTopupTypeId,
                amountRatio: vm.allPlatformOnlineTopupAnalysisTotalData.receivedAmount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.amount / vm.allPlatformOnlineTopupAnalysisTotalData.receivedAmount) * 100),
                userCount: typeData.successUserCount,
                userCountRatio: vm.allPlatformOnlineTopupAnalysisDataTotalUserCount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.successUserCount / vm.allPlatformOnlineTopupAnalysisDataTotalUserCount) * 100),
            };
            if(typeData && typeData._id && typeData._id.merchantUseName) returnObj.merchantTypeName = typeData._id.merchantUseName;
            if(merchantTypeName) returnObj.merchantTypeName = merchantTypeName;
            if(merchantNo) returnObj.merchantNo = merchantNo;

            if (proposalArr){
                returnObj.proposalArr = proposalArr;
            }

            returnObj.name = $scope.merchantTopupTypeJson[merchantTopupTypeId];
            returnObj.userAgent = userAgent + 1;
            returnObj.type = $scope.userAgentType[returnObj.userAgent];
            return returnObj;
        };

        vm.calculateAllOnlineTopupTypeSubtotalData = (userAgent) => {
            let typeData =  vm.allPlatformOnlineTopupAnalysisByType.filter(data => data.userAgent === userAgent);
            let dataContainRecord = typeData.filter(data => data.totalCount > 0).length;
            let totalCount = typeData.reduce((a, data) => a + data.totalCount ,0);
            let successCount = typeData.reduce((a, data) => a + data.successCount ,0);
            let proposalCount = typeData.reduce((a, data) => a + (data.proposalArr ? data.proposalArr.length : 0), 0);
            return {
                data: typeData,
                totalCount: totalCount,
                successCount: successCount,
                successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((successCount / totalCount) *100),
                receivedAmount: typeData.reduce((a, data) => a + data.receivedAmount ,0),
                amountRatio: $noRoundTwoDecimalPlaces(typeData.reduce((a, data) => a + data.amountRatio ,0)),
                userCount: vm.allPlatformOnlineTopupAnalysisData[userAgent-1][1].userAgentUserCount,
                userCountRatio: $noRoundTwoDecimalPlaces(typeData.reduce((a, data) => a + data.userCountRatio ,0)),
                name: $scope.userAgentType[userAgent],
                proposalCount: proposalCount
            };
        };

        vm.allOnlineTopupTypeDataSort = (type, sortField) => {
            vm.allPlatformOnlineTopupSuccessTableSort[type] = vm.allPlatformOnlineTopupSuccessTableSort[type] === sortField ? '-'+sortField : sortField;
        };
        //#endregion

        //#region EU APP Player
        vm.plotAppPlayerLine = function () {
            let startDate = vm.queryPara.appPlayer.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.appPlayer.endTime.data('datetimepicker').getLocalDate();
            let sendData = {
                platformId: vm.selectedPlatform._id,
                startDate: startDate,
                endDate: endDate,
                playerType: vm.queryPara.appPlayer.playerType,
                deviceType: vm.queryPara.appPlayer.deviceType,
                domain: vm.queryPara.appPlayer.domain
            };

            if (vm.queryPara.appPlayer.playerType === 'login') {
                sendData.registrationInterfaceType = vm.queryPara.appPlayer.registrationInterfaceType;
            }

            console.log('sendData APP Player: ', sendData);

            vm.isShowLoadingSpinner('#appPlayerAnalysis', true);
            socketService.$socket($scope.AppSocket, 'countAppPlayer', sendData, function (data) {
                $scope.$evalAsync(() => {
                    console.log('appPlayer data:', data);
                    vm.platformAppPlayerDataPeriodText = vm.queryPara.appPlayer.periodText;
                    vm.platformAppPlayerAnalysisData = data.data.result;

                    if (vm.queryPara.appPlayer.playerType && vm.queryPara.appPlayer.playerType === 'new_registration') {
                        let calculatedAppPlayerData = vm.calculateLineDataAndAverage(vm.platformAppPlayerAnalysisData, 'newRegistration', 'NEW_REGISTRATION');
                        let totalSum = vm.platformAppPlayerAnalysisData.length !== 0 ? Math.floor(vm.platformAppPlayerAnalysisData.reduce((a, item) => a + (Number.isFinite(item["newRegistration"]) ? item["newRegistration"] : item["newRegistration"].length), 0)) : 0;
                        vm.platformAppPlayerAverage = calculatedAppPlayerData.average;
                        vm.platformAppPlayerTotalSum = {
                            newRegistrationTotalSum: totalSum
                        };
                        vm.plotLineByElementId("#line-appPlayer", calculatedAppPlayerData.lineData, $translate('HEAD_COUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.appPlayer.periodText.toUpperCase()));
                    } else if (vm.queryPara.appPlayer.playerType && vm.queryPara.appPlayer.playerType === 'login') {
                        vm.platformAppPlayerAverage = {
                            loginTimesAverage: vm.calculateAverageData(vm.platformAppPlayerAnalysisData, 'loginTimes'),
                            loginPlayerAverage: vm.calculateAverageData(vm.platformAppPlayerAnalysisData, 'loginPlayerCount')
                        };
                        let loginTimesTotalSum = vm.platformAppPlayerAnalysisData.length !== 0 ?Math.floor(vm.platformAppPlayerAnalysisData.reduce((a, item) => a + (Number.isFinite(item["loginTimes"]) ? item["loginTimes"] : item["loginTimes"].length), 0)) : 0;
                        let playerCountTotalSum = vm.platformAppPlayerAnalysisData.length !== 0 ?Math.floor(vm.platformAppPlayerAnalysisData.reduce((a, item) => a + (Number.isFinite(item["loginPlayerCount"]) ? item["loginPlayerCount"] : item["loginPlayerCount"].length), 0)) : 0;
                        vm.platformAppPlayerTotalSum = {
                            loginTimesTotalSum: loginTimesTotalSum,
                            playerCountTotalSum: playerCountTotalSum,
                            totalConsecutiveLogin: data.data.totalConsecutiveLogin
                        };

                        let loginTimes = [];
                        let loginPlayerCount = [];
                        let loginTimesAverage = [];
                        let loginPlayerAverage = [];
                        vm.platformAppPlayerAnalysisData.forEach(
                            data => {
                                loginTimes.push([new Date(data.date), data.loginTimes]);
                                loginPlayerCount.push([new Date(data.date), data.loginPlayerCount]);
                                loginTimesAverage.push([new Date(data.date), vm.platformAppPlayerAverage.loginTimesAverage]);
                                loginPlayerAverage.push([new Date(data.date), vm.platformAppPlayerAverage.loginPlayerAverage]);
                            }
                        );
                        let lineData = [
                            {label: $translate('loginTimes'), data: loginTimes},
                            {label: $translate('LOGIN_PLAYER_COUNT'), data: loginPlayerCount},
                            {label: $translate('LOGIN_TIMES_AVERAGE'), data: loginTimesAverage},
                            {label: $translate('LOGIN_PLAYER_COUNT_AVERAGE'), data: loginPlayerAverage},
                        ];
                        vm.plotLineByElementId("#line-appPlayer", lineData, '', $translate('PERIOD') + ' : ' + $translate(vm.queryPara.appPlayer.periodText.toUpperCase()));
                    }

                    vm.isShowLoadingSpinner('#appPlayerAnalysis', false);

                });

            });

        };

        vm.playerTypeChanged = function () {
            vm.queryPara.appPlayer.periodText = 'day';
            vm.platformAppPlayerAverage = null;
            if (vm.queryPara && vm.queryPara.appPlayer && vm.queryPara.appPlayer.playerType && (vm.queryPara.appPlayer.playerType === 'login')) {
                vm.queryPara.appPlayer.registrationInterfaceType = 'all';
            }
        };
        //#endregion
    };
    analysisController.$inject = injectParams;
    myApp.register.controller('analysisCtrl', analysisController);
});
