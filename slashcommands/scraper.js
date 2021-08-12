import Discord from "discord.js"
import yadBot from '../classes/YadBot.js'
import config from '../config.json'
import EmbedColors from '../constants/EmbedColors.js';

export default {
    enabled: true,
    onlyAdmin: false,
    getData() {
        return {
            name: 'scraper',
            description: "Shows a list of all available scrapers or lets you subscribe to them via PM or server channel.",
            options: [
                {
                    name: "subscribe",
                    description: "Toggle subscription to a specific scraper for this channel.",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "scraper-name",
                        description: "Scraper to subscribe this channel to.",
                        type: "STRING",
                        required: true,
                        choices: yadBot.getScraperChoiceData()
                    }]
                },
                {
                    name: "list",
                    description: "Show a list of all available scrapers.",
                    type: 'SUB_COMMAND'
                }
            ]
        }
    },
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'subscribe':
                let selectedScraper
                for (let i = 0; i < yadBot.scrapers.length; i++) {
                    if (yadBot.scrapers[i].constructor.name.toLowerCase().includes(interaction.options.getString('scraper-name').toLowerCase())) {
                        selectedScraper = yadBot.scrapers[i]
                        break
                    }
                }
                if (selectedScraper === undefined) {
                    yadBot.sendCommandErrorEmbed(interaction, `No scraper has been found for '${interaction.options.getString('scraper-name').toLowerCase()}'`)
                    return
                }
                let result = await selectedScraper.subscribe(interaction)
                if (result.error) {
                    yadBot.sendCommandErrorEmbed(interaction, result.data)
                } else {
                    interaction.reply({
                        embeds: [{
                            title: "Scraper subscription toggled",
                            description: result.data,
                            color: EmbedColors.GREEN
                        }],
                        ephemeral: false
                    })
                }
                break
            case 'list':
                let statusDescription = "**Here is a list of all currently available scrapers:**\n"
                yadBot.scrapers.forEach((scraper) => {
                    statusDescription += `\n- ${scraper.constructor.name}`
                })

                interaction.reply({
                    embeds: [{
                        title: "Scraper List",
                        description: statusDescription
                    }],
                    ephemeral: true
                })
                break
        }
    }
}
