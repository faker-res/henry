const XLSX = require('xlsx');

const dbUtil = require('./../modules/dbutility');
const localization = require('./../modules/localization');
const RESTUtils = require('./../modules/RESTUtils');

const constPlayerRegistrationInterface = {
    0: '后台',
    1: 'WEB玩家',
    2: 'WEB代理',
    3: 'H5玩家',
    4: 'H5代理',
    5: 'APP玩家',
    6: 'APP代理'
};

const constMerchantTopupType = {
    1: '网银支付',
    2: '微信扫码',
    3: '支付宝扫码',
    4: '微信App支付',
    5: '支付宝App支付',
    6: '快捷支付',
    7: 'QQ扫码',
    8: '银联扫码支付',
    9: '京东钱包扫码支付',
    10: '微信wap',
    11: '支付宝wap',
    12: 'QQWAP',
    13: '点卡',
    14: '京东wap'
};

const constDepositMethod = {
    1: '网银转账',
    2: 'ATM',
    3: '银行柜台',
    4: '支付宝转账',
    5: '微信转帐',
    6: '云闪付',
    7: '云闪付转账'
};

let bankTypeList = [];

const dbReportUtility = {
    generateExcelFile: (reportName, outputResult) => {
        let wb = XLSX.utils.book_new();
        wb.Props = {
            Title: "Top Up Report",
            Subject: "Test",
            Author: "FPMS",
            CreatedDate: new Date()
        };
        let wsdata = processResult(reportName, outputResult);
        let ws = XLSX.utils.json_to_sheet(wsdata);
        XLSX.utils.book_append_sheet(wb, ws, "Results");

        return XLSX.write(wb, {type: 'buffer', bookType: 'csv'});

        function processResult (reportName, outputResult) {
            if (outputResult && outputResult.length) {
                return outputResult.map(res => {
                    switch (reportName) {
                        case "TopupReport":
                            return {
                                "产品名称": res.data.platformId.name,
                                "提案ID": res.proposalId,
                                "充值类型": localization.localization.translate(res.type.name),
                                "装置": constPlayerRegistrationInterface[res.inputDevice],
                                "在线充值类型": constMerchantTopupType[res.data.topupType],
                                "第三方平台": res.data.merchantUseName,
                                "手工存款方式": constDepositMethod[res.data.depositMethod],
                                "收款银行类别":
                                    res.data.bankTypeId && bankTypeList.length
                                    && bankTypeList.find(p => p.bankTypeId === res.data.bankTypeId)
                                    && bankTypeList.find(p => p.bankTypeId === res.data.bankTypeId).name || res.data.bankTypeId,
                                "收款商户/账号": res.data.merchantName,
                                "商户计数": res.$merchantCurrentCount + "/" + res.$merchantAllCount + " (" + res.$merchantGapTime + ")",
                                "状态": localization.localization.translate(res.status),
                                "会员账号": res.data.playerName,
                                "会员姓名": res.data.playerRealName,
                                "会员计数": res.$playerCurrentCount + "/" + res.$playerAllCount + " (" + res.$playerGapTime + ")",
                                "充值金额": res.data.amount,
                                "加入时间": dbUtil.getSGTimeToString(res.createTime),
                                "成功执行时间": dbUtil.getSGTimeToString(res.settleTime),
                            };
                            break;
                        case "ProposalReport":
                            return {
                                "产品名称": res.data.platformId.name,
                                "提案ID": res.proposalId,
                                "创建者": (res.creator && res.creator.name) || "",
                                "入口": constPlayerRegistrationInterface[res.inputDevice],
                                "提案类型": localization.localization.translate(res.mainType),
                                "提案子类型": res.data.PROMO_CODE_TYPE || res.data.eventName || localization.localization.translate(res.type.name),
                                "提案状态": localization.localization.translate(res.status),
                                "涉及账号": res.data.playerName,
                                "涉及额度": res.data.rewardAmount || res.data.amount || res.data.updateAmount,
                                "加入时间": dbUtil.getSGTimeToString(res.createTime),
                                "会员等级": res.data.playerLevelName,
                                "备注": res.data.remark
                            };
                            break;
                        case "PlayerReport":
                            return {
                                "会员账号": res.name,
                                "玩家价值": res.valueScore,
                                "等级": res.playerLevelName,
                                "信用": res.credibilityRemarksName,
                                "大厅": res.providerNames,
                                "手工存款": res.manualTopUpAmount,
                                "个人微信": res.weChatTopUpAmount,
                                "个人支付宝": res.aliPayTopUpAmount,
                                "在线充值": res.onlineTopUpAmount,
                                "存款笔数": res.topUpTimes,
                                "存款总金额": res.topUpAmount,
                                "提款笔数": res.bonusTimes,
                                "提款金额": res.bonusAmount,
                                "促销优惠": res.rewardAmount,
                                "洗码金额": res.consumptionReturnAmount,
                                "投注笔数": res.consumptionTimes,
                                "有效投注额": res.validConsumptionAmount,
                                "输赢金额": res.consumptionBonusAmount,
                                "在线充值费用": res.totalOnlineTopUpFee
                            }
                            break;
                        case "ShortUrl":
                            return {
                                "序号":res.no,
                                "原网址": res.url_long,
                                "防红短网址": res.url_short
                            }
                            break;
                    }
                })
            } else {
                return [];
            }
        }
    }
};

getBankTypeList();

function getBankTypeList () {
    RESTUtils.getPMS2Services("postBankTypeList", {}, 4).then(data => {
        bankTypeList = data.data;
    });
}

module.exports = dbReportUtility;
