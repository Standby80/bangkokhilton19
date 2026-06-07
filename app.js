// State
let cart = [];
let menuItems = [];

// DOM Elements
const menuContainer = document.getElementById('menuContainer');
const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');
const proceedToCheckoutBtn = document.getElementById('proceedToCheckoutBtn');
const paypalButtonContainer = document.getElementById('paypal-button-container');
const orderSuccessMessage = document.getElementById('orderSuccessMessage');

// Init
async function init() {
    await fetchMenu();
    await loadPayPalSDK();
    setupEventListeners();
}

// Load PayPal SDK Dynamically
async function loadPayPalSDK() {
    try {
        const { data, error } = await supabaseClient
            .from('installningar')
            .select('*');
            
        let mode = 'sandbox';
        let sandboxId = 'test';
        let liveId = 'test';

        if (!error && data) {
            data.forEach(row => {
                if (row.nyckel === 'paypal_mode') mode = row.varde;
                if (row.nyckel === 'paypal_sandbox_client_id') sandboxId = row.varde || 'test';
                if (row.nyckel === 'paypal_live_client_id') liveId = row.varde || 'test';
            });
        }
        
        const clientId = mode === 'live' ? liveId : sandboxId;

        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=SEK`;
        document.head.appendChild(script);
        
        return new Promise((resolve) => {
            script.onload = resolve;
        });
    } catch (err) {
        console.error('Kunde inte ladda PayPal inställningar', err);
    }
}

// Fetch Menu from Supabase
async function fetchMenu() {
    try {
        const { data, error } = await supabaseClient
            .from('meny')
            .select('*')
            .eq('aktiv', true);
            
        if (error) throw error;
        
        menuItems = data;
        renderMenu();
    } catch (err) {
        console.error('Failed to fetch menu', err);
        menuContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Kunde inte ladda menyn: ${err.message || err.toString()}</div>`;
    }
}

// Render Menu
function renderMenu() {
    if (menuItems.length === 0) {
        menuContainer.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">Inga maträtter tillgängliga för tillfället.</div>';
        return;
    }

    menuContainer.innerHTML = menuItems.map(item => `
        <div class="menu-card bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-gray-900">${item.namn}</h3>
                    <span class="text-brand-600 font-bold">${item.pris} kr</span>
                </div>
                <p class="text-sm text-brand-500 mb-3">${item.kategori}</p>
                <p class="text-gray-600 text-sm mb-6">${item.beskrivning || ''}</p>
            </div>
            <button onclick="addToCart(${item.id})" class="w-full py-3 bg-gray-50 text-gray-900 rounded-xl font-medium border border-gray-200 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 transition-colors">
                Lägg i varukorg
            </button>
        </div>
    `).join('');
}

// Cart Logic
function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    const existing = cart.find(i => i.id === itemId);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    
    updateCartUI();
    openCart();
}

function removeFromCart(itemId) {
    cart = cart.filter(i => i.id !== itemId);
    updateCartUI();
}

function updateQuantity(itemId, delta) {
    const item = cart.find(i => i.id === itemId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) removeFromCart(itemId);
        else updateCartUI();
    }
}

function updateCartUI() {
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update total price
    const totalAmount = cart.reduce((sum, item) => sum + (item.pris * item.quantity), 0);
    cartTotalEl.textContent = totalAmount + ' kr';
    
    // Render items
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="text-center text-gray-500 mt-10">Din varukorg är tom.</div>';
        checkoutForm.classList.add('hidden');
        proceedToCheckoutBtn.classList.add('hidden');
        paypalButtonContainer.classList.add('hidden');
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${item.namn}</h4>
                    <div class="text-gray-500 text-sm">${item.pris} kr / st</div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="updateQuantity(${item.id}, -1)" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">-</button>
                    <span class="w-4 text-center">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">+</button>
                </div>
            </div>
        `).join('');
        
        if (paypalButtonContainer.classList.contains('hidden')) {
            checkoutForm.classList.remove('hidden');
            proceedToCheckoutBtn.classList.remove('hidden');
        }
    }
}

// Drawer Logic
function openCart() {
    cartDrawer.classList.remove('translate-x-full');
    cartBackdrop.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => cartBackdrop.classList.remove('opacity-0'), 10);
}

function closeCart() {
    cartDrawer.classList.add('translate-x-full');
    cartBackdrop.classList.add('opacity-0');
    setTimeout(() => cartBackdrop.classList.add('hidden'), 300);
}

// Event Listeners
function setupEventListeners() {
    cartBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    cartBackdrop.addEventListener('click', closeCart);
    
    // Reservation Form
    document.getElementById('reservationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgEl = document.getElementById('resMessage');
        msgEl.className = 'hidden';
        
        const payload = {
            namn: document.getElementById('resName').value,
            telefon: document.getElementById('resPhone').value,
            epost: document.getElementById('resEmail').value,
            antal: parseInt(document.getElementById('resSize').value),
            datum: document.getElementById('resDate').value
        };
        
        try {
            const { error } = await supabaseClient.from('bokningar').insert([payload]);
            if (error) throw error;
            
            msgEl.textContent = 'Bordningsförfrågan mottagen! Vi ser fram emot ditt besök.';
            msgEl.className = 'text-center mt-4 p-4 rounded-xl bg-green-50 text-green-700 border border-green-200 font-medium';
            e.target.reset();
        } catch (err) {
            console.error(err);
            msgEl.textContent = 'Ett fel uppstod. Vänligen ring oss för att boka.';
            msgEl.className = 'text-center mt-4 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 font-medium';
        }
    });

    // Checkout Proceed
    proceedToCheckoutBtn.addEventListener('click', () => {
        const name = document.getElementById('checkoutName').value;
        const email = document.getElementById('checkoutEmail').value;
        const time = document.getElementById('checkoutTime').value;
        
        if (!name || !email || !time) {
            alert('Vänligen fyll i namn, e-post och hämtningstid.');
            return;
        }

        const totalAmount = cart.reduce((sum, item) => sum + (item.pris * item.quantity), 0);

        // Show PayPal
        proceedToCheckoutBtn.classList.add('hidden');
        checkoutForm.classList.add('hidden');
        paypalButtonContainer.classList.remove('hidden');
        paypalButtonContainer.innerHTML = ''; // clear previous
        
        setupPayPal(name, email, time, totalAmount);
    });
}

// PayPal Integration with Supabase Insert
function setupPayPal(name, email, time, amount) {
    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: amount.toString()
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(async function(details) {
                // Save directly to Supabase after approval
                const orderPayload = {
                    kundnamn: name,
                    epost: email,
                    hamtningstid: time,
                    total_belopp: amount,
                    betald: true,
                    paypal_order_id: details.id,
                    status: 'Betald',
                    ratter: cart.map(i => ({ id: i.id, namn: i.namn, antal: i.quantity, pris: i.pris }))
                };

                const { error } = await supabaseClient.from('ordrar').insert([orderPayload]);
                
                if (error) {
                    console.error('Kunde inte spara order i Supabase:', error);
                    alert('Betalningen gick igenom men ordern kunde inte sparas. Vänligen kontakta oss.');
                } else {
                    cart = [];
                    updateCartUI();
                    paypalButtonContainer.classList.add('hidden');
                    orderSuccessMessage.classList.remove('hidden');
                }
            });
        }
    }).render('#paypal-button-container');
}

// Boot
init();
