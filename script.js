function ready(fn) {
    if (document.readyState != 'loading'){
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

ready(function() {
    // grab query params
    const params = new URLSearchParams(window.location.search)

    // initialize the chat log to give GPT-3 context on the conversation
    let currentChatLog = "The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.\n\n";

    // If a valid OpenAI API key was provided, start the chat and seed the chat log
    const apiKey = params.has('key') ? params.get('key') : false;
    if (!apiKey) {
        document.querySelector('input[name="input-text"]').disabled = true;
        addMessage('You must provide an OpenAI API key as ?key=[API KEY].');
    } else {
        let initialMessageSent = 'Hello, how are you?';
        let initialMessageReceived = 'I am doing great. How can I help you today?';

        addMessage(initialMessageSent, true);
        addMessage(initialMessageReceived,false);
        appendInteractionToChatlog(initialMessageSent, initialMessageReceived, currentChatLog);
    }

    // add a new message to the page with a date/time stamp, either from the user or a computer response
    function addMessage(message, sent) {
        const dateStyle = {dateStyle: 'medium', timeStyle: 'medium'};
        const messageDate = new Date();
        const formattedDate = messageDate.toLocaleString(undefined, dateStyle);

        document.querySelector('#messages').insertAdjacentHTML('beforeend',`<div class='message ${sent ? 'sent' : 'received'}'>
            <div class='message-text'>${message}</div>
            <div class='timestamp'>${formattedDate}</div></div>`);

    }

    // save interaction to the chat log to make sure GPT-3 continues to have context on the full conversation
    // this probably breaks at some point if the chat log becomes very large
    function appendInteractionToChatlog(question, answer, chatLog) {
        currentChatLog = `${currentChatLog}Human: ${question}\nAI: ${answer}\n`;
    }

    // show 'typing' style animation while the user waits for the computer to respond
    function startWaiting() {
        document.querySelector('#messages').insertAdjacentHTML('beforeend',"<div class=\"message waiting\"><div class=\"dot-flashing\"></div></div>");
    }

    // remove 'typing' style animation when the computer is ready to respond
    function stopWaiting() {
        const waitingEl = document.querySelector('.waiting');
        if (waitingEl.parentNode !== null) {
            waitingEl.parentNode.removeChild(waitingEl);
        }
    }

    // handle text submission from the user
    document.querySelector('#input-message-form').addEventListener('submit', function(event) {
        // stop the regular browser form submit
        event.preventDefault();
        
        // grab the user message from the form and add it to the page
        const message = document.querySelector('input[name="input-text"]').value;
        addMessage(message, true);

        // reset the input field so that the user can enter another message
        document.querySelector('#input-message-form').reset();

        // display 'typing' style animation
        startWaiting();

        // prepare the data to send to OpenAI GPT-3
        // configuration from OpenAI chat playground example at https://beta.openai.com/playground/p/default-chat?lang=json
        let data = {
            "prompt": `${currentChatLog}Human: ${message}\nAI: `,
            "temperature": 0.9,
            "max_tokens": 150,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0.6,
            "best_of": 1,
            "stop": ["\n", " Human:", " AI:"]
        };        
        let requestHeaders = {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+apiKey
        }

        // Ask OpenAI for a response
        fetch('https://api.openai.com/v1/engines/davinci/completions', {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(data),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text) })
            }
            return response.json()
        })
        .then(data => {
            const response = data.choices[0].text; // grab response text
            stopWaiting(); // remove 'typing' animation
            addMessage(response, false); // add response to the page as a received message
            appendInteractionToChatlog(message, response, currentChatLog); // append user message and response to the chat log
            // console.log(currentChatLog);
        })
        .catch((error) => {
            console.error("Request error:", error.message);
            addMessage("Hm, something went wrong. Please try again.", false);
            stopWaiting();
        });

    });

});