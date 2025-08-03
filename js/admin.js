// CinnamonVapes Digital Loyalty Card - Admin Panel Logic

class AdminPanel {
    constructor(app) {
        this.app = app;
        this.currentTab = 'customers';
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeAdmin());
        } else {
            this.initializeAdmin();
        }
    }

    initializeAdmin() {
        this.setupEventListeners();
        this.updateAllContent();
    }

    setupEventListeners() {
        // Form handlers
        const adminAddForm = document.getElementById('adminAddForm');
        if (adminAddForm) {
            adminAddForm.addEventListener('submit', (e) => this.handleAddCustomer(e));
        }
    }

    // Tab Management
    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Add active class to clicked button
        event.target.classList.add('active');

        this.currentTab = tabName;
        this.updateTabContent(tabName);
    }

    updateTabContent(tabName) {
        switch (tabName) {
            case 'customers':
                this.updateCustomersList();
                break;
            case 'stamping':
                this.updateStampingList();
                break;
            case 'rewards':
                this.updateRewardsList();
                break;
            case 'stats':
                this.updateStatistics();
                break;
        }
    }

    updateAllContent() {
        this.updateCustomersList();
        this.updateStampingList();
        this.updateRewardsList();
        this.updateStatistics();
    }

    // Customer Management
    updateCustomersList() {
        const container = document.getElementById('customersList');
        if (!container) return;

        const customers = this.app.customers;
        
        if (customers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No hay clientes registrados</h3>
                    <p>Agrega el primer cliente para comenzar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = customers.map(customer => this.renderCustomerCard(customer)).join('');
    }

    renderCustomerCard(customer) {
        const qrCode = this.app.generateQRCode(customer.id);
        const progressPercentage = (customer.stamps / 6) * 100;
        const isCompleted = customer.stamps >= 6;

        return `
            <div class="customer-card ${isCompleted ? 'completed' : ''}">
                <div class="customer-info">
                    <h4>${customer.name}</h4>
                    <p>${customer.contact}</p>
                    <p><small>Creado: ${this.app.formatDate(customer.createdAt)}</small></p>
                    ${customer.lastStampAt ? `<p><small>Último sello: ${this.app.formatDate(customer.lastStampAt)}</small></p>` : ''}
                </div>
                
                <div class="customer-stamps">
                    <div class="stamps-row">
                        ${Array.from({length: 6}, (_, i) => `
                            <div class="stamp ${i < customer.stamps ? 'filled' : 'empty'}">
                                ${i === 5 && customer.stamps >= 6 ? '20%' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="progress-text">
                        ${customer.stamps}/6 sellos (${Math.round(progressPercentage)}%)
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-primary btn-small" onclick="adminPanel.viewCustomerCard('${customer.id}')">
                        Ver Tarjeta
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="adminPanel.addStampToCustomer('${customer.id}')">
                        Agregar Sello
                    </button>
                    ${isCompleted ? `
                        <button class="btn btn-outline btn-small" onclick="adminPanel.redeemCustomerReward('${customer.id}')">
                            Canjear Premio
                        </button>
                    ` : ''}
                    <button class="btn btn-outline btn-small" onclick="adminPanel.deleteCustomer('${customer.id}')" style="color: #dc3545; border-color: #dc3545;">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
    }

    filterCustomers() {
        const searchTerm = document.getElementById('customerSearch').value;
        const filteredCustomers = this.app.searchCustomers(searchTerm);
        
        const container = document.getElementById('customersList');
        if (container) {
            container.innerHTML = filteredCustomers.map(customer => this.renderCustomerCard(customer)).join('');
        }
    }

    handleAddCustomer(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const name = formData.get('name');
        const contact = formData.get('contact');

        if (!name || !contact) {
            alert('Por favor completa todos los campos');
            return;
        }

        // Check if customer already exists
        const existingCustomer = this.app.customers.find(c => 
            c.contact.toLowerCase() === contact.toLowerCase()
        );

        if (existingCustomer) {
            alert('Ya existe un cliente con este contacto');
            return;
        }

        const customer = this.app.createCustomer(name, contact);
        
        // Reset form and hide it
        event.target.reset();
        this.hideAddCustomerForm();
        
        // Update customer list
        this.updateCustomersList();
        
        alert('Cliente agregado exitosamente');
    }

    showAddCustomerForm() {
        const form = document.getElementById('addCustomerForm');
        if (form) {
            form.classList.remove('hidden');
            document.getElementById('adminCustomerName').focus();
        }
    }

    hideAddCustomerForm() {
        const form = document.getElementById('addCustomerForm');
        if (form) {
            form.classList.add('hidden');
            document.getElementById('adminAddForm').reset();
        }
    }

    viewCustomerCard(customerId) {
        window.open(`card.html?id=${customerId}`, '_blank');
    }

    deleteCustomer(customerId) {
        const customer = this.app.getCustomer(customerId);
        if (!customer) return;

        if (confirm(`¿Estás seguro de que quieres eliminar la tarjeta de ${customer.name}?`)) {
            this.app.deleteCustomer(customerId);
            this.updateAllContent();
            alert('Cliente eliminado exitosamente');
        }
    }

    // Stamping Management
    updateStampingList() {
        const container = document.getElementById('stampCustomersList');
        if (!container) return;

        const activeCustomers = this.app.customers.filter(c => c.isActive && c.stamps < 6);
        
        if (activeCustomers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No hay clientes disponibles para marcar</h3>
                    <p>Todos los clientes tienen sus tarjetas completas o no hay clientes registrados</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activeCustomers.map(customer => this.renderStampingCard(customer)).join('');
    }

    renderStampingCard(customer) {
        const progressPercentage = (customer.stamps / 6) * 100;

        return `
            <div class="customer-card">
                <div class="customer-info">
                    <h4>${customer.name}</h4>
                    <p>${customer.contact}</p>
                </div>
                
                <div class="customer-stamps">
                    <div class="stamps-row">
                        ${Array.from({length: 6}, (_, i) => `
                            <div class="stamp ${i < customer.stamps ? 'filled' : 'empty'}"></div>
                        `).join('')}
                    </div>
                    <div class="progress-text">
                        ${customer.stamps}/6 sellos (${Math.round(progressPercentage)}%)
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-primary" onclick="adminPanel.addStampToCustomer('${customer.id}')">
                        <span class="btn-icon">🔖</span>
                        Marcar Compra
                    </button>
                </div>
            </div>
        `;
    }

    filterStampCustomers() {
        const searchTerm = document.getElementById('stampSearch').value;
        const activeCustomers = this.app.customers.filter(c => c.isActive && c.stamps < 6);
        const filteredCustomers = activeCustomers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.contact.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const container = document.getElementById('stampCustomersList');
        if (container) {
            container.innerHTML = filteredCustomers.map(customer => this.renderStampingCard(customer)).join('');
        }
    }

    addStampToCustomer(customerId) {
        const customer = this.app.getCustomer(customerId);
        if (!customer) return;

        if (customer.stamps >= 6) {
            alert('Esta tarjeta ya está completa. Ve a la pestaña "Canjear Recompensas"');
            return;
        }

        const updatedCustomer = this.app.addStamp(customerId);
        
        if (updatedCustomer.stamps === 6) {
            alert(`¡Felicitaciones! ${customer.name} ha completado su tarjeta y puede canjear su 20% de descuento.`);
        } else {
            alert(`Sello agregado. ${customer.name} tiene ${updatedCustomer.stamps}/6 sellos.`);
        }

        this.updateAllContent();
    }

    // Rewards Management
    updateRewardsList() {
        const container = document.getElementById('rewardsCustomersList');
        if (!container) return;

        const completedCustomers = this.app.customers.filter(c => c.stamps >= 6);
        
        if (completedCustomers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No hay recompensas para canjear</h3>
                    <p>Los clientes aparecerán aquí cuando completen sus tarjetas</p>
                </div>
            `;
            return;
        }

        container.innerHTML = completedCustomers.map(customer => this.renderRewardCard(customer)).join('');
    }

    renderRewardCard(customer) {
        return `
            <div class="customer-card completed">
                <div class="customer-info">
                    <h4>${customer.name}</h4>
                    <p>${customer.contact}</p>
                    <p><strong>🎁 ¡Tarjeta completa!</strong></p>
                    <p><small>Completada: ${this.app.formatDate(customer.lastStampAt)}</small></p>
                </div>
                
                <div class="customer-stamps">
                    <div class="stamps-row">
                        ${Array.from({length: 6}, (_, i) => `
                            <div class="stamp filled">
                                ${i === 5 ? '20%' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="progress-text">
                        <strong>¡Listo para canjear 20% de descuento!</strong>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-primary" onclick="adminPanel.redeemCustomerReward('${customer.id}')">
                        <span class="btn-icon">🎁</span>
                        Canjear Recompensa
                    </button>
                    <button class="btn btn-outline" onclick="adminPanel.viewCustomerCard('${customer.id}')">
                        Ver Tarjeta
                    </button>
                </div>
            </div>
        `;
    }

    redeemCustomerReward(customerId) {
        const customer = this.app.getCustomer(customerId);
        if (!customer) return;

        if (customer.stamps < 6) {
            alert('Esta tarjeta no está completa aún');
            return;
        }

        if (confirm(`¿Confirmar canje de recompensa de 20% de descuento para ${customer.name}?`)) {
            this.app.redeemReward(customerId);
            alert(`¡Recompensa canjeada! La tarjeta de ${customer.name} ha sido reiniciada.`);
            this.updateAllContent();
        }
    }

    // Statistics
    updateStatistics() {
        const stats = this.app.getStatistics();

        // Update stat cards
        this.updateStatElement('totalCustomers', stats.totalCustomers);
        this.updateStatElement('totalStamps', stats.totalStamps);
        this.updateStatElement('totalRewards', stats.totalRewards);
        this.updateStatElement('activeCards', stats.activeCustomers);
        this.updateStatElement('completedCards', stats.completedCards);
        this.updateStatElement('averageProgress', stats.averageProgress + '%');
    }

    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
}

// Global functions for HTML onclick handlers
function showTab(tabName) {
    if (window.adminPanel) {
        window.adminPanel.showTab(tabName);
    }
}

function showAddCustomerForm() {
    if (window.adminPanel) {
        window.adminPanel.showAddCustomerForm();
    }
}

function hideAddCustomerForm() {
    if (window.adminPanel) {
        window.adminPanel.hideAddCustomerForm();
    }
}

function filterCustomers() {
    if (window.adminPanel) {
        window.adminPanel.filterCustomers();
    }
}

function filterStampCustomers() {
    if (window.adminPanel) {
        window.adminPanel.filterStampCustomers();
    }
}

// Initialize admin panel when app is ready
if (window.loyaltyApp) {
    window.adminPanel = new AdminPanel(window.loyaltyApp);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.loyaltyApp) {
                window.adminPanel = new AdminPanel(window.loyaltyApp);
            }
        }, 100);
    });
}