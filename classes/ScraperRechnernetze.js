import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import jsdom from 'jsdom'

class ScraperRechnernetze extends WebsiteScraper {

    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document
        let elements = []
        let entities = page.querySelectorAll("#content > div.clearfix > div > ul.verteiler > li > a")
        this.log(`Parsing ${entities.length} entries...`)

        entities.forEach((entity, index) => {

            let entryTitle = entity.querySelector('strong').textContent.trim()
            let entryLink = entity.href.trim()

            if (entryLink.substring(0, 1) === "/") {
                entryLink = "https://www.fh-muenster.de" + entryLink
            }

            let entry = {
                title: entryTitle,
                link: entryLink,
            }

            elements.push(entry)
        })

        return elements
    }

    generateFileName(json) {
        let fileName = `${json.title}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    async getEmbed(content) {
        let fileType = content.json.link.split("").reverse().join("")
        let lastDotIndex = fileType.indexOf('.')
        fileType = fileType.substring(0, lastDotIndex).split("").reverse().join("")

        let fileName = content.json.title.split("").reverse().join("")
        let lastDotIndexTitle = fileName.indexOf('.')

        if (lastDotIndexTitle !== -1) {
            fileName = fileName.substring(lastDotIndexTitle + 1)
        }
        fileName = fileName.split("").reverse().join("")

        return new Discord.MessageEmbed(
            {
                "description": `Neue Datei zum Download:\n[${fileName} (.${fileType})](${content.json.link})`,
                "author": {
                    "name": "Rechnernetze",
                    "url": await this.getScrapingUrl(),
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg"
                }
            }
        )
    }
}

export default new ScraperRechnernetze()
