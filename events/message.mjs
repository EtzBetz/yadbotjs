import config from '../config.json'
import Discord from "discord.js"
import yadBot from './../classes/YadBot'
import { log } from '../index'

export default (message) => {
    const prefix = config.prefix

    if (message.author.bot) return
    if (message.channel.type === "dm" && message.author.id !== config.owner) yadBot.mirrorDirectMessageToAdmin(message)

    if (message.mentions.users.get(config.bot) !== undefined || message.mentions.members?.get(config.bot) !== undefined) {
        message.channel.send(new Discord.MessageEmbed({ title: `Hey!` })) // TODO: provide array of messages to randomly select from
    }

    if (!message.content.startsWith(prefix)) return

    const args = message.content.slice(prefix.length).trim().split(/ +/)
    const commandName = args.shift().toLowerCase()

    log(`Requested command ${config.prefix}${commandName} ("${message.content}") from "${message.author.username}.${message.author.discriminator}" (ID:${message.author.id}).`)

    const command = yadBot.getBot().commands.get(commandName)
    if (command === undefined) {
        log(`Unknown command "${config.prefix}${commandName}" for "${message.author.username}.${message.author.discriminator}" (ID:${message.author.id}).`)
        yadBot.sendCommandErrorEmbed(message, `Command not found!\nUse \`${config.prefix}help\` to get a list of available commands`)
        return
    }

    if (!command.enabled && !yadBot.isMessageAuthorOwner(message)) {
        yadBot.sendCommandErrorEmbed(message, `Command is currently disabled. Try again later`)
        return
    }

    if (command.onlyAdmin && !yadBot.isMessageAuthorAdmin(message)) {
        yadBot.sendCommandErrorEmbed(message, "You need admin permissions to execute this command")
        return
    } else if (command.onlyAdmin) {
        if (!yadBot.isMessageAuthorOwner(message)) {
            yadBot.getBot().users.fetch(config.owner)
                .then(owner => {
                    if (yadBot.getBot().user !== null) {
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
    }

    if (command.onlyOwner && !yadBot.isMessageAuthorOwner(message)) {
        yadBot.sendCommandErrorEmbed(message, "You need to be the owner of this bot to execute this command")
        return
    }
    command?.execute(message, args)
}
