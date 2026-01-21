const publicationsList = document.querySelector('#publications-list');
const filtersContainer = document.querySelector('#publications-tag-filters');
const clearButton = document.querySelector('#publications-clear');

const state = {
  selectedTags: new Set(),
  publications: [],
  canonicalTags: [],
};

const renderEmptyState = () => {
  publicationsList.innerHTML = '';
  const emptyCard = document.createElement('div');
  emptyCard.className = 'publication-empty card';
  emptyCard.textContent = 'No publications match the selected tags.';
  publicationsList.appendChild(emptyCard);
};

const buildTagPill = (label) => {
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = label;
  return tag;
};

const renderPublication = (publication, tagLookup) => {
  const article = document.createElement('article');
  article.className = 'publication-card card';

  const header = document.createElement('div');
  header.className = 'publication-header';

  const titleBlock = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = publication.title;

  const authors = document.createElement('p');
  authors.className = 'publication-authors';
  authors.textContent = publication.authors;

  titleBlock.appendChild(title);
  titleBlock.appendChild(authors);

  const year = document.createElement('span');
  year.className = 'publication-year';
  year.textContent = publication.year;

  header.appendChild(titleBlock);
  header.appendChild(year);

  const venue = document.createElement('p');
  venue.className = 'publication-venue';
  venue.textContent = publication.venue;

  const tags = document.createElement('div');
  tags.className = 'publication-tags';
  publication.tags.forEach((tagValue) => {
    const label = tagLookup.get(tagValue) ?? tagValue;
    tags.appendChild(buildTagPill(label));
  });

  article.appendChild(header);
  article.appendChild(venue);
  article.appendChild(tags);

  return article;
};

const renderList = () => {
  const tagLookup = new Map(state.canonicalTags.map((tag) => [tag.value, tag.label]));
  const selected = Array.from(state.selectedTags);
  const filtered = selected.length
    ? state.publications.filter((publication) =>
        selected.every((tag) => publication.tags.includes(tag))
      )
    : state.publications;

  publicationsList.innerHTML = '';

  if (filtered.length === 0) {
    renderEmptyState();
    return;
  }

  filtered.forEach((publication) => {
    publicationsList.appendChild(renderPublication(publication, tagLookup));
  });
};

const setButtonState = (button, isActive) => {
  button.classList.toggle('active', isActive);
  button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
};

const renderFilters = () => {
  filtersContainer.innerHTML = '';
  state.canonicalTags.forEach((tag) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-tag-button';
    button.textContent = tag.label;
    setButtonState(button, state.selectedTags.has(tag.value));

    button.addEventListener('click', () => {
      if (state.selectedTags.has(tag.value)) {
        state.selectedTags.delete(tag.value);
      } else {
        state.selectedTags.add(tag.value);
      }
      setButtonState(button, state.selectedTags.has(tag.value));
      renderList();
    });

    filtersContainer.appendChild(button);
  });
};

const clearFilters = () => {
  state.selectedTags.clear();
  renderFilters();
  renderList();
};

const init = async () => {
  if (!publicationsList || !filtersContainer) {
    return;
  }

  try {
    const response = await fetch('assets/publications.json');
    if (!response.ok) {
      throw new Error('Unable to load publications data');
    }
    const data = await response.json();
    state.canonicalTags = data.canonicalTags ?? [];
    state.publications = data.publications ?? [];
    renderFilters();
    renderList();
  } catch (error) {
    publicationsList.innerHTML = '';
    const errorMessage = document.createElement('div');
    errorMessage.className = 'publication-empty card';
    errorMessage.textContent = 'Publications are unavailable right now. Please check back soon.';
    publicationsList.appendChild(errorMessage);
    console.error(error);
  }
};

if (clearButton) {
  clearButton.addEventListener('click', clearFilters);
}

init();
