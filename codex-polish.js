// Compact UI and tournament polish layer. Loaded last.
(function () {
    'use strict';

    const R = {
        axes: [
            ['ВОГ', 'firepower'], ['ТАК', 'tactics'], ['КАР', 'maps'],
            ['ЕКО', 'economy'], ['КОМ', 'teamwork'], ['ПСИ', 'psychology']
        ],
        overrides: {
            ZywOo: { firepower: 99, tactics: 96, maps: 99, economy: 98, teamwork: 98, psychology: 100 },
            flameZ: { firepower: 93, tactics: 87, maps: 90, economy: 92, teamwork: 91, psychology: 92 },
            ropz: { firepower: 94, tactics: 86, maps: 92, economy: 88, teamwork: 84, psychology: 90 },
            mezii: { firepower: 83, tactics: 82, maps: 81, economy: 85, teamwork: 86, psychology: 82 },
            apEX: { firepower: 74, tactics: 92, maps: 86, economy: 80, teamwork: 88, psychology: 77 }
        }
    };

    function esc(value) {
        return typeof escapeLiveText === 'function' ? escapeLiveText(value) : String(value ?? '');
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function ensurePlayerMetaLite(player) {
        if (!player) return;
        player.developmentXp = clamp(Math.round(Number(player.developmentXp) || 0), 0, 99);
        if (!Number.isFinite(player.level)) player.level = Math.max(1, Math.round((Number(player.skill) - 55) / 3));
        player.level = clamp(Math.round(player.level), 1, 20);
        player.levelXp = clamp(Math.round(Number(player.levelXp) || 0), -99, 99);
    }

    function playerRadar(player) {
        ensurePlayerMetaLite(player);
        if (R.overrides[player.name]) {
            const delta = clamp((Number(player.skill) || 75) - ({ ZywOo: 99, flameZ: 91, ropz: 89, mezii: 83, apEX: 81 }[player.name] || player.skill), -12, 12);
            return Object.fromEntries(Object.entries(R.overrides[player.name]).map(([key, value]) => [key, clamp(value + delta, 35, 100)]));
        }
        const base = clamp(Number(player.skill) || 70, 45, 100);
        const form = Number(player.form || 0);
        const role = player.role || 'Rifler';
        const roleBoosts = {
            AWP: { firepower: 10, tactics: 2, maps: 8, economy: 4, teamwork: 3, psychology: 8 },
            IGL: { firepower: -8, tactics: 14, maps: 10, economy: 6, teamwork: 12, psychology: 4 },
            Entry: { firepower: 9, tactics: -2, maps: 8, economy: 1, teamwork: -4, psychology: 5 },
            Lurker: { firepower: 5, tactics: 4, maps: 10, economy: 5, teamwork: 0, psychology: 7 },
            Rifler: { firepower: 4, tactics: 3, maps: 4, economy: 5, teamwork: 7, psychology: 4 }
        }[role] || {};
        return Object.fromEntries(R.axes.map(([, key], index) => {
            const seed = [...String(player.name || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0);
            return [key, clamp(Math.round(base + (roleBoosts[key] || 0) + form + ((seed + index * 11) % 7) - 3), 35, 100)];
        }));
    }

    function drawRadar(canvas, metrics, color = '#69bdf2') {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.34;
        ctx.clearRect(0, 0, width, height);
        ctx.font = '700 13px Segoe UI, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let ring = 5; ring >= 1; ring--) {
            ctx.beginPath();
            R.axes.forEach(([, key], index) => {
                const angle = -Math.PI / 2 + index * Math.PI * 2 / R.axes.length;
                const r = radius * ring / 5;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            });
            ctx.closePath();
            ctx.fillStyle = ['#284f35', '#55741d', '#d0b851', '#d98d66', '#b45764'][5 - ring] || '#284f35';
            ctx.globalAlpha = 0.48;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        R.axes.forEach(([, key], index) => {
            const angle = -Math.PI / 2 + index * Math.PI * 2 / R.axes.length;
            const r = radius * clamp(metrics[key] || 0, 0, 100) / 100;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(105,189,242,.22)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        R.axes.forEach(([label, key], index) => {
            const angle = -Math.PI / 2 + index * Math.PI * 2 / R.axes.length;
            const lx = cx + Math.cos(angle) * (radius + 28);
            const ly = cy + Math.sin(angle) * (radius + 28);
            ctx.fillStyle = key === 'psychology' ? '#ff606f' : key === 'economy' ? '#f4c95d' : '#38d77e';
            ctx.fillText(label, lx, ly - 8);
            ctx.fillText(Math.round(metrics[key] || 0), lx, ly + 8);
        });
    }

    function addRatingXp(player, amount) {
        if (!player || !amount) return;
        ensurePlayerMetaLite(player);
        player.developmentXp = clamp((Number(player.developmentXp) || 0) + Math.round(amount), 0, 999);
        while (player.developmentXp >= 100 && player.skill < 100) {
            player.developmentXp -= 100;
            player.skill = Math.min(100, Math.round((player.skill || 70) + 1));
        }
        if (player.skill >= 100) player.developmentXp = 0;
    }

    window.addRatingXp = addRatingXp;

    function polishHome() {
        document.getElementById('career-quick-actions')?.remove();
        document.getElementById('sys-log-panel')?.remove();
        document.getElementById('showmatch-panel')?.remove();
        document.getElementById('pre-match-tactics-panel')?.remove();
        const report = document.getElementById('opponent-report-panel');
        if (report) {
            report.querySelectorAll('.counter-call button, .pre-match-advice button').forEach(button => button.remove());
        }
    }

    function installStyle() {
        if (document.getElementById('codex-polish-style')) return;
        const style = document.createElement('style');
        style.id = 'codex-polish-style';
        style.textContent = `
            #career-quick-actions,#sys-log-panel,#showmatch-panel,#pre-match-tactics-panel{display:none!important}
            .opponent-report-panel{padding:14px!important}
            .opponent-report-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
            .opponent-report-grid span{min-height:0!important;padding:10px!important}
            .opponent-report-grid span:nth-child(1){background:#122338!important;border-color:#2b5278!important}
            .opponent-report-grid span:nth-child(2){background:#18273a!important;border-color:#4a5d86!important}
            .opponent-report-grid span:nth-child(3){background:#241f13!important;border-color:#6b5624!important}
            .opponent-report-grid span:nth-child(4){background:#102a21!important;border-color:#24815f!important}
            .opponent-power-factors{grid-template-columns:repeat(4,1fr)!important;margin-top:8px!important}
            .opponent-lineup{grid-template-columns:70px repeat(5,minmax(0,1fr))!important;gap:6px!important}
            .squad-panel{padding:12px!important}
            .squad-panel h3,.squad-panel p{display:none!important}
            .squad-role-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}
            .squad-role-player{min-height:58px!important;padding:8px 9px!important;grid-template-columns:auto 1fr auto!important}
            .squad-role-player .role-code{grid-column:auto!important}
            .squad-role-player>strong{font-size:18px!important}
            .form-indicator{position:static!important}
            .player-profile-flex{display:grid;grid-template-columns:minmax(260px,.9fr) minmax(280px,1.1fr);gap:12px}
            .player-profile-radar-card{border:1px solid #2e3930;background:#101710;padding:10px}
            .player-profile-radar-card canvas{width:100%;height:auto;display:block}
            .player-xp-duo{display:grid;grid-template-columns:1fr 1fr;gap:8px}
            .player-xp-duo span{display:grid;gap:6px;padding:10px;border:1px solid #2e3930;background:#121812}
            .player-xp-duo small{color:#78857b;font-size:8px;font-weight:900}
            .player-xp-duo b{color:#dfe8e1}
            .player-xp-duo i{display:block;height:6px;background:#273027}
            .player-xp-duo i:before{content:"";display:block;height:100%;width:var(--xp);background:var(--career-lime)}
            .transfer-search-panel{padding:12px!important}
            .transfer-search-grid{grid-template-columns:repeat(6,minmax(110px,1fr))!important;gap:7px!important}
            .transfer-search-grid label{font-size:9px!important}
            .transfer-search-results:not(.active){display:none!important}
            #ai-transfer-feed.empty{display:none!important}
            .world-rating-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0}
            .world-rating-tools div{display:flex;gap:5px;flex-wrap:wrap}
            .world-rating-tools button{padding:6px 9px;background:#1b241d;color:#b8c4ba;font-size:9px}
            .world-rating-tools button.active{background:var(--career-lime);color:#0a0d0a}
            .world-rating-row.compact{grid-template-columns:42px 20px minmax(0,1fr) 86px 70px!important;padding:7px 8px!important}
            .world-rating-row.compact .world-rating-team-name{display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;gap:7px;min-width:0}
            .world-rating-row.compact .world-rating-team-name .team-logo{width:22px;height:22px;object-fit:contain}
            .world-rating-row.compact .world-rating-team-name b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .world-rating-row.compact .world-rating-team-name small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            .world-rating-row .major-points-cell{color:#f4c95d;font-size:10px;font-weight:900;text-align:right}
            .world-team-modal{position:fixed;inset:0;z-index:26000;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(3,7,5,.88)}
            .world-team-window{width:min(860px,96vw);max-height:92vh;overflow:auto;border:1px solid #3a473c;background:#101510}
            .world-team-window header{display:flex;justify-content:space-between;gap:12px;padding:14px;border-bottom:1px solid #303a32;background:#171d18}
            .world-team-window header h2{margin:2px 0 0}
            .world-team-window header button{width:38px;height:38px;background:#252e27;color:#fff}
            .world-team-modal-body{display:grid;gap:12px;padding:14px}
            .world-team-compact-summary,.world-team-map-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
            .world-team-compact-summary span,.world-team-map-grid span{display:grid;gap:3px;padding:9px;border:1px solid #2f3b32;background:#121812}
            .world-team-compact-summary span:nth-child(1){background:#132333;border-color:#2f5b80}
            .world-team-compact-summary span:nth-child(2){background:#251f13;border-color:#6c5620}
            .world-team-compact-summary span:nth-child(3){background:#17233a;border-color:#485d9b}
            .world-team-compact-summary span:nth-child(4){background:#122a1f;border-color:#2d7a57}
            .world-team-map-grid span:nth-child(3n+1){background:#121f2b;border-color:#2e526c}
            .world-team-map-grid span:nth-child(3n+2){background:#201d12;border-color:#5f4f22}
            .world-team-map-grid span:nth-child(3n){background:#10251d;border-color:#27694e}
            .training-map-panel{padding:14px!important}
            .training-map-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
            .training-map-head small{color:var(--career-lime);font-weight:900;font-size:9px}
            .training-map-head h3{margin:2px 0 0}
            .training-map-head>span{display:grid;gap:2px;text-align:right}
            .training-map-head b{color:#f4c95d;font-size:22px}
            .training-map-head em{color:#8a998d;font-size:10px;font-style:normal}
            .training-map-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:10px}
            .training-map-summary span{display:grid;gap:4px;padding:9px;border:1px solid #2d3b31;background:#111811}
            .training-map-summary span:nth-child(1){background:#32191e;border-color:#7a3441}
            .training-map-summary span:nth-child(2){background:#122238;border-color:#2b5276}
            .training-map-summary span:nth-child(3){background:#1f1d11;border-color:#655420}
            .training-map-summary small{color:#8b9a8f;font-size:8px;font-weight:900}
            .training-map-summary b{font-size:11px}
            .map-buttons-zone{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
            .map-mastery-card{min-height:96px!important;text-align:left!important;border-radius:5px!important;background:#121c27!important;border:1px solid #2d4560!important}
            .map-mastery-card:nth-child(3n+2){background:#191b12!important;border-color:#584d22!important}
            .map-mastery-card:nth-child(3n){background:#10231b!important;border-color:#2b6b4e!important}
            .map-mastery-card.weak-map-card{background:#2a151a!important;border-color:#8a3748!important;opacity:.78}
            #veto-screen{overflow:auto!important}
            .veto-layout-polished{display:block;width:min(1180px,100%);max-width:1180px;margin:0 auto}
            #veto-maps-container.veto-grid-polished{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))!important;gap:10px!important;align-content:start;max-width:1180px!important;width:min(1180px,100%)!important;margin:12px auto 0!important;position:relative;z-index:5}
            #veto-screen .veto-side-panel{display:grid;grid-template-columns:1.2fr .8fr;gap:10px;position:relative;z-index:1;width:min(1180px,100%);margin:0 auto 10px;min-width:0}
            .veto-turn-card,.veto-pool-card{padding:13px;border:1px solid #2d4050;background:#101923;color:#dce8ee}
            .veto-turn-card small,.veto-pool-card small{color:#59e6d0;font-size:9px;font-weight:900}
            .veto-turn-card b{display:block;margin-top:4px;font-size:17px;color:#f3f8fb}
            .veto-turn-card em,.veto-pool-card em{display:block;margin-top:5px;color:#90a7b5;font-style:normal;font-size:11px}
            .veto-map-card{position:relative;overflow:hidden;min-height:172px!important;padding:12px!important;text-align:left!important;border-radius:7px!important;border:1px solid #32465c!important;background:linear-gradient(135deg,#162334,#101723)!important;pointer-events:auto!important;cursor:pointer!important}
            .veto-map-card *{pointer-events:none}
            .veto-map-card:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:#5aa0ff}
            .veto-map-card.veto-own-edge{background:linear-gradient(135deg,#102b22,#101923)!important;border-color:#2d8060!important}
            .veto-map-card.veto-own-edge:before{background:#2cff9b}
            .veto-map-card.veto-enemy-edge{background:linear-gradient(135deg,#2c1c14,#111923)!important;border-color:#a06828!important}
            .veto-map-card.veto-enemy-edge:before{background:#ffb02e}
            .veto-map-card.veto-danger{background:linear-gradient(135deg,#301821,#111923)!important;border-color:#b33f54!important}
            .veto-map-card.veto-danger:before{background:#ff5870}
            .veto-map-card.veto-neutral:before{background:#5e7180}
            .veto-map-card b{display:block;margin:11px 0 8px!important;font-size:18px!important}
            .veto-map-badges{display:flex;gap:5px;min-height:18px;flex-wrap:wrap}
            .veto-map-badge{padding:3px 6px;border-radius:3px;font-size:8px;font-weight:900}
            .veto-map-badge.best{background:#472e12;color:#ffc75c}
            .veto-map-badge.worst{background:#341924;color:#ff8192}
            .veto-map-badge.own{background:#123b2b;color:#55ffaa}
            .veto-map-meta{display:grid!important;gap:5px!important}
            .veto-map-meta span{display:grid;grid-template-columns:74px 1fr;gap:8px;align-items:center;padding:5px 6px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.055)}
            .veto-map-meta em{color:#8ba2b2;font-size:9px!important;font-style:normal}
            .veto-map-meta strong{color:#e7f2f6;font-size:10px!important}
            .veto-map-card[disabled]{opacity:.62;filter:saturate(.75)}
            #veto-log.veto-log-polished{height:auto!important;max-height:360px!important;min-height:220px!important;border:1px solid #2a3d4f!important;background:#0e1822!important}
            .world-team-player-list{display:grid;gap:6px}
            .world-team-player-list button{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;align-items:center;text-align:left;background:#142033;color:#eef5f0;border:1px solid #2d4052;padding:9px}
            .rating-grade{padding:3px 7px;border-radius:4px;font-weight:900;font-size:11px}
            .rating-grade.elite{background:#1d3d29;color:#43ff82}
            .rating-grade.star{background:#15364a;color:#50d8ff}
            .rating-grade.good{background:#3c3420;color:#ffd76b}
            .rating-grade.avg{background:#2a3133;color:#c6d0d4}
            .rating-grade.low{background:#3a2027;color:#ff7b8d}
            #world-player-modal{z-index:28000!important}
            @media (max-width:760px){
                body{font-size:12px}
                .career-topbar{position:sticky;top:0;z-index:50;padding:8px 10px!important}
                .topbar-title h1{font-size:16px!important}
                .career-resource-bar{grid-template-columns:repeat(3,1fr)!important;font-size:10px}
                .tabs-nav{width:64px!important}
                .tab-btn{padding:10px 6px!important;justify-content:center}
                .tab-btn span:not(.nav-index),.career-brand div,.nav-section-label,.career-nav-footer{display:none!important}
                .content-column{padding-left:64px!important}
                .section-header{padding:10px 12px!important}
                .section-header h2{font-size:22px!important}
                .panel{margin-bottom:8px!important}
                .next-match-versus{grid-template-columns:1fr 42px 1fr!important;padding:10px!important}
                .next-match-actions{grid-template-columns:1fr 96px 82px!important;gap:5px!important}
                .opponent-report-grid,.opponent-power-factors,.world-team-compact-summary,.world-team-map-grid{grid-template-columns:1fr 1fr!important}
                .opponent-lineup{grid-template-columns:1fr 1fr!important}
                .squad-role-grid{grid-template-columns:1fr!important}
                .transfer-search-grid{grid-template-columns:1fr 1fr!important}
                .training-map-summary{grid-template-columns:1fr!important}
                #veto-screen .veto-side-panel{grid-template-columns:1fr}
                .compact-transfer-row{grid-template-columns:1fr!important}
                #rating-tab{grid-template-columns:1fr!important}
                #scouting-panel{display:none!important}
                .player-profile-flex{grid-template-columns:1fr}
                .player-profile-metrics{grid-template-columns:repeat(2,1fr)!important}
            }`;
        document.head.appendChild(style);
    }

    function fullTeamModal(teamName) {
        const team = typeof getTeamByName === 'function' ? getTeamByName(teamName) : null;
        if (!team) return;
        if (typeof ensureTeamCompetitiveProfile === 'function') ensureTeamCompetitiveProfile(team);
        if (typeof ensureWeakMapForTeam === 'function') ensureWeakMapForTeam(team);
        let modal = document.getElementById('world-team-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'world-team-modal';
            modal.className = 'world-team-modal';
            document.body.appendChild(modal);
        }
        const rank = [...teamsRating].sort((a, b) => b.points - a.points).findIndex(item => item.name === team.name) + 1;
        const wr = team.matchesPlayed ? Math.round((team.matchWins || 0) / Math.max(1, team.matchesPlayed) * 100) : 0;
        const mp = state.majorCircuit?.majorPoints?.[team.name] || 0;
        const maps = (officialMaps || []).map(map => {
            const row = team.mapStats?.[map] || { skill: 0, played: 0, wins: 0 };
            const mapWr = row.played ? Math.round(row.wins / row.played * 100) : 0;
            return `<span><small>${esc(map)}</small><b>${row.skill >= 0 ? '+' : ''}${row.skill || 0}/30</b><em>WR ${mapWr}% · ${row.played || 0} мап</em></span>`;
        }).join('');
        const logo = typeof teamLogoHtml === 'function' ? teamLogoHtml(team.name, 'team-logo team-logo-lg') : '';
        modal.innerHTML = `<section class="world-team-window"><header><div><small>ПРОФІЛЬ КОМАНДИ</small><h2>${logo}${esc(team.name)}</h2></div><button onclick="closeWorldTeamModal()">×</button></header>
            <div class="world-team-modal-body">
                <div class="world-team-compact-summary"><span><small>Рейтинг</small><b>#${rank}</b></span><span><small>Очки</small><b>${Math.round(team.points)} pts</b></span><span><small>Major Points</small><b>${mp}</b></span><span><small>Winrate</small><b>${wr}%</b></span></div>
                <div class="world-team-player-list">${team.players.map((player, index) => { ensurePlayerMetaLite(player); return `<button onclick="openWorldPlayerProfile('${encodeURIComponent(team.name)}',${index})"><b>${esc(player.name)}</b><strong class="rating-grade ${ratingGrade(player.skill)}">Rating ${player.skill}</strong></button>`; }).join('')}</div>
                <div class="world-team-map-grid">${maps}</div>
            </div></section>`;
        modal.style.display = 'flex';
    }

    function ratingGrade(rating) {
        const value = Number(rating || 0);
        if (value >= 92) return 'elite';
        if (value >= 86) return 'star';
        if (value >= 80) return 'good';
        if (value >= 72) return 'avg';
        return 'low';
    }

    window.closeWorldTeamModal = function () {
        const modal = document.getElementById('world-team-modal');
        if (modal) modal.style.display = 'none';
    };

    function installWorldRanking() {
        if (typeof renderRatingTable !== 'function') return;
        renderRatingTable = function () {
            const container = document.getElementById('rating-table-container');
            if (!container) return;
            if (typeof ensureClubRestructureState === 'function') ensureClubRestructureState();
            const sort = state.worldRatingSort || 'rating';
            let rows = [...teamsRating].sort((a, b) => sort === 'major'
                ? ((state.majorCircuit?.majorPoints?.[b.name] || 0) - (state.majorCircuit?.majorPoints?.[a.name] || 0)) || b.points - a.points
                : b.points - a.points || ((state.majorCircuit?.majorPoints?.[b.name] || 0) - (state.majorCircuit?.majorPoints?.[a.name] || 0)));
            const full = !!state.worldRatingFull;
            if (!full) {
                const index = Math.max(0, rows.findIndex(team => team.isPlayer || team.name === state.userTeamFullName));
                rows = rows.slice(Math.max(0, index - 2), Math.min(rows.length, index + 3));
            }
            container.innerHTML = `<div class="world-rating-tools"><div><button class="${sort === 'rating' ? 'active' : ''}" onclick="setWorldRatingSort('rating')">Rating pts</button><button class="${sort === 'major' ? 'active' : ''}" onclick="setWorldRatingSort('major')">Major Points</button></div><button onclick="toggleFullWorldRating()">${full ? 'Стиснути рейтинг' : 'Повний рейтинг'}</button></div>` + rows.map(team => {
                const global = [...teamsRating].sort((a, b) => b.points - a.points).findIndex(item => item.name === team.name) + 1;
                const previous = state.worldPreviousRanks?.[team.name] || global;
                const trend = global < previous ? 'up' : global > previous ? 'down' : 'same';
                const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '•';
                const tier = global <= 8 ? 'T1' : global <= 18 ? 'T2' : 'T3';
                const mp = state.majorCircuit?.majorPoints?.[team.name] || 0;
                const logo = typeof teamLogoHtml === 'function' ? teamLogoHtml(team.name, 'team-logo') : '';
                return `<div class="world-rating-row compact ${team.isPlayer ? 'player-world-row' : ''}" onclick="openWorldTeamModal('${encodeURIComponent(team.name)}')">
                    <span class="world-rank">#${global}</span><span class="world-trend ${trend}">${arrow}</span>
                    <div class="world-rating-team-name">${logo}<span><b>${esc(team.name)}</b><small class="rating-form">${typeof renderFormDots === 'function' ? renderFormDots(team) : ''} · ${tier}</small></span></div>
                    <strong>${Math.round(team.points)} pts</strong><span class="major-points-cell">${mp} MP</span>
                </div>`;
            }).join('');
        };
        window.setWorldRatingSort = function (sort) {
            state.worldRatingSort = sort;
            renderRatingTable();
            if (typeof autoSave === 'function') autoSave('world-rating-sort');
        };
        window.toggleFullWorldRating = function () {
            state.worldRatingFull = !state.worldRatingFull;
            renderRatingTable();
        };
        window.openWorldTeamModal = function (encodedName) {
            fullTeamModal(decodeURIComponent(encodedName));
        };
        window.scoutTeam = function (teamName) { fullTeamModal(teamName); };
    }

    function installTransferSearchGate() {
        const oldApply = window.applyTransferSearch;
        if (typeof oldApply !== 'function' || oldApply.__codexPolished) return;
        const wrapped = function () {
            const container = document.getElementById('transfer-search-results');
            const summary = document.getElementById('transfer-search-summary');
            if (!state.transferSearchActivated) {
                if (container) {
                    container.classList.remove('active');
                    container.innerHTML = '';
                }
                if (summary) summary.textContent = 'Введіть фільтри і натисніть «Знайти гравців».';
                return;
            }
            const result = oldApply();
            if (container) container.classList.add('active');
            return result;
        };
        wrapped.__codexPolished = true;
        window.applyTransferSearch = wrapped;
        window.runCompactTransferSearch = function () {
            state.transferSearchActivated = true;
            return window.applyTransferSearch();
        };
        const button = document.querySelector('.transfer-search-grid button');
        if (button) button.setAttribute('onclick', 'runCompactTransferSearch()');
    }

    function installPlayerProfileRadar() {
        const oldOpen = window.openUiPlayerProfile;
        if (typeof oldOpen !== 'function' || oldOpen.__codexPolished) return;
        const wrapped = function (index) {
            oldOpen(index);
            const player = state.players[index];
            const body = document.getElementById('player-profile-body');
            if (!player || !body) return;
            ensurePlayerMetaLite(player);
            const xpWidth = clamp(player.developmentXp || 0, 0, 100);
            const levelWidth = clamp(Math.abs(player.levelXp || 0), 0, 100);
            const current = body.innerHTML;
            body.innerHTML = `<div class="player-profile-flex"><div>${current}</div><aside class="player-profile-radar-card"><canvas id="ui-player-radar" width="360" height="290"></canvas><div class="player-xp-duo"><span><small>Rating XP</small><b>${player.skill >= 100 ? 'MAX' : `${player.developmentXp || 0}/100`}</b><i style="--xp:${player.skill >= 100 ? 100 : xpWidth}%"></i></span><span><small>Level XP</small><b>LVL ${player.level} · ${player.levelXp >= 0 ? '+' : ''}${player.levelXp || 0}/100</b><i style="--xp:${levelWidth}%"></i></span></div></aside></div>`;
            requestAnimationFrame(() => drawRadar(document.getElementById('ui-player-radar'), playerRadar(player)));
        };
        wrapped.__codexPolished = true;
        window.openUiPlayerProfile = wrapped;
    }

    function installProgressHooks() {
        if (typeof finishBo3Series === 'function' && !finishBo3Series.__codexPolished) {
            const oldFinish = finishBo3Series;
            finishBo3Series = function (isPlayerWin) {
                const amount = isPlayerWin ? 12 : 6;
                state.players.forEach(player => {
                    addRatingXp(player, amount);
                    if (typeof window.addPlayerLevelProgress === 'function') window.addPlayerLevelProgress(player, isPlayerWin ? 10 : -5);
                });
                return oldFinish(isPlayerWin);
            };
            finishBo3Series.__codexPolished = true;
        }
        if (typeof updateTeamMapDevelopment === 'function' && !updateTeamMapDevelopment.__codexPolished) {
            const oldMapDev = updateTeamMapDevelopment;
            updateTeamMapDevelopment = function (team, mapName, didWin) {
                const result = oldMapDev(team, mapName, didWin);
                if (team?.players) team.players.forEach(player => addRatingXp(player, didWin ? 5 : 2));
                return result;
            };
            updateTeamMapDevelopment.__codexPolished = true;
        }
    }

    function installVetoPolish() {
        if (typeof renderVetoMaps !== 'function' || renderVetoMaps.__codexPolished) return;
        const polished = function () {
            const container = document.getElementById('veto-maps-container');
            if (!container) return;
            const enemyTeam = typeof getTeamByName === 'function' ? getTeamByName(state.currentEnemy?.name) : null;
            if (enemyTeam && typeof ensureTeamCompetitiveProfile === 'function') ensureTeamCompetitiveProfile(enemyTeam);
            state.mapMastery = typeof ensureMapStatsObject === 'function' ? ensureMapStatsObject(state.mapMastery || {}) : (state.mapMastery || {});
            const available = vetoState.availableMaps || [];
            const rankedEnemy = [...available].sort((a, b) => mapEdge(enemyTeam, b, false) - mapEdge(enemyTeam, a, false));
            const rankedOwn = [...available].sort((a, b) => mapEdge(null, b, true) - mapEdge(null, a, true));
            const bestEnemy = rankedEnemy[0];
            const worstEnemy = rankedEnemy[rankedEnemy.length - 1];
            const bestOwn = rankedOwn[0];
            const isPlayerTurn = vetoState.step % 2 === 0;
            const action = vetoState.step === 0 ? 'BAN' : vetoState.step === 2 ? 'PICK' : vetoState.step === 4 ? 'BAN' : 'DECIDER';
            ensureVetoLayout();
            container.classList.add('veto-grid-polished');
            container.innerHTML = '';
            available.forEach(mapName => {
                const enemyMap = enemyTeam?.mapStats?.[mapName] || { skill: 0, played: 0, wins: 0 };
                const playerMap = state.mapMastery[mapName] || { skill: 0, played: 0, wins: 0 };
                const ownScore = mapEdge(null, mapName, true);
                const enemyScore = mapEdge(enemyTeam, mapName, false);
                const diff = ownScore - enemyScore;
                const button = document.createElement('button');
                button.className = `veto-map-card ${isPlayerTurn ? 'player-turn' : ''} ${diff > 7 ? 'veto-own-edge' : diff < -7 ? 'veto-danger' : mapName === bestEnemy ? 'veto-enemy-edge' : 'veto-neutral'}`;
                button.type = 'button';
                button.dataset.vetoMap = mapName;
                button.innerHTML = `
                    <div class="veto-map-badges">
                        ${mapName === bestOwn ? '<span class="veto-map-badge own">ВАША СИЛЬНА</span>' : ''}
                        ${mapName === bestEnemy ? '<span class="veto-map-badge best">СИЛЬНА СУПЕРНИКА</span>' : ''}
                        ${mapName === worstEnemy ? '<span class="veto-map-badge worst">СЛАБКА СУПЕРНИКА</span>' : ''}
                    </div>
                    <b>${esc(mapName)}</b>
                    <div class="veto-map-meta">
                        <span><em>Ви</em><strong>${signed(playerMap.skill || 0)}/30 · WR ${typeof getMapWinrate === 'function' ? getMapWinrate(playerMap) : 0}%</strong></span>
                        <span><em>Суперник</em><strong>${signed(enemyMap.skill || 0)}/30 · WR ${typeof getMapWinrate === 'function' ? getMapWinrate(enemyMap) : 0}%</strong></span>
                        <span><em>Рішення</em><strong>${diff > 7 ? 'вигідно лишити' : diff < -7 ? 'краще банити' : 'рівна мапа'}</strong></span>
                    </div>`;
                if (isPlayerTurn) {
                    const choose = event => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleVetoAction(mapName);
                    };
                    button.onclick = choose;
                    button.onmousedown = choose;
                    button.ontouchstart = choose;
                }
                else button.disabled = true;
                container.appendChild(button);
            });
            container.onclick = event => {
                if (vetoState.step % 2 !== 0) return;
                const card = event.target.closest('.veto-map-card');
                if (!card || card.disabled || !card.dataset.vetoMap) return;
                handleVetoAction(card.dataset.vetoMap);
            };
            updateVetoSidePanel(action, isPlayerTurn, bestOwn, bestEnemy);
        };
        polished.__codexPolished = true;
        renderVetoMaps = polished;
    }

    function signed(value) {
        const number = Number(value || 0);
        return `${number >= 0 ? '+' : ''}${number}`;
    }

    function mapEdge(team, mapName, own) {
        const row = own ? state.mapMastery?.[mapName] : team?.mapStats?.[mapName];
        const skill = Number(row?.skill || 0);
        const wr = row?.played && typeof getMapWinrate === 'function' ? getMapWinrate(row) : 50;
        return skill + (wr - 50) * 0.08 + Math.min(6, Number(row?.played || 0) * 0.25);
    }

    function ensureVetoLayout() {
        const container = document.getElementById('veto-maps-container');
        if (!container) return;
        let side = document.getElementById('veto-side-panel');
        if (!side) {
            side = document.createElement('aside');
            side.id = 'veto-side-panel';
            side.className = 'veto-side-panel';
            container.parentElement.insertBefore(side, container);
        }
        container.parentElement.classList.add('veto-layout-polished');
        document.getElementById('veto-log')?.classList.add('veto-log-polished');
    }

    function updateVetoSidePanel(action, isPlayerTurn, bestOwn, bestEnemy) {
        const side = document.getElementById('veto-side-panel');
        if (!side) return;
        const chosen = vetoState.chosenMaps || [];
        side.innerHTML = `<div class="veto-turn-card"><small>${isPlayerTurn ? 'ТВІЙ ХІД' : 'ХІД СУПЕРНИКА'}</small><b>${isPlayerTurn ? `Обери ${action}` : 'Очікуємо рішення'}</b><em>Ваша найкраща: ${esc(bestOwn || '-')} · найкраща суперника: ${esc(bestEnemy || '-')}</em></div>
            <div class="veto-pool-card"><small>ОБРАНІ МАПИ</small><b>${chosen.length ? chosen.map(esc).join(' · ') : 'Ще немає'}</b><em>Доступно: ${(vetoState.availableMaps || []).length}</em></div>
            <div id="veto-log-anchor"></div>`;
        const log = document.getElementById('veto-log');
        const anchor = document.getElementById('veto-log-anchor');
        if (log && anchor && log.parentElement !== side) anchor.replaceWith(log);
    }

    function cleanupTransferFeed() {
        const feed = document.getElementById('ai-transfer-feed');
        if (feed) feed.classList.toggle('empty', !(state.aiTransferHistory || []).length);
    }

    const oldUpdate = updateUI;
    updateUI = function () {
        oldUpdate();
        installStyle();
        installTransferSearchGate();
        installPlayerProfileRadar();
        installVetoPolish();
        polishHome();
        cleanupTransferFeed();
        const searchButton = document.querySelector('.transfer-search-grid button');
        if (searchButton) searchButton.setAttribute('onclick', 'runCompactTransferSearch()');
    };

    installStyle();
    installWorldRanking();
    installProgressHooks();
    installVetoPolish();
    window.addEventListener('load', function () {
        installStyle();
        installWorldRanking();
        installVetoPolish();
        installTransferSearchGate();
        installPlayerProfileRadar();
        installVetoPolish();
        polishHome();
        if (typeof renderRatingTable === 'function') renderRatingTable();
    });
})();
