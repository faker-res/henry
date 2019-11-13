import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

class Home extends Component {
    state = {
        api: {
            Login: [
                {name: "Login", url: "http://54.179.151.35:888/ClientApi/#登录"},
                {name: "playerLogin", url: "http://54.179.151.35:888/ClientApi/#玩家登录"},
            ],
            Register: [
                {name: "Register", url: "http://54.179.151.35:888/ClientApi/#玩家开户"}
            ]
        },
        display:{},
        dataList:{}
    };

    UNSAFE_componentWillMount() {
        this.setState({display: apiData.login});
    }

    clickHandler = (event) => {
        Object.keys(apiData).map((key) => {
            if(apiData[key].name === event.target.innerText){
                this.setState({display: apiData[key]});
            }
        });
    };

    showDataHandler = (event) => {
        Object.keys(this.state.display).map((key) => {
            if(this.state.display[key].title === event.target.innerText){
                this.setState({dataList: this.state.display[key]});
            }
        });

    };

    render() {
        const lists = Object.keys(apiData).map((key, index) => {
            return <li className="nav-item" key={index} onClick={this.clickHandler}
                       style={{cursor: "pointer"}}>{apiData[key].name}</li>;
        });

        const btns = Object.keys(this.state.display).map((item, index) => {
            if(this.state.display[item].title){
                return <button className="btn btn-dark m-1" key={index} onClick={this.showDataHandler}>
                    {this.state.display[item].title}</button>
            }
        });

        console.log(this.state.dataList);

        // let dataList = [];
        // let keys = Object.keys(this.state.dataList)
        // for (let i = 0; i < keys.length; i++) {
        //     let key = keys[i];
        //     let item = this.state.dataList[key];
        //
        //     if (typeof (item) !== "object") {
        //         console.log("key", key)
        //         dataList.push(<div>{item}</div>);
        //     } else {
        //         for (let [subitemKey, subitem] of Object.entries(item)) {
        //             console.log("subitemKey", subitemKey)
        //             dataList.push(<div>{subitemKey}: {subitem}</div>);
        //         }
        //     }
        // }

        // let dataList = Object.keys(this.state.dataList).map((item, index) => {
        //     if (typeof (this.state.dataList[item]) !== "object") {
        //         return <div key={index}>{this.state.dataList[item]}</div>
        //     }
        //     if(typeof(this.state.dataList[item]) === "object" ){
        //         Object.entries(this.state.dataList[item]).map((innerItem, index) => {
        //             console.log(innerItem)
        //             return <div key={index}>{innerItem}</div>
        //         })
        //
        //     }
        //
        // });

        let requestContentTable = Object.keys(this.state.dataList).map((item, index) => {
            console.log(item);
            return  <tr>
                        <td>{item}</td>
                        <td>{this.state.dataList[item]}</td>
                    </tr>



        });


        return (
            <div>
                <div className="row">
                    <Menu
                        list = {lists}
                    />

                    <Content
                        linkBtn = {btns}
                        title = {this.state.dataList.title}
                        functionName = {this.state.dataList.functionName}
                        desc = {this.state.dataList.desc}
                        requestContent = {requestContentTable}
                        statusOfSuccess = {requestContentTable}
                        statusOfFailed = {requestContentTable}

                        // data={dataList}


                    />
                </div>
            </div>
        );
    }
}

export default Home;