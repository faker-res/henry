import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

class Home extends Component {
    state = {
        display:{},
        dataList:{}
    };

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

        let requestContentTable = Object.keys(this.state.dataList).map((item, index) => {
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
                    />
                </div>
            </div>
        );
    }
}

export default Home;