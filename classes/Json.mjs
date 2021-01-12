import editJsonFile from 'edit-json-file'

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


}

export default new Json()
