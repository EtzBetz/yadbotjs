import yadBot from '../classes/YadBot'

export default async (guild) => {
    yadBot.sendMessageToOwner(`I was kicked from/left guild '${guild.name}' or the guild was deleted.`)
}
