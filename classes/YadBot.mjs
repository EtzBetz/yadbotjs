import fs from 'fs';
import Discord from "discord.js"
import config from '../config.json'
import scraperBlackBoard from './ScraperBlackBoard.mjs'
import scraperFreeEpicGames from './ScraperFreeEpicGames'

class YadBot {

	constructor() {
		this.bot = new Discord.Client();

		this.scrapers = [
			scraperBlackBoard,
			scraperFreeEpicGames
		]

		this.bot.commands = new Discord.Collection()
		this.commandFiles = fs.readdirSync(`./commands/`).filter(file => file.endsWith('.mjs'))

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
			if (message.channel.type === "dm" && message.author.id !== config.owner) this.mirrorDirectMessageToAdmin(message)
			if (!message.content.startsWith(prefix)) return

			const args = message.content.slice(prefix.length).trim().split(/ +/);
			const commandName = args.shift().toLowerCase();

			const command = this.bot.commands.get(commandName)
			if (command === undefined) {
				console.log(`Unknown command "${config.prefix}${commandName}" for "${message.author.username}.${message.author.discriminator}" (ID:${message.author.id}).`)
				this.sendCommandErrorEmbed(message, `Command not found!\nUse \`${config.prefix}help\` to get a list of available commands`)
				return
			}

			if (command.onlyAdmin && !this.isMessageAuthorAdmin(message)) {
				this.sendCommandErrorEmbed(message, "You need admin permissions to execute this command")
				return
			} else if (command.onlyAdmin) {
				this.bot.users.fetch(config.owner)
					.then(owner => {
						if (this.bot.user !== null) {
							owner?.send(new Discord.MessageEmbed({
								title: `Admin action executed`,
								description: `"${message.author.username}" executed command \`!${commandName}\`.`,
								footer: {
									text: `${message.author.username}.${message.author.discriminator} (ID: ${message.author.id})`,
									icon_url: message.author.avatarURL({ dynamic: true }),
								},
								timestamp: message.createdTimestamp,
								color: 0xFFEB3B,
							}))
								.catch(e => console.dir(e))
						}
					})
					.catch(e => console.dir(e))
			}

			if (command.onlyOwner && !this.isMessageAuthorOwner(message)) {
				this.sendCommandErrorEmbed(message, "You need to be the owner of this bot to execute this command")
				return
			}

			console.log(`Executing command "${config.prefix}${command.name}" for "${message.author.username}.${message.author.discriminator}" (ID:${message.author.id}).`)
			command?.execute(message, args)
		});

		this.bot.login(config.token);
	}

	syncCommands() {
		this.commandFiles = fs.readdirSync(`./commands/`).filter(file => file.endsWith('.mjs'))
		for (const file of this.commandFiles) {
			import(`./../commands/${file}`)
				.then((command) => {
					this.bot.commands.set(command.default.name, command.default)
				})
				.catch(e => console.dir(e))
		}
	}

	isUserIdAdmin(userId) {
		return (config.admins.includes(userId))
	}

	isUserAdmin(user) {
		return this.isUserIdAdmin(user.id)
	}

	isMessageAuthorAdmin(message) {
		return this.isUserIdAdmin(message.author.id)
	}

	isUserIdOwner(userId) {
		return (userId === config.owner)
	}

	isUserOwner(user) {
		return this.isUserIdOwner(user.id)
	}

	isMessageAuthorOwner(message) {
		return this.isUserIdOwner(message.author.id)
	}

	getBot() {
		return this.bot;
	}

	sendCommandErrorEmbed(originMessage, errorMessage) {
		if (!errorMessage.endsWith(".") || !errorMessage.endsWith("!")) {
			errorMessage += "."
		}
		originMessage.channel.send(new Discord.MessageEmbed({
			title: `Error while executing command!`,
			description: `${errorMessage}`,
			color: 0xff6f00
		}))
	}

	mirrorDirectMessageToAdmin(message) {
		this.bot.users.fetch(config.owner)
			.then(owner => {
				if (this.bot.user === null) return
				owner?.send(new Discord.MessageEmbed({
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
