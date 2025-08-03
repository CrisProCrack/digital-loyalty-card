// CinnamonVapes Digital Loyalty Card - Main Application Logic

class LoyaltyCardApp {
    constructor() {
        this.customers = this.loadCustomers();
        this.init();
    }

    init() {
        // Initialize app when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }

    initializeApp() {
        // Setup form handlers for index page
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleCustomerRegistration(e));
        }

        // Setup demo data if no customers exist
        if (this.customers.length === 0) {
            this.createDemoData();
        }
    }

    // Customer Management
    loadCustomers() {
        const stored = localStorage.getItem('cinnamonvapes_customers');
        return stored ? JSON.parse(stored) : [];
    }

    saveCustomers() {
        localStorage.setItem('cinnamonvapes_customers', JSON.stringify(this.customers));
    }

    generateCustomerId() {
        return 'cv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createCustomer(name, contact) {
        const customer = {
            id: this.generateCustomerId(),
            name: name.trim(),
            contact: contact.trim(),
            stamps: 0,
            totalStamps: 0,
            rewardsRedeemed: 0,
            createdAt: new Date().toISOString(),
            lastStampAt: null,
            isActive: true
        };

        this.customers.push(customer);
        this.saveCustomers();
        return customer;
    }

    getCustomer(id) {
        return this.customers.find(c => c.id === id);
    }

    updateCustomer(id, updates) {
        const customerIndex = this.customers.findIndex(c => c.id === id);
        if (customerIndex !== -1) {
            this.customers[customerIndex] = { ...this.customers[customerIndex], ...updates };
            this.saveCustomers();
            return this.customers[customerIndex];
        }
        return null;
    }

    deleteCustomer(id) {
        const initialLength = this.customers.length;
        this.customers = this.customers.filter(c => c.id !== id);
        if (this.customers.length < initialLength) {
            this.saveCustomers();
            return true;
        }
        return false;
    }

    // Stamp Management
    addStamp(customerId) {
        const customer = this.getCustomer(customerId);
        if (!customer) return null;

        const updates = {
            stamps: customer.stamps + 1,
            totalStamps: customer.totalStamps + 1,
            lastStampAt: new Date().toISOString()
        };

        return this.updateCustomer(customerId, updates);
    }

    redeemReward(customerId) {
        const customer = this.getCustomer(customerId);
        if (!customer || customer.stamps < 6) return null;

        const updates = {
            stamps: 0, // Reset stamps after reward
            rewardsRedeemed: customer.rewardsRedeemed + 1
        };

        return this.updateCustomer(customerId, updates);
    }

    // Statistics
    getStatistics() {
        const activeCustomers = this.customers.filter(c => c.isActive);
        const totalStamps = this.customers.reduce((sum, c) => sum + c.totalStamps, 0);
        const totalRewards = this.customers.reduce((sum, c) => sum + c.rewardsRedeemed, 0);
        const completedCards = this.customers.filter(c => c.stamps === 6).length;
        
        let averageProgress = 0;
        if (activeCustomers.length > 0) {
            const totalProgress = activeCustomers.reduce((sum, c) => sum + (c.stamps / 6), 0);
            averageProgress = Math.round((totalProgress / activeCustomers.length) * 100);
        }

        return {
            totalCustomers: this.customers.length,
            activeCustomers: activeCustomers.length,
            totalStamps,
            totalRewards,
            completedCards,
            averageProgress
        };
    }

    // QR Code Generation
    generateQRCode(customerId) {
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '').replace('admin.html', '');
        const cardUrl = `${baseUrl}card.html?id=${customerId}`;
        
        // Using QR Server API for QR code generation
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cardUrl)}`;
        return {
            url: cardUrl,
            qrImageUrl: qrApiUrl
        };
    }

    // Form Handlers
    handleCustomerRegistration(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const name = formData.get('name');
        const contact = formData.get('contact');

        if (!name || !contact) {
            alert('Por favor completa todos los campos');
            return;
        }

        // Check if customer already exists
        const existingCustomer = this.customers.find(c => 
            c.contact.toLowerCase() === contact.toLowerCase()
        );

        if (existingCustomer) {
            if (confirm('Ya existe un cliente con este contacto. ¿Deseas ver su tarjeta?')) {
                window.location.href = `card.html?id=${existingCustomer.id}`;
            }
            return;
        }

        const customer = this.createCustomer(name, contact);
        
        // Show success message and redirect to card
        alert('¡Tarjeta creada exitosamente!');
        window.location.href = `card.html?id=${customer.id}`;
    }

    // Demo Data
    createDemoData() {
        const demoCustomers = [
            {
                name: 'María García',
                contact: 'maria.garcia@email.com',
                stamps: 3
            },
            {
                name: 'Carlos López',
                contact: '+34 600 123 456',
                stamps: 6
            },
            {
                name: 'Ana Martínez',
                contact: 'ana.martinez@email.com',
                stamps: 1
            },
            {
                name: 'David Rodríguez',
                contact: '+34 700 987 654',
                stamps: 4
            }
        ];

        demoCustomers.forEach(demo => {
            const customer = this.createCustomer(demo.name, demo.contact);
            if (demo.stamps > 0) {
                this.updateCustomer(customer.id, {
                    stamps: demo.stamps,
                    totalStamps: demo.stamps,
                    lastStampAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
                });
            }
        });
    }

    // Utility Functions
    formatDate(dateString) {
        if (!dateString) return 'Nunca';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    searchCustomers(query) {
        if (!query) return this.customers;
        
        const lowerQuery = query.toLowerCase();
        return this.customers.filter(customer =>
            customer.name.toLowerCase().includes(lowerQuery) ||
            customer.contact.toLowerCase().includes(lowerQuery)
        );
    }
}

// Global functions for HTML onclick handlers
function showCustomerForm() {
    const form = document.getElementById('customerForm');
    if (form) {
        form.classList.remove('hidden');
        document.getElementById('customerName').focus();
    }
}

function hideCustomerForm() {
    const form = document.getElementById('customerForm');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('registerForm').reset();
    }
}

// Initialize the app
const loyaltyApp = new LoyaltyCardApp();

// Make app globally available for other scripts
window.loyaltyApp = loyaltyApp;