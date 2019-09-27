import React, {Component} from 'react';
import SelectServer from './selectServer';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import authService from '../services/authService';
import localStorageService from '../services/localStorageService';
import navService from '../services/navService.js';


class NavBar extends Component{

    state = {
        path: 'navbar',
        isOpen: false,
        logoutNav: false,
        selectedServer: localStorageService.get("socketUrl"),
        platforms: localStorageService.get("platforms"),
        selectedPlatform: localStorageService.get("selectedPlatform"),
    }

    openNav () {
       const a = document.getElementById("myNav");
       a.style.height ="100%";
    }
    closeNav ()  {
        const a = document.getElementById("myNav");
        a.style.height ="0%";
    }

    handleClick = () => {
        if (!this.state.logoutNav) {
            document.addEventListener('click', this.handleOutsideClick, false);
        } else {
            document.removeEventListener('click', this.handleOutsideClick, false);
        }

        this.setState(prevState => ({
            logoutNav: !prevState.logoutNav,
        }));

        console.log('logoutNav', this.state.logoutNav);

    }
    handleOutsideClick = (e) => {
        if (this.node && this.node.contains(e.target)) {
            return;
        }

        this.handleClick();
    }

    handleChange = (ev, key) => {
        console.log("***change happened , triggered***");
        let setObject = {};
        setObject[key] = ev.currentTarget.value;
        this.setState(setObject);
    }
    handlePropsUpdate = (obj) => {
        console.log("***handlePropsUpdate , triggered***");
        this.setState(obj);
    }

    populatePlatforms = ()=>{
        let platforms = this.state.platforms;
        let list = []
        platforms.sort((current, next)=>{
            let curId = parseInt(current.platformId);
            let nextId = parseInt(next.platformId);
            if(!isNaN(curId) && !isNaN(nextId)) {
                return curId - nextId;
            } else {
                return 1;
            }
        })
        platforms.forEach(platform => {
            list.push(<option key={platform.name} value={platform._id}> {`${platform.platformId}.  ${platform.name}`}</option>)
        })
        console.log(list)
        return list;
    }
    
    logout() {
        authService.logout();
        localStorageService.logout();
        navService.goto('');
    }

    handlePlatformChange(ev) {
        console.log("handlePlatformChange");
        let platformObjId = ev.currentTarget.value;
        let platforms = this.state.platforms;
        platforms.forEach(platform => {
            if(platform._id === platformObjId) {
                this.setState({selectedPlatform: platform});
            }
        })
    }
    handleServerChange() {
        console.log("handleServerChange");        
    }

    render(){
        return (
            <div>
                <nav className="nav-bar" ref={node => { this.node = node; }} >
                    <FontAwesomeIcon icon="bars" size="2x" onClick={this.openNav}/>
                    <FontAwesomeIcon className="float-right" icon="user-circle" size="2x" onClick={this.handleClick}/>

                    {this.state.logoutNav && (
                        <div id="Nav" className="dropdown">
                            <a href="/"> <FontAwesomeIcon icon="language"/> English</a>
                            <a href="/"> <FontAwesomeIcon icon="edit"/> 开发日志</a>
                            <a href="/"> <FontAwesomeIcon icon="book-open"/> 查看日志</a>
                            <a href="/"> <FontAwesomeIcon icon="key"/> 更新密码</a>
                            <span onClick={this.logout}> <FontAwesomeIcon icon="sign-out-alt"/> 注销</span>
                        </div>
                    )}
                </nav>

                <div id="myNav" className="overlay">
                    <span className="closebtn" onClick={this.closeNav}>&times;</span>

                    <div className="overlay-header">
                        <div className="form-group">
                            <select className="form-control" value={this.state.selectedPlatform._id} onChange={(e)=>{this.handlePlatformChange(e)}} >
                                {this.populatePlatforms()}
                            </select>
                        </div>
                        <SelectServer path={this.state.path} selectedServer={this.state.selectedServer} updateProps={this.handlePropsUpdate} updatePropsWithEvent={this.handleChange} />
                    </div>

                    <div className="overlay-content">
                        <a href="#/dashboard"> <FontAwesomeIcon icon="tachometer-alt"/> 面板</a>
                        <a href="#/analysis"> <FontAwesomeIcon icon="chart-line" /> 分析</a>
                    </div>
                </div>
            </div>
        )
    }
}

export default NavBar;


