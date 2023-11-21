import Discord from 'discord.js';
import yadBot from '../classes/YadBot.js';
import { log } from '../index.js';
import files from '../classes/Files.js';

export default async (message) => {
    const prefix = files.readJson(yadBot.getYadConfigPath(), 'prefix', false, '!');
    const ownerId = files.readJson(yadBot.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE');
    const botId = files.readJson(yadBot.getYadConfigPath(), 'bot', true, 'ENTER BOT ID HERE');

    if (message.author.bot) return;
    if (message.channel.type === 'DM' && message.author.id !== ownerId) yadBot.mirrorDirectMessageToOwner(message);

    if (message.mentions.users.get(botId) !== undefined || message.mentions.members?.get(botId) !== undefined) {
        if (message.channel.type !== 'DM' && message.channel.type !== 'UNKNOWN') {
            if (message.reference?.messageId !== undefined) {
                message.fetchReference().then((referenceMessage) => {
                    if (referenceMessage.author.id !== botId) {
                        message.channel.send({ embeds: [new Discord.EmbedBuilder({ title: `Hey!` })] }); // TODO: provide array of messages to randomly select from
                    }
                });
            } else {
                message.channel.send({ embeds: [new Discord.EmbedBuilder({ title: `Hey!` })] }); // TODO: provide array of messages to randomly select from
            }
        }
    }
};
