const Logger = require('./util/logger.js');
const logger = new Logger('UserTimeLog');

const JsonIO = require('./util/json_io.js');
const fs = require('fs');

const Time = require('./util/time.js');
const Message = require('./util/message.js');

module.exports = class Log {
    constructor() {
        this.logDirectory = './resources/log/';
        
        this.guilds = new Map();
        this.onlineUsers = new Map();
    }
    
    load() {
        logger.log('Loading user times...');
        
        let files = null;
        try {
            files = fs.readdirSync(this.logDirectory);
        } catch(err) {
            logger.err('Failed to open user time directory!');
            return;
        }
        
        files.forEach((file) => {
            try {
                let data = JsonIO.readFile(this.logDirectory + file);
                if (!data.time || !data.lastOnline) {
                    throw 'Information missing!';
                }
                
                let nameSplit = file.split('.');
                if (!nameSplit[1] || nameSplit[1] === 'json') {
                    throw 'Invalid file name!';
                }
                
                if (!this.guilds.has(nameSplit[0])) {
                    this.guilds.set(nameSplit[0], new Map());
                }
                
                this.guilds.get(nameSplit[0]).set(nameSplit[1], data);
                
                logger.log('Loaded ' + file);
            } catch(err) {
                logger.err('Failed to load user time info from ' + file + '!');
            }
        });
        
        logger.log('All user times loaded!');
    }
    
    userJoin(member) {
        this.onlineUsers.set(member.user.id, new Date().getTime());
        
        logger.log('User [' + member.user.username + '] has joined.');
    }
    
    userLeave(member) {
        let user = member.user.id;
        let guild = member.guild.id;
        
        if (!this.onlineUsers.has(user)) {
            logger.err('User [' + member.user.username + '] has no entry.');
            return;
        }
        
        let date = new Date();
        
        let elapsedTime = date.getTime() - this.onlineUsers.get(user);
        
        this.onlineUsers.delete(user);
        
        let fMinutes = date.getMinutes().toString().padStart(2, '0');
        let fDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + date.getHours() + ':' + fMinutes;
        
        if (!this.guilds.has(guild)) {
            this.guilds.set(guild, new Map());
        }
        
        let time = 0;
        if (this.guilds.get(guild).has(user)) {
            time = this.guilds.get(guild).get(user).time;
        }
        
        let data = { time: time + elapsedTime, lastOnline: fDate, name: member.user.username };
        
        try {
            JsonIO.writeFile(this.logDirectory + guild + '.' + user + '.json', data);
        } catch(err) {
            logger.err('Failed to write user time for user [' + member.user.username + ']!');
            return;
        }
        
        this.guilds.get(guild).set(user, data);
        
        let fTime = Time.formatTime(elapsedTime);
        
        logger.log('User [' + member.user.username + '] was online for ' + fTime.hours + ' hours, ' + fTime.minutes + ' minutes, and ' + fTime.seconds + ' seconds.');
    }
    
    async parseInvoke(command, message) {
        if (command.includes('log')) {
            let s = command.split(' ');
            if (s.length < 2) {
                if (!this.guilds.has(message.guild.id)) {
                    Message.send(message.channel, 'No users found!');
                    return true;
                }
                 
                await displayUserList(message.channel, this.guilds.get(message.guild.id), message.guild.id);
            } else {
                if (s[1].length < 4 || !s[1].startsWith('<@!')) {
                    Message.send(message.channel, 'The user could not actually be found, buddy! Deez nuts!');
                } else {
                    let id = s[1].substring(3, s[1].length - 1);
                    
                    if (!this.guilds.has(message.guild.id) || !this.guilds.get(message.guild.id).has(id)) {
                        Message.send(message.channel, 'The user could not actually be found, buddy! Deez nuts!');
                        return true;
                    }
                    
                    let userInfo = this.guilds.get(message.guild.id).get(id);
                    
                    let user = null;
                    try {
                        user = await message.client.users.fetch(id);
                    } catch(err) {
                        logger.err('Failed to fetch user with ID ' + id + '!');
                        return true;
                    }
                    
                    displayUser(message.channel, user, userInfo, this.onlineUsers.has(id));
                }
            }
        } else {
            return false;
        }

        return true;
    }
}

function displayUser(channel, user, userInfo, isOnline) {
    let options = {
        title: user.username + '\'s Info',
        author: 'JahBot'
    };
    
    options.text = isOnline ? 'User is currently online!' : 'Last seen: ' + userInfo.lastOnline;
    
    const msg = new Message.Message(options);
    
    let fTime = Time.formatTimeDays(userInfo.time);
    msg.message.addFields([
        { name: 'Days', value: fTime.days, inline: true },
        { name: 'Hours', value: fTime.hours, inline: true},
        { name: 'Minutes', value: fTime.minutes, inline: true},
        { name: 'Seconds', value: fTime.seconds, inline: true}
    ]);
    
    msg.message.setThumbnail(user.avatarURL());
    
    msg.send(channel);
}

async function displayUserList(channel, guild, guildId) {
    let users = new Array();
    guild.forEach((info, id) => {
        let userInfo = info;
        userInfo.id = id;
        users.push(userInfo);
    });
    
    if (users.length < 1) {
        Message.send(channel, 'No users found!');
        return;
    }
    
    users.sort((a, b) => {
        return b.time - a.time;
    })
    
    let items = new Array();
    users.forEach((user, i) => {
        let fTime = Time.formatTimeDays(user.time);
        items.push({ 
            title: '#' + (i + 1) + ': ' + user.name,
            text: fTime.days + 'd, ' + fTime.hours + 'h, ' + fTime.minutes + 'm, ' + fTime.seconds + 's'
        });
    });
    
    const msg = new Message.MultipageMessage({
        title: 'Discord Grooming Leaderboard',
        url: 'http://76.236.31.36/suite/apps/jahbot/index.php?page=log.php?guild=' + guildId + '/',
        itemsPerPage: 5,
        displayType: 'titled',
        items: items
    });
    
    try {
        let user = await channel.client.users.fetch(users[0].id);
        msg.message.setThumbnail(user.avatarURL());
    } catch(err) {
        logger.err(err);
        logger.err('Failed to fetch user [' + users[0].name + ']\'s avatar URL!');
    }
    
    msg.send(channel);
}