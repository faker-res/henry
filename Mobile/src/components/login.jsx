import React, { Component } from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import $ from 'jquery';
import WSCONFIG from '../wsconfig.js';
import authService from '../services/authService.js';
import navService from '../services/navService.js';
import socketService from '../services/socketService.js';
import localStorageService from '../services/localStorageService.js';
import SelectServer from './selectServer';

console.log("process.env", process.env);
const defaultPlatformId = process.env.REACT_APP_DEFAULT_PLATFORM_ID;

class Login extends Component {
    constructor(props){
        super(props);
        
        this.state = {
            fastestServer: '',
            fastestServerUrl: '',
            servers: WSCONFIG,
            selectedServer: 'Fastest Server',
            path: 'login'
        };
    }

    handleChange = (ev, key) => {
        console.log("***change happened , triggered***");
        let setObject = {};
        setObject[key] = ev.currentTarget.value;
        this.setState(setObject);
    };
    handlePropsUpdate = (obj) => {
        console.log("***handlePropsUpdate , triggered***");
        this.setState(obj);
    };
    
    getPlatformByAdminId = () => {
        return socketService.emit("getPlatformByAdminId", {adminObjId: authService.getAdminObjId()}).then(platforms => {
            console.log("getPlatformByAdminId ret", platforms);
            if(platforms && platforms.success && platforms.data.length > 0) {
                localStorageService.set("platforms",platforms.data);
            }
            return platforms.data;
        });
    };

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
        };
        console.log("Login --> Send Data", sendData);
        $.ajax(sendData).done(data => {
            console.log("login done!");
            console.log(data);
            if(data.success) {
                let exp = new Date();
                exp.setSeconds(exp.getSeconds() + 60 * 60 * 5);
                
                localStorageService.set("socketUrl", url);
                authService.storeAuth(data.token, data._id, data.adminName, data.departments, data.roles, data.language, exp);
                this.getPlatformByAdminId().then(platforms => {
                    if(platforms && platforms.length > 0) {
                        let selectedPlatform;
                        platforms.forEach(platform=>{
                            if(platform.platformId === defaultPlatformId) {
                                selectedPlatform = platform;
                            }
                        })
                        localStorageService.set("selectedPlatform", selectedPlatform);
                    }
                    navService.goto("dashboard");
                });
            } else {
                console.log(data.error.message);
            }
        })
    };

    checkLogin() {
        if(authService.hasLogin()){
            navService.goto("dashboard");
        }
    };
    
    componentWillMount() {
        this.checkLogin();
    }
    
    render() { 
        console.log("Rendering...");
        return (
            <div className="container centerMenu">
                <div className="login card col-12">
                    <div className="text-center">
                        <h4>FPMS</h4>
                    </div>

                    <div className="login-group">
                        <input type="text" className="login-control" id="username" onChange={(e)=>{this.handleChange(e,'username')}}/>
                        <label htmlFor="username">Username</label>
                    </div>

                    <div className="login-group">
                        <input type="password" className="login-control" id="pwd" onChange={(e)=>{this.handleChange(e,'password')}}/>
                        <label htmlFor="pwd">Password</label>
                    </div>

                    <SelectServer path={this.state.path} selectedServer={this.state.selectedServer} updateProps={this.handlePropsUpdate} updatePropsWithEvent={this.handleChange} />

                    <div className="login-group">
                        <label className="login-check-label">
                            <input type="checkbox" /> Remember Me
                        </label>
                    </div>
                    <div className="login-group">
                        <a href="/">Forgot Password?</a>
                    </div>
                    <div className="login-group ">
                        <button type="button" onClick={()=>{this.login()}} className="float-right btn-sm btn-dark">LOGIN</button>
                    </div>
                    
                </div>
            </div>

        );
    }

}
 
export default Login;