import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  getDocs
} from "./firebase.js";

const $ = (id) => document.getElementById(id);

const authScreen = $("authScreen");
const chatScreen = $("chatScreen");
const authForm = $("authForm");
const authTitle = $("authTitle");
const authButton = $("authButton");
const toggleAuth = $("toggleAuth");
const resetPassword = $("resetPassword");
const authMessage = $("authMessage");
const displayName = $("displayName");
const email = $("email");
const password = $("password");
const messages = $("messages");
const chatForm = $("chatForm");
const messageInput = $("messageInput");
const typing = $("typing");
const statusText = $("statusText");
const logoutBtn = $("logoutBtn");
const themeBtn = $("themeBtn");
const micBtn = $("micBtn");
const avatar = $("avatar");

let isRegisterMode = false;
let currentUser = null;
let unsubscribeMessages = null;
let recognition = null;

const savedTheme = localStorage.getItem("ted-theme");
if (savedTheme === "dark") document.body.classList.add("dark");

function setAuthMessage(text, isError = true) {
  authMessage.textContent = text;
  authMessage.style.color = isError ? "var(--danger)" : "var(--accent)";
}

function firebaseErrorToText(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential")) return "E-mail ou senha incorretos.";
  if (code.includes("email-already-in-use")) return "Este e-mail já está cadastrado.";
  if (code.includes("weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (code.includes("invalid-email")) return "Digite um e-mail válido.";
  return "Algo deu errado. Tente novamente.";
}

function toggleMode() {
  isRegisterMode = !isRegisterMode;
  authTitle.textContent = isRegisterMode ? "Criar conta" : "Entrar";
  authButton.textContent = isRegisterMode ? "Cadastrar" : "Entrar";
  toggleAuth.textContent = isRegisterMode ? "Já tenho conta" : "Criar uma conta";
  displayName.parentElement.style.display = isRegisterMode ? "grid" : "none";
  setAuthMessage("");
}

displayName.parentElement.style.display = "none";
toggleAuth.addEventListener("click", toggleMode);

resetPassword.addEventListener("click", async () => {
  if (!email.value.trim()) return setAuthMessage("Digite seu e-mail para recuperar a senha.");
  try {
    await sendPasswordResetEmail(auth, email.value.trim());
    setAuthMessage("Enviamos um e-mail de recuperação de senha.", false);
  } catch (error) {
    setAuthMessage(firebaseErrorToText(error));
  }
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("");
  authButton.disabled = true;
  authButton.textContent = isRegisterMode ? "Cadastrando..." : "Entrando...";
  try {
    if (isRegisterMode) {
      const cred = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value);
      if (displayName.value.trim()) {
        await updateProfile(cred.user, { displayName: displayName.value.trim() });
      }
    } else {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    }
  } catch (error) {
    setAuthMessage(firebaseErrorToText(error));
  } finally {
    authButton.disabled = false;
    authButton.textContent = isRegisterMode ? "Cadastrar" : "Entrar";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("ted-theme", document.body.classList.contains("dark") ? "dark" : "light");
});

function msgCollection() {
  return collection(db, "users", currentUser.uid, "messages");
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function renderMessage(data) {
  const div = document.createElement("div");
  div.className = `bubble ${data.role === "user" ? "user" : "ted"}`;
  div.textContent = data.content;
  const small = document.createElement("small");
  small.textContent = data.createdAt?.toDate ? formatTime(data.createdAt.toDate()) : "agora";
  div.appendChild(small);
  return div;
}

function listenMessages() {
  if (unsubscribeMessages) unsubscribeMessages();
  const q = query(msgCollection(), orderBy("createdAt", "asc"), limit(80));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messages.innerHTML = "";
    snapshot.forEach((doc) => messages.appendChild(renderMessage(doc.data())));
    messages.scrollTop = messages.scrollHeight;
  });
}

async function loadRecentHistory() {
  const q = query(msgCollection(), orderBy("createdAt", "desc"), limit(12));
  const snap = await getDocs(q);
  return snap.docs
    .map((doc) => doc.data())
    .reverse()
    .map((m) => ({ role: m.role === "user" ? "user" : "model", content: m.content }));
}

async function saveMessage(role, content) {
  await addDoc(msgCollection(), { role, content, createdAt: serverTimestamp() });
}

async function askTed(message) {
  const history = await loadRecentHistory();
  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      userName: currentUser.displayName || "amigo",
      history
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro ao conversar com Ted.");
  return data.reply || "Estou aqui com você. Me conta um pouco mais?";
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
  utterance.pitch = 1.02;
  utterance.onstart = () => avatar.classList.add("talking");
  utterance.onend = () => avatar.classList.remove("talking");
  window.speechSynthesis.speak(utterance);
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message || !currentUser) return;

  messageInput.value = "";
  typing.classList.remove("hidden");
  statusText.textContent = "pensando com carinho na resposta...";

  try {
    await saveMessage("user", message);
    const reply = await askTed(message);
    await saveMessage("ted", reply);
    speak(reply);
  } catch (error) {
    await saveMessage("ted", "Tive uma dificuldade para responder agora, mas continuo aqui. Tente enviar de novo em alguns segundos.");
  } finally {
    typing.classList.add("hidden");
    statusText.textContent = "online e pronto para conversar";
  }
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = `${messageInput.scrollHeight}px`;
});

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    micBtn.title = "Reconhecimento de voz não disponível neste navegador";
    micBtn.disabled = true;
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    micBtn.classList.add("listening");
    avatar.classList.add("listening");
    statusText.textContent = "ouvindo você...";
  };
  recognition.onresult = (event) => {
    messageInput.value = event.results[0][0].transcript;
    messageInput.focus();
  };
  recognition.onend = () => {
    micBtn.classList.remove("listening");
    avatar.classList.remove("listening");
    statusText.textContent = "online e pronto para conversar";
  };
}

micBtn.addEventListener("click", () => recognition?.start());
setupSpeechRecognition();

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    authScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    listenMessages();

    const firstVisitKey = `ted-welcome-${user.uid}`;
    if (!localStorage.getItem(firstVisitKey)) {
      localStorage.setItem(firstVisitKey, "yes");
      await saveMessage("ted", `Olá${user.displayName ? ", " + user.displayName : ""}. Eu sou o Ted. Estou aqui para conversar, te escutar e fazer companhia. Como você está hoje?`);
    }
  } else {
    if (unsubscribeMessages) unsubscribeMessages();
    messages.innerHTML = "";
    authScreen.classList.remove("hidden");
    chatScreen.classList.add("hidden");
  }
});
