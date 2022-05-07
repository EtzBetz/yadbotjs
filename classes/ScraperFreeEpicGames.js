import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.js';
import jsdom from 'jsdom';

class ScraperFreeEpicGames extends WebsiteScraper {

    async parseWebsiteContentToJSON(scrapeInfo) {
        const elements = []
        for (const game of scrapeInfo.response.data.data.Catalog?.searchStore?.elements) {

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
            )

            if (freePromotion !== undefined) {
                let entry = {}
                entry.title = game.title
                entry.imageUrl = game.keyImages?.find(image => image.type === "DieselStoreFrontWide")?.url
                if (entry.imageUrl === undefined && game.keyImages?.length > 0) {
                    entry.imageUrl = game.keyImages[0].url
                }
                entry.imageUrl = encodeURI(entry.imageUrl)

                entry.slug = game.offerMappings.find((mapping) => {
                    return mapping.pageType === "productHome"
                })?.pageSlug

                let gameDetailsPageResponse = await this.requestWebsite(`https://www.epicgames.com/store/us/p/${entry.slug}`)
                const gameDetails = new jsdom.JSDOM(gameDetailsPageResponse.data).window.document
                let originalPrice = gameDetails.querySelector('div[data-component="PDPDiscountedFromPrice"]')?.textContent.trim()
                originalPrice = originalPrice?.substring(1)
                let decimalIndex = originalPrice?.indexOf(".")
                const priceEuro = originalPrice?.substring(0, decimalIndex)
                const priceDecimal = originalPrice?.substring(decimalIndex + 1)
                if (priceEuro !== undefined && priceDecimal !== undefined) {
                    entry.originalPrice = `${priceEuro},${priceDecimal}€`
                }

                game.tags.forEach((tag) => {
                    if (tag.id === "9547") entry.windowsCompatibility = true
                    if (tag.id === "9548") entry.macCompatibility = true
                })
                if (gameDetails.querySelector('li[data-testid="metadata-platform-windows"]') !== null) {
                    entry.windowsCompatibility = true
                }
                if (gameDetails.querySelector('li[data-testid="metadata-platform-mac"]') !== null) {
                    entry.macCompatibility = true
                }

                let developer = game.customAttributes?.find(attribute => attribute.key === "developerName")?.value
                let publisher = game.customAttributes?.find(attribute => attribute.key === "publisherName")?.value
                if (developer !== undefined) {
                    entry.developer = developer
                }
                if (publisher !== undefined) {
                    entry.publisher = publisher
                }


                entry.startDate = luxon.DateTime.fromISO(freePromotion.startDate).setZone('utc').toISO()
                entry.endDate = luxon.DateTime.fromISO(freePromotion.endDate).setZone('utc').toISO()
                if (luxon.DateTime.fromISO(entry.startDate).diffNow() < 0) {
                    elements.push(entry)
                }
            }
        }
        this.log(`Parsed ${elements.length} entries...`)
        return elements
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.startDate).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.slug}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(content) {
        let descriptionString, startDate, endDate
        startDate = luxon.DateTime.fromISO(content.json.startDate).setZone('utc')
        endDate = luxon.DateTime.fromISO(content.json.endDate).setZone('utc')

        descriptionString = `Promotion runs out <t:${endDate.toSeconds()}:R>.`

        let osString = ""

        if (content.json.windowsCompatibility) osString += "Windows"
        if (content.json.macCompatibility) {
            if (osString !== "") osString += ", "
            osString += "macOS"
        }

        let embed = new Discord.MessageEmbed(
            {
                "title": content.json.title,
                "description": descriptionString,
                "url": `https://www.epicgames.com/store/us/p/${content.json.slug}`,
                "author": {
                    "name": "Epic Games Store",
                    "url": "https://www.epicgames.com/store/us/free-games",
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_epic_games.png"
                },
                "fields": []
            }
        )

        if (content.json.originalPrice !== undefined) {
            embed.fields.push({
                "name": "Original Price",
                "value": `~~${content.json.originalPrice}~~`,
                "inline": true
            })
        }

        if (startDate !== undefined) {
            embed.fields.push({
                "name": "Start Date",
                "value": `<t:${startDate.toSeconds()}:f>`,
                "inline": true
            })
        }

        if (endDate !== undefined) {
            embed.fields.push({
                "name": "End Date",
                "value": `<t:${endDate.toSeconds()}:f>`,
                "inline": true
            })
        }

        if (osString !== "") {
            embed.fields.push({
                "name": "Platform(s)",
                "value": osString,
                "inline": true
            })
        }

        if (content.json.imageUrl !== undefined) {
            embed.image = {
                url: content.json.imageUrl
            }
        }

        if (content.json.developer !== undefined) {
            embed.fields.push(
                {
                    "name": "Developer",
                    "value": `${content.json.developer}`,
                    "inline": true
                }
            )
        }

        if (content.json.publisher !== undefined) {
            embed.fields.push(
                {
                    "name": "Publisher",
                    "value": `${content.json.publisher}`,
                    "inline": true
                }
            )
        }

        return embed
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperFreeEpicGames()
