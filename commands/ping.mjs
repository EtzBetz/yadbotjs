import Discord from "discord.js"

export default {
    name: 'ping',
    enabled: true,
    description: "I will respond with \"Pong!\".",
    execute(message, args) {
        message.channel.send(new Discord.MessageEmbed({
            title: "Pong!"
        }))
    }
}
