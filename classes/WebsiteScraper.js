import * as rax from 'retry-axios';
import axios from 'axios';
import * as Discord from 'discord.js';
import yadBot from './YadBot.js';
import { debugLog, errorLog, log } from '../index.js';
import jsdom from 'jsdom';
import luxon from 'luxon';
import files from './Files.js';
import EmbedColors from '../constants/EmbedColors.js';
import * as TerminalColors from '../constants/TerminalColors.js';

export class WebsiteScraper {
    constructor() {
        this.timer = null;
        this.setup();
    }

    getScrapingInterval() {
        return files.readJson(this.getScraperConfigPath(), 'interval_milliseconds', false, 600000);
    }

    getSubUserIds() {
        return files.readJson(this.getScraperConfigPath(), 'sub_user_ids', false, [
            files.readJson(yadBot.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE'),
        ]);
    }

    getSubGuildChannelIds() {
        return files.readJson(this.getScraperConfigPath(), 'sub_guild_channel_ids', false, []);
    }

    log(...message) {
        log(`${TerminalColors.red}[${this.constructor.name.substring(7)}]${TerminalColors.reset}\t${message}`);
    }

    debugLog(...message) {
        debugLog(`${TerminalColors.red}[${this.constructor.name.substring(7)}]${TerminalColors.reset}\t${message}`);
    }

    errorLog(...message) {
        errorLog(`${TerminalColors.red}[${this.constructor.name.substring(7)}]${TerminalColors.reset}\t${message}`);
    }

    setup() {
        console.log(`${this.constructor.name}:\tSetting Up...`);

        let scraperState = files.readJson(this.getScraperConfigPath(), 'enabled', false, true);
        if (scraperState === true) {
            setTimeout(() => {
                this.createTimerInterval();
            }, 5000);
        }
    }

    createTimerInterval() {
        this.timeIntervalBody();
        this.timer = setInterval(() => {
            try {
                this.timeIntervalBody();
            } catch (e) {
                console.log(e);
                yadBot.sendMessageToOwner(e);
            }
        }, this.getScrapingInterval());
    }

    destroyTimerInterval() {
        this.log(`Destroying Interval...`);
        clearInterval(this.timer);
    }

    async timeIntervalBody() {
        let scrapeInfo = {};
        if (await this.shouldExecute()) {
            this.log(`Fetching and parsing website...`);
            try {
                scrapeInfo.url = await this.getScrapingUrl(scrapeInfo);
            } catch (e) {
                yadBot.sendMessageToOwner(
                    `Error 1 while trying to get scraping url in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``,
                );
            }
            try {
                scrapeInfo.response = await this.requestWebsite(scrapeInfo.url);
            } catch (e) {
                yadBot.sendMessageToOwner(
                    `Error 2 while requesting website in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``,
                );
            }
            scrapeInfo.content = [];
            try {
                let jsonContents = await this.parseWebsiteContentToJSON(scrapeInfo);
                for (let jsonContent of jsonContents) {
                    scrapeInfo.content.push({
                        json: jsonContent,
                    });
                }
            } catch (e) {
                yadBot.sendMessageToOwner(
                    `Error 3 while parsing response to JSON in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``,
                );
            }
            this.filterNewContent(scrapeInfo);
            let newContentCount = 0;
            for (let entry of scrapeInfo.content) {
                if (entry.newData === true) newContentCount++;
            }
            if (newContentCount >= 1)
                this.log(`Found entries: ${scrapeInfo.content.length}, New entries: ${newContentCount}`);
            if (yadBot.getBot().user === null) {
                this.log('Bot is not yet online, not sending messages..');
                // todo: the loop is never ending, fix somehow.
                while (yadBot.getBot().user === null) {}
                this.log('Bot is now online! Sending messages..');
            }
            scrapeInfo.content = scrapeInfo.content.sort(this.getSortingFunction());
            if (newContentCount >= 1) this.log(`Generating ${newContentCount} embed(s)...`);
            for (let content of scrapeInfo.content) {
                try {
                    if (content.newData === true) {
                        content.embed = this.filterEmbedLength(await this.getEmbed(content));
                        content.components = await this.getComponents(content);
                    }
                } catch (e) {
                    yadBot.sendMessageToOwner(
                        `Error 4 while generating embeds and filtering length in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``,
                    );
                }
            }
            if (newContentCount >= 1) {
                try {
                    await this.sendEmbedMessages(scrapeInfo);
                } catch (e) {
                    yadBot.sendMessageToOwner(
                        `Error 5 while sending embeds in"${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``,
                    );
                }
            }
        } else {
            this.log(`Cancelling current execution.`);
        }
    }

    async shouldExecute() {
        return true;
    }

    getUserAgent() {
        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36';
    }

    getExpectedResponseType() {
        return 'text/html';
    }

    getContentType() {
        return 'text/html; charset=UTF-8';
    }

    getRequestBody() {
        return '';
    }

    async getScrapingUrl(scrapeInfo) {
        return files.readJson(this.getScraperConfigPath(), 'scraping_url', true, 'ENTER SCRAPING URL HERE');
    }

    async requestWebsite(url) {
        return await axios({
            method: files.readJson(this.getScraperConfigPath(), 'http_method', false, 'GET'),
            url: url,
            headers: {
                'User-Agent': this.getUserAgent(),
                'Content-Type': this.getContentType(),
            },
            data: this.getRequestBody(),
            responseType: this.getExpectedResponseType(),
            raxConfig: {
                retry: 5,
                noResponseRetries: 5,
                retryDelay: 100,
            },
        });
    }

    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document;
        let elements = [];
        let entities = page.querySelectorAll('title');

        entities.forEach((entity, index) => {
            elements.push({
                title: entity.textContent.trim(),
            });
        });

        return elements;
    }

    filterNewContent(scrapeInfo) {
        for (let contentIndex in scrapeInfo.content) {
            if (!scrapeInfo.content.hasOwnProperty(contentIndex)) continue;
            const fileName = this.generateFileName(scrapeInfo.content[contentIndex].json);
            const filePath = `${this.getScraperEmbedPath()}/${fileName}`;

            let readData = files.readJson(filePath, 'data', false, []);
            let latestData = readData[readData.length - 1];
            if (latestData === undefined) latestData = {};

            if (JSON.stringify(latestData) !== JSON.stringify(scrapeInfo.content[contentIndex].json)) {
                scrapeInfo.content[contentIndex].newData = true;
                readData.push(scrapeInfo.content[contentIndex].json);
                this.log(`Saving new or updated JSON data in '${fileName}'...`);
                files.writeJson(filePath, 'data', readData);
            } else {
                scrapeInfo.content[contentIndex].newData = false;
            }
        }
    }

    getGlobalScraperFolderPath() {
        return './scraperFiles';
    }

    getScraperFolderPath() {
        return `${this.getGlobalScraperFolderPath()}/${this.constructor.name}`;
    }

    getScraperConfigPath() {
        return `${this.getScraperFolderPath()}/config/config.json`;
    }

    getScraperEmbedPath() {
        return `${this.getScraperFolderPath()}/embeds`;
    }

    generateFileName(json) {
        let fileName = `test`;
        return this.generateSlugFromString(fileName) + '.json';
    }

    async sendEmbedMessages(scrapeInfo) {
        let sendState = files.readJson(this.getScraperConfigPath(), 'send_embeds', false, true);
        let globalSendState = files.readJson(yadBot.getYadConfigPath(), 'global_send_embeds', false, true);
        let newContentCount = 0;
        for (let entry of scrapeInfo.content) {
            if (entry.newData === true) newContentCount++;
        }
        if (newContentCount === 0 || !sendState || !globalSendState) return;
        this.log(`Sending and updating ${newContentCount} embed(s)...`);

        for (let channelId of this.getSubGuildChannelIds()) {
            try {
                let embedTargetChannel = await yadBot.getBot().channels.fetch(channelId);
                if (yadBot.getBot().user === null) continue;
                this.log(
                    `Sending and updating embed(s) in Guild "${embedTargetChannel.guild.name}", Channel "${embedTargetChannel.name}"`,
                );
                for (let contentEntry of scrapeInfo.content) {
                    if (contentEntry.newData !== true) continue;
                    const fileName = this.generateFileName(contentEntry.json);
                    const filePath = `${this.getScraperEmbedPath()}/${fileName}`;
                    let sentChannels = files.readJson(filePath, 'sent_channels', false, {
                        guild_message_ids: [],
                        user_message_ids: [],
                    });
                    let messageDataToUpdate = sentChannels.guild_message_ids?.find((sentMessageData) => {
                        return sentMessageData.channelId === embedTargetChannel.id;
                    });
                    if (messageDataToUpdate !== undefined) {
                        let messageToUpdate = await embedTargetChannel.messages.fetch(messageDataToUpdate.messageId);
                        // todo: if message is older than x, send new instead of edit
                        await messageToUpdate.edit({
                            embeds: [contentEntry.embed],
                            components: contentEntry.components,
                        });
                    } else {
                        let sentMessage = await embedTargetChannel
                            ?.send({
                                embeds: [contentEntry.embed],
                                components: contentEntry.components,
                            })
                            .catch((e) => {
                                yadBot.sendMessageToOwner(
                                    `error with guild ${embedTargetChannel?.guild?.id} channel ${embedTargetChannel?.id}. also notified guild admins`,
                                );
                                this.sendMissingAccessToGuildAdmins(embedTargetChannel.guild.id);
                                console.dir(e);
                            });
                        if (sentMessage !== undefined) {
                            sentChannels.guild_message_ids.push({
                                messageId: sentMessage.id,
                                channelId: sentMessage.channel.id,
                            });
                            files.writeJson(filePath, 'sent_channels', sentChannels);
                        }
                    }
                }
            } catch (e) {
                if (
                    e.code === Discord.Constants.APIErrors.UnknownChannel ||
                    e.code === Discord.Constants.APIErrors.MissingAccess
                ) {
                    this.toggleSubscriptionInFile(channelId, true);
                } else {
                    yadBot.sendMessageToOwner(
                        `Error while sending embeds in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``,
                    );
                }
            }
        }

        for (let userId of this.getSubUserIds()) {
            try {
                let embedTargetUser = await yadBot.getBot().users.fetch(userId);
                if (yadBot.getBot().user === null) continue;
                this.log(`Sending and updating embed(s) for ${embedTargetUser.username}`);
                for (let contentEntry of scrapeInfo.content) {
                    if (contentEntry.newData !== true) continue;
                    const fileName = this.generateFileName(contentEntry.json);
                    const filePath = `${this.getScraperEmbedPath()}/${fileName}`;
                    let sentChannels = files.readJson(filePath, 'sent_channels', false, {
                        guild_message_ids: [],
                        user_message_ids: [],
                    });
                    let messageDataToUpdate = sentChannels.user_message_ids.find((sentMessageData) => {
                        return sentMessageData.userId === embedTargetUser.id;
                    });
                    if (messageDataToUpdate !== undefined) {
                        // todo: if message is older than x, send new instead of edit
                        let messageToUpdate = await (
                            await embedTargetUser.createDM()
                        ).messages.fetch(messageDataToUpdate.messageId);
                        await messageToUpdate.edit({
                            embeds: [contentEntry.embed],
                            components: contentEntry.components,
                        });
                    } else {
                        let sentMessage = await embedTargetUser
                            ?.send({
                                embeds: [contentEntry.embed],
                                components: contentEntry.components,
                            })
                            .catch((e) => console.dir(e));
                        if (sentMessage !== undefined) {
                            sentChannels.user_message_ids.push({
                                messageId: sentMessage.id,
                                userId: embedTargetUser.id,
                            });
                            files.writeJson(filePath, 'sent_channels', sentChannels);
                        }
                    }
                }
            } catch (e) {
                if (
                    e.code === Discord.Constants.APIErrors.UNKNOWN_CHANNEL ||
                    e.code === Discord.Constants.APIErrors.MISSING_ACCESS
                ) {
                    this.toggleSubscriptionInFile(userId, false);
                } else {
                    yadBot.sendMessageToOwner(
                        `Error while sending embeds in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``,
                    );
                }
            }
        }
    }

    getEmbed(content) {
        return new Discord.EmbedBuilder({
            title: 'Preview Embed',
            description: `Website title: "${content.json.title}"`,
            color: EmbedColors.GREEN,
            url: this.getScrapingUrl(),
        });
    }

    getComponents(content) {
        return [];

        // new Discord.ActionRowBuilder({
        //     components: [
        //         new Discord.ButtonBuilder({
        //             label: "Google",
        //             style: Discord.ButtonStyle.Link,
        //             url: "https://google.de/"
        //         }),
        //     ]
        // })
    }

    getSortingFunction() {
        return function (jsonA, jsonB) {
            return 0;
        };
    }

    sortJsonByIsoDateAndTitleProperty(contentA, contentB) {
        const jsonADate = parseInt(luxon.DateTime.fromISO(contentA.json.date).toFormat('yyyyMMddHHmmss'), 10);
        const jsonBDate = parseInt(luxon.DateTime.fromISO(contentB.json.date).toFormat('yyyyMMddHHmmss'), 10);

        if (jsonADate < jsonBDate) {
            // console.log(`contentB is newer: ${jsonBDate} > ${jsonADate}`)
            return -1;
        } else if (jsonADate > jsonBDate) {
            // console.log(`contentA is newer: ${jsonADate} > ${jsonBDate}`)
            return 1;
        } else if (contentB.json.title > contentA.json.title) {
            // console.log(`contentB is newer: ${contentB.json.title} > ${contentA.json.title}`)
            return -1;
        } else if (contentA.json.title > contentB.json.title) {
            // console.log(`contentA is newer: ${contentA.json.title} > ${contentB.json.title}`)
            return 1;
        }
        // console.log(`sorting: ${jsonADate} === ${jsonBDate} && ${contentA.json.title} === ${contentB.json.title}`)
        return 0;
    }

    getUpdateEmbed() {
        this.log(`Generating Update-embed...`);
        return new Discord.EmbedBuilder({
            title: `Update`,
            description: `Yad has been updated, some embeds will eventually be resent!`,
        });
    }

    sendMissingAccessToGuildAdmins(guildId) {
        const noticeEmbed = new Discord.EmbedBuilder({
            title: `Notice`,
            description: `New data is available from ${this.constructor.name}, but I can't send it to your specified channel. Eventually I have been kicked or I do not have permissions to send in that channel?`,
            color: EmbedColors.ORANGE,
        });

        yadBot
            .getBot()
            .guilds.fetch(guildId)
            .then((guild) => {
                guild.owner?.send({ embeds: [noticeEmbed] });
            })
            .catch((e) => {
                this.errorLog("Could not message the guild's scraper channel and not the owner of that guild!");
                yadBot.sendMessageToOwner(
                    `Could not message the guild's scraper channel and not the owner of that guild!`,
                );
                console.dir(e);
            });
    }

    async sendUnreliableEmbedToSubscribers() {
        const updateEmbed = new Discord.EmbedBuilder({
            title: `Notice`,
            description: `New data is available from this scraper (${
                this.constructor.name
            }), but due to changes in the received data, Yad can not process it without error.\nYou can visit the page [here](${await this.getScrapingUrl()}) to inform yourself about changes.\nThis issue will be worked on as soon as possible and the owner knows about it.`,
            color: EmbedColors.ORANGE,
        });

        this.getSubGuildChannelIds().forEach((channelId) => {
            yadBot
                .getBot()
                .channels.fetch(channelId)
                .then((channel) => {
                    if (yadBot.getBot().user === null) return;
                    this.log(`Sending embed(s) to ${channel.guild.name}:${channel.name}`);
                    channel.send({ embeds: [updateEmbed] }).catch((e) => console.dir(e));
                })
                .catch((e) => {
                    this.log(`Guild Channel '${channelId}' could not be found.`);
                    console.dir(e);
                });
        });
        this.getSubUserIds().forEach((userId) => {
            yadBot
                .getBot()
                .users.fetch(userId)
                .then((user) => {
                    if (yadBot.getBot().user === null) return;
                    this.log(`Sending embed(s) to ${user.username}`);
                    user?.send({ embeds: [updateEmbed] }).catch((e) => console.dir(e));
                })
                .catch((e) => {
                    this.log(`User '${userId}' could not be found.`);
                    console.dir(e);
                });
        });
    }

    filterEmbedLength(embed) {
        const TITLE_LIMIT = 256;
        const DESCRIPTION_LIMIT = 2048;
        const FIELDS_COUNT_LIMIT = 25;
        const FIELDS_NAME_LIMIT = 256;
        const FIELDS_VALUE_LIMIT = 1024;
        const FOOTER_TEXT_LIMIT = 2048;
        const AUTHOR_NAME_LIMIT = 256;
        const TOTAL_CHARACTERS_LIMIT = 6000;

        // TODO: eventually use filterActive to display or send hint about filtering
        let filterActive = false;

        if (embed.data?.title?.length > TITLE_LIMIT) {
            filterActive = true;
            this.log(`Title limit has been exceeded in current embed "${embed.data.title.substring(0, 50)}"!`);
            embed.data.title = this.cutStringAddDots(embed.data.title, TITLE_LIMIT);
        }
        if (embed.data?.description?.length > DESCRIPTION_LIMIT) {
            filterActive = true;
            this.log(
                `Description limit has been exceeded in current embed "${embed.data.description.substring(0, 50)}"!`,
            );
            embed.data.description = this.cutStringAddDots(embed.data.description, DESCRIPTION_LIMIT);
        }
        if (embed?.fields?.length > FIELDS_COUNT_LIMIT) {
            filterActive = true;
            this.log(
                `Fields count limit has been exceeded in current embed "${embed.data.title.substring(0, 50)}": ${
                    embed.data.fields.length
                }!`,
            );
            let numOfCutFields = embed.data.fields.length - FIELDS_COUNT_LIMIT;
            embed.data.fields.splice(-1, numOfCutFields);

            embed.data.footer.text += `\nSYSTEM MESSAGE: ${numOfCutFields} fields have been cut to be able to send this message.`;
        }
        embed.data?.fields?.forEach((field, index) => {
            if (field.name?.length > FIELDS_NAME_LIMIT) {
                filterActive = true;
                this.log(
                    `Field name limit has been exceeded in current embed "${index}(${field.name.substring(0, 50)})"!`,
                );
                field.name = this.cutStringAddDots(field.name, FIELDS_NAME_LIMIT);
            }
            if (field.value?.length > FIELDS_VALUE_LIMIT) {
                filterActive = true;
                this.log(
                    `Field value limit has been exceeded in current embed "${index}(${field.value.substring(0, 50)})"!`,
                );
                field.value = this.cutStringAddDots(field.value, FIELDS_VALUE_LIMIT);
            }
        });
        if (embed.data?.footer?.text?.length > FOOTER_TEXT_LIMIT) {
            filterActive = true;
            this.log(
                `Footer text limit has been exceeded in current embed "${embed.data.footer.text.substring(0, 50)}"!`,
            );
            embed.data.footer.text = this.cutStringAddDots(embed.data.footer.text, FOOTER_TEXT_LIMIT);
        }
        if (embed.data?.author?.name?.length > AUTHOR_NAME_LIMIT) {
            filterActive = true;
            this.log(
                `Author name limit has been exceeded in current embed "${embed.data.author.name.substring(0, 50)}"!`,
            );
            embed.data.author.name = this.cutStringAddDots(embed.data.author.name, AUTHOR_NAME_LIMIT);
        }

        if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
            filterActive = true;
            this.log(
                `Total characters limit has been exceeded in current embed "${embed.data.title?.substring(
                    0,
                    50,
                )}:${embed.data.description?.substring(0, 50)}"!`,
            );
            if (embed.data.footer.text.length >= 1) {
                this.log(`Cutting footer!`);
                let newFooterLength =
                    embed.data.footer.text.length -
                    (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT);
                embed.data.footer.text = this.cutStringAddDots(embed.data.footer.text, newFooterLength);
            }

            if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
                if (embed.data.author.name.length >= 1) {
                    this.log(`Cutting author!`);
                    let newAuthorLength =
                        embed.data.author.name.length -
                        (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT);
                    embed.data.author.name = this.cutStringAddDots(embed.data.author.name, newAuthorLength);
                }

                if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
                    if (embed.data.title.length >= 1) {
                        this.log(`Cutting title!`);
                        let newTitleLength =
                            embed.data.title.length -
                            (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT);
                        embed.data.title = this.cutStringAddDots(embed.data.title, newTitleLength);
                    }
                }

                if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
                    if (embed.data.description.length >= 1) {
                        this.log(`Cutting description!`);
                        let newDescriptionLength =
                            embed.data.description.length -
                            (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT);
                        embed.data.description = this.cutStringAddDots(embed.data.description, newDescriptionLength);
                    }

                    while (
                        this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT ||
                        embed.data.fields.length === 1
                    ) {
                        this.log(`Cutting last field!`);
                        embed.data.fields.pop();
                    }
                }
            }
        }

        return embed;
    }

    getTotalCharactersLengthFromEmbed(embed) {
        let totalCharactersLength = 0;
        if (embed.title?.length !== undefined) totalCharactersLength += embed.title?.length;
        if (embed.description?.length !== undefined) totalCharactersLength += embed.description?.length;
        if (embed.footer?.text?.length !== undefined) totalCharactersLength += embed.footer?.text?.length;
        if (embed.author?.name?.length !== undefined) totalCharactersLength += embed.author?.name?.length;

        let totalFieldsCharactersLength = 0;
        embed.fields?.forEach((field, index) => {
            totalFieldsCharactersLength += field.name?.length + field.value?.length;
        });

        return totalCharactersLength + totalFieldsCharactersLength;
    }

    cutStringAddDots(string, maxLength, extraStringEnd = null) {
        let stringEnd = '\n **(...)**';
        if (extraStringEnd !== null) stringEnd = extraStringEnd;

        if (typeof string === 'string') {
            return string.substring(0, maxLength - stringEnd.length) + stringEnd;
        } else {
            this.log('string to cut is not a string:', typeof string);
            return string;
        }
    }

    async subscribe(interaction) {
        let interactionChannel = interaction.channel;
        if (interactionChannel === null) {
            interactionChannel = await yadBot
                .getBot()
                .channels.fetch(interaction.channelId, { cache: true, force: true });
        }

        // console.log(interactionChannel.type)
        switch (interactionChannel.type) {
            case Discord.ChannelType.DM:
                let subscriptionResult = this.toggleSubscriptionInFile(interaction.user.id, false);
                let sendTestMessageResult = true;
                if (subscriptionResult) {
                    try {
                        let testMessage = await interaction.user.send({
                            embeds: [
                                new Discord.EmbedBuilder({
                                    title: 'Test Message',
                                    description: `You can safely ignore this message, I am just testing if it is possible to send you a direct message.`,
                                    color: EmbedColors.GREEN,
                                }),
                            ],
                        });
                        await testMessage.edit({
                            embeds: [
                                new Discord.EmbedBuilder({
                                    title: 'Test Message',
                                    description: `You can safely ignore this message, I am just testing if it is possible to send you a direct message.\n*I now tried to edit it, which has worked. Nice!*`,
                                    color: EmbedColors.GREEN,
                                }),
                            ],
                        });
                        await testMessage.delete();
                    } catch (e) {
                        sendTestMessageResult = false;
                        this.toggleSubscriptionInFile(interaction.user.id, false);
                    }
                    if (sendTestMessageResult) {
                        return {
                            error: false,
                            data: `You have been **added** to the subscribers list of scraper **${this.constructor.name}**.`,
                        };
                    } else {
                        return {
                            error: true,
                            data: `You have **not** been added to the subscribers list of scraper **${this.constructor.name}**.\nThis is because I was not able to send you a private message. Make sure to turn off the following Setting:\n\`User settings > Privacy & Security > Allow Direct Messages from Server members\``,
                        };
                    }
                } else {
                    return {
                        error: false,
                        data: `You have been **removed** from the subscribers list of scraper **${this.constructor.name}**.`,
                    };
                }
                break;
            case Discord.ChannelType.GuildText:
            case Discord.ChannelType.GuildNews:
                if (interaction.member.permissions.has(Discord.PermissionsBitField.Flags.Administrator)) {
                    let subscriptionResult = this.toggleSubscriptionInFile(interactionChannel.id, true);
                    if (subscriptionResult) {
                        return {
                            error: false,
                            data: `This channel has been **added** to the subscribers list of scraper **${this.constructor.name}**.`,
                        };
                    } else {
                        return {
                            error: false,
                            data: `This channel has been **removed** from the subscribers list of scraper **${this.constructor.name}**.`,
                        };
                    }
                } else {
                    return {
                        error: true,
                        data: `You need admin permissions on this server to be able to manage subscriptions.`,
                    };
                }
                break;
            default:
                return {
                    error: true,
                    data: `Unknown type of channel.`,
                };
                break;
        }
    }

    toggleSubscriptionInFile(channelId, isGuildChannel) {
        let propertyToChange = isGuildChannel ? 'sub_guild_channel_ids' : 'sub_user_ids';

        let subChannels = files.readJson(this.getScraperConfigPath(), propertyToChange, false, []);
        let indexResultChannel = subChannels.indexOf(channelId);
        if (indexResultChannel === -1) {
            subChannels.push(channelId);
        } else {
            subChannels.splice(indexResultChannel, 1);
        }
        files.writeJson(this.getScraperConfigPath(), propertyToChange, subChannels);
        return indexResultChannel === -1;
    }

    generateSlugFromString(originalString) {
        const regexDisallowedChars = /([^a-zA-Z0-9])+/gm;

        // todo: will only recognize text greater than 3 letters! find other regex!
        const regexSequenceFilter = /[^a-zA-Z0-9]*([a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9])[^a-zA-Z0-9]*/gm;
        const regexAE = /[ä]/g;
        const regexOE = /[ö]/g;
        const regexUE = /[ü]/g;
        const regexMultipleHyphens = /--+/g;

        let replaced = originalString.toLowerCase();
        replaced = replaced.replace(regexAE, 'ae');
        replaced = replaced.replace(regexOE, 'oe');
        replaced = replaced.replace(regexUE, 'ue');
        replaced = replaced.replace(regexDisallowedChars, '-');
        replaced = replaced.replace(regexMultipleHyphens, '-');

        let slugStringResult = regexSequenceFilter.exec(replaced);

        return slugStringResult[1];
    }
}
