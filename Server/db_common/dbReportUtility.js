let XLSX = require('xlsx');

const dbconfig = require('./../modules/dbproperties');

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

        return XLSX.write(wb, {type: 'buffer'});

        function processResult (reportName, outputResult) {
            if (outputResult && outputResult.length) {
                return outputResult.map(res => {
                    switch (reportName) {
                        case "ProposalReport":
                            return {
                                "产品名称": res.data.platformId.name,
                                "提案ID": res.proposalId,
                                "创建者": (res.creator && res.creator.name) || "",
                                "入口": res.inputDevice,
                                "提案类型": res.mainType,
                                "提案子类型": res.type.name,
                                "提案状态": res.status,
                                "涉及账号": res.data.playerName,
                                "涉及额度": res.amount,
                                "加入时间": res.createTime,
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
                                "输赢金额": res.consumptionBonusAmount
                            }
                    }
                })
            } else {
                return [];
            }
        }
    }
};

module.exports = dbReportUtility;