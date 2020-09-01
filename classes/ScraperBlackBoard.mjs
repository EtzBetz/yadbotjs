import axios from 'axios'
import cheerio from 'cheerio'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import yadBot from './YadBot'
import config from '../config.json'

class ScraperBlackBoard extends WebsiteScraper{

    constructor() {
        super()
        this.url = "https://www.fh-muenster.de/eti/aktuell/aushang/index.php"
        this.scrapingInterval = 1000 * 60 * 30
        this.guildChannelIds = config.scraper_black_board_guild_channels
        this.userIds = config.scraper_black_board_dm_users
        this.scrapingFolder = "blackBoard"
        this.websiteData = {}
    }

    parseWebsiteContentToJSON(response) {
        console.log("Parsing website...")
        const $ = cheerio.load(response.data)

        let blackBoardList = $('#content').children('div.clearfix').children('div');
        console.log(blackBoardList.children().length, "entries found...")
        // console.log(blackBoardList.text().trim())

        let jsonEntries = []
        blackBoardList.children('div').each(function(index, blackBoardEntry) {
            // console.log("-------")
            // console.log(index)
            // console.log($(this).children('h2').text().trim())
            // console.log($(this).children('div').children('div').children('p').children('strong').text().trim())

            let entryParagraphs = []

            $(this).children('div').children('div').children().each(function(index, entryParagraph) {
                let paragraph = $(this).text().trim()
                if (index === 0) {
                    paragraph = paragraph.substring(paragraph.indexOf('|')+2)
                }
                // console.log(paragraph)
                entryParagraphs.push(paragraph)
            })

            let entryLinks = []
            let entryDownloads = []


            $(this).children('div:nth-child(3)').children('ul.verteiler').children('li').each(function(index, link) {
                let linkText = $(this).children('a').children('strong').text().trim()
                let linkAddress = $(this).children('a').attr('href').trim()

                if (linkAddress.substring(0,1) === "/") {
                    linkAddress = "https://www.fh-muenster.de" + linkAddress
                }

                let downloadText = $(this).children('a[onclick]').text().trim()
                let downloadInfo = $(this).children('a[onclick]').children('small').text().trim()
                downloadText = downloadText.substring(0,downloadText.length-downloadInfo.length).trim();

                // console.log(`linktext:    "${linkText}"`)
                // console.log(`linkaddress: "${linkAddress}"`)
                // console.log(`downloadtext:"${downloadText}"`)
                // console.log(`downloadinfo:"${downloadInfo}"`)

                if (downloadInfo.length === 0) {
                    // button is link
                    entryLinks.push({text: linkText, address: linkAddress})
                } else {
                    // button is download
                    entryDownloads.push({text: downloadText, address: linkAddress, info: downloadInfo})
                }
            })

            let entry = {
                title: $(this).children('h2').text().trim(),
                date: $(this).children('div').children('div').children('p').children('strong').text().trim(),
                paragraphs: entryParagraphs,
                links: entryLinks,
                downloads: entryDownloads

            }
            // console.log(entry)
            jsonEntries.push(entry)
        })

        jsonEntries.reverse()

        return jsonEntries
    }

    getScraperFileName(json) {
        let fileName = `${json.date}-${json.title}`
        return fileName + ".json"
    }

    getEmbed(content) {
        let paragraphString = ""

        content.paragraphs.forEach((paragraph, index) => {
            if (index !== 0) paragraphString += '\n'
            paragraphString += paragraph
        })

        let fields = []

        content.links.forEach((link, index) => {
            fields.push({
                name: link.text,
                value: `[Link](${link.address})`
            })
        })
        content.downloads.forEach((download, index) => {
            fields.push({
                name: `${download.text}`,
                value: `[Download ${download.info}](${download.address})`
            })
        })

        console.log("Generating embed...")
        return new Discord.MessageEmbed(
            {
                "title": content.title,
                "description": paragraphString,
                "url": "https://www.fh-muenster.de/eti/aktuell/aushang/index.php",
                "hexColor": "0x000fff",
                "footer": {
                    "text": `Alle Angaben ohne Gewähr!  •  ${content.date}`
                },
                "author": {
                    "name": "Fachhochschule Münster",
                    "url": "https://fh-muenster.de",
                    "icon_url": "https://pbs.twimg.com/profile_images/658944515689029632/kV1Khbmx.jpg"
                },
                "fields": fields
            }
        );
    }
}

export default new ScraperBlackBoard();
