import jsdom from 'jsdom'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.mjs';
import files from './Files.mjs';

class ScraperTSBThreadWatch extends WebsiteScraper {

    getScrapingUrl() {
        return 'https://community.teamspeak.com/t/teamspeak-badge-list/358/' + files.readJson(
            this.getScraperConfigPath(),
            'latest_post_id',
            false,
            1,
        )
    }

    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document
        let elements = []
        let entities = page.querySelectorAll("#main-outlet > div.topic-body.crawler-post")
        this.log(`Parsing ${entities.length} entries...`)

        let latestPostId = 1

        entities.forEach((element, index) => {
            const entry = {}

            if (element.getAttribute('role') === null || element.getAttribute('role') !== 'navigation') {
                let curPostId = element.querySelector("div.crawler-post-meta > span.crawler-post-infos > span").textContent.trim()
                if (curPostId.substring(0, 1) === "#") {
                    curPostId = parseInt(curPostId.substring(1), 10)
                    if (!isNaN(curPostId)) {
                        entry.postId = curPostId
                        if (curPostId > latestPostId) {
                            latestPostId = curPostId
                        }
                    } else {
                        yadBot.sendMessageToOwner(`Post ID in ScraperTSBThreadWatch is NaN: '${curPostId}'`)
                    }
                } else {
                    yadBot.sendMessageToOwner(`Post ID in ScraperTSBThreadWatch is different: '${curPostId}'!`)
                }

                entry.postText = element.querySelector("div.post").textContent.trim()
                entry.author = element.querySelector("div.crawler-post-meta > span.creator").textContent.trim()
                entry.date = element.querySelector("div.crawler-post-meta > span.crawler-post-infos > time").getAttribute('datetime').trim()

                // console.log(entry)
                elements.push(entry)
            }
        })

        files.writeJson(this.getScraperConfigPath(), 'latest_post_id', latestPostId)

        return elements
    }

    generateFileNameFromJson(json) {
        let fileName = `0${json.postId}-${json.author}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    getEmbed(json) {
        return new Discord.MessageEmbed(
            {
                "description": `**#${json.postId}**:\n\`\`\`text\n${json.postText.substring(0, 1000)}\`\`\`\n**[Link](${this.getScrapingUrl()})**`,
                "url": `${this.getScrapingUrl()}`,
                "author": {
                    "name": `${json.author} (${json.date})`,
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_ts.png"
                }
            }
        )
    }
}

export default new ScraperTSBThreadWatch()
