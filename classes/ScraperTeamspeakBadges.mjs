import jsdom from 'jsdom'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'

class ScraperTeamspeakBadges extends WebsiteScraper{

    constructor() {
        super()
        this.url = "https://community.teamspeak.com/t/teamspeak-badge-list/358"
        this.scrapingInterval = 1000 * 60 * 35
        this.guildChannelIds = config.scraper_teamspeak_badges_guild_channels
        this.userIds = config.scraper_teamspeak_badges_dm_users
        this.scrapingFolder = "tsbadges"
        this.websiteData = {}
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

    getScraperFileName(json) {
        let fileName = `${json.expiration}-${json.title}-${json.unlock}`
        return this.filterStringForFileName(fileName + ".json")
    }

    getEmbed(json) {
        this.log(`Generating embed...`)

        return new Discord.MessageEmbed(
            {
                "title": "New Teamspeak Badge available!",
                "description": "A new Badge was listed on the Forums.",
                "url": `${this.url}`,
                "author": {
                    "name": "Teamspeak",
                    "url": "https://teamspeak.com",
                    "icon_url": "https://pbs.twimg.com/profile_images/1334574607161040896/gdIpgvnG_200x200.jpg"
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
                        "name": "Expires on",
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
