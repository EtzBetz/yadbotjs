import Discord from "discord.js"
import yadBot from '../classes/YadBot.js'

export default {
    name: 'zzz',
    enabled: true,
    description: "Shuts Yad down. zZzZzZz..",
    onlyOwner: true,
    execute(message, args) {
        message.channel.send(new Discord.MessageEmbed({
            title: "Okay, I'm going go sleep now. zZzZzZz.."
        }))
            .then((message) => {
                yadBot.exitHandler()
            })
    }
}
