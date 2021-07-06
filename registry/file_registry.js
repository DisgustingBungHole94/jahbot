const Logger = require('../util/logger.js');
const logger = new Logger('FileRegistry');

const { v4: uuidv4 } = require('uuid');

const fs = require('fs');

module.exports = class FileRegistry {
    constructor() {
        this.uploadDirectory = './resources/uploads/';
        
        this.imageDirectory = 'img/';
        this.soundDirectory = 'sound/';
        
        this.files = new Map();
    }
    
    load() {
        logger.log('Loading uploaded images...');
        
        let files = null;
        try {
            files = fs.readdirSync(this.uploadDirectory + this.imageDirectory);
        } catch(err) {
            logger.err('Failed to open image directory!');
            return;
        }
        
        files.forEach((file) => {
            this.files.set(file.split('.')[0], {
                dir: this.uploadDirectory + this.imageDirectory,
                name: file
            });
            logger.log('Loaded ' + file + '!');
        });
        
        logger.log('Loading uploaded sounds...');
        
        try {
            files = fs.readdirSync(this.uploadDirectory + this.soundDirectory);
        } catch(err) {
            logger.err('Failed to open sound directory!');
            return;
        }
        
        files.forEach((file) => {
            this.files.set(file.split('.')[0], {
                dir: this.uploadDirectory + this.soundDirectory,
                name: file
            }); 
            logger.log('Loaded ' + file + '!');
        })
        
        logger.log('All uploaded files loaded!');
    }
    
    registerFile(fileId, file) {
        if (fs.existsSync(file.dir + file.name)) {
            this.files.set(fileId, file);
        } else {
            throw 'File does not exist on disk!';
        }
    }
    
    fileExists(fileId) {
        if (!this.files.get(fileId)) {
            return false;
        }
        
        return true;
    }
    
    getFile(fileId) {
        let file = this.files.get(fileId);
        if (!file) throw 'File not found!';
        
        if (fs.existsSync(file.dir + file.name)) {
            return file;
        }
        
        this.files.delete(fileId);
        throw 'File does not exist on disk!';
    }
    
    deleteFile(fileId) {
        let file = this.getFile(fileId);
        
        fs.unlinkSync(file.dir + file.name);
        
        this.files.delete(fileId);
    }
}