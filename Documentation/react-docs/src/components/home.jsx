import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

class Home extends Component {
    // state = {
    //     api: {
    //         Login: [
    //             {name: "Login", url: "http://54.179.151.35:888/ClientApi/#登录"},
    //             {name: "playerLogin", url: "http://54.179.151.35:888/ClientApi/#玩家登录"},
    //         ],
    //         Register: [
    //             {name: "Register", url: "http://54.179.151.35:888/ClientApi/#玩家开户"}
    //         ]
    //     },
    //     display:{},
    //     dataList:{}
    // };
    constructor(props) {
        super(props);
        this.state = {display: apiData.login };
    }


    // UNSAFE_componentWillMount() {
    //     this.setState({display: {}});
    // }

    clickHandler = (event) => {
        console.log(event.target.parentElement.children);
        let arr = event.target.parentElement.children;
        for (let i=0; i< arr.length; i++){
            arr[i].className = "nav-item"
        }
        event.target.className += " active";
        for(let key in apiData){
            if(apiData[key].name === event.target.innerText){
                this.setState({display: apiData[key]});
            }
        }


    };

    showDataHandler = (event) => {
        Object.keys(this.state.display).map((key) => {
            if(this.state.display[key].title === event.target.innerText){
                this.setState({dataList: this.state.display[key]});
            }
        });

    };

    render() {
        // const navLists = Object.keys(apiData).map((key, index) => {
        //     return <li className="nav-item" key={index} onClick={this.clickHandler}>
        //         {apiData[key].name}</li>;
        // });

        let navLists = [];
        for(let key in apiData){
            navLists.push(<li className="nav-item" key={key} onClick={this.clickHandler}>
                {apiData[key].name}</li>);
        }

        // for(let key in apiData){
        //     console.log(key);
        //     const navLists = () => {
        //         return <li className="nav-item" key={index} onClick={this.clickHandler}>
        //             {apiData[key].name}</li>;
        //     }
        // }



        const btns = Object.keys(this.state.display).map((item, index) => {
            if(this.state.display[item].title){
                return <button className="btn btn-dark m-1" key={index} onClick={this.showDataHandler}>
                    {this.state.display[item].title}</button>
            }
        });

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

        let requestContentTable = apiData.login.login.requestContent.map((item) => {
            return  <tr>
                        <td>{item.param}</td>
                        <td>{item.mandatory}</td>
                        <td>{item.type}</td>
                        <td>{item.content}</td>
                    </tr>
        });


        return (
            <div className="container border">
                <div className="row">
                    <div className="col-4 col-lg-2">
                        <Menu
                            nav = {navLists}
                        />
                    </div>
                    <div className="col-8 col-lg-10 mainContent">
                        {Object.keys(this.state.display).map((item, index) =>
                                <Content
                                title = {item}
                                requestContent = {requestContentTable}
                                />
                        )}


                        {/*<Content*/}
                            {/*// linkBtn = {btns}*/}
                            {/*title = {this.state.display.name}*/}
                            {/*// functionName = {this.state.dataList.functionName}*/}
                            {/*// desc = {this.state.dataList.desc}*/}
                            {/*requestContent = {requestContentTable}*/}
                            {/*// statusOfSuccess = {requestContentTable}*/}
                            {/*// statusOfFailed = {requestContentTable}*/}

                            {/*// data={dataList}*/}

                        {/*/>*/}
                    </div>
                </div>
            </div>
        );
    }
}

export default Home;