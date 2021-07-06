module.exports = class Logger {    
    constructor(name) {
        this.name = name;

        this.masterPrefix = '[JahBot]';
        
        this.logPrefix = '[LOG]';
        this.errPrefix = '[ERROR]';
        this.cshPrefix = '[FATAL]';
    }

    log(msg) {
        console.log(getTimestamp() + ' ' + this.masterPrefix + ' ' + this.name + ' ' + this.logPrefix + ' ' + msg);
    }

    err(msg) {
        console.warn(getTimestamp() + ' ' + this.masterPrefix + ' ' + this.name + ' ' + this.errPrefix + ' ' + msg);
    }

    csh(msg) {
        console.error(getTimestamp() + ' ' + this.masterPrefix + ' ' + this.name + ' ' + this.cshPrefix + ' ' + msg);
    }
}

function getTimestamp(prefix, msg) {
    const date = new Date();
    
    let day = date.getDate().toString().padStart(2, '0');
    
    let minutes = date.getMinutes().toString().padStart(2, '0');
    let seconds = date.getSeconds().toString().padStart(2, '0');
    
    return (date.getMonth() + 1) + '-' + day + '-' + date.getFullYear() + ' ' + date.getHours() + ':' + minutes + ':' + seconds;
}