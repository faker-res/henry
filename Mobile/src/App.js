import React, { Component } from 'react';
import Login from './components/login';
import Dashboard from './components/dashboard';
import Analysis from "./components/analysis";
import './App.css';
import { library } from '@fortawesome/fontawesome-svg-core';
import {faAngleDown, faSmile as fasFaSmile, faArrowAltCircleRight, faDollarSign, faUserPlus, faBars, faEllipsisV, faTachometerAlt, faChartLine, faSignOutAlt, faKey, faLanguage, faBookOpen, faEdit, faUserCircle, faSearch} from '@fortawesome/free-solid-svg-icons'
import {faSmile as farFaSmile, faMoneyBillAlt, faRegistered, faStopCircle} from '@fortawesome/free-regular-svg-icons'
import {Route,  HashRouter} from "react-router-dom";

library.add(faAngleDown, farFaSmile, fasFaSmile, faArrowAltCircleRight, faDollarSign, faMoneyBillAlt, faUserPlus, faRegistered, faStopCircle, faBars, faUserCircle, faEllipsisV, faTachometerAlt, faChartLine, faSignOutAlt, faKey, faLanguage, faBookOpen, faEdit, faSearch)

class App extends Component {

    render() {
        return (
            <HashRouter>
                <div>
                    <Route exact path="/" component={Login}/>
                    <Route path="/dashboard" component={Dashboard}/>
                    <Route path="/analysis" component={Analysis}/>
                </div>
            </HashRouter>
        );
    }
}

export default App;