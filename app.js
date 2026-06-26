const chatForm = document.querySelector('#chatForm');
const messageInput = document.querySelector('#messageInput');
const chatMessages = document.querySelector('#chatMessages');
const avatar = document.querySelector('#avatar');
const voiceToggle = document.querySelector('#voiceToggle');
const micButton = document.querySelector('#micButton');
const connectionStatus = document.querySelector('#connectionStatus');

let voiceEnabled = true;
let conversation = [
  {
    role: 'model',
    text: 'Oi! Eu sou o Léo. Que bom ver você por aqui. Como você está se sentindo hoje?'
  }
];

function addMessage(text, sender = 'bot', extraClass = '') {
  const article = document.createElement('article');
  article.className = `message ${sender} ${extraClass}`.trim();
  article.innerHTML = `<p>${escapeHTML(text)}</p>`;
  chatMessages.appendChild(article);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return article;
}

function escapeHTML(value) {
  return value.replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

function speak(text) {
  if (!voiceEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  utterance.onstart = () => avatar.classList.add('speaking');
  utterance.onend = () => avatar.classList.remove('speaking');
  utterance.onerror = () => avatar.classList.remove('speaking');
  window.speechSynthesis.speak(utterance);
}

async function sendToFriend(userText) {
  const loading = addMessage('Estou pensando com carinho no que você disse...', 'bot', 'loading');
  avatar.classList.add('speaking');

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, history: conversation.slice(-12) })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao conversar com a IA.');

    loading.remove();
    conversation.push({ role: 'user', text: userText });
    conversation.push({ role: 'model', text: data.reply });
    addMessage(data.reply, 'bot');
    speak(data.reply);
    connectionStatus.textContent = 'Online';
  } catch (error) {
    loading.remove();
    avatar.classList.remove('speaking');
    connectionStatus.textContent = 'Modo local';
    const fallback = 'Eu não consegui acessar a IA agora, mas estou aqui com você. Me conte um pouco mais, com calma.';
    addMessage(fallback, 'bot');
    speak(fallback);
    console.error(error);
  }
}

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const userText = messageInput.value.trim();
  if (!userText) return;
  addMessage(userText, 'user');
  messageInput.value = '';
  await sendToFriend(userText);
});

voiceToggle.addEventListener('click', () => {
  voiceEnabled = !voiceEnabled;
  voiceToggle.textContent = voiceEnabled ? '🔊' : '🔇';
  if (!voiceEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
});

micButton.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addMessage('Seu navegador ainda não permite reconhecimento de voz aqui. Você pode escrever sua mensagem normalmente.', 'bot');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micButton.textContent = '🎧';
  recognition.start();

  recognition.onresult = (event) => {
    messageInput.value = event.results[0][0].transcript;
    micButton.textContent = '🎙️';
    chatForm.requestSubmit();
  };

  recognition.onerror = () => {
    micButton.textContent = '🎙️';
    addMessage('Não consegui ouvir direito. Pode tentar novamente ou escrever a mensagem.', 'bot');
  };

  recognition.onend = () => {
    micButton.textContent = '🎙️';
  };
});
