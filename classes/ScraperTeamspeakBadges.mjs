import jsdom from 'jsdom'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'

class ScraperTeamspeakBadges extends WebsiteScraper{

    constructor() {
        super()
    }

    getScrapingUrl() {
        return 'https://community.teamspeak.com/t/teamspeak-badge-list/358'
    }

    getScrapingInterval() {
        return 1000 * 60 * 5
    }

    getSubUserIds() {
        return config.scraper_teamspeak_badges_dm_users
    }

    getSubGuildChannelIds() {
        return config.scraper_teamspeak_badges_guild_channels
    }

    parseWebsiteContentToJSON(response) {
        const page = new jsdom.JSDOM(response.data).window.document
        let elements = []
        let entities = page.querySelectorAll("#main-outlet > div:nth-child(2) > div.post > p")
        this.log(`${entities.length} entries found...`)

        entities.forEach((element, index) => {
            const entry = this.parseBadgeInfo(element.textContent.trim())
            // console.log(entry)
            elements.push(entry)
        })

        return elements
    }

    parseBadgeInfo(sourceString) {
        // EXAMPLES:
        // index 1 ->
        //      "PolTeamgeist"
        //      "Alpha Tester"
        //      "Challenge Accepted"
        //      "I’m a Floppy"
        // index 2 ->
        //      "WooOOHoohOOHooo"
        //      "Helped to test our software. THANK YOU!"
        //      "Challenges tournaments and more!"
        //      "This user is a floppy disk."
        // index 3 ->
        //      "TEAMSPOOKY"
        //      "Auto Assign"
        //      "One-time code"
        //      "Non-Assignable"
        // index 3 ->
        //      "31.10.2020"
        //      "unlimited"
        //      "unlimited"
        //      "Never"

        const regexBadges = /Name:\s*(.+)\s*\((.+)\)\nGUID:\s*\S*\nBadge code:\s*(.+)\s*\(Available until:\s*(.+)\S*\)/gmi

        const result = regexBadges.exec(this.filterFakeWhitespace(sourceString))
        return {
            title: result[1]?.trim(),
            note: result[2]?.trim(),
            unlock: result[3]?.trim(),
            expiration: result[4]?.trim(),
        }
    }

    filterFakeWhitespace(sourceString) {
        const regexFakeWhitespace = /(​+)/gmi

        return sourceString.replace(regexFakeWhitespace, '')
    }

    generateFileNameFromJson(json) {
        let fileName = `${json.expiration}-${json.title}-${json.unlock}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(json) {
        this.log(`Generating embed...`)

        return new Discord.MessageEmbed(
            {
                "title": "New Teamspeak Badge available!",
                "description": "A new Badge was listed on the Forums.",
                "url": `${this.getScrapingUrl()}`,
                "author": {
                    "name": "Teamspeak",
                    "url": "https://teamspeak.com",
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_ts.png"
                },
                "fields": [
                    {
                        "name": "Title",
                        "value": json.title
                    },
                    {
                        "name": "Note",
                        "value": json.note
                    },
                    {
                        "name": "Unlockable until",
                        "value": json.expiration
                    },
                    {
                        "name": `${
                            json.unlock.toLowerCase() === "auto assign" ||
                            json.unlock.toLowerCase() === "one-time code" ||
                            json.unlock.toLowerCase() === "non-assignable" ? `Unlock Type` : `Unlock Code`
                        }`,
                        "value": `${
                            json.unlock.toLowerCase() === "auto assign" ||
                            json.unlock.toLowerCase() === "one-time code" ||
                            json.unlock.toLowerCase() === "non-assignable" ? `${json.unlock}` : `\`${json.unlock}\``
                        }`
                    }
                ]
            }
        )
    }
}

export default new ScraperTeamspeakBadges()
