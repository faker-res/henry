import $ from 'jquery';
import authService from './authService';
import localStorageService from './localStorageService';

let socketService = {
    emit: (path, sendData, method) => {
        method = method || 'POST';
        sendData = sendData || {}
        let url = `${localStorageService.get("socketUrl")}/${path}`;
        let token = authService.getToken();
        if(token) {
            sendData.token = authService.getToken();
        }
        console.log("method", method);
        console.log("url", url);
        console.log("sendData", sendData);
        return $.ajax({
            type: method,
            data: sendData,
            url: url
        });
    }
}

export default socketService;