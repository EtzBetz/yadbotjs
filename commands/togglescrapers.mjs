import yadBot from './../classes/YadBot'
import Discord from "discord.js"

export default {
    name: 'togglescrapers',
    enabled: true,
    description: "Toggles on or off all scrapers.",
    onlyAdmin: true,
    execute(message, args) {
        const scrapersWereActive = (!yadBot.scrapers[0]?.timer._destroyed)
        const turnOnScrapers = (
            (args[0] === undefined && !scrapersWereActive) ||
            (args[0] === "on" || args[0] === "true" || args[0] === "1")
        )
        const turnOffScrapers = (
            (args[0] === undefined && scrapersWereActive) ||
            (args[0] === "off" || args[0] === "false" || args[0] === "0")
        )

        let alreadyInDesiredState = false
        if (turnOffScrapers) {
            if (scrapersWereActive) {
                yadBot.scrapers.forEach((scraper) => {
                    scraper.destroyTimerInterval()
                })
            } else {
                alreadyInDesiredState = true
            }
        } else if (turnOnScrapers) {
            if (!scrapersWereActive) {
                yadBot.scrapers.forEach((scraper) => {
                    scraper.createTimerInterval()
                })
            } else {
                alreadyInDesiredState = true
            }
        }

        if (alreadyInDesiredState) {
            message.channel.send(
                new Discord.MessageEmbed({
                    title: scrapersWereActive ? "Already online" : "Already offline",
                    description: `Yad's scrapers have already been toggled to ${scrapersWereActive ? 'active' : 'inactive'}.`,
                    color: scrapersWereActive ? 0x4CAF50 : 0xff6f00
                })
            )
        } else {
            message.channel.send(
                new Discord.MessageEmbed({
                    title: scrapersWereActive ? "Scrapers have been turned off" : "Scrapers have been turned on",
                    description: `Yad's scrapers have been toggled to ${scrapersWereActive ? 'inactive' : 'active'}.`,
                    color: scrapersWereActive ? 0xff6f00 : 0x4CAF50
                })
            )
        }
    }
}
