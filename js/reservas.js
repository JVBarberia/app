const STEPS = ['services', 'location', 'barber', 'schedule', 'payment', 'confirm'];

const state = {
    currentStep: 'services',
    reservation: {
        services: [],
        location: null,
        barberId: null,
        schedule: null,
        paymentMethod: null,
        address: '',
        reference: '',
        homeServiceFee: 0
    },
    barbers: null,
    hours: null
};

window.showToast = function(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-toastIn';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'animate-toastOut');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.initReservas = function() {
    console.log('initReservas called');
    const savedData = JSON.parse(localStorage.getItem('reservationData') || '{}');
    const selectedServices = JSON.parse(localStorage.getItem('selectedServices') || '[]');
    
    state.reservation = {
        services: selectedServices.length > 0 ? selectedServices : [],
        location: savedData.location || null,
        barberId: savedData.barberId || null,
        schedule: savedData.schedule || null,
        paymentMethod: savedData.paymentMethod || null,
        address: savedData.address || '',
        reference: savedData.reference || '',
        homeServiceFee: savedData.homeServiceFee || 0
    };

    if (state.reservation.services.length === 0) {
        state.currentStep = 'services';
        localStorage.removeItem('reservationData');
    } else {
        state.currentStep = savedData.currentStep || 'services';
    }

    const content = document.querySelector('#reservation-content');
    if (!content) {
        console.error('Reservation content container not found');
        return;
    }

    fetch('reservas.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load reservas.json');
            return response.json();
        })
        .then(data => {
            if (!data.barbers || !Array.isArray(data.barbers) || !data.hours) {
                throw new Error('Invalid reservas.json format');
            }
            state.barbers = data.barbers;
            state.hours = data.hours;
            state.bookingAnticipationHours = data.bookingAnticipationHours || 24;
            console.log('Loaded hours:', state.hours); // Depuración
            render();
        })
        .catch(error => {
            console.error('Error loading reservas.json:', error);
            window.showToast(`Error al cargar los datos: ${error.message}`);
            content.innerHTML = '<p class="text-gray-400 text-center">No se pudo cargar la reserva. Intenta de nuevo.</p>';
        });
};

function saveReservationData() {
    localStorage.setItem('reservationData', JSON.stringify({
        ...state.reservation,
        currentStep: state.currentStep
    }));
    localStorage.setItem('selectedServices', JSON.stringify(state.reservation.services));
}

function canNavigateTo(step) {
    if (!state.reservation) return false;
    switch (step) {
        case 'services': return true;
        case 'location': return state.reservation.services.length > 0;
        case 'barber': return state.reservation.location === 'local' && state.reservation.services.length > 0;
        case 'schedule': return (
            (state.reservation.barberId || 
             (state.reservation.location === 'home' && 
              state.reservation.address.trim() && 
              state.reservation.reference.trim())
            ) && state.reservation.services.length > 0
        );
        case 'payment': return state.reservation.schedule && state.reservation.services.length > 0;
        case 'confirm': return state.reservation.paymentMethod && state.reservation.services.length > 0;
        default: return false;
    }
}

function updateSteps() {
    const stepsContainer = document.querySelector('#reservation-steps');
    if (!stepsContainer) {
        console.error('Steps container not found');
        return;
    }
    if (state.reservation.services.length === 0) {
        stepsContainer.classList.add('hidden');
    } else {
        stepsContainer.classList.remove('hidden');
    }

    const steps = document.querySelectorAll('#reservation-steps .step');
    const currentIndex = STEPS.indexOf(state.currentStep);
    steps.forEach((step, index) => {
        const stepName = step.dataset.step;
        step.classList.remove('active', 'completed', 'hidden');
        if (stepName === state.currentStep) {
            step.classList.add('active');
        } else if (STEPS.indexOf(stepName) < currentIndex && canNavigateTo(stepName)) {
            step.classList.add('completed');
        }
        if (stepName === 'barber' && state.reservation.location === 'home') {
            step.classList.add('hidden');
        }
    });
}

function render() {
    const content = document.querySelector('#reservation-content');
    if (!content) {
        console.error('Reservation content container not found');
        return;
    }
    content.innerHTML = '';
    content.classList.add('animate-fadeIn');

    try {
        const renderMap = {
            'services': renderServicesStep,
            'location': renderLocationStep,
            'barber': renderBarberStep,
            'schedule': renderScheduleStep,
            'payment': renderPaymentStep,
            'confirm': renderConfirmStep
        };
        const renderFunc = renderMap[state.currentStep] || (() => {
            content.innerHTML = '<p class="text-gray-400 text-center">Paso no válido.</p>';
        });
        renderFunc(content);
        updateSteps();
    } catch (error) {
        console.error(`Error rendering step ${state.currentStep}:`, error);
        content.innerHTML = '<p class="text-gray-400 text-center">Error al cargar el paso.</p>';
        window.showToast('Error al cargar el paso.');
    }
}

function navigateTo(step) {
    if (canNavigateTo(step)) {
        state.currentStep = step;
        saveReservationData();
        render();
    } else {
        window.showToast('Por favor completa el paso actual.');
    }
}

function renderServicesStep(content) {
    if (state.reservation.services.length === 0) {
        content.innerHTML = `
            <div class="card text-center">
                <h2 class="text-xl font-bold text-mustard mb-4">No has seleccionado servicios</h2>
                <p class="text-gray-400 mb-4">Elige los servicios que deseas.</p>
                <button class="btn w-full" onclick="window.loadSection('servicios')">Seleccionar Servicios</button>
            </div>`;
        return;
    }
    content.innerHTML = `
        <div class="card">
            <h2 class="text-xl font-bold text-mustard mb-4">Tus Servicios</h2>
            <ul class="flex flex-col gap-3 mb-4">
                ${state.reservation.services.map(service => `
                    <li class="service-item flex justify-between items-center">
                        <span class="flex items-center"><i class="fas fa-cut text-mustard mr-2"></i> ${service.name}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-mustard">S/${service.price}</span>
                            <button class="text-red-500 hover:text-red-400" data-service-id="${service.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </li>
                `).join('')}
            </ul>
            <div class="flex gap-3">
                <button class="btn w-full" onclick="window.loadSection('servicios')">Agregar</button>
                <button class="btn w-full" id="next-step">Continuar</button>
            </div>
        </div>`;
    content.querySelectorAll('[data-service-id]').forEach(btn => {
        btn.addEventListener('click', () => {
            const serviceId = btn.dataset.serviceId;
            state.reservation.services = state.reservation.services.filter(s => String(s.id) !== serviceId);
            localStorage.setItem('selectedServices', JSON.stringify(state.reservation.services));
            if (typeof window.updateSummary === 'function') window.updateSummary();
            saveReservationData();
            render();
        });
    });
    content.querySelector('#next-step')?.addEventListener('click', () => navigateTo('location'));
}

function renderLocationStep(content) {
    content.innerHTML = `
        <div class="card">
            <h2 class="text-xl font-bold text-mustard mb-4">Ubicación</h2>
            <p class="text-gray-400 mb-4">Elige dónde recibirás el servicio.</p>
            <div class="location-toggle flex flex-col gap-3">
                <div class="flex items-center">
                    <input type="radio" id="local" name="location" value="local" ${state.reservation.location === 'local' ? 'checked' : ''} class="mr-2">
                    <label for="local" class="location-option flex-1 px-4 py-2 rounded-lg cursor-pointer" style="background-color: #6b7280; color: white;"><i class="fas fa-store mr-2"></i> En el local</label>
                </div>
                <div class="flex items-center">
                    <input type="radio" id="home" name="location" value="home" ${state.reservation.location === 'home' ? 'checked' : ''} class="mr-2">
                    <label for="home" class="location-option flex-1 px-4 py-2 rounded-lg cursor-pointer" style="background-color: #6b7280; color: white;"><i class="fas fa-home mr-2"></i> A domicilio</label>
                </div>
            </div>
            <p class="text-gray-400 text-sm mt-2 opacity-0 transition-opacity duration-300 ease-in-out ${state.reservation.location === 'home' ? 'opacity-100' : ''}" id="home-note">Si eliges a domicilio, Jesús Vilca te atenderá (costo adicional: S/20).</p>
            <div class="flex gap-3 mt-4">
                <button class="btn w-full" id="prev-step">Volver</button>
                <button class="btn w-full ${state.reservation.location ? '' : 'hidden'}" id="next-step">Continuar</button>
            </div>
        </div>`;
    const radios = content.querySelectorAll('input[name="location"]');
    const homeNote = content.querySelector('#home-note');
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            state.reservation.location = radio.value;
            state.reservation.homeServiceFee = radio.value === 'home' ? 20 : 0;
            state.reservation.barberId = radio.value === 'home' ? 1 : null;
            state.reservation.schedule = null;
            state.reservation.address = '';
            state.reservation.reference = '';
            saveReservationData();
            render();
            homeNote.classList.toggle('opacity-100', radio.value === 'home');
            content.querySelector('#next-step').classList.toggle('hidden', !radio.value);
        });
    });
    content.querySelector('#prev-step')?.addEventListener('click', () => navigateTo('services'));
    content.querySelector('#next-step')?.addEventListener('click', () => {
        navigateTo(state.reservation.location === 'home' ? 'schedule' : 'barber');
    });
}

function renderBarberStep(content) {
    if (!state.barbers || state.barbers.length === 0) {
        content.innerHTML = '<p class="text-gray-400 text-center">No hay barberos disponibles.</p>';
        window.showToast('No se encontraron barberos disponibles.');
        return;
    }
    content.innerHTML = `
        <div class="card">
            <h2 class="text-xl font-bold text-mustard mb-4">Elige tu Barbero</h2>
            <p class="text-gray-400 mb-4">Selecciona tu barbero.</p>
            <div class="flex flex-col gap-4">
                ${state.barbers.map(barber => `
                    <div class="selected-barber card p-4 cursor-pointer ${state.reservation.barberId === barber.id ? 'active' : ''}" data-barber-id="${barber.id}">
                        <h3 class="text-lg font-semibold text-white flex items-center">${barber.name}${state.reservation.barberId === barber.id ? ' <i class="fas fa-check-circle text-mustard ml-2"></i>' : ''}</h3>
                    </div>
                `).join('')}
            </div>
            <div class="flex gap-3 mt-4">
                <button class="btn w-full" id="prev-step">Volver</button>
                <button class="btn w-full ${state.reservation.barberId ? '' : 'hidden'}" id="next-step">Continuar</button>
            </div>
        </div>`;
    content.querySelectorAll('.selected-barber').forEach(card => {
        card.addEventListener('click', () => {
            state.reservation.barberId = parseInt(card.dataset.barberId);
            saveReservationData();
            render();
            content.querySelectorAll('.selected-barber').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            content.querySelector('#next-step').classList.remove('hidden');
        });
    });
    content.querySelector('#prev-step')?.addEventListener('click', () => navigateTo('location'));
    content.querySelector('#next-step')?.addEventListener('click', () => navigateTo('schedule'));
}

function renderScheduleStep(content) {
    if (!state.hours || !state.hours.weekday || !state.hours.sunday) {
        content.innerHTML = '<p class="text-gray-400 text-center">No hay horarios disponibles.</p>';
        window.showToast('No se encontraron horarios disponibles. Verifica reservas.json.');
        return;
    }

    if (!state.barbers || state.barbers.length === 0) {
        content.innerHTML = '<p class="text-gray-400 text-center">No hay barberos disponibles.</p>';
        window.showToast('No se encontraron barberos disponibles.');
        return;
    }

    const barber = state.reservation.location === 'home' 
        ? state.barbers.find(b => b.id === 1) // Jesús Vilca para servicio a domicilio
        : state.barbers.find(b => b.id === state.reservation.barberId) || state.barbers[0];

    if (!barber) {
        content.innerHTML = '<p class="text-gray-400 text-center">No se encontró el barbero seleccionado.</p>';
        window.showToast('Error al seleccionar el barbero.');
        return;
    }

    const now = new Date();
    const minDate = new Date(now.getTime() + (state.bookingAnticipationHours || 24) * 60 * 60 * 1000).toISOString().split('T')[0];
    const savedDate = state.reservation.schedule ? state.reservation.schedule.split(' ')[0] : '';
    const savedTime = state.reservation.schedule ? state.reservation.schedule.split(' ')[1] : '';

    content.innerHTML = `
        <div class="card">
            <h2 class="text-xl font-bold text-mustard mb-4">Horario</h2>
            <p class="text-gray-400 mb-4">Elige fecha y hora con ${barber.name} (mínimo ${state.bookingAnticipationHours || 24} horas de anticipación).</p>
            <div class="flex flex-col gap-4">
                <input type="date" id="date-select" min="${minDate}" value="${savedDate}" class="border border-gray-300 rounded-lg px-3 py-2">
                <select id="time-select" class="border border-gray-300 rounded-lg px-3 py-2" disabled>
                    <option value="">Elige una hora</option>
                </select>
                ${state.reservation.location === 'home' ? `
                    <input type="text" id="address-input" placeholder="Dirección completa" value="${state.reservation.address}" class="border border-gray-300 rounded-lg px-3 py-2">
                    <input type="text" id="reference-input" placeholder="Referencia (ej. cerca de la plaza)" value="${state.reservation.reference}" class="border border-gray-300 rounded-lg px-3 py-2">
                ` : ''}
            </div>
            <div class="flex gap-3 mt-4">
                <button class="btn w-full" id="prev-step">Volver</button>
                <button class="btn w-full hidden" id="next-step">Continuar</button>
            </div>
        </div>`;

    const dateSelect = content.querySelector('#date-select');
    const timeSelect = content.querySelector('#time-select');
    const addressInput = content.querySelector('#address-input');
    const referenceInput = content.querySelector('#reference-input');
    const nextBtn = content.querySelector('#next-step');

    function updateAvailableHours() {
        console.log('Updating available hours, selectedDate:', dateSelect.value); // Depuración
        timeSelect.innerHTML = '<option value="">Elige una hora</option>';

        if (!dateSelect.value) {
            timeSelect.disabled = true;
            state.reservation.schedule = null;
            console.log('No date selected, timeSelect disabled');
            updateNextButton();
            return;
        }

        const dateObj = new Date(dateSelect.value);
        if (isNaN(dateObj.getTime())) {
            console.log('Invalid date selected:', dateSelect.value);
            timeSelect.disabled = true;
            window.showToast('Fecha inválida. Por favor selecciona una fecha válida.');
            return;
        }

        const isSunday = dateObj.getDay() === 0;
        const hours = isSunday ? state.hours.sunday : state.hours.weekday;

        console.log('Hours for', isSunday ? 'Sunday' : 'Weekday', ':', hours); // Depuración

        timeSelect.disabled = false;
        hours.forEach(hour => {
            const option = document.createElement('option');
            option.value = hour;
            option.textContent = hour;
            if (hour === savedTime && dateSelect.value === savedDate) {
                option.selected = true;
            }
            timeSelect.appendChild(option);
        });
        console.log('Time select populated with', hours.length, 'options');

        updateNextButton();
    }

    // Inicializar el estado del <select> según la fecha guardada
    if (savedDate) {
        dateSelect.value = savedDate;
        updateAvailableHours();
    }

    dateSelect.addEventListener('change', () => {
        console.log('Date selected:', dateSelect.value); // Depuración
        if (dateSelect.value) {
            state.reservation.schedule = null;
            timeSelect.value = '';
            updateAvailableHours();
            saveReservationData();
        } else {
            console.log('Date cleared');
            timeSelect.disabled = true;
            timeSelect.innerHTML = '<option value="">Elige una hora</option>';
            state.reservation.schedule = null;
            updateNextButton();
            saveReservationData();
        }
    });

    timeSelect.addEventListener('change', () => {
        console.log('Time selected:', timeSelect.value); // Depuración
        if (dateSelect.value && timeSelect.value) {
            state.reservation.schedule = `${dateSelect.value} ${timeSelect.value}`;
        } else {
            state.reservation.schedule = null;
        }
        saveReservationData();
        updateNextButton();
    });

    if (addressInput) {
        addressInput.addEventListener('input', () => {
            state.reservation.address = addressInput.value;
            saveReservationData();
            updateNextButton();
        });
    }

    if (referenceInput) {
        referenceInput.addEventListener('input', () => {
            state.reservation.reference = referenceInput.value;
            saveReservationData();
            updateNextButton();
        });
    }

    function updateNextButton() {
        const isValid = dateSelect.value && timeSelect.value && 
                        (state.reservation.location !== 'home' || 
                         (addressInput?.value.trim() && referenceInput?.value.trim()));
        console.log('Updating next button, isValid:', isValid, 'date:', dateSelect.value, 'time:', timeSelect.value); // Depuración
        nextBtn.classList.toggle('hidden', !isValid);
    }

    content.querySelector('#prev-step')?.addEventListener('click', () => 
        navigateTo(state.reservation.location === 'home' ? 'location' : 'barber'));
    content.querySelector('#next-step')?.addEventListener('click', () => navigateTo('payment'));
}

function renderPaymentStep(content) {
    const paymentOptions = [
        { value: 'Plin (QR)', label: 'Plin (QR)', qr: 'assets/img/qr/qr_plin.png' },
        { value: 'Yape (QR)', label: 'Yape (QR)', qr: 'assets/img/qr/qr_yape.png' }
    ];
    content.innerHTML = `
        <div class="card">
            <h2 class="text-xl font-bold text-mustard mb-4">Pago</h2>
            <p class="text-gray-400 mb-4">Elige tu método de pago.</p>
            <div class="payment-method flex flex-col gap-3">
                ${paymentOptions.map(opt => `
                    <div class="flex items-center">
                        <input type="radio" id="${opt.value.toLowerCase().replace(/\s/g, '-')}" name="payment" value="${opt.value}" ${state.reservation.paymentMethod === opt.value ? 'checked' : ''} class="mr-2">
                        <label for="${opt.value.toLowerCase().replace(/\s/g, '-')}" class="payment-option flex-1 px-4 py-2 rounded-lg cursor-pointer" style="background-color: #6b7280; color: white;">${opt.label}</label>
                    </div>
                `).join('')}
            </div>
            <div id="qr-code" class="${state.reservation.paymentMethod ? '' : 'hidden'} transition-opacity duration-300 ease-in-out ${state.reservation.paymentMethod ? 'opacity-100' : 'opacity-0'}">
                <p class="text-gray-400 mb-2">Descarga el QR, realiza el pago y envía el comprobante tras confirmar tu reserva.</p>
                <img id="qr-image" src="${state.reservation.paymentMethod ? paymentOptions.find(opt => opt.value === state.reservation.paymentMethod)?.qr || '' : ''}" alt="Código QR" class="mt-2 max-w-full h-auto">
                <button class="btn w-full mt-4" id="download-qr" style="background-color: #6b7280; color: white;">Descargar QR</button>
            </div>
            <div class="flex gap-3 mt-4">
                <button class="btn w-full" id="prev-step">Volver</button>
                <button class="btn w-full ${state.reservation.paymentMethod ? '' : 'hidden'}" id="next-step">Continuar</button>
            </div>
        </div>`;
    
    const radios = content.querySelectorAll('input[name="payment"]');
    const qrContainer = content.querySelector('#qr-code');
    const qrImage = content.querySelector('#qr-image');
    const downloadBtn = content.querySelector('#download-qr');
    const nextBtn = content.querySelector('#next-step');

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            state.reservation.paymentMethod = radio.value;
            const option = paymentOptions.find(opt => opt.value === radio.value);
            if (option) {
                qrImage.src = option.qr;
                qrContainer.classList.remove('hidden');
                qrContainer.classList.remove('opacity-0');
                qrContainer.classList.add('opacity-100');
                nextBtn.classList.remove('hidden');
            } else {
                qrContainer.classList.add('hidden');
                nextBtn.classList.add('hidden');
            }
            saveReservationData();
            render();
        });
    });

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (qrImage.src) {
                const link = document.createElement('a');
                link.href = qrImage.src;
                link.download = `qr-${state.reservation.paymentMethod.toLowerCase().replace(/\s/g, '-')}.jpg`;
                link.click();
            }
        });
    }

    content.querySelector('#prev-step')?.addEventListener('click', () => navigateTo('schedule'));
    content.querySelector('#next-step')?.addEventListener('click', () => navigateTo('confirm'));
}

function renderConfirmStep(content) {
    if (!state.barbers || state.barbers.length === 0) {
        content.innerHTML = '<p class="text-gray-400 text-center">No hay barberos disponibles.</p>';
        return;
    }

    const barber = state.barbers.find(b => b.id === state.reservation.barberId) || state.barbers[0];
    const serviceTotal = state.reservation.services.reduce((sum, s) => sum + s.price, 0);
    const total = serviceTotal + state.reservation.homeServiceFee;

    content.innerHTML = `
        <div class="card">
            <h2 class="text-xl font-bold text-mustard mb-4">Confirmar Reserva</h2>
            <p class="text-gray-400 mb-4">Revisa los detalles.</p>
            <div class="flex flex-col gap-4">
                <div>
                    <h3 class="text-lg font-semibold text-white">Servicios</h3>
                    <ul class="flex flex-col gap-2">
                        ${state.reservation.services.map(s => `<li class="flex justify-between"><span>${s.name}</span><span class="text-mustard">S/${s.price}</span></li>`).join('')}
                    </ul>
                    ${state.reservation.homeServiceFee > 0 ? `<p class="text-mustard mt-2">Domicilio: S/${state.reservation.homeServiceFee}</p>` : ''}
                    <p class="text-mustard font-bold mt-2">Total: S/${total}</p>
                </div>
                <div><h3 class="text-lg font-semibold text-white">Ubicación</h3><p>${state.reservation.location === 'home' ? 'Domicilio' : 'Local'}</p></div>
                ${state.reservation.location === 'home' ? `
                    <div><h3 class="text-lg font-semibold text-white">Dirección</h3><p>${state.reservation.address}</p></div>
                    <div><h3 class="text-lg font-semibold text-white">Referencia</h3><p>${state.reservation.reference}</p></div>
                ` : ''}
                <div><h3 class="text-lg font-semibold text-white">Barbero</h3><p>${barber.name}</p></div>
                <div><h3 class="text-lg font-semibold text-white">Fecha y Hora</h3><p>${
                    state.reservation.schedule 
                        ? new Date(state.reservation.schedule).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) 
                        : 'No seleccionada'
                }</p></div>
                <div><h3 class="text-lg font-semibold text-white">Pago</h3><p>${state.reservation.paymentMethod || 'No seleccionado'} (Envía comprobante)</p></div>
            </div>
            <div class="flex gap-3 mt-4">
                <button class="btn w-full" id="prev-step">Volver</button>
                <button class="btn w-full" id="confirm-reservation">Confirmar</button>
            </div>
        </div>`;
    content.querySelector('#confirm-reservation')?.addEventListener('click', () => {
        const message = encodeURIComponent(`
Reserva confirmada:
Servicios: ${state.reservation.services.map(s => s.name).join(', ')}
Subtotal: S/${serviceTotal}
${state.reservation.homeServiceFee > 0 ? `Domicilio: S/${state.reservation.homeServiceFee}` : ''}
Total: S/${total}
Ubicación: ${state.reservation.location === 'home' ? 'Domicilio' : 'Local'}
${state.reservation.location === 'home' ? `Dirección: ${state.reservation.address}\nReferencia: ${state.reservation.reference}` : ''}
Barbero: ${barber.name}
Fecha: ${state.reservation.schedule ? new Date(state.reservation.schedule).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'No seleccionada'}
Pago: ${state.reservation.paymentMethod || 'No seleccionado'} (Envía comprobante)
        `.trim());
        window.open(`https://wa.me/+51920850690?text=${message}`, '_blank');
        localStorage.clear();
        state.reservation = { services: [], location: null, barberId: null, schedule: null, paymentMethod: null, address: '', reference: '', homeServiceFee: 0 };
        window.showToast('Reserva enviada por WhatsApp.');
        window.loadSection('servicios');
    });
    content.querySelector('#prev-step')?.addEventListener('click', () => navigateTo('payment'));
}