import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'

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
            const decimalPosition = originalPrice.length - (decimalCount || 2)
            const priceEuro = originalPrice.substring(0, decimalPosition)
            const priceDecimal = originalPrice.substring(originalPrice.length - decimalCount)
            entry.originalPrice = `${priceEuro},${priceDecimal}€`

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

        if (startDate.diffNow() < 0) {
            descriptionString = `Bis zum ${endDate.day}.${endDate.month}. kostenlos im Epic Games Store.`
        } else {
            descriptionString = `Ab dem ${startDate.day}.${startDate.month}. kostenlos im Epic Games Store.`
        }

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
                "url": `https://www.epicgames.com/store/de/product/${content.slug}/home`,
                "author": {
                    "name": "Epic Games Store",
                    "url": "https://www.epicgames.com/store/de/free-games",
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_epic_games.png"
                },
                "fields": [
                    {
                        "name": "Originalpreis",
                        "value": `~~${content.originalPrice}~~`,
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

        if (osString !== "") {
            embed.fields.push({
                "name": "Unterstützte Betriebssysteme",
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

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperFreeEpicGames()
