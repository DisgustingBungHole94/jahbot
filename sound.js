const Logger = require('./util/logger.js');
const logger = new Logger('SoundPlayer');

const fs = require('fs');

const ytdl = require('ytdl-core');
const Discord = require('discord.js');

const Message = require('./util/message.js');

module.exports = class SoundPlayer {
    constructor() {
        this.guilds = new Map();
    }
    
    async play(message, sound) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            Message.send(message.channel, 'You actually need to be in a voice channel to play a sound!');
            return;
        }
        
        const perms = voiceChannel.permissionsFor(message.client.user);
        if (!perms.has('CONNECT') || !perms.has('SPEAK')) {
            Message.send(message.channel, 'I don\'t actually have permission to join the channel actually.');
            return;
        }
        
        if (this.guilds.has(message.guild.id)) {
            Message.send(message.channel, 'I am actually already playing a funny sound. Deez nuts.');
            return;
        }
        
        const guild = {
            voiceChannel: voiceChannel,
            textChannel: message.channel,
            connection: null,
            sound: sound,
            volume: 5
        };
        
        try {
            guild.connection = await voiceChannel.join();
            
            let self = this;
            guild.connection.on('disconnect', () => {
                if (self.guilds.has(message.guild.id)) {
                    self.guilds.delete(message.guild.id);
                }
                
                logger.log('Disconnected from [' + guild.voiceChannel.name + '] in server [' + guild.voiceChannel.guild.name + ']!');
            });
            
            guild.connection.on('reconnecting', () => {
                guild.voiceChannel = guild.connection.channel;
                
                logger.log('Connected to [' + guild.voiceChannel.name + '] in server [' + guild.voiceChannel.guild.name + ']!');
            });
            
            logger.log('Connected to [' + guild.voiceChannel.name + '] in server [' + guild.voiceChannel.guild.name + ']!');
        } catch(err) {
            logger.log('Failed to connect to [' + guild.voiceChannel.name + '] in server [' + guild.voiceChannel.guild.name + ']!');
            
            Message.send(message.channel, 'Actually I wasn\'t able to actually play the sound. 8==D');
            return;
        }
        
        this.guilds.set(message.guild.id, guild);
        
        this.execute(message.channel, message.guild);
    }
    
    execute(channel, guild) {
        const guildObj = this.guilds.get(guild.id);
        
        if (guildObj.connection === null) {
            Message.send(channel, 'Invalid connection to server!');
            
            logger.err('Invalid server connection for server [' + guild.name +']!');
            return;
        }
                
        let stream = null;
        switch(guildObj.sound.type) {
            case 'FILE':
                stream = fs.createReadStream(guildObj.sound.sound);
                break;
            case 'YOUTUBE':
                stream = ytdl(guildObj.sound.sound);
                break;
            default:
                logger.err('Unrecognized sound type!');
                
                Message.send(channel, 'Invalid sound type!');
                return;
                break;
        }
        
        const dispatcher = guildObj.connection.play(stream)
        .on('start', () => {        
            Message.send(channel, 'Now playing a funny sound!');
        })
        .on('finish', () => {
            stream.destroy();
            this.disconnect(guild, false);
        })
        .on('error', (err) => {
            stream.destroy();
            this.disconnect(guild, false);
            Message.send(channel, 'Failed to play sound! Very unpogchamp!');
            
            logger.err('An error occurred while playing sound: ' + err);
        });
    }
    
    stop(message) {
        if (!this.disconnect(message.guild, true)) {
            Message.send(message.channel, 'NOTHING IS PLAYING!!!! DEEZ NUTS!!!!!');
        } else {
            Message.send(message.channel, 'Aight bye cunt.');
        }
    }
    
    disconnect(guild, playing) {
        const guildObj = this.guilds.get(guild.id);
        
        if (guildObj) {
            if (playing) guildObj.connection.dispatcher.end();
            guildObj.voiceChannel.leave();
            this.guilds.delete(guild.id);
            
            logger.log('Cleaned up server [' + guild.name + ']!');
            
            return true;
        }
        
        return false;
    }
}