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
        this.scrapingInterval = 1000 * 60 * 31
        this.guildChannelIds = config.scraper_black_board_guild_channels
        this.userIds = config.scraper_black_board_dm_users
        this.scrapingFolder = "blackBoard"
        this.websiteData = {}
    }

    parseWebsiteContentToJSON(response) {
        this.log(`Parsing website...`)
        const $ = cheerio.load(response.data)

        let blackBoardList = $('#content').children('div.clearfix').children('div');

        this.log(`${blackBoardList.children().length} entries found...`)
        // this.log(blackBoardList.text().trim())

        let jsonEntries = []
        blackBoardList.children('div').each(function(index, blackBoardEntry) {
            // this.log("-------")
            // this.log(index)
            // this.log($(this).children('h2').text().trim())
            // this.log($(this).children('div').children('div').children('p').children('strong').text().trim())

            let entryParagraphs = []

            $(this).children('div').children('div').children().each(function(index, entryParagraph) {
                let paragraph = $(this).text().trim()
                if (index === 0) {
                    paragraph = paragraph.substring(paragraph.indexOf('|')+1).trim()
                }
                // this.log(paragraph)
                entryParagraphs.push(paragraph)
            })

            let entryLinks = [], entryDownloads = []

            $(this).children('div:nth-child(3)').children('ul.verteiler').children('li').each(function(index, link) {
                let linkText = $(this).children('a').children('strong').text().trim()
                let linkAddress = $(this).children('a').attr('href').trim()

                if (linkAddress.substring(0,1) === "/") {
                    linkAddress = "https://www.fh-muenster.de" + linkAddress
                }

                let downloadText = $(this).children('a[onclick]').text().trim()
                let downloadInfo = $(this).children('a[onclick]').children('small').text().trim()
                downloadText = downloadText.substring(0, downloadText.length-downloadInfo.length).trim();

                // this.log(`linktext:    "${linkText}"`)
                // this.log(`linkaddress: "${linkAddress}"`)
                // this.log(`downloadtext:"${downloadText}"`)
                // this.log(`downloadinfo:"${downloadInfo}"`)

                if (downloadInfo.length === 0) {
                    // button is link
                    entryLinks.push({text: linkText, address: linkAddress})
                } else {
                    // button is download
                    entryDownloads.push({text: downloadText, address: linkAddress, info: downloadInfo})
                }
            })

            let entryDate;
            let entryDateElement = $(this).children('div').children('div').children('p').children('strong')

            // check if the <strong> element exists
            if (entryDateElement.length === 1) {
                entryDate = entryDateElement.text().trim()
            } else { // otherwise go back to it's parent
                entryDateElement = entryDateElement.prevObject
                let firstParagraph = entryDateElement.first().text().trim()
                entryDate = firstParagraph.substring(0, firstParagraph.indexOf('|')-1)
            }

            let entryDateDayOfMonth, entryDateMonth, entryDateYear
            if (entryDate !== undefined && entryDate !== "") {
                let firstSeparatorIndex = entryDate.indexOf('.')
                let secondSeparatorIndex = entryDate.indexOf('.', firstSeparatorIndex + 1)
                entryDateDayOfMonth = entryDate.substring(0, firstSeparatorIndex).padStart(2, '0')
                entryDateMonth = entryDate.substring(firstSeparatorIndex + 1, secondSeparatorIndex).padStart(2, '0')
                entryDateYear = entryDate.substring(secondSeparatorIndex + 1)
            }


            let entry = {
                title: $(this).children('h2').text().trim(),
                date: {
                    day: entryDateDayOfMonth,
                    month: entryDateMonth,
                    year: entryDateYear
                },
                paragraphs: entryParagraphs,
                links: entryLinks,
                downloads: entryDownloads

            }
            // this.log(entry)
            jsonEntries.push(entry)
        })

        jsonEntries.reverse()

        return jsonEntries
    }

    getScraperFileName(json) {
        let fileName = `${json.date.year}.${json.date.month}.${json.date.day}-${json.title}`
        return this.filterStringForFileName(fileName + ".json")
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

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

        let footerString = `Alle Angaben ohne Gewähr!  •  `

        if (content.date !== undefined) {
            footerString += `${content.date.day}.${content.date.month}.${content.date.year}`
        } else {
            let today = new Date();
            let dd = String(today.getDate()).padStart(2, '0');
            let mm = String(today.getMonth() + 1).padStart(2, '0'); // january is 0, so + 1!
            let yyyy = today.getFullYear();

            footerString += dd + '.' + mm + '.' + yyyy;
        }

        return new Discord.MessageEmbed(
            {
                "title": content.title || "Neuer Aushang",
                "description": paragraphString,
                "url": "https://www.fh-muenster.de/eti/aktuell/aushang/index.php",
                // "color": 0x000fff,
                "footer": {
                    "text": footerString
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

    sortEmbeds(embedA, embedB) {
        // TODO: finish sorting
        return 0
    }
}

export default new ScraperBlackBoard();
