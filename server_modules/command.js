const fs = require('fs');
const formidable = require('formidable');

const header = require('../util/header.js');

const { v4: uuidv4 } = require('uuid');

const uploadDirectory = './resources/uploads/';

const tempDirectory = 'temp/';
const imageDirectory = 'img/';
const soundDirectory = 'sound/';

// supported audio types
const soundTypes = new Map();
soundTypes.set('audio/mpeg', '.mp3');
soundTypes.set('audio/wav', '.wav');

// supported image types
const imageTypes = new Map();
imageTypes.set('image/png', '.png');
imageTypes.set('image/jpeg', '.jpg');
imageTypes.set('image/gif', '.gif');

module.exports = {
    name: 'command',
    allowedMethods: 'OPTIONS, POST, GET, DELETE',
    
    execute: function(req, res, path, bot) {
        if (req.method.toLowerCase() === 'post') {
            const form = formidable({
                multiples: false,
                uploadDir: uploadDirectory + tempDirectory
            });
            
            form.parse(req, (err, fields, files) => {
                if (err) {
                    res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Failed to parse form data!'}));
                    return;
                }
                
                if (!fields.commandInfo) {
                    res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Required information is missing!'}));
                    cleanup(files);
                    return;
                }
                
                let commandInfo = null;
                try {
                    commandInfo = JSON.parse(fields.commandInfo);
                } catch(err) {
                    res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Failed to parse command info!'}));
                    cleanup(files);
                    return;
                }

                if (!commandInfo.type || !commandInfo.keyword) {
                    res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Required information is missing!'}));
                    cleanup(files);
                    return;
                }
                
                let it = bot.commandRegistry.commands.values();
                let result = it.next();

                while(!result.done) {
                    if (result.value.keyword === commandInfo.keyword) {
                        res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                        res.end(JSON.stringify({ success: false, error: 'Specified keyword is already in use!'}));
                        cleanup(files);
                        return;
                    }
                    result = it.next();
                }
                
                let fileRequired = false;
                let dir = uploadDirectory;
                let fileUuid = uuidv4();
                let name = fileUuid;
                
                if (commandInfo.type === 'IMAGE') {
                    if (!files.file) {
                        res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                        res.end(JSON.stringify({ success: false, error: 'No file uploaded!'}));
                        return;
                    }
                }
                
                switch(commandInfo.type) {
                    case 'SOUND':
                        if (!commandInfo.sound || !commandInfo.sound.type) {
                            res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                            res.end(JSON.stringify({ success: false, error: 'Required information is missing!'}));
                            cleanup(files);
                            return;
                        } else if (commandInfo.sound.type === 'FILE') {
                            if (!files.file || !soundTypes.has(files.file.type)) {
                                res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                                res.end(JSON.stringify({ success: false, error: 'Invalid file type or no file uploaded!'}));
                                cleanup(files);
                                return;
                            }
                            fileRequired = true;
                            dir += soundDirectory;
                            name += soundTypes.get(files.file.type);
                        }
                        break;
                    case 'IMAGE':
                        if (!imageTypes.has(files.file.type)) {
                            res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                            res.end(JSON.stringify({ success: false, error: 'Invalid file type!'}));
                            cleanup(files);
                            return;
                        }
                        fileRequired = true;
                        dir += imageDirectory;
                        name += imageTypes.get(files.file.type);
                        break;       
                }
                
                if (fileRequired) {
                    try {
                        fs.renameSync(files.file.path, dir + name);
                        bot.fileRegistry.registerFile(fileUuid, {
                            dir: dir,
                            name: name
                        });
                        commandInfo.fileId = fileUuid;
                    } catch(err) {
                        res.writeHead(500, header(module.exports.allowedMethods, 'application/json'));
                        res.end(JSON.stringify({ success: false, error: 'Failed to upload file!'}));
                        cleanup(files);
                        return;
                    }
                }
                
                let commandUuid = null;
                try {
                    uuid = bot.commandRegistry.createCommand(commandInfo);
                } catch(err) {
                    res.writeHead(500, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: err }));
                    return;
                }
                
                res.writeHead(200, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: true, uuid: commandUuid }));
            });
        } else if (req.method.toLowerCase() === 'delete') {
            if (!path[2]) {
                res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: false, error: 'No command specified!'}));
            }
            
            try {
                bot.commandRegistry.deleteCommand(path[2])
            } catch(err) {
                res.writeHead(500, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: false, error: 'Failed to delete resource from disk!'}));
                return;
            }
            
            res.writeHead(200, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: true }));
        } else if (req.method.toLowerCase() === 'get') {
            res.writeHead(200, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: true, commands: Object.fromEntries(bot.commandRegistry.commands) }));
        } else {
            res.writeHead(405, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: false, error: 'Only POST method is supported for command module.'}));
            return;
        }
    }
};

function cleanup(files) {
    if (files.file) {
        try {
            fs.unlinkSync(files.file.path);
        } catch(err) {
            bot.logger.err('Command server module: Cleanup failed: ' + files.file.path);
        }
    }
}