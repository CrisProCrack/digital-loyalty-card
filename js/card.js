// CinnamonVapes Digital Loyalty Card - Individual Card Logic

class CustomerCard {
    constructor(app) {
        this.app = app;
        this.customerId = this.getCustomerIdFromUrl();
        this.customer = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeCard());
        } else {
            this.initializeCard();
        }
    }

    initializeCard() {
        if (!this.customerId) {
            this.showCardNotFound();
            return;
        }

        this.customer = this.app.getCustomer(this.customerId);
        
        if (!this.customer) {
            this.showCardNotFound();
            return;
        }

        this.renderCard();
        this.setupEventListeners();
    }

    getCustomerIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    showCardNotFound() {
        const cardDisplay = document.getElementById('cardDisplay');
        const cardNotFound = document.getElementById('cardNotFound');
        
        if (cardDisplay) cardDisplay.classList.add('hidden');
        if (cardNotFound) cardNotFound.classList.remove('hidden');
    }

    renderCard() {
        const cardDisplay = document.getElementById('cardDisplay');
        if (!cardDisplay) return;

        const qrCode = this.app.generateQRCode(this.customer.id);
        const progressPercentage = (this.customer.stamps / 6) * 100;
        const isCompleted = this.customer.stamps >= 6;
        
        cardDisplay.innerHTML = `
            <div class="loyalty-card">
                <div class="card-header-info">
                    <div class="customer-details">
                        <h3>${this.customer.name}</h3>
                        <p>${this.customer.contact}</p>
                    </div>
                    <img src="assets/logo.svg" alt="CinnamonVapes" class="card-logo">
                </div>

                <div class="progress-section">
                    <h4>Progreso de Fidelización</h4>
                    <div class="customer-stamps">
                        <div class="stamps-row">
                            ${Array.from({length: 6}, (_, i) => `
                                <div class="stamp ${i < this.customer.stamps ? 'filled' : 'empty'}">
                                    ${i === 5 && this.customer.stamps >= 6 ? '20%' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    
                    <p>${this.customer.stamps}/6 compras completadas</p>
                    
                    ${isCompleted ? `
                        <div class="reward-ready">
                            <h4>🎉 ¡Felicitaciones!</h4>
                            <p>Tu tarjeta está completa. Presenta esta pantalla en CinnamonVapes para obtener tu <strong>20% de descuento</strong> en tu próxima compra.</p>
                        </div>
                    ` : `
                        <p>Te faltan <strong>${6 - this.customer.stamps} compra${6 - this.customer.stamps !== 1 ? 's' : ''}</strong> para obtener tu 20% de descuento.</p>
                    `}
                </div>

                <div class="qr-section">
                    <h4>Tu código QR</h4>
                    <div class="qr-code">
                        <img src="${qrCode.qrImageUrl}" alt="Código QR" style="width: 100%; height: auto;">
                    </div>
                    <p class="qr-text">Presenta este código en cada compra</p>
                </div>

                <div class="card-stats">
                    <div class="stat-row">
                        <span>Miembro desde:</span>
                        <span>${this.formatCreatedDate()}</span>
                    </div>
                    <div class="stat-row">
                        <span>Total de compras:</span>
                        <span>${this.customer.totalStamps}</span>
                    </div>
                    <div class="stat-row">
                        <span>Recompensas canjeadas:</span>
                        <span>${this.customer.rewardsRedeemed}</span>
                    </div>
                    ${this.customer.lastStampAt ? `
                        <div class="stat-row">
                            <span>Última compra:</span>
                            <span>${this.app.formatDate(this.customer.lastStampAt)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add CSS for card stats
        if (!document.getElementById('cardStatsStyles')) {
            const style = document.createElement('style');
            style.id = 'cardStatsStyles';
            style.textContent = `
                .card-stats {
                    margin-top: 25px;
                    padding-top: 25px;
                    border-top: 1px solid rgba(255,255,255,0.3);
                }
                
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    font-size: 0.9rem;
                }
                
                .stat-row:not(:last-child) {
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                }
                
                .reward-ready {
                    background: rgba(255,255,255,0.2);
                    padding: 20px;
                    border-radius: var(--border-radius-small);
                    margin: 15px 0;
                    text-align: center;
                }
                
                .reward-ready h4 {
                    margin-bottom: 10px;
                    font-size: 1.3rem;
                }
            `;
            document.head.appendChild(style);
        }
    }

    formatCreatedDate() {
        const date = new Date(this.customer.createdAt);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    setupEventListeners() {
        // Auto-refresh card data every 30 seconds
        setInterval(() => {
            this.refreshCard();
        }, 30000);
    }

    refreshCard() {
        // Reload customer data in case it was updated
        this.customer = this.app.getCustomer(this.customerId);
        if (this.customer) {
            this.renderCard();
        }
    }

    // Share functionality
    shareCard() {
        const qrCode = this.app.generateQRCode(this.customer.id);
        const shareLink = document.getElementById('shareLink');
        
        if (shareLink) {
            shareLink.value = qrCode.url;
        }
        
        this.showShareModal();
    }

    showShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    closeShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        if (shareLink) {
            shareLink.select();
            shareLink.setSelectionRange(0, 99999); // For mobile devices
            
            try {
                document.execCommand('copy');
                alert('Enlace copiado al portapapeles');
            } catch (err) {
                // Fallback for modern browsers
                navigator.clipboard.writeText(shareLink.value).then(() => {
                    alert('Enlace copiado al portapapeles');
                }).catch(() => {
                    alert('No se pudo copiar el enlace');
                });
            }
        }
    }

    shareViaWhatsApp() {
        const qrCode = this.app.generateQRCode(this.customer.id);
        const message = encodeURIComponent(
            `¡Mira mi tarjeta de fidelización de CinnamonVapes! 🔖\n\n` +
            `Tengo ${this.customer.stamps}/6 sellos. ` +
            `${this.customer.stamps >= 6 ? '¡Ya puedo canjear mi 20% de descuento! 🎉' : `Me faltan ${6 - this.customer.stamps} para mi descuento.`}\n\n` +
            `Ver tarjeta: ${qrCode.url}`
        );
        
        window.open(`https://wa.me/?text=${message}`, '_blank');
    }

    shareViaEmail() {
        const qrCode = this.app.generateQRCode(this.customer.id);
        const subject = encodeURIComponent('Mi tarjeta CinnamonVapes');
        const body = encodeURIComponent(
            `¡Hola!\n\n` +
            `Te comparto mi tarjeta de fidelización de CinnamonVapes.\n\n` +
            `Actualmente tengo ${this.customer.stamps}/6 sellos. ` +
            `${this.customer.stamps >= 6 ? '¡Ya puedo canjear mi 20% de descuento!' : `Me faltan ${6 - this.customer.stamps} compras para obtener mi descuento del 20%.`}\n\n` +
            `Puedes ver mi tarjeta en: ${qrCode.url}\n\n` +
            `¡Saludos!`
        );
        
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    }

    // Download QR code
    downloadCard() {
        const qrCode = this.app.generateQRCode(this.customer.id);
        
        // Create a temporary link to download the QR image
        const link = document.createElement('a');
        link.href = qrCode.qrImageUrl;
        link.download = `cinnamonvapes-qr-${this.customer.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('Código QR descargado. Guárdalo para presentarlo en tus compras.');
    }
}

// Global functions for HTML onclick handlers
function shareCard() {
    if (window.customerCard) {
        window.customerCard.shareCard();
    }
}

function closeShareModal() {
    if (window.customerCard) {
        window.customerCard.closeShareModal();
    }
}

function copyShareLink() {
    if (window.customerCard) {
        window.customerCard.copyShareLink();
    }
}

function shareViaWhatsApp() {
    if (window.customerCard) {
        window.customerCard.shareViaWhatsApp();
    }
}

function shareViaEmail() {
    if (window.customerCard) {
        window.customerCard.shareViaEmail();
    }
}

function downloadCard() {
    if (window.customerCard) {
        window.customerCard.downloadCard();
    }
}

// Initialize customer card when app is ready
if (window.loyaltyApp) {
    window.customerCard = new CustomerCard(window.loyaltyApp);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.loyaltyApp) {
                window.customerCard = new CustomerCard(window.loyaltyApp);
            }
        }, 100);
    });
}