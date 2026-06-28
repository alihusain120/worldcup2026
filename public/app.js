const ROUNDS = ['round32', 'round16', 'quarters', 'semis', 'final'];
const ROUND_LABELS = { round32: 16, round16: 8, quarters: 4, semis: 2, final: 1 };
const ROUND_NAMES = { round32: 'Round of 32', round16: 'Round of 16', quarters: 'Quarterfinals', semis: 'Semifinals', final: 'Final' };

const FLAGS = {
  'Mexico': '🇲🇽', 'Jamaica': '🇯🇲', 'USA': '🇺🇸', 'United States': '🇺🇸',
  'New Zealand': '🇳🇿', 'Argentina': '🇦🇷', 'Peru': '🇵🇪', 'France': '🇫🇷',
  'Australia': '🇦🇺', 'Brazil': '🇧🇷', 'Colombia': '🇨🇴', 'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Netherlands': '🇳🇱',
  'Germany': '🇩🇪', 'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Senegal': '🇸🇳',
  'Portugal': '🇵🇹', 'Morocco': '🇲🇦', 'Spain': '🇪🇸', 'Ecuador': '🇪🇨',
  'Belgium': '🇧🇪', 'Denmark': '🇩🇰', 'Croatia': '🇭🇷', 'Serbia': '🇷🇸',
  'Uruguay': '🇺🇾', 'Nigeria': '🇳🇬', 'Switzerland': '🇨🇭', 'Saudi Arabia': '🇸🇦',
  'Qatar': '🇶🇦', 'Iran': '🇮🇷', 'South Africa': '🇿🇦', 'Paraguay': '🇵🇾',
  'Sweden': '🇸🇪', 'Ivory Coast': '🇨🇮', 'Norway': '🇳🇴', 'DR Congo': '🇨🇩',
  'Bosnia and Herzegovina': '🇧🇦', 'Austria': '🇦🇹', 'Algeria': '🇩🇿',
  'Egypt': '🇪🇬', 'Cape Verde': '🇨🇻', 'Ghana': '🇬🇭',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Cameroon': '🇨🇲', 'Tunisia': '🇹🇳', 'Costa Rica': '🇨🇷',
  'Chile': '🇨🇱', 'Honduras': '🇭🇳', 'Panama': '🇵🇦',
};

function getFlag(team) {
  return FLAGS[team] || '🏳️';
}

let teams = [];
let picks = { round32: {}, round16: {}, quarters: {}, semis: {}, final: {}, champion: null };
let results = {};

async function init() {
  const [teamsData, resultsData] = await Promise.all([
    fetch('/api/teams').then(r => r.json()),
    fetch('/api/results').then(r => r.json())
  ]);
  teams = teamsData.matches;
  results = resultsData;

  buildBracketDOM('bracket-view');
  buildBracketDOM('live-view', false, 'live-');
  buildBracketDOM('player-bracket-view', false, 'p-');
  renderBracket();
  renderLiveBracket();
  setupNav();
}

function buildBracketDOM(viewId, isMainBracket, prefix) {
  prefix = prefix || '';
  const view = document.getElementById(viewId);
  const container = view.querySelector('.bracket-container') || document.createElement('div');
  container.className = 'bracket-container';
  container.innerHTML = '';

  ROUNDS.forEach(round => {
    const col = document.createElement('div');
    col.className = 'round';
    col.id = `${prefix}round-${round === 'round16' ? '16' : round === 'round32' ? '32' : round}`;

    const header = document.createElement('div');
    header.className = 'round-header';
    header.textContent = ROUND_NAMES[round];
    col.appendChild(header);

    const matches = document.createElement('div');
    matches.className = 'matches';
    col.appendChild(matches);

    container.appendChild(col);
  });

  const champCol = document.createElement('div');
  champCol.className = 'round champion-col';
  champCol.id = `${prefix}round-champion`;

  const champHeader = document.createElement('div');
  champHeader.className = 'round-header';
  champHeader.textContent = 'Champion';
  champCol.appendChild(champHeader);

  const champMatches = document.createElement('div');
  champMatches.className = 'matches';
  champMatches.innerHTML = '<div class="team-slot empty">?</div>';
  champCol.appendChild(champMatches);

  container.appendChild(champCol);

  if (!view.contains(container)) {
    const submitArea = view.querySelector('#submit-area');
    if (submitArea) {
      view.insertBefore(container, submitArea);
    } else {
      view.appendChild(container);
    }
  }
}

function setupNav() {
  document.getElementById('nav-bracket').addEventListener('click', () => showView('bracket'));
  document.getElementById('nav-live').addEventListener('click', () => showView('live'));
  document.getElementById('nav-players').addEventListener('click', () => showView('players'));
  document.getElementById('back-to-players').addEventListener('click', () => showView('players'));
  document.getElementById('submit-picks').addEventListener('click', submitPicks);
}

function showView(view) {
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('bracket-view').classList.add('hidden');
  document.getElementById('live-view').classList.add('hidden');
  document.getElementById('players-view').classList.add('hidden');
  document.getElementById('player-bracket-view').classList.add('hidden');

  if (view === 'bracket') {
    document.getElementById('nav-bracket').classList.add('active');
    document.getElementById('bracket-view').classList.remove('hidden');
  } else if (view === 'live') {
    document.getElementById('nav-live').classList.add('active');
    document.getElementById('live-view').classList.remove('hidden');
    renderLiveBracket();
  } else if (view === 'players') {
    document.getElementById('nav-players').classList.add('active');
    document.getElementById('players-view').classList.remove('hidden');
    loadPlayers();
  } else if (view === 'player-bracket') {
    document.getElementById('nav-players').classList.add('active');
    document.getElementById('player-bracket-view').classList.remove('hidden');
  }
}

function renderBracket() {
  const r32Container = document.querySelector('#round-32 .matches');
  r32Container.innerHTML = '';
  teams.forEach(match => {
    r32Container.appendChild(createMatchEl('round32', match.id, match.team1, match.team2));
  });

  ['round16', 'quarters', 'semis', 'final'].forEach(round => {
    const count = ROUND_LABELS[round];
    const container = document.querySelector(`#round-${round === 'round16' ? '16' : round} .matches`);
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      container.appendChild(createMatchEl(round, i, null, null));
    }
  });

  updateSubmitVisibility();
}

function createTeamDiv(team, isClickable) {
  const t = document.createElement('div');
  t.className = 'team';
  t.dataset.team = team || '';

  if (team) {
    const flag = document.createElement('span');
    flag.className = 'flag';
    flag.textContent = getFlag(team);
    t.appendChild(flag);

    const name = document.createElement('span');
    name.className = 'team-name';
    name.textContent = team;
    t.appendChild(name);
  } else {
    t.textContent = 'TBD';
    t.style.color = '#555';
  }

  return t;
}

function createMatchEl(round, matchId, team1, team2) {
  const div = document.createElement('div');
  div.className = 'match';
  div.dataset.round = round;
  div.dataset.match = matchId;

  const t1 = createTeamDiv(team1);
  const t2 = createTeamDiv(team2);

  if (picks[round]?.[matchId]) {
    const picked = picks[round][matchId];
    if (t1.dataset.team === picked) t1.classList.add('picked');
    if (t2.dataset.team === picked) t2.classList.add('picked');
  }

  t1.addEventListener('click', () => pickTeam(round, matchId, t1.dataset.team, div));
  t2.addEventListener('click', () => pickTeam(round, matchId, t2.dataset.team, div));

  div.appendChild(t1);
  div.appendChild(t2);
  return div;
}

function pickTeam(round, matchId, team, matchEl) {
  if (!team) return;

  const oldPick = picks[round]?.[matchId];
  picks[round][matchId] = team;

  matchEl.querySelectorAll('.team').forEach(t => {
    t.classList.toggle('picked', t.dataset.team === team);
  });

  if (oldPick && oldPick !== team) {
    clearDownstreamPicks(round, matchId, oldPick);
  }

  advanceWinner(round, matchId, team);
  updateSubmitVisibility();
}

function advanceWinner(round, matchId, team) {
  const roundIndex = ROUNDS.indexOf(round);
  if (roundIndex >= ROUNDS.length - 1) {
    picks.champion = team;
    const champSlot = document.querySelector('#round-champion .team-slot');
    champSlot.textContent = `${getFlag(team)} ${team}`;
    champSlot.classList.remove('empty');
    champSlot.classList.add('filled');
    updateSubmitVisibility();
    return;
  }

  const nextRound = ROUNDS[roundIndex + 1];
  const nextMatchId = Math.ceil(matchId / 2);
  const slot = matchId % 2 === 1 ? 0 : 1;

  const nextMatchEl = document.querySelector(
    `.match[data-round="${nextRound}"][data-match="${nextMatchId}"]`
  );
  if (!nextMatchEl) return;

  const teamSlots = nextMatchEl.querySelectorAll('.team');
  const targetSlot = teamSlots[slot];
  targetSlot.dataset.team = team;
  targetSlot.innerHTML = '';
  targetSlot.style.color = '';

  const flag = document.createElement('span');
  flag.className = 'flag';
  flag.textContent = getFlag(team);
  targetSlot.appendChild(flag);

  const name = document.createElement('span');
  name.className = 'team-name';
  name.textContent = team;
  targetSlot.appendChild(name);
}

function clearDownstreamPicks(round, matchId, oldTeam) {
  const roundIndex = ROUNDS.indexOf(round);
  if (roundIndex >= ROUNDS.length - 1) {
    if (picks.champion === oldTeam) {
      picks.champion = null;
      const champSlot = document.querySelector('#round-champion .team-slot');
      champSlot.textContent = '?';
      champSlot.classList.add('empty');
      champSlot.classList.remove('filled');
    }
    return;
  }

  const nextRound = ROUNDS[roundIndex + 1];
  const nextMatchId = Math.ceil(matchId / 2);

  if (picks[nextRound]?.[nextMatchId] === oldTeam) {
    delete picks[nextRound][nextMatchId];
    clearDownstreamPicks(nextRound, nextMatchId, oldTeam);

    const nextMatchEl = document.querySelector(
      `.match[data-round="${nextRound}"][data-match="${nextMatchId}"]`
    );
    if (nextMatchEl) {
      nextMatchEl.querySelectorAll('.team').forEach(t => {
        t.classList.remove('picked');
        if (t.dataset.team === oldTeam) {
          t.dataset.team = '';
          t.innerHTML = '';
          t.textContent = 'TBD';
          t.style.color = '#555';
        }
      });
    }
  }

  const nextMatchEl = document.querySelector(
    `.match[data-round="${nextRound}"][data-match="${nextMatchId}"]`
  );
  if (nextMatchEl) {
    const slot = matchId % 2 === 1 ? 0 : 1;
    const teamSlots = nextMatchEl.querySelectorAll('.team');
    const targetSlot = teamSlots[slot];
    if (targetSlot.dataset.team === oldTeam) {
      targetSlot.dataset.team = '';
      targetSlot.innerHTML = '';
      targetSlot.textContent = 'TBD';
      targetSlot.style.color = '#555';
    }
  }
}

function updateSubmitVisibility() {
  const totalPicks = ROUNDS.reduce((sum, r) => sum + Object.keys(picks[r]).length, 0);
  const totalNeeded = 16 + 8 + 4 + 2 + 1;
  const submitArea = document.getElementById('submit-area');

  if (totalPicks === totalNeeded && picks.champion) {
    submitArea.classList.remove('hidden');
  } else {
    submitArea.classList.add('hidden');
  }
}

async function submitPicks() {
  const name = document.getElementById('player-name').value.trim();
  if (!name) {
    showToast('Enter your name first', true);
    return;
  }

  const btn = document.getElementById('submit-picks');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, picks })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Picks locked in!');
    setTimeout(() => showView('players'), 1500);
  } catch (e) {
    showToast(e.message, true);
    btn.disabled = false;
    btn.textContent = 'Lock In Picks';
  }
}

function showToast(msg, isError) {
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function renderLiveBracket() {
  const resultsData = await fetch('/api/results').then(r => r.json());
  results = resultsData;

  const r32Container = document.querySelector('#live-round-32 .matches');
  r32Container.innerHTML = '';
  teams.forEach(match => {
    const winner = results.round32?.[match.id];
    r32Container.appendChild(createLiveMatchEl(match.team1, match.team2, winner));
  });

  ['round16', 'quarters', 'semis', 'final'].forEach(round => {
    const count = ROUND_LABELS[round];
    const roundKey = round === 'round16' ? '16' : round;
    const container = document.querySelector(`#live-round-${roundKey} .matches`);
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const { team1, team2 } = getLiveMatchTeams(round, i);
      const winner = results[round]?.[i];
      container.appendChild(createLiveMatchEl(team1, team2, winner));
    }
  });

  const champSlot = document.querySelector('#live-round-champion .team-slot');
  if (results.champion) {
    champSlot.textContent = `${getFlag(results.champion)} ${results.champion}`;
    champSlot.className = 'team-slot filled';
  } else {
    champSlot.textContent = '?';
    champSlot.className = 'team-slot empty';
  }
}

function getLiveMatchTeams(round, matchId) {
  const roundIndex = ROUNDS.indexOf(round);
  const prevRound = ROUNDS[roundIndex - 1];
  const prevMatch1 = matchId * 2 - 1;
  const prevMatch2 = matchId * 2;

  let team1 = null, team2 = null;
  if (prevRound === 'round32') {
    const m1 = teams.find(t => t.id === prevMatch1);
    const m2 = teams.find(t => t.id === prevMatch2);
    team1 = results.round32?.[prevMatch1] || (m1 ? `${m1.team1} / ${m1.team2}` : null);
    team2 = results.round32?.[prevMatch2] || (m2 ? `${m2.team1} / ${m2.team2}` : null);
    if (results.round32?.[prevMatch1]) team1 = results.round32[prevMatch1];
    if (results.round32?.[prevMatch2]) team2 = results.round32[prevMatch2];
  } else {
    team1 = results[prevRound]?.[prevMatch1] || null;
    team2 = results[prevRound]?.[prevMatch2] || null;
  }
  return { team1, team2 };
}

function createLiveMatchEl(team1, team2, winner) {
  const div = document.createElement('div');
  div.className = 'match';

  [team1, team2].forEach(team => {
    const t = document.createElement('div');
    t.className = 'team locked';

    if (team) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = getFlag(team);
      t.appendChild(flag);

      const name = document.createElement('span');
      name.className = 'team-name';
      name.textContent = team;
      t.appendChild(name);

      if (winner) {
        t.classList.add(team === winner ? 'correct' : 'wrong');
      }
    } else {
      t.textContent = 'TBD';
      t.style.color = '#555';
    }

    div.appendChild(t);
  });

  return div;
}

async function loadPlayers() {
  const [predictions, resultsData] = await Promise.all([
    fetch('/api/predictions').then(r => r.json()),
    fetch('/api/results').then(r => r.json())
  ]);
  results = resultsData;

  const list = document.getElementById('players-list');
  if (predictions.length === 0) {
    list.innerHTML = '<div class="no-players">No predictions yet. Be the first!</div>';
    return;
  }

  list.innerHTML = '';
  predictions.forEach(p => {
    const card = document.createElement('div');
    card.className = 'player-card';

    const status = getPlayerStatus(p.picks);
    const date = new Date(p.createdAt).toLocaleDateString();

    card.innerHTML = `
      <div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="date">${date}</div>
      </div>
      <span class="status ${status.class}">${status.label}</span>
    `;
    card.addEventListener('click', () => showPlayerBracket(p));
    list.appendChild(card);
  });
}

function getPlayerStatus(playerPicks) {
  const hasResults = Object.values(results).some(
    r => r && typeof r === 'object' && Object.keys(r).length > 0
  );
  if (!hasResults) return { label: 'Pending', class: 'alive' };

  for (const round of ROUNDS) {
    const roundResults = results[round];
    if (!roundResults || typeof roundResults !== 'object') continue;
    for (const [matchId, winner] of Object.entries(roundResults)) {
      if (playerPicks[round]?.[matchId] && playerPicks[round][matchId] !== winner) {
        return { label: 'Busted', class: 'busted' };
      }
    }
  }
  return { label: 'Alive', class: 'alive' };
}

function showPlayerBracket(player) {
  showView('player-bracket');
  document.getElementById('player-bracket-title').textContent = `${player.name}'s Bracket`;

  const pPicks = player.picks;

  const r32Container = document.querySelector('#p-round-32 .matches');
  r32Container.innerHTML = '';
  teams.forEach(match => {
    r32Container.appendChild(
      createViewMatchEl('round32', match.id, match.team1, match.team2, pPicks)
    );
  });

  ['round16', 'quarters', 'semis', 'final'].forEach(round => {
    const count = ROUND_LABELS[round];
    const container = document.querySelector(
      `#p-round-${round === 'round16' ? '16' : round} .matches`
    );
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const { team1, team2 } = getMatchTeams(round, i, pPicks);
      container.appendChild(createViewMatchEl(round, i, team1, team2, pPicks));
    }
  });

  const champSlot = document.querySelector('#p-round-champion .team-slot');
  if (pPicks.champion) {
    champSlot.textContent = `${getFlag(pPicks.champion)} ${pPicks.champion}`;
    champSlot.classList.remove('empty');
    champSlot.classList.add('filled');
    if (results.champion) {
      champSlot.classList.remove('filled');
      champSlot.classList.add(results.champion === pPicks.champion ? 'correct' : 'wrong');
    }
  } else {
    champSlot.textContent = '?';
    champSlot.className = 'team-slot empty';
  }
}

function getMatchTeams(round, matchId, pPicks) {
  const roundIndex = ROUNDS.indexOf(round);
  const prevRound = ROUNDS[roundIndex - 1];
  const prevMatch1 = matchId * 2 - 1;
  const prevMatch2 = matchId * 2;
  return {
    team1: pPicks[prevRound]?.[prevMatch1] || null,
    team2: pPicks[prevRound]?.[prevMatch2] || null
  };
}

function createViewMatchEl(round, matchId, team1, team2, pPicks) {
  const div = document.createElement('div');
  div.className = 'match';

  const picked = pPicks[round]?.[matchId];
  const actualWinner = results[round]?.[matchId];

  [team1, team2].forEach(team => {
    const t = document.createElement('div');
    t.className = 'team locked';

    if (team) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = getFlag(team);
      t.appendChild(flag);

      const name = document.createElement('span');
      name.className = 'team-name';
      name.textContent = team;
      t.appendChild(name);
    } else {
      t.textContent = 'TBD';
      t.style.color = '#555';
    }

    t.dataset.team = team || '';

    if (team && team === picked) {
      if (actualWinner) {
        t.classList.add(team === actualWinner ? 'correct' : 'wrong');
      } else {
        t.classList.add('pending');
      }
    }
    div.appendChild(t);
  });

  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

init();
