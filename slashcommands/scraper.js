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
    execute(interaction) {
        if (interaction.options.get('subscribe') !== undefined) {
            let selectedScraper
            for (let i = 0; i < yadBot.scrapers.length; i++) {
                // console.log(`${yadBot.scrapers[i].constructor.name.toLowerCase()} =?= ${args[1].toLowerCase()}`)
                if (yadBot.scrapers[i].constructor.name.toLowerCase().includes(interaction.options.get('subscribe').options.get('scraper-name').value.toLowerCase())) {
                    selectedScraper = yadBot.scrapers[i]
                    break
                }
            }
            if (selectedScraper === undefined) {
                yadBot.sendCommandErrorEmbed(interaction, `No scraper has been found for '${interaction.options.get('subscribe').options.get('scraper-name').value.toLowerCase()}'`)
                return
            }
            let result = selectedScraper.subscribe(interaction)
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
        } else if (interaction.options.get('list') !== undefined) {
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
        } else {
            yadBot.sendCommandErrorEmbed(interaction, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
        }
    }
}
