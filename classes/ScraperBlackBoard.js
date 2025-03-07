import jsdom from 'jsdom';
import luxon from 'luxon';
import * as Discord from 'discord.js';
import { WebsiteScraper } from './WebsiteScraper.js';
import yadBot from './YadBot.js';
import { chromium } from 'playwright';

class ScraperBlackBoard extends WebsiteScraper {
    async parseWebsiteContentToJSON(scrapeInfo) {

        const browser = await chromium.launch({
            headless: true,
        });
        const context = await browser.newContext();
        const browserPage = await context.newPage();
        await browserPage.goto('https://www.fh-muenster.de/de/eti/aktuelles/schwarzes-brett');
        await browserPage.waitForLoadState('networkidle');
        await browserPage.screenshot({ path: 'example.png' });
        const locator = browserPage.locator('div:has(>h3)');
        // console.log(locator);
        // console.log(Object.keys(locator));
        // console.log(Object.keys(locator._frame));
        const content = await locator.evaluateAll((elements) => {
            const content = [];
            elements.forEach((element) => {
                let data = {
                    title: element.querySelector('h3').innerText,
                    date: element.querySelector('p>strong').innerText.substring(0, 10),
                    content: element.querySelector('p').innerText.substring(13),
                };
                content.push(data);
            });
            return content;
        });
        this.log(`Parsed ${content.length} entries...`);

        await browser.close();
        return content;
    }

    parseDateString(dateString) {
        // index 1 = dd     -> "06"
        // index 2 = MM     -> "09"
        // index 3 = yyyy   -> "2020"
        const regexCustomDate = /(\d+).(\d+).(\d{4})/;

        let dateRegexResult = regexCustomDate.exec(dateString);
        if (dateRegexResult === null) {
            return;
        }

        let day = parseInt(dateRegexResult[1], 10);
        let month = parseInt(dateRegexResult[2], 10);
        let year = parseInt(dateRegexResult[3], 10);

        return luxon.DateTime.fromFormat(`${day}.${month}.${year}`, 'd.M.yyyy').setZone('Europe/Berlin').toISO();
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromFormat(json.date, 'dd.MM.yyyy').toFormat('yyyy-MM-dd');
        let fileName = `${dateString}-${json.title}`;
        return this.generateSlugFromString(fileName) + '.json';
    }

    getEmbed(content) {
        let footerString = `Alle Angaben ohne Gewähr!  •  `;

        let dateObj = this.parseDateString(content.json.date);
        if (content.json.date !== undefined) {
            dateObj = luxon.DateTime.fromISO(dateObj);
        } else {
            dateObj = luxon.DateTime.local();
        }
        footerString += dateObj.toFormat('dd.MM.yyyy');

        return new Discord.EmbedBuilder({
            title: content.json.title !== undefined ? Discord.escapeMarkdown(content.json.title) : 'Neuer Aushang',
            description: content.json.content,
            url: this.buildUrl(content),
            footer: {
                text: footerString,
            },
            author: {
                name: 'Fachhochschule Münster',
                url: 'https://fh-muenster.de',
                icon_url: 'https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg',
            },
        });
    }

    buildUrl(content) {
        let url = `https://www.fh-muenster.de/de/eti/aktuelles/schwarzes-brett`;
        url += `#:~:text=`;
        url += encodeURI(content.json.title);
        return url;
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty;
    }
}

export default new ScraperBlackBoard();
