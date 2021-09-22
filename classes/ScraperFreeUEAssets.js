import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.js';
import jsdom from 'jsdom';

class ScraperFreeUEAssets extends WebsiteScraper {

    async parseWebsiteContentToJSON(scrapeInfo) {
        const elements = []
        if (scrapeInfo.response.data.status === "OK") {
            for (const asset of scrapeInfo.response.data.data.elements) {
                let entry = {}
                entry.title = asset.title
                entry.isFeatured = asset.isFeatured
                if (asset.tags.includes(4910)) {
                    entry.isTimeLimited = true
                }
                entry.description = asset.description
                entry.slug = asset.urlSlug
                entry.imageUrl = asset.featured
                entry.ratingAverage = asset.rating?.averageRating
                entry.ratingTotals = asset.rating?.total
                entry.categories = asset.categories
                entry.platformCompatibility = asset.platforms
                entry.unrealCompatibility = asset.compatibleApps
                entry.authorName = asset.seller.name
                entry.date = asset.effectiveDate

                if (asset.seller?.financeCheckExempted !== true) {
                    elements.push(entry)
                }
            }
        }
        this.log(`Parsed ${elements.length} entries...`)
        return elements
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.slug}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(content) {
        let embed = new Discord.MessageEmbed(
            {
                "title": content.json.title,
                "description": `${content.json.isFeatured ? "**[FEATURED]**\n" : ""}${content.json.isTimeLimited ? "**[TIMED OFFER]**\n" : ""}\n${content.json.description}`,
                "url": `https://www.unrealengine.com/marketplace/en-US/product/${content.json.slug}`,
                "image": {
                    "url": content.json.imageUrl
                },
                "author": {
                    "name": "Unreal Engine Assets Store",
                    "url": "https://www.unrealengine.com/marketplace/en-US/assets?count=100&priceRange=%5B0%2C0%5D&sortBy=effectiveDate&sortDir=DESC&start=0",
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_unreal_engine.png"
                },
                "fields": []
            }
        )

        embed.fields.push({
            "name": "Author",
            "value": `${content.json.authorName}`,
            "inline": true
        })

        if (content.json.ratingAverage !== undefined) {
            embed.fields.push({
                "name": "Rating",
                "value": `${content.json.ratingAverage} (${content.json.ratingTotals} Votes)`,
                "inline": true
            })
        }

        if (content.json.categories !== undefined && content.json.categories.length >= 1) {
            let catText = ""
            for (const category of content.json.categories) {
                catText += `\n[${category.name}](https://www.unrealengine.com/marketplace/en-US/content-cat/${category.path})`
            }

            embed.fields.push({
                "name": "Categories",
                "value": catText,
                "inline": true
            })
        }

        if (content.json.platformCompatibility !== undefined) {
            let platformText = ""
            for (const platformData of content.json.platformCompatibility) {
                platformText += `\n - ${platformData.value}`
            }

            embed.fields.push({
                "name": "Platform(s)",
                "value": platformText,
                "inline": true
            })
        }

        if (content.json.unrealCompatibility !== undefined) {
            let engineText = ""
            for (const engineVersion of content.json.unrealCompatibility) {
                if (engineText !== "") engineText += ", "
                engineText += `${engineVersion}`
            }

            embed.fields.push({
                "name": "UE Version(s)",
                "value": engineText,
                "inline": true
            })
        }
        return embed
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperFreeUEAssets()
