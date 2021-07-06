const fs = require('fs');

const header = require('../util/header.js');

module.exports = {
    name: 'resource',
    allowedMethods: 'OPTIONS, GET, DELETE',
    
    execute: function(req, res, path, bot) {
        if (req.method.toLowerCase() === 'get' || req.method.toLowerCase() === 'delete') {
            if (!path[2]) {
                res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: false, error: 'No file specified!'}));
            }

            if (req.method.toLowerCase() === 'get') {
                let file = null;
                try {
                    file = bot.fileRegistry.getFile(path[2])
                } catch(err) {
                    res.writeHead(404, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Resource not found!'}));
                    return;
                }
            
                let data = null;
                try {
                    data = fs.readFileSync(file.dir + file.name);
                } catch(err) {
                    res.writeHead(500, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Failed to read resource from disk!'}));
                    return;
                }

                res.writeHead(200, header(module.exports.allowedMethods, ''));
                res.end(data);
            } else {
                try {
                    bot.fileRegistry.deleteFile(path[2]);
                } catch(err) {
                    res.writeHead(500, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Failed to delete resource from disk!'}));
                    return;
                }
                
                res.writeHead(200, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: true}));
            }
        } else {
            res.writeHead(405, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: false, error: 'Specified method is not supported for resource module.'}));
            return;
        }
    }
};