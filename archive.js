const archiveType = document.body.dataset.archive;
const archiveGrid = document.getElementById('archiveGrid');
const { projects, certificates } = window.portfolioData;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function openWithCardFeedback(card, callback) {
  if (reduceMotion) {
    callback();
    return;
  }
  if (card.classList.contains('is-opening')) return;
  card.classList.add('is-opening');
  window.setTimeout(() => {
    callback();
    window.setTimeout(() => card.classList.remove('is-opening'), 220);
  }, 110);
}

const detailModal = document.createElement('div');
detailModal.className = 'detail-modal';
detailModal.setAttribute('role', 'dialog');
detailModal.setAttribute('aria-modal', 'true');
detailModal.setAttribute('aria-labelledby', 'detailModalTitle');
detailModal.setAttribute('aria-hidden', 'true');
detailModal.innerHTML = `
  <div class="detail-modal-box">
    <button class="detail-modal-close" type="button" aria-label="Close details">&times;</button>
    <div class="detail-modal-media"></div>
    <div class="detail-modal-copy">
      <span class="detail-modal-kind"></span>
      <h2 id="detailModalTitle"></h2>
      <p class="detail-modal-subtitle"></p>
      <div class="detail-modal-tags"></div>
      <p class="detail-modal-description"></p>
    </div>
  </div>`;
document.body.appendChild(detailModal);

const modalMedia = detailModal.querySelector('.detail-modal-media');
const modalKind = detailModal.querySelector('.detail-modal-kind');
const modalTitle = detailModal.querySelector('#detailModalTitle');
const modalSubtitle = detailModal.querySelector('.detail-modal-subtitle');
const modalTags = detailModal.querySelector('.detail-modal-tags');
const modalDescription = detailModal.querySelector('.detail-modal-description');
const modalClose = detailModal.querySelector('.detail-modal-close');
const modalBox = detailModal.querySelector('.detail-modal-box');
let lastFocusedCard = null;
let modalFitFrame = 0;

function fitModalDescription() {
  let fontSize = 14;
  modalDescription.style.removeProperty('font-size');
  modalDescription.style.removeProperty('line-height');

  while (modalBox.scrollHeight > modalBox.clientHeight + 1 && fontSize > 9) {
    fontSize -= 0.5;
    modalDescription.style.fontSize = `${fontSize}px`;
    modalDescription.style.lineHeight = String(
      Math.max(1.45, 1.8 - (14 - fontSize) * 0.07)
    );
  }
}

function scheduleModalDescriptionFit() {
  cancelAnimationFrame(modalFitFrame);
  modalFitFrame = requestAnimationFrame(() => {
    modalFitFrame = requestAnimationFrame(fitModalDescription);
  });
}

function closeDetail() {
  if (!detailModal.classList.contains('open')) return;
  modalMedia.querySelector('video')?.pause();
  detailModal.classList.remove('open');
  detailModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  lastFocusedCard?.focus();
}

function openDetail(item, type, card) {
  lastFocusedCard = card;
  modalMedia.replaceChildren();
  modalTags.replaceChildren();
  modalMedia.classList.remove('fit-certificate');
  modalMedia.style.removeProperty('--detail-aspect');

  modalKind.textContent = type === 'project' ? 'Project detail' : 'Certificate detail';
  modalTitle.textContent = item.title;
  modalSubtitle.textContent = type === 'project'
    ? item.subtitle
    : `${item.issuer} · ${item.year}`;
  modalDescription.textContent = item.description || 'More information will be added soon.';
  modalDescription.style.removeProperty('font-size');
  modalDescription.style.removeProperty('line-height');

  if (type === 'project') {
    const video = document.createElement('video');
    video.src = item.video;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    modalMedia.appendChild(video);

    item.tags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'project-tag';
      chip.textContent = tag;
      modalTags.appendChild(chip);
    });
  } else if (item.image) {
    if (item.aspectRatio) {
      modalMedia.classList.add('fit-certificate');
      modalMedia.style.setProperty('--detail-aspect', item.aspectRatio);
    }
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = `${item.title} certificate`;
    modalMedia.appendChild(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'certificate-placeholder';
    placeholder.innerHTML = '<div class="placeholder-icon"></div><span>Certificate image</span>';
    modalMedia.appendChild(placeholder);
  }

  detailModal.classList.add('open');
  detailModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  scheduleModalDescriptionFit();
  const modalVisual = modalMedia.querySelector('img, video');
  modalVisual?.addEventListener(
    modalVisual.tagName === 'IMG' ? 'load' : 'loadedmetadata',
    scheduleModalDescriptionFit,
    { once: true }
  );
  modalClose.focus();
}

function makeCardInteractive(element, item, type) {
  element.tabIndex = 0;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `Open details for ${item.title}`);
  element.addEventListener('click', () => {
    openWithCardFeedback(element, () => openDetail(item, type, element));
  });
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openWithCardFeedback(element, () => openDetail(item, type, element));
  });
}

modalClose.addEventListener('click', closeDetail);
detailModal.addEventListener('click', (event) => {
  if (event.target === detailModal) closeDetail();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeDetail();
});
window.addEventListener('resize', () => {
  if (detailModal.classList.contains('open')) scheduleModalDescriptionFit();
});

function projectArchiveCard(project) {
  const element = document.createElement('article');
  element.className = 'archive-project-card';
  const tags = project.tags.map((tag) => `<span class="project-tag">${tag}</span>`).join('');

  element.innerHTML = `
    <div class="project-media">
      <video src="${project.video}" autoplay muted loop playsinline preload="metadata"></video>
    </div>
    <div class="project-meta">
      <div class="project-tags">${tags}</div>
      <h2 class="project-title">${project.title}</h2>
      <p class="project-subtitle">${project.subtitle}</p>
    </div>`;

  makeCardInteractive(element, project, 'project');

  return element;
}

function certificateArchiveCard(certificate) {
  const element = document.createElement('article');
  element.className = 'certificate-card';
  const imageClass = certificate.thumbnailFit === 'cover'
    ? 'certificate-image certificate-image-cover'
    : 'certificate-image';
  const media = certificate.image
    ? `<img class="${imageClass}" src="${certificate.image}" alt="${certificate.title} certificate" loading="lazy" />`
    : `<div class="certificate-placeholder"><div class="placeholder-icon"></div><span>Certificate image</span></div>`;

  element.innerHTML = `
    <div class="certificate-media">${media}</div>
    <div class="certificate-info">
      <div class="certificate-details"><span>${certificate.issuer}</span><span>${certificate.year}</span></div>
      <strong>${certificate.title}</strong>
    </div>`;

  makeCardInteractive(element, certificate, 'certificate');

  return element;
}

if (archiveType === 'projects') {
  archiveGrid.classList.add('projects-grid');
  projects.forEach((project) => archiveGrid.appendChild(projectArchiveCard(project)));
} else {
  archiveGrid.classList.add('certificates-grid');
  certificates.forEach((certificate) => archiveGrid.appendChild(certificateArchiveCard(certificate)));
}
