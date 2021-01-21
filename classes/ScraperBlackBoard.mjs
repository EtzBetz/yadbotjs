import jsdom from 'jsdom'
import luxon from 'luxon'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'

class ScraperBlackBoard extends WebsiteScraper{

    constructor() {
        super()
        this.url = "https://www.fh-muenster.de/eti/aktuell/aushang/index.php"
        this.scrapingInterval = 1000 * 60 * 6
        this.guildChannelIds = config.scraper_black_board_guild_channels
        this.userIds = config.scraper_black_board_dm_users
        this.scrapingFolder = "blackBoard"
        this.websiteData = {}
    }

    parseWebsiteContentToJSON(response) {
        const page = new jsdom.JSDOM(response.data).window.document
        let elements = []
        let entities = page.querySelectorAll("div.clearfix > div[style] > div[style]")
        this.log(`${entities.length} entries found...`)

        entities.forEach((entity, index) => {
            if (entity.textContent.trim() !== "") {
                let entryParagraphs = []

                entity.querySelectorAll("div > div > div > div > div > p, div > div > div > div > div > ul").forEach((entityParagraph, paragraphIndex) => {
                    let paragraph
                    switch(entityParagraph.tagName.toLowerCase()) {
                    case "p":
                        paragraph = entityParagraph.textContent.trim()
                        if (paragraphIndex === 0) {
                            paragraph = paragraph.substring(paragraph.indexOf('|') + 1).trim()
                        }
                        break;
                    case "ul":
                        paragraph = ""
                        entityParagraph.querySelectorAll('li').forEach((listParagraph, listIndex) => {
                            paragraph += `\n• ${listParagraph.textContent.trim()}\n`
                        })
                        break;
                    default:
                        console.log("NEW PARAGRAPH ELEMENT NOT IMPLEMENTED!")
                        console.log(entityParagraph.tagName.toLowerCase())
                        console.log("NEW PARAGRAPH ELEMENT NOT IMPLEMENTED!")
                    }
                    entityParagraph.querySelectorAll('a.SP-encrypted-email').forEach((mailAddressElement, addressIndex) => {
                        let mailLink = mailAddressElement.href?.trim()
                        mailLink = mailLink.replace(/%E2%9A%B9/g,"@")
                        mailLink = mailLink.replace(/%E2%97%A6/g,".")
                        mailLink = mailLink.replace(/mailto:/g,"")

                        paragraph = paragraph.replace(mailAddressElement.textContent.trim(), mailLink)
                    })
                    entryParagraphs.push(paragraph)
                })

                let entryLinks = [], entryDownloads = []

                entity.querySelectorAll("div:nth-child(3) > ul.verteiler > li").forEach((linkContainer, linkIndex) => {
                    let linkText = linkContainer.querySelector('a > strong')?.textContent.trim()
                    let linkAddress = linkContainer.querySelector('a').href?.trim()

                    if (linkAddress.substring(0, 1) === "/") {
                        linkAddress = "https://www.fh-muenster.de" + linkAddress
                    }

                    let downloadText = linkContainer.querySelector('a[onclick]')?.textContent.trim()
                    let downloadInfo = linkContainer.querySelector('a[onclick] > small')?.textContent.trim()
                    downloadText = downloadText?.substring(0, downloadText.length - downloadInfo.length).trim()

                    if (downloadText === undefined) {
                        // button is link
                        entryLinks.push({ text: linkText, address: linkAddress })
                    } else {
                        // button is download
                        entryDownloads.push({ text: downloadText, address: linkAddress, info: downloadInfo })
                    }
                })

                let entryDateString
                let entryDateElement = entity.querySelector('div > div > p > strong')

                // check if the <strong> element exists
                if (entryDateElement !== null) {
                    entryDateString = entryDateElement?.textContent.trim()
                } else { // otherwise go back to it's parent
                    entryDateElement = entity.querySelector('div > div > p')
                    let firstParagraph = entryDateElement?.textContent.trim()
                    entryDateString = firstParagraph?.substring(0, firstParagraph.indexOf('|') - 1).trim()
                }

                let entry = {
                    title: entity.querySelector('h2')?.textContent.trim(),
                    date: (entryDateString !== undefined) && (entryDateString !== null) ? this.parseDateString(entryDateString) : undefined,
                    paragraphs: entryParagraphs,
                    links: entryLinks,
                    downloads: entryDownloads
                }
                elements.push(entry)
            }
        })

        return elements
    }

    parseDateString(dateString) {
        // index 1 = dd     -> "06"
        // index 2 = MM     -> "09"
        // index 3 = yyyy   -> "2020"
        const regexCustomDate = /(\d+).(\d+).(\d{4})/

        let dateRegexResult = regexCustomDate.exec(dateString)
        if (dateRegexResult === null) {
            return
        }

        let day = parseInt(dateRegexResult[1], 10)
        let month = parseInt(dateRegexResult[2], 10)
        let year = parseInt(dateRegexResult[3], 10)

        return luxon.DateTime.fromFormat(`${day}.${month}.${year}`, "d.M.yyyy").setZone('Europe/Berlin').toISO()
    }

    getScraperFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.title}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(json) {
        this.log(`Generating embed...`)

        let paragraphString = ""

        json.paragraphs.forEach((paragraph, index) => {
            if (index !== 0) paragraphString += '\n'
            paragraphString += paragraph
        })

        const regexLinks = /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/ig
        let linkResults = [...paragraphString.matchAll(regexLinks)]

        const linkHintPrefix = "#LINK"
        const linkHintPostfix = "#"
        let linkIndex = 0
        paragraphString = paragraphString.replace(regexLinks, () => {
            linkIndex++
            return `${linkHintPrefix}${linkIndex}${linkHintPostfix}`
        })
        linkIndex = 0 // aftercare for later re-use

        paragraphString = (Discord.Util.escapeMarkdown(paragraphString))

        const regexLinkHints = new RegExp(`(${linkHintPrefix}\\d+${linkHintPostfix})`,"gm")
        paragraphString = paragraphString.replace(regexLinkHints, () => {
            linkIndex++
            return `[\[Link: ${linkResults[linkIndex-1][0]}\]](${linkResults[linkIndex-1][0]})`
        })

        let footerString = `Alle Angaben ohne Gewähr!  •  `

        let dateObj
        if (json.date !== undefined) {
            dateObj = luxon.DateTime.fromISO(json.date)
        } else {
            dateObj = luxon.DateTime.local()
        }
        footerString += dateObj.toFormat('dd.MM.yyyy')

        let embed = new Discord.MessageEmbed(
            {
                "title": json.title !== undefined ? Discord.Util.escapeMarkdown(json.title) : "Neuer Aushang",
                "description": paragraphString + "\n",
                "url": "https://www.fh-muenster.de/eti/aktuell/aushang/index.php",
                // "color": 0x000fff,
                "footer": {
                    "text": footerString
                },
                "author": {
                    "name": "Fachhochschule Münster",
                    "url": "https://fh-muenster.de",
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg"
                },
                "fields": []
            }
        )

        let linksString = ""
        let downloadsString = ""

        json.links.forEach((link, index) => {
            linksString += `> [• ${link.text}](${link.address})\n`
        })
        json.downloads.forEach((download, index) => {
            downloadsString += `> [• ${download.text} ${download.info}](${download.address})\n`
        })

        if (linksString !== "") {
            embed.description += "\n> **Link"
            embed.description += json.links?.length > 1 ? "s" : ""
            embed.description += ":**\n"
            embed.description += linksString
        }
        if (downloadsString !== "") {
            embed.description += "\n> **Download"
            embed.description += json.downloads?.length > 1 ? "s" : ""
            embed.description += ":**\n"
            embed.description += downloadsString
        }

        return embed
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperBlackBoard()
