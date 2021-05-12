import Discord from "discord.js"
import yadBot from './../classes/YadBot'
import config from '../config.json'
import EmbedColors from '../constants/EmbedColors.mjs';

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
        switch (interaction.options[0].name.toLowerCase()) {
            case "subscribe":
                let selectedScraper
                for (let i = 0; i < yadBot.scrapers.length; i++) {
                    // console.log(`${yadBot.scrapers[i].constructor.name.toLowerCase()} =?= ${args[1].toLowerCase()}`)
                    if (yadBot.scrapers[i].constructor.name.toLowerCase().includes(interaction.options[0].options[0].value.toLowerCase())) {
                        selectedScraper = yadBot.scrapers[i]
                        break
                    }
                }
                if (selectedScraper === undefined) {
                    yadBot.sendCommandErrorEmbed(interaction, `No scraper has been found for '${interaction.options[0].options[0].value.toLowerCase()}'`)
                    break
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
                break
            case "list":
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
            default:
                yadBot.sendCommandErrorEmbed(interaction, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
        }
    }
}
