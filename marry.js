const Logger = require('./util/logger.js');
const logger = new Logger('Marry');

const JsonIO = require('./util/json_io.js');
const fs = require('fs');

const Time = require('./util/time.js');
const Message = require('./util/message.js');

module.exports = class Marry {
    constructor() {
        this.partnerDirectory = './resources/marry/';
        this.fetcherDirectory = './fetchers/';
        
        this.userPartners = new Map();
        this.fetchers = new Map();
    }
    
    load() {
        logger.log('Loading user marriages...');
        
        let files = null;
        try {
            files = fs.readdirSync(this.partnerDirectory);
        } catch(err) {
            logger.err('Failed to open user marriage directory!');
            return;
        }
        
        files.forEach((file) => {
            try {
                let data = JsonIO.readFile(this.partnerDirectory + file);
                if (!data.name || !data.partners) throw 'Information missing!';
                
                this.userPartners.set(file.split('.')[0], data);
                
                logger.log('Loaded ' + file);
            } catch(err) {
                logger.err('Failed to load user marriage info from ' + file + '!');
            }
        });
        
        logger.log('All user marriages loaded!');
        
        logger.log('Loading marriage fetchers...');
        
        try {
            files = fs.readdirSync(this.fetcherDirectory);
        } catch(err) {
            logger.err('Failed to open marriage fetcher directory!');
            return;
        }
        
        files.forEach((file) => {
            try {
                const fetcher = require(this.fetcherDirectory + file);
                fetcher.timeLog = new Map();
                
                fetcher.init();
                
                this.fetchers.set(fetcher.keyword, fetcher);
                
                logger.log('Loaded ' + file);
            } catch(err) {
                logger.err('Failed to load fetcher ' + file + '!');
            }
        });
        
        logger.log('All marriage fetchers loaded!');
    }
    
    async parseInvoke(command, message) {
        if (this.fetchers.has(command)) {
            await this.fetchPartner(message.channel, message.author, this.fetchers.get(command));
            return true;
        } else if (command.startsWith('my') && command.endsWith('s')) {
            if (command.length < 4) return;
            
            let formattedCmd = command.substring(2);
            formattedCmd = formattedCmd.slice(0, formattedCmd.length - 1);
            
            if (this.fetchers.has(formattedCmd)) {
                this.listPartners(message.channel, message.author, this.fetchers.get(formattedCmd));
                return true;
            }
        }
        
        return false;
    }
    
    async fetchPartner(channel, user, fetcher) {
        let waitTime = this.updateWaitTime(user, fetcher);
        if (waitTime > -1) {
            let fTime = Time.formatTime(waitTime);
            
            logger.log('User [' + user.username + '] attempted to fetch [' + fetcher.title + '], must wait ' + fTime.hours + ' hours, ' + fTime.minutes + ' minutes, ' + fTime.seconds + ' seconds.');
            
            Message.send(channel, '💔 You can view a new ' + fetcher.title + ' in ' + fTime.hours + ' hours, ' + fTime.minutes + ' minutes, and ' + fTime.seconds + ' seconds. 💔');
            return;
        }
        
        let partner = await fetcher.get();
        if (!partner) {
            logger.err('Failed to fetch new [' + fetcher.title + ']!');
            return;
        }
        
        let options = { title: partner.name };
        if (partner.additionalInfo) options.text = partner.additionalInfo;
        
        const msg = new Message.Message(options);
        
        if (partner.imgPath === 'URL') {
            msg.message.setImage(partner.img);
        } else {
            msg.message.attachFiles([partner.imgPath + partner.img]);
            msg.message.setImage('attachment://' + partner.img);
        }
        
        msg.sendWithReaction(channel, '💖', (user) => {
            this.marryPartner(channel, user, partner, fetcher);
        });
        
        logger.log('Fetched [' + partner.name + '] (type [' + fetcher.title + ']) for [' + user.username + ']!');
    }
    
    listPartners(channel, user, fetcher) {
        let options = {
            title: user.username + '\'s ' + fetcher.title + ' Harem',
            itemsPerPage: 5,
            displayType: 'default',
            items: new Array()
        }
        
        let userPartners = null;
        try {
            let file = this.partnerDirectory + user.id + '.json';
            
            if (!fs.existsSync(file)) {
                Message.send(channel, '💔 You don\'t own any waifus!');
                return;
            }
            
            let userData = JsonIO.readFile(file);
            userData.partners.forEach((partner) => {
                if (partner.type === fetcher.title) {
                    options.items.push({ text: partner.name });
                }
            });
        } catch(err) {
            logger.err('Failed to load user data for [' + user.username + ']!');
            return;
        }
        
        const msg = new Message.MultipageMessage(options);
        msg.send(channel);
    }
    
    marryPartner(channel, user, partner, fetcher) {
        let it = this.userPartners.values();
        let result = it.next();
        
        while(!result.done) {
            for(let i = 0; i < result.value.partners.length; i++) {
                if (result.value.partners[i].id === partner.id) {
                    Message.send(channel, '💖 ' + partner.name + ' is already owned by ' + result.value.name + '!');
                    
                    logger.log('User [' + user.username + '] tried to claim [' + partner.name + '] (type [' + partner.type + ']), already owned by user [' + result.value.name + ']!');
                    
                    return;
                }
            }
            
            result = it.next();
        }
        
        let partnerData = {
            id: partner.id,
            type: fetcher.title,
            name: partner.name
        };
        
        if (!this.userPartners.has(user.id)) {
            this.userPartners.set(user.id, {
                name: user.username,
                partners: new Array()
            });
        }
        
        this.userPartners.get(user.id).partners.push(partnerData);
        
        try {
            JsonIO.writeFile(this.partnerDirectory  + user.id + '.json', {
                name: user.username,
                partners: this.userPartners.get(user.id).partners
            });
        } catch(err) {
            logger.err('Failed to update user partner list for user [' + user.username + ']!');
            return;
        }
        
        Message.send(channel, '💖 ' + partner.name + ' is now owned by ' + user.username + '! 💖')
        
        logger.log('User [' + user.username + '] now owns [' + partner.name + '] (type [' + partner.type + '])!');
    }
    
    updateWaitTime(user, fetcher) {
        if (fetcher.waitTime <= 0) return -1;
        
        let currentTime = new Date().getTime();
        let timeInfo = fetcher.timeLog.get(user.id);
        
        if (!timeInfo) {
            fetcher.timeLog.set(user.id, { uses: 1, lastTime: currentTime });
            return -1;
        }
        
        if (currentTime - timeInfo.lastTime < fetcher.waitTime) {
            if (timeInfo.uses < fetcher.limit) {
                timeInfo.uses++;
                timeInfo.lastTime = currentTime;
                fetcher.timeLog.set(user.id, timeInfo);
                return -1;
            } else {
                return fetcher.waitTime - (currentTime - timeInfo.lastTime);
            }
        }
        
        fetcher.timeLog.set(user.id, { uses: 1, lastTime: currentTime });
        
        return -1;
    }
}