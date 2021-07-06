const JahBot = require('./jahbot.js');
const jahbot = new JahBot();

const HTTPServer = require('./server.js');

function init() {
    jahbot.start();
    HTTPServer.start(jahbot);
}

init();