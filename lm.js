//https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion
class LanguageModelClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async generateText(prompt, callback) {
        const url = `${this.baseUrl}/generate`;
        //console.log(url);
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: 'neo',
                prompt: prompt,
                "stream": false
                //"options": { }
            })
        });
        if (!response.ok)
            throw new Error('Failed to generate text');

        const r = await response.text();
        const data = await JSON.parse(r);

        callback(data);
    }
}


// new LanguageModelClient('http://xyz:11434/api')
//     .generateText('Why is the sky blue?',
//         console.log);
