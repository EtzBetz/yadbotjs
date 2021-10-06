import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import jsdom from 'jsdom'

class ScraperLab4Inf extends WebsiteScraper {

    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document
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
        this.log(`Parsed ${elements.length} entries...`)

        return elements
    }

    generateFileName(json) {
        let fileName = `${json.title}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    async getEmbed(content) {
        let category
        switch (content.json.category) {
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

        let fileType = content.json.address.split("").reverse().join("")
        let lastDotIndex = fileType.indexOf('.')
        fileType = fileType.substring(0, lastDotIndex).split("").reverse().join("")

        return new Discord.MessageEmbed(
            {
                "description": `Neue ${category}Datei zum Download:\n[${content.json.title} (.${fileType})](http://www.lab4inf.fh-muenster.de/${content.json.address})`,
                "author": {
                    "name": "Höhere Programmierkonzepte",
                    "url": await this.getScrapingUrl(),
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg"
                }
            }
        )
    }
}

export default new ScraperLab4Inf()
