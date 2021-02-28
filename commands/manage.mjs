import yadBot from './../classes/YadBot'
import config from '../config.json'
import Discord from "discord.js"

export default {
    name: 'manage',
    enabled: true,
    args: "<status/toggle> (@toggle<scraper-name>) (@toggle<on/off>)",
    description: "Shows the status of all scrapers or toggles their state individually.",
    onlyAdmin: true,
    execute(message, args) {

        switch (args[0]) {
        case undefined:
            yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command.\n Use ${config.prefix}help to get more information`)
            break
        case "status":
            let statusDescription = ``

            yadBot.scrapers.forEach((scraper) => {
                statusDescription += "\n\n"
                if (scraper.timer._destroyed) {
                    statusDescription += "🟥"
                } else {
                    statusDescription += "🟩"
                }
                statusDescription += `  ${scraper.constructor.name}`
            })

            message.channel.send(
                new Discord.MessageEmbed({
                    "title": "Scraper Statuses",
                    "description": `Here is a list of all scrapers and their statuses:${statusDescription}`
                })
            )
            break
        case "toggle":
            const scraper = yadBot.scrapers.find(scraper => scraper.constructor.name.toLowerCase().includes(args[1].toLowerCase()))

            const turnOnScrapers = args[2] !== undefined && args[2] === "on" || args[2] === "true" || args[2] === "1"
            const turnOffScrapers = args[2] !== undefined && args[2] === "off" || args[2] === "false" || args[2] === "0"

            if (!turnOnScrapers && !turnOffScrapers || scraper === undefined) {
                yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
                return
            }

            let alreadyInDesiredState = false
            let scraperWasActive = !scraper.timer._destroyed
            if (turnOffScrapers) {
                if (scraperWasActive) {
                    scraper.destroyTimerInterval()
                } else {
                    alreadyInDesiredState = true
                }
            } else if (turnOnScrapers) {
                if (!scraperWasActive) {
                    scraper.createTimerInterval()
                } else {
                    alreadyInDesiredState = true
                }
            }

            if (alreadyInDesiredState) {
                message.channel.send(
                    new Discord.MessageEmbed({
                        title: scraperWasActive ? "Already online" : "Already offline",
                        description: `${scraper.constructor.name} is already ${scraperWasActive ? 'active' : 'inactive'}.`,
                        color: 0xF44336
                    })
                )
            } else {
                message.channel.send(
                    new Discord.MessageEmbed({
                        title: scraperWasActive ? `Turned off` : `Turned on`,
                        description: `${scraper.constructor.name} has been toggled ${scraperWasActive ? `inactive` : `active`}.`,
                        color: scraperWasActive ? 0xff6f00 : 0x4CAF50
                    })
                )
            }
            break
        }
    }
}
