document.addEventListener('DOMContentLoaded', () => {
    console.log('index.js loaded');
    let config = {
        appTitle: 'Jesús Vilca - Barbería',
        navItems: [
            { section: 'inicio', label: 'Inicio', icon: 'fas fa-home' },
            { section: 'servicios', label: 'Servicios', icon: 'fas fa-scissors' },
            { section: 'tattoos', label: 'Tatuajes', icon: 'fas fa-pen' },
            { section: 'reservas', label: 'Reservas', icon: 'fas fa-calendar-check' }
        ],
        bookingCountLabel: 'Reservas'
    };
    let currentSection = null; // Track the current section

    // Load index.json
    fetch('index.json')
        .then(response => {
            console.log('Fetching index.json');
            if (!response.ok) {
                console.warn('Failed to load index.json, using default config');
                return config;
            }
            return response.json();
        })
        .then(data => {
            console.log('index.json loaded:', data);
            config = { ...config, ...data };
            initializeApp();
        })
        .catch(error => {
            console.error('Error loading index.json:', error);
            initializeApp();
        });

    function initializeApp() {
        console.log('Initializing app with config:', config);
        const content = document.querySelector('#content');
        const navItemsContainer = document.querySelector('#nav-items');

        if (!content || !navItemsContainer) {
            console.error('Content or nav-items container not found');
            showNotification('Error al inicializar la aplicación. Verifica los contenedores HTML.');
            return;
        }

        // Set app title
        const titleElement = document.querySelector('.app-title');
        if (titleElement) {
            titleElement.textContent = config.appTitle;
            document.title = config.appTitle;
            console.log('App title set to:', config.appTitle);
        }

        // Render navigation items
        navItemsContainer.innerHTML = config.navItems.map(item => `
            <button data-section="${item.section}" class="tab-button flex flex-col items-center text-text-primary ${item.section === 'inicio' ? 'active' : ''}">
                <i class="${item.icon} text-lg"></i>
                <span>${item.label}</span>
                ${item.section === 'reservas' ? '<span id="booking-count" class="bg-mustard text-black text-xs rounded-full h-5 w-5 flex items-center justify-center absolute top-0 right-0 hidden"></span>' : ''}
            </button>
        `).join('');
        console.log('Navigation items rendered:', config.navItems);

        // Update booking count
        window.updateBookingCount = function() {
            const bookingCount = document.querySelector('#booking-count');
            const selectedServices = JSON.parse(localStorage.getItem('selectedServices') || '[]');
            const count = selectedServices.length;
            if (bookingCount) {
                bookingCount.textContent = count > 0 ? count : '';
                bookingCount.classList.toggle('hidden', count === 0);
                console.log('Booking count updated:', count);
            }
        };
        window.updateBookingCount(); // Initial call to hide if no items

        // Show notification
        window.showNotification = function(message) {
            const modal = document.querySelector('#notification-modal');
            const messageElement = document.querySelector('#notification-message');
            const closeButton = document.querySelector('#notification-close');
            if (modal && messageElement && closeButton) {
                messageElement.textContent = message;
                modal.classList.remove('hidden');
                setTimeout(() => modal.classList.add('show'), 10);
                closeButton.addEventListener('click', () => {
                    modal.classList.remove('show');
                    setTimeout(() => modal.classList.add('hidden'), 300);
                }, { once: true });
                console.log('Notification shown:', message);
            } else {
                console.error('Notification modal elements not found');
            }
        };

        // Load section
        window.loadSection = function(section) {
            // Prevent reloading if the section is already active
            if (section === currentSection) {
                console.log(`Section ${section} is already active, skipping reload`);
                // Reinitialize section to ensure dynamic content loads
                if (section === 'inicio' && window.initInicio) {
                    window.initInicio();
                    console.log('Reinitialized inicio');
                } else if (section === 'servicios' && window.initServicios) {
                    window.initServicios();
                    console.log('Reinitialized servicios');
                } else if (section === 'tattoos' && window.initTattoos) {
                    window.initTattoos();
                    console.log('Reinitialized tattoos');
                } else if (section === 'reservas' && window.initReservas) {
                    window.initReservas();
                    console.log('Reinitialized reservas');
                }
                return;
            }
            currentSection = section; // Update current section
            console.log('Loading section:', section);

            // Remove existing section-specific CSS and JS
            document.querySelectorAll('link[data-section-style]').forEach(style => style.remove());
            document.querySelectorAll('script[data-section-script]').forEach(script => script.remove());

            // Clear content
            content.innerHTML = '<p class="text-text-secondary text-center">Cargando...</p>';

            // Load section HTML
            fetch(`${section}.html`)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to load ${section}.html`);
                    return response.text();
                })
                .then(data => {
                    content.innerHTML = data;
                    console.log(`${section}.html loaded`);

                    // Load section-specific CSS
                    const style = document.createElement('link');
                    style.rel = 'stylesheet';
                    style.href = `css/${section}.css`;
                    style.dataset.sectionStyle = section;
                    style.onerror = () => {
                        console.warn(`Failed to load css/${section}.css`);
                        content.innerHTML = `<p class="text-text-secondary text-center">Estilos para ${section} no disponibles.</p>`;
                    };
                    style.onload = () => console.log(`${section}.css loaded`);
                    document.head.appendChild(style);

                    // Load section-specific JS
                    const script = document.createElement('script');
                    script.src = `js/${section}.js`;
                    script.dataset.sectionScript = section;
                    script.onerror = () => {
                        console.warn(`Failed to load js/${section}.js`);
                        content.innerHTML = `<p class="text-text-secondary text-center">Sección ${section} no disponible.</p>`;
                    };
                    script.onload = () => {
                        console.log(`${section}.js loaded`);
                        // Initialize section-specific logic with a slight delay to ensure DOM is ready
                        setTimeout(() => {
                            if (section === 'servicios' && window.initServicios) {
                                window.initServicios();
                                console.log('Initialized servicios');
                            } else if (section === 'inicio' && window.initInicio) {
                                window.initInicio();
                                console.log('Initialized inicio');
                            } else if (section === 'tattoos' && window.initTattoos) {
                                window.initTattoos();
                                console.log('Initialized tattoos');
                            } else if (section === 'reservas' && window.initReservas) {
                                window.initReservas();
                                console.log('Initialized reservas');
                            } else {
                                console.warn(`No initialization function found for section: ${section}`);
                            }
                        }, 0);
                    };
                    document.body.appendChild(script);

                    window.updateBookingCount();
                })
                .catch(error => {
                    console.error(`Error loading ${section}:`, error);
                    content.innerHTML = `<p class="text-text-secondary text-center">Error al cargar la sección ${section}. Intenta de nuevo.</p>`;
                    window.showNotification(`Error al cargar la sección ${section}.`);
                    currentSection = null; // Reset current section on error
                });
        };

        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const section = tab.dataset.section;
                localStorage.setItem('lastSection', section);
                window.loadSection(section);
                console.log('Tab clicked:', section);
            });
        });

        // Load last section or default
        const lastSection = localStorage.getItem('lastSection') || 'inicio';
        console.log('Loading initial section:', lastSection);
        const activeTab = document.querySelector(`.tab-button[data-section="${lastSection}"]`);
        if (activeTab) {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            activeTab.classList.add('active');
            window.loadSection(lastSection);
        } else {
            window.loadSection('inicio');
        }
    }
});