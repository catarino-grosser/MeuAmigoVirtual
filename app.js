import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const authView = document.querySelector('#authView');
const chatView = document.querySelector('#chatView');
const authForm = document.querySelector('#authForm');
const authTitle = document.querySelector('#authTitle');
const authSubmit = document.querySelector('#authSubmit');
const authFeedback = document.querySelector('#authFeedback');
const toggleAuthMode = document.querySelector('#toggleAuthMode');
const resetPasswordButton = document.querySelector('#resetPasswordButton');
const guestButton = document.querySelector('#guestButton');
const nameField = document.querySelector('#nameField');
const displayNameInput = document.querySelector('#displayNameInput');
const emailInput = document.querySelector('#emailInput');
const passwordInput = document.querySelector('#passwordInput');

const chatForm = document.querySelector('#chatForm');
const messageInput = document.querySelector('#messageInput');
const chatMessages = document.querySelector('#chatMessages');
const avatar = document.querySelector('#avatar');
const voiceToggle = document.querySelector('#voiceToggle');
const micButton = document.querySelector('#micButton');
const logoutButton = document.querySelector('#logoutButton');
const connectionStatus = document.querySelector('#connectionStatus');
const memoryStatus = document.querySelector('#memoryStatus');
const userInfoText = document.querySelector('#userInfoText');

const INITIAL_GREETING = 'Oi! Eu sou o Léo. Que bom ver você por aqui. Como você está se sentindo hoje?';
const MAX_HISTORY_FOR_AI = 16;
const MAX_MESSAGES_ON_SCREEN = 50;

let authMode = 'login';
let voiceEnabled = true;
let conversation = [];
let db = null;
let auth = null;
let currentUser = null;
let userProfile = createEmptyProfile();
let firebaseReady = false;

function createEmptyProfile() {
  return {
    name: '',
    email: '',
    isGuest: false,
    preferences: [],
    importantNotes: [],
    lastTopics: []
  };
}

function isFirebaseConfigured() {
  return firebaseConfig
    && firebaseConfig.apiKey
    && !firebaseConfig.apiKey.includes('SUA_')
    && firebaseConfig.projectId
    && !firebaseConfig.projectId.includes('SEU_');
}

async function boot() {
  if (!isFirebaseConfigured()) {
    connectionStatus.textContent = 'Sem Firebase';
    memoryStatus.textContent = 'Preencha o firebase-config.js para ativar cadastro, login e memória.';
    setAuthFeedback('Firebase ainda não configurado. Preencha o arquivo firebase-config.js.', false);
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    connectionStatus.textContent = 'Online';

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        currentUser = null;
        firebaseReady = false;
        showAuth();
        return;
      }

      currentUser = user;
      firebaseReady = true;
      await loadMemoryAndHistory();
      showChat();
    });
  } catch (error) {
    console.error(error);
    connectionStatus.textContent = 'Erro Firebase';
    memoryStatus.textContent = 'Não consegui iniciar o Firebase. Verifique o firebase-config.js.';
    setAuthFeedback('Erro ao iniciar Firebase. Confira as configurações.', false);
  }
}

function showAuth() {
  authView.classList.remove('hidden');
  chatView.classList.add('hidden');
  chatMessages.innerHTML = '';
  conversation = [];
  userProfile = createEmptyProfile();
  memoryStatus.textContent = 'Entre ou crie uma conta para ativar memória permanente.';
}

function showChat() {
  authView.classList.add('hidden');
  chatView.classList.remove('hidden');
  const name = userProfile.name || currentUser?.displayName || '';
  const accountType = currentUser?.isAnonymous ? 'visitante' : 'conta cadastrada';
  userInfoText.textContent = name ? `${name} • ${accountType}` : `Amigo virtual com memória • ${accountType}`;
}

async function loadMemoryAndHistory() {
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);

    const baseProfile = {
      ...createEmptyProfile(),
      name: currentUser.displayName || '',
      email: currentUser.email || '',
      isGuest: currentUser.isAnonymous
    };

    if (userSnap.exists()) {
      userProfile = { ...baseProfile, ...userSnap.data().profile };
      userProfile.email = currentUser.email || userProfile.email || '';
      userProfile.isGuest = currentUser.isAnonymous;
    } else {
      userProfile = baseProfile;
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profile: userProfile
      });
    }

    const messagesRef = collection(db, 'users', currentUser.uid, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(MAX_MESSAGES_ON_SCREEN));
    const snapshot = await getDocs(q);
    const savedMessages = snapshot.docs
      .map(item => item.data())
      .filter(item => item.text && ['user', 'model'].includes(item.role))
      .reverse();

    chatMessages.innerHTML = '';

    if (savedMessages.length) {
      conversation = savedMessages.map(item => ({ role: item.role, text: item.text }));
      for (const message of conversation) addMessage(message.text, message.role === 'user' ? 'user' : 'bot');
      const nameText = userProfile.name ? ` Lembro que seu nome é ${userProfile.name}.` : '';
      memoryStatus.textContent = `Memória ativada.${nameText} Histórico carregado.`;
    } else {
      conversation = [{ role: 'model', text: INITIAL_GREETING }];
      addMessage(INITIAL_GREETING, 'bot');
      await saveMessage('model', INITIAL_GREETING);
      memoryStatus.textContent = currentUser.isAnonymous
        ? 'Memória ativada no modo visitante. Para acessar em outro aparelho, crie uma conta.'
        : 'Memória ativada. O Léo vai lembrar das suas conversas.';
    }

    await saveProfile();
  } catch (error) {
    console.error(error);
    connectionStatus.textContent = 'Modo local';
    memoryStatus.textContent = 'Não consegui carregar o histórico. Verifique as regras do Firestore.';
    conversation = [{ role: 'model', text: INITIAL_GREETING }];
    chatMessages.innerHTML = '';
    addMessage(INITIAL_GREETING, 'bot');
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = authMode === 'register';
  authTitle.textContent = isRegister ? 'Criar conta' : 'Entrar';
  authSubmit.textContent = isRegister ? 'Criar conta' : 'Entrar';
  toggleAuthMode.textContent = isRegister ? 'Já tenho conta' : 'Criar nova conta';
  nameField.classList.toggle('hidden', !isRegister);
  passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
  setAuthFeedback('', true);
}

function setAuthFeedback(message, success = false) {
  authFeedback.textContent = message;
  authFeedback.classList.toggle('success', success);
}

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!auth) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const displayName = displayNameInput.value.trim();

  try {
    authSubmit.disabled = true;
    setAuthFeedback(authMode === 'register' ? 'Criando sua conta...' : 'Entrando...', true);

    if (authMode === 'register') {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(credential.user, { displayName });
      currentUser = credential.user;
      userProfile = { ...createEmptyProfile(), name: displayName, email, isGuest: false };
      await setDoc(doc(db, 'users', credential.user.uid), {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profile: userProfile
      }, { merge: true });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

    authForm.reset();
  } catch (error) {
    console.error(error);
    setAuthFeedback(authErrorMessage(error), false);
  } finally {
    authSubmit.disabled = false;
  }
});

toggleAuthMode.addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});

resetPasswordButton.addEventListener('click', async () => {
  if (!auth) return;
  const email = emailInput.value.trim();
  if (!email) {
    setAuthFeedback('Digite seu e-mail no campo acima para recuperar a senha.', false);
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    setAuthFeedback('Enviei um e-mail de recuperação de senha. Verifique sua caixa de entrada.', true);
  } catch (error) {
    console.error(error);
    setAuthFeedback(authErrorMessage(error), false);
  }
});

guestButton.addEventListener('click', async () => {
  if (!auth) return;
  try {
    setAuthFeedback('Entrando como visitante...', true);
    await signInAnonymously(auth);
  } catch (error) {
    console.error(error);
    setAuthFeedback(authErrorMessage(error), false);
  }
});

logoutButton.addEventListener('click', async () => {
  if (!auth) return;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  await signOut(auth);
});

function authErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'Este e-mail já está cadastrado. Use Entrar ou recupere sua senha.',
    'auth/invalid-email': 'Digite um e-mail válido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/user-not-found': 'Não encontrei uma conta com este e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
  };
  return messages[code] || 'Não consegui concluir esta ação. Verifique os dados e tente novamente.';
}

function addMessage(text, sender = 'bot', extraClass = '') {
  const article = document.createElement('article');
  article.className = `message ${sender} ${extraClass}`.trim();
  article.innerHTML = `<p>${escapeHTML(text)}</p>`;
  chatMessages.appendChild(article);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return article;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
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

async function saveMessage(role, text) {
  if (!firebaseReady || !currentUser || !db) return;
  const messagesRef = collection(db, 'users', currentUser.uid, 'messages');
  await addDoc(messagesRef, {
    role,
    text: String(text).slice(0, 4000),
    createdAt: serverTimestamp()
  });
}

async function saveProfile() {
  if (!firebaseReady || !currentUser || !db) return;
  const userRef = doc(db, 'users', currentUser.uid);
  await setDoc(userRef, {
    profile: userProfile,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function rememberFromUserMessage(text) {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  let changed = false;

  const nameMatch = clean.match(/(?:meu nome é|me chamo|pode me chamar de)\s+([a-záàâãéêíóôõúç ]{2,40})/i);
  if (nameMatch) {
    userProfile.name = capitalizeWords(nameMatch[1].trim().replace(/[.!?].*$/, ''));
    changed = true;
  }

  if (lower.includes('gosto de ') || lower.includes('eu gosto de ') || lower.includes('prefiro ') || lower.includes('não gosto de ') || lower.includes('nao gosto de ')) {
    changed = addUnique(userProfile.preferences, clean, 12) || changed;
  }

  if (lower.includes('lembra que') || lower.includes('importante') || lower.includes('não esquece') || lower.includes('nao esquece')) {
    changed = addUnique(userProfile.importantNotes, clean, 12) || changed;
  }

  if (clean.length > 18) changed = addUnique(userProfile.lastTopics, clean.slice(0, 140), 10) || changed;
  if (changed) saveProfile().catch(console.error);
}

function addUnique(list, value, maxItems) {
  const normalized = value.trim();
  if (!normalized || list.some(item => item.toLowerCase() === normalized.toLowerCase())) return false;
  list.unshift(normalized);
  while (list.length > maxItems) list.pop();
  return true;
}

function capitalizeWords(value) {
  return value.toLowerCase().replace(/\b\p{L}/gu, letter => letter.toUpperCase());
}

async function sendToFriend(userText) {
  const loading = addMessage('Estou pensando com carinho no que você disse...', 'bot', 'loading');
  avatar.classList.add('speaking');

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: conversation.slice(-MAX_HISTORY_FOR_AI),
        memory: userProfile
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao conversar com a IA.');

    loading.remove();
    conversation.push({ role: 'model', text: data.reply });
    await saveMessage('model', data.reply);
    addMessage(data.reply, 'bot');
    speak(data.reply);
    connectionStatus.textContent = 'Online';
  } catch (error) {
    loading.remove();
    avatar.classList.remove('speaking');
    connectionStatus.textContent = 'Modo local';
    const fallback = 'Eu não consegui acessar a IA agora, mas estou aqui com você. Me conte um pouco mais, com calma.';
    conversation.push({ role: 'model', text: fallback });
    await saveMessage('model', fallback).catch(console.error);
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
  conversation.push({ role: 'user', text: userText });
  messageInput.value = '';
  rememberFromUserMessage(userText);
  await saveMessage('user', userText).catch(console.error);
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

  recognition.onend = () => { micButton.textContent = '🎙️'; };
});

setAuthMode('login');
boot();
