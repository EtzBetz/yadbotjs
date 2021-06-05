import yadBot from '../classes/YadBot.js'
import config from '../config.json'
import Discord from 'discord.js'
import files from '../classes/Files.js'
import EmbedColors from '../constants/EmbedColors.js';

export default {
    enabled: true,
    onlyAdmin: true,
    getData() {
        return {
            name: 'manage',
            description: "Various commands to manage scrapers.",
            options: [
                {
                    name: "status",
                    description: "Show statuses of all scrapers.",
                    type: 'SUB_COMMAND'
                },
                {
                    name: "toggle",
                    description: "Toggle a specific scraper.",
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: "scraper-name",
                            description: "Scraper to toggle",
                            type: "STRING",
                            choices: yadBot.getScraperChoiceData(),
                            required: true
                        },
                        {
                            name: "status",
                            description: "Status which to toggle to",
                            type: "INTEGER",
                            choices: [
                                {
                                    name: "Off",
                                    value: 0
                                },
                                {
                                    name: "On",
                                    value: 1
                                }
                            ],
                            required: true
                        }
                    ]
                },
                {
                    name: "notify",
                    description: "Notifies all subscribers of the specified scraper that there is a temporary problem.",
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: "scraper-name",
                            description: "Scraper of which the subscribers should be notified",
                            type: "STRING",
                            choices: yadBot.getScraperChoiceData(),
                            required: true
                        }
                    ]
                },
                {
                    name: "send",
                    description: "Sends a specified scraper embed to a specified channel.",
                    type: 'SUB_COMMAND',
                    options: [
                        {
                            name: "scraper-name",
                            description: "Scraper to which the embed belongs to.",
                            type: "STRING",
                            choices: yadBot.getScraperChoiceData(),
                            required: true
                        },
                        {
                            name: "file-name",
                            description: "Filename of the embed to parse and send.",
                            type: "STRING",
                            required: true
                        },
                        {
                            name: "target-channel",
                            description: "Channel which to send the embed to.",
                            type: "CHANNEL",
                            required: true
                        }
                    ]
                }
            ]
        }
    },
    execute(interaction) {
        switch (interaction.options[0].name.toLowerCase()) {
            case 'status':
                let statusDescription = ``

                yadBot.scrapers.forEach((scraper) => {
                    statusDescription += '\n\n'
                    if (scraper.timer !== null) {
                        if (!scraper.timer._destroyed) {
                            statusDescription += '🟩'
                        } else {
                            statusDescription += '🟥'
                        }
                    } else {
                        statusDescription += '🟥'
                    }
                    statusDescription += `  ${scraper.constructor.name}`
                })

                interaction.reply({
                    embeds: [{
                        'title': 'Scraper Statuses',
                        'description': `Here is a list of all scrapers and their statuses:${statusDescription}`,
                    }],
                    ephemeral: true
                })
                break
            case 'toggle':

                const scraper = yadBot.scrapers.find(scraper => scraper.constructor.name.toLowerCase().includes(interaction.options[0].options[0].value.toLowerCase()))
                const turnOnScraper = interaction.options[0].options[1].value === 1

                if (scraper === undefined) {
                    yadBot.sendCommandErrorEmbed(interaction, `The selected scraper could not be found.`)
                    return
                }

                let alreadyInDesiredState = false
                let scraperWasActive = !scraper.timer._destroyed
                if (turnOnScraper && !scraperWasActive) {
                    scraper.createTimerInterval()
                } else if (!turnOnScraper && scraperWasActive) {
                    scraper.destroyTimerInterval()
                } else {
                    alreadyInDesiredState = true
                }

                if (alreadyInDesiredState) {
                    interaction.reply({
                        embeds: [{
                            title: scraperWasActive ? 'Already online' : 'Already offline',
                            description: `${scraper.constructor.name} is already ${scraperWasActive ? 'active' : 'inactive'}.`,
                            color: EmbedColors.ORANGE,
                        }],
                        ephemeral: true
                    })
                } else {
                    interaction.reply({
                        embeds: [{
                            title: scraperWasActive ? `Turned off` : `Turned on`,
                            description: `${scraper.constructor.name} has been toggled ${scraperWasActive ? `inactive` : `active`}.`,
                            color: scraperWasActive ? EmbedColors.RED : EmbedColors.GREEN,
                        }],
                        ephemeral: true
                    })
                }
                break
            case 'notify':
                const targetScraper = yadBot.scrapers.find(scraper => scraper.constructor.name.toLowerCase().includes(interaction.options[0].options[0].value.toLowerCase()))

                if (targetScraper === undefined) {
                    yadBot.sendCommandErrorEmbed(interaction, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
                    return
                }
                targetScraper.sendUnreliableEmbedToSubscribers()

                interaction.reply({
                    embeds: [{
                        title: `Subscribers have been notified`,
                        description: `Subscribers of scraper ${targetScraper.constructor.name} have been notified about it being unreliable currently.`,
                        color: EmbedColors.GREEN,
                    }],
                    ephemeral: true
                })
                break
            case 'send':
                const sendingScraper = yadBot.scrapers.find(scraper => scraper.constructor.name.toLowerCase().includes(interaction.options[0].options[0].value.toLowerCase()))

                if (sendingScraper === undefined) {
                    yadBot.sendCommandErrorEmbed(interaction, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
                    return
                }

                // todo: create method to check file existence, otherwise admins can spam-create empty files
                const jsonData = files.readCompleteJson(`${sendingScraper.getScraperEmbedPath()}/${interaction.options[0].options[1].value}`)
                if (JSON.stringify(jsonData) === JSON.stringify({})) {
                    yadBot.sendCommandErrorEmbed(interaction, `The given file could not be found`)
                    return
                }

                const embed = sendingScraper.filterEmbedLength(sendingScraper.getEmbed(jsonData.data[jsonData.data.length - 1]))

                // todo: add argument 'all', send to all subscribers then
                sendingScraper.log(`Sending embed(s) to ${interaction.options[0].options[2].channel.guild?.name}:${interaction.options[0].options[2].channel.name}`)
                interaction.options[0].options[2].channel.send(embed)
                    .catch(e => {
                        sendingScraper.errorLog(`error with guild ${interaction.options[0].options[2].channel?.guild?.id} channel ${interaction.options[0].options[2].channel?.id}`)
                        yadBot.sendMessageToOwner(`error with guild ${interaction.options[0].options[2].channel?.guild?.id} channel ${interaction.options[0].options[2].channel?.id}`)
                        sendingScraper.sendMissingAccessToGuildAdmins(interaction.options[0].options[2].channel.guild.id)
                        console.dir(e)
                    })

                interaction.reply({
                    embeds: [{
                        title: `Embed has been sent`,
                        description: `The embed has been sent to the specified channel ${interaction.options[0].options[2].channel.toString()}.`,
                        color: EmbedColors.GREEN,
                    }],
                    ephemeral: true
                })

                break
            default:
                yadBot.sendCommandErrorEmbed(interaction, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
        }
    },
}
