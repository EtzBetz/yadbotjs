import Discord from "discord.js"

export default {
    name: 'pong',
    enabled: true,
    description: "I will respond with \"Ping!\".",
    execute(message, args) {
        message.channel.send(new Discord.MessageEmbed({
            title: "Ping!"
        }))
    }
}
