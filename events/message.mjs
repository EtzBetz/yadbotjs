import Discord from "discord.js"
import yadBot from './../classes/YadBot'
import { log } from '../index'
import files from '../classes/Files.mjs'

export default (message) => {
    const prefix = files.readJson(yadBot.getYadConfigPath(), 'prefix', false, '!')
    const ownerId = files.readJson(yadBot.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE')
    const botId = files.readJson(yadBot.getYadConfigPath(), 'bot', true, 'ENTER BOT ID HERE')

    if (message.author.bot) return
    if (message.channel.type === "dm" && message.author.id !== ownerId) yadBot.mirrorDirectMessageToOwner(message)

    if (message.mentions.users.get(botId) !== undefined || message.mentions.members?.get(botId) !== undefined) {
        message.channel.send(new Discord.MessageEmbed({ title: `Hey!` })) // TODO: provide array of messages to randomly select from
    }

    if (!message.content.startsWith(prefix)) return

    // TODO: parse parts from " to " as one argument: "Mercury Star Runner"
    const args = message.content.slice(prefix.length).trim().split(/ +/)
    const commandName = args.shift().toLowerCase()

    log(`Requested command ${prefix}${commandName} ("${message.content}") from "${message.author.username}.${message.author.discriminator}" (ID:${message.author.id}).`)

    const command = yadBot.getBot().commands.get(commandName)
    if (command === undefined) {
        log(`Unknown command "${prefix}${commandName}" for "${message.author.username}.${message.author.discriminator}" (ID:${message.author.id}).`)
        yadBot.sendCommandErrorEmbed(message, `Command not found!\nUse \`${prefix}help\` to get a list of available commands`)
        return
    }

    if (!command.enabled && !yadBot.isMessageAuthorOwner(message)) {
        yadBot.sendCommandErrorEmbed(message, `Command is currently disabled. Try again later`)
        return
    }

    // todo: add check if pm and user is part of required guild
    // todo: add required guild's name in the error message
    if (command.onlyServer && message.guild?.id !== command.onlyServer) {
        yadBot.sendCommandErrorEmbed(message, `You can only access this command from a specific server`)
        return
    }

    if (command.onlyAdmin && !yadBot.isMessageAuthorAdmin(message)) {
        yadBot.sendCommandErrorEmbed(message, "You need admin permissions to execute this command")
        return
    } else if (command.onlyAdmin) {
        if (!yadBot.isMessageAuthorOwner(message)) {
            let owner = files.readJson(yadBot.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE')
            yadBot.getBot().users.fetch(owner)
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
