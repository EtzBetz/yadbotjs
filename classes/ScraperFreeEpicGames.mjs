import axios from 'axios'
import cheerio from 'cheerio'
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
        const elements = response.data.data.Catalog.searchStore.elements
        this.log(`${elements.length} entries found...`)
        return elements
    }

    getScraperFileName(json) {
        const dateString = json.effectiveDate.toString().substring(0, 10)
        const gameSlugStringEnd = json.productSlug.toString().indexOf('/')
        const gameSlugString = json.productSlug.toString().substring(0, gameSlugStringEnd)

        let fileName = `${dateString}-${gameSlugString}`
        return this.filterStringForFileName(fileName + ".json")
    }

    parseDateStringToObject(string) {
        // 2020-10-01T15:00:00.000Z
        return {
            'dayOfMonth': string.substring(8, 10),
            'month': string.substring(5, 7),
            'year': string.substring(0, 4),
            'timeHours': string.substring(11, 13),
            'timeMinutes': string.substring(14, 16)
        }
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let descriptionString, startTime, endTime, developer, publisher
        if (content.promotions?.promotionalOffers.length > 0) {
            startTime = this.parseDateStringToObject(content.promotions.promotionalOffers[0].promotionalOffers[0].startDate)
            endTime = this.parseDateStringToObject(content.promotions.promotionalOffers[0].promotionalOffers[0].endDate)
            descriptionString = `Bis zum ${endTime.dayOfMonth}.${endTime.month}. kostenlos im Epic Games Store.`
        } else if ((content.promotions?.upcomingPromotionalOffers.length > 0)) {
            startTime = this.parseDateStringToObject(content.promotions.upcomingPromotionalOffers[0].promotionalOffers[0].startDate)
            endTime = this.parseDateStringToObject(content.promotions.upcomingPromotionalOffers[0].promotionalOffers[0].endDate)
            descriptionString = `Ab dem ${startTime.dayOfMonth}.${startTime.month}. kostenlos im Epic Games Store.`
        }

        developer = content.customAttributes?.find(attribute => attribute.key === "developerName").value;
        publisher = content.customAttributes?.find(attribute => attribute.key === "publisherName").value;

        let originalPriceEuro = content.price.totalPrice.originalPrice.toString().substring(0, content.price.totalPrice.originalPrice.toString().length - content.price.totalPrice.currencyInfo.decimals)
        let originalPriceDecimal = content.price.totalPrice.originalPrice.toString().substring(content.price.totalPrice.originalPrice.toString().length - content.price.totalPrice.currencyInfo.decimals)

        const gameImage = content.keyImages?.find(image => image.type === "OfferImageWide").url;

        let embed = new Discord.MessageEmbed(
            {
                "title": content.title,
                "description": descriptionString,
                "url": `https://www.epicgames.com/store/de/product/${content.productSlug}`,
                "image": {
                    "url": gameImage
                },
                "author": {
                    "name": "Epic Games Store",
                    "url": "https://www.epicgames.com/store/de/free-games",
                    "icon_url": "https://pbs.twimg.com/profile_images/1273739401387036676/y3-FozWF_400x400.jpg"
                },
                "fields": [
                    {
                        "name": "Originalpreis",
                        "value": `~~${originalPriceEuro},${originalPriceDecimal}€~~`,
                        "inline": true
                    }
                ]
            }
        )

        if (startTime !== undefined && startTime !== null) {
            embed.fields.push(
                {
                    "name": "Startdatum",
                    "value": `${startTime.dayOfMonth}.${startTime.month}.${startTime.year} ${startTime.timeHours}:${startTime.timeMinutes} Uhr`,
                    "inline": true
                }
            )
        }

        if (endTime !== undefined && endTime !== null) {
            embed.fields.push(
                {
                    "name": "Enddatum",
                    "value": `${endTime.dayOfMonth}.${endTime.month}.${endTime.year} ${endTime.timeHours}:${endTime.timeMinutes} Uhr`,
                    "inline": true
                }
            )
        }

        if (developer !== undefined && developer !== null) {
            embed.fields.push(
                {
                    "name": "Entwickler",
                    "value": `${developer}`,
                    "inline": true
                }
            )
        }

        if (publisher !== undefined && publisher !== null) {
            embed.fields.push(
                {
                    "name": "Publisher",
                    "value": `${publisher}`,
                    "inline": true
                }
            )
        }

        return embed
    }
}

export default new ScraperFreeEpicGames();
