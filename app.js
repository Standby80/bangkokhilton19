// State
let cart = [];
let activeMenus = [];
let allDishes = [];
let allOptionGroups = [];
let currentDishForOptions = null;

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

// Options Modal Elements
const optionsModal = document.getElementById('optionsModal');
const optionsModalContent = document.getElementById('optionsModalContent');
const optionsModalTitle = document.getElementById('optionsModalTitle');
const optionsModalDesc = document.getElementById('optionsModalDesc');
const optionsModalBody = document.getElementById('optionsModalBody');
const optionsModalPrice = document.getElementById('optionsModalPrice');
const optionsModalAddToCartBtn = document.getElementById('optionsModalAddToCartBtn');

// Init
async function init() {
    await fetchMenusData();
    await loadPayPalSDK();
    setupEventListeners();
}

// Load PayPal SDK Dynamically
async function loadPayPalSDK() {
    try {
        const { data, error } = await window.supabaseClient.from('installningar').select('*');
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
        return new Promise((resolve) => { script.onload = resolve; });
    } catch (err) { console.error('Kunde inte ladda PayPal inställningar', err); }
}

// Fetch Data
async function fetchMenusData() {
    try {
        // 1. Fetch active menus
        const resMenyer = await window.supabaseClient.from('menyer').select('*').eq('aktiv', true).order('id');
        if (resMenyer.error) throw resMenyer.error;
        activeMenus = resMenyer.data;

        // 2. Fetch active dishes with their option group links
        const resDishes = await window.supabaseClient.from('ratter').select('*, ratt_tillval(grupp_id)').eq('aktiv', true).order('kategori');
        if (resDishes.error) throw resDishes.error;
        allDishes = resDishes.data;

        // 3. Fetch all option groups and options
        const resOpts = await window.supabaseClient.from('tillvals_grupper').select('*, tillvals_alternativ(*)');
        if (resOpts.error) throw resOpts.error;
        allOptionGroups = resOpts.data;

        renderMenu();
    } catch (err) {
        console.error('Failed to fetch menu data', err);
        const menuContainer = document.getElementById('menuContainer');
        if(menuContainer) menuContainer.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Kunde inte ladda menyn: ${err.message || err.toString()}</div>`;
    }
}

// Render Menu
function renderMenu() {
    const menuContainer = document.getElementById('menuContainer');
    const categoryNavContainer = document.getElementById('categoryNavContainer');
    const categoryNav = document.getElementById('categoryNav');
    
    if (activeMenus.length === 0 || allDishes.length === 0) {
        if(menuContainer) menuContainer.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">Inga maträtter tillgängliga för tillfället.</div>';
        return;
    }

    let html = '';
    let navHtml = '';
    let hasCategories = false;
    
    activeMenus.forEach(menu => {
        const menuDishes = allDishes.filter(d => d.meny_id === menu.id);
        if(menuDishes.length === 0) return; // Skip empty menus
        
        html += `
            <div class="col-span-full mb-10 mt-8 text-center">
                <h2 class="text-3xl font-serif font-bold text-brand-500 uppercase tracking-widest">${menu.namn}</h2>
                ${menu.beskrivning ? `<p class="text-gray-400 mt-3 text-sm">${menu.beskrivning}</p>` : ''}
                <div class="flex justify-center mt-4">
                    <div class="w-16 h-px bg-brand-500/50"></div>
                </div>
            </div>
        `;
        
        // Group dishes by category within the menu
        const categories = [...new Set(menuDishes.map(d => d.kategori))];
        
        categories.forEach(cat => {
            const catDishes = menuDishes.filter(d => d.kategori === cat);
            const catId = `cat-${cat.replace(/[^a-zA-Z0-9]/g, '-')}`;
            hasCategories = true;
            
            navHtml += `<a href="#${catId}" class="px-6 py-2 bg-transparent border border-dark-border text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-brand-500 hover:border-brand-500 transition-colors whitespace-nowrap">${cat}</a>`;
            
            html += `
                <div id="${catId}" class="col-span-full mb-6 mt-4 border-b border-dark-border pb-4 pt-24 -mt-24">
                    <h3 class="text-xl font-serif font-bold text-gray-200 uppercase tracking-widest">${cat}</h3>
                </div>
            `;
            
            html += catDishes.map(item => `
                <div class="menu-card bg-dark-card p-4 sm:p-6 border border-dark-border flex flex-col justify-between group hover:border-brand-500/50 transition-colors relative">
                    <!-- Top-left corner decoration -->
                    <div class="absolute top-0 left-0 w-3 h-3 border-t border-l border-brand-500/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <!-- Bottom-right corner decoration -->
                    <div class="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-brand-500/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div>
                        <h4 class="text-base sm:text-lg font-serif font-bold text-brand-500 uppercase tracking-widest mb-2">${item.namn}</h4>
                        <p class="text-gray-400 text-xs sm:text-sm mb-4 leading-relaxed line-clamp-3 sm:line-clamp-none">${item.beskrivning || ''}</p>
                        <span class="text-white font-bold block mb-6">${item.baspris} kr</span>
                    </div>
                    <button onclick="handleAddToCartClick(${item.id})" class="w-full py-2 sm:py-3 bg-transparent text-gray-400 border border-dark-border hover:bg-brand-500 hover:text-dark-bg hover:border-brand-500 transition-colors text-xs font-bold uppercase tracking-widest">
                        Lägg i varukorg
                    </button>
                </div>
            `).join('');
        });
    });

    if(menuContainer) menuContainer.innerHTML = html;
    
    if (hasCategories && categoryNavContainer && categoryNav) {
        categoryNav.innerHTML = navHtml;
        categoryNavContainer.classList.remove('hidden');
        
        // Smooth scrolling for anchor links
        const navLinks = categoryNav.querySelectorAll('a[href^="#"]');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const yOffset = -80; // Offset for the sticky headers
                    const y = targetElement.getBoundingClientRect().top + window.scrollY + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            });
        });
    }
}

// --- Options Modal Logic ---
function handleAddToCartClick(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;
    
    // Check if dish has options
    if (dish.ratt_tillval && dish.ratt_tillval.length > 0) {
        openOptionsModal(dish);
    } else {
        // Direct add to cart
        addToCart(dish, []);
    }
}

function openOptionsModal(dish) {
    currentDishForOptions = dish;
    optionsModalTitle.textContent = dish.namn;
    optionsModalDesc.textContent = dish.beskrivning || '';
    
    let html = '';
    dish.ratt_tillval.forEach(rt => {
        const group = allOptionGroups.find(g => g.id === rt.grupp_id);
        if (!group) return;
        
        html += `
            <div class="option-group" data-group-id="${group.id}" data-required="${group.obligatorisk}">
                <h4 class="font-bold text-gray-300 mb-3 flex items-center justify-between uppercase tracking-widest text-xs">
                    <span>${group.namn}</span>
                    ${group.obligatorisk ? '<span class="text-[10px] border border-brand-500/50 text-brand-500 px-2 py-1 uppercase">Krävs</span>' : ''}
                </h4>
                <div class="space-y-2">
        `;
        
        group.tillvals_alternativ.forEach(opt => {
            const inputType = group.obligatorisk ? 'radio' : 'checkbox';
            const nameAttr = group.obligatorisk ? `name="group_${group.id}"` : '';
            const priceLabel = opt.extra_pris > 0 ? `+${opt.extra_pris} kr` : '';
            
            html += `
                <label class="flex items-center justify-between p-4 border border-dark-border bg-dark-card cursor-pointer hover:border-brand-500/50 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-500/10">
                    <div class="flex items-center gap-3">
                        <input type="${inputType}" ${nameAttr} value="${opt.id}" data-price="${opt.extra_pris}" data-name="${opt.namn}" class="w-4 h-4 text-brand-500 bg-dark-bg border-dark-border focus:ring-brand-500 option-input focus:ring-offset-dark-bg">
                        <span class="font-bold text-gray-300 text-sm uppercase tracking-wider">${opt.namn}</span>
                    </div>
                    <span class="text-sm font-bold text-brand-500">${priceLabel}</span>
                </label>
            `;
        });
        
        html += `</div></div>`;
    });
    
    optionsModalBody.innerHTML = html;
    
    // Add event listeners to inputs to update live price
    document.querySelectorAll('.option-input').forEach(input => {
        input.addEventListener('change', updateOptionsModalPrice);
    });
    
    updateOptionsModalPrice();
    
    // Show modal
    optionsModal.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => {
        optionsModal.classList.remove('opacity-0');
        optionsModalContent.classList.remove('translate-y-full', 'sm:translate-y-0');
        optionsModalContent.classList.add('translate-y-0');
    }, 10);
}

function closeOptionsModal() {
    optionsModal.classList.add('opacity-0');
    optionsModalContent.classList.remove('translate-y-0');
    optionsModalContent.classList.add('translate-y-full');
    setTimeout(() => optionsModal.classList.add('hidden'), 300);
}

function updateOptionsModalPrice() {
    if (!currentDishForOptions) return;
    let total = parseFloat(currentDishForOptions.baspris);
    
    document.querySelectorAll('.option-input:checked').forEach(input => {
        total += parseFloat(input.dataset.price || 0);
    });
    
    optionsModalPrice.textContent = total + ' kr';
}

optionsModalAddToCartBtn.addEventListener('click', () => {
    if (!currentDishForOptions) return;
    
    // Validate required groups
    const groups = document.querySelectorAll('.option-group');
    let valid = true;
    let selectedOptions = [];
    
    groups.forEach(g => {
        const isRequired = g.dataset.required === 'true';
        const checked = g.querySelectorAll('.option-input:checked');
        
        if (isRequired && checked.length === 0) {
            valid = false;
            g.classList.add('border-l-4', 'border-red-500', 'pl-3', '-ml-3');
            setTimeout(() => g.classList.remove('border-l-4', 'border-red-500', 'pl-3', '-ml-3'), 2000);
        }
        
        checked.forEach(c => {
            selectedOptions.push({
                id: parseInt(c.value),
                namn: c.dataset.name,
                pris: parseFloat(c.dataset.price)
            });
        });
    });
    
    if (!valid) {
        alert("Vänligen gör alla obligatoriska val.");
        return;
    }
    
    addToCart(currentDishForOptions, selectedOptions);
    closeOptionsModal();
});

// --- Cart Logic ---
function addToCart(dish, selectedOptions) {
    // Generate a unique ID based on options so identical configurations stack, but different ones don't
    const optionsKey = selectedOptions.map(o => o.id).sort().join('_');
    const cartItemId = `${dish.id}_${optionsKey}`;
    
    const extraPrice = selectedOptions.reduce((sum, o) => sum + o.pris, 0);
    const unitPrice = parseFloat(dish.baspris) + extraPrice;
    const optionsText = selectedOptions.map(o => o.namn).join(', ');
    
    const existing = cart.find(i => i.cartItemId === cartItemId);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            cartItemId,
            dishId: dish.id,
            namn: dish.namn,
            tillval: optionsText,
            enhetspris: unitPrice,
            quantity: 1
        });
    }
    
    updateCartUI();
    openCart();
}

function removeFromCart(cartItemId) {
    cart = cart.filter(i => i.cartItemId !== cartItemId);
    updateCartUI();
}

function updateQuantity(cartItemId, delta) {
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) removeFromCart(cartItemId);
        else updateCartUI();
    }
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    const totalAmount = cart.reduce((sum, item) => sum + (item.enhetspris * item.quantity), 0);
    cartTotalEl.textContent = totalAmount + ' kr';
    
    // Beräkna moms (6% inbakat i priset)
    const vatAmount = Math.round(totalAmount - (totalAmount / 1.06));
    const cartVatEl = document.getElementById('cartVat');
    if(cartVatEl) cartVatEl.textContent = vatAmount + ' kr';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="text-center text-gray-500 mt-10 uppercase tracking-widest text-sm">Din varukorg är tom.</div>';
        checkoutForm.classList.add('hidden');
        proceedToCheckoutBtn.classList.add('hidden');
        paypalButtonContainer.classList.add('hidden');
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="flex justify-between items-center mb-4 pb-4 border-b border-dark-border">
                <div class="flex-1 pr-4">
                    <h4 class="font-bold text-gray-200 uppercase tracking-wider text-sm leading-tight">${item.namn}</h4>
                    ${item.tillval ? `<div class="text-xs text-gray-500 mt-1 uppercase tracking-wider">${item.tillval}</div>` : ''}
                    <div class="text-brand-500 font-bold text-sm mt-1">${item.enhetspris} kr / st</div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="updateQuantity('${item.cartItemId}', -1)" class="w-8 h-8 border border-dark-border text-gray-400 flex items-center justify-center hover:text-brand-500 hover:border-brand-500 transition-colors font-bold">-</button>
                    <span class="w-4 text-center font-bold text-white">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.cartItemId}', 1)" class="w-8 h-8 border border-dark-border text-gray-400 flex items-center justify-center hover:text-brand-500 hover:border-brand-500 transition-colors font-bold">+</button>
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
    
    // Options Modal backdrop click to close
    optionsModal.addEventListener('click', (e) => {
        if (e.target === optionsModal) closeOptionsModal();
    });
    
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
            const { error } = await window.supabaseClient.from('bokningar').insert([payload]);
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

        const totalAmount = cart.reduce((sum, item) => sum + (item.enhetspris * item.quantity), 0);

        proceedToCheckoutBtn.classList.add('hidden');
        checkoutForm.classList.add('hidden');
        paypalButtonContainer.classList.remove('hidden');
        paypalButtonContainer.innerHTML = ''; 
        
        setupPayPal(name, email, time, totalAmount);
    });
}

// PayPal Integration with Supabase Insert
function setupPayPal(name, email, time, amount) {
    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{ amount: { value: amount.toString() } }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(async function(details) {
                const orderPayload = {
                    kundnamn: name,
                    epost: email,
                    hamtningstid: time,
                    total_belopp: amount,
                    betald: true,
                    paypal_order_id: details.id,
                    status: 'Betald',
                    ratter: cart.map(i => ({ 
                        id: i.dishId, 
                        namn: i.namn, 
                        antal: i.quantity, 
                        pris: i.enhetspris,
                        tillval: i.tillval
                    }))
                };

                const { error } = await window.supabaseClient.from('ordrar').insert([orderPayload]);
                
                if (error) {
                    console.error('Kunde inte spara order i Supabase:', error);
                    alert('Betalningen gick igenom men ordern kunde inte sparas. Vänligen kontakta oss.');
                } else {
                    window.latestOrder = orderPayload; // Save for receipt
                    cart = [];
                    updateCartUI();
                    paypalButtonContainer.classList.add('hidden');
                    orderSuccessMessage.classList.remove('hidden');
                }
            });
        }
    }).render('#paypal-button-container');
}

// Show Receipt
async function showReceipt() {
    if (!window.latestOrder) return;
    
    // Fetch company settings
    const { data: settingsData } = await window.supabaseClient.from('installningar').select('*');
    const settings = {};
    if (settingsData) {
        settingsData.forEach(row => settings[row.nyckel] = row.varde);
    }
    
    const receiptModal = document.getElementById('receiptModal');
    const receiptContent = document.getElementById('receiptContent');
    
    const d = new Date();
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    
    // Calculate VAT (6% included)
    const vatAmount = Math.round(window.latestOrder.total_belopp - (window.latestOrder.total_belopp / 1.06));
    
    let html = `
        <div class="text-center mb-6">
            <h2 class="text-2xl font-bold uppercase tracking-widest">${settings.company_name || 'Företagsnamn saknas'}</h2>
            <p class="text-xs text-gray-500 mt-1">${settings.company_address || ''}</p>
            <p class="text-xs text-gray-500">${settings.company_zip || ''} ${settings.company_city || ''}</p>
            <p class="text-xs text-gray-500">Tel: ${settings.company_phone || ''}</p>
            <p class="text-xs text-gray-500 mt-2">Org.nr: ${settings.company_orgnr || ''}</p>
            <p class="text-xs text-gray-500">Momsreg.nr: ${settings.company_vat || ''}</p>
            <p class="text-xs text-gray-500">Godkänd för F-skatt: ${settings.company_fskatt || ''}</p>
        </div>
        <div class="border-t border-b border-dashed border-gray-300 py-4 mb-4">
            <p class="text-xs flex justify-between"><span>Kvitto / Order</span> <span>${window.latestOrder.paypal_order_id}</span></p>
            <p class="text-xs flex justify-between"><span>Datum</span> <span>${dateStr}</span></p>
            <p class="text-xs flex justify-between"><span>Kund</span> <span>${window.latestOrder.kundnamn}</span></p>
            <p class="text-xs flex justify-between font-bold mt-2"><span>Avhämtning</span> <span>${new Date(window.latestOrder.hamtningstid).toLocaleString()}</span></p>
        </div>
        <div class="space-y-3 mb-4">
    `;
    
    window.latestOrder.ratter.forEach(item => {
        html += `
            <div class="text-sm">
                <div class="flex justify-between font-medium">
                    <span>${item.antal}x ${item.namn}</span>
                    <span>${item.pris * item.antal} kr</span>
                </div>
                ${item.tillval ? `<div class="text-xs text-gray-500 pl-4">${item.tillval}</div>` : ''}
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="border-t border-dashed border-gray-300 pt-4 mb-4">
            <div class="flex justify-between font-bold text-lg mb-2">
                <span>TOTALT</span>
                <span>${window.latestOrder.total_belopp} kr</span>
            </div>
            <div class="flex justify-between text-xs text-gray-500">
                <span>Varav moms (6%)</span>
                <span>${vatAmount} kr</span>
            </div>
        </div>
        <div class="text-center text-xs text-gray-500 mt-8">
            Tack för ditt köp! Välkommen åter.
        </div>
    `;
    
    receiptContent.innerHTML = html;
    receiptModal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', initApp);

// Boot
init();
