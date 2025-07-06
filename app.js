// Game state
let gameState = {
    players: [],
    roles: {},
    currentScreen: 'welcome-screen',
    gamePhase: 'setup',
    currentPlayer: 0,
    dayNumber: 1,
    discussionTime: 5,
    gameTimer: null,
    phaseTimer: null,
    selectedPlayers: [],
    witchPotions: { heal: true, revive: true, poison: true },
    lovers: [],
    captain: null,
    debounceTimer: null,
    voiceEnabled: true,
    isRevealing: false,
    lastAction: 0,
    werewolfVictim: null,
    isDragging: false
};


// === DRAG & DROP CONSTANTS ===
const CIRCLE_CENTER_X = 250;
const CIRCLE_CENTER_Y = 250;
const MIN_DISTANCE_FROM_CENTER = 160;
const MAX_DISTANCE_FROM_CENTER = 200;
const CIRCLE_RADIUS = 180;

// Drag data object
let dragData = { isDragging: false, startX: 0, startY: 0, element: null };

// === DRAG & DROP HELPER FUNCTIONS ===
function snapToCircleEdge(x, y) {
    const centerX = CIRCLE_CENTER_X;
    const centerY = CIRCLE_CENTER_Y;

    const deltaX = x - centerX;
    const deltaY = y - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Omezit vzdálenost na povolené pásmo
    const targetDistance = Math.max(MIN_DISTANCE_FROM_CENTER, 
                                  Math.min(MAX_DISTANCE_FROM_CENTER, distance));

    const angle = Math.atan2(deltaY, deltaX);
    const newX = centerX + Math.cos(angle) * targetDistance;
    const newY = centerY + Math.sin(angle) * targetDistance;

    return { x: newX, y: newY, angle: angle };
}

function calculateRotationToCenter(x, y) {
    const deltaX = x - CIRCLE_CENTER_X;
    const deltaY = y - CIRCLE_CENTER_Y;
    const angle = Math.atan2(deltaY, deltaX);
    return (angle * 180 / Math.PI + 90) % 360;
}

function addCircleGuides() {
    const circle = document.getElementById('game-circle');

    // Odstraň existující vodítka
    circle.querySelectorAll('.circle-guide').forEach(guide => guide.remove());

    // Vnitřní kruh (minimální vzdálenost)
    const innerGuide = document.createElement('div');
    innerGuide.style.position = 'absolute';
    innerGuide.style.left = `${CIRCLE_CENTER_X - MIN_DISTANCE_FROM_CENTER}px`;
    innerGuide.style.top = `${CIRCLE_CENTER_Y - MIN_DISTANCE_FROM_CENTER}px`;
    innerGuide.style.width = `${MIN_DISTANCE_FROM_CENTER * 2}px`;
    innerGuide.style.height = `${MIN_DISTANCE_FROM_CENTER * 2}px`;
    innerGuide.style.border = '1px dashed rgba(255, 255, 255, 0.3)';
    innerGuide.style.borderRadius = '50%';
    innerGuide.style.pointerEvents = 'none';
    innerGuide.className = 'circle-guide';

    // Vnější kruh (maximální vzdálenost)
    const outerGuide = document.createElement('div');
    outerGuide.style.position = 'absolute';
    outerGuide.style.left = `${CIRCLE_CENTER_X - MAX_DISTANCE_FROM_CENTER}px`;
    outerGuide.style.top = `${CIRCLE_CENTER_Y - MAX_DISTANCE_FROM_CENTER}px`;
    outerGuide.style.width = `${MAX_DISTANCE_FROM_CENTER * 2}px`;
    outerGuide.style.height = `${MAX_DISTANCE_FROM_CENTER * 2}px`;
    outerGuide.style.border = '1px dashed rgba(255, 255, 255, 0.2)';
    outerGuide.style.borderRadius = '50%';
    outerGuide.style.pointerEvents = 'none';
    outerGuide.className = 'circle-guide';

    circle.appendChild(innerGuide);
    circle.appendChild(outerGuide);
}


// Role definitions with Czech descriptions
const ROLES = {
    vlkodlak: {name: "Vlkodlak", color: "#ff4444", team: "evil", description: "Každou noc vybíráš společně s ostatními vlkodlaky oběť k zabití."},
    vestec: {name: "Věštec", color: "#4444ff", team: "good", description: "Každou noc si můžeš vybrat jednoho hráče a zjistit jeho roli."},
    carodejka: {name: "Čarodějka", color: "#8844ff", team: "good", description: "Máš lektvar léčení, oživení a jedu. Každý můžeš použít jen jednou za hru."},
    lovec: {name: "Lovec", color: "#ff8844", team: "good", description: "Pokud tě někdo zabije, můžeš před smrtí zastřelit jiného hráče."},
    holcicka: {name: "Holčička", color: "#ff66cc", team: "good", description: "Každou noc můžeš špehovat vlkodlaky, ale 20% šance že tě přistihnout."},
    amor: {name: "Amor", color: "#ffff44", team: "good", description: "První noc vybereš dva milence. Pokud jeden zemře, druhý zemře žalem."},
    zlodej: {name: "Zloděj", color: "#8b4513", team: "neutral", description: "Na začátku si můžeš vyměnit roli s jiným hráčem."},
    kapitan: {name: "Kapitán", color: "#ffd700", team: "good", description: "Při hlasování máš dva hlasy místo jednoho."},
    strazce: {name: "Strážce", color: "#228b22", team: "good", description: "Každou noc chráníš jednoho hráče před útokem vlkodlaků."},
    vesnicak: {name: "Vesničan", color: "#44ff44", team: "good", description: "Nemáš žádnou speciální schopnost. Tvým cílem je odhalit a vyřadit všechny vlkodlaky."}
};

// Role distribution by player count
const ROLE_DISTRIBUTION = {
    6: {vlkodlak: 1, vestec: 1, carodejka: 1, vesnicak: 3},
    7: {vlkodlak: 2, vestec: 1, carodejka: 1, vesnicak: 3},
    8: {vlkodlak: 2, vestec: 1, carodejka: 1, lovec: 1, vesnicak: 3},
    9: {vlkodlak: 2, vestec: 1, carodejka: 1, lovec: 1, vesnicak: 4},
    10: {vlkodlak: 2, vestec: 1, carodejka: 1, lovec: 1, vesnicak: 5},
    11: {vlkodlak: 2, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, vesnicak: 5},
    12: {vlkodlak: 3, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, vesnicak: 5},
    13: {vlkodlak: 3, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, vesnicak: 6},
    14: {vlkodlak: 3, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, amor: 1, vesnicak: 6},
    15: {vlkodlak: 3, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, amor: 1, vesnicak: 7},
    16: {vlkodlak: 3, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, amor: 1, kapitan: 1, vesnicak: 7},
    17: {vlkodlak: 4, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, amor: 1, kapitan: 1, vesnicak: 7},
    18: {vlkodlak: 4, vestec: 1, carodejka: 1, lovec: 1, holcicka: 1, amor: 1, kapitan: 1, strazce: 1, vesnicak: 7}
};

// Voice lines in Czech
const VOICE_LINES = {
    night: "Noc přichází, celá vesnička usíná. Všichni zavřete oči.",
    seer: "Věštci, otevři oči a vyber hráče k prozkoumání.",
    werewolves: "Vlkodlaci, otevřete oči a vyberte svou oběť.",
    witch: "Čarodějko, otevři oči. Chceš někoho zachránit nebo otrávit?",
    dawn: "Slunce vychází, vesnička se probouzí. Všichni otevřete oči.",
    discussion: "Diskutujte o tom, kdo může být vlkodlak.",
    voting: "Hlasujte o tom, koho chcete vyřadit."
};

// Debouncing function to prevent double clicks
function debounce(func, delay = 1000) {
    const now = Date.now();
    if (now - gameState.lastAction < delay) {
        return false;
    }
    gameState.lastAction = now;
    func();
    return true;
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    gameState.currentScreen = screenId;
}

// Voice synthesis with Czech language
function speak(text) {
    if (!gameState.voiceEnabled || !('speechSynthesis' in window)) return;
    
    // Stop any current speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'cs-CZ';
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to find Czech voice
    const voices = speechSynthesis.getVoices();
    const czechVoice = voices.find(voice => voice.lang.startsWith('cs'));
    if (czechVoice) {
        utterance.voice = czechVoice;
    }
    
    speechSynthesis.speak(utterance);
}

// Player management functions
function addPlayer(name) {
    if (!name.trim()) return false;
    if (gameState.players.length >= 18) return false;
    if (gameState.players.some(p => p.name === name.trim())) return false;
    
    gameState.players.push({
        name: name.trim(),
        role: null,
        alive: true,
        position: { x: 0, y: 0, angle: 0, rotation: 0 },
        votes: 0,
        id: Date.now() + Math.random()
    });
    
    updatePlayersList();
    updatePlayerCount();
    return true;
}

function removePlayer(index) {
    gameState.players.splice(index, 1);
    updatePlayersList();
    updatePlayerCount();
}

function updatePlayersList() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.innerHTML = `
            <span class="player-name">${player.name}</span>
            <button class="remove-player" onclick="removePlayer(${index})">×</button>
        `;
        container.appendChild(playerDiv);
    });
}

function updatePlayerCount() {
    const count = gameState.players.length;
    document.getElementById('player-count').textContent = count;
    const continueBtn = document.getElementById('continue-to-roles');
    
    if (continueBtn) {
        continueBtn.disabled = count < 6;
    }
}

// Role distribution and management
function generateRoleDistribution() {
    const playerCount = gameState.players.length;
    const distribution = ROLE_DISTRIBUTION[playerCount];
    
    if (!distribution) {
        // Generate default distribution for other player counts
        const werewolves = Math.floor(playerCount / 4);
        const specialRoles = Math.min(3, playerCount - werewolves - 2);
        const villagers = playerCount - werewolves - specialRoles;
        
        gameState.roles = {
            vlkodlak: werewolves,
            vestec: 1,
            carodejka: Math.min(1, specialRoles),
            vesnicak: villagers
        };
    } else {
        gameState.roles = { ...distribution };
    }
    
    updateRolesDisplay();
    validateRoles();
}

function updateRolesDisplay() {
    const container = document.getElementById('roles-container');
    container.innerHTML = '';
    
    Object.entries(gameState.roles).forEach(([roleKey, count]) => {
        const role = ROLES[roleKey];
        const roleDiv = document.createElement('div');
        roleDiv.className = 'role-item';
        roleDiv.innerHTML = `
            <div class="role-info">
                <span class="role-color" style="background-color: ${role.color}"></span>
                <span class="role-name">${role.name}</span>
            </div>
            <div class="role-controls">
                <button class="role-btn" onclick="adjustRole('${roleKey}', -1)" ${count <= 0 ? 'disabled' : ''}>-</button>
                <span class="role-count">${count}</span>
                <button class="role-btn" onclick="adjustRole('${roleKey}', 1)">+</button>
            </div>
        `;
        container.appendChild(roleDiv);
    });
}

function adjustRole(roleKey, delta) {
    if (!gameState.roles[roleKey]) gameState.roles[roleKey] = 0;
    
    const newCount = gameState.roles[roleKey] + delta;
    if (newCount >= 0) {
        gameState.roles[roleKey] = newCount;
        updateRolesDisplay();
        validateRoles();
    }
}

function validateRoles() {
    const totalRoles = Object.values(gameState.roles).reduce((sum, count) => sum + count, 0);
    const playerCount = gameState.players.length;
    
    document.getElementById('roles-total-count').textContent = `Celkem rolí: ${totalRoles}`;
    document.getElementById('players-total-count').textContent = `Hráčů: ${playerCount}`;
    
    const validationEl = document.getElementById('role-validation');
    const startBtn = document.getElementById('start-positioning');
    
    if (totalRoles === playerCount) {
        validationEl.textContent = 'Role jsou správně nastaveny';
        validationEl.style.color = 'var(--color-success)';
        startBtn.disabled = false;
    } else {
        validationEl.textContent = `Chybí ${Math.abs(playerCount - totalRoles)} rolí`;
        validationEl.style.color = 'var(--color-error)';
        startBtn.disabled = true;
    }
}

// Assign roles to players randomly
function assignRoles() {
    const rolesList = [];
    
    Object.entries(gameState.roles).forEach(([roleKey, count]) => {
        for (let i = 0; i < count; i++) {
            rolesList.push(roleKey);
        }
    });
    
    // Shuffle roles using Fisher-Yates algorithm
    for (let i = rolesList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolesList[i], rolesList[j]] = [rolesList[j], rolesList[i]];
    }
    
    // Assign to players
    gameState.players.forEach((player, index) => {
        player.role = rolesList[index];
    });
}

// Player positioning with drag & drop
function initializePositioning() {
    const circle = document.getElementById('game-circle');
    const players = gameState.players;
    
    // Clear existing tags
    circle.querySelectorAll('.player-tag').forEach(tag => tag.remove());
    
    // Create player tags
    players.forEach((player, index) => {
        const tag = createPlayerTag(player, index);
        circle.appendChild(tag);
        
        // Initial positioning around circle
        const angle = (index / players.length) * 2 * Math.PI;
        const radius = 180;
        const x = Math.cos(angle) * radius + 250;
        const y = Math.sin(angle) * radius + 250;
        
        tag.style.left = `${x - 60}px`;
        tag.style.top = `${y - 20}px`;
        
        // Calculate rotation for radial text
        const rotation = (angle * 180 / Math.PI + 90) % 360;
        tag.style.transform = `rotate(${rotation}deg)`;
        
        player.position = { x, y, angle, rotation };
    });
}

function createPlayerTag(player, index) {
    const tag = document.createElement('div');
    tag.className = 'player-tag';
    tag.textContent = player.name;
    tag.draggable = true;
    tag.dataset.playerIndex = index;
    
    // Desktop drag handlers
    tag.addEventListener('dragstart', handleDragStart);
    tag.addEventListener('dragend', handleDragEnd);
    
    // Touch handlers for iPad
    tag.addEventListener('touchstart', handleTouchStart, { passive: false });
    tag.addEventListener('touchmove', handleTouchMove, { passive: false });
    tag.addEventListener('touchend', handleTouchEnd);
    
    return tag;
}

// Drag and drop handlers


function handleDragStart(e) {
    dragData.element = e.target;
    e.target.classList.add('dragging');
    gameState.isDragging = true;

    // Přidáme mouse move listener pro desktop drag
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    updatePlayerPosition(e.target);
    gameState.isDragging = false;

    // Odstraníme mouse listenery
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

function handleTouchStart(e) {
    e.preventDefault();
    dragData.isDragging = true;
    dragData.element = e.target;
    dragData.startX = e.touches[0].clientX;
    dragData.startY = e.touches[0].clientY;
    e.target.classList.add('dragging');
    gameState.isDragging = true;
}

function handleTouchMove(e) {
    if (!dragData.isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    const circleRect = document.getElementById('game-circle').getBoundingClientRect();

    // Výpočet pozice relativně k kruhu
    const relativeX = touch.clientX - circleRect.left;
    const relativeY = touch.clientY - circleRect.top;

    // Přichytnutí k okraji kruhu
    const snappedPosition = snapToCircleEdge(relativeX, relativeY);

    // Nastavení pozice (upraveno o polovinu šířky/výšky tagu)
    const tagX = snappedPosition.x - 60;
    const tagY = snappedPosition.y - 20;

    dragData.element.style.left = `${tagX}px`;
    dragData.element.style.top = `${tagY}px`;

    // Okamžité natočení ke středu během tažení
    const rotation = calculateRotationToCenter(snappedPosition.x, snappedPosition.y);
    dragData.element.style.transform = `rotate(${rotation}deg)`;
}

function handleTouchEnd(e) {
    if (!dragData.isDragging) return;
    e.preventDefault();
    
    dragData.isDragging = false;
    dragData.element.classList.remove('dragging');
    updatePlayerPosition(dragData.element);
    gameState.isDragging = false;
}

function updatePlayerPosition(element) {
    const playerIndex = parseInt(element.dataset.playerIndex);
    const rect = element.getBoundingClientRect();
    const circleRect = document.getElementById('game-circle').getBoundingClientRect();

    // Získání aktuální pozice jmenovky relativně k kruhu
    const currentX = rect.left + rect.width / 2 - circleRect.left;
    const currentY = rect.top + rect.height / 2 - circleRect.top;

    // Přichytnutí k okraji kruhu
    const snappedPosition = snapToCircleEdge(currentX, currentY);

    // Nastavení nové pozice (upraveno o polovinu šířky/výšky tagu)
    const tagX = snappedPosition.x - 60; // polovina šířky tagu (120px)
    const tagY = snappedPosition.y - 20; // polovina výšky tagu (40px)

    element.style.left = `${tagX}px`;
    element.style.top = `${tagY}px`;

    // Výpočet rotace pro natočení ke středu
    const rotation = calculateRotationToCenter(snappedPosition.x, snappedPosition.y);
    element.style.transform = `rotate(${rotation}deg)`;
    element.classList.add('positioned');

    // Uložení pozice do gameState
    if (gameState.players[playerIndex]) {
        gameState.players[playerIndex].position = { 
            x: snappedPosition.x, 
            y: snappedPosition.y, 
            angle: snappedPosition.angle, 
            rotation: rotation 
        };
    }
}

// Role reveal sequence
function startRoleReveal() {
    gameState.currentPlayer = 0;
    gameState.isRevealing = true;
    showScreen('role-reveal');
    showNextPlayerRole();
}

function showNextPlayerRole() {
    if (gameState.currentPlayer >= gameState.players.length) {
        startGame();
        return;
    }
    
    const player = gameState.players[gameState.currentPlayer];
    const role = ROLES[player.role];
    
    // Voice instruction before showing role
    speak(`Probudí se ${player.name}, otevři oči`);
    
    document.getElementById('current-reveal-player').textContent = player.name;
    document.getElementById('revealed-role-name').textContent = role.name;
    document.getElementById('revealed-role-description').textContent = role.description;
    
    // Hide role card initially
    document.getElementById('role-reveal-card').classList.add('hidden');
    document.getElementById('show-role').classList.remove('hidden');
    document.getElementById('hide-role').classList.add('hidden');
    
    // Set role card color
    const roleCard = document.getElementById('role-reveal-card');
    roleCard.style.borderColor = role.color;
    roleCard.style.boxShadow = `0 0 30px ${role.color}40`;
}

function showRoleCard() {
    debounce(() => {
        document.getElementById('role-reveal-card').classList.remove('hidden');
        document.getElementById('show-role').classList.add('hidden');
        document.getElementById('hide-role').classList.remove('hidden');
    });
}

function hideRoleCard() {
    debounce(() => {
        // First hide the role
        document.getElementById('role-reveal-card').classList.add('hidden');
        document.getElementById('hide-role').classList.add('hidden');
        
        // Give voice instruction
        speak("Zavři oči");
        
        // Wait 2 seconds then continue
        setTimeout(() => {
            gameState.currentPlayer++;
            showNextPlayerRole();
        }, 2000);
    });
}

// Game phases
function startGame() {
    gameState.gamePhase = 'night';
    gameState.dayNumber = 1;
    showScreen('game-screen');
    initializeGameCircle();
    
    // Start with night phase
    setTimeout(() => {
        startNightPhase();
    }, 1000);
}

function initializeGameCircle() {
    const circle = document.getElementById('game-circle-main');
    circle.innerHTML = `
        <div class="center-info">
            <div id="center-text" class="center-text">🌙</div>
            <div id="phase-instruction" class="phase-instruction">
                Příprava na noc...
            </div>
        </div>
    `;
    
    // Add positioned player tags
    gameState.players.forEach((player, index) => {
        const tag = createGamePlayerTag(player, index);
        tag.classList.add('positioned');
        tag.style.left = `${player.position.x - 60}px`;
        tag.style.top = `${player.position.y - 20}px`;
        tag.style.transform = `rotate(${player.position.rotation}deg)`;
        
        if (!player.alive) {
            tag.classList.add('dead');
        }
        
        circle.appendChild(tag);
    });
}

function createGamePlayerTag(player, index) {
    const tag = document.createElement('div');
    tag.className = 'player-tag';
    tag.textContent = player.name;
    tag.dataset.playerIndex = index;
    return tag;
}

function hasRole(roleKey) {
    return gameState.players.some(p => p.role === roleKey && p.alive);
}

function startNightPhase() {
    updateGameHeader('Noc', `Den ${gameState.dayNumber}`);
    document.getElementById('center-text').textContent = '🌙';
    document.getElementById('phase-instruction').textContent = 'Celá vesnička usíná...';
    
    speak(VOICE_LINES.night);
    
    setTimeout(() => {
        if (hasRole('vestec')) {
            executeSeerPhase();
        } else if (hasRole('vlkodlak')) {
            executeWerewolfPhase();
        } else if (hasRole('carodejka')) {
            executeWitchPhase();
        } else {
            startDawnPhase();
        }
    }, 3000);
}

function executeSeerPhase() {
    updateGameHeader('Věštec', `Den ${gameState.dayNumber}`);
    document.getElementById('phase-instruction').textContent = 'Věštci, prozkoumej roli hráče';
    
    speak(VOICE_LINES.seer);
    
    // Highlight seer
    highlightPlayersWithRole('vestec', 'blink-seer');
    
    // Make all other players clickable
    enablePlayerSelection((player) => player.role !== 'vestec' && player.alive);
}

function executeWerewolfPhase() {
    updateGameHeader('Vlkodlaci', `Den ${gameState.dayNumber}`);
    document.getElementById('phase-instruction').textContent = 'Vlkodlaci, vyberte svou oběť';
    
    speak(VOICE_LINES.werewolves);
    
    // Highlight werewolves
    highlightPlayersWithRole('vlkodlak', 'blink-werewolf');
    
    // Make non-werewolf players clickable
    enablePlayerSelection((player) => player.role !== 'vlkodlak' && player.alive);
}

function executeWitchPhase() {
    updateGameHeader('Čarodějka', `Den ${gameState.dayNumber}`);
    document.getElementById('phase-instruction').textContent = 'Čarodějko, použij své lektvary';
    
    speak(VOICE_LINES.witch);
    
    // Highlight witch
    highlightPlayersWithRole('carodejka', 'blink-witch');
    
    // Show witch modal
    showWitchModal();
}

function startDawnPhase() {
    updateGameHeader('Úsvit', `Den ${gameState.dayNumber}`);
    document.getElementById('center-text').textContent = '🌅';
    document.getElementById('phase-instruction').textContent = 'Vesnička se probouzí...';
    
    clearPlayerHighlights();
    speak(VOICE_LINES.dawn);
    
    setTimeout(() => {
        startDiscussionPhase();
    }, 3000);
}

function startDiscussionPhase() {
    updateGameHeader('Diskuze', `Den ${gameState.dayNumber}`);
    document.getElementById('center-text').textContent = '💬';
    document.getElementById('phase-instruction').textContent = 'Diskutujte kdo je vlkodlak';
    
    speak(VOICE_LINES.discussion);
    
    // Start discussion timer if set
    if (gameState.discussionTime > 0) {
        startTimer(gameState.discussionTime * 60, () => {
            startVotingPhase();
        });
    } else {
        // No time limit, wait for manual progression
        setTimeout(() => {
            startVotingPhase();
        }, 30000); // Auto progress after 30 seconds
    }
}

function startVotingPhase() {
    updateGameHeader('Hlasování', `Den ${gameState.dayNumber}`);
    document.getElementById('center-text').textContent = '🗳️';
    document.getElementById('phase-instruction').textContent = 'Hlasujte koho vyřadit';
    
    speak(VOICE_LINES.voting);
    
    // Highlight all alive players for voting
    highlightAlivePlayers('blink-voting');
    
    // Make all alive players clickable
    enablePlayerSelection((player) => player.alive);
}

function enablePlayerSelection(filterFunc) {
    // Clear old listeners by cloning elements
    document.querySelectorAll('.player-tag').forEach(tag => {
        const newTag = tag.cloneNode(true);
        tag.parentNode.replaceChild(newTag, tag);
    });
    
    // Add new functional listeners
    document.querySelectorAll('.player-tag').forEach((tag) => {
        const playerIndex = parseInt(tag.dataset.playerIndex);
        const player = gameState.players[playerIndex];
        
        if (filterFunc(player)) {
            tag.classList.add('clickable');
            tag.addEventListener('click', () => selectPlayer(playerIndex));
        }
    });
}

function selectPlayer(playerIndex) {
    debounce(() => {
        const player = gameState.players[playerIndex];
        const tag = document.querySelector(`[data-player-index="${playerIndex}"]`);
        
        if (gameState.selectedPlayers.includes(playerIndex)) {
            // Deselect
            gameState.selectedPlayers = gameState.selectedPlayers.filter(i => i !== playerIndex);
            tag.classList.remove('selected');
        } else {
            // Select
            gameState.selectedPlayers.push(playerIndex);
            tag.classList.add('selected');
        }
        
        // Handle automatic phase progression
        handlePlayerSelection();
    });
}

function handlePlayerSelection() {
    const phase = gameState.gamePhase.toLowerCase();
    
    if (phase === 'věštec' && gameState.selectedPlayers.length === 1) {
        // Seer selected target
        const targetIndex = gameState.selectedPlayers[0];
        const target = gameState.players[targetIndex];
        const role = ROLES[target.role];
        
        // Silent display for seer - no voice
        showModal('Věštec - Výsledek', `${target.name} je ${role.name}`, () => {
            clearPlayerSelection();
            setTimeout(() => {
                if (hasRole('vlkodlak')) {
                    executeWerewolfPhase();
                } else if (hasRole('carodejka')) {
                    executeWitchPhase();
                } else {
                    startDawnPhase();
                }
            }, 1000);
        });
    } else if (phase === 'vlkodlaci' && gameState.selectedPlayers.length === 1) {
        // Werewolves selected victim
        const victimIndex = gameState.selectedPlayers[0];
        const victim = gameState.players[victimIndex];
        
        showModal('Vlkodlaci - Potvrzení', `Zabít ${victim.name}?`, () => {
            // Mark victim for witch phase
            gameState.werewolfVictim = victimIndex;
            victim.alive = false;
            updatePlayerTag(victimIndex);
            clearPlayerSelection();
            
            setTimeout(() => {
                if (hasRole('carodejka')) {
                    executeWitchPhase();
                } else {
                    startDawnPhase();
                }
            }, 1000);
        });
    } else if (phase === 'hlasování' && gameState.selectedPlayers.length === 1) {
        // Voting selected target
        const targetIndex = gameState.selectedPlayers[0];
        const target = gameState.players[targetIndex];
        
        showModal('Hlasování - Potvrzení', `Vyřadit ${target.name}?`, () => {
            target.alive = false;
            updatePlayerTag(targetIndex);
            
            speak(`${target.name} byl vyřazen. ${target.name} byl ${ROLES[target.role].name}`);
            
            // Check for game end
            if (checkGameEnd()) {
                return;
            }
            
            // Start new night
            gameState.dayNumber++;
            clearPlayerHighlights();
            clearPlayerSelection();
            gameState.werewolfVictim = null;
            setTimeout(() => {
                startNightPhase();
            }, 3000);
        });
    }
}

// UI Updates
function updateGameHeader(phase, day) {
    document.getElementById('game-phase').textContent = phase;
    document.getElementById('game-day').textContent = day;
    gameState.gamePhase = phase;
}

function updatePlayerTag(playerIndex) {
    const tag = document.querySelector(`[data-player-index="${playerIndex}"]`);
    const player = gameState.players[playerIndex];
    
    if (tag && !player.alive) {
        tag.classList.add('dead');
    }
}

function highlightPlayersWithRole(roleKey, animationClass) {
    const playerTags = document.querySelectorAll('.player-tag');
    playerTags.forEach((tag) => {
        const playerIndex = parseInt(tag.dataset.playerIndex);
        const player = gameState.players[playerIndex];
        if (player && player.role === roleKey && player.alive) {
            tag.classList.add(animationClass);
        }
    });
}

function highlightAlivePlayers(animationClass) {
    const playerTags = document.querySelectorAll('.player-tag');
    playerTags.forEach((tag) => {
        const playerIndex = parseInt(tag.dataset.playerIndex);
        const player = gameState.players[playerIndex];
        if (player && player.alive) {
            tag.classList.add(animationClass);
        }
    });
}

function clearPlayerHighlights() {
    const playerTags = document.querySelectorAll('.player-tag');
    playerTags.forEach(tag => {
        tag.classList.remove('blink-seer', 'blink-werewolf', 'blink-witch', 'blink-voting', 'clickable', 'highlighted-victim');
    });
}

function clearPlayerSelection() {
    gameState.selectedPlayers = [];
    const playerTags = document.querySelectorAll('.player-tag');
    playerTags.forEach(tag => {
        tag.classList.remove('selected');
    });
}

// Timer
function startTimer(seconds, callback) {
    let timeLeft = seconds;
    const timerElement = document.getElementById('game-timer');
    
    if (gameState.gameTimer) {
        clearInterval(gameState.gameTimer);
    }
    
    gameState.gameTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(gameState.gameTimer);
            timerElement.textContent = '';
            callback();
        }
        timeLeft--;
    }, 1000);
}

// Modal system
function showModal(title, message, onConfirm, onCancel) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('confirmation-modal').classList.add('active');
    
    document.getElementById('modal-confirm').onclick = () => {
        document.getElementById('confirmation-modal').classList.remove('active');
        if (onConfirm) onConfirm();
    };
    
    document.getElementById('modal-cancel').onclick = () => {
        document.getElementById('confirmation-modal').classList.remove('active');
        if (onCancel) onCancel();
    };
}

function showWitchModal() {
    document.getElementById('witch-modal').classList.add('active');
    
    // Update potion availability
    document.getElementById('witch-heal').disabled = !gameState.witchPotions.heal;
    document.getElementById('witch-revive').disabled = !gameState.witchPotions.revive;
    document.getElementById('witch-poison').disabled = !gameState.witchPotions.poison;
}

// Game end
function checkGameEnd() {
    const aliveWerewolves = gameState.players.filter(p => p.alive && p.role === 'vlkodlak').length;
    const aliveVillagers = gameState.players.filter(p => p.alive && p.role !== 'vlkodlak').length;
    
    if (aliveWerewolves === 0) {
        endGame('good');
        return true;
    } else if (aliveWerewolves >= aliveVillagers) {
        endGame('evil');
        return true;
    }
    
    return false;
}

function endGame(winningTeam) {
    showScreen('game-end');
    
    const teamName = winningTeam === 'good' ? 'Vesničané' : 'Vlkodlaci';
    document.getElementById('winner-team').textContent = `Vítězí: ${teamName}`;
    
    const winners = gameState.players.filter(p => {
        const role = ROLES[p.role];
        return role.team === winningTeam;
    });
    
    const winnersContainer = document.getElementById('winner-players');
    winnersContainer.innerHTML = '';
    
    winners.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'winner-player';
        playerDiv.textContent = `${player.name} (${ROLES[player.role].name})`;
        winnersContainer.appendChild(playerDiv);
    });
    
    speak(`Konec hry! Vítězí ${teamName}!`);
}

// Global functions for HTML onclick handlers
function startNewGame() {
    debounce(() => {
        // Reset game state
        gameState = {
            players: [],
            roles: {},
            currentScreen: 'welcome-screen',
            gamePhase: 'setup',
            currentPlayer: 0,
            dayNumber: 1,
            discussionTime: 5,
            gameTimer: null,
            phaseTimer: null,
            selectedPlayers: [],
            witchPotions: { heal: true, revive: true, poison: true },
            lovers: [],
            captain: null,
            debounceTimer: null,
            voiceEnabled: true,
            isRevealing: false,
            lastAction: 0,
            werewolfVictim: null,
            isDragging: false
        };
        
        // Clear timers
        if (gameState.gameTimer) clearInterval(gameState.gameTimer);
        if (gameState.phaseTimer) clearInterval(gameState.phaseTimer);
        
        // Reset UI
        document.getElementById('player-name').value = '';
        document.getElementById('players-container').innerHTML = '';
        document.getElementById('player-count').textContent = '0';
        document.getElementById('continue-to-roles').disabled = true;
        
        showScreen('player-setup');
    });
}

function addPlayerClick() {
    debounce(() => {
        const nameInput = document.getElementById('player-name');
        if (addPlayer(nameInput.value)) {
            nameInput.value = '';
            nameInput.focus();
        }
    });
}

function handlePlayerInputKeypress(event) {
    if (event.key === 'Enter') {
        addPlayerClick();
    }
}

function goToRoleSetup() {
    debounce(() => {
        generateRoleDistribution();
        showScreen('role-setup');
    });
}

function startPositioning() {
    debounce(() => {
        gameState.discussionTime = parseInt(document.getElementById('discussion-time').value);
        assignRoles();
        showScreen('positioning-screen');
        initializePositioning();
    });
}

function finishPositioning() {
    debounce(() => {
        startRoleReveal();
    });
}


// === MOUSE HANDLERS FOR DESKTOP ===
function handleMouseMove(e) {
    if (!dragData.element) return;

    const circleRect = document.getElementById('game-circle').getBoundingClientRect();

    // Výpočet pozice relativně k kruhu
    const relativeX = e.clientX - circleRect.left;
    const relativeY = e.clientY - circleRect.top;

    // Přichytnutí k okraji kruhu
    const snappedPosition = snapToCircleEdge(relativeX, relativeY);

    // Nastavení pozice (upraveno o polovinu šířky/výšky tagu)
    const tagX = snappedPosition.x - 60;
    const tagY = snappedPosition.y - 20;

    dragData.element.style.left = `${tagX}px`;
    dragData.element.style.top = `${tagY}px`;

    // Okamžité natočení ke středu během tažení
    const rotation = calculateRotationToCenter(snappedPosition.x, snappedPosition.y);
    dragData.element.style.transform = `rotate(${rotation}deg)`;
}

function handleMouseUp(e) {
    if (!dragData.element) return;

    dragData.element.classList.remove('dragging');
    updatePlayerPosition(dragData.element);
    gameState.isDragging = false;

    // Odstraníme mouse listenery
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    dragData.element = null;
}


// Event listeners for witch modal
document.addEventListener('DOMContentLoaded', function() {
    // Witch modal actions
    document.getElementById('witch-heal').addEventListener('click', () => {
        debounce(() => {
            gameState.witchPotions.heal = false;
            if (gameState.werewolfVictim !== null) {
                gameState.players[gameState.werewolfVictim].alive = true;
                updatePlayerTag(gameState.werewolfVictim);
            }
            document.getElementById('witch-modal').classList.remove('active');
            startDawnPhase();
        });
    });
    
    document.getElementById('witch-revive').addEventListener('click', () => {
        debounce(() => {
            gameState.witchPotions.revive = false;
            document.getElementById('witch-modal').classList.remove('active');
            startDawnPhase();
        });
    });
    
    document.getElementById('witch-poison').addEventListener('click', () => {
        debounce(() => {
            gameState.witchPotions.poison = false;
            document.getElementById('witch-modal').classList.remove('active');
            startDawnPhase();
        });
    });
    
    document.getElementById('witch-skip').addEventListener('click', () => {
        debounce(() => {
            document.getElementById('witch-modal').classList.remove('active');
            startDawnPhase();
        });
    });
    
    // Initialize voices
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => {
            speechSynthesis.getVoices();
        };
    }
});