

let navService = {
    goto: function(destination) {
        window.location.hash = "/" + destination;
    }
}

export default navService;