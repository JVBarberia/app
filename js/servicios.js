let cachedConfig = null;
let swiperInstance = null;

function initServicios() {
    console.log('initServicios called');

    const content = document.querySelector('#content');
    const categoryBar = document.querySelector('#category-bar');
    const serviceList = document.querySelector('#service-list');

    if (!content || !categoryBar || !serviceList) {
        console.error('Required elements not found:', { content, categoryBar, serviceList });
        window.showNotification('Error al cargar la página de servicios.');
        return;
    }

    loadServices();

    function loadServices() {
        // Load servicios.json if not cached
        if (!cachedConfig) {
            fetch('servicios.json')
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load servicios.json');
                    return response.json();
                })
                .then(data => {
                    if (!data.categories || !Array.isArray(data.categories)) {
                        console.error('Invalid servicios.json format');
                        window.showNotification('Formato de servicios inválido.');
                        return;
                    }
                    data.categories.forEach(category => {
                        if (!category.services || !Array.isArray(category.services)) {
                            category.services = [];
                        }
                        category.services.forEach(service => {
                            service.price = typeof service.price === 'number' ? service.price : 0;
                            service.isPromo = service.isPromo || category.id === 3;
                            service.categoryId = category.id;
                            service.name = service.name || 'Servicio sin nombre';
                            service.duration = service.duration || 'No especificada';
                            service.image = service.image || 'assets/img/default-service.jpg';
                            service.icon = service.icon || 'fa-question';
                        });
                    });
                    cachedConfig = data;
                    initializeSection(data);
                })
                .catch(error => {
                    console.error('Error loading servicios.json:', error);
                    window.showNotification('No se pudo cargar la lista de servicios.');
                    serviceList.innerHTML = '<p class="text-text-secondary text-center">Error al cargar servicios. Intenta de nuevo.</p>';
                });
        } else {
            initializeSection(cachedConfig);
        }
    }
}

function initializeSection(config) {
    console.log('Initializing servicios with config:', config);
    const categoryBar = document.querySelector('#category-bar');
    if (categoryBar && config.categories && config.categories.length > 0) {
        categoryBar.innerHTML = config.categories.map((category, index) => `
            <div class="swiper-slide">
                <button class="category-btn" data-category-id="${category.id}" role="tab" aria-label="Filtrar por ${category.name}" aria-selected="${index === 0}">
                    ${category.name}
                </button>
            </div>
        `).join('');
        swiperInstance = new Swiper('.categories', {
            slidesPerView: 'auto',
            spaceBetween: 10,
            centeredSlides: false,
            loop: config.categories.length > 4,
            navigation: {
                enabled: false
            }
        });
        console.log('Category carousel initialized');

        // Set first category as active
        const firstButton = categoryBar.querySelector('.category-btn');
        if (firstButton) {
            firstButton.classList.add('active');
            firstButton.setAttribute('aria-selected', 'true');
            renderServices(firstButton.dataset.categoryId, config);
        }

        // Category button event listeners
        categoryBar.querySelectorAll('.category-btn').forEach(button => {
            button.addEventListener('click', () => {
                categoryBar.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
                localStorage.setItem('lastCategory', button.dataset.categoryId);
                renderServices(button.dataset.categoryId, config);
                swiperInstance.slideTo(config.categories.findIndex(cat => cat.id == button.dataset.categoryId));
            });
        });

        // Restore last category
        const lastCategory = localStorage.getItem('lastCategory');
        if (lastCategory) {
            const activeBtn = categoryBar.querySelector(`[data-category-id="${lastCategory}"]`);
            if (activeBtn) {
                categoryBar.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                activeBtn.classList.add('active');
                activeBtn.setAttribute('aria-selected', 'true');
                renderServices(lastCategory, config);
                swiperInstance.slideTo(config.categories.findIndex(cat => cat.id == lastCategory));
            }
        }
    } else {
        console.warn('No categories found or category bar missing');
        if (categoryBar) categoryBar.innerHTML = '<p class="text-text-secondary text-center">No hay categorías disponibles.</p>';
    }

    // Disable toast notifications
    window.showToast = function(message) {
        console.log(`Toast message suppressed: ${message}`);
    };

    // Go to cart
    const goToCart = document.querySelector('#go-to-cart');
    if (goToCart) {
        goToCart.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            const reserveTab = document.querySelector('.tab-button[data-section="reservas"]');
            if (reserveTab) reserveTab.classList.add('active');
            localStorage.setItem('lastSection', 'reservas');
            window.loadSection('reservas');
        });
    }
}

// Render services
function renderServices(categoryId, config) {
    const serviceList = document.querySelector('#service-list');
    const category = config.categories.find(cat => cat.id == categoryId);
    const selectedServices = JSON.parse(localStorage.getItem('selectedServices') || '[]');
    if (serviceList && category && category.services && category.services.length > 0) {
        serviceList.innerHTML = category.services.map(service => {
            const price = service.price >= 0 ? `S/${service.price}` : 'Precio no disponible';
            const isSelected = selectedServices.find(s => s.id === service.id);
            return `
                <div class="card flex flex-col animate-fadeIn relative ${service.isPromo ? 'promo-card' : ''}" data-service-id="${service.id}">
                    <div class="image-container relative">
                        <img src="${service.image}" alt="${service.name}" class="w-full h-32 object-cover rounded-t-lg ${service.isPromo ? '' : 'opacity-60'}" loading="lazy">
                        ${service.isPromo ? '<span class="promo-badge bg-mustard text-black font-bold text-xs px-2 py-1 rounded absolute top-2 right-2">Promoción</span>' : ''}
                    </div>
                    <div class="p-4 flex flex-col gap-2">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-2">
                                <i class="fas ${service.icon} text-mustard"></i>
                                <p class="text-white font-bold text-base">${service.name}</p>
                            </div>
                            <button class="info-btn bg-mustard text-black w-8 h-8 rounded-full flex items-center justify-center" aria-label="Ver detalles de ${service.name}">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                        <div class="flex justify-between items-center">
                            <p class="text-text-secondary text-sm"><i class="fas fa-clock mr-1"></i>${service.duration}</p>
                            <p class="text-mustard font-bold">${price}</p>
                        </div>
                        <button class="btn ${isSelected ? 'bg-red-500 text-white' : 'bg-mustard text-black'} w-full py-2 rounded-full flex items-center justify-center transition-colors duration-300" aria-label="${isSelected ? 'Remover' : 'Agregar'} ${service.name} al carrito">
                            <i class="fas ${isSelected ? 'fa-minus' : 'fa-plus'} mr-2"></i>${isSelected ? 'Remover' : 'Agregar'}
                            ${isSelected ? '<i class="fas fa-check check-icon animate-ping"></i>' : ''}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        console.log(`Services rendered for category ${category.name}`);

        // Add event listeners
        serviceList.querySelectorAll('.card').forEach(card => {
            const serviceId = parseInt(card.dataset.serviceId);
            const service = category.services.find(s => s.id === serviceId);
            const infoBtn = card.querySelector('.info-btn');
            const actionBtn = card.querySelector('.btn');

            infoBtn.addEventListener('click', () => showDetailsModal(service));
            actionBtn.addEventListener('click', () => {
                if (selectedServices.find(s => s.id === serviceId)) {
                    removeService(serviceId);
                } else {
                    selectService(service.id, service.name, service.price, service.categoryId);
                }
                renderServices(categoryId, config);
                window.updateBookingCount(); // Update notification in real-time
            });
        });
    } else {
        serviceList.innerHTML = '<p class="text-text-secondary text-center">No hay servicios disponibles en esta categoría.</p>';
    }
}

// Select service
window.selectService = function(id, name, price, categoryId) {
    console.log(`Service selected: ${name} (ID: ${id}, Price: ${price}, Category: ${categoryId})`);
    let selectedServices = JSON.parse(localStorage.getItem('selectedServices') || '[]');
    if (!selectedServices.find(s => s.id === id)) {
        selectedServices.push({ id, name, price, categoryId });
        localStorage.setItem('selectedServices', JSON.stringify(selectedServices));
        window.updateBookingCount(); // Update notification in real-time
        if (!localStorage.getItem('suggestionSkip')) {
            showSuggestionModal(name, id, categoryId);
        }
    }
};

// Remove service
window.removeService = function(id) {
    console.log(`Removing service ID: ${id}`);
    let selectedServices = JSON.parse(localStorage.getItem('selectedServices') || '[]');
    selectedServices = selectedServices.filter(s => s.id !== id);
    localStorage.setItem('selectedServices', JSON.stringify(selectedServices));
    window.updateBookingCount(); // Update notification in real-time
};

// Show suggestion modal
function showSuggestionModal(selectedServiceName, selectedServiceId, selectedCategoryId) {
    if (!cachedConfig) return;
    const modal = document.querySelector('#suggestion-modal');
    const suggestionContent = document.querySelector('#suggestion-content');
    const closeButton = document.querySelector('#suggestion-close');
    const cartButton = document.querySelector('#suggestion-cart');
    const skipCheckbox = document.querySelector('#suggestion-skip');
    if (!modal || !suggestionContent || !closeButton || !cartButton || !skipCheckbox) return;

    const selectedServices = JSON.parse(localStorage.getItem('selectedServices') || '[]');
    const selectedServiceIds = selectedServices.map(s => s.id);
    const selectedCategoryIds = selectedServices.map(s => s.categoryId);

    let suggestions = cachedConfig.categories
        .filter(cat => cat.id !== selectedCategoryId)
        .flatMap(cat => cat.services.map(service => ({ ...service, categoryId: cat.id })))
        .filter(service => !selectedServiceIds.includes(service.id))
        .sort((a, b) => a.price - b.price)
        .slice(0, 2);

    if (suggestions.length > 0) {
        suggestionContent.innerHTML = suggestions.map(service => `
            <div class="flex items-center gap-3 bg-gray-700 p-3 rounded-lg">
                <img src="${service.image}" alt="${service.name}" class="w-12 h-12 object-cover rounded">
                <div class="flex-1">
                    <p class="text-white font-semibold">${service.name}</p>
                    <p class="text-mustard">S/${service.price || 0}</p>
                </div>
                <button class="btn bg-mustard text-black px-3 py-1 rounded-full" aria-label="Agregar ${service.name} al carrito">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `).join('');
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);

        suggestionContent.querySelectorAll('.btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const service = suggestions[index];
                selectService(service.id, service.name, service.price || 0, service.categoryId);
                const activeCategory = document.querySelector('.category-btn.active').dataset.categoryId;
                renderServices(activeCategory, cachedConfig);
                window.updateBookingCount(); // Update notification in real-time
            });
        });

        closeButton.addEventListener('click', () => {
            if (skipCheckbox.checked) {
                localStorage.setItem('suggestionSkip', 'true');
            }
            modal.classList.remove('show');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }, { once: true });

        cartButton.addEventListener('click', () => {
            if (skipCheckbox.checked) {
                localStorage.setItem('suggestionSkip', 'true');
            }
            modal.classList.remove('show');
            setTimeout(() => {
                window.loadSection('reservas');
                modal.classList.add('hidden');
            }, 300);
        });
    } else {
        window.loadSection('reservas');
    }
}

// Show details modal
function showDetailsModal(service) {
    const modal = document.querySelector('#details-modal');
    const title = document.querySelector('#details-title');
    const icon = document.querySelector('#details-icon');
    const duration = document.querySelector('#details-duration');
    const price = document.querySelector('#details-price');
    const description = document.querySelector('#details-description');
    const addButton = document.querySelector('#details-add');
    const closeButton = document.querySelector('#details-close');
    if (!modal || !title || !icon || !duration || !price || !description || !addButton || !closeButton) return;

    title.textContent = service.name;
    icon.className = `fas ${service.icon} text-mustard text-2xl`;
    duration.textContent = `Duración: ${service.duration}`;
    price.textContent = `Precio: S/${service.price || 0}`;
    description.textContent = service.description || 'No hay descripción disponible.';
    const isSelected = JSON.parse(localStorage.getItem('selectedServices') || '[]').find(s => s.id === service.id);
    addButton.style.display = isSelected ? 'none' : 'block';

    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);

    addButton.addEventListener('click', () => {
        selectService(service.id, service.name, service.price, service.categoryId);
        const activeCategory = document.querySelector('.category-btn.active').dataset.categoryId;
        renderServices(activeCategory, cachedConfig);
        window.updateBookingCount(); // Update notification in real-time
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }, { once: true });

    closeButton.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }, { once: true });
}