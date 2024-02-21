//node app.js on http://localhost:3000/

// Use your Azure OpenAI API key
const AZURE_OPENAI_API_KEY = '';

// Update the Azure OpenAI API endpoint
const AZURE_OPENAI_API_ENDPOINT = '';

// OpenAI API endpoint set up
async function fetchAzureOpenAIResponse(userMessage) {
  const response = await fetch(AZURE_OPENAI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      "api-key": `${AZURE_OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.7,
      max_tokens: 100
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI API request failed with status ${response.status}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}


const recognition = new window.webkitSpeechRecognition(); // Create a speech recognition object
recognition.lang = 'en-US'; // Set the language for recognition, de-DE,en-US 

const microphoneButton = document.getElementById('microphone-button');

microphoneButton.addEventListener('click', toggleSpeechRecognition);

function toggleSpeechRecognition() {
    if (recognition && recognition.state === 'running') {
        recognition.stop();
        microphoneButton.textContent = 'Start Speaking';
    } else if (recognition && recognition.state !== 'running') {
        recognition.start();
        microphoneButton.textContent = 'Stop Speaking';
    }
}

// Event listener for when speech recognition ends
recognition.onend = function () {
    microphoneButton.textContent = 'Start Speaking';
};

recognition.onresult = async function (event) {
    const userSpeech = event.results[0][0].transcript;

    try {
        const aiResponse = await fetchAzureOpenAIResponse(userSpeech);

        // Display user's speech and AI's response in the chat box (for example)
        displayMessage('You', userSpeech);
        displayMessage('AI', aiResponse);

        //// Use ResponsiveVoice.js to speak AI's response, UK English Male, Deutsch Male
        //window.responsiveVoice.speak(aiResponse, 'UK English Female', {

        //    });

        if (avatarSynthesizer && typeof avatarSynthesizer.speak === 'function') {
            avatarSynthesizer.speak(aiResponse);
            console.log("Passed response to avatar synthesizer.");
        } else {
            console.error('Avatar synthesizer is not initialized or speak method is not available.');
        }

    } catch (error) {
        console.error('Error fetching AI response:', error);
    }
};

function stopAvatarPlayback() {
    if (avatarSynthesizer && typeof avatarSynthesizer.stopSpeaking === 'function') {
        avatarSynthesizer.stopSpeaking();
        console.log("Playback stopped.");
    } else {
        console.error("Avatar synthesizer is not initialized or stopSpeaking method is not available.");
    }
}


//// Utility function to automatically scroll the content to the bottom
//function scrollToBottom(elementId) {
//    const element = document.getElementById(elementId);
//    if (element) {
//        element.scrollTop = element.scrollHeight;
//    }
//}


// Function to display messages in the chat box (you may customize this according to your application)
function displayMessage(role, content) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)}: ${content}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

const inputEnter = document.getElementById('user-input-field');
const chatBox = document.getElementById('chat-box');

inputEnter.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        const userMessage = inputEnter.value.trim();

        try {
            const responseFromAzureOpenAI = await fetchAzureOpenAIResponse(userMessage);

            // Display user's message and AI's response in the chat box
            displayMessage('Me', userMessage);
            displayMessage('AI', responseFromAzureOpenAI);

            // Use ResponsiveVoice.js to speak AI's response
            //window.responsiveVoice.speak(responseFromAzureOpenAI, 'UK English Female', {

            //});

            if (avatarSynthesizer && typeof avatarSynthesizer.speak === 'function') {
                avatarSynthesizer.speak(responseFromAzureOpenAI);
                console.log("Passed response to avatar synthesizer.");
            } else {
                console.error('Avatar synthesizer is not initialized or speak method is not available.');
            }

            // Reset the input field
            inputEnter.value = ''; 
        } catch (error) {
            console.error('Error fetching AI response:', error);
        }
    }
});

// Global objects
var avatarSynthesizer
var peerConnection
var previousAnimationFrameTimestamp = 0;
var subscriptionKey;
var cogSvcRegion;
var iceServerUrl;
var iceServerUsername;
var iceServerCredential;
var config; 

// Function to handle the configuration once it's loaded
function handleConfiguration(loadedConfig) {
    // Assign values from config to global variables
    subscriptionKey = loadedConfig.AzureSpeechResource.SubscriptionKey;
    cogSvcRegion = loadedConfig.AzureSpeechResource.Region;
    iceServerUrl = loadedConfig.ICEServer.URL;
    iceServerUsername = loadedConfig.ICEServer.Username;
    iceServerCredential = loadedConfig.ICEServer.Credential;

    // Continue with other initialization logic here
    console.log('Configuration loaded:', loadedConfig);

    // Call the function to start the session or perform other actions
    startSession();
};

// Asynchronously load the configuration on startup
window.onload = function () {
    fetch('./avconf.json')
        .then(response => response.json())
        .then(loadedConfig => {
            config = loadedConfig; // Store the config in a global variable
            handleConfiguration(config); // Call the function to handle the loaded configuration
        })
        .catch(error => {
            console.error('Error loading the configuration:', error);
        });
};

// Setup WebRTC
function setupWebRTC(iceServerUrl, iceServerUsername, iceServerCredential) {
    // Create WebRTC peer connection
    peerConnection = new RTCPeerConnection({
        iceServers: [{
            urls: [iceServerUrl],
            username: iceServerUsername,
            credential: iceServerCredential
        }]
    })

    peerConnection.ontrack = function (event) {
        // Clean up existing video element if there is any
        var remoteVideoDiv = document.getElementById('remoteVideo')
        for (var i = 0; i < remoteVideoDiv.childNodes.length; i++) {
            if (remoteVideoDiv.childNodes[i].localName === event.track.kind) {
                remoteVideoDiv.removeChild(remoteVideoDiv.childNodes[i])
            }
        }

        const mediaPlayer = document.createElement(event.track.kind)
        mediaPlayer.id = event.track.kind
        mediaPlayer.srcObject = event.streams[0]
        mediaPlayer.autoplay = true
        document.getElementById('remoteVideo').appendChild(mediaPlayer)

        if (event.track.kind === 'video') {
            mediaPlayer.playsInline = true
            remoteVideoDiv = document.getElementById('remoteVideo')
            if (document.getElementById('transparentBackground')) {
                remoteVideoDiv.style.width = '0.1px'
          
            }

            mediaPlayer.addEventListener('play', () => {
                if (document.getElementById('transparentBackground')) {
                    window.requestAnimationFrame(makeBackgroundTransparent)
                } else {
                    remoteVideoDiv.style.width = mediaPlayer.videoWidth / 2 + 'px'
                }
            })
        }
        else {
            // Mute the audio player to make sure it can auto play, will unmute it when speaking
            // Refer to https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide
           // mediaPlayer.muted = true
        }
    }

    // Offer to receive 1 audio, and 1 video track
    peerConnection.addTransceiver('video', { direction: 'sendrecv' })
    peerConnection.addTransceiver('audio', { direction: 'sendrecv' })

    // start avatar, establish WebRTC connection
    avatarSynthesizer.startAvatarAsync(peerConnection).then((r) => {
        console.log("[" + (new Date()).toISOString() + "] Avatar started.")

    })
}

// Make video background transparent by matting
function makeBackgroundTransparent(timestamp) {
    // Throttle the frame rate to 30 FPS to reduce CPU usage
    if (timestamp - previousAnimationFrameTimestamp > 30) {
        video = document.getElementById('video')
        tmpCanvas = document.getElementById('tmpCanvas')
        tmpCanvasContext = tmpCanvas.getContext('2d', { willReadFrequently: true })
        tmpCanvasContext.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
        if (video.videoWidth > 0) {
            let frame = tmpCanvasContext.getImageData(0, 0, video.videoWidth, video.videoHeight)
            for (let i = 0; i < frame.data.length / 4; i++) {
                let r = frame.data[i * 4 + 0]
                let g = frame.data[i * 4 + 1]
                let b = frame.data[i * 4 + 2]
                if (g - 150 > r + b) {
                    // Set alpha to 0 for pixels that are close to green
                    frame.data[i * 4 + 3] = 0
                } else if (g + g > r + b) {
                    // Reduce green part of the green pixels to avoid green edge issue
                    adjustment = (g - (r + b) / 2) / 3
                    r += adjustment
                    g -= adjustment * 2
                    b += adjustment
                    frame.data[i * 4 + 0] = r
                    frame.data[i * 4 + 1] = g
                    frame.data[i * 4 + 2] = b
                    // Reduce alpha part for green pixels to make the edge smoother
                    a = Math.max(0, 255 - adjustment * 4)
                    frame.data[i * 4 + 3] = a
                }
            }

        }

        previousAnimationFrameTimestamp = timestamp
    }

    window.requestAnimationFrame(makeBackgroundTransparent)
}

// Do HTML encoding on given text
function htmlEncode(text) {
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    };

    return String(text).replace(/[&<>"'\/]/g, (match) => entityMap[match])
}

window.startSession = () => {
    console.log("Configuration at startSession:", config);

    // Check if config is loaded and has necessary sections
    if (!config || !config.AzureSpeechResource || !config.TTSConfiguration) {
        console.error("Configuration not loaded or is missing sections.");
        return;
    }

    const cogSvcRegion = config.AzureSpeechResource.Region;
    const subscriptionKey = config.AzureSpeechResource.SubscriptionKey;

    // Check for required values
    if (!subscriptionKey || subscriptionKey.trim() === '') {
        alert('Please fill in the subscription key of your speech resource.');
        return;
    }

    // Create the SpeechSDK configuration
    const speechSynthesisConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, cogSvcRegion);
    speechSynthesisConfig.endpointId = config.TTSConfiguration.CustomVoiceEndpointId;
    speechSynthesisConfig.speechSynthesisVoiceName = config.TTSConfiguration.Voice;

    // Set up the avatar video format
    const videoFormat = new SpeechSDK.AvatarVideoFormat();
    let videoCropTopLeftX = config.AvatarConfiguration.VideoCrop ? 600 : 0;
    let videoCropBottomRightX = config.AvatarConfiguration.VideoCrop ? 1320 : 1920;
    videoFormat.setCropRange(new SpeechSDK.Coordinate(videoCropTopLeftX, 0), new SpeechSDK.Coordinate(videoCropBottomRightX, 1080));

    // Initialize the avatar configuration
    const avatarConfig = new SpeechSDK.AvatarConfig(
        config.AvatarConfiguration.Character,
        config.AvatarConfiguration.Style,
        videoFormat
    );
    avatarConfig.customized = config.AvatarConfiguration.CustomAvatar;
    avatarConfig.backgroundColor = config.AvatarConfiguration.BackgroundColor;

    // Create the avatar synthesizer
    avatarSynthesizer = new SpeechSDK.AvatarSynthesizer(speechSynthesisConfig, avatarConfig);

    // Set up the event handler for avatar events
    avatarSynthesizer.avatarEventReceived = function (s, e) {
        var offsetMessage = ", offset from session start: " + e.offset / 10000 + "ms.";
        if (e.offset === 0) {
            offsetMessage = "";
        }
        console.log("[" + (new Date()).toISOString() + "] Event received: " + e.description + offsetMessage);
    };

    // Check if ICE server details are set
    if (!iceServerUrl || iceServerUrl.trim() === '' ||
        !iceServerUsername || iceServerUsername.trim() === '' ||
        !iceServerCredential || iceServerCredential.trim() === '') {
        alert('Please fill in the ICE server URL, username, and credential.');
        return;
    }

    // Start setting up WebRTC
    setupWebRTC(iceServerUrl, iceServerUsername, iceServerCredential);
};

// lets see if we can simulate astreaming effect
function streamTextToDisplay(text, elementId, speed) {
    let i = 0;
    const element = document.getElementById(elementId);
    if (!element) return; // Exit if the element is not found

    // Clear the element before starting to stream the new text
    element.textContent = '';

    function addCharacter() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(addCharacter, speed);
        }
    }
    addCharacter();
}
