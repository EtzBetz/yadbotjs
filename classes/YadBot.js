import fs from 'fs';
import { Client, ActivityType, GatewayIntentBits, Events, Collection } from 'discord.js';
import ScraperBlackBoard from './ScraperBlackBoard.js';
import ScraperMensaFHMuenster from './ScraperMensaFHMuenster.js';
import ScraperFreeEpicGames from './ScraperFreeEpicGames.js';
import ScraperFreeSteamGames from './ScraperFreeSteamGames.js';
import ScraperFreeUbisoftGames from './ScraperFreeUbisoftGames.js'; //not confirmed working
import ScraperGuildWars2News from './ScraperGuildWars2News.js';
import ScraperTeamspeakBadges from './ScraperTeamspeakBadges.js';
import ScraperMovieReleases from './ScraperMovieReleases.js';
import ScraperInterfaceInGameGames from './ScraperInterfaceInGameGames.js';
import ScraperInterfaceInGameArticles from './ScraperInterfaceInGameArticles.js';
import ScraperTSBThreadWatch from './ScraperTSBThreadWatch.js'; //not confirmed working
import ScraperCanIUseNews from './ScraperCanIUseNews.js';
import ScraperFreeUEAssets from './ScraperFreeUEAssets.js';
import ScraperMakerSpaceEvents from './ScraperMakerSpaceEvents.js';
import { log, debugLog } from '../index.js';
import files from './Files.js';
import * as diff from 'diff';
import EmbedColors from '../constants/EmbedColors.js';

class YadBot {
    constructor() {
        let activityTypeToSet;
        let activityTextToSet = files.readJson(
            this.getYadConfigPath(),
            'custom_activity_text',
            false,
            ' mit Slash Commands',
        );
        switch (files.readJson(this.getYadConfigPath(), 'custom_activity_type', false, 'playing')) {
            case 'playing':
                activityTypeToSet = ActivityType.Playing;
                break;
            case 'streaming':
                activityTypeToSet = ActivityType.Streaming;
                break;
            case 'listening':
                activityTypeToSet = ActivityType.Listening;
                break;
            case 'watching':
                activityTypeToSet = ActivityType.Watching;
                break;
            case 'custom':
                activityTypeToSet = ActivityType.Custom;
                break;
            case 'competing':
                activityTypeToSet = ActivityType.Competing;
                break;
        }

        this.bot = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                // GatewayIntentBits.GuildModeration,
                // GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildWebhooks,
                // GatewayIntentBits.GuildInvites,
                // GatewayIntentBits.GuildVoiceStates,
                // GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                // GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageReactions,
                // GatewayIntentBits.DirectMessageTyping,
                // GatewayIntentBits.MessageContent,
                // GatewayIntentBits.GuildScheduledEvents,
                // GatewayIntentBits.AutoModerationConfiguration,
                // GatewayIntentBits.AutoModerationExecution
            ],
            partials: ['CHANNEL'],
            presence: {
                activities: [{ type: activityTypeToSet, name: activityTextToSet }],
            },
        });

        this.bot.commands = new Collection();
        this.commandFiles = [];
        this.eventFiles = [];
        this.scrapers = [];

        this.bot.once(Events.ClientReady, async () => {
            // todo: build in waiting for the main bot to come online (interval in scrapers?)
            this.scrapers = [
                ScraperFreeSteamGames,
                ScraperFreeUbisoftGames,
                ScraperFreeEpicGames,
                ScraperFreeUEAssets,
                ScraperTeamspeakBadges,
                ScraperBlackBoard,
                ScraperMensaFHMuenster,
                ScraperInterfaceInGameGames,
                ScraperInterfaceInGameArticles,
                ScraperCanIUseNews,
                ScraperMovieReleases,
                ScraperGuildWars2News,
                ScraperTSBThreadWatch,
                ScraperMakerSpaceEvents,
            ];
            await this.bindCommands();
            await this.bindEvents();
            log(`-------------------------------`);
            log(`I'm online as "${this.bot.user.tag}"!`);
            log(`I see ${this.bot.guilds.cache.size} guild(s) and ${this.bot.users.cache.size} user(s):`);
            this.bot.guilds.cache.forEach((guild) => {
                log(` - ${guild.name}\t( ${guild.id} )`);
            });
            log(`-------------------------------`);
        });

        // this.bot.on(Events.Debug, async (event) => {
        //     console.log(event)
        // })
        //
        // this.bot.on(Events.Error, async (event) => {
        //     console.log(event)
        // })
        //
        // this.bot.on(Events.ShardError, async (event) => {
        //     console.log(event)
        // })
        //
        // this.bot.on(Events.Raw, async (event) => {
        //     console.log(event)
        // })
        process.on('unhandledRejection', (error) => {
            console.error('Unhandled promise rejection:', error);
        });

        let botToken = files.readJson(this.getYadConfigPath(), 'token', true, 'ENTER BOT TOKEN HERE');
        this.bot.login(botToken).then(() => {});
        this.exitBindings();
    }

    exitBindings() {
        // Even if the process gets an call to exit, continues until the exitHandler function is finished
        process.stdin.resume();

        //		process.on('exit', this.exitHandler.bind(this))
        //		process.on('SIGINT', this.exitHandler.bind(this, {exit:true}))
        //		process.on('SIGUSR1', this.exitHandler.bind(this, {exit:true}))
        //		process.on('SIGUSR2', this.exitHandler.bind(this, {exit:true}))
        //		process.on('uncaughtException', this.exitHandler.bind(this, {exit:true}))
    }

    exitHandler(options, exitCode) {
        // destroy the Discord connection of the bot
        this.getBot()?.destroy();

        // exit the node process
        process.exit(0);
    }

    getScraperChoiceData() {
        let data = [];

        this.scrapers.forEach((scraper) => {
            data.push({
                name: scraper.constructor.name,
                value: scraper.constructor.name,
            });
        });

        return data;
    }

    async bindCommands() {
        this.commandFiles = fs.readdirSync(`./slashcommands/`).filter((file) => file.endsWith('.js'));
        this.bot.commands.clear();
        let commandsDataArr = [];

        for (const file of this.commandFiles) {
            let command = await import(`./../slashcommands/${file}`);
            if (command.default.enabled === false) continue;
            let commandData = command.default.getData();
            await this.bot.commands.set(commandData.name, command.default);
            commandsDataArr.push(commandData);
        }
        if (!files.readJson(this.getYadConfigPath(), 'prod', false, false)) {
            let testServer = files.readJson(this.getYadConfigPath(), 'test_server', true, 'ENTER TEST SERVER ID HERE');
            this.bot.guilds.cache
                .get(testServer)
                ?.commands.set(commandsDataArr)
                .then((commandResult) => {});
        }
        this.bot.application.commands.set(commandsDataArr).then((commandResult) => {});
    }

    async bindEvents() {
        this.unbindEvents();
        this.eventFiles = fs.readdirSync(`./events/`).filter((file) => file.endsWith('.js'));
        for (const file of this.eventFiles) {
            let event = await import(`./../events/${file}`);
            let eventName = file.split('.')[0];
            this.bot.on(eventName, await event.default.bind(this.bot));
        }
    }

    unbindEvents() {
        for (const file of this.eventFiles) {
            let eventName = file.split('.')[0];
            this.bot.listeners(eventName).forEach((oldEvent) => {
                this.bot.off(eventName, oldEvent);
            });
        }
    }

    getYadConfigPath() {
        return './config.json';
    }

    getCommandConfigPath(commandName) {
        return `./commandFiles/${commandName}/config.json`;
    }

    isUserIdAdmin(userId) {
        let admins = files.readJson(this.getYadConfigPath(), 'admins', true, ['ENTER ADMIN IDS HERE']);
        return admins.includes(userId);
    }

    isUserAdmin(user) {
        return this.isUserIdAdmin(user.id);
    }

    isMessageAuthorAdmin(message) {
        return this.isUserIdAdmin(message.author.id);
    }

    isInteractionAuthorAdmin(interaction) {
        return this.isUserIdAdmin(interaction.user.id);
    }

    isUserIdOwner(userId) {
        let owner = files.readJson(this.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE');
        return userId === owner;
    }

    isUserOwner(user) {
        return this.isUserIdOwner(user.id);
    }

    isMessageAuthorOwner(message) {
        return this.isUserIdOwner(message.author.id);
    }

    isInteractionAuthorOwner(interaction) {
        return this.isUserIdOwner(interaction.user.id);
    }

    getBot() {
        return this.bot;
    }

    getUserSnowflakeFromMentionString(mentionString) {
        const snowflakeRegex = /<@!(\d+)>/g;
        let idResult = snowflakeRegex.exec(mentionString);

        if (idResult !== null) return idResult[1];
        return false;
    }

    sendCommandErrorEmbed(originInteraction, errorMessage) {
        if (!errorMessage.endsWith('.') && !errorMessage.endsWith('!')) {
            errorMessage += '.';
        }

        if (originInteraction.deferred) {
            originInteraction.editReply({
                embeds: [
                    {
                        title: `Error while executing command`,
                        description: `${errorMessage}`,
                        color: EmbedColors.ORANGE,
                    },
                ],
            });
        } else {
            originInteraction.reply({
                embeds: [
                    {
                        title: `Error while executing command`,
                        description: `${errorMessage}`,
                        color: EmbedColors.ORANGE,
                    },
                ],
                ephemeral: true,
            });
        }
    }

    mirrorDirectMessageToOwner(message) {
        this.sendMessageToOwner(
            new Discord.EmbedBuilder({
                title: `DM von User`,
                description: `${message}`,
                footer: {
                    text: `${message.author.username}.${message.author.discriminator} (ID: ${message.author.id})`,
                    icon_url: message.author.avatarURL({ dynamic: true }),
                },
                timestamp: message.createdTimestamp,
            }),
        );
    }

    sendMessageToOwner(message) {
        let owner = files.readJson(this.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE');
        this.bot.users
            .fetch(owner)
            .then((owner) => {
                if (this.bot.user === null) return;
                owner?.send(message).catch((e) => console.dir(e));
            })
            .catch((e) => console.dir(e));
    }

    getDiffEmbedFromEmbeds(oldEmbed, newEmbed) {
        let embed = new Discord.EmbedBuilder({
            author: {
                name: this.getDiffString(oldEmbed.author?.name, newEmbed.author?.name),
            },
            title: this.getDiffString(oldEmbed.title, newEmbed.title),
            description: this.getDiffString(oldEmbed.description, newEmbed.description),
            footer: {
                text: this.getDiffString(oldEmbed.footer?.text, newEmbed.footer?.text),
            },
            thumbnail: {},
            image: {},
            fields: [],
        });

        if (newEmbed.author?.url !== undefined) {
            embed.author.url = newEmbed.author.url;
        } else if (oldEmbed.author?.url !== undefined) {
            embed.author.url = oldEmbed.author.url;
        }

        if (newEmbed.author?.icon_url !== undefined) {
            embed.author.icon_url = newEmbed.author.icon_url;
        } else if (oldEmbed.author?.icon_url !== undefined) {
            embed.author.icon_url = oldEmbed.author.icon_url;
        }

        if (newEmbed.url !== undefined) {
            embed.url = newEmbed.url;
        } else if (oldEmbed.url !== undefined) {
            embed.url = oldEmbed.url;
        }

        if (newEmbed.color !== undefined) {
            embed.color = newEmbed.color;
        } else if (oldEmbed.color !== undefined) {
            embed.color = oldEmbed.color;
        }

        if (newEmbed.timestamp !== undefined) {
            embed.timestamp = newEmbed.timestamp;
        } else if (oldEmbed.timestamp !== undefined) {
            embed.timestamp = oldEmbed.timestamp;
        }

        if (newEmbed.footer?.icon_url !== undefined) {
            embed.footer.icon_url = newEmbed.footer.icon_url;
        } else if (oldEmbed.footer?.icon_url !== undefined) {
            embed.footer.icon_url = oldEmbed.footer.icon_url;
        }

        if (newEmbed.thumbnail?.url !== undefined) {
            embed.thumbnail.url = newEmbed.thumbnail.url;
        } else if (oldEmbed.thumbnail?.url !== undefined) {
            embed.thumbnail.url = oldEmbed.thumbnail.url;
        }

        if (newEmbed.image?.url !== undefined) {
            embed.image.url = newEmbed.image.url;
        } else if (oldEmbed.image?.url !== undefined) {
            embed.image.url = oldEmbed.image.url;
        }

        for (let i = 0; i < 26; i++) {
            embed.addFields([
                {
                    name: this.getDiffString(oldEmbed.fields[i]?.name, newEmbed.fields[i]?.name),
                    value: this.getDiffString(oldEmbed.fields[i]?.value, newEmbed.fields[i]?.value),
                    inline: (oldEmbed.fields[i]?.inline && newEmbed.fields[i]?.inline) || newEmbed.fields[i]?.inline,
                },
            ]);
        }

        for (let i = 25; i > 0; i--) {
            if (embed.fields[i] !== undefined) {
                if (embed.fields[i].name === '' || embed.fields[i].value === '') {
                    embed.fields.splice(i, 1);
                }
            }
        }

        return embed;
    }

    getDiffString(oldString, newString) {
        if (oldString === undefined && newString !== undefined) return newString;
        else if (newString === undefined && oldString !== undefined) return oldString;
        else if (newString === undefined && oldString === undefined) return '';

        const diffResult = diff.diffWords(oldString, newString);
        let diffString = '';
        diffResult.forEach((diffPart) => {
            if (diffPart.added) diffString += `**${Discord.escapeMarkdown(diffPart.value)}**`;
            else if (diffPart.removed) diffString += `~~${Discord.escapeMarkdown(diffPart.value)}~~`;
            else diffString += `${Discord.escapeMarkdown(diffPart.value)}`;
        });
        return diffString;
    }

    ordinal(n) {
        let s = ['th', 'st', 'nd', 'rd'];
        let v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    buildCommandStringFromInteraction(interaction) {
        let string = '/' + interaction.commandName;

        for (const optionData of interaction.options.data) {
            if (optionData.value !== undefined) {
                string += ` ${optionData.name}:'${optionData.value}'`;
            } else {
                string += ` ${optionData.name}`;
            }
            if (optionData.options !== undefined) {
                for (const valueData of optionData.options) {
                    if (valueData.value !== undefined) {
                        string += ` ${valueData.name}:'${valueData.value}'`;
                    } else {
                        string += ` ${valueData.name}`;
                    }
                }
            }
        }

        return string;
    }
}

export default new YadBot();
