const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const { projects, certificates } = window.portfolioData;

function openWithCardFeedback(card, callback) {
  if (reduceMotion) {
    callback();
    return;
  }
  if (card.classList.contains("is-opening")) return;
  card.classList.add("is-opening");
  window.setTimeout(() => {
    callback();
    window.setTimeout(() => card.classList.remove("is-opening"), 220);
  }, 110);
}

/* Card templates */
function projectCard(project, set) {
  const element = document.createElement("article");
  element.className = "project-card";
  element.dataset.set = set;

  const chips = project.tags
    .map((tag) => `<span class="project-tag">${tag}</span>`)
    .join("");

  element.innerHTML = `
    <div class="project-media">
      <video src="${project.video}" autoplay muted loop playsinline preload="metadata"></video>
    </div>
    <div class="project-meta">
      <div class="project-tags">${chips}</div>
      <h3 class="project-title">${project.title}</h3>
      <div class="project-footer">
        <p class="project-subtitle">${project.subtitle}</p>
        <span class="project-read">View details&nbsp;&nbsp;↗</span>
      </div>
    </div>`;

  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", `Open details for ${project.title}`);
  element.addEventListener("click", () => {
    const viewport = document.getElementById("projectViewport");
    if (viewport?.dataset.justDragged === "1") return;
    openWithCardFeedback(element, () => openProject(project, element));
  });
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openWithCardFeedback(element, () => openProject(project, element));
  });
  return element;
}

function certificateCard(certificate, set) {
  const element = document.createElement("article");
  element.className = "certificate-card";
  element.dataset.set = set;

  const imageClass =
    certificate.thumbnailFit === "cover"
      ? "certificate-image certificate-image-cover"
      : "certificate-image";
  const media = certificate.image
    ? `<img class="${imageClass}" src="${certificate.image}" alt="${certificate.title} certificate" loading="lazy" draggable="false" />`
    : `<div class="certificate-placeholder"><div class="placeholder-icon"></div><span>Certificate image</span></div>`;

  element.innerHTML = `
    <div class="certificate-media">
      ${media}
    </div>
    <div class="certificate-info">
      <div class="certificate-details"><span>${certificate.issuer}</span><span>${certificate.year}</span></div>
      <strong>${certificate.title}</strong>
    </div>`;

  element.addEventListener("click", () => {
    const viewport = document.getElementById("certificateViewport");
    if (viewport?.dataset.justDragged === "1") return;
    openWithCardFeedback(element, () => openCertificate(certificate, element));
  });
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", `Open details for ${certificate.title}`);
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openWithCardFeedback(element, () => openCertificate(certificate, element));
  });

  return element;
}

/* Populate both copies needed by each infinite rail */
const projectTrack = document.getElementById("projectTrack");
for (let set = 0; set < 2; set += 1) {
  projects.forEach((project) =>
    projectTrack.appendChild(projectCard(project, set)),
  );
}

const certificateTrack = document.getElementById("certificateTrack");
for (let set = 0; set < 2; set += 1) {
  certificates.forEach((certificate) =>
    certificateTrack.appendChild(certificateCard(certificate, set)),
  );
}

/* Infinite rail interaction */
function makeInfiniteRail(viewport, track, { speed = 30 } = {}) {
  let offset = 0;
  let last = performance.now();
  let loopWidth = 0;
  let dragging = false;
  let startX = 0;
  let startOffset = 0;
  let visible = false;
  let moved = false;

  const gap = () => parseFloat(getComputedStyle(track).gap) || 0;

  function measure() {
    const firstSet = [...track.children].filter(
      (element) => element.dataset.set === "0",
    );
    if (!firstSet.length) return;
    loopWidth =
      firstSet.reduce(
        (sum, element) => sum + element.getBoundingClientRect().width,
        0,
      ) +
      gap() * firstSet.length;
  }

  function normalize() {
    if (!loopWidth) return;
    while (offset <= -loopWidth) offset += loopWidth;
    while (offset > 0) offset -= loopWidth;
  }

  function render() {
    normalize();
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  }

  function shouldMove() {
    return visible && !dragging && !reduceMotion;
  }

  function frame(now) {
    const deltaTime = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (shouldMove()) offset -= speed * deltaTime;
    render();
    requestAnimationFrame(frame);
  }

  viewport.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    startOffset = offset;
    viewport.classList.add("dragging");
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) > 6 && !moved) {
      moved = true;
      viewport.dataset.justDragged = "1";
      viewport.setPointerCapture?.(event.pointerId);
    }
    offset = startOffset + deltaX;
    render();
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove("dragging");
    if (moved)
      setTimeout(() => {
        viewport.dataset.justDragged = "0";
      }, 120);
  };

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visible = entry.isIntersecting;
      });
    },
    { threshold: 0.08 },
  ).observe(viewport);

  new ResizeObserver(measure).observe(viewport);
  window.addEventListener("load", measure);
  measure();
  requestAnimationFrame(frame);
}

makeInfiniteRail(document.getElementById("projectViewport"), projectTrack, {
  speed: 28,
});
makeInfiniteRail(document.getElementById("certificateViewport"), certificateTrack, {
  speed: 38,
});

/* Pause project videos while off screen */
const videos = [...document.querySelectorAll(".project-media video")];
const videoObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.play().catch(() => {});
      else entry.target.pause();
    });
  },
  { threshold: 0.15 },
);
videos.forEach((video) => videoObserver.observe(video));

/* Project and certificate detail modal */
const modal = document.getElementById("modal");
const modalMedia = document.getElementById("modalMedia");
const modalKind = document.getElementById("modalKind");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalTags = document.getElementById("modalTags");
const modalDescription = document.getElementById("modalDescription");
const modalClose = document.getElementById("modalClose");
const modalBox = modal.querySelector(".detail-modal-box");
let lastFocusedCard = null;
let modalFitFrame = 0;

function fitModalDescription() {
  let fontSize = 14;
  modalDescription.style.removeProperty("font-size");
  modalDescription.style.removeProperty("line-height");

  while (modalBox.scrollHeight > modalBox.clientHeight + 1 && fontSize > 9) {
    fontSize -= 0.5;
    modalDescription.style.fontSize = `${fontSize}px`;
    modalDescription.style.lineHeight = String(
      Math.max(1.45, 1.8 - (14 - fontSize) * 0.07),
    );
  }
}

function scheduleModalDescriptionFit() {
  cancelAnimationFrame(modalFitFrame);
  modalFitFrame = requestAnimationFrame(() => {
    modalFitFrame = requestAnimationFrame(fitModalDescription);
  });
}

function showModal(item, type, card) {
  lastFocusedCard = card;
  modalMedia.replaceChildren();
  modalTags.replaceChildren();
  modalMedia.classList.remove("fit-certificate");
  modalMedia.style.removeProperty("--detail-aspect");
  modalKind.textContent =
    type === "project" ? "Project detail" : "Certificate detail";
  modalTitle.textContent = item.title;
  modalSubtitle.textContent =
    type === "project" ? item.subtitle : `${item.issuer} · ${item.year}`;
  modalDescription.textContent =
    item.description || "More information will be added soon.";
  modalDescription.style.removeProperty("font-size");
  modalDescription.style.removeProperty("line-height");

  if (type === "project") {
    const video = document.createElement("video");
    video.src = item.video;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    modalMedia.appendChild(video);

    item.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "project-tag";
      chip.textContent = tag;
      modalTags.appendChild(chip);
    });
  } else if (item.image) {
    if (item.aspectRatio) {
      modalMedia.classList.add("fit-certificate");
      modalMedia.style.setProperty("--detail-aspect", item.aspectRatio);
    }
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = `${item.title} certificate`;
    modalMedia.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "certificate-placeholder";
    placeholder.innerHTML =
      '<div class="placeholder-icon"></div><span>Certificate image</span>';
    modalMedia.appendChild(placeholder);
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  scheduleModalDescriptionFit();
  const modalVisual = modalMedia.querySelector("img, video");
  modalVisual?.addEventListener(
    modalVisual.tagName === "IMG" ? "load" : "loadedmetadata",
    scheduleModalDescriptionFit,
    { once: true },
  );
  modalClose.focus();
}

function openProject(project, card) {
  showModal(project, "project", card);
}

function openCertificate(certificate, card) {
  showModal(certificate, "certificate", card);
}

function closeModal() {
  if (!modal.classList.contains("open")) return;
  modalMedia.querySelector("video")?.pause();
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  lastFocusedCard?.focus();
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});
window.addEventListener("resize", () => {
  if (modal.classList.contains("open")) scheduleModalDescriptionFit();
});

/* Keep placeholder contact links inactive until real URLs are added. */
document.querySelectorAll('.socials a[href="#"]').forEach((link) => {
  link.addEventListener("click", (event) => event.preventDefault());
});

/* Contact form placeholder until a recipient or form service is configured. */
const contactForm = document.getElementById("contactForm");
const contactFormStatus = document.getElementById("contactFormStatus");
contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  contactFormStatus.textContent =
    "Add a destination email or form service to enable message delivery.";
});
