import React, { Component } from 'react';
import Menu from './menu';
import Content from './content';
import ApiContent from '../ApiContent';

class Home extends Component {
    state = {
        display:{},
        linkList:{}
    };

    UNSAFE_componentWillMount() {
        // console.log('state', ApiContent[Object.keys(ApiContent)[0]])
        this.setState({display: ApiContent[Object.keys(ApiContent)[0]]})
    }

    clickHandler = (event) => {
        let name = event.target.innerText;
        this.setState({display: ApiContent[name]})
    };

    showContentHandler = (event) => {
        // console.log('display', this.state.display);
        let content = this.state.display;
        let name = event.target.innerText;
        this.setState({linkList: content[name]});
        console.log('linklist', content[name]);
    };



    render() {
        const lists = Object.keys(ApiContent).map((key, index) => {
            return <li key={index} onClick={this.clickHandler} style={{cursor: "pointer"}}>{key}</li>;
        });
        const btns = Object.keys(this.state.display).map((key, index) => {
            return <button key={index} onClick={this.showContentHandler} className="btn btn-dark m-1">{key}</button>
        });



        return (
            <div>
                <div className="row">
                    <Menu
                        list = {lists}
                    />
                    <Content
                        linkBtn = {btns}

                        desc = {this.state.linkList.desc}
                        requestContent = {this.state.linkList.requestContent}
                        statusSuccess = {this.state.linkList.statusSuccess}
                        statusFailed = {this.state.linkList.statusFailed}

                    />
                </div>
            </div>
        );
    }
}

export default Home;