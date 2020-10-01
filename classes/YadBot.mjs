import fs from 'fs';
import Discord from "discord.js"
import config from '../config.json'
import scraperBlackBoard from './ScraperBlackBoard.mjs'
import scraperFreeEpicGames from './ScraperFreeEpicGames'

class YadBot {

	constructor() {
		this.bot = new Discord.Client();

		this.bot.commands = new Discord.Collection()

		this.commandFiles = fs.readdirSync(`./commands/`).filter(file => file.endsWith('.mjs'))
		for (const file of this.commandFiles) {
			import(`./../commands/${file}`)
				.then((command) => {
					this.bot.commands.set(command.name, command)

					console.log("debug3", file)
					console.log("debug4", command)
					command.execute("", "")
				})
		}

		this.bot.once('ready', () => {
			console.log('I\'m online! Setting presence...')
			this.bot.user.setActivity(` Version ${config.version}`, { type: 'PLAYING' });
			console.log(`I see ${this.bot.guilds.cache.size} guilds and ${this.bot.users.cache.size} members:`)
			this.bot.guilds.cache.forEach(guild => {
				console.log(`  - ${guild.name} ( ${guild.id} )`)
			})
			console.log(`---------------------------------------------------------`)
		});

		this.bot.on('message', message => {
			const prefix = config.prefix;

			if (message.author.bot) return
			if (message.channel.type === "dm" && message.author.id !== config.admin) this.mirrorDirectMessageToAdmin(message)
			if (!message.content.startsWith(prefix)) return

			const args = message.content.slice(prefix.length).trim().split(/ +/);
			const commandName = args.shift().toLowerCase();

			if (commandName === 'ping') {
				console.log("debug1:", this.bot.commands.size)
				console.log("debug2:", this.bot.commands.toJSON())
				this.bot.commands.get('ping').execute(message, args)
				// message.channel.send('Pong.');
			} else if (commandName === 'beep') {
				message.channel.send('Boop.');
			} else if (commandName === 'update') {
				scraperBlackBoard.sendEmbedMessages([scraperBlackBoard.getUpdateEmbed()])
			}
			// other commands...
		});

		this.bot.login(config.token);
	}

	getClient() {
		return this.bot;
	}

	mirrorDirectMessageToAdmin(message) {
		this.bot.users.fetch(config.admin)
			.then(admin => {
				if (this.bot.user === null) return
				admin?.send(new Discord.MessageEmbed({
					title: `DM von User`,
					description: `${message}`,
					footer: {
						text: `${message.author.username}.${message.author.discriminator} (ID: ${message.author.id})`,
						icon_url: message.author.avatarURL({dynamic: true} )
					},
					timestamp: message.createdTimestamp,
					color: 0xff6f00
				}))
					.catch(e => console.dir(e))
			})
			.catch(e => console.dir(e))
	}

}

export default new YadBot();
