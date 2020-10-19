import Discord from "discord.js"
import yadBot from '../classes/YadBot'
import config from '../config.json'

export default {
    name: 'flip',
    enabled: true,
    description: "Formats the given text into ǝsɐɔ dᴉlɟ.",
    args: "<text to flip>",
    execute(message, args) {
        let text = args.join(' ')
        let formattedText = ""
        for (let i = text.length - 1; i >= 0; i--) {
            formattedText += this.flipCharacter(text[i])
        }
        message.channel.send(new Discord.MessageEmbed({
            footer: {text: ""},
            description: `\`${formattedText}\`\n:uöɥɔsǝʇʇᴉB ˙˙ɹǝᴉH\n**dᴉlℲ**`
        }))

    },
    flipCharacter(character) {
        switch (character) {
        case "a":
            return "ɐ"
        case "b":
            return "q"
        case "c":
            return "ɔ"
        case "d":
            return "p"
        case "e":
            return "ǝ"
        case "f":
            return "ɟ"
        case "g":
            return "ƃ"
        case "h":
            return "ɥ"
        case "i":
            return "ᴉ"
        case "j":
            return "ɾ"
        case "k":
            return "ʞ"
        case "l":
            return "l"
        case "m":
            return "ɯ"
        case "n":
            return "u"
        case "o":
            return "o"
        case "p":
            return "d"
        case "q":
            return "b"
        case "r":
            return "ɹ"
        case "s":
            return "s"
        case "t":
            return "ʇ"
        case "u":
            return "n"
        case "v":
            return "ʌ"
        case "w":
            return "ʍ"
        case "x":
            return "x"
        case "y":
            return "ʎ"
        case "z":
            return "z"
        case "A":
            return "∀"
        case "B":
            return "B"
        case "C":
            return "Ɔ"
        case "D":
            return "D"
        case "E":
            return "Ǝ"
        case "F":
            return "Ⅎ"
        case "G":
            return "פ"
        case "H":
            return "H"
        case "I":
            return "I"
        case "J":
            return "ſ"
        case "K":
            return "K"
        case "L":
            return "˥"
        case "M":
            return "W"
        case "N":
            return "N"
        case "O":
            return "O"
        case "P":
            return "Ԁ"
        case "Q":
            return "Q"
        case "R":
            return "R"
        case "S":
            return "S"
        case "T":
            return "┴"
        case "U":
            return "∩"
        case "V":
            return "Λ"
        case "W":
            return "M"
        case "X":
            return "X"
        case "Y":
            return "⅄"
        case "Z":
            return "Z"
        case "0":
            return "0"
        case "1":
            return "Ɩ"
        case "2":
            return "ᄅ"
        case "3":
            return "Ɛ"
        case "4":
            return "ㄣ"
        case "5":
            return "ϛ"
        case "6":
            return "9"
        case "7":
            return "ㄥ"
        case "8":
            return "8"
        case "9":
            return "6"
        case ",":
            return "'"
        case ".":
            return "˙"
        case "?":
            return "¿"
        case "!":
            return "¡"
        case "\"":
            return ",,"
        case "'":
            return ","
        case "`":
            return ","
        case "(":
            return ")"
        case ")":
            return "("
        case "[":
            return "]"
        case "]":
            return "["
        case "{":
            return "}"
        case "}":
            return "{"
        case "<":
            return ">"
        case ">":
            return "<"
        case "&":
            return "⅋"
        case "_":
            return "‾"
        default:
            return character
        }
    },
}
