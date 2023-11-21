import yadBot from '../classes/YadBot.js';

export default async (guild) => {
    yadBot.sendMessageToOwner(
        `I was joined to guild '${guild.name}', owner: '${(await guild.fetchOwner()).user.username}' (${
            (await guild.fetchOwner()).user.id
        }).`,
    );
};
