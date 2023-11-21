import jsdom from 'jsdom';
import luxon from 'luxon';
import * as Discord from 'discord.js';
import { WebsiteScraper } from './WebsiteScraper.js';
import yadBot from './YadBot.js';

class ScraperBlackBoard extends WebsiteScraper {
    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document;
        let elements = [];
        let entities = page.querySelectorAll('div.clearfix > div[style] > div');
        this.log(`Parsing ${entities.length} entries...`);

        entities.forEach((entity, index) => {
            if (entity.textContent.trim() !== '') {
                let entryParagraphs = [];

                entity
                    .querySelectorAll('div > div > div > div > div > *')
                    .forEach((entityParagraph, paragraphIndex) => {
                        let paragraph;
                        switch (entityParagraph.tagName.toLowerCase()) {
                            case 'p':
                                paragraph = entityParagraph.textContent.trim();
                                if (paragraphIndex === 0) {
                                    paragraph = paragraph.substring(paragraph.indexOf('|') + 1).trim();
                                }
                                break;
                            case 'ol':
                            case 'ul':
                                paragraph = '';
                                entityParagraph.querySelectorAll('li').forEach((listParagraph, listIndex) => {
                                    paragraph += `\n> ${listParagraph.textContent.trim()}\n`;
                                });
                                break;
                            default:
                                paragraph = `\n[ Unimplemented element <${entityParagraph.tagName.toLowerCase()}> ]\n`;
                                console.log('NEW PARAGRAPH ELEMENT NOT IMPLEMENTED!');
                                console.log(entityParagraph.tagName.toLowerCase());
                                console.log('NEW PARAGRAPH ELEMENT NOT IMPLEMENTED!');
                                yadBot.sendMessageToOwner(
                                    new Discord.EmbedBuilder({
                                        description: `Unimplemented element <${entityParagraph.tagName.toLowerCase()}> in BlackBoard scraper!`,
                                    }),
                                );
                        }
                        entityParagraph
                            .querySelectorAll('.SP-encrypted-email')
                            .forEach((mailAddressElement, addressIndex) => {
                                if (mailAddressElement.querySelector('i') !== null) {
                                    let rawMail = mailAddressElement.textContent.trim();

                                    let emailDomain = mailAddressElement.querySelector('i').textContent.trim();
                                    let emailDomainIndex = rawMail.indexOf(emailDomain);

                                    let emailName = rawMail.substring(0, emailDomainIndex);
                                    let emailTld = rawMail.substring(emailDomainIndex + emailDomain.length);

                                    let mailLink = `${emailName}@${emailDomain}.${emailTld}`;

                                    paragraph = paragraph.replace(mailAddressElement.textContent.trim(), mailLink);
                                } else if (mailAddressElement.tagName.toLowerCase() === 'a') {
                                    let mailLink = mailAddressElement.href?.trim();
                                    mailLink = mailLink.replace(/%E2%9A%B9/g, '@');
                                    mailLink = mailLink.replace(/%E2%97%A6/g, '.');
                                    mailLink = mailLink.replace(/mailto:/g, '');

                                    if (
                                        (paragraph.match(mailAddressElement.textContent.trim(), 'g') || []).length === 1
                                    ) {
                                        paragraph = paragraph.replace(mailAddressElement.textContent.trim(), mailLink);
                                    }
                                }
                            });
                        entryParagraphs.push(paragraph);
                    });

                let entryLinks = [],
                    entryDownloads = [];

                entity.querySelectorAll('div:nth-child(3) > ul.verteiler > li').forEach((linkContainer, linkIndex) => {
                    // let linkText = linkContainer.querySelector('a > strong')?.textContent.trim()
                    // let linkAddress = linkContainer.querySelector('a').href?.trim()
                    //
                    // if (linkAddress.substring(0, 1) === '/') {
                    //     linkAddress = 'https://www.fh-muenster.de' + linkAddress
                    // }
                    //
                    // let downloadText = linkContainer.querySelector('a[onclick]')?.textContent.trim()
                    // let downloadInfo = linkContainer.querySelector('a[onclick] > small')?.textContent.trim()
                    // downloadText = downloadText?.substring(0, downloadText.length - downloadInfo?.length).trim()
                    //
                    // if (downloadText === undefined) {
                    //     // button is link
                    //     entryLinks.push({text: linkText, address: linkAddress})
                    // } else {
                    //     // button is download
                    //     entryDownloads.push({text: downloadText, address: linkAddress, info: downloadInfo})
                    // }

                    let linkText = linkContainer.textContent.trim();
                    linkText = linkText.replace(/\s{2,}/g, ' ');
                    let linkAddress = linkContainer.querySelector('a').href?.trim();
                    if (linkAddress.substring(0, 1) === '/') {
                        linkAddress = 'https://www.fh-muenster.de' + linkAddress;
                    }

                    entryLinks.push({ text: linkText, address: linkAddress });
                });

                let entryDateString;
                let entryDateElement = entity.querySelector('div > div > p > strong');

                // check if the <strong> element exists
                if (entryDateElement !== null) {
                    entryDateString = entryDateElement?.textContent.trim();
                } else {
                    // otherwise go back to it's parent
                    entryDateElement = entity.querySelector('div > div > p');
                    let firstParagraph = entryDateElement?.textContent.trim();
                    entryDateString = firstParagraph?.substring(0, firstParagraph.indexOf('|') - 1).trim();
                }

                let entry = {
                    title: entity.querySelector('h2')?.textContent.trim(),
                    date:
                        entryDateString !== undefined && entryDateString !== null
                            ? this.parseDateString(entryDateString)
                            : undefined,
                    paragraphs: entryParagraphs,
                    links: entryLinks,
                    downloads: entryDownloads,
                };
                elements.push(entry);
            }
        });

        return elements;
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
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd');
        let fileName = `${dateString}-${json.title}`;
        return this.generateSlugFromString(fileName) + '.json';
    }

    getEmbed(content) {
        let paragraphString = '';

        content.json.paragraphs.forEach((paragraph, index) => {
            if (index !== 0) paragraphString += '\n';
            paragraphString += paragraph;
        });

        const regexLinks =
            /(?:(?:https?|ftp|file):\/\/|www\.|ftp\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[A-Z0-9+&@#/%=~_|$])/gi;
        let linkResults = [...paragraphString.matchAll(regexLinks)];

        const linkHintPrefix = '#LINK';
        const linkHintPostfix = '#';
        let linkIndex = 0;
        paragraphString = paragraphString.replace(regexLinks, () => {
            linkIndex++;
            return `${linkHintPrefix}${linkIndex}${linkHintPostfix}`;
        });
        linkIndex = 0; // aftercare for later re-use

        paragraphString = Discord.escapeMarkdown(paragraphString);

        const regexLinkHints = new RegExp(`(${linkHintPrefix}\\d+${linkHintPostfix})`, 'gm');
        paragraphString = paragraphString.replace(regexLinkHints, () => {
            linkIndex++;
            return `[\[Link: ${linkResults[linkIndex - 1][0]}\]](${linkResults[linkIndex - 1][0]})`;
        });

        let fields = [];

        let linkTitle = 'Link';
        let linkContent = '';
        if (content.json.links?.length > 0) {
            if (content.json.links?.length > 1) {
                linkTitle += 's';
            }

            content.json.links.forEach((link, index) => {
                if (index !== 0) linkContent += '\n';
                linkContent += `> [${link.text}](${link.address})`;
            });

            fields.push({
                name: `> ${linkTitle}:`,
                value: linkContent,
            });
        }
        let downloadTitle = 'Download';
        let downloadContent = '';
        if (content.json.downloads?.length > 0) {
            if (content.json.downloads?.length > 1) {
                downloadTitle += 's';
            }

            downloadTitle += 's';
            content.json.downloads.forEach((download, index) => {
                if (index !== 0) downloadContent += '\n';
                downloadContent += `> [${download.info} ${download.text}](${download.address})`;
            });

            fields.push({
                name: `> ${downloadTitle}:`,
                value: downloadContent,
            });
        }

        let footerString = `Alle Angaben ohne Gewähr!  •  `;

        let dateObj;
        if (content.json.date !== undefined) {
            dateObj = luxon.DateTime.fromISO(content.json.date);
        } else {
            dateObj = luxon.DateTime.local();
        }
        footerString += dateObj.toFormat('dd.MM.yyyy');

        return new Discord.EmbedBuilder({
            title: content.json.title !== undefined ? Discord.escapeMarkdown(content.json.title) : 'Neuer Aushang',
            description: paragraphString,
            url: this.buildUrl(content),
            footer: {
                text: footerString,
            },
            author: {
                name: 'Fachhochschule Münster',
                url: 'https://fh-muenster.de',
                icon_url: 'https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg',
            },
            fields: fields,
        });
    }

    buildUrl(content) {
        let url = `https://www.fh-muenster.de/eti/aktuell/aushang/index.php`;
        url += `#:~:text=`;
        url += encodeURI(content.json.title);
        return url;
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty;
    }
}

export default new ScraperBlackBoard();
