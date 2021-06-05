import editJsonFile from 'edit-json-file'
import xml2js from 'xml2js'

class Json {

    constructor() {}

    get(filePath) {
        const file = editJsonFile(filePath)
        return file.get()
    }

    set(filePath, key, value) {
        const file = editJsonFile(filePath)
        file.set(key, value)
        file.save()
    }

    clear(filePath, key) {
        const file = editJsonFile(filePath)
        file.unset(key)
        file.save()
    }

    clearFile(filePath) {
        const file = editJsonFile(filePath)
        file.empty()
    }

    parseXmlToJson(str) {
        let result;
        xml2js.Parser().parseString(str, (e, r) => { result = r });
        return result;
    }

}

export default new Json()
