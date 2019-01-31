import React, { Component } from 'react';
import Login from './components/login';
import './App.css';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIgloo, faAngleDown, faCheckSquare, faCoffee } from '@fortawesome/free-solid-svg-icons';
import $ from 'jquery';

library.add(faIgloo, faAngleDown, faCheckSquare, faCoffee)


class App extends Component {

    state = {
        WSCONFIG : {
            "pacnet": {
                "socketURL": "papi-pacnet.fpms8.me:9000",
            },
            "globe": {
                "socketURL": "papi-globe.fpms8.me:9000",
            },
            "wtt": {
                "socketURL": "papi-wtt.fpms8.me:9000",
            },
            "pccw": {
                "socketURL": "papi-pccw.fpms8.me:9000",
            },
            "lan": {
                "socketURL": "papi-lan.fpms8.me:9000",
            },
            "dev": {
                "socketURL": "devtest.fpms8.me:9000",
            },
            "dev-all": {
                "socketURL": "devtest-all.fpms8.me:9000",
            },
            "Default": {
                "MANAGEMENT_SERVER_URL":"http://localhost:7000",
                "STATISTICS_SERVER_URL":"http://localhost:8080",
                "socketURL":"http://localhost:7000"
            }
        }
    };

    pingAllServers = () =>{
        console.log("pingallserver");
        let servers = this.state.WSCONFIG;
        console.log(this.state);
        for(let server in servers) {
            if (server === 'Default') {
                this.pingHTTPServer(servers[server].MANAGEMENT_SERVER_URL, server);
            } else {
                this.pingHTTPServer(servers[server].socketURL, server);
            }
        }
    }
    
    pingHTTPServer= (serverURL, server) =>{
        let WSCONFIG = this.state.WSCONFIG;
        let sendTime, receiveTime, latency, fastestServer, lowestLatency = 9999;

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

                if (server != 'cstest' && (latency < lowestLatency)) {
                    lowestLatency = latency;
                    fastestServer = server;
                }

                WSCONFIG[server].isAvailable = true;
                console.log(server,": ",latency,"ms  -->   ", serverURL);
            },
            error: function (data) {
                WSCONFIG[server].isAvailable = false;
            }
        });
    }
    

    render() {
        this.pingAllServers();
        console.log(this.state.WSCONFIG);
        const servers = (this.state.WSCONFIG);
        console.table(servers);
        return (
            <div>
                {/* <ul>
                    {servers.map((item, index) =>
                    <li key={index}>
                        {item} 
                    </li>
                    )}
                </ul> */}
                
                <Login
                servers = {servers}
                // selectedServer = {}
                /> 
                {/* <button onClick={} >{"pingALL"}</button> */}
            </div>
        );
    }
}


export default App;
