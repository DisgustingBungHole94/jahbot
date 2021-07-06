const Logger = require('./util/logger.js');
const logger = new Logger('HTTPServer');

const fs = require('fs');

const http = require('http');

const header = require('./util/header.js');

var jahbot = null;

const moduleDirectory = './server_modules/';
const modules = new Map();

const port = 8008;
var server = null;

module.exports = {
    start: function(bot) {
        jahbot = bot;
        
        logger.log('Loading server modules...');
        
        let files = null;
        try {
            files = fs.readdirSync(moduleDirectory);
        } catch(err) {
            logger.err('Failed to open server module directory!');
            return;
        }
        
        files.forEach((file) => {
            try {
                const module = require(moduleDirectory + file);
                modules.set(module.name, module);
                
                logger.log('Module ' + module.name + ' loaded!');
            } catch(err) {
                console.log(err);
                logger.err('Failed to load module ' + file + '!');
            }
        });
        
        server = http.createServer(requestHandler);
        server.listen(port);
        
        logger.log('HTTP server listening on port ' + port + '!');
    }
};

function requestHandler(req, res) {
    let path = req.url.split('/');
    if (!path || path.length < 2) {
        res.writeHead(404, header('', 'application/json'));
        res.end(JSON.stringify({ success: false, error: 'Selected module does not exist!'}));
        return;
    }

    let module = modules.get(path[1]);
    if (!module) {
        res.writeHead(404, header('', 'application/json'));
        res.end(JSON.stringify({ success: false, error: 'Selected module does not exist!'}));
        return;
    }

    if (req.method.toLowerCase() === 'options') {
        res.writeHead(204, header(module.allowedMethods, ''));
        res.end();
        return;
    }
    
    logger.log('Executing server module ' + module.name + ' with method ' + req.method);

    module.execute(req, res, path, jahbot);
}