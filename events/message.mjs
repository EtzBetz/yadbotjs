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
        if (message.channel.type !== 'dm' && message.channel.type !== 'unknown') {
            if (message.reference?.messageID !== undefined) {
                message.fetchReference()
                    .then(referenceMessage => {
                        if (referenceMessage.author.id !== botId) {
                            message.channel.send(new Discord.MessageEmbed({title: `Hey!`})) // TODO: provide array of messages to randomly select from
                        }
                    })
            } else {
                message.channel.send(new Discord.MessageEmbed({title: `Hey!`})) // TODO: provide array of messages to randomly select from
            }
        }
    }

    if (!message.content.startsWith(prefix)) return

    message.reply(new Discord.MessageEmbed({
        title: `I leveled up to slash commands!`,
        description: 'My commands are now available with the `/`-prefix.\nJust start typing `/` and get a list of suggestions from Discord, which will show you all commands you can use. It even has parameter suggestions built in (yay!).\nMost commands used with the old prefix have been ported over already.\n\n**Have fun!**'
    }))

}
