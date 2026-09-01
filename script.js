const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const { projects, certificates } = window.portfolioData;

/*  profile */
const heroProfileScene = document.getElementById("heroProfileScene");
const heroProfileRotator = document.getElementById("heroProfileRotator");
const heroProfileImage = document.getElementById("heroProfileImage");
const heroProfileNextImage = document.getElementById("heroProfileNextImage");

const profilePhotos = [
  {
    src: "assets/images/profile-resha-02.jpeg",
    alt: "Resha Priyatna at Pertamina Trans Kontinental",
    position: "42% 54%",
  },
  {
    src: "assets/images/profile-resha-03.jpeg",
    alt: "Resha Priyatna in front of the Wahidin Sudiro Husodo building",
    position: "50% 57%",
  },
];

const PROFILE_INTERVAL_MS = 5000;
const PROFILE_TURN_DURATION_MS = 320;
let profileIndex = 0;
let profileTimer = null;
let profileIsTurning = false;

function setCurrentProfile(photo) {
  if (heroProfileImage) {
    heroProfileImage.src = photo.src;
    heroProfileImage.alt = photo.alt;
    heroProfileImage.style.setProperty("--profile-position", photo.position);
  }
}

function setNextProfile(photo) {
  if (!heroProfileNextImage) return;
  heroProfileNextImage.src = photo.src;
  heroProfileNextImage.style.setProperty("--profile-position", photo.position);
}

function finishProfileTurn(nextIndex) {
  profileIndex = nextIndex;
  heroProfileRotator?.classList.add("is-resetting");
  heroProfileRotator?.classList.remove("is-fading");
  setCurrentProfile(profilePhotos[profileIndex]);
  setNextProfile(profilePhotos[(profileIndex + 1) % profilePhotos.length]);
  heroProfileRotator?.offsetWidth;
  window.setTimeout(() => {
    heroProfileRotator?.classList.remove("is-resetting");
    profileIsTurning = false;
  }, 20);
}

function rotateProfile() {
  if (
    profileIsTurning ||
    !heroProfileRotator ||
    !heroProfileNextImage
  ) {
    return;
  }

  profileIsTurning = true;
  const nextIndex = (profileIndex + 1) % profilePhotos.length;
  setNextProfile(profilePhotos[nextIndex]);
  heroProfileRotator.offsetWidth;

  window.setTimeout(() => {
    heroProfileRotator.classList.add("is-fading");
    window.setTimeout(
      () => finishProfileTurn(nextIndex),
      PROFILE_TURN_DURATION_MS,
    );
  }, 20);
}

function startProfileRotation() {
  window.clearInterval(profileTimer);
  if (reduceMotion || !heroProfileRotator) return;
  profileTimer = window.setInterval(rotateProfile, PROFILE_INTERVAL_MS);
}

profilePhotos.forEach((photo) => {
  const preload = new Image();
  preload.src = photo.src;
});
setCurrentProfile(profilePhotos[0]);
setNextProfile(profilePhotos[1]);
startProfileRotation();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearInterval(profileTimer);
    profileTimer = null;
    return;
  }
  startProfileRotation();
});

const profileParallaxLayers = heroProfileScene
  ? [...heroProfileScene.querySelectorAll("[data-profile-depth]")]
  : [];
const profileFinePointer = window.matchMedia("(pointer: fine)").matches;
let profileParallaxFrame = null;
let profileTargetX = 0;
let profileTargetY = 0;
let profileCurrentX = 0;
let profileCurrentY = 0;

function renderProfileParallax() {
  profileCurrentX += (profileTargetX - profileCurrentX) * 0.1;
  profileCurrentY += (profileTargetY - profileCurrentY) * 0.1;

  profileParallaxLayers.forEach((layer) => {
    const depth = Number(layer.dataset.profileDepth || 0.5);
    layer.style.setProperty("--profile-move-x", `${profileCurrentX * depth}px`);
    layer.style.setProperty("--profile-move-y", `${profileCurrentY * depth}px`);
  });

  const stillMoving =
    Math.abs(profileTargetX - profileCurrentX) > 0.05 ||
    Math.abs(profileTargetY - profileCurrentY) > 0.05;
  profileParallaxFrame = stillMoving
    ? requestAnimationFrame(renderProfileParallax)
    : null;
}

function requestProfileParallaxFrame() {
  if (!profileParallaxFrame) {
    profileParallaxFrame = requestAnimationFrame(renderProfileParallax);
  }
}

function resetProfileParallax() {
  profileTargetX = 0;
  profileTargetY = 0;
  requestProfileParallaxFrame();
}

if (
  heroProfileScene &&
  profileParallaxLayers.length > 0 &&
  profileFinePointer &&
  !reduceMotion
) {
  heroProfileScene.addEventListener(
    "pointermove",
    (event) => {
      const bounds = heroProfileScene.getBoundingClientRect();
      profileTargetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 18;
      profileTargetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 14;
      requestProfileParallaxFrame();
    },
    { passive: true },
  );
  heroProfileScene.addEventListener("pointerleave", resetProfileParallax);
  window.addEventListener("blur", resetProfileParallax);
}

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

/* Send contact messages */
const contactForm = document.getElementById("contactForm");
const contactFormStatus = document.getElementById("contactFormStatus");
const contactSubmit = contactForm?.querySelector('[type="submit"]');
contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();

  contactFormStatus.textContent = "Sending your message...";
  contactSubmit.disabled = true;
  contactSubmit.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(
      "https://formsubmit.co/ajax/reshapriyatna@gmail.com",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          _subject: `Portfolio message from ${name}`,
          _template: "table",
          _captcha: "false",
        }),
      },
    );
    const result = await response.json();

    if (!response.ok || result.success === false || result.success === "false") {
      throw new Error(result.message || "Message delivery failed.");
    }

    contactForm.reset();
    contactFormStatus.textContent = "Message sent successfully. Thank you!";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    contactFormStatus.textContent = /activation/i.test(errorMessage)
      ? "Form belum diaktivasi. Cek inbox atau Spam untuk email FormSubmit, lalu klik Activate Form."
      : "Message could not be sent. Please try again or email me directly.";
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.removeAttribute("aria-busy");
  }
});
