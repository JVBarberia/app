function initInicio() {
    console.log('initInicio called');

    // Load inicio.json
    fetch('inicio.json')
        .then(response => {
            console.log('Fetching inicio.json');
            if (!response.ok) {
                throw new Error(`Failed to load inicio.json: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(config => {
            console.log('inicio.json loaded:', config);
            initializeSection(config);
        })
        .catch(error => {
            console.error('Error loading inicio.json:', error);
            window.showNotification(`No se pudo cargar la configuración de la página de inicio. Error: ${error.message}`);
            const content = document.querySelector('#content');
            if (content) {
                content.innerHTML = '<p class="text-text-secondary text-center">Error al cargar la página de inicio. Intenta de nuevo.</p>';
            }
        });

    function initializeSection(config) {
        console.log('Initializing inicio with config:', config);
        const content = document.querySelector('#content');
        if (!content) {
            console.error('Content container not found');
            window.showNotification('Error al cargar la página de inicio.');
            return;
        }

        // Update barbería text elements
        document.querySelectorAll('.business-name').forEach(el => {
            el.textContent = config.business.name || '';
            console.log(`Updated business-name to: ${el.textContent}`);
        });
        document.querySelectorAll('.slogan').forEach(el => {
            el.textContent = config.business.slogan || '';
            console.log(`Updated slogan to: ${el.textContent}`);
        });
        document.querySelectorAll('.business-description').forEach(el => {
            el.textContent = config.business.description || '';
            console.log(`Updated business-description to: ${el.textContent}`);
        });
        document.querySelectorAll('.address').forEach(el => {
            el.textContent = config.business.address || '';
            console.log(`Updated address to: ${el.textContent}`);
        });
        document.querySelectorAll('.hours').forEach(el => {
            el.textContent = config.business.hours || '';
            console.log(`Updated hours to: ${el.textContent}`);
        });
        document.querySelectorAll('.phone-link').forEach(el => {
            el.href = `tel:${config.business.phoneNumber || ''}`;
            console.log(`Updated phone-link to: ${el.href}`);
        });
        document.querySelectorAll('.whatsapp-link').forEach(el => {
            el.href = `https://wa.me/${config.business.whatsappNumber || ''}`;
            console.log(`Updated whatsapp-link to: ${el.href}`);
        });
        console.log('Barbería text elements updated');

        // Update tattoo artist section
        document.querySelectorAll('.tattoo-description').forEach(el => {
            if (config.tattooArtist && config.tattooArtist.description) {
                el.innerHTML = config.tattooArtist.description.replace(
                    config.tattooArtist.name,
                    `<span class="font-semibold">${config.tattooArtist.name}</span>`
                );
                console.log(`Updated tattoo-description to: ${el.innerHTML}`);
            } else {
                el.textContent = 'No hay descripción disponible para los servicios de tatuajes.';
                console.log('Set default tattoo-description');
            }
        });
        document.querySelectorAll('.tattoo-image').forEach(el => {
            if (config.tattooArtist && config.tattooArtist.image) {
                el.src = config.tattooArtist.image;
                console.log(`Updated tattoo-image to: ${el.src}`);
            } else {
                el.src = 'assets/img/default-tattoo.jpg';
                console.log('Set default tattoo-image');
            }
        });
        console.log('Tattoo artist section updated');

        // Initialize Swiper
        const bannerItems = document.querySelector('#banner-items');
        if (bannerItems && config.banners && config.banners.length > 0) {
            bannerItems.innerHTML = config.banners.map(banner => `
                <div class="swiper-slide">
                    <img src="${banner.image}" alt="Banner" class="w-full h-64 object-cover">
                    <p class="text-center text-white bg-black/50 p-2">${banner.text}</p>
                </div>
            `).join('');
            new Swiper('.swiper', {
                loop: true,
                autoplay: { delay: 3000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true }
            });
            console.log('Swiper initialized');
        } else {
            console.warn('No banners found or banner container missing');
            if (bannerItems) bannerItems.innerHTML = '<p class="text-text-secondary text-center">No hay banners disponibles.</p>';
        }

        // Social media links (barbería)
        const socialLinksContainer = document.querySelector('#social-links');
        if (socialLinksContainer && config.business.socials && Object.keys(config.business.socials).length > 0) {
            const socialIcons = {
                instagram: 'fab fa-instagram',
                facebook: 'fab fa-facebook',
                tiktok: 'fab fa-tiktok',
                twitter: 'fab fa-twitter',
                youtube: 'fab fa-youtube'
            };
            socialLinksContainer.innerHTML = '';
            Object.keys(config.business.socials).forEach(key => {
                if (config.business.socials[key]) {
                    const button = document.createElement('a');
                    button.href = config.business.socials[key];
                    button.target = '_blank';
                    button.rel = 'noopener';
                    button.className = 'social-icon text-mustard hover:text-mustard-hover';
                    button.innerHTML = `<i class="${socialIcons[key] || 'fas fa-link'} text-xl"></i>`;
                    socialLinksContainer.appendChild(button);
                    console.log(`Added social link: ${key} -> ${config.business.socials[key]}`);
                }
            });
            console.log('Barbería social links rendered');
        } else {
            console.warn('No social links found or social container missing');
            if (socialLinksContainer) socialLinksContainer.innerHTML = '<p class="text-text-secondary text-center">No hay redes sociales disponibles.</p>';
        }

        // Initialize map in a separate try-catch to avoid blocking other initializations
        try {
            const mapContainer = document.querySelector('#map');
            if (mapContainer && config.business.mapCoordinates) {
                // Check if a map instance exists and destroy it
                if (window.currentMap) {
                    window.currentMap.remove();
                    console.log('Existing map destroyed');
                    window.currentMap = null;
                }
                // Clear any existing Leaflet classes and data
                mapContainer.innerHTML = '';
                mapContainer.removeAttribute('style');
                mapContainer.className = 'w-full h-64';
                // Initialize new map
                const map = L.map('map').setView([config.business.mapCoordinates.latitude, config.business.mapCoordinates.longitude], 16);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                L.marker([config.business.mapCoordinates.latitude, config.business.mapCoordinates.longitude]).addTo(map)
                    .bindPopup(config.business.name || 'Jesús Vilca Barbería')
                    .openPopup();
                setTimeout(() => map.invalidateSize(), 100);
                window.currentMap = map; // Store map instance for future cleanup
                console.log('Map initialized with coordinates:', config.business.mapCoordinates);
            } else {
                console.warn('Map container or coordinates not found');
                window.showNotification('No se pudo cargar el mapa.');
            }
        } catch (mapError) {
            console.error('Error initializing map:', mapError);
            window.showNotification('Error al inicializar el mapa. Otros elementos se cargaron correctamente.');
        }

        // Update map link
        const mapLink = document.querySelector('a[href*="google.com/maps"]');
        if (mapLink && config.business.mapCoordinates) {
            mapLink.href = `https://www.google.com/maps/dir/?api=1&destination=${config.business.mapCoordinates.latitude},${config.business.mapCoordinates.longitude}`;
            console.log(`Updated map link to: ${mapLink.href}`);
        }

        // Services button
        const servicesButton = document.querySelector('[data-section="servicios"]');
        if (servicesButton) {
            servicesButton.addEventListener('click', () => {
                document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
                const servicesTab = document.querySelector('.tab-button[data-section="servicios"]');
                if (servicesTab) servicesTab.classList.add('active');
                localStorage.setItem('lastSection', 'servicios');
                window.loadSection('servicios');
                console.log('Services button clicked');
            });
        }

        // Tattoo more info button
        const tattooReserveButton = document.querySelector('#tattoo-reserve');
        if (tattooReserveButton) {
            tattooReserveButton.addEventListener('click', () => {
                document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
                const tattoosTab = document.querySelector('.tab-button[data-section="tattoos"]');
                if (tattoosTab) tattoosTab.classList.add('active');
                localStorage.setItem('lastSection', 'tattoos');
                window.loadSection('tattoos');
                console.log('Tattoo more info button clicked');
            });
        }

        // Agency modal
        const agencyLink = document.querySelector('#agency-link');
        const agencyModal = document.querySelector('#agency-modal');
        const agencyNameEls = document.querySelectorAll('.agency-name');
        const agencyModalText = document.querySelector('.agency-modal-text');
        const agencyWhatsapp = document.querySelector('.agency-whatsapp');
        const agencyWebsite = document.querySelector('.agency-website');
        const agencySocialLinks = document.querySelector('#agency-social-links');
        const agencyClose = document.querySelector('#agency-close');

        if (agencyLink && agencyModal && agencyNameEls.length > 0 && agencyModalText && agencyWhatsapp && agencyWebsite && agencySocialLinks && agencyClose) {
            // Set agency data
            agencyNameEls.forEach(el => {
                el.textContent = config.agency.name || '';
                console.log(`Updated agency-name to: ${el.textContent}`);
            });
            agencyModalText.textContent = config.agency.modalText || '';
            agencyWhatsapp.href = `https://wa.me/${config.agency.whatsapp || ''}`;
            agencyWebsite.href = config.agency.website || '';
            console.log(`Updated agency modal: text=${agencyModalText.textContent}, whatsapp=${agencyWhatsapp.href}, website=${agencyWebsite.href}`);

            // Render agency social links
            const socialIcons = {
                instagram: 'fab fa-instagram',
                facebook: 'fab fa-facebook',
                tiktok: 'fab fa-tiktok',
                twitter: 'fab fa-twitter',
                youtube: 'fab fa-youtube'
            };
            agencySocialLinks.innerHTML = '';
            if (config.agency.socials && Object.keys(config.agency.socials).length > 0) {
                Object.keys(config.agency.socials).forEach(key => {
                    if (config.agency.socials[key]) {
                        const button = document.createElement('a');
                        button.href = config.agency.socials[key];
                        button.target = '_blank';
                        button.rel = 'noopener';
                        button.className = 'social-icon text-mustard hover:text-mustard-hover';
                        button.innerHTML = `<i class="${socialIcons[key] || 'fas fa-link'} text-xl"></i>`;
                        agencySocialLinks.appendChild(button);
                        console.log(`Added agency social link: ${key} -> ${config.agency.socials[key]}`);
                    }
                });
                console.log('Agency social links rendered');
            } else {
                agencySocialLinks.innerHTML = '<p class="text-text-secondary text-center">No hay redes sociales disponibles.</p>';
            }

            // Modal event listeners
            agencyLink.addEventListener('click', (e) => {
                e.preventDefault();
                agencyModal.classList.remove('hidden');
                setTimeout(() => agencyModal.classList.add('show'), 10);
                console.log('Agency modal opened');
            });

            agencyClose.addEventListener('click', () => {
                agencyModal.classList.remove('show');
                setTimeout(() => agencyModal.classList.add('hidden'), 300);
                console.log('Agency modal closed');
            });
        } else {
            console.warn('Agency modal elements not found');
        }
    }
}

// Expose initInicio globally for dynamic navigation
window.initInicio = initInicio;

// Call initInicio on initial load
console.log('Calling initInicio');
initInicio();