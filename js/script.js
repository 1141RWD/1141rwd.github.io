document.getElementById("year").textContent = new Date().getFullYear();

const ORG_NAME = "1141RWD";
const API_URL = `https://api.github.com/orgs/${ORG_NAME}/repos?per_page=100`;

let allRepos = [];
let currentFilter = {
  search: "",
  tag: null, // can be language or topic
};

// Icons (Injected via JS for ease, could be moved to HTML or external sprite)
const starIcon = `<svg class="icon" viewBox="0 0 16 16"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path></svg>`;
const updateIcon = `<svg class="icon" viewBox="0 0 16 16"><path d="M1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM6.379 5.227A.25.25 0 0 0 6 5.442v5.117a.25.25 0 0 0 .438.17l3.5-3.5a.25.25 0 0 0 0-.354l-3.5-3.5Z"></path><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z"></path><path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H8.75v-4.75A.75.75 0 0 1 8 3.25Z"></path></svg>`;
const fileIcon = `<svg class="icon" viewBox="0 0 16 16"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm7.5.303V4.25a.25.25 0 0 0 .25.25h2.697Z"></path></svg>`;
const repoIcon = `<svg class="icon" viewBox="0 0 16 16"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path></svg>`;

async function init() {
  try {
    // Fetch User/Org Data for Header
    // We use Promise.all to fetch both in parallel for speed
    const profilePromise = fetch(
      `https://api.github.com/users/${ORG_NAME}`
    ).then((r) => r.json());

    // Fetch Repos
    let reposUrl = API_URL;
    const reposPromise = fetch(reposUrl).then(async (r) => {
      if (!r.ok) {
        // Fallback to user endpoint if org endpoint fails
        return fetch(
          `https://api.github.com/users/${ORG_NAME}/repos?per_page=100`
        ).then((r) => r.json());
      }
      return r.json();
    });

    const [profile, repos] = await Promise.all([profilePromise, reposPromise]);

    allRepos = Array.isArray(repos) ? repos : [];

    renderProfile(profile, allRepos);
    renderUI();
  } catch (error) {
    console.error(error);
    document.getElementById(
      "loader"
    ).innerHTML = `<span style="color: #ef4444">無法載入資料，請稍後再試。</span>`;
  }
}

function renderProfile(profile, repos) {
  const container = document.getElementById("profile-header");

  // Calculate total stars
  const totalStars = repos.reduce(
    (acc, repo) => acc + repo.stargazers_count,
    0
  );

  // Use profile data or fallbacks
  const avatar = profile.avatar_url;
  // Use the bio from profile, or fallback to the specific one requested
  const bio = profile.bio || "互動式網頁設計 / by 3B332038";
  const name = profile.name || ORG_NAME;
  const publicRepos = profile.public_repos || repos.length;

  container.innerHTML = `
        <img src="${avatar}" alt="${name}" class="profile-avatar">
        <div class="profile-info">
            <h2 class="profile-name">${name}</h2>
            <p class="profile-bio">${bio}</p>
            <div class="profile-stats">
                <div class="stat-badge" title="公開專案數">
                    ${repoIcon} <span>${publicRepos} 專案</span>
                </div>
                <div class="stat-badge" title="總星星數">
                    ${starIcon} <span>${totalStars} 星星</span>
                </div>
            </div>
        </div>
    `;
}

// --- Filtering & Sorting ---

function filterRepos(repos) {
  return repos.filter((repo) => {
    // Search Filter
    const searchLower = currentFilter.search.toLowerCase();
    // Check name and description
    const matchesSearch =
      repo.name.toLowerCase().includes(searchLower) ||
      (repo.description &&
        repo.description.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    // Tag Filter
    if (currentFilter.tag) {
      const tag = currentFilter.tag.toLowerCase();
      const hasTopic = repo.topics && repo.topics.includes(tag);
      const isLang = repo.language && repo.language.toLowerCase() === tag;
      return hasTopic || isLang;
    }

    return true;
  });
}

function sortRepos(repos) {
  const method = document.getElementById("sort-select").value;

  return [...repos].sort((a, b) => {
    if (method === "updated")
      return new Date(b.pushed_at) - new Date(a.pushed_at);
    if (method === "size") return b.size - a.size;
    if (method === "stars") return b.stargazers_count - a.stargazers_count;

    // Default: Name (Custom Category Sort)
    return customNameSort(a.name, b.name);
  });
}

function customNameSort(nameA, nameB) {
  const getCat = (char) => {
    if (/[0-9]/.test(char)) return 0;
    if (/[A-Z]/.test(char)) return 1;
    if (/[a-z]/.test(char)) return 2;
    return 3;
  };

  const catA = getCat(nameA.charAt(0));
  const catB = getCat(nameB.charAt(0));

  if (catA !== catB) return catA - catB;
  return nameA.localeCompare(nameB);
}

// --- Rendering ---

function renderUI() {
  const filtered = filterRepos(allRepos);
  const sorted = sortRepos(filtered);
  const grid = document.getElementById("grid");
  const loader = document.getElementById("loader");
  const linkTarget = document.getElementById("link-select").value;

  loader.style.display = "none";
  updateActiveFilters();

  if (sorted.length === 0) {
    grid.innerHTML =
      '<p class="subtitle" style="grid-column: 1/-1; text-align: center;">找不到符合條件的專案。</p>';
    return;
  }

  grid.innerHTML = sorted
    .map((repo) => {
      let href =
        linkTarget === "repo"
          ? repo.html_url
          : `https://1141rwd.github.io/${repo.name}`;
      const desc = repo.description || "暫無說明";

      // Tags HTML
      let tagsHtml = "";
      if (repo.language) {
        tagsHtml += `<span class="repo-tag clickable" onclick="setFilterTag(event, '${repo.language}')">${repo.language}</span>`;
      }
      if (repo.topics && repo.topics.length > 0) {
        tagsHtml += repo.topics
          .map(
            (t) =>
              `<span class="repo-tag clickable" onclick="setFilterTag(event, '${t}')">${t}</span>`
          )
          .join("");
      }

      return `
            <a href="${href}" target="_blank" class="card">
                <div class="card-header">
                    <span class="repo-name">${repo.name}</span>
                </div>
                <p class="description">${desc}</p>
                
                <div class="tags-container">${tagsHtml}</div>

                <div class="repo-stats">
                    <div class="stat-item" title="最後更新時間">${updateIcon} ${formatDate(
        repo.pushed_at
      )}</div>
                    <div class="stat-item" title="檔案大小">${formatSize(
                      repo.size
                    )}</div>
                    <div class="stat-item" style="margin-left: auto;">${starIcon} ${
        repo.stargazers_count
      }</div>
                </div>
            </a>
        `;
    })
    .join("");

  // Trigger animation
  requestAnimationFrame(() => grid.classList.add("loaded"));
}

function updateActiveFilters() {
  const container = document.getElementById("active-filters");
  if (currentFilter.tag) {
    container.innerHTML = `
            <div class="filter-tag clear-btn" onclick="clearFilterTag()">
                <span>✕ 清除篩選: ${currentFilter.tag}</span>
            </div>
        `;
  } else {
    container.innerHTML = "";
  }
}

// --- Helpers ---

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date; // Milliseconds difference
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 60) return "剛剛";
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) return `${diffHour} 小時前`;
  if (diffDays <= 7) return `${diffDays} 天前`;
  
  return `${date.getFullYear()}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
}

function formatSize(kb) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// --- Interactions ---

// Attach to window so onclick in HTML can see them
window.setFilterTag = (e, tag) => {
  e.preventDefault(); // Prevent link click
  e.stopPropagation();
  currentFilter.tag = tag;
  // Optional: clear search text when clicking a tag for clarity,
  // or keep it to refine further?
  // Let's clear search to make it a distinct "Category View"
  document.getElementById("search-input").value = "";
  currentFilter.search = "";
  renderUI();
};

window.clearFilterTag = () => {
  currentFilter.tag = null;
  renderUI();
};

document.getElementById("search-input").addEventListener("input", (e) => {
  currentFilter.search = e.target.value;
  renderUI();
});

document.getElementById("sort-select").addEventListener("change", renderUI);
document.getElementById("link-select").addEventListener("change", renderUI);

// --- Start ---
init();
