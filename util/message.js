const Discord = require('discord.js');

const defaults = {
    text: '',
    title: '',
    footer: '',
    author: '',
    color: '#db4021',
    timeout: 60000,
    inline: false,
    page: 0
};

class Message {
    constructor(options) {
        this.text = options.text || defaults.text;
            
        this.title = options.title || defaults.title;
        this.footer = options.footer || defaults.footer;
        this.author = options.author || defaults.author;
        this.color = options.color || defaults.color;
        this.timeout = options.timeout || defaults.timeout;
        
        this.message = new Discord.MessageEmbed();

        if (this.text) this.message.setDescription(this.text);

        if (this.title) this.message.setTitle(this.title);
        if (this.footer) this.message.setFooter(this.footer);
        if (this.author) this.message.setAuthor(this.author);
        if (this.color) this.message.setColor(this.color);
    }

    send(channel) {
        channel.send(this.message)
        .then((msg) => {
            msg.delete({ timeout: this.timeout }); 
        });
    }
    
    sendWithReaction(channel, emoji, func) {
        channel.send(this.message)
        .then((msg) => {
            msg.react(emoji);
            
            const filter = (reaction, user) => {
                return reaction.emoji.name === emoji && user.id != msg.author.id;
            };
            
            const collector = msg.createReactionCollector(filter, { time: this.timeout });
            collector.on('collect', (reaction, user) => {
                if (reaction.emoji.name === emoji) {
                    func(user);
                } 
            });
            
            collector.on('end', collected => {
                msg.delete(); 
            });
        });
    }
}

class MultipageMessage extends Message {
    constructor(options) {
        super(options);
        
        if (!options.itemsPerPage || !options.displayType || !options.items) {
            throw 'Required options missing!';
        }
        
        this.inline = options.inline || defaults.inline;
        this.page = options.page || defaults.page;
        this.itemsPerPage = options.itemsPerPage;
        this.displayType = options.displayType;
        this.items = options.items;
        
        this.options = options;
    }
    
    send(channel) {
        let maxPage = Math.ceil(this.items.length / this.itemsPerPage) - 1;
        if (this.page > maxPage) this.page = maxPage;
        
        switch(this.displayType) {
            case 'default':
                this.addItemsDefault();
                break;
            case 'titled':
                this.addItemsTitled();
                break;
            default:
                throw 'Invalid display type!';
                break;
        }
        
        this.message.setFooter('Page: ' + (this.page + 1) + '/' + (maxPage + 1));
        
        channel.send(this.message)
        .then((msg) => {
            if (this.page > 0) msg.react('⬅️');
            if (this.page < maxPage) msg.react('➡️');
            
            const filter = (reaction, user) => {
                return (reaction.emoji.name === '⬅️' || reaction.emoji.name === '➡️') && user.id !== msg.author.id;  
            };
            
            const collector = msg.createReactionCollector(filter, { time: this.timeout });
            collector.on('collect', (reaction, user) => {
                if (reaction.emoji.name === '⬅️') {
                    this.options.page = this.page - 1;
                    const newMsg = new MultipageMessage(this.options);
                    newMsg.send(channel);
                } else if (reaction.emoji.name === '➡️') {
                    this.options.page = this.page + 1;
                    const newMsg = new MultipageMessage(this.options);
                    newMsg.send(channel);
                }
            });
            
            collector.on('end', collected => {
                msg.delete(); 
            });
        });
    }
    
    addItemsDefault() {
        let itemString = '';
    
        for (let i = this.page * this.itemsPerPage; i < (this.page * this.itemsPerPage) + this.itemsPerPage; i++) {
            if (this.items[i]) itemString += this.items[i].text + '\n';
        }

        this.message.setDescription(itemString);
    }
    
    addItemsTitled() {
        for (let i = this.page * this.itemsPerPage; i < (this.page * this.itemsPerPage) + this.itemsPerPage; i++) {
            if (this.items[i]) this.message.addFields({ name: this.items[i].title, value: this.items[i].text, inline: this.inline });
        }
        
        this.message.setDescription('');
    }
}

function send(channel, text) {
    const msg = new Message({
        text: text
    });
    msg.send(channel);
}

module.exports.Message = Message;
module.exports.MultipageMessage = MultipageMessage;
module.exports.send = send;