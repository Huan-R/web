const SUPABASE_URL = "https://tbwflmrbulzikpwfacsx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_l5BBojWCbaYM7SjfXLultg_etqwk8D1";

const authSection = document.querySelector("#auth-section");
const userPanel = document.querySelector("#user-panel");
const authForm = document.querySelector("#auth-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginButton = document.querySelector("#login-button");
const signupButton = document.querySelector("#signup-button");
const authMessage = document.querySelector("#auth-message");

const messageForm = document.querySelector("#message-form");
const messageContent = document.querySelector("#message-content");
const characterCount = document.querySelector("#character-count");
const submitMessageButton = document.querySelector("#submit-message-button");
const messageStatus = document.querySelector("#message-status");
const messageHelp = document.querySelector("#message-help");
const messagesList = document.querySelector("#messages-list");
const refreshButton = document.querySelector("#refresh-button");

let supabase = null;
let currentUser = null;

function setStatus(element, text = "", type = "") {
  element.textContent = text;
  element.className = `status ${type}`.trim();
}

function setAuthBusy(isBusy) {
  loginButton.disabled = isBusy;
  signupButton.disabled = isBusy;
}

function formatDate(dateText) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateText));
}

function updateAuthView(user) {
  currentUser = user;

  authSection.hidden = Boolean(user);
  messageForm.hidden = !user;
  userPanel.replaceChildren();

  if (!user) {
    messageHelp.textContent = "登录后即可发布留言。";
    return;
  }

  const userEmail = document.createElement("p");
  userEmail.textContent = `已登录：${user.email || "用户"}`;

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "button-secondary";
  logoutButton.textContent = "退出登录";
  logoutButton.addEventListener("click", signOut);

  userPanel.append(userEmail, logoutButton);
  messageHelp.textContent = "发布的留言会立即保存到云端。";
}

async function loadMessages() {
  if (!supabase) {
    return;
  }

  refreshButton.disabled = true;
  messagesList.replaceChildren();

  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "正在加载留言...";
  messagesList.append(loading);

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("id, user_id, content, created_at")
      .order("created_at", { ascending: false });

    messagesList.replaceChildren();

    if (error) {
      const errorText = document.createElement("p");
      errorText.className = "empty-state";
      errorText.textContent = `留言加载失败：${error.message}`;
      messagesList.append(errorText);
      return;
    }

    if (!data || data.length === 0) {
      const emptyText = document.createElement("p");
      emptyText.className = "empty-state";
      emptyText.textContent = "还没有留言，登录后发布第一条吧。";
      messagesList.append(emptyText);
      return;
    }

    for (const message of data) {
      const item = document.createElement("article");
      item.className = "message-item";

      const meta = document.createElement("div");
      meta.className = "message-meta";

      const details = document.createElement("span");
      const isOwner = currentUser && message.user_id === currentUser.id;
      const author = isOwner ? "我" : "留言用户";

      details.textContent = `${author} · ${formatDate(message.created_at)}`;
      meta.append(details);

      if (isOwner) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "删除";
        deleteButton.addEventListener("click", () => deleteMessage(message.id));
        meta.append(deleteButton);
      }

      const content = document.createElement("p");
      content.className = "message-content";
      content.textContent = message.content;

      item.append(meta, content);
      messagesList.append(item);
    }
  } catch (error) {
    messagesList.replaceChildren();

    const errorText = document.createElement("p");
    errorText.className = "empty-state";
    errorText.textContent = `程序错误：${error.message}`;
    messagesList.append(errorText);
  } finally {
    refreshButton.disabled = false;
  }
}

async function signIn(event) {
  event.preventDefault();

  if (!supabase) {
    setStatus(authMessage, "Supabase 未正常加载。", "error");
    return;
  }

  if (!authForm.reportValidity()) {
    setStatus(authMessage, "请填写正确邮箱和至少 6 位密码。", "error");
    return;
  }

  setStatus(authMessage, "正在登录...");
  setAuthBusy(true);

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    if (error) {
      setStatus(authMessage, `登录失败：${error.message}`, "error");
    }
  } catch (error) {
    setStatus(authMessage, `程序错误：${error.message}`, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function signUp(event) {
  event.preventDefault();

  if (!supabase) {
    setStatus(authMessage, "Supabase 未正常加载。", "error");
    return;
  }

  if (!authForm.reportValidity()) {
    setStatus(authMessage, "请填写正确邮箱和至少 6 位密码。", "error");
    return;
  }

  setStatus(authMessage, "正在注册...");
  setAuthBusy(true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      options: {
        emailRedirectTo: "https://huan-r.github.io/web/"
      }
    });

    if (error) {
      setStatus(authMessage, `注册失败：${error.message}`, "error");
      return;
    }

    if (data.session) {
      setStatus(authMessage, "注册成功，已自动登录。", "success");
    } else {
      setStatus(
        authMessage,
        "注册成功，请到邮箱点击验证链接，再返回此页登录。",
        "success"
      );
    }
  } catch (error) {
    setStatus(authMessage, `程序错误：${error.message}`, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function signOut() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    setStatus(messageStatus, `退出失败：${error.message}`, "error");
  }
}

async function submitMessage(event) {
  event.preventDefault();

  if (!supabase || !currentUser) {
    return;
  }

  const content = messageContent.value.trim();

  if (!content) {
    setStatus(messageStatus, "请输入留言内容。", "error");
    return;
  }

  submitMessageButton.disabled = true;
  setStatus(messageStatus, "正在发布...");

  try {
    const { error } = await supabase.from("messages").insert({
      user_id: currentUser.id,
      content
    });

    if (error) {
      setStatus(messageStatus, `发布失败：${error.message}`, "error");
      return;
    }

    messageContent.value = "";
    characterCount.textContent = "0 / 500";
    setStatus(messageStatus, "留言已发布。", "success");
    await loadMessages();
  } catch (error) {
    setStatus(messageStatus, `程序错误：${error.message}`, "error");
  } finally {
    submitMessageButton.disabled = false;
  }
}

async function deleteMessage(id) {
  if (!supabase || !window.confirm("确定删除这条留言吗？")) {
    return;
  }

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", id);

  if (error) {
    setStatus(messageStatus, `删除失败：${error.message}`, "error");
    return;
  }

  setStatus(messageStatus, "留言已删除。", "success");
  await loadMessages();
}

authForm.addEventListener("submit", signIn);
signupButton.addEventListener("click", signUp);
messageForm.addEventListener("submit", submitMessage);
refreshButton.addEventListener("click", loadMessages);

messageContent.addEventListener("input", () => {
  characterCount.textContent = `${messageContent.value.length} / 500`;
});

window.addEventListener("error", (event) => {
  setStatus(authMessage, `页面脚本错误：${event.message}`, "error");
});

async function initializeApp() {
  if (!window.supabase) {
    setStatus(
      authMessage,
      "Supabase SDK 加载失败，请刷新页面后重试。",
      "error"
    );
    return;
  }

  try {
    supabase = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthView(session?.user ?? null);
      loadMessages();
    });

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setStatus(authMessage, `初始化失败：${error.message}`, "error");
      return;
    }

    updateAuthView(data.session?.user ?? null);
    await loadMessages();
  } catch (error) {
    setStatus(authMessage, `初始化失败：${error.message}`, "error");
  }
}

initializeApp();
