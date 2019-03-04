import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import $ from 'jquery';
import WSCONFIG from '../wsconfig.js';
import authService from '../services/authService.js';
import navService from '../services/navService.js';

class Login extends Component {
    constructor(props){
        super(props);
        
        this.state = {
            isFocus: false,
            fastestServer: '',
            fastestServerUrl: '',
            lowestLatency: 9999,
            servers: WSCONFIG,
            selectedServer: 'Fastest Server'
        };
        this.pingAllServers();
    }

    handleFocus = () => {
        this.setState({ isFocus: true});
    }

    handleBlur= () => {
        this.setState({ isFocus: false});
    }

    handleChange = (ev, key) => {
        console.log("***change happened , triggered***");
        let setObject = {};
        setObject[key] = ev.currentTarget.value;
        this.setState(setObject);
    }

    pingAllServers = () =>{
        console.log("pingAllServers");
        let servers = this.state.servers;
        for(let server in servers) {
            if (server === 'Default') {
                this.pingHTTPServer(servers[server].MANAGEMENT_SERVER_URL, server);
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
                    if (server !== 'cstest' && (latency < self.state.lowestLatency)) {
                        self.state.lowestLatency = latency;
                        self.state.fastestServer = server;
                        self.state.fastestServerUrl = serverURL;
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
    
    populateServerWithLatency = ()=>{
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

    login() {
        console.log("login...");
        let url = this.state.selectedServer === "Fastest Server" ? this.state.fastestServerUrl : this.state.selectedServer;
        let sendData = {
            type: 'post',
            data: {
                username: this.state.username,
                password: this.state.password
            },
            url: url + '/login',
            timeout: 5000
        }
        console.log("Login --> Send Data", sendData);
        $.ajax(sendData).done(data => {
            console.log("login done!");
            console.log(data);
            if(data.success) {
                let exp = new Date();
                exp.setSeconds(exp.getSeconds() + 60 * 60 * 12);
                authService.storeAuth(data.token, data._id, data.adminName, data.departments, data.roles, data.language, url, exp);
                navService.goto('dashboard');
            } else {
                console.log(data.error.message);
            }
        })
    }
    
    render() { 
        console.log("Rendering...");
        return (
            <div className="container centerMenu">
                <div className="login card col-12">
                    <div className="text-center">
                        <h4>FMPS</h4>
                    </div>

                    <div className="login-group">
                        <input type="text" className="login-control" id="username" onChange={(e)=>{this.handleChange(e,'username')}}/>
                        <label htmlFor="username">Username</label>
                    </div>

                    <div className="login-group">
                        <input type="password" className="login-control" id="pwd" onChange={(e)=>{this.handleChange(e,'password')}}/>
                        <label htmlFor="pwd">Password</label>
                    </div>

                    <div className="login-group">
                        <select onFocus={this.handleFocus} onBlur={this.handleBlur} className="login-control" id="mgntServer" value={this.state.selectedServer} onChange={(e)=>{this.handleChange(e,'selectedServer')}}>
                            <option key="Fastest Server" value="Fastest Server">Fastest Server</option>
                            {this.populateServerWithLatency()}
                        </select>
                        <label htmlFor="mgntServer">Select Server</label><FontAwesomeIcon className={this.getfocusClasses()} icon="angle-down" />
                    </div>

                    <div className="login-group">
                        <label className="login-check-label">
                            <input type="checkbox" /> Remember Me
                        </label>
                    </div>
                    <div className="login-group">
                        <a href="#">Forgot Password?</a>
                    </div>
                    <div className="login-group ">
                        <button type="button" onClick={()=>{this.login()}} className="float-right btn-sm btn-dark">LOGIN</button>
                    </div>
                    
                </div>
            </div>

        );
    }

    getfocusClasses() {
        let classes = "icon ";
        classes += this.state.isFocus === true ? "focusClass" : "";
        return classes;
      }
      
}
 
export default Login;