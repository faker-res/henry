import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ServerResponse } from 'http';
import $ from 'jquery';

class Login extends Component {
    state = {
        isFocus: false
    };
    constructor(props){
        super(props)
        this.inputRef = React.createRef();
    }

    handleFocus = () => {
        this.setState({ isFocus: true});
    }

    handleBlur= () => {
        this.setState({ isFocus: false});
    }

    handleChange = (ev, key) => {
        // this.setState({selectValue:e.target.value});
        console.log(ev.currentTarget.value);
        console.log(key);
        let setObject = {};
        setObject[key] = ev.currentTarget.value;
        this.setState(setObject);
    }

    populateServerWithLatency = ()=>{
        let servers = this.props.servers;
        // let list = [<option key={server} value={servers[server].socketURL} disabled> {server + ": " + "ms" }</option>];
        let list = []
        for(let server in servers) {
            if(servers.hasOwnProperty(server)) {
                if(isNaN(parseInt(servers[server].latency))) {
                    list.push(<option key={server} value={servers[server].socketURL} disabled> {server + ": " + "ms" }</option>)
                } else {
                    list.push(<option key={server} value={servers[server].socketURL}> {server + ": " + servers[server].latency + "ms" }</option>)
                }
            }
        }
        return list;
    }

    login() {
        console.log("connecting...");
        console.log($('#mgntServer').value+'/login');
        console.log(this.state.selectedServer+'/login');
        $.ajax({
            type: 'post',
            data: {
                username: this.state.username,
                password: this.state.password
            },
            url: this.state.selectedServer + '/login',
            timeout: 5000
        }).done(data => {
            console.log("success!");
            console.log(data);
        })
    }
    
    render() { 
        return (
            <div className="container centerMenu">
                <div className="card">
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
                        <select onFocus={this.handleFocus} onBlur={this.handleBlur} className="login-control" id="mgntServer" onChange={(e)=>{this.handleChange(e,'selectedServer')}}>
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
        classes += this.state.isFocus == true ? "focusClass" : "";
        return classes;
      }
      
}
 
export default Login;