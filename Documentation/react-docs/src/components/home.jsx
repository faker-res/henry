import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import apiData from '../data/apiDocumentation';

class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {display: apiData.login };
    }

    clickHandler = (event) => {
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
        let navLists = [];
        for(let key in apiData){
            navLists.push(<li className="nav-item" key={key} onClick={this.clickHandler}>
                {apiData[key].name}</li>);
        }

        const btns = Object.keys(this.state.display).map((item, index) => {
            if(this.state.display[item].title){
                return <button className="btn btn-dark m-1" key={index} onClick={this.showDataHandler}>
                    {this.state.display[item].title}</button>
            }
        });

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