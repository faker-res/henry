import React, { Component } from 'react';
import LineChart from './lineChart';
import Card from './card';
import socketService from '../services/socketService';
import authService from '../services/authService';

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const chartStartDate = new Date(new Date().setDate(new Date().getDate() - 6)).toDateString();
const chartEndDate = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString();

class Dashboard extends Component {
    state = {
        cardsInfo: [
            {id:1, info: "onlinePlayer", chinese: "在线玩家", value: 0, awesomeIcon: ['far', 'smile']},
            {id:2, info: "topup", chinese: "充值额度", value: 0, awesomeIcon: ['fas', 'dollar-sign']},
            {id:3, info: "withdrawal", chinese: "提款额", value: 0, awesomeIcon: ['fas', 'dollar-sign']},
            {id:4, info: "bet", chinese: "投注额", value: 0, awesomeIcon: ['far', 'money-bill-alt']},
            {id:5, info: "newPlayer", chinese: "新玩家", value: 0, awesomeIcon: ['fas', 'user-plus']},
        ],
        cardsInfoTwo: [
            {id: 1, info: "newPlayer", chinese: "提案", value: 0, awesomeIcon:['far','smile']},
            {id: 2, info: "topup", chinese: "优惠申请数", value: 0, awesomeIcon:['far','registered']},
            {id: 3, info: "bet", chinese: "优惠申请额度", value: 0, awesomeIcon:['far','stop-circle']},
        ],
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
            topUp: {
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

    getChartData = (method, chartName) => {
        socketService.emit(method, {
            platform: authService.getPlatform(),
            startDate: chartStartDate,
            endDate: chartEndDate
        }).then(data => {
            console.log(method, " success! ", data);
            if(data && data.success) {
                this.updateChartData(data.data, chartName);
            }
        }, err => {
            console.log(method, " error!");
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

                case 'topUp':
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

    componentDidMount() {
        this.getChartData("countLoginPlayerAllPlatform", "login");
        this.getChartData("countTopUpAllPlatform", "topUp");
        this.getChartData("countPlayerBonusAllPlatform", "bonus");
        this.getChartData("countConsumptionAllPlatform", "consumption");
        this.getChartData("countNewPlayerAllPlatform", "newPlayer");
    }

    render() {
        return (
            <div className="col-12">
                <br></br>
                <h1>平台選擇</h1>
                <hr></hr>
                <div className="card-deck">
                    {this.state.cardsInfo.map(c =>
                        <Card
                            key = {c.id}
                            info = {c.info}
                            chinese = {c.chinese}
                            value = {c.value}
                            awesomeIcon = {c.awesomeIcon}
                        />
                    )}
                </div>

                <br></br>
                <h1>统计数据</h1>
                <hr></hr>

                <div className="row">
                    <LineChart
                        data = {this.state.chartData.login.data}
                        title = {this.state.chartData.login.title}
                    />
                    <LineChart
                        data = {this.state.chartData.topUp.data}
                        title = {this.state.chartData.topUp.title}
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

                <br></br>
                <h1>营运数据</h1>
                <hr></hr>

                <div className="row">
                    <div className="col-sm-9 col-md-7">
                        <div className="card-deck">
                            {this.state.cardsInfoTwo.map(t =>
                                <Card
                                    key = {t.id}
                                    info = {t.info}
                                    chinese = {t.chinese}
                                    value = {t.value}
                                    awesomeIcon = {t.awesomeIcon}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

        );
    }
}

export default Dashboard;