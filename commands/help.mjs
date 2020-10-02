import yadBot from './../classes/YadBot'
import Discord from "discord.js"

export default {
    name: 'help',
    description: "Lists all available commands.",
    execute(message, args) {
        let commandList = []

        yadBot.bot.commands.forEach((command) => {
            let commandTitle = `\`!${command.name}\``
            let commandHelpText = `${command.description}`

            if (command.onlyAdmin) {
                commandTitle = `${commandTitle} (Requires admin permissions)`
            }
            if (command.onlyOwner) {
                commandTitle = `${commandTitle} (Requires owner permissions)`
            }

            commandList.push({
                name: `${commandTitle}`,
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
