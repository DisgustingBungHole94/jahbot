const Logger = require('../util/logger.js');
const logger = new Logger('CommandRegistry');

const ytdl = require('ytdl-core');

const { v4: uuidv4 } = require('uuid');

const JsonIO = require('../util/json_io.js');
const fs = require('fs');

const Message = require('../util/message.js');

module.exports = class CommandRegistry {
    constructor(fileRegistry, soundPlayer) {
        this.commandDirectory = './resources/user_commands/';
        
        this.commands = new Map();
        
        this.fileRegistry = fileRegistry;
        this.soundPlayer = soundPlayer;
    }
    
    load() {
        logger.log('Loading command directory...');
        
        let files = null;
        try {
            files = fs.readdirSync(this.commandDirectory);
        } catch(err) {
            logger.err('Failed to open command directory!');
            return;
        }
        
        files.forEach((file) => {
            try {
                let data = JsonIO.readFile(this.commandDirectory + file);
                if (!data.keyword || !data.type) throw 'Information missing!';
                
                this.commands.set(file.split('.')[0], data);
                
                logger.log('Loaded ' + file);
            } catch(err) {
                logger.err('Failed to load command from ' + file + '!');
            }
        });
        
        logger.log('All commands loaded!');
    }
    
    async parseInvoke(keyword, message) {
        let it = this.commands.values();
        let result = it.next();
        
        while(!result.done) {
            if (result.value.keyword === keyword) {
                await this.execute(message, result.value);
                return true;
            }
            result = it.next();
        }
        
        return false;
    }
    
    async execute(message, command) {
        logger.log('Executing user command! (Keyword: ' + command.keyword + ')');
        
        switch(command.type) {
            case 'SOUND':
                let sound = null;
                switch(command.sound.type) {
                    case 'FILE':
                        try {
                            let file = this.fileRegistry.getFile(command.sound.sound);
                            sound = file.dir + file.name;
                        } catch(err) {
                            logger.err('Failed to load file for custom command! (File ID ' + command.fileId + ')');
                            return;
                        }
                        break;
                    case 'YOUTUBE':
                        sound = command.sound.sound;
                        break;
                    default:
                        logger.err('Unrecognized sound type for custom command!');
                        return;
                        break;
                }
                
                await this.soundPlayer.play(message, {
                    type: command.sound.type,
                    sound: sound
                });
                break;
            case 'IMAGE':
                const msg = new Message.Message({
                    title: command.text
                });
                
                let img = null;
                try {
                    img = this.fileRegistry.getFile(command.fileId);
                } catch(err) {
                    logger.err('Failed to load file for custom command! (File ID ' + command.fileId + ')');
                    return;
                }
                
                
                msg.message.attachFiles([ img.dir + img.name ]);
                msg.message.setImage('attachment://' + img.name);
                
                msg.send(message.channel)
                break;
            case 'TEXT':
                Message.send(message.channel, command.text);
                break;
            default:
                logger.err('Unrecognized command type specified for custom command!');
                break;
        }
    }
    
    createCommand(command) {
        if (!command.type) throw 'Command type is missing!';
        if (!command.keyword) throw 'Command keyword is missing!';
        
        if (command.text && command.text.length >= 2000) throw 'Text must be 2,000 characters or less!';
        
        switch(command.type) {
            case 'SOUND':
                if (!command.sound || !command.sound.type) throw 'Sound information is missing!';
                switch(command.sound.type) {
                    case 'FILE':
                        if (!command.fileId) throw 'Sound file ID is missing!';
                        if (!this.fileRegistry.fileExists(command.fileId)) throw 'Specified sound file does not exist!';
                        break;
                    case 'YOUTUBE':
                        if (!command.sound.sound) throw 'No YouTube URL specified!';
                        if (!ytdl.validateURL(command.sound.sound)) throw 'Specified YouTube URL is invalid!';
                        break;
                    default:
                        throw 'Unsupported sound type!';
                        break;
                }
                break;
            case 'IMAGE':
                if (!command.fileId) throw 'Image file ID is missing!';
                if (!this.fileRegistry.fileExists(command.fileId)) throw 'Specified image file does not exist!';
                break;
            case 'TEXT':
                if (!command.text) throw 'Command text is missing!';
                break;
            default:
                throw 'Unsupported command type!';
                break;
        }
        
        let id = uuidv4();
        let file = this.commandDirectory + id + '.json';
        JsonIO.writeFile(file, command);
        
        this.commands.set(id, command);
        
        return id;
    }
    
    deleteCommand(command) {
        if (!this.commands.has(command)) {
            throw 'Command not found!';
        }
        
        let commandInfo = this.commands.get(command);
        switch(commandInfo.type) {
            case 'SOUND':
                if (commandInfo.sound.type === 'FILE') {
                    try {
                        this.fileRegistry.deleteFile(commandInfo.fileId);
                    } catch(err) {
                        logger.err('Failed to delete resource associated with command ' + command + '!');
                    }
                }
                break;
            case 'IMAGE':
                try {
                    this.fileRegistry.deleteFile(commandInfo.fileId);
                } catch(err) {
                    logger.err('Failed to delete resource associated with command ' + command + ': ' + err);
                }
                break;
        }
        
        let file = this.commandDirectory + command + '.json';
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        } else {
            throw 'Command does not exist on disk!';
        }
        
        this.commands.delete(command);
    }
}
