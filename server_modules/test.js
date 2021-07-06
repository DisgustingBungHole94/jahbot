const header = require('../util/header.js');

module.exports = {
    name: 'test',
    allowedMethods: 'OPTIONS, GET',
    
    execute: function(req, res, path, bot) {
        res.writeHead(200, header(module.exports.allowedMethods, 'text/plain'));
        res.end(JSON.stringify({ success: true }));
    }
};