import fs from 'fs'
import Discord from "discord.js"
import config from '../config.json'
import scraperBlackBoard from './ScraperBlackBoard.mjs'
import scraperFreeEpicGames from './ScraperFreeEpicGames'
import scraperLab4Inf from './ScraperLab4Inf'
import scraperRechnernetze from './ScraperRechnernetze.mjs'
import scraperGuildWars2News from './ScraperGuildWars2News.mjs'
import scraperTeamspeakBadges from './ScraperTeamspeakBadges.mjs'
import { log, debugLog } from '../index'

class YadBot {

	constructor() {
		this.bot = new Discord.Client()

		this.scrapers = [
			scraperBlackBoard,
			scraperFreeEpicGames,
			scraperLab4Inf,
			scraperRechnernetze,
			scraperGuildWars2News,
			scraperTeamspeakBadges
		]

		this.bot.commands = new Discord.Collection()
		this.commandFiles = fs.readdirSync(`./commands/`).filter(file => file.endsWith('.mjs'))
		this.eventFiles = fs.readdirSync(`./events/`).filter(file => file.endsWith('.mjs'))

		this.bot.once('ready', () => {
			log(`---------------------------------------------------------`)
			log('I\'m online! Setting presence...')
			this.bot.user.setActivity(` Version ${config.version}`, { type: 'PLAYING' })
			log(`I see ${this.bot.guilds.cache.size} guilds and ${this.bot.users.cache.size} users:`)
			this.bot.guilds.cache.forEach(guild => {
				log(` - ${guild.name}\t( ${guild.id} )`)
			})
			log(`---------------------------------------------------------`)
		})

		this.getBot().login(config.token)
		this.exitBindings()
	}

	exitBindings() {
		// Even if the process gets an call to exit, continues until the exitHandler function is finished
		process.stdin.resume()

		process.on('exit', this.exitHandler.bind(this))
		process.on('SIGINT', this.exitHandler.bind(this, {exit:true}))
		process.on('SIGUSR1', this.exitHandler.bind(this, {exit:true}))
		process.on('SIGUSR2', this.exitHandler.bind(this, {exit:true}))
		process.on('uncaughtException', this.exitHandler.bind(this, {exit:true}))
	}

	exitHandler(options, exitCode) {
		// destroy the Discord connection of the bot
		this.getBot()?.destroy()

		// exit the node process
		process.exit(0)
	}

	bindCommands() {
		this.commandFiles = fs.readdirSync(`./commands/`).filter(file => file.endsWith('.mjs'))
		this.bot.commands.clear()
		for (const file of this.commandFiles) {
			import(`./../commands/${file}`)
				.then((command) => {
					this.bot.commands.set(command.default.name, command.default)
				})
				.catch(e => console.dir(e))
		}
	}

	bindEvents() {
		this.unbindEvents()
		this.eventFiles = fs.readdirSync(`./events/`).filter(file => file.endsWith('.mjs'))
		for (const file of this.eventFiles) {
			import(`./../events/${file}`)
				.then((event) => {
					let eventName = file.split(".")[0]
					this.bot.on(eventName, event.default.bind(this.bot))
				})
		}
	}

	unbindEvents() {
		for (const file of this.eventFiles) {
			let eventName = file.split(".")[0]
			this.bot.listeners(eventName).forEach((oldEvent) => {
				this.bot.off(eventName, oldEvent)
			})
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
		return this.bot
	}

	getUserSnowflakeFromMentionString(mentionString) {
		const snowflakeRegex = /<@!(\d+)>/g
		let idResult = snowflakeRegex.exec(mentionString)

		if (idResult !== null) return idResult[1]
		return false
	}

	sendCommandErrorEmbed(originMessage, errorMessage) {
		if (!errorMessage.endsWith(".") && !errorMessage.endsWith("!")) {
			errorMessage += "."
		}
		originMessage.channel.send(new Discord.MessageEmbed({
			title: `Error while executing command`,
			description: `${errorMessage}`,
			color: 0xF44336
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

export default new YadBot()
