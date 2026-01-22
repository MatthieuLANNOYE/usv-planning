// Stockage simple dans localStorage pour la démo.
const STORAGE_KEY = "usv_matches";

// ===== FONCTIONS DE STOCKAGE =====
async function loadMatchesManual() {
  // 1. TOUJOURS charger jsonstorage en priorité
  try {
    console.log('🔄 Fetch jsonstorage...');
    const resp = await fetch('https://api.jsonstorage.net/v1/json/306d7b7a-3156-4fd5-8905-baf691230177/7c24ee25-f318-4373-9d54-dc20f9effd58?apiKey=7cbedf26-9e50-479f-a655-2b838a52d90d');
    const data = await resp.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));  // Override local
    console.log('✅ jsonstorage → localStorage:', data.length, 'matchs');
    return data;
  } catch(e) {
    console.warn('❌ jsonstorage down, fallback local:', e);
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  }
}

async function loadMatches() {
  return await loadMatchesManual();
}

async function saveMatches(matches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  try {
    const resp = await fetch(
      'https://api.jsonstorage.net/v1/json/306d7b7a-3156-4fd5-8905-baf691230177/7c24ee25-f318-4373-9d54-dc20f9effd58?apiKey=7cbedf26-9e50-479f-a655-2b838a52d90d',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matches),
      }
    );
    if (!resp.ok) {
      console.warn('PUT jsonstorage non OK:', resp.status);
    } else {
      console.log('✅ jsonstorage mis à jour');
    }
  } catch (e) {
    console.warn('❌ Erreur PUT jsonstorage:', e);
  }
}

function getDayLabel(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  if (day === 6) return "Samedi";
  if (day === 0) return "Dimanche";
  if (day === 1) return "Lundi";
  if (day === 2) return "Mardi";
  if (day === 3) return "Mercredi";
  if (day === 4) return "Jeudi";
  if (day === 5) return "Vendredi";
  return "Autre jour";
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" });
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function isThisWeek(matchDate) {
  const monday = getMondayOfWeek(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  const match = new Date(matchDate);
  return match >= monday && match <= sunday;
}

async function initMatches() {
  window.matches = Array.isArray(await loadMatches()) ? await loadMatches() : [];
}

/* --------- Affichage public ---------- */
async function initPublicPage() {
  await initMatches();
  
  const container = document.getElementById("matches-container");
  if (!container) return;

  // 🔍 DEBUG : Afficher tous les matchs bruts
  console.log("📊 Matchs chargés depuis localStorage :", window.matches);
  console.log("📊 Nombre total :", window.matches.length);

  let matches = window.matches.filter(m => {
    const date = new Date(m.datetime);
    const isValid = !isNaN(date.getTime()) && 
           m.homeTeam && m.homeTeam.trim() !== "" &&
           m.awayTeam && m.awayTeam.trim() !== "";
    
    // ✅ AJOUT : Vérifier si le match est dans la semaine en cours
    const isCurrentWeek = isThisWeek(m.datetime);
    
    return isValid && isCurrentWeek;
  });
  
  console.log("✅ Matchs à afficher :", matches.length);
  
  const weekTitle = document.createElement("div");
  weekTitle.className = "week-title";
  const monday = getMondayOfWeek(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
   
  weekTitle.innerHTML = `📅 Semaine du ${formatDate(monday.getTime())} au ${formatDate(sunday.getTime())}`;

  matches.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  const cardHeight = window.innerWidth < 1200 ? '130px' : 
                   window.innerWidth < 1600 ? '140px' : '155px';
  document.documentElement.style.setProperty('--card-height', cardHeight);

  const groups = { Samedi: [], Dimanche: [], Lundi: [], Mardi: [], Mercredi: [], Jeudi: [], Vendredi: [] };
  for (const m of matches) {
    const label = getDayLabel(m.datetime);
    groups[label].push(m);
  }

  container.innerHTML = "";
  container.appendChild(weekTitle);

  function renderGroup(title, icon, list) {
    if (!list.length) return;
  
    const sep = document.createElement("div");
    sep.className = "day-separator";
    sep.innerHTML = `${icon} ${title}`;
    container.appendChild(sep);
  
    const listDiv = document.createElement("div");
    listDiv.className = "matches-list";
    
    list.forEach(m => {
      const card = document.createElement("div");
      card.className = "match-card";
  
      const time = document.createElement("div");
      time.className = "match-time";
      time.textContent = formatTime(m.datetime);
  
      const teams = document.createElement("div");
      teams.className = "match-teams";
      teams.innerHTML = `
        <div class="team home">${m.homeTeam || "???" }</div>
        <div class="vs">VS</div>
        <div class="team away">${m.awayTeam || "???" }</div>
      `;

      const info = document.createElement("div");
      info.className = "match-info-main";

      const compLabels = {
        "championnat": "championnat",
        "coupe d'artois": "Coupe d'Artois",
        "coupe de france": "Coupe de France",
        "coupe des hauts de france": "Coupe HDF",
        "coupe gambardella": "Coupe Gambardella",
        "amical": "Amical"
      };
      const compClass = m.competition ? 
        `competition-${m.competition.replace(/[^a-z]/g, '')}` : "";
      const compText = compLabels[m.competition] || m.competition;

      info.innerHTML = `
        <div class="match-teams">${m.homeTeam} - ${m.awayTeam}</div>
        <div class="match-meta">
          ${formatTime(m.datetime)} • ${m.venue || ''}
          ${compText ? `<span class="competition-badge ${compClass}">${compText}</span>` : ''}
        </div>
      `;

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.flexDirection = "column";
      right.style.alignItems = "flex-end";
      right.style.gap = "0.3rem";

      const status = document.createElement("div");
      status.className = `match-status status-${m.status}`;
      const labels = {
        a_venir: "À venir",
        en_cours: "En cours",
        termine: "Terminé",
        reporte: "Reporté"
      };
      status.textContent = labels[m.status] || m.status;

      const score = document.createElement("div");
      score.className = "match-score";
      if (m.scoreHome != null && m.scoreAway != null) {
        score.textContent = `${m.scoreHome} - ${m.scoreAway}`;
      } else {
        score.textContent = "";
      }

      right.appendChild(status);
      right.appendChild(score);

      const isHomeVermelles = m.homeTeam.toLowerCase().includes('u1') || m.homeTeam.toLowerCase().includes('usv') || m.homeTeam.toLowerCase().includes('séniors');
      const vermellesScore = isHomeVermelles ? m.scoreHome : m.scoreAway;
      const adversaireScore = isHomeVermelles ? m.scoreAway : m.scoreHome;

      let resultClass = '';
      if (m.scoreHome !== null && m.scoreAway !== null) {
        if (vermellesScore > adversaireScore) {
          resultClass = 'victory';
        } else if (vermellesScore < adversaireScore) {
          resultClass = 'defeat';
        } else {
          resultClass = 'draw';
        }
      } else if (m.status === 'encours') {
        resultClass = 'ongoing';
      }
      if (resultClass && resultClass.trim()) {
        card.classList.add(resultClass);
      }

      card.appendChild(info);
      card.appendChild(right);
      listDiv.appendChild(card);
    });

    container.appendChild(listDiv);
  }

  renderGroup("Lundi", "⚽", groups.Lundi);
  renderGroup("Mardi", "⚽", groups.Mardi);
  renderGroup("Mercredi", "⚽", groups.Mercredi);
  renderGroup("Jeudi", "⚽", groups.Jeudi);
  renderGroup("Vendredi", "⚽", groups.Vendredi); 
  renderGroup("Samedi", "⚽", groups.Samedi);
  renderGroup("Dimanche", "⚽", groups.Dimanche);

  // Anti-spam : refresh seulement si changement détecté
  let lastHash = '';
  setInterval(async () => {
    const data = await loadMatches();
    const hash = JSON.stringify(data).slice(0, 50);  // hash simple
    if (hash !== lastHash) {
      console.log('🔄 Changement détecté → refresh');
      lastHash = hash;
      await initPublicPage();
    }
  }, 120000);  // 2min

 }

/* --------- Admin ---------- */
function refreshAdminList() {
  const listContainer = document.getElementById("admin-matches-list");
  if (!listContainer) return;

  // Force reload
  initMatches();

  const validMatches = window.matches.filter(m => {
    const date = new Date(m.datetime);
    return !isNaN(date.getTime()) && m.homeTeam && m.awayTeam;
  });

  if (validMatches.length === 0) {
    listContainer.innerHTML = "<p>Aucun match pour l'instant.</p>";
    return;
  }

  listContainer.innerHTML = "";
  
  validMatches.forEach((m, index) => {
    const item = document.createElement("div");
    item.className = "admin-match-item";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <span>
        ${formatDate(m.datetime)} ${formatTime(m.datetime)} - 
        <strong>${m.homeTeam}</strong> vs <strong>${m.awayTeam}</strong>
        ${m.venue ? `(${m.venue})` : ''}
      </span>
      <button onclick="deleteMatch(${index})" class="delete-btn" title="Supprimer">❌</button>
    `;
    
    // Clic pour éditer (pré-remplit le form)
    item.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return; // Ignore bouton suppr
      
      document.getElementById("match-id").value = m.id || index;
      document.getElementById("match-datetime").value = m.datetime;
      document.getElementById("match-home").value = m.homeTeam;
      document.getElementById("match-away").value = m.awayTeam;
      document.getElementById("match-venue").value = m.venue || "";
      document.getElementById("match-status").value = m.status || "avenir";
      document.getElementById("match-competition").value = m.competition || "";
      document.getElementById("match-score-home").value = m.scoreHome || "";
      document.getElementById("match-score-away").value = m.scoreAway || "";
    });
    
    listContainer.appendChild(item);
  });
}

window.deleteMatch = function(index) {
  if (confirm("Supprimer ce match ?")) {
    window.matches.splice(index, 1);
    saveMatches(window.matches);
    refreshAdminList();
  }
};

/* --------- Init en fonction de la page ---------- */
document.addEventListener("DOMContentLoaded", async function() {
  await initMatches();
  
  // Page publique
  if (document.getElementById("matches-container")) {
    initPublicPage();
  }
  
  // Page admin
  const form = document.getElementById("match-form");
  if (form) {
    refreshAdminList();  // ← AJOUT ICI
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const id = document.getElementById("match-id").value;
      const datetime = document.getElementById("match-datetime").value;
      const homeTeam = document.getElementById("match-home").value.trim();
      const awayTeam = document.getElementById("match-away").value.trim();
      const venue = document.getElementById("match-venue").value;
      const status = document.getElementById("match-status").value || "a_venir";
      const competition = document.getElementById("match-competition").value;
      const scoreHomeStr = document.getElementById("match-score-home").value;
      const scoreAwayStr = document.getElementById("match-score-away").value;
      
      const scoreHome = scoreHomeStr ? Number(scoreHomeStr) : null;
      const scoreAway = scoreAwayStr ? Number(scoreAwayStr) : null;
      
      if (!homeTeam || !awayTeam) {
        alert("⚠️ Équipes obligatoires !");
        return;
      }
      
      if (id) {
        // Édition
        const idx = window.matches.findIndex(m => String(m.id) === String(id));
        if (idx !== -1) {
          window.matches[idx] = {
            ...window.matches[idx],
            datetime, homeTeam, awayTeam, venue, 
            status, competition, scoreHome, scoreAway
          };
        }
      } else {
        // Ajout
        const newId = window.matches.length 
          ? Math.max(...window.matches.map(m => m.id || 0)) + 1 
          : 1;
        window.matches.push({
          id: newId, datetime, homeTeam, awayTeam, 
          venue, status, competition, scoreHome, scoreAway
        });
      }
      
      saveMatches(window.matches);
      refreshAdminList();
      
      form.reset();
      document.getElementById("match-id").value = "";
      
      console.log("✅ Match OK !", window.matches[window.matches.length - 1]);
    });
  }
  
  // Bouton reset (correction de l'ID)
  const resetBtn = document.getElementById("reset-form");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      document.getElementById('match-form').reset();
      document.getElementById("match-id").value = "";
    });
  }

});




