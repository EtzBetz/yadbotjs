import yadBot from './../classes/YadBot'
import Discord from "discord.js"

export default {
    name: 'togglescrapers',
    description: "Toggles on or off all scrapers.",
    onlyAdmin: true,
    execute(message, args) {
        const scrapersWereActive = (!yadBot.scrapers[0]?.timer._destroyed)
        if (scrapersWereActive) {
            yadBot.scrapers.forEach((scraper) => {
                scraper.destroyTimerInterval()
            })
        } else {
            yadBot.scrapers.forEach((scraper) => {
                scraper.createTimerInterval()
            })
        }

        message.channel.send(
            new Discord.MessageEmbed({
                title: scrapersWereActive ? "Scrapers have been turned off" : "Scrapers have been turned on",
                description: `Yad's scrapers have been toggled to ${scrapersWereActive ? 'inactive' : 'active'}.`,
                color: scrapersWereActive ? 0xff6f00 : 0x4CAF50
            })
        )
    }
}
