import Discord from "discord.js"
import yadBot from '../classes/YadBot'
import EmbedColors from '../constants/EmbedColors';
import files from '../classes/Files.js';

export default async (interaction) => {
    if (interaction.isCommand()) {
        const command = yadBot.getBot().commands.get(interaction.commandName)
        let commandString
        try {
            commandString = yadBot.buildCommandStringFromInteraction(interaction)
        } catch (e) {
            yadBot.sendMessageToOwner(`interaction building failed.`)
        }

        if (!yadBot.isInteractionAuthorOwner(interaction)) {
            let interactionChannel = interaction.channel
            if (interactionChannel === null) {
                interactionChannel = await yadBot.getBot().channels.fetch(interaction.channelId, {
                    cache: true,
                    force: true
                })
            }
            if (interactionChannel.type !== 'DM' && interactionChannel.type !== 'GROUP_DM' && interactionChannel.type !== 'UNKNOWN') {
                yadBot.sendMessageToOwner(`User ${interaction.user.username} (${interaction.user.id}) used slash-command '${commandString}' in channel '${interactionChannel.name}' in guild '${interactionChannel.guild.name}'.`)
            } else {
                yadBot.sendMessageToOwner(`User ${interaction.user.username} (${interaction.user.id}) used slash-command '${commandString}' in DMs.`)
            }
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
            command?.execute(interaction)
        } catch (e) {
            yadBot.sendCommandErrorEmbed(interaction, 'Some unknown error occurred. The admins have been notified.')
            // todo: build full command chain
            yadBot.sendMessageToOwner(`Critical error when user '${interaction.user.username}' (${interaction.user.id}) used command '${interaction.commandName}'.\n\`\`\`text\n${e.stack}\`\`\``)
        }
    } else if (interaction.isMessageComponent()) {
        if (interaction.isButton()) {
            await interaction.deferReply({ephemeral: true})
            let interactionCommand = interaction.customId.split("::")
            console.log(interactionCommand)

            switch (interactionCommand[0]) {
                case "mensafh":
                    let mensaFhScraper = yadBot.scrapers.find(scraper => scraper.constructor.name === "ScraperMensaFHMuenster")
                    let data = files.readJson(`${mensaFhScraper.getScraperEmbedPath()}/${interactionCommand[2]}.json`, 'data', false)
                    if (data === undefined) {
                        await interaction.editReply({
                            embeds: [{
                                title: 'Fehler',
                                description: 'Ein Fehler ist aufgetreten.\nIch kann die angegebenen Daten leider nicht wiederfinden. Das tut mir leid.',
                                color: EmbedColors.RED
                            }], ephemeral: true
                        })
                        break
                    }
                    switch (interactionCommand[1]) {
                        case "side_dishes":
                            let sideDishesString = ""
                            for (const sideDish of data[data.length - 1].side_dishes) {
                                if (sideDishesString !== "") sideDishesString += "\n"
                                sideDishesString += `-${mensaFhScraper.parseMealStringEmoji(sideDish)}`
                                sideDishesString += `${sideDish.title}`
                            }
                            await interaction.editReply({
                                embeds: [{
                                    title: 'Beilagenauswahl',
                                    description: sideDishesString,
                                    color: EmbedColors.GREEN
                                }], ephemeral: true
                            })
                            break
                        case "additives":
                            let additivesString = ""
                            for (const additive of data[data.length - 1].additives.sort()) {
                                if (additivesString !== "") additivesString += "\n"
                                additivesString += additive
                            }
                            await interaction.editReply({
                                embeds: [{
                                    title: 'Zusatzstoffe',
                                    description: additivesString,
                                    color: EmbedColors.GREEN
                                }], ephemeral: true
                            })
                            break
                    }
                    break
                case "xrel":
                    switch (interactionCommand[1]) {
                        case "subscribe":
                            break
                        case "unsubscribe":
                            break
                        default:
                            await interaction.editReply({
                                embeds: [{
                                    title: 'Error while processing interaction',
                                    description: 'Unknown interaction command parameter.',
                                    color: EmbedColors.RED
                                }], ephemeral: true
                            })
                    }
                    break
                default:
                    await interaction.editReply({
                        embeds: [{
                            title: 'Error while processing interaction',
                            description: 'Unknown interaction command.',
                            color: EmbedColors.RED
                        }], ephemeral: true
                    })
            }
        }
    }
}
