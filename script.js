import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, doc, setDoc, getDoc, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, deleteDoc } from "./firebase.js";

const $ = (id) => document.getElementById(id);
const screens = { auth: $("authScreen"), home: $("homeScreen"), chat: $("chatScreen"), diary: $("diaryScreen"), memories: $("memoriesScreen"), settings: $("settingsScreen") };
const logoutButton = $("logoutButton"), authForm = $("authForm"), toggleAuthButton = $("toggleAuthButton"), authSubmitButton = $("authSubmitButton"), authMessage = $("authMessage"), nameInput = $("nameInput"), emailInput = $("emailInput"), passwordInput = $("passwordInput");
const welcomeTitle = $("welcomeTitle"), dailyGreeting = $("dailyGreeting"), memoryText = $("memoryText"), brandButton = $("brandButton");
const chat = $("chat"), chatForm = $("chatForm"), messageInput = $("messageInput"), sendButton = $("sendButton"), connectionStatus = $("connectionStatus"), avatar = $("avatar"), quotaText = $("quotaText");
const voiceButton = $("voiceButton"), stopVoiceButton = $("stopVoiceButton");
const moodSelect = $("moodSelect"), diaryInput = $("diaryInput"), diaryList = $("diaryList"), memoriesList = $("memoriesList"), manualMemoryInput = $("manualMemoryInput");
const voiceEnabledInput = $("voiceEnabledInput"), dailyLimitInput = $("dailyLimitInput"), personalitySelect = $("personalitySelect");

let isRegisterMode = false;
let currentUser = null;
let profile = null;
let messages = [];
let memories = [];
let diaryEntries = [];
let settings = { voiceEnabled: true, dailyLimit: 30, personality: "amigo" };
let isSending = false;

function showScreen(name) { Object.values(screens).forEach(s => s.classList.add("hidden")); screens[name].classList.remove("hidden"); }
function todayKey() { return new Date().toISOString().slice(0, 10); }
function safeText(value, fallback = "") { return String(value || fallback).trim(); }

function setAuthMode(register) {
  isRegisterMode = register;
  nameInput.classList.toggle("hidden", !register);
  authSubmitButton.textContent = register ? "Criar conta" : "Entrar";
  toggleAuthButton.textContent = register ? "Já tenho conta. Quero entrar." : "Ainda não tenho conta. Quero me cadastrar.";
  authMessage.textContent = "";
}

function friendlyFirebaseError(error) {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "Este e-mail já está cadastrado.";
  if (code.includes("invalid-email")) return "Digite um e-mail válido.";
  if (code.includes("weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (code.includes("invalid-credential")) return "E-mail ou senha incorretos.";
  if (code.includes("user-not-found")) return "Usuário não encontrado.";
  if (code.includes("wrong-password")) return "Senha incorreta.";
  return "Não consegui completar esta ação. Tente novamente.";
}

async function getUserName() { return profile?.name || currentUser?.displayName || "amigo"; }
async function loadProfile() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) profile = snap.data();
  else {
    profile = { name: currentUser.displayName || "amigo", email: currentUser.email, createdAt: serverTimestamp() };
    await setDoc(ref, profile);
  }
}
async function saveSettings() { await setDoc(doc(db, "users", currentUser.uid, "settings", "main"), { ...settings, updatedAt: serverTimestamp() }); }
async function loadSettings() {
  const snap = await getDoc(doc(db, "users", currentUser.uid, "settings", "main"));
  if (snap.exists()) settings = { ...settings, ...snap.data() };
  voiceEnabledInput.checked = !!settings.voiceEnabled;
  dailyLimitInput.value = settings.dailyLimit || 30;
  personalitySelect.value = settings.personality || "amigo";
}
async function loadMemories() {
  memories = [];
  const q = query(collection(db, "users", currentUser.uid, "memories"), orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);
  snap.forEach(d => memories.push({ id: d.id, ...d.data() }));
  renderMemories();
}
async function loadDiary() {
  diaryEntries = [];
  const q = query(collection(db, "users", currentUser.uid, "diary"), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);
  snap.forEach(d => diaryEntries.push({ id: d.id, ...d.data() }));
  renderDiary();
}
async function loadMessages() {
  messages = [];
  chat.innerHTML = "";
  const q = query(collection(db, "users", currentUser.uid, "messages"), orderBy("createdAt", "asc"), limit(60));
  const snap = await getDocs(q);
  snap.forEach(d => { const msg = { id: d.id, ...d.data() }; messages.push(msg); addMessage(msg.text, msg.role, false, false); });
  if (!messages.length) addMessage(`Oi, ${await getUserName()}! Eu sou o Ted. Como você está hoje?`, "ted", false, false);
}
async function saveMessage(text, role, source = "") { await addDoc(collection(db, "users", currentUser.uid, "messages"), { text, role, source, createdAt: serverTimestamp(), day: todayKey() }); }

function renderHome() {
  const name = profile?.name || currentUser?.displayName || "amigo";
  welcomeTitle.textContent = `Olá, ${name}!`;
  const hour = new Date().getHours();
  dailyGreeting.textContent = hour < 12 ? "Bom dia. Como você quer começar hoje?" : hour < 18 ? "Boa tarde. Quer conversar um pouco?" : "Boa noite. Como foi seu dia?";
  memoryText.textContent = memories.length ? memories.slice(0, 4).map(m => `• ${m.text}`).join("\n") : "O Ted ainda não tem memórias salvas. Você pode adicionar algumas na aba Memórias.";
  updateQuotaText();
}
function renderMemories() {
  memoriesList.innerHTML = "";
  if (!memories.length) { memoriesList.innerHTML = `<div class="item"><strong>Nenhuma memória ainda.</strong><p>Adicione uma lembrança importante para personalizar o Ted.</p></div>`; return; }
  memories.forEach(m => {
    const div = document.createElement("div"); div.className = "item";
    div.innerHTML = `<small>Memória</small><p>${escapeHtml(m.text)}</p>`;
    memoriesList.appendChild(div);
  });
}
function renderDiary() {
  diaryList.innerHTML = "";
  if (!diaryEntries.length) { diaryList.innerHTML = `<div class="item"><strong>Nenhum registro ainda.</strong><p>Escreva seu primeiro registro do diário.</p></div>`; return; }
  diaryEntries.forEach(d => {
    const div = document.createElement("div"); div.className = "item";
    div.innerHTML = `<small>Humor: ${escapeHtml(d.mood || "não informado")}</small><p>${escapeHtml(d.text)}</p>`;
    diaryList.appendChild(div);
  });
}
function escapeHtml(s) { return String(s || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function addMessage(text, role, loading = false, push = true) {
  const div = document.createElement("div"); div.className = `message ${role}${loading ? " loading" : ""}`; div.textContent = text;
  chat.appendChild(div); chat.scrollTop = chat.scrollHeight;
  if (push) messages.push({ role, text });
  return div;
}

function countTodayAiMessages() { return messages.filter(m => m.role === "user" && m.day === todayKey()).length; }
function updateQuotaText() { const used = countTodayAiMessages(); quotaText.textContent = `Uso de hoje: ${used}/${settings.dailyLimit || 30} mensagens.`; }
function canSend() { return countTodayAiMessages() < Number(settings.dailyLimit || 30); }

function speak(text) {
  if (!settings.voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text); utter.lang = "pt-BR"; utter.rate = 1; utter.pitch = 1;
  utter.onstart = () => avatar.classList.add("talking"); utter.onend = () => avatar.classList.remove("talking"); utter.onerror = () => avatar.classList.remove("talking");
  window.speechSynthesis.speak(utter);
}
function localReplyClient(message) {
  const t = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[!?.,]/g, "").trim();
  const name = profile?.name || "amigo";
  const replies = { oi:`Oi, ${name}! Que bom te ver. Como você está?`, ola:`Olá, ${name}! Estou aqui. Como foi seu dia?`, "bom dia":`Bom dia, ${name}! Como você acordou hoje?`, "boa tarde":`Boa tarde, ${name}! Como está indo sua tarde?`, "boa noite":`Boa noite, ${name}! Como você está se sentindo agora?`, obrigado:"Eu que agradeço por conversar comigo. Estou por aqui.", obrigada:"Eu que agradeço por conversar comigo. Estou por aqui.", valeu:"Valeu! Me conta, o que você quer fazer agora?" };
  return replies[t] || null;
}
async function callTed(message) {
  const response = await fetch("/.netlify/functions/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, userName: await getUserName(), history: messages.slice(-12), memories: memories.slice(0, 12), diary: diaryEntries.slice(0, 3), personality: settings.personality }) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { throw new Error("Resposta inválida da Function: " + text.slice(0, 120)); }
  if (!response.ok) throw new Error(data.detail || data.error || "Erro desconhecido na Function.");
  return data;
}
async function sendMessage(raw) {
  if (isSending) return;
  const message = safeText(raw); if (!message) return;
  if (!canSend()) { addMessage("Você atingiu seu limite diário deste plano. Volte amanhã ou aumente o limite em Configurações enquanto o app está em teste.", "system"); return; }
  isSending = true; sendButton.disabled = true; avatar.classList.add("thinking"); connectionStatus.textContent = "Ted está pensando..."; messageInput.value = "";
  addMessage(message, "user");
  try { await saveMessage(message, "user"); messages[messages.length - 1].day = todayKey(); } catch (e) { console.error(e); }
  updateQuotaText();
  const loading = addMessage("Ted está digitando...", "ted", true, false);
  try {
    const local = localReplyClient(message);
    let reply, source;
    if (local) { reply = local; source = "local"; }
    else { const data = await callTed(message); reply = data.reply; source = data.source || "gemini"; }
    loading.remove(); addMessage(reply, "ted");
    try { await saveMessage(reply, "ted", source); } catch (e) { console.error(e); }
    maybeCaptureMemory(message); speak(reply);
  } catch (error) {
    console.error(error); loading.remove(); addMessage("Tive uma dificuldade técnica para responder agora. Detalhe: " + (error.message || "erro desconhecido"), "ted");
  } finally { isSending = false; sendButton.disabled = false; avatar.classList.remove("thinking"); connectionStatus.textContent = "Pronto para conversar"; messageInput.focus(); }
}
async function maybeCaptureMemory(message) {
  const lower = message.toLowerCase();
  const patterns = ["meu nome é", "eu trabalho", "eu estudo", "eu moro", "eu vendo", "eu gosto", "minha meta", "meu objetivo"];
  if (!patterns.some(p => lower.includes(p))) return;
  const text = message.slice(0, 260);
  try { await addDoc(collection(db, "users", currentUser.uid, "memories"), { text, createdAt: serverTimestamp(), source: "auto" }); await loadMemories(); renderHome(); } catch (e) { console.error(e); }
}

// Eventos
toggleAuthButton.addEventListener("click", () => setAuthMode(!isRegisterMode));
authForm.addEventListener("submit", async (event) => {
  event.preventDefault(); authMessage.textContent = ""; authSubmitButton.disabled = true;
  const name = nameInput.value.trim(), email = emailInput.value.trim(), password = passwordInput.value.trim();
  try {
    if (isRegisterMode) {
      if (!name) { authMessage.textContent = "Digite seu nome para criar a conta."; return; }
      const cred = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), { name, email, createdAt: serverTimestamp(), plan: "free" });
      await setDoc(doc(db, "users", cred.user.uid, "settings", "main"), settings);
    } else await signInWithEmailAndPassword(auth, email, password);
  } catch (e) { console.error(e); authMessage.textContent = friendlyFirebaseError(e); }
  finally { authSubmitButton.disabled = false; }
});
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) { logoutButton.classList.add("hidden"); showScreen("auth"); return; }
  logoutButton.classList.remove("hidden");
  await loadProfile(); await loadSettings(); await loadMemories(); await loadDiary(); renderHome(); showScreen("home");
});
logoutButton.addEventListener("click", () => signOut(auth));
brandButton.addEventListener("click", () => currentUser ? showScreen("home") : showScreen("auth"));
$("openChatButton").addEventListener("click", async () => { showScreen("chat"); await loadMessages(); updateQuotaText(); messageInput.focus(); });
$("openDiaryButton").addEventListener("click", () => { renderDiary(); showScreen("diary"); });
$("openMemoriesButton").addEventListener("click", () => { renderMemories(); showScreen("memories"); });
$("openSettingsButton").addEventListener("click", () => showScreen("settings"));
document.querySelectorAll(".backHomeButton").forEach(b => b.addEventListener("click", () => { renderHome(); showScreen("home"); }));
chatForm.addEventListener("submit", e => { e.preventDefault(); sendMessage(messageInput.value); });
voiceButton.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Seu navegador não suporta reconhecimento de voz. Tente pelo Chrome."); return; }
  const recognition = new SpeechRecognition(); recognition.lang = "pt-BR"; recognition.interimResults = false; recognition.maxAlternatives = 1;
  voiceButton.textContent = "🎧 Ouvindo..."; recognition.start();
  recognition.onresult = e => sendMessage(e.results[0][0].transcript);
  recognition.onerror = () => alert("Não consegui ouvir bem. Tente novamente.");
  recognition.onend = () => voiceButton.textContent = "🎤 Falar";
});
stopVoiceButton.addEventListener("click", () => { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); avatar.classList.remove("talking"); });
$("saveDiaryButton").addEventListener("click", async () => {
  const text = diaryInput.value.trim(); if (!text) return alert("Escreva algo antes de salvar.");
  await addDoc(collection(db, "users", currentUser.uid, "diary"), { text, mood: moodSelect.value, createdAt: serverTimestamp() }); diaryInput.value = ""; await loadDiary(); alert("Registro salvo.");
});
$("addMemoryButton").addEventListener("click", async () => {
  const text = manualMemoryInput.value.trim(); if (!text) return alert("Digite uma memória.");
  await addDoc(collection(db, "users", currentUser.uid, "memories"), { text, createdAt: serverTimestamp(), source: "manual" }); manualMemoryInput.value = ""; await loadMemories(); renderHome();
});
$("saveSettingsButton").addEventListener("click", async () => {
  settings = { voiceEnabled: voiceEnabledInput.checked, dailyLimit: Number(dailyLimitInput.value || 30), personality: personalitySelect.value };
  await saveSettings(); updateQuotaText(); alert("Configurações salvas.");
});
$("clearHistoryButton").addEventListener("click", async () => {
  if (!confirm("Apagar todo o histórico do chat?")) return;
  const snap = await getDocs(query(collection(db, "users", currentUser.uid, "messages")));
  for (const item of snap.docs) await deleteDoc(doc(db, "users", currentUser.uid, "messages", item.id));
  messages = []; alert("Histórico apagado.");
});
setAuthMode(false);
