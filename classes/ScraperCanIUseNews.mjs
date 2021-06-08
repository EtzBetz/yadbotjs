import luxon from 'luxon'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'

class ScraperCanIUseNews extends WebsiteScraper{

    parseDateFromString(dateString) {
        return luxon.DateTime.fromFormat(dateString, "MMM d, yyyy").setZone('Europe/Berlin').toISO()
    }

    filterDescription(descriptionString) {

        // turn a-tags into discord links
        const linkRegex = /<(a).*?href="(.+?)"[^>]*>(.*?)<\/\1>|<.*?\/>/g

        let separationResult = [...descriptionString.matchAll(linkRegex)]
        let stringDifference = 0

        separationResult.forEach((result) => {
            let preString = descriptionString.substring(0, result.index - stringDifference)
            let postString = descriptionString.substring(result.index + (result[0]?.length) - stringDifference)

            let preparedUrl = result[2]
            if (preparedUrl.substring(0,1) === "/") preparedUrl = `https://caniuse.com${preparedUrl}`

            let finalString = `${preString}[${result[3]}](${preparedUrl})${postString}`
            stringDifference += descriptionString.length - finalString.length
            descriptionString = finalString
        })

        // remove tags from string, extract innerHTML
        const tagRegex = /<(\S*?)[^>]*>(.*?)<\/\1>|<.*?\/>/gm
        let tagsResult = [...descriptionString.matchAll(tagRegex)]
        stringDifference = 0

        tagsResult.forEach((result,index) => {
            let preString = descriptionString.substring(0, result.index - stringDifference)
            let postString = descriptionString.substring(result.index + (result[0]?.length) - stringDifference)
            let finalString = `${preString}${result[2]}${postString}`
            stringDifference += descriptionString.length - finalString.length
            descriptionString = finalString
        })

        // replace encoded characters for ", &, <, >, afterwards remove all unknown encodings from text
        descriptionString = descriptionString.replace(/(&quot;)/g,"\"").trim()
        descriptionString = descriptionString.replace(/(&amp;)/g,"&").trim()
        descriptionString = descriptionString.replace(/(&lt;)/g,"<").trim()
        descriptionString = descriptionString.replace(/(&gt;)/g,">").trim()
        descriptionString = descriptionString.replace(/(&lsquo;|&rsquo;)/g,"'").trim()
        descriptionString = descriptionString.replace(/(&.+?;)/g,"").trim()

        // replace <br> by linebreak.
        descriptionString = descriptionString.replace(/(<br>)/g,"\n").trim()

        // remove : at string start, if existent
        if (descriptionString.substring(0,1) === ":") descriptionString = descriptionString.substring(1).trim()

        return descriptionString
    }

    parseWebsiteContentToJSON(scrapeInfo) {
        const elements = []
        scrapeInfo.response.data.forEach(newsArticle => {
            let entry = {}
            entry.title = newsArticle.title
            entry.description = this.filterDescription(newsArticle.description)
            entry.date = this.parseDateFromString(newsArticle.date)
            if (newsArticle.featIds !== undefined) {
                entry.featIds = newsArticle.featIds
            }

            elements.push(entry)
        })
        this.log(`${elements.length} entries found...`)
        return elements
    }

    generateFileNameFromJson(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${this.generateSlugFromString(json.title)}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let features = []
        let urlString = ""
        if (content.featIds !== undefined) {
            const separationRegex = /([^,]+)/g

            let separationResult = [...content.featIds.matchAll(separationRegex)]
            separationResult.forEach((result, index) => {
                features.push(result[1])
            })

            features.forEach(slug => {
                urlString += `[Feature: ${slug}](https://caniuse.com/${slug})\n`
            })
        }

        let embed = new Discord.MessageEmbed(
            {
                "title": content.title,
                "description": content.description,
                "author": {
                    "name": "CanIUse.com",
                    "url": "https://caniuse.com",
                    "icon_url": "https://caniuse.com/img/favicon-128.png"
                },
                "fields": []
            }
        )

        if (urlString !== "") {
            embed.fields.push({
                "name": "Link(s)",
                "value": urlString
            })
        }

        return embed
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperCanIUseNews()
