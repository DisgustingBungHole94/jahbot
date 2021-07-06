const header = require('../util/header.js');

module.exports = {
    name: 'log',
    allowedMethods: 'OPTIONS, GET',
    
    execute: function(req, res, path, bot) {
        if (req.method.toLowerCase() !== 'get') {
            res.writeHead(405, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: false, error: 'Only GET method is supported for log module.'}));
            return;
        }
        
        if (!path[2]) {
            let guilds = [];
            bot.timeLog.guilds.forEach((guild, id) => {
                let data = {
                    id: id
                };
                
                try {
                    let guildData = bot.client.guilds.resolve(id);
                    data.name = guildData.name;
                } catch(err) {
                    data.name = id;
                }
                
                guilds.push(data);
            });
                        
            res.writeHead(200, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: true, guilds: guilds }));
            return;
        }
        
        if (!bot.timeLog.guilds.has(path[2])) {
            res.writeHead(404, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: false, error: 'Failed to load selected server!' }));
            return;
        }
        
        let users = [];
        bot.timeLog.guilds.get(path[2]).forEach((user) => {
            users.push(user);
        })
        
        users.sort((a, b) => {
            return b.time - a.time;
        });
        
        res.writeHead(200, header(module.exports.allowedMethods, 'application/json'));
        res.end(JSON.stringify({ success: true, users: users }));
    }
};