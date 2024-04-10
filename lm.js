class LanguageModelClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async generateText(prompt, callback) {
        throw new Error('generateText method must be implemented by subclasses');
    }
}

class OpenAIClient extends LanguageModelClient {
    async generateText(prompt, callback) {
        await this.makeRequest(`${this.baseUrl}/completions`, {
            model: 'text-davinci-002',
            prompt: prompt,
            max_tokens: 100,
            n: 1,
            stop: null,
            temperature: 0.7
        }, data => callback(data.choices[0].text));
    }
}

class HuggingFaceClient extends LanguageModelClient {
    async generateText(prompt, callback) {
        await this.makeRequest(`${this.baseUrl}?wait=true`, {
            inputs: prompt,
            parameters: {
                max_length: 100,
                num_return_sequences: 1,
                temperature: 0.7
            }
        }, data => callback(data[0].generated_text));
    }
}

class CustomClient extends LanguageModelClient {
    async generateText(prompt, callback) {
        await this.makeRequest(`${this.baseUrl}/generate`, {
            prompt: prompt,
            max_tokens: 500,
            model: 'neo',
            temperature: 0.7,
            "stream": false
        }, callback);
    }
}

class AI21StudioClient extends LanguageModelClient {
    async generateText(prompt, callback) {
        await this.makeRequest(this.baseUrl, {
            prompt: prompt,
            numResults: 1,
            maxTokens: 100,
            temperature: 0.7
        }, data => callback(data.completions[0].data.text));
    }
}

class CohereClient extends LanguageModelClient {
    async generateText(prompt, callback) {
        await this.makeRequest(this.baseUrl, {
            prompt: prompt,
            max_tokens: 100,
            num_generations: 1,
            temperature: 0.7
        }, data => callback(data.generations[0].text));
    }
}

LanguageModelClient.prototype.makeRequest = async function(url, body, callback) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    if (!response.ok)
        throw new Error('Failed to generate text');

    callback(await response.json());
};


function lmUI() {
    const apiMap = new Map([
        ['Neo', { client: CustomClient, baseUrl: 'http://localhost:11434/api' }],
        ['OpenAI API', { client: OpenAIClient, baseUrl: 'https://api.openai.com/v1/engines/davinci' }],
        ['Hugging Face API', { client: HuggingFaceClient, baseUrl: 'https://api-inference.huggingface.co/models/gpt2' }],
        ['AI21 Studio API', { client: AI21StudioClient, baseUrl: 'https://api.ai21.com/studio/v1/j1-jumbo/complete' }],
        ['Cohere API', { client: CohereClient, baseUrl: 'https://api.cohere.ai/generate' }]
    ]);


    const d = $('<div>');
    const messages = $('<div style="overflow:auto; width: 400px; height: 200px;">');
    const loadingIndicator = $('<div style="display: none;">Loading...</div>');
    messages.append(loadingIndicator);

    const addMessage = x => messages.append(x);

    let client;

    const modelChooser = $('<select>');
    for (const [key, value] of apiMap)
        modelChooser.append($('<option>').text(key));

    modelChooser.on('change', function() {
        const apiInfo = apiMap.get($(this).val());
        client = new apiInfo.client(apiInfo.baseUrl);
    });

    const inputArea = $('<span style="position: absolute; bottom: 0; left: 0; width: 100%">');
    const inputEdit = $('<input type="text" value="What is a GUI?  One short sentence.">');
    const inputButton = $('<button>&nbsp;</button>').click(async () => {
        const input = inputEdit.val();
        inputEdit.val('');
        loadingIndicator.show();
        try {
            await client.generateText(input, x => {
                loadingIndicator.hide();
                addMessage(JSON.stringify(x, null, 4));
            });
        } catch (e) {
            loadingIndicator.hide();
            addMessage(e);
        }
    });
    inputArea.append(modelChooser, inputEdit, inputButton);
    d.append(messages, inputArea);
    return d;
}