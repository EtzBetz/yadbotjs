import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import files from './Files.js';
import axios from 'axios';
import yadBot from './YadBot.js';

class ScraperFreeUbisoftGames extends WebsiteScraper {

    async getScrapingUrl(scrapeInfo) {
        let response = await this.requestWebsite("https://free.ubisoft.com/configuration.js")

        let data = response.data.replace(/(\r\n|\n|\r|\t)/gm, "")

        let config = await this.getObjectFromRelaxedKey(data, 'var config')
        let feed = await this.getObjectFromRelaxedKey(config, 'feedUrl:')

        let appId = await this.getStringFromRelaxedKey(config, 'appId:')
        files.writeJson(this.getScraperConfigPath(), 'latest_app_id', appId)

        return await this.getStringFromRelaxedKey(feed, 'prod:')
    }

    async getStringFromRelaxedKey(searchInString, searchForString) {
        let indexStart = searchInString.search(searchForString)

        let openingQuote = 0
        for (let i = indexStart + searchForString.length; i <= searchInString.length; i++) {
            let curChar = searchInString[i]
            if (curChar === '\'' || curChar === '\"') {
                openingQuote = i
                break
            }
        }

        let closingQuote = 0
        for (let i = openingQuote + 1; i <= searchInString.length; i++) {
            let curChar = searchInString[i]
            if ((curChar === '\'' || curChar === '\"') && searchInString[i - 1] !== '\\') {
                closingQuote = i
                break
            }
        }

        // console.log(openingQuote)
        // console.log(searchInString[openingQuote])
        // console.log(closingQuote)
        // console.log(searchInString[closingQuote])
        // console.log(searchInString.substring(openingQuote, closingQuote + 1))

        return searchInString.substring(openingQuote + 1, closingQuote)
    }

    async getObjectFromRelaxedKey(searchInString, searchForString) {
        let indexStart = searchInString.search(searchForString)

        let indexOpeningBracket = 0
        let indexClosingBracket = 0
        for (let i = indexStart + searchForString.length; i <= searchInString.length; i++) {
            let curChar = searchInString[i]
            if (curChar === '{') {
                indexOpeningBracket = i
                break
            }
        }

        let curBracket = 1
        for (let i = indexOpeningBracket + 1; i <= searchInString.length; i++) {
            let curChar = searchInString[i]
            if (curChar === '{') {
                curBracket++
            } else if (curChar === '}') {
                curBracket--
                if (curBracket === 0) {
                    indexClosingBracket = i
                    break
                }
            }
        }

        // console.log(indexOpeningBracket)
        // console.log(searchInString[indexOpeningBracket])
        // console.log(indexClosingBracket)
        // console.log(searchInString[indexClosingBracket])
        // console.log(searchInString.substring(indexOpeningBracket, indexClosingBracket + 1))

        return searchInString.substring(indexOpeningBracket, indexClosingBracket + 1)
    }

    async requestWebsite(url) {
        return await axios({
            method: 'get',
            url: url,
            headers: {
                'User-Agent': this.getUserAgent(),
                'ubi-appid': files.readJson(this.getScraperConfigPath(), 'latest_app_id', false, "314d4fef-e568-454a-ae06-43e3bece12a6"),
                'ubi-localecode': 'en-US'
            },
            responseType: this.getExpectedResponseType(),
            raxConfig: {
                retry: 5,
                noResponseRetries: 5,
                retryDelay: 100,
            }
        })
    }

    parseWebsiteContentToJSON(scrapeInfo) {
        const elements = []
        scrapeInfo.response.data.news.forEach(game => {
            switch (game.placement) {
                case "freeevents":
                    break
                default:
                    yadBot.sendMessageToOwner(`new \`placement\` type in ubisoft scraper->${game['placement']}`)
                    yadBot.sendMessageToOwner(JSON.stringify(game))
            }
            switch (game.type) {
                case "freegame":
                case "gametrial":
                case "freeweekend":
                case "beta":
                case "dlc":
                    break
                default:
                    yadBot.sendMessageToOwner(`new \`type\` type in ubisoft scraper->${game['type']}`)
                    yadBot.sendMessageToOwner(JSON.stringify(game))
            }

            let entry = {}
            if (
                (game.placement === "freeevents" && game.type === "freegame") ||
                (game.placement === "freeevents" && game.type === "beta") ||
                (game.placement === "freeevents" && game.type === "dlc")
            ) {
                entry.title = game.title
                entry.image = game.mediaURL

                if (game.links !== undefined) {
                    entry.url = game.links.find((linkObject) => {
                        return linkObject.type === "External"
                    }).param
                }

                if (game.publicationDate !== undefined && game.publicationDate !== null) {
                    entry.startDate = luxon.DateTime.fromISO(game.publicationDate).toISO()
                }
                if (game.expirationDate !== undefined && game.expirationDate !== null) {
                    entry.endDate = luxon.DateTime.fromISO(game.expirationDate).toISO()
                }

                elements.push(entry)
            }

        })
        this.log(`Parsed ${elements.length} entries...`)
        return elements
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.startDate).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.title}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(content) {
        let descriptionString, startDate, endDate

        if (content.json.endDate !== undefined) {
            endDate = luxon.DateTime.fromISO(content.json.endDate)
            descriptionString = `**Free** until ${endDate.toFormat("MMMM")} ${yadBot.ordinal(parseInt(endDate.toFormat("d"), 10))} in Ubisoft Store.`
        } else {
            descriptionString = `Currently **free** in Ubisoft Store.`
        }

        let embed = new Discord.MessageEmbed(
            {
                "title": content.json.title,
                "description": descriptionString,
                "url": content.json.url,
                "image": {
                    "url": content.json.image
                },
                "author": {
                    "name": "Ubisoft Store",
                    "url": "https://free.ubisoft.com/",
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_ubisoft_store.png"
                },
                "fields": []
            }
        )

        if (content.json.startDate !== undefined) {
            embed.fields.push({
                "name": "Start Date",
                "value": `${luxon.DateTime.fromISO(content.json.startDate).toFormat('MMMM')} ${yadBot.ordinal(parseInt(luxon.DateTime.fromISO(content.json.startDate).toFormat("d"), 10))}, ${luxon.DateTime.fromISO(content.json.startDate).toFormat('HH:mm')}`,
                "inline": true
            })
        }

        if (content.json.endDate !== undefined) {
            embed.fields.push({
                "name": "End Date",
                "value": `${endDate.toFormat('MMMM')} ${yadBot.ordinal(parseInt(endDate.toFormat("d"), 10))}, ${endDate.toFormat('HH:mm')}`,
                "inline": true
            })
        } else {
            embed.fields.push({
                "name": "End Date",
                "value": `Unknown`,
                "inline": true
            })
        }

        return embed
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperFreeUbisoftGames()
