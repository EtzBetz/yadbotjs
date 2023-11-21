import Discord from 'discord.js';

export default {
    enabled: true,
    getData() {
        return {
            name: 'pong',
            description: 'I will respond with "Ping!".',
        };
    },
    execute(interaction) {
        interaction.reply({
            embeds: [
                {
                    title: 'Ping!',
                },
            ],
            ephemeral: true,
        });
    },
};
