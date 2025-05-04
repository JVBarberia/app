function initTattoos() {
    console.log('initTattoos called');

    // Load tattoos.json
    fetch('tattoos.json')
        .then(response => {
            console.log('Fetching tattoos.json');
            if (!response.ok) throw new Error(`Failed to load tattoos.json: ${response.status} ${response.statusText}`);
            return response.json();
        })
        .then(config => {
            console.log('tattoos.json loaded:', config);
            initializeSection(config);
        })
        .catch(error => {
            console.error('Error loading tattoos.json:', error);
            window.showNotification(`No se pudo cargar la configuración de la página de tatuajes. Error: ${error.message}`);
            const content = document.querySelector('#content');
            if (content) {
                content.innerHTML = '<p class="text-text-secondary text-center">Error al cargar la página de tatuajes. Intenta de nuevo.</p>';
            }
        });

    function initializeSection(config) {
        console.log('Initializing tattoos with config:', config);
        const content = document.querySelector('#content');
        if (!content) {
            console.error('Content container not found');
            window.showNotification('Error al cargar la página de tatuajes.');
            return;
        }

        // Update tattoo info
        document.querySelectorAll('.tattoo-info').forEach(el => {
            el.textContent = config.tattooInfo || '';
            console.log(`Updated tattoo-info to: ${el.textContent}`);
        });
        document.querySelectorAll('.tattoo-artist-bio').forEach(el => {
            if (config.tattooArtist && config.tattooArtist.bio) {
                el.innerHTML = config.tattooArtist.bio.replace(
                    config.tattooArtist.name,
                    `<span class="font-semibold">${config.tattooArtist.name}</span>`
                );
                console.log(`Updated tattoo-artist-bio to: ${el.innerHTML}`);
            } else {
                el.textContent = 'No hay biografía disponible para el tatuador.';
                console.log('Set default tattoo-artist-bio');
            }
        });
        document.querySelectorAll('.tattoo-artist-image').forEach(el => {
            if (config.tattooArtist && config.tattooArtist.image) {
                el.src = config.tattooArtist.image;
                console.log(`Updated tattoo-artist-image to: ${el.src}`);
            } else {
                el.src = 'assets/img/default-tattoo.jpg';
                console.log('Set default tattoo-artist-image');
            }
        });

        // Update anticipation note
        const anticipationNote = document.querySelector('#anticipation-note');
        if (anticipationNote) {
            anticipationNote.textContent = `${config.bookingAnticipationHours} horas`;
            console.log(`Updated anticipation note to: ${config.bookingAnticipationHours} horas`);
        }

        // Set minimum date for the calendar based on booking anticipation
        const dateInput = document.querySelector('#tattoo-date');
        if (dateInput) {
            const now = new Date();
            const minDate = new Date(now.getTime() + config.bookingAnticipationHours * 60 * 60 * 1000);
            const minDateString = minDate.toISOString().split('T')[0];
            dateInput.setAttribute('min', minDateString);
            console.log(`Set minimum date to: ${minDateString}`);
        }

        // Initialize Swiper for tattoo gallery
        const tattooGallery = document.querySelector('#tattoo-gallery');
        if (tattooGallery && config.tattooGallery && config.tattooGallery.length > 0) {
            tattooGallery.innerHTML = config.tattooGallery.map(item => `
                <div class="swiper-slide">
                    <img src="${item.image}" alt="Tattoo" class="w-full h-full object-cover">
                </div>
            `).join('');
            new Swiper('.tattoo-slider', {
                loop: true,
                autoplay: { delay: 3000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true }
            });
            console.log('Tattoo slider initialized');
        } else {
            console.warn('No tattoo gallery found or container missing');
            if (tattooGallery) tattooGallery.innerHTML = '<p class="text-text-secondary text-center">No hay imágenes disponibles.</p>';
        }

        // Handle reservation form submission
        const form = document.querySelector('#tattoo-reservation-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const clientName = document.querySelector('#client-name').value.trim();
                const tattooDate = document.querySelector('#tattoo-date').value;
                const tattooTime = document.querySelector('#tattoo-time').value;
                const tattooDescription = document.querySelector('#tattoo-description').value.trim();

                // Validate form fields
                if (!clientName || !tattooDate || !tattooTime || !tattooDescription) {
                    window.showNotification('Por favor, completa todos los campos.');
                    console.log('Form validation failed: missing fields');
                    return;
                }

                // Validate booking anticipation
                const now = new Date();
                const selectedDateTime = new Date(`${tattooDate}T${tattooTime}:00`);
                const minDateTime = new Date(now.getTime() + config.bookingAnticipationHours * 60 * 60 * 1000);
                if (selectedDateTime < minDateTime) {
                    window.showNotification(`Debes reservar con al menos ${config.bookingAnticipationHours} horas de anticipación. La fecha mínima es ${minDateTime.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}.`);
                    console.log('Booking anticipation validation failed:', selectedDateTime, minDateTime);
                    return;
                }

                // Validate WhatsApp number
                const defaultWhatsAppNumber = '+51920850690'; // Número predeterminado como respaldo
                let whatsappNumber = config.tattooArtist?.whatsappNumber || defaultWhatsAppNumber;
                
                // Normalizar el número: eliminar espacios, guiones, y asegurar que comience con +
                whatsappNumber = whatsappNumber.replace(/[\s-]/g, '');
                if (!whatsappNumber.startsWith('+')) {
                    whatsappNumber = '+' + whatsappNumber;
                }

                // Validar que el número tenga un formato razonable (al menos 10 dígitos después del +)
                if (!/^\+\d{10,}$/.test(whatsappNumber)) {
                    window.showNotification('Número de WhatsApp inválido en la configuración. Contacta al soporte.');
                    console.error('Invalid WhatsApp number:', whatsappNumber);
                    return;
                }

                // Prepare message for WhatsApp
                const message = `Solicitud de cita para tatuaje:\n` +
                               `Nombre: ${clientName}\n` +
                               `Fecha y hora: ${selectedDateTime.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}\n` +
                               `Descripción del tatuaje: ${tattooDescription}`;
                console.log('Prepared WhatsApp message:', message);

                // Construct WhatsApp URL
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
                console.log('WhatsApp URL:', whatsappUrl);

                // Open WhatsApp
                try {
                    window.open(whatsappUrl, '_blank');
                    window.showNotification('Solicitud enviada. Nos contactaremos contigo pronto vía WhatsApp.');
                    console.log('WhatsApp URL opened successfully');
                } catch (error) {
                    window.showNotification('Error al abrir WhatsApp. Por favor, intenta de nuevo.');
                    console.error('Error opening WhatsApp URL:', error);
                }

                // Reset form
                form.reset();
                console.log('Form reset');
            });
        } else {
            console.warn('Reservation form not found');
        }
    }
}

// Expose initTattoos globally for dynamic navigation
window.initTattoos = initTattoos;

// Call initTattoos on initial load
console.log('Calling initTattoos');
initTattoos();