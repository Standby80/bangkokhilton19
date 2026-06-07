// State
let adminMenus = [];
let adminOptionGroups = [];
let adminDishes = [];
let orders = [];
let reservations = [];

// DOM Elements
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// Tabs logic
const tabs = ['orders', 'reservations', 'menus', 'options', 'dishes', 'settings'];
function showTab(tabName) {
    tabs.forEach(t => {
        const sec = document.getElementById(`${t}-sec`);
        const tab = document.getElementById(`tab-${t}`);
        if(sec) sec.classList.add('hidden');
        if(tab) tab.classList.remove('bg-gray-800');
    });
    const activeSec = document.getElementById(`${tabName}-sec`);
    const activeTab = document.getElementById(`tab-${tabName}`);
    if(activeSec) activeSec.classList.remove('hidden');
    if(activeTab) activeTab.classList.add('bg-gray-800');
    
    if (tabName === 'orders') fetchOrders();
    if (tabName === 'reservations') fetchReservations();
    if (tabName === 'menus') fetchMenus();
    if (tabName === 'options') fetchOptions();
    if (tabName === 'dishes') fetchDishes();
    if (tabName === 'settings') fetchSettings();
}

// Check session on load
window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) showDashboard(session.user);
    else showLogin();
});

window.supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') showDashboard(session.user);
    else if (event === 'SIGNED_OUT') showLogin();
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        loginError.textContent = "Inloggning misslyckades: " + error.message;
        loginError.classList.remove('hidden');
    }
});

function showLogin() {
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    loginForm.reset();
}

function showDashboard(user) {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    userEmailDisplay.textContent = user.email;
    fetchOrders();
    setupRealtime();
    // Pre-fetch data for dropdowns
    fetchMenus();
    fetchOptions();
}

async function logout() {
    await window.supabaseClient.auth.signOut();
}

// --- Orders ---
async function fetchOrders() {
    const { data, error } = await window.supabaseClient.from('ordrar').select('*').order('created_at', { ascending: false });
    if (!error) {
        orders = data;
        renderOrders();
    }
}

function renderOrders() {
    const tbody = document.getElementById('ordersTbody');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Inga ordrar ännu.</td></tr>';
        return;
    }
    tbody.innerHTML = orders.map(o => {
        const items = o.ratter ? o.ratter.map(r => `<div>${r.antal}x ${r.namn} ${r.tillval ? '<span class="text-xs text-gray-500">(' + r.tillval + ')</span>' : ''}</div>`).join('') : '';
        return `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="p-4">#${o.id}</td>
            <td class="p-4">
                <div class="font-medium">${o.kundnamn}</div>
                <div class="text-sm text-gray-500">${o.epost}</div>
                <div class="mt-2 text-sm">${items}</div>
            </td>
            <td class="p-4">${new Date(o.hamtningstid).toLocaleString('sv-SE')}</td>
            <td class="p-4 font-medium">${o.total_belopp} kr</td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs rounded-full ${o.betald ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${o.status || (o.betald ? 'Betald' : 'Väntar')}
                </span>
            </td>
        </tr>
    `}).join('');
}

// --- Reservations ---
async function fetchReservations() {
    const { data, error } = await window.supabaseClient.from('bokningar').select('*').order('datum', { ascending: true });
    if (!error) {
        reservations = data;
        renderReservations();
    }
}

function renderReservations() {
    const tbody = document.getElementById('reservationsTbody');
    if (reservations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Inga bokningar.</td></tr>';
        return;
    }
    tbody.innerHTML = reservations.map(r => `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="p-4 font-medium">${new Date(r.datum).toLocaleString('sv-SE')}</td>
            <td class="p-4">${r.namn}</td>
            <td class="p-4 text-sm text-gray-500">${r.telefon}<br>${r.epost}</td>
            <td class="p-4">${r.antal} pers</td>
            <td class="p-4">${r.status || 'Bekräftad'}</td>
        </tr>
    `).join('');
}

// --- Menus ---
async function fetchMenus() {
    const { data, error } = await window.supabaseClient.from('menyer').select('*').order('id');
    if (!error) {
        adminMenus = data;
        renderMenus();
    }
}

function renderMenus() {
    const tbody = document.getElementById('adminMenusTbody');
    if(!tbody) return;
    tbody.innerHTML = adminMenus.map(m => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 ${!m.aktiv ? 'opacity-60' : ''}">
            <td class="p-4 font-bold">${m.namn}</td>
            <td class="p-4 text-sm text-gray-500">${m.beskrivning || ''}</td>
            <td class="p-4">${m.aktiv ? 'Aktiv' : 'Inaktiv'}</td>
            <td class="p-4 text-right">
                <button onclick="editMenu(${m.id})" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium mr-2">Redigera</button>
                <button onclick="deleteMenu(${m.id})" class="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium">Radera</button>
            </td>
        </tr>
    `).join('');
}

function openMenuCategoryModal() {
    document.getElementById('menuCategoryForm').reset();
    document.getElementById('menuCategoryId').value = '';
    document.getElementById('menuCategoryModalTitle').textContent = 'Skapa Meny';
    document.getElementById('menuCategoryModal').classList.remove('hidden');
}
function closeMenuCategoryModal() { document.getElementById('menuCategoryModal').classList.add('hidden'); }
function editMenu(id) {
    const m = adminMenus.find(x => x.id === id);
    if(!m) return;
    document.getElementById('menuCategoryId').value = m.id;
    document.getElementById('menuCategoryName').value = m.namn;
    document.getElementById('menuCategoryDesc').value = m.beskrivning || '';
    document.getElementById('menuCategoryActive').checked = m.aktiv;
    document.getElementById('menuCategoryModalTitle').textContent = 'Redigera Meny';
    document.getElementById('menuCategoryModal').classList.remove('hidden');
}

document.getElementById('menuCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('menuCategoryId').value;
    const payload = {
        namn: document.getElementById('menuCategoryName').value,
        beskrivning: document.getElementById('menuCategoryDesc').value,
        aktiv: document.getElementById('menuCategoryActive').checked
    };
    let error;
    if (id) {
        const res = await window.supabaseClient.from('menyer').update(payload).eq('id', id);
        error = res.error;
    } else {
        const res = await window.supabaseClient.from('menyer').insert([payload]);
        error = res.error;
    }
    if (!error) {
        closeMenuCategoryModal();
        fetchMenus();
    } else alert("Fel: " + error.message);
});

async function deleteMenu(id) {
    if (!confirm('Är du säker på att du vill radera denna meny? Alla rätter kopplade till menyn kommer också att raderas.')) return;
    const { error } = await window.supabaseClient.from('menyer').delete().eq('id', id);
    if (!error) fetchMenus();
    else alert("Kunde inte radera: " + error.message);
}

// --- Options (Tillvalsgrupper) ---
async function fetchOptions() {
    const { data, error } = await window.supabaseClient.from('tillvals_grupper').select('*, tillvals_alternativ(*)').order('id');
    if (!error) {
        adminOptionGroups = data;
        renderOptions();
    }
}

function renderOptions() {
    const container = document.getElementById('adminOptionsContainer');
    if(!container) return;
    container.innerHTML = adminOptionGroups.map(g => {
        const opts = g.tillvals_alternativ.map(a => `<span class="inline-block bg-gray-100 rounded px-2 py-1 text-xs mr-2 mb-2">${a.namn} (+${a.extra_pris} kr)</span>`).join('');
        return `
        <div class="bg-white p-5 rounded-xl shadow border border-gray-100">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-bold text-lg flex items-center gap-2">
                        ${g.namn}
                        ${g.obligatorisk ? '<span class="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-bold">Obligatorisk</span>' : '<span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-bold">Valfri</span>'}
                    </h4>
                </div>
                <div>
                    <button onclick="editOptionGroup(${g.id})" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium mr-2">Redigera</button>
                    <button onclick="deleteOptionGroup(${g.id})" class="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium">Radera</button>
                </div>
            </div>
            <div>${opts}</div>
        </div>
    `}).join('');
}

function openOptionGroupModal() {
    document.getElementById('optionGroupForm').reset();
    document.getElementById('optionGroupId').value = '';
    document.getElementById('optionGroupModalTitle').textContent = 'Skapa Tillvalsgrupp';
    document.getElementById('optionGroupOptionsContainer').innerHTML = '';
    addOptionRow();
    document.getElementById('optionGroupModal').classList.remove('hidden');
}
function closeOptionGroupModal() { document.getElementById('optionGroupModal').classList.add('hidden'); }

function addOptionRow(name = '', price = 0) {
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center option-row';
    div.innerHTML = `
        <input type="text" placeholder="Alternativ (t.ex. Biff)" value="${name}" required class="flex-1 px-3 py-2 border rounded-lg text-sm">
        <input type="number" placeholder="+Pris" value="${price}" required min="0" step="1" class="w-24 px-3 py-2 border rounded-lg text-sm">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700 px-2">&times;</button>
    `;
    document.getElementById('optionGroupOptionsContainer').appendChild(div);
}

function editOptionGroup(id) {
    const g = adminOptionGroups.find(x => x.id === id);
    if(!g) return;
    document.getElementById('optionGroupId').value = g.id;
    document.getElementById('optionGroupName').value = g.namn;
    document.getElementById('optionGroupRequired').checked = g.obligatorisk;
    
    const container = document.getElementById('optionGroupOptionsContainer');
    container.innerHTML = '';
    g.tillvals_alternativ.forEach(a => addOptionRow(a.namn, a.extra_pris));
    
    document.getElementById('optionGroupModalTitle').textContent = 'Redigera Tillvalsgrupp';
    document.getElementById('optionGroupModal').classList.remove('hidden');
}

document.getElementById('optionGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('optionGroupId').value;
    const name = document.getElementById('optionGroupName').value;
    const req = document.getElementById('optionGroupRequired').checked;
    
    const rows = Array.from(document.querySelectorAll('.option-row')).map(row => {
        const inputs = row.querySelectorAll('input');
        return { namn: inputs[0].value, extra_pris: parseFloat(inputs[1].value) };
    });
    if(rows.length === 0) { alert('Lägg till minst ett alternativ!'); return; }

    try {
        let groupId = id;
        if (id) {
            await window.supabaseClient.from('tillvals_grupper').update({ namn: name, obligatorisk: req }).eq('id', id);
            // Delete old options (since we'll insert new ones)
            await window.supabaseClient.from('tillvals_alternativ').delete().eq('grupp_id', id);
        } else {
            const { data } = await window.supabaseClient.from('tillvals_grupper').insert([{ namn: name, obligatorisk: req }]).select();
            groupId = data[0].id;
        }
        
        // Insert new options
        const optsPayload = rows.map(r => ({ ...r, grupp_id: groupId }));
        const { error } = await window.supabaseClient.from('tillvals_alternativ').insert(optsPayload);
        
        if (!error) {
            closeOptionGroupModal();
            fetchOptions();
        } else alert("Fel: " + error.message);
    } catch (err) { console.error(err); }
});

async function deleteOptionGroup(id) {
    if (!confirm('Är du säker på att du vill radera denna tillvalsgrupp?')) return;
    const { error } = await window.supabaseClient.from('tillvals_grupper').delete().eq('id', id);
    if (!error) fetchOptions();
    else alert("Kunde inte radera: " + error.message);
}

// --- Dishes ---
async function fetchDishes() {
    const { data, error } = await window.supabaseClient.from('ratter').select('*, menyer(namn), ratt_tillval(grupp_id)').order('meny_id');
    if (!error) {
        adminDishes = data;
        renderDishes();
    }
}

function renderDishes() {
    const container = document.getElementById('adminDishesContainer');
    if(!container) return;
    container.innerHTML = adminDishes.map(d => {
        const groups = d.ratt_tillval.map(rt => {
            const g = adminOptionGroups.find(og => og.id === rt.grupp_id);
            return g ? `<span class="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-xs mr-1 mb-1">${g.namn}</span>` : '';
        }).join('');
        return `
        <div class="bg-white p-4 rounded-xl shadow border border-gray-100 relative ${!d.aktiv ? 'opacity-60' : ''}">
            <div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">${d.menyer?.namn} &bull; ${d.kategori}</div>
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-lg">${d.namn}</h4>
                <span class="font-medium">${d.baspris} kr</span>
            </div>
            <p class="text-sm text-gray-500 mb-3">${d.beskrivning || ''}</p>
            <div class="mb-4">${groups}</div>
            <div class="flex gap-2">
                <button onclick="editDish(${d.id})" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Redigera</button>
                <button onclick="deleteDish(${d.id})" class="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium">Radera</button>
            </div>
        </div>
    `}).join('');
}

function openDishModal() {
    document.getElementById('dishForm').reset();
    document.getElementById('dishId').value = '';
    document.getElementById('dishImageUrl').value = '';
    
    // Populate Menu dropdown
    const menuSelect = document.getElementById('dishMenuId');
    menuSelect.innerHTML = adminMenus.map(m => `<option value="${m.id}">${m.namn}</option>`).join('');
    
    // Populate Option Groups checkboxes
    const optsContainer = document.getElementById('dishOptionGroupsContainer');
    optsContainer.innerHTML = adminOptionGroups.map(g => `
        <label class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <input type="checkbox" value="${g.id}" class="dish-option-checkbox rounded text-blue-600">
            <span class="text-sm">${g.namn} ${g.obligatorisk ? '(Oblig.)' : ''}</span>
        </label>
    `).join('');
    
    document.getElementById('dishModalTitle').textContent = 'Skapa Maträtt';
    document.getElementById('dishModal').classList.remove('hidden');
}
function closeDishModal() { document.getElementById('dishModal').classList.add('hidden'); }

function editDish(id) {
    openDishModal();
    const d = adminDishes.find(x => x.id === id);
    if(!d) return;
    
    document.getElementById('dishId').value = d.id;
    document.getElementById('dishName').value = d.namn;
    document.getElementById('dishPrice').value = d.baspris;
    document.getElementById('dishMenuId').value = d.meny_id;
    document.getElementById('dishCategory').value = d.kategori;
    document.getElementById('dishDesc').value = d.beskrivning || '';
    document.getElementById('dishImageUrl').value = d.bild_url || '';
    document.getElementById('dishActive').checked = d.aktiv;
    
    // Check boxes
    const checks = document.querySelectorAll('.dish-option-checkbox');
    checks.forEach(c => {
        if(d.ratt_tillval.find(rt => rt.grupp_id == c.value)) c.checked = true;
    });
    
    document.getElementById('dishModalTitle').textContent = 'Redigera Maträtt';
}

document.getElementById('dishForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('dishId').value;
    const payload = {
        namn: document.getElementById('dishName').value,
        baspris: parseFloat(document.getElementById('dishPrice').value),
        meny_id: parseInt(document.getElementById('dishMenuId').value),
        kategori: document.getElementById('dishCategory').value,
        beskrivning: document.getElementById('dishDesc').value,
        bild_url: document.getElementById('dishImageUrl').value.trim() || null,
        aktiv: document.getElementById('dishActive').checked
    };
    
    const selectedGroups = Array.from(document.querySelectorAll('.dish-option-checkbox:checked')).map(c => parseInt(c.value));
    
    try {
        let dishId = id;
        if (id) {
            await window.supabaseClient.from('ratter').update(payload).eq('id', id);
            await window.supabaseClient.from('ratt_tillval').delete().eq('ratt_id', id);
        } else {
            const { data } = await window.supabaseClient.from('ratter').insert([payload]).select();
            dishId = data[0].id;
        }
        
        if (selectedGroups.length > 0) {
            const rtPayload = selectedGroups.map(gid => ({ ratt_id: dishId, grupp_id: gid }));
            await window.supabaseClient.from('ratt_tillval').insert(rtPayload);
        }
        
        closeDishModal();
        fetchDishes();
    } catch(err) { console.error(err); alert("Fel vid sparning."); }
});

async function deleteDish(id) {
    if (!confirm('Är du säker på att du vill radera denna maträtt?')) return;
    const { error } = await window.supabaseClient.from('ratter').delete().eq('id', id);
    if (!error) fetchDishes();
    else alert("Kunde inte radera: " + error.message);
}

// --- Realtime Subscriptions ---
function setupRealtime() {
    window.supabaseClient.channel('admin-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordrar' }, payload => {
            fetchOrders();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bokningar' }, payload => {
            fetchReservations();
        })
        .subscribe();
}

// --- Settings ---
async function fetchSettings() {
    const { data, error } = await window.supabaseClient.from('installningar').select('*');
    if (!error && data) {
        data.forEach(row => {
            if (row.nyckel === 'paypal_mode') document.getElementById('paypalModeInput').value = row.varde;
            if (row.nyckel === 'paypal_sandbox_client_id') document.getElementById('paypalSandboxIdInput').value = row.varde;
            if (row.nyckel === 'paypal_live_client_id') document.getElementById('paypalLiveIdInput').value = row.varde;
            
            // Company settings
            if (row.nyckel === 'company_name') document.getElementById('companyNameInput').value = row.varde;
            if (row.nyckel === 'company_orgnr') document.getElementById('companyOrgnrInput').value = row.varde;
            if (row.nyckel === 'company_vat') document.getElementById('companyVatInput').value = row.varde;
            if (row.nyckel === 'company_address') document.getElementById('companyAddressInput').value = row.varde;
            if (row.nyckel === 'company_zip') document.getElementById('companyZipInput').value = row.varde;
            if (row.nyckel === 'company_city') document.getElementById('companyCityInput').value = row.varde;
            if (row.nyckel === 'company_phone') document.getElementById('companyPhoneInput').value = row.varde;
            if (row.nyckel === 'company_fskatt') document.getElementById('companyFskattInput').value = row.varde;
        });
    }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('settingsMessage');
    const updates = [
        { nyckel: 'paypal_mode', varde: document.getElementById('paypalModeInput').value },
        { nyckel: 'paypal_sandbox_client_id', varde: document.getElementById('paypalSandboxIdInput').value.trim() },
        { nyckel: 'paypal_live_client_id', varde: document.getElementById('paypalLiveIdInput').value.trim() }
    ];
    const { error } = await window.supabaseClient.from('installningar').upsert(updates);
    if (!error) {
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 3000);
    } else alert("Kunde inte spara inställningar: " + error.message);
});

document.getElementById('companySettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('companySettingsMessage');
    const updates = [
        { nyckel: 'company_name', varde: document.getElementById('companyNameInput').value.trim() },
        { nyckel: 'company_orgnr', varde: document.getElementById('companyOrgnrInput').value.trim() },
        { nyckel: 'company_vat', varde: document.getElementById('companyVatInput').value.trim() },
        { nyckel: 'company_address', varde: document.getElementById('companyAddressInput').value.trim() },
        { nyckel: 'company_zip', varde: document.getElementById('companyZipInput').value.trim() },
        { nyckel: 'company_city', varde: document.getElementById('companyCityInput').value.trim() },
        { nyckel: 'company_phone', varde: document.getElementById('companyPhoneInput').value.trim() },
        { nyckel: 'company_fskatt', varde: document.getElementById('companyFskattInput').value }
    ];
    const { error } = await window.supabaseClient.from('installningar').upsert(updates);
    if (!error) {
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 3000);
    } else alert("Kunde inte spara företagsuppgifter: " + error.message);
});
