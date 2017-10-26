'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies"];
    let monitorPaymentController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies) {
        let $translate = $filter('translate');
        let vm = this;

        window.mPVM = vm;
        // vm.pp = $scope.$parent.vm.selectStoredPlatform; // it work
        // console.log('mVM', monitorVM) // it work

        // declare constant
        vm.proposalStatusList = {
            PREPENDING: "PrePending",
            PENDING: "Pending",
            PROCESSING: "Processing",
            SUCCESS: "Success",
            FAIL: "Fail",
            CANCEL: "Cancel",
            EXPIRED: "Expired",
            UNDETERMINED: "Undetermined"
        };
        vm.topUpTypeList = {
            MANUAL: 1,
            ONLINE: 2,
            ALIPAY: 3,
            WECHAT: 4,
            QUICKPAY: 5
        };
        vm.getDepositMethodbyId = {
            1: 'Online',
            2: 'ATM',
            3: 'Counter'
        };
        vm.topUpField = {
          "ManualPlayerTopUp": 'bankCardNo',
          "PlayerAlipayTopUp": 'alipayAccount',
          "PlayerWechatTopUp": 'wechatAccount',
          "PlayerTopUp": 'merchantNo'
        }
        vm.seleDataType = {};

        $scope.$on('setPlatform', function () {
            vm.setPlatform();
        });

        vm.setPlatform = function () {
            // vm.operSelPlatform = false;
            // vm.selectedPlatform = JSON.parse(platObj);
            vm.selectedPlatform = $scope.$parent.vm.selectedPlatform;
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            vm.getPlatformProvider(vm.selectedPlatform._id);
            vm.getProposalTypeByPlatformId(vm.selectedPlatform._id);
            vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
            vm.getCredibilityRemarksByPlatformId(vm.selectedPlatform._id);
            vm.getRewardList();
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage(vm.showPageName); // 5
            $scope.safeApply();
        };

        vm.getPlatformProvider = function (id) {
            if (!id) return;
            socketService.$socket($scope.AppSocket, 'getPlatform', {_id: id}, function (data) {
                vm.allProviders = data.data.gameProviders;
                console.log('vm.allProviders', data.data.gameProviders);
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        };

        vm.getProposalTypeByPlatformId = function (allPlatformId) {
            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: allPlatformId}, function (data) {
                vm.allProposalType = data.data;
                vm.allProposalType.sort(
                    function (a, b) {
                        if (vm.getProposalTypeOptionValue(a) > vm.getProposalTypeOptionValue(b)) return 1;
                        if (vm.getProposalTypeOptionValue(a) < vm.getProposalTypeOptionValue(b)) return -1;
                        return 0;
                    }
                );
                console.log("vm.allProposalType:", vm.allProposalType);
                $scope.safeApply();
            }, function (error) {
                console.error(error);
            });
        };

        vm.getProposalTypeOptionValue = function (proposalType) {
            let result = utilService.getProposalGroupValue(proposalType);
            return $translate(result);
        };

        vm.getPlayerLevelByPlatformId = function (id) {
            socketService.$socket($scope.AppSocket, 'getPlayerLevelByPlatformId', {platformId: id}, function (data) {
                vm.playerLvlData = {};
                if (data.data) {
                    $.each(data.data, function (i, v) {
                        vm.playerLvlData[v._id] = v;
                    })
                }
                console.log("vm.playerLvlData", vm.playerLvlData);

                $scope.safeApply();
            }, function (data) {
                console.error("cannot get player level", data);
            });
        };

        vm.getRewardList = function (callback) {
            vm.rewardList = [];
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform._id}, function (data) {
                vm.rewardList = data.data;
                console.log('vm.rewardList', vm.rewardList);
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
        };

        vm.loadPage = function () {
            socketService.clearValue();
            vm.preparePaymentMonitorPage();
        };

        vm.preparePaymentMonitorPage = function () {
            $('#autoRefreshProposalFlag')[0].checked = true;
            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.paymentMonitorQuery = {};
            vm.paymentMonitorQuery.totalCount = 0;
            vm.getAllPaymentAcc();

            Promise.all([getMerchantList(), getMerchantTypeList()]).then(
                data => {
                    vm.merchants = data[0];
                    vm.merchantTypes = data[1];
                    vm.getMerchantTypeName();
                    vm.merchantGroups = getMerchantGroups(vm.merchants, vm.merchantTypes);
                    vm.merchantNumbers = getMerchantNumbers(vm.merchants);
                    vm.getPaymentMonitorRecord();
                }
            );

            utilService.actionAfterLoaded("#paymentMonitorTablePage", function () {
                vm.commonInitTime(vm.paymentMonitorQuery, '#paymentMonitorQuery');
                vm.paymentMonitorQuery.merchantType = null;
                vm.paymentMonitorQuery.pageObj = utilService.createPageForPagingTable("#paymentMonitorTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "paymentMonitorQuery", vm.getPaymentMonitorRecord)
                });
                $scope.safeApply();
            })

        };
        // function for new topup report
        vm.getProvinceName = function(provinceId){
          socketService.$socket($scope.AppSocket, "getProvince", {provinceId: provinceId}, function (data) {
              var text = data.data.province ? data.data.province.name : '';
              vm.selectedProposal.data.provinceName = text;
              $scope.safeApply();
          });
        }

        vm.getCityName = function(cityId){
          socketService.$socket($scope.AppSocket, "getCity", {cityId: cityId}, function (data) {
              var text = data.data.city ? data.data.city.name : '';
              vm.selectedProposal.data.cityName = text;
              $scope.safeApply();
          });
        }
        vm.getMerchantTypeName = function(){
          vm.merchants.map(item=>{
            let merchantTypeId = item.merchantTypeId;
            if(merchantTypeId){
              if(merchantTypeId=="9999"){
                item.merchantTypeName = $translate('BankCardNo');
              }else{
                item.merchantTypeName = vm.merchantTypes[merchantTypeId] ? vm.merchantTypes[merchantTypeId].name : "";
              }
            }else{
              item.merchantTypeName = '';
            }
          })
        }
        vm.getAllPaymentAcc = function(){
            socketService.$socket($scope.AppSocket, 'getAllBankCard', {platform: vm.selectedPlatform.platformId},
                data => {
                    var data = data.data;
                    vm.bankCards = data.data ? data.data : [];
            });
            socketService.$socket($scope.AppSocket, 'getAllAlipaysByAlipayGroup', {platform: vm.selectedPlatform.platformId},
                data => {
                    var data = data.data;
                    vm.allAlipaysAcc = data.data ? data.data : [];
            });
            socketService.$socket($scope.AppSocket, 'getAllWechatpaysByWechatpayGroup', {platform: vm.selectedPlatform.platformId},
                data => {
                    var data = data.data;
                    vm.allWechatpaysAcc = data.data ? data.data : [];
            });

        }
        vm.wechatNameConvert = function(){
            vm.selectedProposal.data.weAcc = '';
            vm.selectedProposal.data.weName = '';
            vm.selectedProposal.data.weQRCode = '';

            if(vm.selectedProposal.data.wechatAccount){
                vm.selectedProposal.data.weAcc = vm.selectedProposal.data.wechatAccount;
            }
            if(vm.selectedProposal.data.weChatAccount){
                vm.selectedProposal.data.weAcc = vm.selectedProposal.data.weChatAccount;
            }
            if(vm.selectedProposal.data.wechatName) {
                vm.selectedProposal.data.weName = vm.selectedProposal.data.wechatName;
            }
            if(vm.selectedProposal.data.weChatName) {
                vm.selectedProposal.data.weName = vm.selectedProposal.data.weChatName;
            }
            if(vm.selectedProposal.data.wechatQRCode){
                vm.selectedProposal.data.weQRCode =  vm.selectedProposal.data.wechatQRCode;
            }
            if(vm.selectedProposal.data.weChatQRCode){
                vm.selectedProposal.data.weQRCode =  vm.selectedProposal.data.weChatQRCode;
            }
            $scope.safeApply();
        }
        vm.getCardLimit = function(typeName){
          let acc = '';
          if(typeName=='ManualPlayerTopUp'){
            let bankCardNo = vm.selectedProposal.data.bankCardNo;
            if(bankCardNo && vm.bankCards && vm.bankCards.length > 0){
                vm.selectedProposal.card = vm.bankCards.filter(item=>{ return item.accountNumber == bankCardNo })[0] ||  {singleLimit:'0', quota:'0'};
            }else{
                vm.selectedProposal.card = {singleLimit:'0', quota:'0'};
            }
          }else if(typeName=="PlayerAlipayTopUp"){
            let　merchantNo = vm.selectedProposal.data.alipayAccount;
            if(merchantNo && vm.allAlipaysAcc && vm.allAlipaysAcc.length > 0){
                vm.selectedProposal.card = vm.allAlipaysAcc.filter(item=>{ return item.accountNumber == merchantNo })[0] ||  {singleLimit:'0', quota:'0'};
            }else{
                vm.selectedProposal.card = {singleLimit:'0', quota:'0'};
            }
          }else if(typeName=="PlayerWechatTopUp"){
            let　merchantNo = vm.selectedProposal.data.wechatAccount || vm.selectedProposal.data.weChatAccount || vm.selectedProposal.data.weChatName || vm.selectedProposal.data.wechatName;
            if(merchantNo && vm.allWechatpaysAcc && vm.allWechatpaysAcc.length > 0){
                vm.selectedProposal.card = vm.allWechatpaysAcc.filter(item=>{ return item.accountNumber == merchantNo })[0] ||  {singleLimit:'0', quota:'0'};
            }else{
                vm.selectedProposal.card = {singleLimit:'0', quota:'0'};
            }
          }else if(typeName=="PlayerTopUp"){
            let　merchantNo = vm.selectedProposal.data.merchantNo;
            if(merchantNo && vm.merchants && vm.merchants.length > 0){
                vm.selectedProposal.card = vm.merchants.filter(item=>{ return item.merchantNo == merchantNo })[0] ||  {singleLimit:'0', quota:'0'};
            }else{
                vm.selectedProposal.card = {singleLimit:'0', quota:'0'};
            }
          }
          $scope.safeApply();
          return vm.selectedProposal;
        }



        vm.getUserCardGroup = function(typeName, platformId, playerId){
          var myQuery = {
              playerId: playerId
          }
          socketService.$socket($scope.AppSocket, 'getOnePlayerCardGroup', myQuery, function (data) {
              console.log('playerData', data);
              vm.proposalPlayer = data.data;
              if(vm.proposalPlayer.credibilityRemarks.length > 0){
                   let credibilityRemarksName = vm.credibilityRemarks.filter(item => {
                      return vm.proposalPlayer.credibilityRemarks.includes(item._id);
                  });
                  let txt = '';
                  let colon = ',';
                  credibilityRemarksName.forEach(function(value, index){
                    if(index == (credibilityRemarksName.length-1)){ colon = ''}
                      txt += value.name + colon;
                  })
                  vm.proposalPlayer.credibilityRemarksName = txt;
              }
              $scope.safeApply();
          });

        }
        vm.loadPlayerLevel = function(platformId, playerLevel){
          socketService.$socket($scope.AppSocket, 'getPlayerLevelByPlatformId', {
              platformId: platformId
          }, function (data) {
              let dayLimit = 0;
              let playerLevelInfo = data.data.filter(item=>{
                  return item._id == playerLevel;
              })
              if(playerLevelInfo){
                playerLevelInfo[0].levelDownConfig.forEach(item=>{
                })
              }
              $scope.safeApply();
          }, function (data) {
              console.error("cannot get player level", data);
          });
        }
        vm.loadTodayTopupQuota = function(typeId, typeName, cardField, cardNo){
          var start = new Date();
          start.setHours(0,0,0,0);
          var end = new Date();
          end.setHours(23,59,59,999);
          var sendData = {
              adminId: authService.adminId,
              platformId: vm.selectedPlatform._id,
              typeId: typeId,
              startDate: start,
              endDate: end,
              card: cardNo,
              cardField: cardField,
              size: 10,
              index: 0
          }
          sendData.status = ["Approved", "Success"];
          vm.selectedProposal.cardSumToday = 0;
          socketService.$socket($scope.AppSocket, 'getProposalAmountSum', sendData, function (data) {
              if(data.data.length>0){
                 vm.selectedProposal.cardSumToday = data.data[0].totalAmount||0;
              }else{
                 vm.selectedProposal.cardSumToday = 0;
              }
          });
        }
        vm.getCredibilityRemarksByPlatformId = function (id) {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getCredibilityRemarks', {platformObjId: id}, function (data) {
                    vm.credibilityRemarks = data.data;
                    console.log("vm.credibilityRemarks", vm.credibilityRemarks);
                    resolve(vm.credibilityRemarks);
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get credibility remarks", data);
                    vm.credibilityRemarks = {};
                    resolve(vm.credibilityRemarks);
                });
            });
        };
        vm.getPaymentMonitorRecord = function (isNewSearch) {
            if (isNewSearch) {
                $('#autoRefreshProposalFlag').attr('checked', false);
            }
            vm.paymentMonitorQuery.platformId = vm.curPlatformId;
            $('#paymentMonitorTableSpin').show();

            if (vm.paymentMonitorQuery.mainTopupType === '0' || vm.paymentMonitorQuery.mainTopupType === '1' || vm.paymentMonitorQuery.mainTopupType === '3' || vm.paymentMonitorQuery.mainTopupType === '4' || vm.paymentMonitorQuery.mainTopupType === '5') {
                vm.paymentMonitorQuery.topupType = '';
                vm.paymentMonitorQuery.merchantGroup = '';
                vm.paymentMonitorQuery.merchantNo = '';
            }

            vm.paymentMonitorQuery.index = isNewSearch ? 0 : (vm.paymentMonitorQuery.index || 0);
            var sendObj = {
                playerName: vm.paymentMonitorQuery.playerName,
                proposalNo: vm.paymentMonitorQuery.proposalID,
                mainTopupType: vm.paymentMonitorQuery.mainTopupType,
                userAgent: vm.paymentMonitorQuery.userAgent,
                topupType: vm.paymentMonitorQuery.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorQuery.merchantGroup)),
                depositMethod: vm.paymentMonitorQuery.depositMethod,

                //new
                bankTypeId: vm.paymentMonitorQuery.bankTypeId,
                //new
                merchantNo: vm.paymentMonitorQuery.merchantNo,
                // status: staArr,
                startTime: vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate(),

                platformId: vm.curPlatformId,
                // dingdanID: vm.paymentMonitorQuery.dingdanID,
                // merchant: vm.paymentMonitorQuery.merchant,

                index: vm.paymentMonitorQuery.index,
                limit: vm.paymentMonitorQuery.limit || 10,
                sortCol: vm.paymentMonitorQuery.sortCol,

            }
            // let sendObj = {
            //     startTime: vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate(),
            //     endTime: vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate(),
            //     platformId: vm.paymentMonitorQuery.platformId,
            //     mainTopupType: vm.paymentMonitorQuery.mainTopupType,
            //     topupType: vm.paymentMonitorQuery.topupType,
            //     merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorQuery.merchantGroup)),
            //     playerName: vm.paymentMonitorQuery.playerName,
            //     index: vm.paymentMonitorQuery.index,
            //     limit: vm.paymentMonitorQuery.limit || 10,
            //     sortCol: vm.paymentMonitorQuery.sortCol
            // };

            vm.paymentMonitorQuery.merchantNo ? sendObj.merchantNo = vm.paymentMonitorQuery.merchantNo : null;
            console.log('sendObj', sendObj);

            socketService.$socket($scope.AppSocket, 'getPaymentMonitorResult', sendObj, function (data) {
                $('#paymentMonitorTableSpin').hide();
                console.log('Payment Monitor Result', data);
                vm.paymentMonitorQuery.totalCount = data.data.size;
                $scope.safeApply();

                vm.drawPaymentRecordTable(
                    data.data.data.map(item => {
                        item.amount$ = parseFloat(item.data.amount).toFixed(2);
                        item.merchantNo$ = item.data.merchantNo
                            ? item.data.merchantNo
                            : item.data.wechatAccount
                            ? item.data.wechatAccount
                                :item.data.weChatAccount != null ? item.data.weChatAccount
                            : item.data.alipayAccount
                            ? item.data.alipayAccount
                            : item.data.bankCardNo
                            ? item.data.bankCardNo
                            : item.data.accountNo
                            ? item.data.accountNo
                            : null;
                        item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                        item.playerCount$ = item.$playerCurrentCount + "/" + item.$playerAllCount + " (" + item.$playerGapTime + ")";
                        item.status$ = $translate(item.status);
                        item.merchantName = vm.getMerchantName(item.data.merchantNo);


                        //vm.merchantNumbers[item.data.merchantNo];

                        if (item.data.msg && item.data.msg.indexOf(" 单号:") !== -1) {
                            let msgSplit = item.data.msg.split(" 单号:");
                            item.merchantName = msgSplit[0];
                            item.merchantNo$ = msgSplit[1];
                        }

                        if (item.type.name === 'PlayerTopUp') {
                            //show detail topup type info for online topup.
                            let typeID = item.data.topUpType || item.data.topupType;
                            item.topupTypeStr = typeID
                                ? $translate(vm.topUpTypeList[typeID])
                                : $translate("Unknown")
                        } else {
                            //show topup type for other types
                            item.topupTypeStr = $translate(item.type.name)
                        }
                        item.startTime$ = utilService.$getTimeFromStdTimeFormat(new Date(item.createTime));
                        //item.endTime$ = item.data.lastSettleTime ? utilService.$getTimeFromStdTimeFormat(item.data.lastSettleTime) : "-";
                        item.endTime$ = utilService.$getTimeFromStdTimeFormat(item.data.lastSettleTime) || '-';
                          // $('.merchantNoList').selectpicker('refresh');
                        return item;
                    }), data.data.size, {}, isNewSearch
                );
            }, function (err) {
                console.error(err);
            }, true);

        };
        vm.getMerchantName = function(merchantNo){
            let merchantName = '';
            let result = '';
            if(merchantNo){
              let merchantName = vm.merchantGroups.filter(item=>{
                  return item.list.includes(merchantNo);
              });
              result = merchantName[0] ? merchantName[0].name :'';
            }else{
              result = '';
            }
            return result;
        }


        vm.resetTopUpMonitorQuery = function () {
            vm.paymentMonitorQuery.mainTopupType = "";
            vm.paymentMonitorQuery.topupType = "";
            vm.paymentMonitorQuery.merchantGroup = "";
            vm.paymentMonitorQuery.merchantNo = "";
            vm.paymentMonitorQuery.orderId = "";
            vm.paymentMonitorQuery.depositMethod = "";
            vm.paymentMonitorQuery.playerName = "";
            vm.commonInitTime(vm.paymentMonitorQuery, '#paymentMonitorQuery');
            vm.getPaymentMonitorRecord(true);
            $('#autoRefreshProposalFlag')[0].checked = true;
            $scope.safeApply();
        };
        vm.showProposalModal = function(proposalId){
          socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
              platformId: vm.selectedPlatform._id,
              proposalId: proposalId
          }, function (data) {
            vm.selectedProposal = data.data;
            let playerName = vm.selectedProposal.data.playerName;
            let typeId = vm.selectedProposal.type._id;
            let typeName = [vm.selectedProposal.type.name];
            let playerId = vm.selectedProposal.data.playerId;

            if(vm.selectedProposal.data.inputData){
                if(vm.selectedProposal.data.inputData.provinceId){
                    vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                }
                if(vm.selectedProposal.data.inputData.cityId){
                    vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                }
            }
            vm.wechatNameConvert();
            // vm.selectedProposal.data.cityId;
            $('#modalProposal').modal('show');
            $('#modalProposal').on('shown.bs.modal', function (e) {
                $scope.safeApply();
            })
            let cardField = vm.topUpField[typeName].filter( fieldName =>{
                if(vm.selectedProposal.data[fieldName]){
                    return fieldName
                }
            })[0] || '';
            let cardNo = vm.selectedProposal.data[cardField];
            vm.loadTodayTopupQuota(typeId, typeName, cardField, cardNo);
            vm.getUserCardGroup(vm.selectedProposal.type.name,vm.selectedPlatform._id, playerId )
            vm.getCardLimit(vm.selectedProposal.type.name);
          })
        }
        vm.drawPaymentRecordTable = function (data, size, summary, newSearch) {
            console.log('data', data);
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorQuery.aaSorting || [[11, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'data.amount', bSortable: true, 'aTargets': [13]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [14]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('proposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {
                          // data = String(data);
                          return '<a ng-click="vm.showProposalModal(\''+data+'\')">'+data+'</a>';
                        }
                    },
                    {
                        "title": $translate('topupType'), "data": "type",
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('DEVICE'), data: "data.userAgent",
                        render: function(data, type, row){
                          var text = $translate(data ? $scope.userAgentType[data]: "");
                          return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('Online Topup Type'), "data": 'data.topupType',
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.merchantTopupTypeJson[data]: "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {title: $translate('3rd Party Platform'), data: "merchantName", sClass: 'merchantCount'},
                    {
                        "title": $translate('DEPOSIT_METHOD'), "data": 'data.depositMethod',
                        render: function (data, type, row) {
                            var text = $translate(data ? vm.getDepositMethodbyId[data]: "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('From Bank Type'), data: "data.bankTypeId",
                        render: function (data, type, row) {
                          if(data){
                              var text = $translate(vm.allBankTypeList[data] ? vm.allBankTypeList[data]: "");
                              return "<div>" + text + "</div>";
                          }else{
                              return "<div>" + '' + "</div>";
                          }
                        },
                        sClass: 'merchantCount'
                    },
                    {title: $translate('Business Acc/ Bank Acc'), data: "merchantNo$", sClass: 'merchantCount'},
                    {title: $translate('Total Business Acc'), data: "merchantCount$", sClass: 'merchantCount'},
                    {title: $translate('STATUS'), data: "status$"},
                    {title: $translate('PLAYER_NAME'), data: "data.playerName", sClass: "playerCount"},
                    {title: $translate('Real Name'), data: "data.playerObjId.realName", sClass: "sumText playerCount"},
                    {title: $translate('Total Members'), data: "playerCount$", sClass: "sumText playerCount"},
                    // {title: $translate('PARTNER'), data: "playerId.partner", sClass: "sumText"},
                    {title: $translate('TopUp Amount'), data: "amount$", sClass: "sumFloat alignRight playerCount"},

                    {title: $translate('START_TIME'), data: "startTime$"},
                    {title: $translate('END_TIME'), data: "endTime$"}

                ],
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    if (aData.$merchantAllCount >= (vm.selectedPlatform.monitorMerchantCount || 10)) {
                        $(nRow).addClass('merchantExceed');
                        if ($('#autoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorMerchantUseSound) {
                            checkMerchantNotificationAlert(aData);
                        }
                        if (!vm.lastMerchantExceedId || vm.lastMerchantExceedId < aData._id) {
                            vm.lastMerchantExceedId = aData._id;
                        }
                    }

                    if (aData.$playerAllCount >= (vm.selectedPlatform.monitorPlayerCount || 4)) {
                        $(nRow).addClass('playerExceed');
                        if ($('#autoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorPlayerUseSound) {
                            checkPlayerNotificationAlert(aData);
                        }
                        if (!vm.lastPlayerExceedId || vm.lastPlayerExceedId < aData._id) {
                            vm.lastPlayerExceedId = aData._id;
                        }
                    }
                },
                createdRow: function(row, data, dataIndex){
                  $compile(angular.element(row).contents())($scope)
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();

            vm.topUpProposalTable = utilService.createDatatableWithFooter('#paymentMonitorTable', tableOptions, {}, true);

            vm.paymentMonitorQuery.pageObj.init({maxCount: size}, newSearch);

            $('#paymentMonitorTable').off('order.dt');
            $('#paymentMonitorTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'paymentMonitorQuery', vm.getPaymentMonitorRecord);
            });
            $('#paymentMonitorTable').resize();

            $('#paymentMonitorTable tbody').on('click', 'tr', vm.tableRowClicked);
        };

        function checkPlayerNotificationAlert(aData) {
            if (!vm.lastPlayerExceedId || vm.lastPlayerExceedId < aData._id) {
                let soundUrl = "sound/notification/" + vm.selectedPlatform.monitorPlayerSoundChoice;
                let sound = new Audio(soundUrl);
                sound.play();
            }
        };

        function checkMerchantNotificationAlert(aData) {
            if (!vm.lastMerchantExceedId || vm.lastMerchantExceedId < aData._id) {
                let soundUrl = "sound/notification/" + vm.selectedPlatform.monitorMerchantSoundChoice;
                let sound = new Audio(soundUrl);
                sound.play();
            }
        }

        vm.tableRowClicked = function (event) {
            if (event.target.tagName == 'A') {
                let data = vm.topUpProposalTable.row(this).data();
                vm.proposalRowClicked(data);
            }
        };

        vm.proposalRowClicked = function (data) {
            if (!data) {
                return;
            }
            vm.selectedProposal = data;
            $('#modalProposal').modal();
            $('#modalProposal').off('hidden.bs.modal');
            $('#modalProposal').on('hidden.bs.modal', function () {
                $('#modalProposal').off('hidden.bs.modal');
                $('#proposalRemark').val('');
            });

            console.log('vm.selectedProposal', vm.selectedProposal);
            vm.thisProposalSteps = [];
            if (vm.selectedProposal.process != null && typeof vm.selectedProposal.process == 'object') {
                socketService.$socket($scope.AppSocket, 'getFullProposalProcess', {_id: vm.selectedProposal.process._id}, function processSuccess(data) {
                    console.log('full proposal data', data);
                    vm.thisProposalSteps = data.data.steps;
                    vm.chartData = {};
                    vm.chartData.nextNodeID = 10;
                    let para = [$translate("START_PROPOSAL"), $translate("END_PROPOSAL"), $translate("FAIL_PROPOSAL")];
                    vm.chartViewModel.setDefaultLabel(para);
                    vm.chartViewModel.setEditable(false);
                    $.each(data.data.steps, function (i, v) {
                        if (v._id == data.data.currentStep) {
                            vm.chartData.curStep = v.type;
                            return false;
                        }
                    });
                    vm.drawProcessSteps(data.data);
                });
            }

            let proposalDetail = $.extend({}, vm.selectedProposal.data);
            let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            for (let i in proposalDetail) {
                //remove objectIDs
                if (checkForHexRegExp.test(proposalDetail[i])) {
                    delete proposalDetail[i];
                }
                if (i == 'providers') {
                    let temp = [];
                    if (proposalDetail.providers) {
                        proposalDetail.providers.map(item => {
                            temp.push(item.name);
                        });
                        proposalDetail.providers = temp;
                    }
                }

            }

            vm.selectedProposalDetailForDisplay = $.extend({}, proposalDetail);

            if (vm.selectedProposalDetailForDisplay['provinceId']) {
                socketService.$socket($scope.AppSocket, "getProvince", {provinceId: vm.selectedProposalDetailForDisplay['provinceId']}, function (data) {
                    var text = data.data.province ? data.data.province.name : val;
                    vm.selectedProposalDetailForDisplay['provinceId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountProvince']) {
                socketService.$socket($scope.AppSocket, "getProvince", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountProvince']}, function (data) {
                    var text = data.data.province ? data.data.province.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountProvince'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['cityId']) {
                socketService.$socket($scope.AppSocket, "getCity", {provinceId: vm.selectedProposalDetailForDisplay['cityId']}, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay['cityId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountCity']) {
                socketService.$socket($scope.AppSocket, "getCity", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountCity']}, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountCity'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['districtId']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {provinceId: vm.selectedProposalDetailForDisplay['districtId']}, function (data) {
                    var text = data.data.district ? data.data.district.name : val;
                    vm.selectedProposalDetailForDisplay['districtId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountDistrict']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountDistrict']}, function (data) {
                    var text = data.data.district ? data.data.district.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountDistrict'] = text;
                    $scope.safeApply();
                });
            }

            delete vm.selectedProposalDetailForDisplay.creator;
            delete vm.selectedProposalDetailForDisplay.platform;
            delete vm.selectedProposalDetailForDisplay.partner;
            delete vm.selectedProposalDetailForDisplay.playerObjId;
            delete vm.selectedProposalDetailForDisplay.playerLevelName;
            delete vm.selectedProposalDetailForDisplay.playerLevelValue;

            $scope.safeApply();
        };

        vm.commonInitTime = function (obj, queryId) {
            if (!obj) return;
            obj.startTime = utilService.createDatePicker(queryId + ' .startTime');
            let lastMonth = utilService.setNDaysAgo(new Date(), 1);
            let lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
            obj.startTime.data('datetimepicker').setLocalDate(new Date(lastMonthDateStartTime));

            obj.endTime = utilService.createDatePicker(queryId + ' .endTime');
            obj.endTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayEndTime()));
        };

        vm.commonTableOption = {
            dom: 'Zrtlp',
            "autoWidth": true,
            "scrollX": true,
            columnDefs: [{targets: '_all', defaultContent: ' '}],
            "scrollCollapse": true,
            "destroy": true,
            "paging": false,
            "language": {
                "emptyTable": $translate("No data available in table"),
            },
        };

        vm.commonSortChangeHandler = function (a, objName, searchFunc) {
            if (!a.aaSorting[0] || !objName || !vm[objName] || !searchFunc) return;
            let sortCol = a.aaSorting[0][0];
            let sortDire = a.aaSorting[0][1];
            let temp = a.aoColumns[sortCol];
            let sortKey = temp ? temp.sortCol : '';
            vm[objName].aaSorting = a.aaSorting;
            if (sortKey) {
                vm[objName].sortCol = vm[objName].sortCol || {};
                let preVal = vm[objName].sortCol[sortKey];
                vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                if (vm[objName].sortCol[sortKey] != preVal) {
                    vm[objName].sortCol = {};
                    vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                    searchFunc.call(this);
                }
            }
        };

        vm.commonPageChangeHandler = function (curP, pageSize, objKey, searchFunc) {
            var isChange = false;
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

        vm.dateReformat = function (data) {
            return utilService.$getTimeFromStdTimeFormat(data);
        };

        vm.showProposalDetailField = function (obj, fieldName, val) {
            if (!obj) return '';
            let result = val ? val.toString() : (val === 0) ? "0" : "";
            if (obj.type.name === "UpdatePlayerPhone" && (fieldName === "updateData" || fieldName === "curData")) {
                result = val.phoneNumber;
            } else if (obj.status === "Expired" && fieldName === "validTime") {
                let $time = $('<div>', {
                    class: 'inlineBlk margin-right-5'
                }).text(utilService.getFormatTime(val));
                let $btn = $('<button>', {
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
            } else if ((fieldName.indexOf('time') > -1 || fieldName.indexOf('Time') > -1) && val) {
                result = utilService.getFormatTime(val);
            } else if (fieldName === 'bankAccountType') {
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
                result = vm.allBankTypeList[val] || (val + " ! " + $translate("not in bank type list"));
            } else if (fieldName == 'depositMethod') {
                result = $translate(vm.getDepositMethodbyId[val])
            } else if (fieldName === 'playerStatus') {
                result = $translate($scope.constPlayerStatus[val]);
            } else if (fieldName === 'proposalPlayerLevel') {
                result = $translate(val);
            } else if (fieldName === 'applyForDate') {
                result = new Date(val).toLocaleDateString("en-US", {timeZone: "Asia/Singapore"});
            } else if (typeof(val) == 'object') {
                result = JSON.stringify(val);
            }
            return $sce.trustAsHtml(result);
        };


        // vm.showProposalDetailField


        function getMerchantList() {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getMerchantNBankCard', {platformId: vm.selectedPlatform.platformId}, function (data) {
                    if (data.data && data.data.merchants) {
                        resolve(data.data.merchants);
                    }
                }, function (error) {
                    console.error('merchant list', error);
                    resolve([]);
                });
            });
        }

        function getMerchantTypeList() {
            return new Promise(function (resolve, reject) {
                socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {}, function (data) {
                    if (data.data && data.data.merchantTypes) {
                        resolve(data.data.merchantTypes);
                    }
                }, function (error) {
                    console.error('merchant list', error);
                    resolve([]);
                });
            });
        }

        function getMerchantGroups(merchants, merchantTypes) {
            let merchantGroupList = {};
            let merchantGroupNames = {};

            merchants.forEach(item => {
                if (item.status !== 'DISABLED') {
                    merchantGroupList[item.merchantTypeId] = merchantGroupList[item.merchantTypeId] || {list: []};
                    merchantGroupList[item.merchantTypeId].list.push(item.merchantNo);
                }
            });

            merchantTypes.forEach(mer => {
                merchantGroupNames[mer.merchantTypeId] = mer.name;
            });

            let merchantGroups = [];
            for (let merchantTypeId in merchantGroupList) {
                let list = merchantGroupList[merchantTypeId].list;
                let name = merchantGroupNames[merchantTypeId];
                merchantGroups.push({
                    name: name,
                    list: list
                });
            }

            return merchantGroups;
        }

        function getMerchantNumbers(merchants) {
            let merchantNumbers = {};
            merchants.forEach(merchant => {
                merchantNumbers[merchant.merchantNo] = merchant.name;
            });
            return merchantNumbers;
        }


        $scope.$on('socketReady', function (e, d) {
            if ($scope.AppSocket) {
                $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');
            }
        });

        $scope.$on("setPlatform", function (e, d) {
            vm.hideLeftPanel = false;
            vm.allBankTypeList = {};

            setTimeout(function () {
                // vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform);
                socketService.$socket($scope.AppSocket, 'getBankTypeList', {}, function (data) {
                    if (data && data.data && data.data.data) {
                        console.log('banktype', data.data.data);
                        data.data.data.forEach(item => {
                            if (item && item.bankTypeId) {
                                vm.allBankTypeList[item.id] = item.name + ' (' + item.id + ')';
                            }
                        })
                    }
                });

                let countDown = -1;
                clearInterval(vm.refreshInterval);
                vm.refreshInterval = setInterval(function () {
                    var item = $('#autoRefreshProposalFlag');
                    var isRefresh = item && item.length > 0 && item[0].checked;
                    var mark = $('#timeLeftRefreshOperation')[0];
                    $(mark).parent().toggleClass('hidden', countDown < 0);
                    if (isRefresh) {
                        if (countDown < 0) {
                            countDown = 11
                        }
                        if (countDown === 0) {
                            vm.getPaymentMonitorRecord();
                            countDown = 11;
                        }
                        countDown--;
                        $(mark).text(countDown);
                    } else {
                        countDown = -1;
                    }
                    if (window.location.pathname != '/monitor/payment') {
                        clearInterval(vm.refreshInterval);
                    }
                    else if (!vm.paymentMonitorQuery) {
                        vm.loadPage();
                    }
                }, 1000);
            });
        });
    };

    monitorPaymentController.$inject = injectParams;

    myApp.register.controller('monitorPaymentCtrl', monitorPaymentController);
});
