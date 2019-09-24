import React, {Component} from 'react';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import WSCONFIG from "../wsconfig";
import $ from "jquery";

const ENV = process.env.REACT_APP_ENV;
console.log("process.env.REACT_APP_ENV", ENV);

class SelectServer extends Component{
    constructor(props){
        super(props);

        this.state = {
            isFocus: false,
            lowestLatency: 9999,
            servers: WSCONFIG,
        };
        // this.pingAllServers();
    }

    handleFocus = () => {
        this.setState({ isFocus: true});
    }
    handleBlur= () => {
        this.setState({ isFocus: false});
    }

    isLoginPage = ()=>{
        return this.props.path === 'login';
    }

    pingAllServers = ()=>{
        console.log("pingAllServers");
        let servers = this.state.servers;
        for(let server in servers) {
            if (server === 'Default') {
                this.pingHTTPServer(servers[server][ENV].MANAGEMENT_SERVER_URL, server);
                servers[server].socketURL = servers[server][ENV].MANAGEMENT_SERVER_URL;
            } else {
                this.pingHTTPServer(servers[server].socketURL, server);
            }
        }
    }
    pingHTTPServer= (serverURL, server) =>{
        if(serverURL) {
            let WSCONFIG = this.state.servers;
            let sendTime, receiveTime, latency;
            let self = this;

            if (!serverURL.startsWith("http")) {
                serverURL = "http://" + serverURL;
            }

            $.ajax({
                type: "HEAD",
                url: serverURL,
                timeout: 30000,
                beforeSend: () => {
                    sendTime = (new Date()).getTime();
                },
                success: function () {
                    receiveTime = (new Date()).getTime();
                    latency = receiveTime - sendTime;
                    WSCONFIG[server].latency = latency;
                    if (self.isLoginPage && server !== 'cstest' && (latency < self.state.lowestLatency)) {
                        self.setState({lowestLatency: latency});
                        self.props.updateProps({fastestServer: server});
                        self.props.updateProps({fastestServerUrl: serverURL});
                    }
                    WSCONFIG[server].isAvailable = true;
                    console.log(server,": ",latency,"ms  -->   ", serverURL);
                },
                error: function (data) {
                    WSCONFIG[server].isAvailable = false;
                }
            });
        }
    }

    addFastestServer = ()=>{
        if(this.isLoginPage())
        return <option key="Fastest Server" value="Fastest Server">Fastest Server</option>
    }
    populateServerWithLatency = () => {
        let servers = this.state.servers;
        let list = []
        for(let server in servers) {
            if(servers.hasOwnProperty(server)) {
                if(isNaN(parseInt(servers[server].latency))) {
                    list.push(<option key={server} value={servers[server].socketURL} disabled> {`${server} : ms`}</option>)
                } else {
                    list.push(<option key={server} value={servers[server].socketURL}> {`${server}: ${servers[server].latency}ms`}</option>)
                }
            }
        }
        return list;
    }
    
    getfocusClasses() {
        let classes = "icon ";
        classes += this.props.path === 'login' && this.state.isFocus === true ? "focusClass" : "";
        classes += this.props.path === 'navbar' ? "d-none" : "";
        return classes;
    }
    getGroupClasses() {
        let group = "";
        group += this.props.path === 'login' ? "login-group": "";
        group += this.props.path === 'navbar' ? "form-group": "";
        return group;
    }
    getControlClasses(){
        let control = "";
        control += this.props.path === 'login' ? "login-control": "";
        control += this.props.path === 'navbar' ? "form-control": "";
        return control;
    }
    getShowClasses(){
        let show = "";
        show += this.props.path === 'navbar' ? "d-none": "";
        return show;
    }

    handleServerChange(e){
        this.props.updatePropsWithEvent(e,'selectedServer');
        //reconnect server
    }

    componentDidMount() {
        this.pingAllServers();
    }
    
    render(){
        console.log(this.props);
        return (
            <div className={this.getGroupClasses()}>
                <select onFocus={this.handleFocus} onBlur={this.handleBlur} className={this.getControlClasses()}
                id="mgntServer" value={this.props.selectedServer} onChange={(e)=>{this.handleServerChange(e)}}>
                    {this.addFastestServer()}
                    {this.populateServerWithLatency()}
                </select>
                <label className={this.getShowClasses()} htmlFor="mgntServer">Select Server</label><FontAwesomeIcon className={this.getfocusClasses()} icon="angle-down" />
            </div>
        )
    }
}

export default SelectServer;


