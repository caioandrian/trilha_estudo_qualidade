const STORAGE_KEY = "trilha_estudo_qualidade_v1";
const THEME_KEY = "trilha_theme_pref";
const CONTEXT_KEY = "trilha_contexto_pref";

const TRILHA_PUBLIC_URL = "https://caioandrian.github.io/trilha_estudo_qualidade/";

const LINKEDIN_POST_CONQUISTA = `Mais um ciclo de estudos concluído! 🎉

Acabei de finalizar uma trilha completa sobre Qualidade de Software — e aprendi (ou revisei) muito coisa importante:

📌 O que realmente é a área de QA e qual o papel do profissional de qualidade
📌 Os mitos que ainda existem sobre testes de software
📌 A pirâmide de testes e cada camada: unitário, integração, componente, E2E e exploratório
📌 Todos os principais tipos de teste: contrato, API, regressão, fumaça, desempenho, carga, estresse e mais
📌 As principais técnicas: particionamento de equivalência, análise de valor limite, tabela de decisão, pairwise e outras

Dá uma olhada se fizer sentido pra você: ${TRILHA_PUBLIC_URL}

Valeu, @caioandrian, por criar essa trilha gratuita e acessível!

#QA #QualidadeDeSoftware #TestesDesoftware #Qualidade #CarreiraEmTI #TechBrasil`;

const LINKEDIN_POST_SUGESTAO = `Passando pra recomendar uma trilha de estudos sobre Qualidade de Software — gratuita e bem completa 👇

Cobre desde os fundamentos (o que é QA, mitos e boas práticas) até a pirâmide de testes, todos os tipos de teste e as principais técnicas como particionamento de equivalência, análise de valor limite e pairwise testing.

Link: ${TRILHA_PUBLIC_URL}

Créditos ao @caioandrian por ter montado isso de graça pra comunidade.

#QA #QualidadeDeSoftware #Testes #TestesDesoftware #Qualidade #EngenhariaDeSoftware #TechBrasil`;

/** @typedef {{ titulo: string; url: string }} TeoriaLink */
/** @typedef {{ titulo?: string; paragrafos?: string[]; codigo?: string | null; codigoCompletoParaCopiar?: boolean }} TeoriaSecao */
/** @typedef {{ titulo: string; paragrafos?: string[]; codigo?: string | null; links?: TeoriaLink[]; secoes?: TeoriaSecao[] }} Teoria */
/** @typedef {{ id: string; ordem: number; titulo: string; contexto: string; teoria?: Teoria; atividades: any[] }} Topico */
/** @typedef {{ titulo: string; topicos: Topico[] }} TrilhaData */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        completed: /** @type {string[]} */ ([]),
        theoryVisited: /** @type {string[]} */ ([]),
        checklist: /** @type {Record<string, string[]>} */ ({}),
        selections: /** @type {Record<string, string[]>} */ ({}),
      };
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed.completed) ? parsed.completed : [];
    const theoryVisited = Array.isArray(parsed.theoryVisited) ? parsed.theoryVisited : [];
    const chk = parsed.checklist;
    const checklist =
      chk && typeof chk === "object" && !Array.isArray(chk) ? /** @type {Record<string, string[]>} */ (chk) : {};
    const sel = parsed.selections;
    const selections =
      sel && typeof sel === "object" && !Array.isArray(sel) ? /** @type {Record<string, string[]>} */ (sel) : {};
    return { completed, theoryVisited, checklist, selections };
  } catch {
    return { completed: [], theoryVisited: [], checklist: {}, selections: {} };
  }
}

function persist(completedSet, theoryVisitedSet, checklistDict, selectionsDict) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      completed: [...completedSet],
      theoryVisited: [...theoryVisitedSet],
      checklist: { ...checklistDict },
      selections: { ...selectionsDict },
    })
  );
}

function topicHasTheory(topico) {
  const t = topico.teoria;
  if (!t) return false;
  if (filterTheorySecoes(t).length > 0) return true;
  const paragraphs = Array.isArray(t.paragrafos) ? t.paragrafos.filter(Boolean) : [];
  if (paragraphs.length > 0) return true;
  if (t.codigo != null && String(t.codigo).trim() !== "") return true;
  const links = t.links;
  return Array.isArray(links) && links.length > 0;
}

function contextNavVariantClass(/** @type {string} */ label) {
  const ctx = label || "";
  if (/t[eé]cnica/i.test(ctx)) return "context-nav__btn--cicd";
  if (/tipos/i.test(ctx)) return "context-nav__btn--github";
  if (/n[ií]veis|camada/i.test(ctx)) return "context-nav__btn--cypress";
  return "context-nav__btn--logica";
}

/** @returns {"topic-btn--ctx-logica" | "topic-btn--ctx-cypress" | "topic-btn--ctx-github" | "topic-btn--ctx-cicd"} */
function topicBtnContextClass(/** @type {string} */ contextoLabel) {
  const v = contextNavVariantClass(contextoLabel);
  if (v.includes("cicd")) return "topic-btn--ctx-cicd";
  if (v.includes("cypress")) return "topic-btn--ctx-cypress";
  if (v.includes("github")) return "topic-btn--ctx-github";
  return "topic-btn--ctx-logica";
}

function collectContextos(topicos) {
  const sorted = [...topicos].sort((a, b) => a.ordem - b.ordem);
  const seen = new Set();
  /** @type {string[]} */
  const list = [];
  for (const t of sorted) {
    const c = t.contexto || "";
    if (seen.has(c)) continue;
    seen.add(c);
    list.push(c);
  }
  return list;
}

/** Para trilha de leitura: contexto completo quando todos os tópicos foram visitados. */
function contextIsComplete(contexto, topicos, theoryVisitedSet) {
  const ctxTopics = topicos.filter((t) => t.contexto === contexto);
  if (ctxTopics.length === 0) return false;
  return ctxTopics.every((t) => theoryVisitedSet.has(t.id));
}

function firstTopicIdInContext(topicos, contexto) {
  const list = [...topicos].filter((t) => t.contexto === contexto).sort((a, b) => a.ordem - b.ordem);
  return list[0]?.id ?? null;
}

/** Primeiro tópico não lido no contexto; se todos lidos, retorna o último. */
function firstUnreadTopicIdInContext(topicos, contexto, theoryVisitedSet) {
  const list = [...topicos].filter((t) => t.contexto === contexto).sort((a, b) => a.ordem - b.ordem);
  if (list.length === 0) return null;
  const unread = list.find((t) => !theoryVisitedSet.has(t.id));
  return unread ? unread.id : list[list.length - 1].id;
}

function renderContextNav(contextos, selectedContexto, topicos, theoryVisitedSet, onSelectContexto) {
  const nav = document.getElementById("contextNav");
  if (!nav) return;
  nav.innerHTML = contextos
    .map((label) => {
      const complete = contextIsComplete(label, topicos, theoryVisitedSet);
      const active = label === selectedContexto;
      const check = complete
        ? `<span class="context-nav__check" aria-hidden="true">✓</span>`
        : "";
      const variantCls = contextNavVariantClass(label);
      return `<button type="button" role="tab" aria-selected="${active}" class="context-nav__btn ${variantCls} ${
        active ? "context-nav__btn--active" : ""
      } ${complete ? "context-nav__btn--complete" : ""}" data-contexto="${escapeHtml(label)}">${check}<span class="context-nav__label">${escapeHtml(label)}</span></button>`;
    })
    .join("");

  nav.querySelectorAll(".context-nav__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const label = /** @type {HTMLElement} */ (btn).dataset.contexto;
      if (label) {
        onSelectContexto(label);
        closeContextNavMobilePanel();
      }
    });
  });
  syncContextNavMobileLabel(selectedContexto);
}

function syncContextNavMobileLabel(/** @type {string} */ selectedContexto) {
  const el = document.getElementById("contextNavActiveOnly");
  if (!el) return;
  el.textContent = selectedContexto;
  const btnVariant = contextNavVariantClass(selectedContexto);
  const activeOnlyVariant = btnVariant.replace("context-nav__btn--", "context-nav__active-only--");
  el.className = `context-nav__active-only ${activeOnlyVariant}`;
}

function closeContextNavMobilePanel() {
  if (!window.matchMedia(MOBILE_STUDY_SCROLL_MQ).matches) return;
  const wrap = document.getElementById("contextNavWrap");
  const toggle = document.getElementById("contextNavToggle");
  wrap?.classList.remove("context-nav-wrap--open");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

function resetContextNavMobileForViewport() {
  if (window.matchMedia(MOBILE_STUDY_SCROLL_MQ).matches) return;
  const wrap = document.getElementById("contextNavWrap");
  const toggle = document.getElementById("contextNavToggle");
  wrap?.classList.remove("context-nav-wrap--open");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

function wireContextNavMobileToggle() {
  const wrap = document.getElementById("contextNavWrap");
  const toggle = document.getElementById("contextNavToggle");
  if (!wrap || !toggle) return;
  toggle.addEventListener("click", () => {
    if (!window.matchMedia(MOBILE_STUDY_SCROLL_MQ).matches) return;
    const open = !wrap.classList.contains("context-nav-wrap--open");
    wrap.classList.toggle("context-nav-wrap--open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
}

function topicDone(topico, theoryVisitedSet) {
  return theoryVisitedSet.has(topico.id);
}

/** Para trilha de leitura: concluído quando todos os tópicos foram lidos. */
function allDone(topicos, theoryVisitedSet) {
  if (topicos.length === 0) return false;
  return topicos.every((t) => theoryVisitedSet.has(t.id));
}

async function loadTrilha() {
  const res = await fetch("data/trilha.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Não foi possível carregar data/trilha.json");
  return /** @type {TrilhaData} */ (await res.json());
}

function syncTopbarOffset() {
  const bar = document.querySelector(".topbar");
  if (!bar) return;
  document.documentElement.style.setProperty("--topbar-offset", `${Math.ceil(bar.getBoundingClientRect().height)}px`);
}

const MOBILE_SIDEBAR_FIXED_MQ = "(max-width: 1024px)";

function syncSidebarFixedOffset() {
  const mq = window.matchMedia(MOBILE_SIDEBAR_FIXED_MQ);
  if (!mq.matches) {
    document.documentElement.style.removeProperty("--sidebar-fixed-offset");
    return;
  }
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  document.documentElement.style.setProperty(
    "--sidebar-fixed-offset",
    `${Math.ceil(sidebar.getBoundingClientRect().height)}px`
  );
}

function syncLayoutChrome() {
  syncTopbarOffset();
  requestAnimationFrame(() => {
    syncSidebarFixedOffset();
    if (typeof window !== "undefined" && !window.matchMedia(MOBILE_SIDEBAR_FIXED_MQ).matches) {
      const sidebar = document.querySelector(".sidebar");
      if (sidebar?.classList.contains("sidebar--mobile-topic-active")) {
        sidebar.classList.remove("sidebar--mobile-topic-active");
        const headTitle = document.querySelector(".sidebar__head h2");
        if (headTitle) headTitle.textContent = "Tópicos";
        const tgl = document.getElementById("sidebarToggle");
        tgl?.setAttribute("aria-expanded", "true");
        document.getElementById("topicList")?.classList.remove("collapsed");
      }
    }
  });
}

const MOBILE_STUDY_SCROLL_MQ = "(max-width: 1024px)";

function isMobileStudyLayout() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_STUDY_SCROLL_MQ).matches;
}

function scrollAnchorMainInner() {
  requestAnimationFrame(() => {
    const el = document.getElementById("main__inner");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function scrollAnchorMainPanel() {
  requestAnimationFrame(() => {
    const el = document.getElementById("mainPanel");
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function scrollAnchorTheorySubpanel() {
  requestAnimationFrame(() => {
    const el = document.getElementById("theorySubpanel");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function scrollAnchorFeedbackPanel() {
  requestAnimationFrame(() => {
    const el = document.getElementById("feedbackPanel");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/** Renderiza a lista de tópicos na sidebar (somente clique no título — sem sub-botões). */
function renderTopicList(topicos, theoryVisitedSet, activeTopicId, selectedContexto, onSelectTopic) {
  const nav = document.getElementById("topicList");
  if (!nav) return;
  const sorted = [...topicos].sort((a, b) => a.ordem - b.ordem);
  const visible = sorted.filter((t) => t.contexto === selectedContexto);
  nav.innerHTML = visible
    .map((t) => {
      const done = topicDone(t, theoryVisitedSet);
      const ctxCls = topicBtnContextClass(t.contexto);
      const isCurrent = t.id === activeTopicId;
      const currentAttr = isCurrent ? ' aria-current="true"' : "";
      return `
        <div class="topic-block">
          <button type="button" class="topic-btn ${ctxCls} ${done ? "topic-btn--done" : ""} ${isCurrent ? "topic-btn--current" : ""}" data-topic-id="${t.id}"${currentAttr}>
            <span class="topic-btn__badge">${t.ordem}</span>
            <span class="topic-btn__text">
              <span class="topic-btn__title">${escapeHtml(t.titulo)}</span>
            </span>
            <span class="check" aria-hidden="true">✓</span>
          </button>
        </div>`;
    })
    .join("");

  nav.querySelectorAll(".topic-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      onSelectTopic(/** @type {HTMLElement} */ (btn).dataset.topicId)
    );
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function theoryCodeBlockHtml(/** @type {string | null | undefined} */ codigo) {
  const c = codigo == null ? "" : String(codigo).trim();
  if (!c) return "";
  return `<div class="code-block"><pre>${escapeHtml(c)}</pre></div>`;
}

function theoryCodeSectionFromSec(/** @type {TeoriaSecao} */ sec) {
  const c = sec.codigo == null ? "" : String(sec.codigo).trim();
  if (!c) return "";
  if (!sec.codigoCompletoParaCopiar)
    return `<div class="code-block"><pre>${escapeHtml(c)}</pre></div>`;
  return `<div class="theory-copyable-block"><button type="button" class="btn btn--ghost theory-copyable__btn" aria-label="Copiar arquivo completo">Copiar arquivo completo</button><div class="theory-copyable__pre-wrap"><pre>${escapeHtml(c)}</pre></div></div>`;
}

/** @param {Teoria} teoria */
function filterTheorySecoes(teoria) {
  const secoes = teoria.secoes;
  if (!Array.isArray(secoes) || secoes.length === 0) return [];
  return secoes.filter((s) => {
    if (!s || typeof s !== "object") return false;
    const hasTitle = Boolean(s.titulo && String(s.titulo).trim());
    const hasParas = Array.isArray(s.paragrafos) && s.paragrafos.some(Boolean);
    const hasCode = s.codigo != null && String(s.codigo).trim() !== "";
    return hasTitle || hasParas || hasCode;
  });
}

/** @param {NonNullable<Teoria["secoes"]>[number]} sec */
function buildSingleTheorySectionHtml(sec) {
  const titulo =
    sec.titulo && String(sec.titulo).trim()
      ? `<h3 class="theory-section__title">${escapeHtml(String(sec.titulo).trim())}</h3>`
      : "";
  const paras = (sec.paragrafos || [])
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  const body = paras ? `<div class="theory-body">${paras}</div>` : "";
  return `<section class="theory-section">${titulo}${body}${theoryCodeSectionFromSec(sec)}</section>`;
}

/** @param {Teoria} teoria */
function renderTheoryBodyLegacy(teoria) {
  const paragraphs = (teoria.paragrafos || [])
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
  const body = paragraphs ? `<div class="theory-body">${paragraphs}</div>` : "";
  return `${body}${theoryCodeBlockHtml(teoria.codigo)}`;
}

function wireTheoryCopyableBlocks(/** @type {ParentNode | null | undefined} */ root) {
  if (!root) return;
  root.querySelectorAll(".theory-copyable__btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.addEventListener("click", async () => {
      const block = btn.closest(".theory-copyable-block");
      const pre = block?.querySelector("pre");
      const text = pre?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copiado!";
        window.setTimeout(() => { btn.textContent = "Copiar arquivo completo"; }, 2000);
      } catch {
        btn.textContent = "Copiar arquivo completo";
      }
    });
  });
}

function setFeedbackReadingHint(topico, theoryVisitedSet, topicos, selectedContexto) {
  const panel = document.getElementById("feedbackPanel");
  if (!panel) return;
  const done = theoryVisitedSet.has(topico.id);
  const ctxTopics = [...topicos]
    .filter((t) => t.contexto === selectedContexto)
    .sort((a, b) => a.ordem - b.ordem);
  const total = ctxTopics.length;
  const read = ctxTopics.filter((t) => theoryVisitedSet.has(t.id)).length;
  const statusText = done
    ? `<span style="color:var(--success)">✓ Leitura concluída</span>`
    : `<span style="color:var(--muted)">Leitura pendente</span>`;
  panel.innerHTML = `
    <div class="feedback-result ${done ? "feedback-result--ok" : ""}">
      <p class="feedback-result__title">${done ? "Tópico lido" : "Em leitura"}</p>
      <p>${statusText}</p>
    </div>
    <div class="feedback-section" style="margin-top:1rem">
      <h3>Progresso neste conteúdo</h3>
      <p style="margin:0;color:var(--muted)">${read} de ${total} tópico(s) lido(s) em <strong>${escapeHtml(selectedContexto)}</strong>.</p>
    </div>`;
}

function clearFeedbackHint() {
  const panel = document.getElementById("feedbackPanel");
  if (!panel) return;
  panel.innerHTML = `<p class="feedback__hint">Selecione um tópico na lista ao lado para iniciar a leitura.</p>`;
}

function updateProgress(topicos, theoryVisitedSet) {
  const total = topicos.length;
  const visited = topicos.filter((t) => theoryVisitedSet.has(t.id)).length;
  const pct = total === 0 ? 0 : Math.round((visited / total) * 100);
  const fill = document.getElementById("progressFill");
  const pctEl = document.getElementById("progressPct");
  if (fill) {
    fill.style.width = `${pct}%`;
    fill.parentElement?.setAttribute("aria-valuenow", String(pct));
  }
  if (pctEl) pctEl.textContent = `${pct}%`;
}

function showCongratulations() {
  const view = document.getElementById("main__inner");
  if (!view) return;
  view.innerHTML = `
    <div class="congrats">
      <h2>Parabéns!</h2>
      <p>Você concluiu a Trilha de Estudos de Qualidade de Software!</p>
      <p>Agora você tem uma base sólida sobre QA, tipos, níveis e técnicas de teste. Continue explorando e colocando em prática!</p>
      <div class="congrats__share">
        <button type="button" class="btn btn--primary" data-linkedin-modal="conquista">
          Compartilhar
        </button>
        <button type="button" class="btn btn--ghost" data-linkedin-modal="sugestao">
          Recomendar
        </button>
      </div>
    </div>`;
}

function renderTheory(topico, ctx) {
  const view = document.getElementById("main__inner");
  const teoria = topico.teoria;
  if (!view || !teoria) return;

  const secoesFiltered = filterTheorySecoes(teoria);
  let theoryMainHtml = "";

  if (secoesFiltered.length > 1) {
    const navButtons = secoesFiltered
      .map((sec, i) => {
        const label =
          sec.titulo && String(sec.titulo).trim() ? String(sec.titulo).trim() : `Parte ${i + 1}`;
        const selected = i === 0;
        return `<button type="button" class="theory-subnav__btn${selected ? " theory-subnav__btn--active" : ""}" role="tab" aria-selected="${selected}" aria-controls="theorySubpanel" id="theoryTab${i}" data-theory-idx="${i}">${escapeHtml(label)}</button>`;
      })
      .join("");
    const firstPane = buildSingleTheorySectionHtml(secoesFiltered[0]);
    theoryMainHtml = `
    <nav class="theory-subnav" aria-label="Partes do conteúdo">
      <div class="theory-subnav__inner" role="tablist">${navButtons}</div>
    </nav>
    <div class="theory-subpanel" id="theorySubpanel" role="tabpanel" tabindex="0" aria-labelledby="theoryTab0">
      ${firstPane}
    </div>`;
  } else if (secoesFiltered.length === 1) {
    theoryMainHtml = buildSingleTheorySectionHtml(secoesFiltered[0]);
  } else {
    theoryMainHtml = renderTheoryBodyLegacy(teoria);
  }

  const linksItems = (teoria.links || [])
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.titulo)}</a></li>`
    )
    .join("");

  const linksBlock =
    linksItems.length > 0
      ? `<div class="theory-links">
          <h3>Links para estudo complementar</h3>
          <ul>${linksItems}</ul>
        </div>`
      : "";

  view.innerHTML = `
    <div class="theory-shell">
      <article class="theory-panel" aria-labelledby="theoryHeading">
        <div class="theory-panel__inner">
          <span class="theory-badge" aria-hidden="true">● Leitura</span>
          <h2 class="theory-heading" id="theoryHeading">${escapeHtml(teoria.titulo || topico.titulo)}</h2>
          ${theoryMainHtml}
          ${linksBlock}
          <div class="theory-actions">
            <button type="button" class="btn btn--primary" id="btnTheoryContinue">Marcar como lido</button>
          </div>
          <p class="theory-follow">Ao marcar como lido, o seu progresso na trilha avança. Você pode reler a qualquer momento clicando no tópico na lista ao lado.</p>
        </div>
      </article>
    </div>`;

  setFeedbackReadingHint(topico, ctx.theoryVisitedSet, ctx.topicos, ctx.selectedContexto);
  wireTheoryCopyableBlocks(view);

  if (secoesFiltered.length > 1) {
    const panel = document.getElementById("theorySubpanel");
    view.querySelectorAll(".theory-subnav__btn[data-theory-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = /** @type {HTMLElement} */ (btn).dataset.theoryIdx;
        const idx = raw != null ? parseInt(raw, 10) : 0;
        if (!Number.isFinite(idx) || idx < 0 || idx >= secoesFiltered.length) return;
        view.querySelectorAll(".theory-subnav__btn").forEach((b, j) => {
          const on = j === idx;
          b.classList.toggle("theory-subnav__btn--active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        if (panel) {
          panel.innerHTML = buildSingleTheorySectionHtml(secoesFiltered[idx]);
          wireTheoryCopyableBlocks(panel);
          panel.setAttribute("aria-labelledby", `theoryTab${idx}`);
        }
        if (isMobileStudyLayout()) scrollAnchorTheorySubpanel();
      });
    });
  }

  document.getElementById("btnTheoryContinue")?.addEventListener("click", () => {
    ctx.theoryVisitedSet.add(topico.id);
    persist(ctx.completedSet, ctx.theoryVisitedSet, ctx.checklistDict, ctx.selectionsDict);

    // Avança para o próximo tópico não lido no mesmo contexto
    const nextUnread = [...ctx.topicos]
      .filter((t) => t.contexto === topico.contexto)
      .sort((a, b) => a.ordem - b.ordem)
      .find((t) => !ctx.theoryVisitedSet.has(t.id));

    if (nextUnread) {
      ctx.setFocusTopicId(nextUnread.id);
    }

    ctx.paint();
    if (isMobileStudyLayout()) scrollAnchorMainInner();
  });
}

function renderTheoryAlreadyRead(topico, ctx) {
  const view = document.getElementById("main__inner");
  if (!view) return;
  view.innerHTML = `
    <div class="theory-shell">
      <article class="theory-panel" aria-labelledby="theoryReadHeading">
        <div class="theory-panel__inner">
          <span class="theory-badge" aria-hidden="true">✓ Leitura concluída</span>
          <h2 class="theory-heading" id="theoryReadHeading">${escapeHtml(topico.titulo)}</h2>
          <div class="theory-body">
            <p>Você já leu este tópico. Clique abaixo para reler o conteúdo.</p>
          </div>
          <div class="theory-actions">
            <button type="button" class="btn btn--primary" id="btnReopenTheory">Reler conteúdo</button>
          </div>
        </div>
      </article>
    </div>`;

  setFeedbackReadingHint(topico, ctx.theoryVisitedSet, ctx.topicos, ctx.selectedContexto);

  document.getElementById("btnReopenTheory")?.addEventListener("click", () => {
    ctx.theoryVisitedSet.delete(topico.id);
    persist(ctx.completedSet, ctx.theoryVisitedSet, ctx.checklistDict, ctx.selectionsDict);
    ctx.paint();
  });
}

function initLinkedinShareModal() {
  const dialog = document.getElementById("linkedinShareModal");
  const textarea = document.getElementById("linkedinShareText");
  const titleEl = document.getElementById("linkedinShareTitle");
  const copyBtn = document.getElementById("linkedinShareCopy");
  const closeBtn = document.getElementById("linkedinShareClose");
  if (!dialog || !textarea || !titleEl || !copyBtn || !closeBtn) return;

  let copyResetTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

  function setCopyButtonLabel(label) {
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
    copyBtn.textContent = label;
    if (label === "Copiado!") {
      copyResetTimer = setTimeout(() => {
        copyBtn.textContent = "Copiar texto";
        copyResetTimer = null;
      }, 2200);
    }
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest("[data-linkedin-modal]");
    if (!btn) return;
    const kind = btn.getAttribute("data-linkedin-modal");
    if (kind !== "conquista" && kind !== "sugestao") return;
    textarea.value = kind === "conquista" ? LINKEDIN_POST_CONQUISTA : LINKEDIN_POST_SUGESTAO;
    titleEl.textContent =
      kind === "conquista"
        ? "Compartilhar conquista — texto para colar no LinkedIn"
        : "Sugerir a trilha — texto para colar no LinkedIn";
    setCopyButtonLabel("Copiar texto");
    dialog.showModal();
    textarea.focus();
    textarea.select();
  });

  copyBtn.addEventListener("click", async () => {
    const text = textarea.value;
    try {
      await navigator.clipboard.writeText(text);
      setCopyButtonLabel("Copiado!");
    } catch {
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        setCopyButtonLabel("Copiado!");
      } catch {
        setCopyButtonLabel("Copiar texto");
      }
    }
  });

  closeBtn.addEventListener("click", () => { dialog.close(); });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const isLight = saved === "light";
  document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");

  const btn = document.getElementById("themeToggle");
  const label = document.getElementById("themeLabel");
  if (btn) btn.setAttribute("aria-checked", isLight ? "true" : "false");
  if (label) label.textContent = isLight ? "Tema claro" : "Tema escuro";

  btn?.addEventListener("click", () => {
    const nowLight = document.documentElement.getAttribute("data-theme") === "light";
    const next = nowLight ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "dark");
    localStorage.setItem(THEME_KEY, next);
    btn.setAttribute("aria-checked", next === "light" ? "true" : "false");
    if (label) label.textContent = next === "light" ? "Tema claro" : "Tema escuro";
  });
}

function initAppReset() {
  document.getElementById("appResetBtn")?.addEventListener("click", () => {
    const ok = window.confirm(
      "Apagar progresso da trilha, marcações e preferências salvas neste site? A página será recarregada."
    );
    if (!ok) return;
    try { localStorage.clear(); } catch { /* ignore */ }
    location.reload();
  });
}

async function main() {
  initTheme();
  initAppReset();
  initLinkedinShareModal();
  wireContextNavMobileToggle();

  const topicListEl = document.getElementById("topicList");
  const sidebarToggle = document.getElementById("sidebarToggle");

  let data;
  try {
    data = await loadTrilha();
  } catch (e) {
    const view = document.getElementById("main__inner");
    if (view) {
      view.innerHTML = `
        <div class="activity-card">
          <p class="activity-card__title">Erro ao carregar a trilha</p>
          <p class="activity-desc">Abra o site por um servidor local (por exemplo, na pasta do projeto: <code>npx serve</code> ou extensão Live Server), pois o navegador bloqueia <code>fetch</code> em arquivos <code>file://</code>.</p>
          <p class="activity-desc" style="margin-top:0.75rem">${escapeHtml(String(e))}</p>
        </div>`;
    }
    return;
  }

  const topicos = data.topicos.sort((a, b) => a.ordem - b.ordem);
  const state = loadState();
  const completedSet = new Set(state.completed);
  const theoryVisitedSet = new Set(state.theoryVisited);
  const checklistDict = { ...state.checklist };
  const selectionsDict = { ...state.selections };
  persist(completedSet, theoryVisitedSet, checklistDict, selectionsDict);

  const contextos = collectContextos(topicos);
  let selectedContexto = localStorage.getItem(CONTEXT_KEY) || "";
  if (!contextos.includes(selectedContexto)) {
    selectedContexto = contextos[0] || "";
  }

  let focusTopicId = firstUnreadTopicIdInContext(topicos, selectedContexto, theoryVisitedSet)
    || firstTopicIdInContext(topicos, selectedContexto);

  function resolveFocusTopico() {
    if (!focusTopicId) return null;
    const t = topicos.find((x) => x.id === focusTopicId);
    if (t && t.contexto === selectedContexto) return t;
    focusTopicId = null;
    return null;
  }

  function resetMobileSidebarTopicActiveMode() {
    document.querySelector(".sidebar")?.classList.remove("sidebar--mobile-topic-active");
    const headTitle = document.querySelector(".sidebar__head h2");
    if (headTitle) headTitle.textContent = "Tópicos";
    sidebarToggle?.setAttribute("aria-expanded", "true");
    topicListEl?.classList.remove("collapsed");
  }

  function refreshMobileSidebarHeadTitle() {
    if (typeof window === "undefined" || !window.matchMedia(MOBILE_SIDEBAR_FIXED_MQ).matches) return;
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar?.classList.contains("sidebar--mobile-topic-active")) return;
    const top = resolveFocusTopico();
    const headTitle = document.querySelector(".sidebar__head h2");
    if (headTitle && top) headTitle.textContent = top.titulo;
  }

  function enterMobileSidebarTopicActiveMode() {
    if (typeof window === "undefined" || !window.matchMedia(MOBILE_SIDEBAR_FIXED_MQ).matches) return;
    document.querySelector(".sidebar")?.classList.add("sidebar--mobile-topic-active");
    sidebarToggle?.setAttribute("aria-expanded", "false");
    topicListEl?.classList.add("collapsed");
    refreshMobileSidebarHeadTitle();
  }

  sidebarToggle?.addEventListener("click", () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_SIDEBAR_FIXED_MQ).matches &&
      document.querySelector(".sidebar")?.classList.contains("sidebar--mobile-topic-active")
    ) {
      resetMobileSidebarTopicActiveMode();
      requestAnimationFrame(() => { syncLayoutChrome(); });
      return;
    }
    const expanded = sidebarToggle.getAttribute("aria-expanded") === "true";
    sidebarToggle.setAttribute("aria-expanded", String(!expanded));
    topicListEl?.classList.toggle("collapsed", expanded);
    requestAnimationFrame(() => { syncLayoutChrome(); });
  });

  function onSelectTopic(topicId) {
    const top = topicos.find((t) => t.id === topicId);
    if (!top) return;
    focusTopicId = topicId;
    const ctxTop = top.contexto;
    if (ctxTop && ctxTop !== selectedContexto) {
      selectedContexto = ctxTop;
      localStorage.setItem(CONTEXT_KEY, selectedContexto);
    }
    clearFeedbackHint();
    paint();
    enterMobileSidebarTopicActiveMode();
    requestAnimationFrame(() => {
      syncLayoutChrome();
      requestAnimationFrame(() => { scrollAnchorMainPanel(); });
    });
  }

  function onSelectContexto(contexto) {
    if (!contextos.includes(contexto)) return;
    selectedContexto = contexto;
    localStorage.setItem(CONTEXT_KEY, contexto);
    focusTopicId = firstUnreadTopicIdInContext(topicos, selectedContexto, theoryVisitedSet)
      || firstTopicIdInContext(topicos, selectedContexto);
    clearFeedbackHint();
    resetMobileSidebarTopicActiveMode();
    paint();
    requestAnimationFrame(() => {
      syncLayoutChrome();
      requestAnimationFrame(() => {
        syncLayoutChrome();
        if (isMobileStudyLayout()) scrollAnchorMainInner();
      });
    });
  }

  function paint() {
    if (allDone(topicos, theoryVisitedSet)) {
      updateProgress(topicos, theoryVisitedSet);
      renderContextNav(contextos, selectedContexto, topicos, theoryVisitedSet, onSelectContexto);
      renderTopicList(topicos, theoryVisitedSet, focusTopicId || "", selectedContexto, onSelectTopic);
      showCongratulations();
      resetMobileSidebarTopicActiveMode();
      syncLayoutChrome();
      return;
    }

    const ctx = {
      topicos,
      completedSet,
      theoryVisitedSet,
      checklistDict,
      selectionsDict,
      selectedContexto,
      contextos,
      onSelectTopic,
      onSelectContexto,
      setFocusTopicId: (id) => { focusTopicId = id; },
      paint,
    };

    renderContextNav(contextos, selectedContexto, topicos, theoryVisitedSet, onSelectContexto);
    renderTopicList(topicos, theoryVisitedSet, focusTopicId || "", selectedContexto, onSelectTopic);
    updateProgress(topicos, theoryVisitedSet);

    const focusTopic = resolveFocusTopico();
    if (!focusTopic) {
      const view = document.getElementById("main__inner");
      if (view) view.innerHTML = `<p class="loading">Selecione um tópico para começar.</p>`;
      refreshMobileSidebarHeadTitle();
      syncLayoutChrome();
      return;
    }

    const alreadyRead = theoryVisitedSet.has(focusTopic.id);
    if (topicHasTheory(focusTopic) && !alreadyRead) {
      renderTheory(focusTopic, ctx);
    } else if (alreadyRead) {
      renderTheoryAlreadyRead(focusTopic, ctx);
    } else {
      const view = document.getElementById("main__inner");
      if (view) view.innerHTML = `<p class="loading">Sem conteúdo disponível para este tópico.</p>`;
    }

    refreshMobileSidebarHeadTitle();
    syncLayoutChrome();
  }

  paint();

  if (isMobileStudyLayout()) {
    enterMobileSidebarTopicActiveMode();
    requestAnimationFrame(() => {
      syncLayoutChrome();
      requestAnimationFrame(() => { scrollAnchorMainPanel(); });
    });
  }

  window.addEventListener("resize", () => {
    syncLayoutChrome();
    resetContextNavMobileForViewport();
  });
}

main();
