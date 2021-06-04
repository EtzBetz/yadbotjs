import yadBot from '../classes/YadBot.js'
import Discord from "discord.js"

export default {
    name: 'resync',
    enabled: true,
    description: "Refreshes available commands and events.",
    onlyOwner: true,
    execute(message, args) {
        yadBot.bindCommands()
        yadBot.bindEvents()
        message.channel.send(
            new Discord.MessageEmbed({
                title: `Re-bound`,
                description: `Yad's commands and events have been re-bound.`,
                color: 0x4CAF50
            })
        )
    }
}
