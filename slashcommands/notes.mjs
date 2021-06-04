import yadBot from '../classes/YadBot.js'
import Discord from "discord.js"
import editJsonFile from "edit-json-file"
import config from '../config.json'
import files from '../classes/Files.mjs';
import EmbedColors from '../constants/EmbedColors.mjs';

export default {
    enabled: true,
    onlyAdmin: false,
    getData() {
        return {
            name: 'notes',
            description: "Lists, adds and removes entries to a note-list",
            options: [
                {
                    name: "list",
                    description: "Show your notes list.",
                    type: 'SUB_COMMAND'
                },
                {
                    name: "add",
                    description: "Add a note to your notes list.",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "note",
                        description: "Note to add",
                        type: "STRING",
                        required: true
                    }]
                },
                {
                    name: "remove",
                    description: "Remove a note from your notes list.",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "note-number",
                        description: "Index-number of the note to remove",
                        type: "INTEGER",
                        required: true
                    }]
                }
            ]
        }
    },
    execute(interaction) {
        files.readJson(
            `./notes/notes.json`,
            interaction.user.id,
            false,
            []
        )

        let notesString = ""
        let notes = undefined

        switch (interaction.options[0].name.toLowerCase()) {
            case "list":
                notes = files.readJson(
                    `./notes/notes.json`,
                    interaction.user.id,
                    false,
                    []
                )

                notes.forEach((noteEntry, index) => {
                    notesString += ` \`${(index + 1)}:\` ${noteEntry}\n`
                })
                if (notesString === "") notesString = "Deine Notizliste ist leer."

                this.embedNotes(interaction, interaction, notesString, 0)
                break
            case "add":
                notes = files.readJson(`./notes/notes.json`, interaction.user.id, false, [])
                notes.push(interaction.options[0].options[0].value)
                files.writeJson(`./notes/notes.json`, interaction.user.id, notes)

                notes.forEach((entry, index) => {
                    notesString += ` \`${(index + 1)}:\` ${index + 1 === notes.length ? "**" : ""}${entry}${index + 1 === notes.length ? "**" : ""}\n`
                })
                this.embedNotes(interaction, interaction, notesString, 1)
                break
            case "remove":
                notes = files.readJson(`./notes/notes.json`, interaction.user.id, false, [])

                let indexToRemove = interaction.options[0].options[0].value
                if (notes.length < indexToRemove) {
                    this.embedErrorInvalidRemoveIndex(interaction, interaction)
                    return
                }

                let oldNotes = JSON.stringify(notes) // stringify to copy by value
                notes.splice(interaction.options[0].options[0].value - 1, 1)
                files.writeJson(`./notes/notes.json`, interaction.user.id, notes)

                notesString = ""
                JSON.parse(oldNotes).forEach((entry, index) => {
                    notesString += ` \`${(index + 1)}:\` ${index + 1 === interaction.options[0].options[0].value ? "**~~" : ""}${entry}${index + 1 === interaction.options[0].options[0].value ? "~~**" : ""}\n`
                })
                if (notesString === "") notesString = "Deine Notizliste ist leer."

                this.embedNotes(interaction, interaction, notesString, 2)

                break
        }
    },
    embedNotes(interaction, args, notesString, embedType) {
        let finalEmbedColor
        if (embedType === 0) {
            finalEmbedColor = null
        }    // no color
        else if (embedType === 1) {
            finalEmbedColor = EmbedColors.GREEN
        }    // added note (green)
        else if (embedType === 2) {
            finalEmbedColor = EmbedColors.RED
        }    // removed note (red)
        else {
            finalEmbedColor = embedType
        }    // custom color

        interaction.reply({
            embeds: [{
                title: `Notizliste`,
                description: embedType === 0 ? notesString : `Hier ist deine neue Notizliste:\n${notesString}`,
                color: finalEmbedColor
            }],
            ephemeral: true
        })
    },
    embedErrorInvalidArguments(message, args) {
        yadBot.sendCommandErrorEmbed(message, `Invalid arguments were given.\n Use \`${config.prefix}help\` for more information`)
    },
    embedErrorInvalidRemoveIndex(message, args) {
        yadBot.sendCommandErrorEmbed(message, `Invalid index to remove was given.`)
    }
}
