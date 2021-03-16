import jsdom from 'jsdom'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'

class ScraperInterfaceInGameArticles extends WebsiteScraper {

    constructor() {
        super()
    }

    parseWebsiteContentToJSON(response) {
        const page = new jsdom.JSDOM(response.data).window.document
        let elements = []

        let entities = page.querySelectorAll('ul > li > article > div.item__inner')
        this.log(`${entities.length} entries found...`)

        entities.forEach((element, index) => {
            let entry = {}

            entry.image = element.querySelector('div.item__media > picture > img')?.getAttribute('data-src')
            entry.title = element.querySelector('span.item__title-text')?.textContent.trim()
            entry.subtitle = element.querySelector('p.item__excerpt').textContent.trim()
            entry.url = element.querySelector('a.item__title-link')?.getAttribute('href')
            entry.genres = []
            element.querySelectorAll('ul > li.tags__item:not(.tags__item--dots)').forEach((genre, genreIndex) => {
                entry.genres.push(genre.textContent.trim())
            })

            elements.push(entry)
        })

        return elements
    }

    generateFileNameFromJson(json) {
        let fileName = `${json.title.substring(0, 50)}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(json) {
        this.log(`Generating embed...`)

        return new Discord.MessageEmbed(
            {
                'title': `New Article: ${json.title}`,
                'description': json.subtitle,
                'url': `https://interfaceingame.com/${json.url}`,
                'image': {
                    'url': json.image,
                },
                'author': {
                    'name': 'Interface In Game',
                    'url': 'https://interfaceingame.com/articles/?sortby=recent_add',
                    'icon_url': 'https://etzbetz.io/stuff/yad/images/logo_interface_in_game.png',
                },
                'fields': [
                    {
                        'name': 'Category(s)',
                        'value': this.getGenreString(json.genres),
                        inline: true
                    },
                ],
            },
        )
    }

    getGenreString(genreArr) {
        let finalString = ""

        genreArr.forEach((genre, index) => {
            if (index !== 0) finalString += ", "
            finalString += genre
        })
        return finalString
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperInterfaceInGameArticles()
