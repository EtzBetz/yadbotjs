import Discord from "discord.js"
import yadBot from './../classes/YadBot'

export default async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = yadBot.getBot().commands.get(interaction.commandName)

    if(!yadBot.isInteractionAuthorOwner(interaction)) {
        let interactionChannel = interaction.channel
        if (interactionChannel === null) {
            interactionChannel = await yadBot.getBot().channels.fetch(interaction.channelID, true, true)
        }
        yadBot.sendMessageToOwner(`User ${interaction.user.username} (${interaction.user.id}) used slash-command '${interaction.commandName}' in channel '${interactionChannel.name}'.`)
    }

    if (command === undefined) {
        yadBot.sendCommandErrorEmbed(interaction, 'Some error seems to have occurred. Looks like this command is registered, but I don\'t know what to respond.')
        return
    }

    if (!command.enabled && !yadBot.isInteractionAuthorOwner(interaction)) {
        yadBot.sendCommandErrorEmbed(interaction, 'Sorry, this command is currently disabled. Try again later.')
        return
    }

    if (command.onlyAdmin && !yadBot.isInteractionAuthorAdmin(interaction)) {
        yadBot.sendCommandErrorEmbed(interaction, 'Sorry, this command is only available to admins of this bot.')
        return
    }

    if (command.onlyOwner && !yadBot.isInteractionAuthorOwner(interaction)) {
        yadBot.sendCommandErrorEmbed(interaction, 'Sorry, this command is only available to the owner of this bot.')
        return
    }

    try {
        await command?.execute(interaction)
    } catch (e) {
        yadBot.sendCommandErrorEmbed(interaction, 'Some unknown error occurred. The admins have been notified.')
        let fullCommand = `${interaction.commandName}`
        interaction.options.forEach(option => {
            fullCommand += ` ${option.value !== undefined ? option.value : option.name}`
        })
        yadBot.sendMessageToOwner(`Critical error when user '${interaction.user.username}' (${interaction.user.id}) used command '${fullCommand}'.\n\`\`\`text\n${e.stack}\`\`\``)
    }
}
