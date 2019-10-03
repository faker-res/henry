import React, { Component } from 'react';
import LineChart from './lineChart';
import Card from './card';
import NavBar from './navBar';

import authService from '../services/authService.js';
import navService from '../services/navService.js';
import socketService from '../services/socketService';
import localStorageService from '../services/localStorageService';

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const chartStartDate = new Date(new Date().setDate(new Date().getDate() - 6)).toDateString();
const chartEndDate = new Date(new Date().setDate(new Date().getDate())).toDateString();
const getPlatformObjId = () => {return localStorageService.get("selectedPlatform")._id};

class Dashboard extends Component {
    state = {
        cardData: {
            onlinePlayer: {info: "onlinePlayer", chinese: "在线玩家", value: 0, awesomeIcon: ['far', 'smile']},
            topup: {info: "topup", chinese: "充值额度", value: 0, awesomeIcon: ['fas', 'dollar-sign']},
            withdrawal: {info: "withdrawal", chinese: "提款额", value: 0, awesomeIcon: ['fas', 'dollar-sign']},
            bet: {info: "bet", chinese: "投注额", value: 0, awesomeIcon: ['far', 'money-bill-alt']},
            newPlayer: {info: "newPlayer", chinese: "新玩家", value: 0, awesomeIcon: ['fas', 'user-plus']},
        },
        operationCardData: {
            // newPlayer: {info: "newPlayer", chinese: "提案", value: 0, awesomeIcon:['far','smile']},
            rewardCount: {info: "topup", chinese: "优惠申请数", value: 0, awesomeIcon:['far','registered']},
            rewardCredit: {info: "bet", chinese: "优惠申请额度", value: 0, awesomeIcon:['far','stop-circle']},
        },
        chartData: {
            login: {
                data: {
                    labels: [],
                    datasets: [{
                        label: '数量',
                        data: [],
                        backgroundColor: '#5cb85c',
                        fill: false,
                        borderColor: '#5cb85c',
                        lineTension: 0.25
                    }]
                },
                title: "登录玩家"
            },
            topup: {
                data: {
                    labels: [],
                    datasets: [{
                        label: '数量',
                        data: [],
                        backgroundColor: '#2B6698',
                        fill: false,
                        borderColor: '#2B6698',
                        lineTension: 0.25
                    }]
                },
                title: "充值"
            },
            bonus: {
                data: {
                    labels: [],
                    datasets: [{
                        label: '数量',
                        data: [],
                        backgroundColor: '#4B0082',
                        fill: false,
                        borderColor: '#4B0082',
                        lineTension: 0.25
                    }]
                },
                title: "提款额"
            },
            consumption: {
                data: {
                    labels: [],
                    datasets: [{
                        label: '数量',
                        data: [],
                        backgroundColor: '#f39c12',
                        fill: false,
                        borderColor: '#f39c12',
                        lineTension: 0.25
                    }]
                },
                title: "投注额"
            },
            newPlayer: {
                data: {
                    labels: [],
                    datasets: [{
                        label: '数量',
                        data: [],
                        backgroundColor: '#d9534f',
                        fill: false,
                        borderColor: '#d9534f',
                        lineTension: 0.25
                    }]
                },
                title: "新玩家"
            },
        }
    }

    getChartData = (path, chartName) => {
        socketService.emit(path, {
            platformObjId: getPlatformObjId(),
            startDate: chartStartDate,
            endDate: chartEndDate
        }).then(data => {
            console.log(path, " success! ", data);
            if(data && data.success) {
                this.updateChartData(data.data, chartName);
            } else {
                console.error(path, "unsuccessful! ", data);
            }
        }, err => {
            console.log(path, " error!");
            console.log(err);
        });
    }
    updateChartData = (rawData, chartKey) => {
        let numData = [];
        let dateData = [];
        function prepData(dataSet) {
            let date = new Date(chartStartDate), dateText;
            for(let x = 0; date.getTime() < new Date(chartEndDate).getTime(); x++) {
                date = new Date(chartStartDate);
                date.setDate(date.getDate() + x)
                dateText =  months[date.getMonth()] + " " + date.getDate();
                dateData.push(dateText);
                let number = dataSet ? (dataSet[dateText] || 0) : 0;
                numData.push(number);
            }
        }

        if(rawData && rawData.length > 0) {
            let existingNumber = {};
            switch(chartKey) {
                case 'login':
                case 'newPlayer':
                rawData.forEach(item => {
                    let dateText = new Date(item._id.date);
                    dateText =  months[dateText.getMonth()] + " " + dateText.getDate();
                    existingNumber[dateText] = item.number;
                });
                prepData(existingNumber);
                break;

                case 'topup':
                case 'consumption':
                rawData.forEach(item => {
                    let dateText = new Date(item._id.date);
                    dateText =  months[dateText.getMonth()] + " " + dateText.getDate();
                    existingNumber[dateText] = item.number;
                });
                prepData(existingNumber);
                break;

                case 'bonus':
                rawData.forEach(item => {
                    let dateText = new Date(`${item._id.year}-${item._id.month}-${item._id.day}`);
                    dateText =  months[dateText.getMonth()] + " " + dateText.getDate();
                    existingNumber[dateText] = item.number;
                });
                prepData(existingNumber);
                break;

                default:
                    break;
            }
        } else {
            prepData();
        }

        let chart = this.state.chartData[chartKey];
        chart.data.labels = dateData;
        chart.data.datasets[0].data = numData;
        this.forceUpdate();
        console.log(this.state);
    }

    getCardData = (path, cardName) => {
        socketService.emit(path, {
            platformObjId: getPlatformObjId(),
            startDate: new Date(),
            endDate: new Date()
        }).then(data => {
            console.log(path, " success! ", data);
            if(data && data.success) {
                let rawData = data.data;
                let total = 0;
                switch(cardName) {
                    case 'onlinePlayer':
                    case 'newPlayer':
                    rawData.forEach(item => {
                        total += item.number || 0;
                    })
                    break;

                    case 'topup':
                    case 'bet':                    
                    rawData.forEach(item => {
                        total += item.totalAmount || 0;
                    });
                    break;

                    case 'withdrawal':
                    rawData.records.forEach(item => {
                        total += item.amount || 0;
                    });
                    break;

                    default:
                        break;
                }
                let stateData = {cardData: Object.assign({}, this.state.cardData)};
                stateData.cardData[cardName].value = total;
                this.setState(stateData);
                // this.state.cardData[cardName].value = total;
            } else {
                console.error(path, "unsuccessful! ", data);
            }
        }, err => {
            console.log(path, " error!");
            console.log(err);
        });
    }

    getAllCardData() {
        this.getCardData("countLoginPlayerbyPlatformWeek", "onlinePlayer");
        this.getCardData("getTopUpTotalAmountForAllPlatform", "topup");
        this.getCardData("getBonusRequestList", "withdrawal");
        this.getCardData("getPlayerConsumptionSumForAllPlatform", "bet");
        this.getCardData("countNewPlayers", "newPlayer");
    }
    getAllChartData() {
        this.getChartData("countLoginPlayerAllPlatform", "login");
        this.getChartData("countTopUpAllPlatform", "topup");
        this.getChartData("countPlayerBonusAllPlatform", "bonus");
        this.getChartData("countConsumptionAllPlatform", "consumption");
        this.getChartData("countNewPlayerAllPlatform", "newPlayer");
    }
    getAllRewardProposalCountAndCredit() {
        let path = "getAllRewardProposal";
        let sendData = {
            platformObjId: getPlatformObjId()
        };
        
        socketService.emit(path, sendData).then(data => {
            console.log(path, " success! ", data);
            if(data && data.success) {
                let proposals = data.data;
                let count = proposals.length;
                let totalCredit = 0;
                proposals.forEach(proposal => {
                    totalCredit += proposal.data.amount;
                })

                let stateData = {operationCardData: Object.assign({}, this.state.operationCardData)};
                stateData.operationCardData.rewardCount.value = count;
                stateData.operationCardData.rewardCredit.value = totalCredit;
                this.setState(stateData);
                // this.forceUpdate();
            } else {
                console.error(path, "unsuccessful! ", data);
            }
        }, err => {
            console.log(path, " error!");
            console.log(err);
        });
    }
    
    checkLogin() {
        if(!authService.hasLogin()){
            navService.goto("");
        }
    }

    componentWillMount() {
        this.checkLogin();
    }
    componentDidMount() {
        this.getAllCardData();
        this.getAllChartData();
        this.getAllRewardProposalCountAndCredit();
    }

    render() {
        return (
            <div>
                <NavBar/>
                <div className="col-12">
                    <h1>平台選擇</h1>
                    <hr></hr>
                    <div className="card-deck">
                        <Card
                            info = {this.state.cardData.onlinePlayer.info}
                            chinese = {this.state.cardData.onlinePlayer.chinese}
                            value = {this.state.cardData.onlinePlayer.value}
                            awesomeIcon = {this.state.cardData.onlinePlayer.awesomeIcon}
                        />
                        <Card
                            info = {this.state.cardData.topup.info}
                            chinese = {this.state.cardData.topup.chinese}
                            value = {this.state.cardData.topup.value}
                            awesomeIcon = {this.state.cardData.topup.awesomeIcon}
                        />
                        <Card
                            info = {this.state.cardData.withdrawal.info}
                            chinese = {this.state.cardData.withdrawal.chinese}
                            value = {this.state.cardData.withdrawal.value}
                            awesomeIcon = {this.state.cardData.withdrawal.awesomeIcon}
                        />
                        <Card
                            info = {this.state.cardData.bet.info}
                            chinese = {this.state.cardData.bet.chinese}
                            value = {this.state.cardData.bet.value}
                            awesomeIcon = {this.state.cardData.bet.awesomeIcon}
                        />
                        <Card
                            info = {this.state.cardData.newPlayer.info}
                            chinese = {this.state.cardData.newPlayer.chinese}
                            value = {this.state.cardData.newPlayer.value}
                            awesomeIcon = {this.state.cardData.newPlayer.awesomeIcon}
                        />
                    </div>

                    <h1>统计数据</h1>
                    <hr></hr>

                <div className="row">
                    <LineChart
                        data = {this.state.chartData.login.data}
                        title = {this.state.chartData.login.title}
                    />
                    <LineChart
                        data = {this.state.chartData.topup.data}
                        title = {this.state.chartData.topup.title}
                    />
                    <LineChart
                        data = {this.state.chartData.bonus.data}
                        title = {this.state.chartData.bonus.title}
                    />
                    <LineChart
                        data = {this.state.chartData.consumption.data}
                        title = {this.state.chartData.consumption.title}
                    />
                    <LineChart
                        data = {this.state.chartData.newPlayer.data}
                        title = {this.state.chartData.newPlayer.title}
                    />
                </div>

                <h1>营运数据</h1>
                <hr></hr>

                    <div className="row">
                        <div className="col-sm-9 col-md-7">
                            <div className="card-deck">
                                <Card
                                    info = {this.state.operationCardData.rewardCount.info}
                                    chinese = {this.state.operationCardData.rewardCount.chinese}
                                    value = {this.state.operationCardData.rewardCount.value}
                                    awesomeIcon = {this.state.operationCardData.rewardCount.awesomeIcon}
                                />
                                <Card
                                    info = {this.state.operationCardData.rewardCredit.info}
                                    chinese = {this.state.operationCardData.rewardCredit.chinese}
                                    value = {this.state.operationCardData.rewardCredit.value}
                                    awesomeIcon = {this.state.operationCardData.rewardCredit.awesomeIcon}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Dashboard;