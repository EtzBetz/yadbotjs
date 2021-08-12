import luxon from 'luxon'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import Json from './Json.js'
import yadBot from './YadBot.js'

class ScraperXRelReleases extends WebsiteScraper {

    parseWebsiteContentToJSON(scrapeInfo) {
        let elements = []
        let result = Json.parseXmlToJson(scrapeInfo.response.data)
        this.log(`Parsing ${elements.length} entries...`)
        result.releases.list[0].release?.forEach((release, index) => {
            let entry = {}

            entry.title = release.ext_info[0].title[0]
            entry.main_link = release.ext_info[0].link_href[0]
            entry.release_title = release.dirname[0]
            entry.release_link = release.link_href[0]
            entry.release_group = release.group_name[0]
            entry.release_type = release.ext_info[0].type[0]
            entry.date = luxon.DateTime.fromSeconds(parseInt(release.time[0], 10)).setZone('Europe/Berlin').toISO()
            entry.size_raw = release.size[0].number[0]
            entry.size_unit = release.size[0].unit[0]
            entry.language = release.flags[0].english?.[0] ? 'en_US' : 'de_DE'
            // noinspection RedundantConditionalExpressionJS
            entry.fixed_release = release.flags[0].fix_rls?.[0] ? true : false

            if (entry.release_type === 'tv') {
                entry.series_details = {}

                entry.series_details.video = release.video_type[0]
                entry.series_details.audio = release.audio_type[0]

                if (release.tv_season !== undefined && release.tv_episode !== undefined) {
                    entry.series_details.single = false
                    entry.series_details.season = release.tv_season[0]
                    entry.series_details.episode = release.tv_episode[0]
                } else {
                    entry.series_details.single = true
                }
            }
            // console.log(entry)

            elements.push(entry)
        })
        return elements
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.release_title}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        let typeString = ''
        switch (content.json.release_type) {
        case 'movie':
            typeString = `Movie`
            break
        case 'tv':
            typeString = `TV-Show`
            break
        case 'console':
            typeString = `Console-Game`
            break
        case 'software':
            typeString = `Software`
            break
        case 'game':
            typeString = `Game`
            break
        case 'xxx':
            typeString = `XXX`
            break
        default:
            yadBot.sendMessageToOwner(new Discord.MessageEmbed({
                title: 'New release type in xREL Releases Scraper',
                description: `New release type: \`${content.json.release_type}\``
            }))
            typeString = `UNKNOWN (${content.json.release_type})`
            break
        }

        let detailString = ''
        switch (content.json.release_type) {
        case 'tv':
            if (content.json.series_details.single !== true) detailString = `Season ${content.json.series_details.season}, Episode ${content.json.series_details.episode}\n`
            break
        }

        let embed = new Discord.MessageEmbed(
            {
                title: 'New scene release available!',
                description: `${typeString}:\n[${content.json.title}](${content.json.main_link})\n${detailString}[\`${content.json.release_title}\`](${content.json.release_link})`,
                timestamp: content.json.date,
                author: {
                    name: 'xREL Releases',
                    url: 'https://www.xrel.to/releases.html',
                    icon_url: 'https://status.xrel.to/images/xrel_logo2x.png',
                },
                fields: [
                    {
                        name: 'Released by',
                        value: `${content.json.release_group}`,
                    },
                    {
                        name: 'Language',
                        value: `${content.json.language === 'en_US' ? '🇺🇸 English' : '🇩🇪 German'}`,
                    },
                ],
            },
        )

        if (content.json.release_type === 'tv') {
            embed.fields.push(
                {
                    'name': 'Video- & Audio-type',
                    'value': `${content.json.series_details.video}, ${content.json.series_details.audio}`,
                },
            )
        }

        embed.fields.push(
            {
                'name': 'Download size',
                'value': `${content.json.size_raw} ${content.json.size_unit}`,
            },
        )

        if (content.json.fixed_release === true) {
            embed.fields.push(
                {
                    'name': 'Fixed release',
                    'value': `This release updates or fixes another release somehow, it is probably still independent.`,
                },
            )
        }

        return embed
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperXRelReleases()
