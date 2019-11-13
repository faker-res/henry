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
                this.setState({funcList: apiData[key].func});
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

        let generateRequestContent = (name) => {
            let rows = [];
            this.state.funcList[name].requestContent.map((item) => {
                rows.push(
                    <tr>
                        <td>{item.param}</td>
                        <td>{item.mandatory}</td>
                        <td>{item.type}</td>
                        <td>{item.content}</td>
                    </tr>
                )
            });
            return rows;
        };

        console.log(this.state.display.func);
        console.log(this.state.funcList);
        console.log(this.state);
        let loopContent = () => {
            let temp = [];
            for(let key in this.state.funcList){

                temp.push(<Content
                    title = {this.state.funcList[key].title}
                    functionName = {this.state.funcList[key].functionName}
                    desc = {this.state.funcList[key].desc}
                    requestContent = {generateRequestContent(key)}
                    // respondSuccess = {this.state.funcList[key].respondSuccess ? this.state.funcList[key].respondSuccess.status : null}
                    // respondFailure = {this.state.funcList[key].respondFailure ? this.state.funcList[key].respondFailure.status : null}
                />);
            }
            console.log('temp',temp);
            return temp;
        }


        return (
            <div className="container border">
                <div className="row">
                    <div className="col-4 col-lg-2">
                        <Menu
                            nav = {navLists}
                        />
                    </div>
                    <div className="col-8 col-lg-10 mainContent">
                        {loopContent()}
                    </div>
                </div>
            </div>
        );
    }
}

export default Home;