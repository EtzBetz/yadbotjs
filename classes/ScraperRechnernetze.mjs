import axios from 'axios'
import cheerio from 'cheerio'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import yadBot from './YadBot'
import config from '../config.json'

class ScraperRechnernetze extends WebsiteScraper{

    constructor() {
        super()
        this.url = "https://www.fh-muenster.de/eti/labore_forschung/nw/rn.php"
        this.scrapingInterval = 1000 * 60 * 33
        this.guildChannelIds = config.scraper_rechnernetze_guild_channels
        this.userIds = config.scraper_rechnernetze_dm_users
        this.scrapingFolder = "rechnernetze"
        this.websiteData = {}
    }

    parseWebsiteContentToJSON(response) {
        this.log(`Parsing website...`)
        const $ = cheerio.load(response.data)

        let parentList = $("h2:contains('Praktikum')").siblings('div:has("ul.verteiler")').children('ul.verteiler')

        this.log(`${parentList.children().length} entries found...`)
        // this.log(parentList.text().trim())

        let jsonEntries = []
        parentList.children().each(function(index, blackBoardEntry) {

            // console.log("-------")
            // console.log(index, ":")
            // console.log($(this).text().trim())
            // console.log($(this).children('a').attr('href').trim())

            let entryTitle = $(this).children('a').children('strong').text().trim()
            let entryLink = $(this).children('a').attr('href').trim()
            if (entryLink.substring(0,1) === "/") {
                entryLink = "https://www.fh-muenster.de" + entryLink
            }
            let entry = {
                title: entryTitle,
                link: entryLink,
            }
            // console.log(entry)
            jsonEntries.push(entry)
        })

        return jsonEntries
    }

    getScraperFileName(json) {
        let fileName = `${json.title}`
        return this.filterStringForFileName(fileName + ".json")
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let fileType = content.link.split("").reverse().join("");
        let lastDotIndex = fileType.indexOf('.')
        fileType = fileType.substring(0, lastDotIndex).split("").reverse().join("");

        let fileName = content.title.split("").reverse().join("");
        let lastDotIndexTitle = fileName.indexOf('.')
        // console.log(`index: "${lastDotIndexTitle}"`);
        if (lastDotIndexTitle !== -1) {
            fileName = fileName.substring(lastDotIndexTitle + 1)
        }
        fileName = fileName.split("").reverse().join("");
        // console.log(`fileName: "${fileName}"`);

        return new Discord.MessageEmbed(
            {
                "description": `Neue Datei zum Download:\n[${fileName} (.${fileType})](${content.link})`,
                "author": {
                    "name": "Rechnernetze",
                    "url": this.url
                }
            }
        )
    }

    sortEmbeds(embedA, embedB) {
        // TODO: finish sorting
        return 0
    }
}

export default new ScraperRechnernetze();
