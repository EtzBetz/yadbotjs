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
            let commandTitle = `\`${config.prefix}${command.name}\``
            let commandHelpText = `${command.description}`

            // todo: allow e.g. in ship command non-optional parameters: @add/@remove<ship-name> (without braces)
            // todo: update all parameters where non-optional
            if (command.args) {
                let commandArgs = ""
                let inParameter = false
                for (let i = 0; i < command.args.length; i++) {
                    if (command.args[i] === "(") {
                        commandArgs += " `"
                        inParameter = true
                    } else if (command.args[i] === "<" && !inParameter) {
                        commandArgs += " `"
                    }
                    commandArgs += command.args[i]
                    if (command.args[i] === ">" && !inParameter) {
                        commandArgs += "`"
                    } else if (command.args[i] === ")") {
                        commandArgs += "`"
                        inParameter = false
                    }
                }

                commandTitle = `${commandTitle} ${commandArgs}`
            }

            if (command.onlyServer) {
                commandHelpText = `Requires server membership.\n${commandHelpText}`
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
                "author": {
                    "name": "Yad's Commands",
                    "icon_url": yadBot.bot.user.avatarURL({dynamic: true} )
                },
                "fields": commandList
            })
        )
    }
}
