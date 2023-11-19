import Discord from "discord.js"

export default {
    enabled: true,
    getData() {
        return {
            name: 'switch',
            description: "Formats the given text into sWiTcH cAsE.",
            options: [{
                name: 'input',
                type: Discord.ApplicationCommandOptionType.String,
                description: 'The text which you want to be sWiTcHeD.',
                required: true,
            }],
        }
    },
    execute(interaction) {
        let text = interaction.options.get('input').value
        let formattedText = ""
        let uppercase = false
        for (let i = 0; i < text.length; i++) {
            if (uppercase) {
                formattedText += text[i].toUpperCase()
            } else {
                formattedText += text[i].toLowerCase()
            }

            if (text[i] !== " ") {
                uppercase = !uppercase
            }
        }

        interaction.reply({
            embeds: [{
                title: "sWiTcH cAsE",
                description: `hIeR.. bItTeScHöN:\n\`${formattedText}\``
            }],
            ephemeral: true
        })
    }
}
