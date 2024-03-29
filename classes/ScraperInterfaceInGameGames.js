import jsdom from 'jsdom';
import * as Discord from 'discord.js';
import { WebsiteScraper } from './WebsiteScraper.js';
import luxon from 'luxon';

class ScraperInterfaceInGameGames extends WebsiteScraper {
    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document;
        let elements = [];

        let entities = page.querySelectorAll('ul > li > article > div.item__inner');
        this.log(`Parsing ${entities.length} entries...`);

        entities.forEach((element, index) => {
            let entry = {};

            entry.image = element.querySelector('div.item__media > picture > img')?.getAttribute('data-src');
            entry.title = element.querySelector('span.item__title-text')?.textContent.trim();
            entry.date = luxon.DateTime.fromFormat(
                element.querySelector('h3.item__subtitle')?.textContent.trim(),
                'MMMM d, yyyy',
            )
                .setZone('Europe/Berlin')
                .toISO();
            entry.url = element.querySelector('a.item__title-link')?.getAttribute('href');
            entry.genres = [];
            element.querySelectorAll('ul > li.tags__item:not(.tags__item--dots)').forEach((genre, genreIndex) => {
                entry.genres.push(genre.textContent.trim());
            });

            elements.push(entry);
        });

        return elements;
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd');
        let fileName = `${dateString}-${json.title.substring(0, 50)}`;
        return this.generateSlugFromString(fileName) + '.json';
    }

    getEmbed(content) {
        return new Discord.EmbedBuilder({
            title: 'A new game interface has been added!',
            description: `${content.json.title}\'s interface has been added.`,
            url: `https://interfaceingame.com/${content.json.url}`,
            image: {
                url: content.json.image,
            },
            author: {
                name: 'Interface In Game',
                url: 'https://interfaceingame.com/games/?sortby=recent_add',
                icon_url: 'https://etzbetz.io/stuff/yad/images/logo_interface_in_game.png',
            },
            fields: [
                {
                    name: 'Release date',
                    value: `<t:${luxon.DateTime.fromISO(content.json.date).toSeconds()}:D>`,
                    inline: true,
                },
                {
                    name: 'Genre(s)',
                    value: this.getGenreString(content.json.genres),
                    inline: true,
                },
            ],
        });
    }

    getGenreString(genreArr) {
        let finalString = '';

        genreArr.forEach((genre, index) => {
            if (index !== 0) finalString += ', ';
            finalString += genre;
        });
        return finalString;
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty;
    }
}

export default new ScraperInterfaceInGameGames();
