import yadBot from './../classes/YadBot'
import Discord from "discord.js"
import editJsonFile from "edit-json-file"
import config from '../config.json'

export default {
    name: 'notes',
    enabled: true,
    description: "Lists, adds and removes entries to a note-list",
    args: "(<add/remove>) (@add<note>) (@remove<note-number>)",
    execute(message, args) {
        let file = editJsonFile(`./notes/notes.json`);

        if (file.get()[message.author.id] === undefined) {
            file.set([message.author.id], []);
            file.save()
        }

        if (args[0] === undefined) {
            let notesString = ""
            file.get()[message.author.id]?.forEach((noteEntry, index) => {
                notesString += ` \`${(index + 1)}:\` ${noteEntry}\n`
            })
            if (notesString === "") notesString = "Deine Notizliste ist leer."

            this.embedNotes(message, args, notesString, 0)
        } else if (args[0] === "add") {
            let notes = file.get()
            notes[message.author.id]?.push(args.shift() && args.join(' '))
            file.set(message.author.id, notes[message.author.id]);
            file.save();

            let notesString = ""
            notes[message.author.id]?.forEach((entry, index) => {
                notesString += ` \`${(index + 1)}:\` ${index+1===notes[message.author.id]?.length?"**":""}${entry}${index+1===notes[message.author.id]?.length?"**":""}\n`
            })
            this.embedNotes(message, args, notesString, 1)
        } else if (args[0] === "remove") {
            let notes = file.get()
            let indexToRemove = parseInt(args[1], 10)
            if(isNaN(indexToRemove)) {
                this.embedErrorInvalidArguments(message, args)
                return
            }
            if(notes[message.author.id].length < indexToRemove) {
                this.embedErrorInvalidRemoveIndex(message, args)
                return
            }

            let oldNotes = JSON.stringify(notes[message.author.id])
            notes[message.author.id]?.splice((parseInt(args[1]) - 1), 1)
            file.set(message.author.id, notes[message.author.id]);
            file.save();

            let notesString = ""
            JSON.parse(oldNotes).forEach((entry, index) => {
                notesString += ` \`${(index + 1)}:\` ${index+1===(parseInt(args[1]))?"**~~":""}${entry}${index+1===(parseInt(args[1]))?"~~**":""}\n`
            })
            if (notesString === "") notesString = "Deine Notizliste ist leer."

            this.embedNotes(message, args, notesString, 2)

        } else {
            this.embedErrorInvalidArguments(message, args)
        }
    },
    embedNotes(message, args, notesString, embedType) {
        let finalEmbedColor
        if (embedType === 0) { finalEmbedColor = null }             // no color
        else if (embedType === 1) { finalEmbedColor = 0x4CAF50 }    // added note (green)
        else if (embedType === 2) { finalEmbedColor = 0xff6f00 }    // removed note (red)
        else { finalEmbedColor = embedType }                        // custom color

        message.channel.send(
            new Discord.MessageEmbed({
                title: `Notizliste`,
                description: embedType === 0 ? notesString : `Hier ist deine neue Notizliste:\n${notesString}`,
                color: finalEmbedColor
            })
        )
    },
    embedErrorInvalidArguments(message, args) {
        yadBot.sendCommandErrorEmbed(message, `Invalid arguments were given.\n Use \`${config.prefix}help\` for more information`)
    },
    embedErrorInvalidRemoveIndex(message, args) {
        yadBot.sendCommandErrorEmbed(message, `Invalid index to remove was given.`)
    }
}
