// State
let adminMenuItems = [];
let orders = [];
let reservations = [];

// DOM Elements
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// Tabs logic
const tabs = ['orders', 'reservations', 'menu', 'settings'];
function showTab(tabName) {
    tabs.forEach(t => {
        document.getElementById(`${t}-sec`).classList.add('hidden');
        document.getElementById(`tab-${t}`).classList.remove('bg-gray-800');
    });
    document.getElementById(`${tabName}-sec`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).classList.add('bg-gray-800');
    
    if (tabName === 'orders') fetchOrders();
    if (tabName === 'reservations') fetchReservations();
    if (tabName === 'menu') fetchAdminMenu();
    if (tabName === 'settings') fetchSettings();
}

// Check session on load
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        showDashboard(session.user);
    } else {
        showLogin();
    }
});

// Auth listener
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        showDashboard(session.user);
    } else if (event === 'SIGNED_OUT') {
        showLogin();
    }
});

// Login Form Submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
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
    
    // Initial fetches
    fetchOrders();
    setupRealtime();
}

async function logout() {
    await supabaseClient.auth.signOut();
}

// --- Orders ---
async function fetchOrders() {
    const { data, error } = await supabase
        .from('ordrar')
        .select('*')
        .order('created_at', { ascending: false });
        
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
    
    tbody.innerHTML = orders.map(o => `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
            <td class="p-4">#${o.id}</td>
            <td class="p-4">
                <div class="font-medium">${o.kundnamn}</div>
                <div class="text-sm text-gray-500">${o.epost}</div>
            </td>
            <td class="p-4">${new Date(o.hamtningstid).toLocaleString('sv-SE')}</td>
            <td class="p-4 font-medium">${o.total_belopp} kr</td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs rounded-full ${o.betald ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${o.status || (o.betald ? 'Betald' : 'Väntar')}
                </span>
            </td>
        </tr>
    `).join('');
}

// --- Reservations ---
async function fetchReservations() {
    const { data, error } = await supabase
        .from('bokningar')
        .select('*')
        .order('datum', { ascending: true });
        
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

// --- Menu ---
async function fetchAdminMenu() {
    const { data, error } = await supabaseClient.from('meny').select('*').order('id');
    if (!error) {
        adminMenuItems = data;
        renderAdminMenu();
    }
}

function renderAdminMenu() {
    const container = document.getElementById('adminMenuContainer');
    container.innerHTML = adminMenuItems.map(item => `
        <div class="bg-white p-4 rounded-xl shadow border border-gray-100 relative ${!item.aktiv ? 'opacity-60' : ''}">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-lg">${item.namn}</h4>
                <span class="font-medium">${item.pris} kr</span>
            </div>
            <p class="text-sm text-gray-500 mb-4">${item.kategori}</p>
            <div class="flex gap-2">
                <button onclick="editMenu(${item.id})" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">Redigera</button>
                ${!item.aktiv ? '<span class="text-xs text-red-500 self-center ml-2">Inaktiv</span>' : ''}
            </div>
        </div>
    `).join('');
}

// --- Realtime Subscriptions ---
function setupRealtime() {
    supabaseClient.channel('admin-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordrar' }, payload => {
            console.log('Order update received!', payload);
            fetchOrders(); // Enkel lösning: Hämta alla på nytt för att säkerställa sortering, annars push() och render.
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bokningar' }, payload => {
            console.log('Reservation update received!', payload);
            fetchReservations();
        })
        .subscribe();
}

// --- Modal Logic ---
const modal = document.getElementById('menuModal');
const menuForm = document.getElementById('menuForm');

function openMenuModal() {
    menuForm.reset();
    document.getElementById('menuId').value = '';
    document.getElementById('menuModalTitle').textContent = 'Lägg till maträtt';
    modal.classList.remove('hidden');
}

function closeMenuModal() {
    modal.classList.add('hidden');
}

function editMenu(id) {
    const item = adminMenuItems.find(i => i.id === id);
    if (!item) return;
    
    document.getElementById('menuId').value = item.id;
    document.getElementById('menuName').value = item.namn;
    document.getElementById('menuDesc').value = item.beskrivning || '';
    document.getElementById('menuPrice').value = item.pris;
    document.getElementById('menuCategory').value = item.kategori;
    document.getElementById('menuActive').checked = item.aktiv;
    
    document.getElementById('menuModalTitle').textContent = 'Redigera maträtt';
    modal.classList.remove('hidden');
}

menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('menuId').value;
    const payload = {
        namn: document.getElementById('menuName').value,
        beskrivning: document.getElementById('menuDesc').value,
        pris: parseFloat(document.getElementById('menuPrice').value),
        kategori: document.getElementById('menuCategory').value,
        aktiv: document.getElementById('menuActive').checked
    };
    
    try {
        let error;
        if (id) {
            // Update
            const res = await supabaseClient.from('meny').update(payload).eq('id', id);
            error = res.error;
        } else {
            // Create
            const res = await supabaseClient.from('meny').insert([payload]);
            error = res.error;
        }
        
        if (!error) {
            closeMenuModal();
            fetchAdminMenu();
        } else {
            alert("Något gick fel vid sparning: " + error.message);
        }
    } catch (err) {
        console.error(err);
        alert("Något gick fel.");
    }
});

// --- Settings ---
async function fetchSettings() {
    const { data, error } = await supabaseClient
        .from('installningar')
        .select('varde')
        .eq('nyckel', 'paypal_client_id')
        .single();
        
    if (!error && data) {
        document.getElementById('paypalClientIdInput').value = data.varde || '';
    }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('settingsMessage');
    const val = document.getElementById('paypalClientIdInput').value.trim();
    
    // Upsert equivalent: Since 'nyckel' is PK, we can use upsert
    const { error } = await supabaseClient
        .from('installningar')
        .upsert([{ nyckel: 'paypal_client_id', varde: val }]);
        
    if (!error) {
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 3000);
    } else {
        alert("Kunde inte spara inställningar: " + error.message);
    }
});

