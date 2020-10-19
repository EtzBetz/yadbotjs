import Discord from "discord.js"

export default {
    name: 'switch',
    enabled: true,
    description: "Formats the given text into sWiTcH cAsE.",
    args: "<text to switch>",
    execute(message, args) {
        let text = args.join(' ')
        let formattedText = ""
        let uppercase = false
        for (let i = 0; i < text.length; i++) {
            if (uppercase) {
                formattedText += text[i].toUpperCase()
            } else {
                formattedText += text[i].toLowerCase()
            }
            uppercase = !uppercase
        }

        message.channel.send(new Discord.MessageEmbed({
            title: "sWiTcH cAsE",
            description: `hIeR.. BiTtEsChÖn:\n\`${formattedText}\``
        }))
    }
}
