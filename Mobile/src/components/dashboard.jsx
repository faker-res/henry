import React, { Component } from 'react';
import LineChart from './lineChart';
import Card from './card';
import NavBar from './navBar';

import $ from 'jquery';


class Dashboard extends Component {
    state = {
        cardsInfo: [
            {id:1, info: "onlinePlayer", chinese: "在线玩家", value: 0, awesomeIcon: ['far', 'smile']},
            {id:2, info: "topup", chinese: "充值额度", value: 20000, awesomeIcon: ['fas', 'dollar-sign']},
            {id:3, info: "withdrawal", chinese: "提款额", value: 0, awesomeIcon: ['fas', 'dollar-sign']},
            {id:4, info: "bet", chinese: "投注额", value: 100000, awesomeIcon: ['far', 'money-bill-alt']},
            {id:5, info: "newPlayer", chinese: "新玩家", value: 0, awesomeIcon: ['fas', 'user-plus']},
        ],
        cardsInfoTwo: [
            {id: 1, info: "newPlayer", chinese: "提案", value: 0, awesomeIcon:['far','smile']},
            {id: 2, info: "topup", chinese: "优惠申请数", value: 0, awesomeIcon:['far','registered']},
            {id: 3, info: "bet", chinese: "优惠申请额度", value: 0, awesomeIcon:['far','stop-circle']},
        ],
        chartData :[
            {
            data: {
                labels: [13, 14, 15, 16, 17, 18, 19],
                datasets: [
                    {
                        label: '数量',
                        data: [2, 5, 7, 4, 6, 1, 8],
                        backgroundColor: '#5cb85c',
                        fill: false,
                        borderColor: '#5cb85c',
                        lineTension: 0.25
                    }
                ]
            },
            title: "登录玩家"
            },

            {
            data: {
                labels: [13, 14, 15, 16, 17, 18, 19],
                datasets: [
                    {
                        label: '数量',
                        data: [8, 1, 6, 4, 7, 5, 2],
                        backgroundColor: '#2B6698',
                        fill: false,
                        borderColor: '#2B6698',
                        lineTension: 0.25
                    }
                ]
            },
            title: "充值"
            },

            {
                data: {
                    labels: [13, 14, 15, 16, 17, 18, 19],
                    datasets: [
                        {
                            label: '数量',
                            data: [2, 5, 7, 4, 6, 1, 8],
                            backgroundColor: '#4B0082',
                            fill: false,
                            borderColor: '#4B0082',
                            lineTension: 0.25
                        }
                    ]
                },
                title: "提款额"
            },

            {
                data: {
                    labels: [13, 14, 15, 16, 17, 18, 19],
                    datasets: [
                        {
                            label: '数量',
                            data: [8, 1, 6, 4, 7, 5, 2],
                            backgroundColor: '#f39c12',
                            fill: false,
                            borderColor: '#f39c12',
                            lineTension: 0.25
                        }
                    ]
                },
                title: "投注额"
            },

            {
                data: {
                    labels: [13, 14, 15, 16, 17, 18, 19],
                    datasets: [
                        {
                            label: '数量',
                            data: [2, 5, 7, 4, 6, 1, 8],
                            backgroundColor: '#d9534f',
                            fill: false,
                            borderColor: '#d9534f',
                            lineTension: 0.25
                        }
                    ]
                },
                title: "新玩家"
            },
        ]

    }


    componentDidMount() {
        const d = new Date();
        d.setDate( d.getDate() + 1 );

        const nD = new Date();
        nD.setDate( nD.getDate() - 6 );

        console.log("date", d);
        console.log("newDate", nD);
        // $.ajax(
        //     {
        //         type: 'post',
        //         data: {
        //             endDate: d.toDateString(),
        //             platform: "5733e26ef8c8a9355caf49d8",
        //             startDate: nD.toDateString()
        //         },
        //         url: 'http://localhost:7000/countLoginPlayerbyPlatformWeek'
        //     }
        // )
        //     .done((data) => {
        //         console.log("AA", data);
        //
        //     })
        //
        //
        // $.ajax(
        //     {
        //         type: 'post',
        //         data: {
        //             endDate: d.toDateString(),
        //             platform: "5733e26ef8c8a9355caf49d8",
        //             startDate: nD.toDateString()
        //         },
        //         url: 'http://localhost:7000/countNewPlayerAllPlatform'
        //     }
        // )
        //     .done ((data) => {
        //         console.log("BB", data);
        //         let playerData  = data.data;
        //
        //
        //         let lastDayNum = 0;
        //         let graphData = [];
        //
        //         playerData.map(item => {
        //             let dateText = new Date(item._id.date);
        //             graphData.push(item.number);
        //             lastDayNum = item.number;
        //             console.log('CC',graphData );
        //             console.log("EE", lastDayNum);
        //
        //         });
        //
        //         const sumOfDays = graphData.reduce(((acc, num) => acc + num), 0);
        //         console.log('DD', sumOfDays);
        //
        //         let cardsInfoCopy = JSON.parse(JSON.stringify(this.state.cardsInfo))
        //
        //         cardsInfoCopy[4].value = sumOfDays
        //         this.setState({
        //             cardsInfo:cardsInfoCopy
        //         })
        //
        //     })

        $.ajax(
            {
                type: 'post',
                data: {
                    endDate: d.toDateString(),
                    platform: "5733e26ef8c8a9355caf49d8",
                    startDate: nD.toDateString()
                },
                url: 'http://localhost:7000/countNewPlayerAllPlatform'
            }
        )
            .done ((data) => {
                let playerData  = data.data;

                let numData = [];
                let dateData = [];
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                playerData.map(item => {
                    let dateText = new Date(item._id.date);
                    numData.push(item.number);
                    dateText =  months[dateText.getMonth()] + " " + dateText.getDate();
                    dateData.push(dateText);
                });

                let dateCopy = [...this.state.chartData];
                let numCopy = [...this.state.chartData];

                for (let i = 0; i < dateCopy.length; i++ ){
                    dateCopy[i].data.labels = dateData;
                    this.setState({ data:dateCopy })

                    numCopy[i].data.datasets[0].data = numData;
                    this.setState({data: numCopy})
                }
                for (let j = 0; j < numCopy.length; j++ ) {

                }

                // let dateCopy = Object.assign({}, this.state.dataOne);
                // dateCopy.labels = dateData;
                // this.setState({ dataOne:dateCopy })
                //
                // let numCopy = Object.assign({}, this.state.dataOne);
                // numCopy.datasets[0].data = numData;
                // this.setState({ dataOne:numCopy })

            })


    }


    render() {
        return (
            <div>
                <NavBar/>
                <br></br>
                <br></br>
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
                        {this.state.chartData.map(cd =>
                            <LineChart
                                data = {cd.data}
                                title = {cd.title}

                            />
                        )}
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
            </div>
                 );
    }
}

export default Dashboard;