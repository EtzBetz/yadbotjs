import cheerio from 'cheerio'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'

class ScraperLab4Inf extends WebsiteScraper{

    constructor() {
        super()
        this.url = "http://www.lab4inf.fh-muenster.de/Lab4Inf/index.php/Content?subject=hoeh_prog"
        this.scrapingInterval = 1000 * 60 * 32
        this.guildChannelIds = config.scraper_lab_4_inf_guild_channels
        this.userIds = config.scraper_lab_4_inf_dm_users
        this.scrapingFolder = "lab4inf"
        this.websiteData = {}
    }

    parseWebsiteContentToJSON(response) {
        this.log(`Parsing website...`)
        const $ = cheerio.load(response.data)
        let elements = []




        let columnsList = $('table tbody tr:has(td)')
        // this.log(`${columnsList.length} entries found...`)
        // this.debugLog(columnsList.text().trim())


        columnsList.children('td').each(function(index, column) {

            // console.log("-------")
            // console.log(index)
            $(this).children('ol').children('li').children('a').each(function(indexChildren, row) {
                // console.log("-------")
                // console.log(indexChildren)
                let category = index
                let title = $(this).text().trim()
                let address = $(this).attr('href').trim()

                // console.log(`${category}, ${title}, ${address}`)

                let entry = {
                    category,
                    title,
                    address
                }

                elements.push(entry)
            })

            // $(this).children().each(function(indexChildren, row) {
            //     console.log("-------")
            //     console.log(indexChildren)
            //     console.log($(this).children().text().trim())
            // })
        })


        // let scriptsList = $('table>tbody>tr').children('div.clearfix').children('div')
        // let trainingsList = $('#content').children('div.clearfix').children('div')
        // let testsList = $('#content').children('div.clearfix').children('div')



        this.log(`${elements.length} entries found...`)
        return elements
    }

    getScraperFileName(json) {
        let fileName = `${json.title}`
        return this.filterStringForFileName(fileName + ".json")
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let category
        switch (content.category) {
        case 0:
            category = "Skript-"
            break;
        case 1:
            category = "Übungs-"
            break;
        case 2:
            category = "Praktikums-"
            break;
        default:
            category = ""
            break;
        }

        //http://www.lab4inf.fh-muenster.de/lab4inf/docs/HPK/00-HPK-Uebersicht-2020.pdf

        let fileType = content.address.split("").reverse().join("");
        let lastDotIndex = fileType.indexOf('.')
        fileType = fileType.substring(0, lastDotIndex).split("").reverse().join("");

        return new Discord.MessageEmbed(
            {
                "description": `Neue ${category}Datei zum Download:\n[${content.title} (.${fileType})](http://www.lab4inf.fh-muenster.de/${content.address})`,
                "author": {
                    "name": "Höhere Programmierkonzepte",
                    "url": this.url
                }
            }
        )
    }
}

export default new ScraperLab4Inf();
