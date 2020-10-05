import yadBot from './../classes/YadBot'
import Discord from "discord.js"
import editJsonFile from "edit-json-file"
import config from '../config.json'

export default {
    name: 'notes',
    enabled: true,
    description: "Lists, adds and removes entries to a note-list",
    args: "(<add/remove>) (@add<note>) (@remove<note-number>)",
    onlyOwner: true,
    execute(message, args) {
        let file = editJsonFile(`./notes/notes.json`);

        if (args[0] === undefined) {
            let notes = ""
            file.get().notes?.forEach((entry, index) => {
                notes += ` \`${(index + 1)}:\` ${entry}\n`
            })
            if (notes === "") notes = "Deine Notizliste ist leer."
            message.channel.send(
                new Discord.MessageEmbed({
                    title: `Notizliste`,
                    description: notes
                })
            )
        } else if (args[0] === "add") {
            let notes = file.get()
            let oneIndex = notes.notes?.push(args.shift() && args.join(' '))
            file.set("notes", notes.notes);
            file.save();

            let notesString = ""
            notes.notes?.forEach((entry, index) => {
                notesString += ` \`${(index + 1)}:\` ${index+1===notes.notes?.length?"**":""}${entry}${index+1===notes.notes?.length?"**":""}\n`
            })

            message.channel.send(
                new Discord.MessageEmbed({
                    title: `Notizliste`,
                    description: `Hier ist deine neue Notizliste:\n${notesString}`,
                    color: 0x4CAF50
                })
            )
        } else if (args[0] === "remove") {
            let notes = file.get()
            let oldNote = JSON.stringify(notes.notes)
            let removed = notes.notes?.splice((parseInt(args[1]) - 1), 1)
            file.set("notes", notes.notes);
            file.save();

            let notesString = ""
            JSON.parse(oldNote)?.forEach((entry, index) => {
                notesString += ` \`${(index + 1)}:\` ${index+1===(parseInt(args[1]))?"**~~":""}${entry}${index+1===(parseInt(args[1]))?"~~**":""}\n`
            })
            if (notesString === "") notesString = "Deine Notizliste ist leer."

            message.channel.send(
                new Discord.MessageEmbed({
                    title: `Notizliste`,
                    description: `Hier ist deine neue Notizliste:\n${notesString}`,
                    color: 0xff6f00
                })
            )
        } else {
            yadBot.sendCommandErrorEmbed(message, `Incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
        }
    }
}
