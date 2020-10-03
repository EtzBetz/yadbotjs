import yadBot from './../classes/YadBot'
import Discord from "discord.js"
import config from '../config.json'

export default {
    name: 'help',
    enabled: true,
    description: "Lists all available commands.",
    execute(message, args) {
        let commandList = []

        yadBot.bot.commands.forEach((command) => {
            let commandTitle = `${config.prefix}${command.name}`
            let commandHelpText = `${command.description}`

            if (command.args) {
                commandTitle = `${commandTitle} ${command.args}`
            }

            if (command.onlyAdmin) {
                commandHelpText = `Requires admin permissions.\n${commandHelpText}`
            }
            if (command.onlyOwner) {
                commandHelpText = `Requires owner permissions.\n${commandHelpText}`
            }
            if (!command.enabled) {
                commandHelpText = `DISABLED.\n${commandHelpText}`
            }

            commandList.push({
                name: `\`${commandTitle}\``,
                value: `${commandHelpText}`,
                commandInternal: command.name
            })
        })

        commandList.sort((commandA, commandB) => {
            if (commandA.commandInternal < commandB.commandInternal) {
                return -1
            } else {
                return 1
            }
        })

        message.channel.send(
            new Discord.MessageEmbed({
                "description": "Here is a list of commands that Yad is currently supporting:",
                "thumbnail": {
                    "url": yadBot.bot.user.avatarURL({dynamic: true} )
                },
                "author": {
                    "name": "Yad's Commands"
                },
                "fields": commandList
            })
        )
    }
}
