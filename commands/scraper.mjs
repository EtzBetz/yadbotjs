import Discord from "discord.js"
import yadBot from './../classes/YadBot'
import config from '../config.json'

export default {
    name: 'scraper',
    enabled: true,
    args: "<list/subscribe> (@subscribe<scraper-name>)",
    description: "Shows a list of all available scrapers or lets you subscribe to them via PM or server channel.",
    execute(message, args) {

        switch (args[0]?.toLowerCase()) {
        case undefined:
            yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command.\n Use \`${config.prefix}help\` to get more information`)
            break
        case "subscribe":
            let selectedScraper
            for (let i = 0; i < yadBot.scrapers.length; i++) {
                console.log(`${yadBot.scrapers[i].constructor.name.toLowerCase()} =?= ${args[1].toLowerCase()}`)
                if (yadBot.scrapers[i].constructor.name.toLowerCase().includes(args[1].toLowerCase())) {
                    selectedScraper = yadBot.scrapers[i]
                    break
                }
            }
            if (selectedScraper === undefined) {
                yadBot.sendCommandErrorEmbed(message, `No scraper has been found for '${args[1]}'`)
                break
            }
            let result = selectedScraper.subscribe(message)
            if (result.error) {
                yadBot.sendCommandErrorEmbed(message, result.data)
            } else {
                message.channel.send(
                    new Discord.MessageEmbed({
                        "title": "Scraper subscription toggled",
                        "description": result.data,
                        color: 0x4CAF50
                    })
                )
            }
            break
        case "list":
            let statusDescription = "**Here is a list of all currently available scrapers:**\n"
            yadBot.scrapers.forEach((scraper) => {
                statusDescription += `\n- ${scraper.constructor.name}`
            })
            message.channel.send(
                new Discord.MessageEmbed({
                    "title": "Scraper List",
                    "description": statusDescription
                })
            )
            break
        }
    }
}
