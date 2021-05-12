import Discord from "discord.js"

export default {
    enabled: true,
    getData() {
        return {
            name: 'ping',
            description: "I will respond with \"Pong!\"."
        }
    },
    execute(interaction) {
        interaction.reply({
            embeds: [{
                title: "Pong!"
            }],
            ephemeral: true
        })
    }
}
