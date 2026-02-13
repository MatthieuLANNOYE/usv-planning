// Stockage simple dans localStorage pour la démo.
const STORAGE_KEY = "usv_matches";

// ===== CONFIGURATION GITHUB =====
const GITHUB_REPO = 'MatthieuLANNOYE/usv-planning';
const GITHUB_FILE = 'data.json';
const GITHUB_BRANCH = 'main';

// ⚠️ ATTENTION : Le token doit être dans les variables d'environnement Vercel
// Pour le développement local, vous pouvez le mettre ici temporairement
const GITHUB_TOKEN = typeof process !== 'undefined' && process.env?.GITHUB_TOKEN 
  ? process.env.GITHUB_TOKEN 
  : ''; // ⚠️ Remplacez temporairement pour les tests locaux

// ===== FONCTIONS DE STOCKAGE =====
async function loadMatches() {
  try {
    console.log('🔄 Chargement depuis API Vercel...');
    
    const resp = await fetch('/api/github-proxy', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!resp.ok) {
      throw new Error(`API error: ${resp.status}`);
    }
    
    const content = await resp.json();
    
    // Sauvegarder en local comme backup
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    
    console.log('✅ API → localStorage:', content.length, 'matchs');
    return content;
    
  } catch(e) {
    console.warn('❌ API error, fallback vers localStorage:', e);
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  }
}

async function saveMatches(matches) {
  // Toujours sauvegarder en local d'abord
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  
  try {
    console.log('🔄 Sauvegarde via API Vercel...');
    
    const resp = await fetch('/api/github-proxy', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(matches)
    });
    
    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(`API error: ${JSON.stringify(error)}`);
    }
    
    console.log('✅ Sauvegarde GitHub OK via API');
    
  } catch (e) {
    console.error('❌ Erreur sauvegarde:', e);
    alert('⚠️ Sauvegarde locale OK, mais erreur GitHub.');
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

function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const day = days[d.getDay()];
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${day} ${date} ${time}`;
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getSundayOfWeek(date) {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return sunday;
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
  const data = await loadMatches();
  window.matches = Array.isArray(data) ? data : [];
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

  // ✅ ZOOM BASÉ SUR LE NOMBRE DE MATCHS (une seule fois)
  const totalMatches = matches.length;
  if (totalMatches > 10) {
    container.style.zoom = "0.85";
  } else if (totalMatches > 7) {
    container.style.zoom = "0.9";
  } else {
    container.style.zoom = "1";
  }
  
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

// Refresh automatique toutes les 5 minutes
let refreshTimeout;
async function scheduleRefresh() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(async () => {
    console.log('🔄 Refresh automatique...');
    
    // Recharger les données
    await initMatches();
    
    // Recharger l'affichage complet
    await initPublicPage();
  }, 300000); // 5 minutes
}

scheduleRefresh();

/* --------- Admin ---------- */

// ✅ GARDEZ UNIQUEMENT CETTE FONCTION
function renderAdminList() {
  const list = document.getElementById("admin-matches-list");
  if (!list) return;

  list.innerHTML = "";

  const sorted = window.matches
    .filter(m => {
      const d = new Date(m.datetime);
      const monday = getMondayOfWeek(new Date());
      const sunday = getSundayOfWeek(new Date());
      return d >= monday && d <= sunday;
    })
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  sorted.forEach(m => {
    const card = document.createElement("div");
    card.className = "admin-match-card";
    
    const statusLabels = {
      a_venir: "À venir",
      en_cours: "En cours",
      termine: "Terminé",
      reporte: "Reporté"
    };

    const scoreHtml = (m.scoreHome != null && m.scoreAway != null)
      ? `<div class="match-score">${m.scoreHome} - ${m.scoreAway}</div>`
      : '';

    card.innerHTML = `
      <button class="delete-btn" onclick="deleteMatch(${m.id}); event.stopPropagation();">×</button>
      <div class="match-date">${formatDateTime(m.datetime)}</div>
      <div class="match-teams"><strong>${m.homeTeam}</strong> vs <strong>${m.awayTeam}</strong></div>
      <div class="match-details">
        📍 ${m.venue || 'Lieu non précisé'} • ${m.competition || 'Championnat'}
      </div>
      ${scoreHtml}
      <span class="status-badge status-${m.status}">${statusLabels[m.status]}</span>
    `;

    card.addEventListener("click", () => editMatch(m));
    list.appendChild(card);
  });

  if (sorted.length === 0) {
    list.innerHTML = "<p style='text-align:center; color:#666; padding:2rem;'>Aucun match ce week-end</p>";
  }
}

// ✅ FONCTION POUR ÉDITER UN MATCH
function editMatch(match) {
  document.getElementById("match-id").value = match.id;
  document.getElementById("match-datetime").value = match.datetime;
  document.getElementById("match-home").value = match.homeTeam;
  document.getElementById("match-away").value = match.awayTeam;
  document.getElementById("match-venue").value = match.venue || "";
  document.getElementById("match-status").value = match.status || "a_venir";
  document.getElementById("match-competition").value = match.competition || "";
  document.getElementById("match-score-home").value = match.scoreHome ?? "";
  document.getElementById("match-score-away").value = match.scoreAway ?? "";
  
  // Scroll vers le formulaire
  document.getElementById("match-form").scrollIntoView({ behavior: "smooth" });
}

// ✅ FONCTION DE SUPPRESSION CORRIGÉE
window.deleteMatch = function(matchId) {
  if (!confirm("Supprimer ce match ?")) return;
  
  // Trouver l'index par ID (pas directement l'index du tableau)
  const index = window.matches.findIndex(m => m.id === matchId);
  
  if (index === -1) {
    console.error("Match non trouvé avec ID:", matchId);
    return;
  }
  
  window.matches.splice(index, 1);
  saveMatches(window.matches);
  renderAdminList(); // ✅ Utiliser renderAdminList au lieu de refreshAdminList
  
  console.log("✅ Match supprimé, reste:", window.matches.length);
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
    renderAdminList(); // ✅ Appel initial
    
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const id = document.getElementById("match-id").value;
      const datetime = document.getElementById("match-datetime").value;
      const homeTeam = document.getElementById("match-home").value.trim();
      const awayTeam = document.getElementById("match-away").value.trim();
      const venue = document.getElementById("match-venue").value.trim();
      const status = document.getElementById("match-status").value || "a_venir";
      const competition = document.getElementById("match-competition").value.trim();
      const scoreHomeStr = document.getElementById("match-score-home").value;
      const scoreAwayStr = document.getElementById("match-score-away").value;
      
      const scoreHome = scoreHomeStr !== "" ? Number(scoreHomeStr) : null;
      const scoreAway = scoreAwayStr !== "" ? Number(scoreAwayStr) : null;
      
      if (!homeTeam || !awayTeam) {
        alert("⚠️ Les équipes sont obligatoires !");
        return;
      }
      
      if (!datetime) {
        alert("⚠️ La date et l'heure sont obligatoires !");
        return;
      }
      
      if (id) {
        // ✅ ÉDITION : Trouver par ID
        const idx = window.matches.findIndex(m => String(m.id) === String(id));
        if (idx !== -1) {
          window.matches[idx] = {
            ...window.matches[idx],
            datetime, 
            homeTeam, 
            awayTeam, 
            venue, 
            status, 
            competition, 
            scoreHome, 
            scoreAway
          };
          console.log("✅ Match modifié:", window.matches[idx]);
        } else {
          alert("❌ Match introuvable pour modification");
          return;
        }
      } else {
        // ✅ AJOUT : Générer un nouvel ID unique
        const newId = window.matches.length > 0
          ? Math.max(...window.matches.map(m => m.id || 0)) + 1 
          : 1;
        
        const newMatch = {
          id: newId, 
          datetime, 
          homeTeam, 
          awayTeam, 
          venue, 
          status, 
          competition, 
          scoreHome, 
          scoreAway
        };
        
        window.matches.push(newMatch);
        console.log("✅ Nouveau match ajouté:", newMatch);
      }
      
      // ✅ Sauvegarder sur GitHub via l'API
      await saveMatches(window.matches);
      
      // ✅ Rafraîchir l'affichage
      renderAdminList();
      
      // ✅ Réinitialiser le formulaire
      form.reset();
      document.getElementById("match-id").value = "";
      
      alert("✅ Match enregistré avec succès !");
    });
  }
  
  // Bouton reset
  const resetBtn = document.getElementById("reset-form");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      document.getElementById('match-form').reset();
      document.getElementById("match-id").value = "";
    });
  }
});