import luxon from 'luxon';
import * as Discord from 'discord.js';
import { WebsiteScraper } from './WebsiteScraper.js';
import yadBot from './YadBot.js';
import jsdom from 'jsdom';

class ScraperWearOSWatchfaces extends WebsiteScraper {
    async parseWebsiteContentToJSON(scrapeInfo) {
        const elements = [];
        for (const thread of scrapeInfo.response.data.data.children) {
            let entry = {};
            entry.title = thread.data.title.replaceAll('amp;', '');
            entry.author = thread.data.author;
            entry.url = thread.data.permalink;
            if (thread.data.media_metadata !== undefined) {
                let imgKey = Object.keys(thread.data.media_metadata)[0];
                let image = thread.data.media_metadata[imgKey].p[thread.data.media_metadata[imgKey].p.length - 1].u;
                entry.image = image.replaceAll('amp;', '');
            } else if (thread.data.preview?.images !== undefined) {
                let image = thread.data.preview.images[0].source.url;
                entry.image = image.replaceAll('amp;', '');
            }
            entry.date = luxon.DateTime.fromSeconds(thread.data.created_utc).toISO();
            elements.push(entry);
        }
        this.log(`Parsed ${elements.length} entries...`);
        return elements;
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd');
        let fileName = `${dateString}-${json.title.substring(0, 50)}`;
        return this.generateSlugFromString(fileName) + '.json';
    }

    getEmbed(content) {
        let embed = new Discord.EmbedBuilder({
            title: content.json.title,
            description: `(from ${content.json.author})`,
            url: `https://www.reddit.com${content.json.url}`,
            author: {
                name: 'r/WearOS Watchface Posts',
                url: 'https://www.reddit.com/r/WearOS',
                icon_url:
                    'https://styles.redditmedia.com/t5_gmj07/styles/communityIcon_rbbdv5hd4yr01.jpg?width=256&s=84150e6edcf82fb65cdd0cf5648503e88c819215',
            },
        });

        if (content.json.image !== undefined) {
            embed.image = {
                url: content.json.image,
            };
        }

        return embed;
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty;
    }
}

export default new ScraperWearOSWatchfaces();
