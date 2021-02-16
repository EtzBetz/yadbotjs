import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'
import jsdom from 'jsdom'

class ScraperLab4Inf extends WebsiteScraper{

    constructor() {
        super()
        this.url = "http://www.lab4inf.fh-muenster.de/Lab4Inf/index.php/Content?subject=hoeh_prog"
        this.scrapingInterval = 1000 * 60 * 7
        this.guildChannelIds = config.scraper_lab_4_inf_guild_channels
        this.userIds = config.scraper_lab_4_inf_dm_users
        this.scrapingFolder = "lab4inf"
    }

    parseWebsiteContentToJSON(response) {
        const page = new jsdom.JSDOM(response.data).window.document
        let elements = []
        let entities = page.querySelectorAll("table > tbody > tr > td")

        entities.forEach((columnElement, columnIndex) => {

            let rows = columnElement.querySelectorAll("ol > li > a")

            rows.forEach((rowElement, rowIndex) => {
                let entry = {
                    category: columnIndex,
                    title: rowElement.textContent.trim(),
                    address: rowElement.href.trim()
                }

                elements.push(entry)
            })
        })
        this.log(`${elements.length} entries found...`)

        return elements
    }

    getScraperFileName(json) {
        let fileName = `${json.title}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let category
        switch (content.category) {
        case 0:
            category = "Skript-"
            break
        case 1:
            category = "Übungs-"
            break
        case 2:
            category = "Praktikums-"
            break
        default:
            category = ""
            break
        }

        let fileType = content.address.split("").reverse().join("")
        let lastDotIndex = fileType.indexOf('.')
        fileType = fileType.substring(0, lastDotIndex).split("").reverse().join("")

        return new Discord.MessageEmbed(
            {
                "description": `Neue ${category}Datei zum Download:\n[${content.title} (.${fileType})](http://www.lab4inf.fh-muenster.de/${content.address})`,
                "author": {
                    "name": "Höhere Programmierkonzepte",
                    "url": this.url,
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg"
                }
            }
        )
    }
}

export default new ScraperLab4Inf()
