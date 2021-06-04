import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.js';

class ScraperFreeEpicGames extends WebsiteScraper {

    parseWebsiteContentToJSON(response) {
        const elements = []
        response.data.data.Catalog?.searchStore?.elements?.forEach(game => {
            let entry = {}
            entry.title = game.title
            entry.imageUrl = game.keyImages?.find(image => image.type === "DieselStoreFrontWide")?.url
            if (entry.imageUrl === undefined && game.keyImages?.length > 0) {
                entry.imageUrl = game.keyImages[0].url
            }
            entry.imageUrl = encodeURI(entry.imageUrl)

            let slug
            const slashPosition = game.productSlug.toString().indexOf('/')
            if (slashPosition !== -1) {
                slug = game.productSlug.toString().substring(0, slashPosition)
            } else {
                slug = game.productSlug.toString()
            }
            entry.slug = slug

            let developer = game.customAttributes?.find(attribute => attribute.key === "developerName")?.value
            let publisher = game.customAttributes?.find(attribute => attribute.key === "publisherName")?.value
            if (developer !== undefined) {
                entry.developer = developer
            }
            if (publisher !== undefined) {
                entry.publisher = publisher
            }

            game.tags.forEach((tag) => {
                if (tag.id === "9547") entry.windowsCompatibility = true
                if (tag.id === "9548") entry.macCompatibility = true
            })

            const originalPrice = game.price?.totalPrice?.originalPrice?.toString().padStart(3, '0')
            const decimalCount = parseInt(game.price?.totalPrice?.currencyInfo?.decimals, 10)
            const decimalPosition = originalPrice?.length - (decimalCount || 2)
            const priceEuro = originalPrice?.substring(0, decimalPosition)
            const priceDecimal = originalPrice?.substring(originalPrice?.length - decimalCount)
            if (priceEuro !== undefined && priceDecimal !== undefined) {
                entry.originalPrice = `${priceEuro},${priceDecimal}€`
            } else {
                yadBot.sendMessageToOwner("epic games weirdness debug")
                yadBot.sendMessageToOwner(JSON.stringify(response.data))
            }

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
                entry.startDate = luxon.DateTime.fromISO(freePromotion.startDate).setZone('Europe/Berlin').toISO()
                entry.endDate = luxon.DateTime.fromISO(freePromotion.endDate).setZone('Europe/Berlin').toISO()
                if (luxon.DateTime.fromISO(entry.startDate).diffNow() < 0) {
                    elements.push(entry)
                }
            }
        })
        this.log(`${elements.length} entries found...`)
        return elements
    }

    generateFileNameFromJson(json) {
        let dateString = luxon.DateTime.fromISO(json.startDate).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.slug}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let descriptionString, startDate, endDate
        startDate = luxon.DateTime.fromISO(content.startDate)
        endDate = luxon.DateTime.fromISO(content.endDate)

        descriptionString = `**Free** in Epic Games Store until ${endDate.toFormat("MMMM")} ${yadBot.ordinal(parseInt(endDate.toFormat("d"), 10))}.`

        let osString = ""

        if (content.windowsCompatibility) osString += "Windows"
        if (content.macCompatibility) {
            if (osString !== "") osString += ", "
            osString += "macOS"
        }

        let embed = new Discord.MessageEmbed(
            {
                "title": content.title,
                "description": descriptionString,
                "url": `https://www.epicgames.com/store/us/p/${content.slug}`,
                "author": {
                    "name": "Epic Games Store",
                    "url": "https://www.epicgames.com/store/us/free-games",
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_epic_games.png"
                },
                "fields": []
            }
        )

        if (content.originalPrice !== undefined) {
            embed.fields.push({
                "name": "Original Price",
                "value": `~~${content.originalPrice}~~`,
                "inline": true
            })
        }

        if (startDate !== undefined) {
            embed.fields.push({
                "name": "Start Date",
                "value": `${startDate.toFormat('MMMM')} ${yadBot.ordinal(parseInt(startDate.toFormat("d"), 10))}, ${startDate.toFormat('HH:mm')}`,
                "inline": true
            })
        }

        if (endDate !== undefined) {
            embed.fields.push({
                "name": "End Date",
                "value": `${endDate.toFormat('MMMM')} ${yadBot.ordinal(parseInt(endDate.toFormat("d"), 10))}, ${endDate.toFormat('HH:mm')}`,
                "inline": true
            })
        }

        if (osString !== "") {
            embed.fields.push({
                "name": "Supported OSs",
                "value": osString,
                "inline": true
            })
        }

        if (content.imageUrl !== undefined) {
            embed.image = {
                url: content.imageUrl
            }
        }

        if (content.developer !== undefined) {
            embed.fields.push(
                {
                    "name": "Developer",
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

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperFreeEpicGames()
