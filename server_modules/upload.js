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
    name: 'upload',
    allowedMethods: 'OPTIONS, POST',
    
    execute: function(req, res, path, bot) {
        if (req.method.toLowerCase() !== 'post') {
            res.writeHead(405, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: false, error: 'Only POST method is supported for upload module.'}));
            return;
        }
        
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
            
            if (!fields.file_info || !files.file || !files.file.type || !files.file.path) {
                res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: false, error: 'Required information is missing!'}));
                return;
            }
            
            let fileInfo = null;
            try {
                fileInfo = JSON.parse(fields.file_info);
            } catch(err) {
                res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: false, error: 'Failed to parse file info!'}));
                return;
            }
            
            let dir = uploadDirectory;
            let uuid = uuidv4();
            let name = uuid;
            
            let extension = null;
            
            switch(fileInfo.type) {
                case 'IMAGE':
                    dir += imageDirectory;
                    
                    extension = imageTypes.get(files.file.type);
                    if (!extension) {
                        res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                        res.end(JSON.stringify({ success: false, error: 'Unsupported image type!'}));
                        return;
                    }
                    
                    break;
                case 'SOUND':
                    dir += soundDirectory;
                    
                    extension = soundTypes.get(files.file.type);
                    if (!extension) {
                        res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                        res.end(JSON.stringify({ success: false, error: 'Unsupported sound type!'}));
                        return;
                    }
                    
                    break;
                default:
                    res.writeHead(400, header(module.exports.allowedMethods, 'application/json'));
                    res.end(JSON.stringify({ success: false, error: 'Unsupported upload type!'}));
                    return;
                    break;
            }
            
            name += extension;
            
            try {
                fs.renameSync(files.file.path, dir + name);
            } catch(err) {
                res.writeHead(500, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: false, error: 'Failed to write to disk!'}));
                return;
            }
            
            try {
                bot.fileRegistry.registerFile(uuid, {
                    dir: dir,
                    name: name
                });
            } catch(err) {
                res.writeHead(500, header(module.exports.allowedMethods, 'application/json'));
                res.end(JSON.stringify({ success: false, error: 'Failed to register file!'}));
                return;
            }
            
            res.writeHead(200, header(module.exports.allowedMethods, 'application/json'));
            res.end(JSON.stringify({ success: true, uuid: uuid }));
        });
    }
};