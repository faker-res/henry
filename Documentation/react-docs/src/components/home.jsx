import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

class Home extends Component {
    state = {
        display:{},
        dataList:{},
        funcList:{}
    };

    UNSAFE_componentWillMount() {
        this.setState({display: apiData.login});
        this.setState({funcList: this.state.display.func});
    }

    clickHandler = (event) => {
        Object.keys(apiData).map((key) => {
            if(apiData[key].name === event.target.innerText){
                this.setState({display: apiData[key]});
                this.setState({funcList: apiData[key].func});
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

    populateDataList = () => {
        console.log('display list',apiData);
        console.log('display func',apiData.func);
        this.setState({funcList: this.state.display.func});
        console.log('func list',this.state.funcList);
    }

    render() {
        const lists = Object.keys(apiData).map((key, index) => {
            return <li className="nav-item" key={index} onClick={this.clickHandler}
                       style={{cursor: "pointer"}}>{apiData[key].name}</li>;
        });

        const btns = Object.keys(this.state.display.func).map((item, index) => {
            if(this.state.display.func[item].title){
                return <button className="btn btn-dark m-1" key={index} onClick={this.showDataHandler}>
                    {this.state.display.func[item].title}</button>
            }
        });

        let requestContentTable = Object.keys(this.state.dataList).map((item, index) => {
            return  <tr>
                        <td>{item}</td>
                        <td>{this.state.dataList[item]}</td>
                    </tr>
        });

        console.log(this.state.display.func);
        console.log(this.state.funcList);
        console.log(this.state);
        let loopContent = () => {
            let temp = [];
            for(let key in this.state.funcList){

                temp.push(<Content
                    linkBtn = {btns}
                    title = {this.state.funcList[key].title}
                    functionName = {this.state.funcList[key].functionName}
                    desc = {this.state.funcList[key].desc}
                    requestContent = {requestContentTable}
                    statusOfSuccess = {requestContentTable}
                    statusOfFailed = {requestContentTable}
                />);
            }
            console.log('temp',temp);
            return temp;
        }


        return (
            <div>
                <div className="row">
                    <Menu
                        list = {lists}
                    />
                    {loopContent()}
                    {/*<Content*/}
                    {/*    linkBtn = {btns}*/}
                    {/*    title = {this.state.dataList.title}*/}
                    {/*    functionName = {this.state.dataList.functionName}*/}
                    {/*    desc = {this.state.dataList.desc}*/}
                    {/*    requestContent = {requestContentTable}*/}
                    {/*    statusOfSuccess = {requestContentTable}*/}
                    {/*    statusOfFailed = {requestContentTable}*/}
                    {/*/>*/}

                </div>
            </div>
        );
    }
}

export default Home;