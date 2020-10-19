import axios from 'axios'
import cheerio from 'cheerio'
import luxon from 'luxon'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import yadBot from './YadBot'
import config from '../config.json'

class ScraperFreeEpicGames extends WebsiteScraper{

    constructor() {
        super()
        this.url = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=de&country=DE&allowCountries=DE"
        this.scrapingInterval = 1000 * 60 * 30
        this.guildChannelIds = config.scraper_free_epic_games_guild_channels
        this.userIds = config.scraper_free_epic_games_dm_users
        this.scrapingFolder = "freeEpicGames"
        this.websiteData = {}
    }

    parseWebsiteContentToJSON(response) {
        this.log(`Parsing website...`)
        const elements = []
        response.data.data.Catalog?.searchStore?.elements?.forEach(game => {
            let entry = {}
            entry.title = game.title
            entry.imageUrl = game.keyImages?.find(image => image.type === "OfferImageWide").url

            let slug
            const slashPosition = game.productSlug.toString().indexOf('/')
            if (slashPosition !== -1) {
                slug = game.productSlug.toString().substring(0, slashPosition)
            } else {
                slug = game.productSlug.toString()
            }
            entry.slug = slug

            let developer = game.customAttributes?.find(attribute => attribute.key === "developerName").value;
            let publisher = game.customAttributes?.find(attribute => attribute.key === "publisherName").value;
            if (developer !== undefined) {
                entry.developer = developer
            }
            if (publisher !== undefined) {
                entry.publisher = publisher
            }

            const originalPrice = game.price?.totalPrice?.originalPrice?.toString()
            const decimalCount = parseInt(game.price?.totalPrice?.currencyInfo?.decimals, 10)
            let decimalPosition = originalPrice.length - (decimalCount || 2)
            let priceEuro = originalPrice.substring(0, decimalPosition)
            let priceDecimal = originalPrice.substring(originalPrice.length - decimalCount)
            entry.price = `${priceEuro},${priceDecimal}€`

            let promotions = []
            if (game.promotions?.promotionalOffers[0]?.promotionalOffers !== undefined) {
                promotions = promotions.concat(game.promotions?.promotionalOffers[0]?.promotionalOffers)
            }
            if (game.promotions?.upcomingPromotionalOffers[0]?.promotionalOffers !== undefined) {
                promotions = promotions.concat(game.promotions?.upcomingPromotionalOffers[0]?.promotionalOffers)
            }

            let freePromotion = promotions.find(
                promotion => promotion.discountSetting?.discountPercentage?.toString() === "0" ||
                promotion.discountSetting?.discountPercentage?.toString() === "100"
            );

            entry.startDate = luxon.DateTime.fromISO(freePromotion.startDate).setZone('Europe/Berlin').toISO();
            entry.endDate = luxon.DateTime.fromISO(freePromotion.endDate).setZone('Europe/Berlin').toISO();

            elements.push(entry)
        })
        this.log(`${elements.length} entries found...`)
        return elements
    }

    getScraperFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.startDate).toFormat('yyyy-MM-dd');
        let fileName = `${dateString}-${json.slug}`
        return this.filterStringForFileName(fileName + ".json")
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let descriptionString, startDate, endDate
        startDate = luxon.DateTime.fromISO(content.startDate)
        endDate = luxon.DateTime.fromISO(content.endDate)

        if (startDate.diffNow() < 0) {
            descriptionString = `Bis zum ${endDate.day}.${endDate.month}. kostenlos im Epic Games Store.`
        } else {
            descriptionString = `Ab dem ${startDate.day}.${startDate.month}. kostenlos im Epic Games Store.`
        }

        let embed = new Discord.MessageEmbed(
            {
                "title": content.title,
                "description": descriptionString,
                "url": `https://www.epicgames.com/store/de/product/${content.slug}/home`,
                "image": {
                    "url": content.imageUrl
                },
                "author": {
                    "name": "Epic Games Store",
                    "url": "https://www.epicgames.com/store/de/free-games",
                    "icon_url": "https://pbs.twimg.com/profile_images/1273739401387036676/y3-FozWF_400x400.jpg"
                },
                "fields": [
                    {
                        "name": "Originalpreis",
                        "value": `~~${content.price}~~`,
                        "inline": true
                    },
                    {
                        "name": "Startdatum",
                        "value": `${startDate.toFormat('dd.MM.yyyy HH:mm')} Uhr`,
                        "inline": true
                    },
                    {
                        "name": "Enddatum",
                        "value": `${endDate.toFormat('dd.MM.yyyy HH:mm')} Uhr`,
                        "inline": true
                    }
                ]
            }
        )

        if (content.developer !== undefined) {
            embed.fields.push(
                {
                    "name": "Entwickler",
                    "value": `${content.developer}`,
                    "inline": true
                }
            )
        }

        if (content.publisher !== undefined) {
            embed.fields.push(
                {
                    "name": "Publisher",
                    "value": `${content.publisher}`,
                    "inline": true
                }
            )
        }

        return embed
    }

    sortEmbeds(embedA, embedB) {
        const descriptionLetterA = embedA.description.substring(0,1)
        const descriptionLetterB = embedB.description.substring(0,1)

        if (descriptionLetterA === descriptionLetterB) {
            const startTextA = embedA.fields.find(field => field.name === "Startdatum").value
            const startTextB = embedB.fields.find(field => field.name === "Startdatum").value

            const yearA = parseInt(startTextA.substring(6, 10))
            const monthA = parseInt(startTextA.substring(3, 5))
            const dayOfMonthA = parseInt(startTextA.substring(0, 2))
            const hourA = parseInt(startTextA.substring(11, 13))
            const minuteA = parseInt(startTextA.substring(14, 16))
            const yearB = parseInt(startTextB.substring(6, 10))
            const monthB = parseInt(startTextB.substring(3, 5))
            const dayOfMonthB = parseInt(startTextB.substring(0, 2))
            const hourB = parseInt(startTextB.substring(11, 13))
            const minuteB = parseInt(startTextB.substring(14, 16))
            if (yearA < yearB) return -1 // TODO: calculate difference
            else if (yearA > yearB) return 1
            else if (monthA < monthB) return -1
            else if (monthA > monthB) return 1
            else if (dayOfMonthA < dayOfMonthB) return -1
            else if (dayOfMonthA > dayOfMonthB) return 1
            else if (hourA < hourB) return -1
            else if (hourA > hourB) return 1
            else if (minuteA < minuteB) return -1
            else if (minuteA > minuteB) return 1
            else {
                const endTextA = embedA.fields.find(field => field.name === "Enddatum").value
                const endTextB = embedB.fields.find(field => field.name === "Enddatum").value

                const yearA = parseInt(endTextA.substring(6, 10))
                const monthA = parseInt(endTextA.substring(3, 5))
                const dayOfMonthA = parseInt(endTextA.substring(0, 2))
                const hourA = parseInt(endTextA.substring(11, 13))
                const minuteA = parseInt(endTextA.substring(14, 16))
                const yearB = parseInt(endTextB.substring(6, 10))
                const monthB = parseInt(endTextB.substring(3, 5))
                const dayOfMonthB = parseInt(endTextB.substring(0, 2))
                const hourB = parseInt(endTextB.substring(11, 13))
                const minuteB = parseInt(endTextB.substring(14, 16))
                if (yearA < yearB) return -1 // TODO: calculate difference
                else if (yearA > yearB) return 1
                else if (monthA < monthB) return -1
                else if (monthA > monthB) return 1
                else if (dayOfMonthA < dayOfMonthB) return -1
                else if (dayOfMonthA > dayOfMonthB) return 1
                else if (hourA < hourB) return -1
                else if (hourA > hourB) return 1
                else if (minuteA < minuteB) return -1
                else if (minuteA > minuteB) return 1
            }
        } else if (descriptionLetterA === "B") {
            return -1
        } else if (descriptionLetterB === "B") {
            return 1
        }
        return 0
    }
}

export default new ScraperFreeEpicGames();
