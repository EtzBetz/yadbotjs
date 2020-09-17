import fs from 'fs';
import Discord from "discord.js"
import config from '../config.json'
import scraperBlackBoard from './ScraperBlackBoard.mjs'

class YadBot {

	constructor() {
		this.client = new Discord.Client();

		this.client.once('ready', () => {
			console.log('I\'m online! Setting presence...')
			this.client.user.setActivity(` Version ${config.version}`, { type: 'PLAYING' });
			console.log(`I see ${this.client.guilds.cache.size} guilds and ${this.client.users.cache.size} members:`)
			this.client.guilds.cache.forEach(guild => {
				console.log(`  - ${guild.name} ( ${guild.id} )`)
			})
			console.log(`---------------------------------------------------------`)
		});

		this.client.on('message', message => {
			const prefix = config.prefix;
			if (!message.content.startsWith(prefix) || message.author.bot) return;

			const args = message.content.slice(prefix.length).trim().split(/ +/);
			const commandName = args.shift().toLowerCase();

			if (commandName === 'ping') {
				message.channel.send('Pong.');
			} else if (commandName === 'beep') {
				message.channel.send('Boop.');
			} else if (commandName === 'update') {
				scraperBlackBoard.sendEmbedMessages([scraperBlackBoard.getUpdateEmbed()])
			}
			// other commands...
		});

		this.client.login(config.token);
	}

	getClient() {
		return this.client;
	}

}

export default new YadBot();
