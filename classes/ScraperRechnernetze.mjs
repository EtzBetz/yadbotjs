import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'
import jsdom from 'jsdom'

class ScraperRechnernetze extends WebsiteScraper{

    constructor() {
        super()
    }

    getScrapingUrl() {
        return 'https://www.fh-muenster.de/eti/labore_forschung/nw/rn.php'
    }

    getScrapingInterval() {
        return 1000 * 60 * 8
    }

    parseWebsiteContentToJSON(response) {
        const page = new jsdom.JSDOM(response.data).window.document
        let elements = []
        let entities = page.querySelectorAll("#content > div.clearfix > div > ul.verteiler > li > a")
        this.log(`${entities.length} entries found...`)

        entities.forEach((entity, index) => {

            let entryTitle = entity.querySelector('strong').textContent.trim()
            let entryLink = entity.href.trim()

            if (entryLink.substring(0,1) === "/") {
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

    generateFileNameFromJson(json) {
        let fileName = `${json.title}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let fileType = content.link.split("").reverse().join("")
        let lastDotIndex = fileType.indexOf('.')
        fileType = fileType.substring(0, lastDotIndex).split("").reverse().join("")

        let fileName = content.title.split("").reverse().join("")
        let lastDotIndexTitle = fileName.indexOf('.')

        if (lastDotIndexTitle !== -1) {
            fileName = fileName.substring(lastDotIndexTitle + 1)
        }
        fileName = fileName.split("").reverse().join("")

        return new Discord.MessageEmbed(
            {
                "description": `Neue Datei zum Download:\n[${fileName} (.${fileType})](${content.link})`,
                "author": {
                    "name": "Rechnernetze",
                    "url": this.getScrapingUrl(),
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg"
                }
            }
        )
    }
}

export default new ScraperRechnernetze()
