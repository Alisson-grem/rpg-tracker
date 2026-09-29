const $ = id => document.getElementById(id);
const lsGet = (k, def) => JSON.parse(localStorage.getItem(k)) ?? def;
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let combatentes = lsGet('rpgCombatentesV2', []);
let rodadaAtual = lsGet('rpgRodada', 1);
let turnoIndex = lsGet('rpgTurnoIndex', 0);
let alvoStatusId = null; 
let combateIniciado = lsGet('rpgCombateIniciado', false);
let encontrosSalvos = lsGet('rpgEncontrosSalvos', []);
let temaAtual = lsGet('rpgTema', 'fantasy');

const magiaDict = {
    'poison': { icon: '🤢', name: 'Veneno', class: 'status-poison' },
    'burn': { icon: '🔥', name: 'Chamas', class: 'status-burn' },
    'stun': { icon: '⚡', name: 'Atordoado', class: 'status-stun' },
    'shield': { icon: '🛡️', name: 'Escudo', class: 'status-shield' },
    'invisible': { icon: '👻', name: 'Invisível', class: 'status-invisible' }
};

const listaCombateDiv = $('combat-list');
const roundCounterDiv = $('round-counter');

// === MAGIA DO MULTIVERSO (Temas) ===
function aplicarTema(tema) {
    document.body.setAttribute('data-theme', tema);
    const metaColor = $('meta-theme-color');
    if(tema === 'fantasy') metaColor.setAttribute('content', '#0d0d12');
    else if(tema === 'paranormal') metaColor.setAttribute('content', '#000000');
    else if(tema === 'fallout') metaColor.setAttribute('content', '#021002');
}
aplicarTema(temaAtual);

document.querySelectorAll('.theme-select-btn').forEach(btn => {
    btn.onclick = () => {
        temaAtual = btn.getAttribute('data-settheme');
        lsSet('rpgTema', temaAtual);
        aplicarTema(temaAtual);
        $('theme-modal').classList.remove('show');
    };
});

// Efeitos Visuais
const soltarConfetesMagicos = () => {
    const emojis = ['✨', '🎉', '🔥', '🏆', '💎', '🌟'];
    for(let i = 0; i < 40; i++) {
        const c = document.createElement('div');
        c.innerText = emojis[Math.floor(Math.random() * emojis.length)];
        c.style.cssText = `position:fixed; left:${Math.random()*100}vw; top:-5vh; font-size:${Math.random()*20+15}px; z-index:9999; pointer-events:none; transition: all 2.5s cubic-bezier(0.25,0.46,0.45,0.94); opacity:1;`;
        document.body.appendChild(c);
        setTimeout(() => { c.style.top = '105vh'; c.style.transform = `rotate(${Math.random()*720}deg) translateX(${Math.random()*200-100}px)`; c.style.opacity = '0'; }, 50);
        setTimeout(() => c.remove(), 2600);
    }
};

// Renderização Principal
function renderizarCombate() {
    listaCombateDiv.innerHTML = '';
    roundCounterDiv.innerText = `Rodada ${rodadaAtual}`;
    
    let idDoTurnoAtivo = combatentes[turnoIndex] ? combatentes[turnoIndex].id : null;
    combatentes.sort((a, b) => b.iniciativa - a.iniciativa);

    if (!combateIniciado) { turnoIndex = 0; } 
    else if (idDoTurnoAtivo) {
        let novoIndex = combatentes.findIndex(c => c.id === idDoTurnoAtivo);
        if (novoIndex !== -1) turnoIndex = novoIndex; else turnoIndex = 0; 
    }

    if (combatentes.length === 0) {
        listaCombateDiv.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size: 16px; padding: 20px;">🕸️ A masmorra está vazia...<br>Invoque novos monstros acima.</p>';
        return;
    }

    combatentes.forEach((char, index) => {
        if (!char.status) char.status = 'ativo';
        if (!char.faccao) char.faccao = 'neutral';
        if (!char.condicoes) char.condicoes = [];

        const porcentagemVida = Math.max(0, Math.min(100, (char.hpAtual / char.hpMax) * 100));
        
        let classEstado = '';
        if (char.hpAtual <= 0 && char.status === 'ativo') classEstado = 'pending-death';
        if (char.status === 'nocaute') classEstado = 'knocked-out';
        if (char.status === 'morto') classEstado = 'dead';

        const isTurno = (index === turnoIndex);
        if (isTurno) classEstado += ' active-turn';

        let classFaccao = `fac-${char.faccao}`;
        let iconeFaccao = char.faccao === 'hero' ? '🛡️' : (char.faccao === 'villain' ? '💀' : '⚖️');

        const div = document.createElement('div');
        div.id = `card-${char.id}`;
        div.className = `char-card ${classFaccao} ${classEstado}`;
        
        let htmlControles = '';
        if (char.hpAtual > 0) {
            char.status = 'ativo'; 
            htmlControles = `
                <div class="hp-section">
                    <span class="hp-display">${char.hpAtual} / ${char.hpMax} HP</span>
                    <div class="hp-btns">
                        <button class="hp-btn btn-minus" onclick="alterarHP('${char.id}', -10)">-10</button>
                        <button class="hp-btn btn-minus" onclick="alterarHP('${char.id}', -5)">-5</button>
                        <button class="hp-btn btn-minus" onclick="alterarHP('${char.id}', -1)">-1</button>
                        <div class="btn-separator"></div>
                        <button class="hp-btn btn-plus" onclick="alterarHP('${char.id}', 1)">+1</button>
                        <button class="hp-btn btn-plus" onclick="alterarHP('${char.id}', 5)">+5</button>
                        <button class="hp-btn btn-plus" onclick="alterarHP('${char.id}', 10)">+10</button>
                    </div>
                </div>
            `;
        } else if (char.hpAtual <= 0 && char.status === 'ativo') {
            htmlControles = `
                <div class="hp-section">
                    <span style="color: var(--primary-glow); font-size: 13px; font-weight: bold; text-transform: uppercase;">⚠️ Caiu! Qual o Destino?</span>
                    <div class="decision-box">
                        <button class="btn-decision btn-knockout" onclick="mudarStatus('${char.id}', 'nocaute')">💤 Nocaute</button>
                        <button class="btn-decision btn-death" onclick="mudarStatus('${char.id}', 'morto')">💀 Morte</button>
                    </div>
                </div>
            `;
        } else if (char.status === 'nocaute') {
            htmlControles = `
                <div class="hp-section">
                    <div class="status-badge badge-knockout">💤 Inconsciente</div>
                    <span class="hp-display" style="font-size: 20px;">${char.hpAtual} / ${char.hpMax} HP</span>
                    <div class="decision-box">
                        <button class="btn-decision btn-revive" onclick="alterarHP('${char.id}', 1)">✨ Acordar (+1)</button>
                    </div>
                </div>
            `;
        } else if (char.status === 'morto') {
            htmlControles = `
                <div class="hp-section">
                    <div class="status-badge badge-dead">💀 Cadáver</div>
                    <span class="hp-display" style="font-size: 20px;">${char.hpAtual} / ${char.hpMax} HP</span>
                    <div class="decision-box">
                        <button class="btn-decision btn-necro" onclick="alterarHP('${char.id}', 1)">🦇 Ressuscitar (+1)</button>
                    </div>
                </div>
            `;
        }

        const coroaHTML = isTurno ? `<div class="active-crown">👑</div>` : '';

        let badgesHTML = '';
        if (char.condicoes.length > 0) {
            badgesHTML = `<div class="char-conditions">`;
            char.condicoes.forEach(c => { 
                const magia = magiaDict[c];
                if(magia) badgesHTML += `<span class="cond-badge ${magia.class}" title="${magia.name}">${magia.icon} ${magia.name}</span>`; 
            });
            badgesHTML += `</div>`;
        }

        div.innerHTML = `
            ${coroaHTML}
            <div class="hp-bar-bg" style="width: ${porcentagemVida}%"></div>
            <div class="char-top">
                <div class="name-area">
                    <h3 class="char-name"><span class="fac-icon">${iconeFaccao}</span> ${char.nome}</h3>
                    ${badgesHTML}
                </div>
                <div class="char-top-right">
                    <button class="action-icon-btn" onclick="abrirStatusModal('${char.id}')" title="Condições">🔮</button>
                    <span class="char-init">Inic: ${char.iniciativa}</span>
                    <button class="action-icon-btn delete-char-btn" onclick="apagarChar('${char.id}')" title="Excluir">🗑️</button>
                </div>
            </div>
            ${htmlControles}
        `;
        listaCombateDiv.appendChild(div);
    });
}

$('next-turn-btn').onclick = () => {
    if (combatentes.length === 0) return;
    if (navigator.vibrate) navigator.vibrate(30);
    if (!combateIniciado) { combateIniciado = true; lsSet('rpgCombateIniciado', true); }

    let tentativas = 0;
    do {
        turnoIndex++;
        if (turnoIndex >= combatentes.length) { turnoIndex = 0; rodadaAtual++; lsSet('rpgRodada', rodadaAtual); }
        tentativas++;
    } while (combatentes[turnoIndex].status === 'morto' && tentativas < combatentes.length);

    lsSet('rpgTurnoIndex', turnoIndex); renderizarCombate();
};

$('reset-combat-btn').onclick = () => {
    if(confirm("Deseja voltar para a Rodada 1 e o topo da iniciativa? (Não apaga os personagens)")) {
        combateIniciado = false; rodadaAtual = 1; turnoIndex = 0;
        lsSet('rpgCombateIniciado', false); lsSet('rpgRodada', rodadaAtual); lsSet('rpgTurnoIndex', turnoIndex);
        renderizarCombate();
    }
};

window.alterarHP = (id, valor) => {
    if (navigator.vibrate) {
        if (valor <= -10) navigator.vibrate([80, 30, 80]); else if (valor < 0) navigator.vibrate([50, 50]); else navigator.vibrate(30);
    }
    
    const index = combatentes.findIndex(c => c.id === id);
    if (index !== -1) {
        combatentes[index].hpAtual += valor;
        if (combatentes[index].hpAtual > combatentes[index].hpMax) combatentes[index].hpAtual = combatentes[index].hpMax;
        if (combatentes[index].hpAtual <= 0) combatentes[index].hpAtual = 0; else combatentes[index].status = 'ativo';
        
        lsSet('rpgCombatentesV2', combatentes);
        
        const card = $(`card-${id}`);
        if (card && valor !== 0) {
            card.classList.remove('damage-anim', 'heal-anim'); void card.offsetWidth; 
            if (valor < 0) card.classList.add('damage-anim'); else card.classList.add('heal-anim');
            setTimeout(() => renderizarCombate(), 300);
        } else { renderizarCombate(); }
    }
};

window.mudarStatus = (id, status) => {
    const index = combatentes.findIndex(c => c.id === id);
    if (index !== -1) {
        combatentes[index].status = status; lsSet('rpgCombatentesV2', combatentes);
        if (status === 'morto' && index === turnoIndex) $('next-turn-btn').click(); else renderizarCombate();
    }
};

window.apagarChar = (id) => {
    if(confirm("Expulsar esta criatura da existência?")) {
        const indexParaApagar = combatentes.findIndex(c => c.id === id);
        if (combateIniciado) {
            if (indexParaApagar < turnoIndex) turnoIndex--;
            else if (indexParaApagar === turnoIndex && combatentes.length > 1) { $('next-turn-btn').click(); return; }
        }
        combatentes = combatentes.filter(c => c.id !== id);
        if (combatentes.length === 0) {
            turnoIndex = 0; rodadaAtual = 1; combateIniciado = false;
            lsSet('rpgRodada', rodadaAtual); lsSet('rpgCombateIniciado', false);
        }
        lsSet('rpgTurnoIndex', turnoIndex); lsSet('rpgCombatentesV2', combatentes); renderizarCombate();
    }
};

$('add-btn').onclick = () => {
    const faccaoSelecionada = document.querySelector('input[name="faction"]:checked').value;
    const nomeBase = $('char-name').value.trim();
    const hp = parseInt($('char-hp').value);
    const inic = parseInt($('char-init').value);
    let qtd = parseInt($('char-qtd').value) || 1;

    if (!nomeBase || isNaN(hp) || isNaN(inic) || qtd < 1) { alert("Feitiço falhou! Preencha todos os campos corretamente."); return; }

    for(let i = 0; i < qtd; i++) {
        let nomeFinal = qtd > 1 ? `${nomeBase} ${i + 1}` : nomeBase;
        let iniciativaFinal = inic;
        if (qtd > 1) iniciativaFinal = inic + Math.floor(Math.random() * 20) + 1;
        combatentes.push({
            id: 'char_' + Date.now() + '_' + i, nome: nomeFinal, hpMax: hp, hpAtual: hp, iniciativa: iniciativaFinal, status: 'ativo', faccao: faccaoSelecionada, condicoes: []
        });
    }
    lsSet('rpgCombatentesV2', combatentes);
    $('char-name').value = ''; $('char-hp').value = '';$('char-init').value = ''; $('char-qtd').value = '1';$('char-name').focus();
    renderizarCombate();
};

$('clear-btn').onclick = () => {
    if(confirm("Deseja invocar o Apocalipse e dizimar TODOS da mesa?")) {
        combatentes = []; rodadaAtual = 1; turnoIndex = 0; combateIniciado = false;
        lsSet('rpgCombatentesV2', combatentes); lsSet('rpgRodada', rodadaAtual); lsSet('rpgTurnoIndex', turnoIndex); lsSet('rpgCombateIniciado', false);
        renderizarCombate();
    }
};

// === GERENCIADOR DE MODAIS ===
const toggleModal = (id, show) => { $(id).classList[show ? 'add' : 'remove']('show'); };

// Temas
document.querySelectorAll('.open-theme-btn').forEach(btn => btn.onclick = () => toggleModal('theme-modal', true));
document.querySelectorAll('.close-theme-btn').forEach(btn => btn.onclick = () => toggleModal('theme-modal', false));

// Grimório
document.querySelectorAll('.open-encounters-btn').forEach(btn => btn.onclick = () => { renderizarEncontros(); toggleModal('encounters-modal', true); });
document.querySelectorAll('.close-encounters-btn').forEach(btn => btn.onclick = () => toggleModal('encounters-modal', false));

function renderizarEncontros() {
    const div = $('encounters-list'); div.innerHTML = '';
    if(encontrosSalvos.length === 0) { div.innerHTML = '<p style="color: var(--text-muted); font-size: 14px;">O grimório está vazio. Salve uma batalha primeiro!</p>'; return; }
    encontrosSalvos.forEach(enc => {
        const item = document.createElement('div'); item.className = 'encounter-item';
        item.innerHTML = `
            <div class="encounter-info"><span class="encounter-name">${enc.nome}</span><span class="encounter-count">${enc.combatentes.length} combatentes</span></div>
            <div class="encounter-actions">
                <button class="enc-btn enc-load" onclick="carregarEncontro('${enc.id}')" title="Carregar">▶</button>
                <button class="enc-btn enc-del" onclick="deletarEncontro('${enc.id}')" title="Apagar">🗑️</button>
            </div>`;
        div.appendChild(item);
    });
}
$('save-encounter-btn').onclick = () => {
    const nome = $('encounter-name').value.trim();
    if(!nome) return alert('Dê um nome para a batalha!');
    if(combatentes.length === 0) return alert('A mesa está vazia! Convoque criaturas antes de salvar.');
    encontrosSalvos.push({ id: 'enc_' + Date.now(), nome: nome, combatentes: JSON.parse(JSON.stringify(combatentes)) });
    lsSet('rpgEncontrosSalvos', encontrosSalvos); $('encounter-name').value = ''; renderizarEncontros();
};
window.carregarEncontro = (id) => {
    if(!confirm("Carregar esse encontro vai substituir a batalha atual da tela! Deseja invocar?")) return;
    const enc = encontrosSalvos.find(e => e.id === id);
    if(enc) {
        combatentes = JSON.parse(JSON.stringify(enc.combatentes)); rodadaAtual = 1; turnoIndex = 0; combateIniciado = false;
        lsSet('rpgCombatentesV2', combatentes); lsSet('rpgRodada', rodadaAtual); lsSet('rpgTurnoIndex', turnoIndex); lsSet('rpgCombateIniciado', false);
        toggleModal('encounters-modal', false); renderizarCombate();
    }
};
window.deletarEncontro = (id) => { if(confirm("Queimar este pergaminho do grimório para sempre?")) { encontrosSalvos = encontrosSalvos.filter(e => e.id !== id); lsSet('rpgEncontrosSalvos', encontrosSalvos); renderizarEncontros(); } };

// Dados
document.querySelectorAll('.open-dice-btn').forEach(btn => btn.onclick = () => toggleModal('dice-modal', true));
document.querySelectorAll('.close-dice-btn').forEach(btn => btn.onclick = () => toggleModal('dice-modal', false));
window.rolarDado = (lados) => {
    if (navigator.vibrate) navigator.vibrate(20);
    const resultSpan = $('dice-result'), detailSpan = $('dice-detail'), modVal = parseInt($('dice-mod').value) || 0;
    resultSpan.classList.remove('dice-roll-anim'); void resultSpan.offsetWidth; resultSpan.classList.add('dice-roll-anim');
    resultSpan.style.color = 'var(--gold)'; resultSpan.style.textShadow = '0 0 20px var(--gold-glow)';
    let rolagens = 0;
    const fakeRoll = setInterval(() => {
        resultSpan.innerText = Math.floor(Math.random() * lados) + 1; rolagens++;
        if (rolagens > 10) {
            clearInterval(fakeRoll);
            const dadoPuro = Math.floor(Math.random() * lados) + 1; resultSpan.innerText = dadoPuro + modVal;
            let sinal = modVal > 0 ? '+' : ''; let textoDetalhe = `D${lados} (${dadoPuro}) ${modVal !== 0 ? sinal + modVal : ''}`;
            if (lados === 20) {
                if (dadoPuro === 20) { textoDetalhe += ' - CRÍTICO! 🎉'; resultSpan.style.color = 'var(--primary-glow)'; resultSpan.style.textShadow = '0 0 25px var(--primary-glow)'; soltarConfetesMagicos(); if (navigator.vibrate) navigator.vibrate([100, 50, 100]); } 
                else if (dadoPuro === 1) { textoDetalhe += ' - FALHA CRÍTICA! 💀'; resultSpan.style.color = '#ef4444'; resultSpan.style.textShadow = '0 0 25px rgba(239, 68, 68, 0.8)'; if (navigator.vibrate) navigator.vibrate(300); }
            }
            detailSpan.innerText = textoDetalhe;
        }
    }, 40);
};

// Pix
document.querySelectorAll('.open-pix-btn').forEach(btn => btn.onclick = () => toggleModal('pix-modal', true));
document.querySelectorAll('.close-pix-btn').forEach(btn => btn.onclick = () => toggleModal('pix-modal', false));
$('copy-pix-btn').onclick = () => {
    navigator.clipboard.writeText($('minha-chave-pix').innerText).then(() => {
        const btn = $('copy-pix-btn'); btn.innerText = "✅ Feitiço Copiado!"; btn.style.background = "var(--heal-btn-bg)";
        setTimeout(() => { btn.innerText = "📋 Copiar Feitiço"; btn.style.background = ""; }, 2000);
    });
};

// Maldições
const statusModal = $('status-modal');
window.abrirStatusModal = (id) => {
    alvoStatusId = id; const char = combatentes.find(c => c.id === id); $('status-char-name').innerText = char.nome;
    document.querySelectorAll('.status-toggle-btn').forEach(btn => { if (char.condicoes.includes(btn.getAttribute('data-status'))) btn.classList.add('active'); else btn.classList.remove('active'); });
    statusModal.classList.add('show');
};
document.querySelectorAll('.status-toggle-btn').forEach(btn => {
    btn.onclick = () => {
        if (!alvoStatusId) return;
        const cond = btn.getAttribute('data-status'), charIndex = combatentes.findIndex(c => c.id === alvoStatusId);
        if (charIndex === -1) return;
        if (combatentes[charIndex].condicoes.includes(cond)) { combatentes[charIndex].condicoes = combatentes[charIndex].condicoes.filter(c => c !== cond); btn.classList.remove('active'); }
        else { combatentes[charIndex].condicoes.push(cond); btn.classList.add('active'); }
        lsSet('rpgCombatentesV2', combatentes); renderizarCombate();
    };
});
$('close-status-modal').onclick = () => { statusModal.classList.remove('show'); alvoStatusId = null; };

// Magia de Instalação (PWA)
let deferredPrompt;
const installBtn = $('install-app-btn');
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e; installBtn.style.display = 'flex';
});
installBtn.addEventListener('click', async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') installBtn.style.display = 'none'; deferredPrompt = null; }
});
window.addEventListener('appinstalled', () => { installBtn.style.display = 'none'; });
if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e=>e)); }

renderizarCombate();