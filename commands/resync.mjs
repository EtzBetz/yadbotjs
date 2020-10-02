import yadBot from './../classes/YadBot'
import Discord from "discord.js"

export default {
    name: 'resync',
    description: "Refreshes available commands.",
    adminOnly: true,
    execute(message, args) {
        yadBot.syncCommands()
        message.channel.send(
            new Discord.MessageEmbed({
                title: `Re-synced`,
                description: `Yad's commands have been re-synced.`,
                color: 0x4CAF50
            })
        )
    }
}
