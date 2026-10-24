const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- FEITIÇOS SONOROS DA FORJA ---

function tocarSomCorte() { // Som de Dano (Espada cortando)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const ganho = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
    ganho.gain.setValueAtTime(0, audioCtx.currentTime);
    ganho.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    ganho.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(ganho); ganho.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

function tocarSomCura() { // Som Divino (Sino/Brilho)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const ganho = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // Nota Dó
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // Mi
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // Sol
    ganho.gain.setValueAtTime(0, audioCtx.currentTime);
    ganho.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
    ganho.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.connect(ganho); ganho.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.6);
}

function tocarSomDados() { // Som de Dados Quicando na Mesa
    if (audioCtx.state === 'suspended') audioCtx.resume();
    // Fazemos três barulhinhos rápidos seguidos
    const tempos = [0, 0.1, 0.25];
    tempos.forEach(tempo => {
        const osc = audioCtx.createOscillator();
        const ganho = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(Math.random() * 200 + 100, audioCtx.currentTime + tempo);
        ganho.gain.setValueAtTime(0, audioCtx.currentTime + tempo);
        ganho.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + tempo + 0.01);
        ganho.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + tempo + 0.1);
        osc.connect(ganho); ganho.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + tempo);
        osc.stop(audioCtx.currentTime + tempo + 0.1);
    });
}

// --- BANCO DE DADOS DA TAVERNA ---
let combatentes = JSON.parse(localStorage.getItem('dndIniciativa')) || [];

function salvarDados() {
    localStorage.setItem('dndIniciativa', JSON.stringify(combatentes));
}

// --- ROLAGEM DE DADOS DO MESTRE ---
function rolarDados() {
    tocarSomDados();
    
    const qtd = parseInt(document.getElementById('qtdDados').value) || 1;
    const tipo = parseInt(document.getElementById('tipoDado').value) || 20;
    const mult = parseInt(document.getElementById('multDado').value) || 1;
    const mod = parseInt(document.getElementById('modDado').value) || 0;
    
    let soma = 0;
    for(let i=0; i<qtd; i++) {
        soma += Math.floor(Math.random() * tipo) + 1;
    }
    
    const totalFinal = (soma * mult) + mod;
    
    const divResultado = document.getElementById('resultadoDado');
    divResultado.innerText = `Resultado: ${totalFinal}`;
    
    // Mostra o detalhe se for complexo
    let textoDetalhe = `(${qtd}d${tipo}`;
    if (mult > 1) textoDetalhe += ` * ${mult}`;
    if (mod !== 0) textoDetalhe += ` ${mod > 0 ? '+' : ''}${mod}`;
    textoDetalhe += `)`;
    
    if(qtd > 1 || mult > 1 || mod !== 0) {
        divResultado.innerText += `\n${textoDetalhe}`;
    }
    
    divResultado.classList.remove('escondido');
    
    // Refaz a animação
    divResultado.style.animation = 'none';
    divResultado.offsetHeight; // Reflow forçado
    divResultado.style.animation = null;
}

// --- LÓGICA DE COMBATE ---
function ordenarIniciativa() {
    // Ordena do maior pro menor
    combatentes.sort((a, b) => b.iniciativa - a.iniciativa);
}

function adicionarCombatente() {
    const nome = document.getElementById('nomeComb').value;
    const ini = parseInt(document.getElementById('iniComb').value);
    const hpMax = parseInt(document.getElementById('hpComb').value);
    
    if (!nome || isNaN(ini) || isNaN(hpMax)) {
        alert("Preencha as runas corretamente, Mestre!");
        return;
    }
    
    combatentes.push({
        id: Date.now(),
        nome: nome,
        iniciativa: ini,
        hpMax: hpMax,
        hpAtual: hpMax,
        status: ""
    });
    
    document.getElementById('nomeComb').value = '';
    document.getElementById('iniComb').value = '';
    document.getElementById('hpComb').value = '';
    
    ordenarIniciativa();
    renderizarBatalha();
}

function removerCombatente(id) {
    combatentes = combatentes.filter(c => c.id !== id);
    renderizarBatalha();
}

function limparBatalha() {
    if(confirm("Deseja queimar o pergaminho e apagar todos os combatentes?")) {
        combatentes = [];
        renderizarBatalha();
        document.getElementById('resultadoDado').classList.add('escondido');
    }
}

function aplicarDanoCura(id, ehCura) {
    const inputValor = document.getElementById(`valor-hp-${id}`);
    const valor = parseInt(inputValor.value);
    
    if (isNaN(valor) || valor <= 0) return;
    
    const index = combatentes.findIndex(c => c.id === id);
    if (index === -1) return;
    
    if (ehCura) {
        tocarSomCura();
        combatentes[index].hpAtual += valor;
        if (combatentes[index].hpAtual > combatentes[index].hpMax) {
            combatentes[index].hpAtual = combatentes[index].hpMax;
        }
    } else {
        tocarSomCorte();
        combatentes[index].hpAtual -= valor;
        if (combatentes[index].hpAtual < 0) {
            combatentes[index].hpAtual = 0;
        }
    }
    
    inputValor.value = '';
    renderizarBatalha();
}

function atualizarStatus(id, novoStatus) {
    const index = combatentes.findIndex(c => c.id === id);
    if (index !== -1) {
        combatentes[index].status = novoStatus;
        salvarDados(); // Salva sem re-renderizar pra não perder o foco de digitação
    }
}

// --- RENDERIZAR TELA ---
function renderizarBatalha() {
    salvarDados();
    const lista = document.getElementById('listaIniciativa');
    lista.innerHTML = '';
    
    combatentes.forEach(c => {
        const li = document.createElement('li');
        const estaMorto = c.hpAtual === 0 ? 'morto' : '';
        li.className = `combatente ${estaMorto}`;
        
        li.innerHTML = `
            <div class="comb-topo">
                <span class="comb-nome">${c.nome}</span>
                <span class="comb-ini">Iniciativa: ${c.iniciativa}</span>
            </div>
            
            <div class="comb-meio">
                <div class="comb-hp-container">
                    HP: <span class="hp-atual">${c.hpAtual}</span> / ${c.hpMax}
                </div>
                
                <div class="comb-acoes-hp">
                    <input type="number" id="valor-hp-${c.id}" class="input-dano-cura" placeholder="Qtd" min="1">
                    <button class="btn-dano" onclick="aplicarDanoCura(${c.id}, false)">- Dano</button>
                    <button class="btn-cura" onclick="aplicarDanoCura(${c.id}, true)">+ Cura</button>
                </div>
            </div>
            
            <div class="comb-status">
                <span>Efeitos: </span>
                <input type="text" class="input-status" value="${c.status}" 
                       placeholder="Ex: Envenenado, Cego..." 
                       onchange="atualizarStatus(${c.id}, this.value)">
                
                <button class="btn-rpg-pequeno" onclick="removerCombatente(${c.id})" style="margin-left: auto; color: #ff4c4c; border-color: #ff4c4c;">✖ Excluir</button>
            </div>
        `;
        
        lista.appendChild(li);
    });
}

// --- CONTROLES DO PIX ---
function abrirModalPix() { document.getElementById('modalPix').classList.remove('escondido'); }
function fecharModalPix() { document.getElementById('modalPix').classList.add('escondido'); }

function copiarChavePix() {
    const chave = document.getElementById('inputChavePix').value;
    const botao = document.getElementById('btnCopiarPix');
    
    navigator.clipboard.writeText(chave).then(() => {
        botao.innerText = "Copiado!";
        setTimeout(() => { botao.innerText = "Copiar"; }, 2000);
    });
}

// Inicializa a mesa
renderizarBatalha();

// Permite apertar Enter para adicionar o monstro rápido
document.getElementById('hpComb').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') adicionarCombatente();
});