lucide.createIcons();

        let products = [];

async function loadProducts() {
    try {
        const res = await fetch('api/products');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        products = await res.json();
    } catch (e) {
        console.error('LUMIERE :', e);
        showToast('Serveur injoignable : lance le backend (python app.py)');
    }
}

        let currentSlideIndex = 0;
        const slides = document.querySelectorAll('.carousel-slide');
        const dots = document.querySelectorAll('.carousel-dot');
        let slideInterval;

        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.style.opacity = i === index ? '1' : '0';
            });
            dots.forEach((dot, i) => {
                dot.setAttribute('data-active', i === index ? 'true' : 'false');
            });
            currentSlideIndex = index;
        }

        function nextSlide() {
            let nextIndex = (currentSlideIndex + 1) % slides.length;
            showSlide(nextIndex);
        }

        function nextSlideBtn() {
            nextSlide();
            resetInterval();
        }

        function prevSlide() {
            let prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
            showSlide(prevIndex);
            resetInterval();
        }

        function currentSlide(index) {
            showSlide(index);
            resetInterval();
        }

        function resetInterval() {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, 5000);
        }

        const GENDER_MAP = { Homme: 'Masculine', Femme: 'Feminine', Unisexe: 'Omni' };
        let activeGender = 'Tous';
        let activeSizes = [];
        let activeColors = [];
        let cart = [];

        window.addEventListener('DOMContentLoaded', () => {
            loadProducts().then(() => renderProducts(products));
            slideInterval = setInterval(nextSlide, 5000);
        });

        function setGenderFilter(gender, btnElement) {
            activeGender = gender;

            document.querySelectorAll('.gender-btn').forEach(b => {
                b.classList.remove('bg-fuchsia-600/30', 'border-fuchsia-500', 'text-white');
                b.classList.add('bg-slate-900/50', 'border-white/10', 'text-slate-300');
                if (b.getAttribute('data-gender') === gender) {
                    b.classList.add('bg-fuchsia-600/30', 'border-fuchsia-500', 'text-white');
                    b.classList.remove('bg-slate-900/50', 'border-white/10', 'text-slate-300');
                }
            });

            filterProducts();
        }

        function toggleSizeFilter(size, btn) {
            btn.classList.toggle('bg-fuchsia-600/30');
            btn.classList.toggle('border-fuchsia-500');
            btn.classList.toggle('text-white');

            if (activeSizes.includes(size)) {
                activeSizes = activeSizes.filter(s => s !== size);
            } else {
                activeSizes.push(size);
            }
            filterProducts();
        }

        function toggleColorFilter(color, btn) {
            btn.classList.toggle('border-fuchsia-500');
            btn.classList.toggle('bg-fuchsia-950/40');

            if (activeColors.includes(color)) {
                activeColors = activeColors.filter(c => c !== color);
            } else {
                activeColors.push(color);
            }
            filterProducts();
        }

        function resetFilters() {
            activeGender = 'Tous';
            activeSizes = [];
            activeColors = [];
            document.getElementById('priceRange').value = 1000;
            document.getElementById('priceValue').textContent = '1000 €';
            document.getElementById('sortSelect').value = 'featured';

            document.querySelectorAll('.gender-btn').forEach(b => {
                if (b.getAttribute('data-gender') === 'Tous') {
                    b.classList.add('bg-fuchsia-600/30', 'border-fuchsia-500', 'text-white');
                    b.classList.remove('bg-slate-900/50', 'border-white/10', 'text-slate-300');
                } else {
                    b.classList.remove('bg-fuchsia-600/30', 'border-fuchsia-500', 'text-white');
                    b.classList.add('bg-slate-900/50', 'border-white/10', 'text-slate-300');
                }
            });

            document.querySelectorAll('.size-btn').forEach(b => {
                b.classList.remove('bg-fuchsia-600/30', 'border-fuchsia-500', 'text-white');
            });
            document.querySelectorAll('.color-btn').forEach(b => {
                b.classList.remove('border-fuchsia-500', 'bg-fuchsia-950/40');
            });

            renderProducts(products);
        }

        function filterProducts() {
            const maxPrice = parseInt(document.getElementById('priceRange').value);
            document.getElementById('priceValue').textContent = maxPrice + ' €';
            const sortVal = document.getElementById('sortSelect').value;

            let filtered = products.filter(p => {
                const matchGender = activeGender === 'Tous' || p.gender === GENDER_MAP[activeGender] || (activeGender !== 'Unisexe' && p.gender === 'Omni');
                const matchPrice = p.price <= maxPrice;
                const matchSize = activeSizes.length === 0 || activeSizes.includes(p.size);
                const matchColor = activeColors.length === 0 || activeColors.includes(p.color);
                return matchGender && matchPrice && matchSize && matchColor;
            });

            if (sortVal === 'asc') {
                filtered.sort((a, b) => a.price - b.price);
            } else if (sortVal === 'desc') {
                filtered.sort((a, b) => b.price - a.price);
            } else if (sortVal === 'popular') {
                filtered.sort((a, b) => b.popularity - a.popularity);
            }

            renderProducts(filtered);
        }

        function renderProducts(items) {
            const grid = document.getElementById('productGrid');
            const countEl = document.getElementById('resultsCount');
            countEl.textContent = `CURATED ARTIFACTS: ${items.length} synched`;

            if (items.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full py-16 text-center glass-card rounded-3xl">
                        <i data-lucide="search-x" class="w-10 h-10 text-slate-500 mx-auto mb-3"></i>
                        <p class="text-slate-300 font-medium">No artifacts match your vectors.</p>
                        <p class="text-xs text-slate-500 mt-1">Try broadening your search parameters.</p>
                    </div>
                `;
                lucide.createIcons();
                return;
            }

            grid.innerHTML = items.map(p => `
                <div class="glass-card rounded-3xl overflow-hidden flex flex-col justify-between group transition-all duration-300">
                    <div class="relative overflow-hidden aspect-[4/5] bg-slate-900">
                        <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://placehold.co/600x750/0f0f1a/ffffff?text=LUMIERE+2026'">
                        <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <span class="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-mono text-fuchsia-300 border border-white/10">
                                ${p.tag}
                            </span>
                            <span class="px-2.5 py-1 rounded-full bg-cyan-950/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                                ${p.gender}-Vector
                            </span>
                        </div>
                        <div class="absolute inset-0 bg-gradient-to-t from-[#03030c] via-transparent to-transparent opacity-60"></div>
                        <button onclick="openQuickView(${p.id})" class="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md hover:bg-fuchsia-600 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                            Quick Inspect
                        </button>
                    </div>
                    <div class="p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
                                <span class="font-mono">${p.category}</span>
                                <span class="font-mono text-cyan-400">Size: ${p.size}</span>
                            </div>
                            <h3 class="font-bold text-white text-base group-hover:text-fuchsia-300 transition-colors">${p.name}</h3>
                        </div>
                        <div class="flex items-center justify-between pt-3 border-t border-white/10">
                            <span class="font-mono font-bold text-lg text-fuchsia-400">${p.price} €</span>
                            <button onclick="addToCart(${p.id})" class="p-2.5 rounded-xl bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-300 hover:text-white transition-all border border-fuchsia-500/30">
                                <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            lucide.createIcons();
        }

        function openQuickView(id) {
            const product = products.find(p => p.id === id);
            if (!product) return;

            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = `
                <div class="aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
                    <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover">
                </div>
                <div class="space-y-4">
                    <div class="flex flex-wrap gap-2">
                        <span class="px-3 py-1 rounded-full bg-fuchsia-500/10 text-xs font-mono text-fuchsia-400 border border-fuchsia-500/20">${product.tag}</span>
                        <span class="px-3 py-1 rounded-full bg-cyan-500/10 text-xs font-mono text-cyan-400 border border-cyan-500/20">${product.gender}-Vector</span>
                    </div>
                    <h2 class="text-2xl font-bold text-white">${product.name}</h2>
                    <p class="text-sm text-slate-400">${product.description}</p>
                    <div class="flex items-center gap-4 text-xs font-mono text-slate-300">
                        <span>Color: <strong class="text-white">${product.color}</strong></span>
                        <span>Size: <strong class="text-cyan-400">${product.size}</strong></span>
                    </div>
                    <div class="text-2xl font-mono font-bold text-fuchsia-400 pt-2">${product.price} €</div>
                    <button onclick="addToCart(${product.id}); closeQuickView();" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 text-white font-medium text-sm transition-all shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2">
                        <i data-lucide="shopping-bag" class="w-4 h-4"></i>
                        <span>Sync to Neural Cart</span>
                    </button>
                </div>
            `;
            const modal = document.getElementById('quickViewModal');
            modal.classList.remove('opacity-0', 'pointer-events-none');
            document.getElementById('modalContainer').classList.remove('scale-95');
            lucide.createIcons();
        }

        function closeQuickView() {
            const modal = document.getElementById('quickViewModal');
            modal.classList.add('opacity-0', 'pointer-events-none');
            document.getElementById('modalContainer').classList.add('scale-95');
        }

        function addToCart(id) {
            const product = products.find(p => p.id === id);
            if (!product) return;

            const existing = cart.find(item => item.id === id);
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1 });
            }

            updateCartUI();
            showToast(`"${product.name}" synched to cart.`);
        }

        function updateCartUI() {
            const countBadge = document.getElementById('cartCountBadge');
            const cartSubtitle = document.getElementById('cartSubtitle');
            const cartItemsList = document.getElementById('cartItemsList');
            const cartTotalPrice = document.getElementById('cartTotalPrice');

            const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
            const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            countBadge.textContent = totalCount;
            cartSubtitle.textContent = `${totalCount} artifact${totalCount > 1 ? 's' : ''} in cart`;
            cartTotalPrice.textContent = `${totalPrice} €`;

            if (cart.length === 0) {
                cartItemsList.innerHTML = `
                    <div class="text-center py-16 text-slate-500 text-xs font-mono">
                        Neural Cart is currently empty.
                    </div>
                `;
                return;
            }

            cartItemsList.innerHTML = cart.map(item => `
                <div class="flex items-center gap-4 glass-card p-4 rounded-2xl">
                    <img src="${item.image}" class="w-16 h-16 rounded-xl object-cover bg-slate-900 border border-white/10">
                    <div class="flex-1">
                        <h4 class="font-bold text-white text-sm">${item.name}</h4>
                        <div class="text-xs text-slate-400 font-mono mt-0.5">${item.price} € × ${item.quantity}</div>
                    </div>
                    <button onclick="removeFromCart(${item.id})" class="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `).join('');
            lucide.createIcons();
        }

        function removeFromCart(id) {
            cart = cart.filter(item => item.id !== id);
            updateCartUI();
            showToast('Artifact removed from cart.');
        }

        function openCartDrawer() {
            document.getElementById('cartDrawer').classList.remove('translate-x-full');
        }

        function closeCartDrawer() {
            document.getElementById('cartDrawer').classList.add('translate-x-full');
        }

        let checkingOut = false;

        async function checkoutCart() {
            if (cart.length === 0) {
                showToast('Neural Cart is empty.');
                return;
            }
            if (checkingOut) return;
            checkingOut = true;
            showToast('Initiating quantum secure checkout...');
            try {
                const res = await fetch('api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: cart.map(item => ({ id: item.id, quantity: item.quantity })) })
                });
                const data = await res.json();
                if (!res.ok) {
                    showToast(data.error || 'Checkout failed.');
                } else {
                    cart = [];
                    updateCartUI();
                    closeCartDrawer();
                    showToast('Order successfully processed. Ref ' + data.ref);
                }
            } catch (e) {
                console.error('LUMIERE :', e);
                showToast('Server unreachable.');
            }
            checkingOut = false;
        }

        function openAiStylist() {
            document.getElementById('aiStylistDrawer').classList.remove('translate-x-full');
        }

        function closeAiStylist() {
            document.getElementById('aiStylistDrawer').classList.add('translate-x-full');
        }

        function handleAiSubmit(e) {
            e.preventDefault();
            const input = document.getElementById('aiInput');
            const text = input.value.trim();
            if (!text) return;

            appendAiMessage(text, 'user');
            input.value = '';

            setTimeout(() => {
                const responses = [
                    "Analyzing 2026 runway vectors... For a striking masculine look, combine the Titanium Spatial Trousers with the Gravitational Aviator Jacket.",
                    "In the feminine vector, the Cyber-Minimalist Tunic paired with the Ethereal Nanotextile Gown represents peak elegance.",
                    "For a versatile omni-vector ensemble, the Nexus Holographic Jacket with the Solar Quantum Cape offers an unmatched visual spectrum.",
                    "Exquisite stylist intuition! This silhouette is currently trending across neo-tokyo metropolitan hubs."
                ];
                const resp = responses[Math.floor(Math.random() * responses.length)];
                appendAiMessage(resp, 'bot');
            }, 800);
        }

        function sendAiPrompt(promptText) {
            appendAiMessage(promptText, 'user');
            setTimeout(() => {
                appendAiMessage(`Analyzing request "${promptText}": I recommend harmonizing your vector filtering to align with our 2026 collection.`, 'bot');
            }, 800);
        }

        function appendAiMessage(text, sender) {
            const chatContainer = document.getElementById('aiChatMessages');
            const msgDiv = document.createElement('div');
            msgDiv.className = `flex items-start gap-3 ${sender === 'user' ? 'flex-row-reverse' : ''}`;

            const iconDiv = document.createElement('div');
            iconDiv.className = `w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sender === 'user' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-cyan-500/20 text-cyan-400'}`;
            iconDiv.innerHTML = `<i data-lucide="${sender === 'user' ? 'user' : 'bot'}" class="w-4 h-4"></i>`;

            const bubble = document.createElement('div');
            bubble.className = `glass-card p-4 rounded-2xl text-xs sm:text-sm text-slate-200 max-w-[80%] ${sender === 'user' ? 'rounded-tr-none bg-fuchsia-600/20 border-fuchsia-500/30' : 'rounded-tl-none'}`;
            bubble.textContent = text;

            msgDiv.appendChild(iconDiv);
            msgDiv.appendChild(bubble);
            chatContainer.appendChild(msgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            lucide.createIcons();
        }

        function showToast(message) {
            const toast = document.getElementById('toast');
            const msgEl = toast.querySelector('span');
            msgEl.textContent = message;
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        }