import React, { Component } from 'react';
import BarChart from './barChart';
import NavBar from './navBar';
import DateFilter from './dateFilter';
import socketService from '../services/socketService';


class Analysis extends Component {
    constructor(props) {
        super(props);
        this.startValue = React.createRef();
        this.endValue = React.createRef();

    }

    state = {
        realChartData:{
            newUser:{
                // startTime: new Date(new Date().setHours(new Date().getHours() - 136)).toISOString().slice(0,-5),
                startTime: new Date(new Date().setHours(new Date().getHours() - 208)).toISOString().slice(0,-5),
                endTime: new Date(new Date().setHours(new Date().getHours() + 8)).toISOString().slice(0,-5),
                data: {
                    labels:[],
                    datasets: [{
                        label: '数量',
                        data:[],
                        backgroundColor: '#f7e8f6',
                        borderWidth: 1,
                        hoverBackgroundColor: '#f1c6e7',
                    }]
                },
                title: "新玩家用户",
                chartKey: "newUser",
                path: "countNewPlayers"
            },
            betAmountTrend:{
                startTime: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0,-5),
                endTime: new Date(new Date().setHours(new Date().getHours() + 8)).toISOString().slice(0,-5),
                data: {
                    labels:[],
                    datasets: [{
                        label: '数量',
                        data:[],
                        backgroundColor: '#d9eeec',
                        borderWidth: 1,
                        hoverBackgroundColor: '#64b2cd',
                    }]
                },
                title: "投注额趋势",
                chartKey: "betAmountTrend",
                path: "getPlayerConsumptionSumForAllPlatform"

            }
        },
        serverData: [
            {
                data: {
                    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                    datasets: [{
                        label: '数量',
                        data: [65, 59, 17, 81, 56, 55, 40, 21],
                        backgroundColor: '#f7e8f6',
                        borderWidth: 1,
                        hoverBackgroundColor: '#f1c6e7',
                    }]
                },
                title: "新玩家用户"
            },
            {
                data: {
                    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                    datasets: [{
                        label: '数量',
                        data: [15, 29, 30, 41, 56, 65, 70, 22],
                        backgroundColor: '#d9eeec',
                        borderWidth: 1,
                        hoverBackgroundColor: '#64b2cd',
                    }]
                },
                title: "投注额趋势"

            },

            {
                data: {
                    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                    datasets: [{
                        label: '数量',
                        data: [85, 39, 100, 61, 22, 73, 14, 59],
                        backgroundColor: '#010a43',
                        borderWidth: 1,
                        hoverBackgroundColor: '#f3d3d3',
                    }]
                },
                title: "在线充值"

            },

            {
                data: {
                    labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
                    datasets: [{
                        label: '数量',
                        data: [95, 29, 70, 61, 56, 35, 40, 12],
                        backgroundColor: '#f6f6f6',
                        borderWidth: 1,
                        hoverBackgroundColor: '#eae9e9',
                    }]
                },
                title: "提款额"

            },
        ],
        chartData: {},
        output:["newUser", "betAmountTrend"]
    };

    getChartData = (path, chartName, stopRender) => {
        socketService.emit(path, {
            startDate: this.state.realChartData[chartName].startTime,
            endDate: this.state.realChartData[chartName].endTime
        }).then(data => {
            console.log(path, " success! ", data);
            if(data && data.success) {
                this.updateChartData(data.data, chartName, stopRender);
            } else {
                console.error(path, "unsuccessful! ", data);
            }
        }, err => {
            console.log(path, " error!");
            console.log(err);
        });
    };

    updateChartData = (rawData, chartKey, stopRender) => {
        let labelData = [];
        let numData = [];
        if(rawData && rawData.length > 0) {
            console.log(rawData);
            rawData.forEach(item => {
                if(item._id !== null && item._id){
                    if(item._id.platformName){
                        labelData.push(item._id.platformName);
                    }else{
                        labelData.push(item._id.name);
                    }
                    if(item.number){
                        numData.push(item.number);
                    }else{
                        numData.push(item.totalAmount);
                    }
                }
            });
        }

        let chart = this.state.realChartData[chartKey];
        // chart.data.labels = labelData;
        chart.data.datasets[0].data = numData;
        this.setState({
            realChartData: {
                ...this.state.realChartData,
                [chartKey]: {
                    ...this.state.realChartData[chartKey],
                    data: {
                        ...this.state.realChartData[chartKey].data,
                        labels: labelData,
                    }
                }
            }

        });

        if(!stopRender) {
            let index = Object.keys(this.state.realChartData).indexOf(chartKey);
            this.refreshData(index);
        }
    };

    refreshData = (index) => {
        let retData = this.state.realChartData;
        let outputData = [];
        for (let key in retData) {
            outputData.push(retData[key]);
        }

        let barData;

        if(index){
            barData = JSON.parse(JSON.stringify(outputData[index]));
        }else{
            barData = JSON.parse(JSON.stringify(outputData[0]));
        }
        this.setState({chartData: barData});
    };



    getAllChartData() {
        this.getChartData("countNewPlayers", "newUser");
        this.getChartData("getPlayerConsumptionSumForAllPlatform", "betAmountTrend", true);
    }


    handleChange = (event) => {
        // let index = this.state.serverData.findIndex(item => item.title.toString() === event.target.value);
        // console.log(index);
        // this.setState({chartData: this.state.serverData[index]});

        let retData = this.state.realChartData;
        let outputData = [];
        for (let key in retData) {
            outputData.push(retData[key]);
        }

        let index = outputData.findIndex(item => item.title.toString() === event.target.value);
        console.log(index);
        console.log(outputData[index]);
        this.setState({chartData: outputData[index]});
        this.refreshData(index);

    };

    // handleTimeChange = (event, chartKey) => {
    //     const id = event.target.id;
    //     this.setState({
    //        realChartData: {
    //            ...this.state.realChartData,
    //            [chartKey]: {
    //                ...this.state.realChartData[chartKey],
    //                [id]: event.target.value
    //            }
    //        }
    //     });
    // };

    handleTimeChange = (event) => {
        const id = event.target.id;
        this.setState({
            chartData: {
               ...this.state.chartData,
                [id]: event.target.value
            }
        });
    };


    handleSubmit = () => {
        console.log("chartData######");

        let retData = this.state.realChartData;
        let outputData = [];
        for (let key in retData) {
            outputData.push(retData[key]);
        }

        let chartData = this.state.chartData;

        if(outputData && chartData && chartData.path && chartData.chartKey){
            outputData.forEach(outputData => {
                if(outputData.path === chartData.path && outputData.chartKey === chartData.chartKey){
                    console.log("this.startValue.current.value", this.startValue);
                    console.log("this.startValue.current.value", this.startValue.current.value);
                    console.log("this.endValue.current.value", this.endValue.current.value);
                    let temp = {
                        realChartData: {
                            ...this.state.realChartData,
                            [chartData.chartKey]: {
                                ...this.state.realChartData[chartData.chartKey],
                                startTime: this.startValue.current.value,
                                endTime: this.endValue.current.value

                            }
                        }
                    };
                    console.log("temp", temp);
                    this.setState(temp, ()=>{this.getChartData(chartData.path, chartData.chartKey);});
                    // this.getChartData(chartData.path, chartData.chartKey);
                }
            })
        }

    };


    componentWillMount() {
        this.getAllChartData();


        // let i = 1;
        // let barData;
        // let barDatas = [...this.state.serverData];
        // barData = JSON.parse(JSON.stringify(barDatas[0]));
        // this.setState({chartData: barData});
        // setInterval(() => {
        //     if(i >= barDatas.length){
        //         i = 0;
        //     }
        //     barData = JSON.parse(JSON.stringify(barDatas[i]));
        //     this.setState({chartData: barData});
        //     i++;
        // }, 5000);

        // let retData = this.state.realChartData;
        // let outputData = [];
        // for (let key in retData) {
        //     outputData.push(retData[key]);
        // }
        //
        // let barData;
        // barData = JSON.parse(JSON.stringify(outputData[0]));
        // this.setState({chartData: barData});


    }




    render() {
        let retData = this.state.realChartData;
        let outputData = [];
        for (let key in retData) {
            outputData.push(retData[key]);
        }
        const analysisTitle = outputData.map((item, index) => {
            return (
                <option key={index} value={item.title}>{item.title}</option>
            );
        });

        return (
            <div>
                <NavBar/>
                <div className="col-12">
                    <h1>分析</h1>
                    <hr></hr>
                    <div className="form-group">
                        <select className="form-control" onChange={this.handleChange}>
                            {analysisTitle}
                        </select>
                    </div>
                    <h3>{this.state.chartData.title}</h3>

                    <br></br>

                    <DateFilter
                        startTime = {this.state.chartData.startTime}
                        endTime = {this.state.chartData.endTime}
                        handleTimeChange={this.handleTimeChange}
                        handleSubmit = {this.handleSubmit}
                        startValue = {this.startValue}
                        endValue = {this.endValue}

                    />
                    <br/>
                    <BarChart
                        data = {this.state.chartData.data}
                        title = {this.state.chartData.title}
                    />

                    {/*<DateFilter*/}
                        {/*startTime = {this.state.realChartData.newUser.startTime}*/}
                        {/*endTime = {this.state.realChartData.newUser.endTime}*/}
                        {/*handleTimeChange={(event) => this.handleTimeChange(event, "newUser")}*/}
                        {/*handleSubmit = {() => this.handleSubmit("countNewPlayers", "newUser")}*/}
                    {/*/>*/}

                    {/*<br/>*/}
                    {/*<BarChart*/}
                        {/*data = {this.state.realChartData.betAmountTrend.data}*/}
                        {/*title = {this.state.realChartData.betAmountTrend.title}*/}
                    {/*/>*/}
                </div>

            </div>
        );
    }
}

export default Analysis;