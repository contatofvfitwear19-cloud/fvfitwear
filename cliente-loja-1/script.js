// ==========================================
// FUNÇÃO: CARREGAR PRODUTOS NA VITRINE
// ==========================================
async function loadClientProducts() {
    try {
        const response = await fetch('http://localhost:3333/api/products');
        const products = await response.json();

        const grid = document.querySelector('.products-grid');
        if (!grid) return;
        
        grid.innerHTML = '';

        products.forEach(product => {
            const formattedPrice = product.price.toLocaleString('pt-BR', { 
                style: 'currency',
                currency: 'BRL'
            });

            const isEsgotado = product.stock === 0;
            const cardStyle = isEsgotado ? 'opacity: 0.5; pointer-events: none;' : '';
            const badgeEsgotado = isEsgotado ? '<span style="position:absolute; top:10px; left:10px; background:red; color:white; padding:5px 10px; font-size:12px; font-weight:bold; border-radius:4px;">ESGOTADO</span>' : '';

            grid.innerHTML += `
                <div class="product-item" data-category="${product.category}" style="${cardStyle}">
                    <a href="produto.html?id=${product.id}" onclick="localStorage.setItem('fv_current_product', '${product.id}')" class="product-link">
                        <div class="product-img" style="position: relative;">
                            ${badgeEsgotado}
                            <img src="${product.imageUrl}" alt="${product.name}">
                        </div>
                        <div class="product-info">
                            <h3>${product.name.toUpperCase()}</h3>
                            <p class="price">${formattedPrice}</p>
                        </div>
                    </a>
                </div>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar produtos na vitrine:', error);
    }
}

// ==========================================
// LÓGICA PRINCIPAL DA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCounts = document.querySelectorAll('.cart-icon span');
    const btnFinish = document.querySelector('.finish-order');
    const totalDisplay = document.getElementById('cart-total-display');
    const searchToggle = document.querySelector('.search-toggle');
    const searchDropdown = document.querySelector('.search-dropdown');
    const searchInput = document.getElementById('search-input');

    window.renderCart = function() {
        let cart = JSON.parse(localStorage.getItem('fv_cart')) || [];
        const cartCounts = document.querySelectorAll('.cart-icon span, .cart-counter');
        const cartItemsContainer = document.querySelector('.cart-items');
        const totalDisplay = document.getElementById('cart-total-display');

        // Atualiza contadores de itens pelas telas
        cartCounts.forEach(count => {
            count.innerText = cart.length;
        });

        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = `<p class="empty-cart-message">O seu carrinho está vazio.</p>`;
            if (totalDisplay) totalDisplay.innerHTML = '';
            return;
        }

        let total = 0;

        cart.forEach((item, index) => {
            // Tratamento sênior de string/número para evitar quebra do .replace()
            let priceString = String(item.price || "0");
            let priceValue = parseFloat(priceString.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
            
            const qty = parseInt(item.quantity) || 1;
            total += priceValue * qty;

            // Formata o preço unitário para exibição bonita na tela
            const formattedUnitPrice = priceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            cartItemsContainer.innerHTML += `
                <div class="cart-item-box" style="display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #222; padding-bottom: 10px;">
                    <img src="${item.img}" alt="${item.name}" width="50" style="border-radius: 4px; object-fit: cover; height: 60px;">
                    <div class="cart-item-content" style="flex: 1;">
                        <h4 style="margin: 0; color: #fff; font-size: 14px;">${item.name}</h4>
                        <p style="margin: 4px 0; color: #aaa; font-size: 12px;">${formattedUnitPrice} x ${qty} | Tam: ${item.size}</p>
                        <small style="color: #d4af37; font-size: 11px;">Cor: ${item.color}</small>
                    </div>
                    <button class="remove-item-btn" onclick="removeFromCart(${index})" style="background: transparent; border: none; color: red; font-size: 20px; cursor: pointer;">&times;</button>
                </div>
            `;
        });

        if (totalDisplay) {
            totalDisplay.innerHTML = `<strong style="color: #d4af37; font-size: 18px;">TOTAL: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
        }
    }

    window.removeFromCart = function(index) {
        let cart = JSON.parse(localStorage.getItem('fv_cart')) || [];
        cart.splice(index, 1);
        localStorage.setItem('fv_cart', JSON.stringify(cart));
        window.renderCart();
    };

    const openCart = () => {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
        window.renderCart();
    };

    const closeCart = () => {
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
    };

    document.querySelectorAll('.cart-icon').forEach(icon => {
        icon.addEventListener('click', openCart);
    });

    document.querySelector('.close-cart')?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);

    // FILTRO DE CATEGORIAS
    const categoryTriggers = document.querySelectorAll('.category-trigger, .category-card button');
    categoryTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            let cat = trigger.getAttribute('data-cat') || trigger.closest('.category-card')?.querySelector('span').innerText.toLowerCase();
            if (!cat) return;

            const tituloVitrine = document.getElementById('titulo-categoria');
            if (tituloVitrine) tituloVitrine.innerText = cat.toUpperCase();

            document.querySelectorAll('.product-item').forEach(product => {
                const productCategory = product.getAttribute('data-category');
                product.style.display = (productCategory === cat) ? 'block' : 'none';
            });

            document.getElementById('vitrine-produtos').scrollIntoView({ behavior: 'smooth' });
        });
    });

    // BUSCA
    searchToggle?.addEventListener('click', () => {
        searchDropdown.classList.toggle('active');
        searchInput.focus();
    });

    searchInput?.addEventListener('input', () => {
        const value = searchInput.value.toLowerCase();
        document.querySelectorAll('.product-item').forEach(product => {
            const title = product.querySelector('h3').innerText.toLowerCase();
            product.style.display = title.includes(value) ? 'block' : 'none';
        });
    });

    // CHECKOUT INTEGRADO VIA WHATSAPP COM EMOJIS
    btnFinish?.addEventListener('click', async () => {
        let cart = JSON.parse(localStorage.getItem('fv_cart')) || [];
        const address = document.getElementById('cart-address').value.trim();
        const number = document.getElementById('cart-number').value.trim();
        const payment = document.getElementById('cart-payment').value;

        if (cart.length === 0) {
            alert('Seu carrinho está vazio!');
            return;
        }

        if (!address || !number) {
            alert('Por favor, preencha a Rua/Bairro e o Número da entrega.');
            return;
        }

        // Design Textual Moderno com Emojis e formatação nativa do WhatsApp
        let msg = `🛍️ *NOVO PEDIDO - FV FITWEAR* 🛍️\n\n`;
        msg += `📦 *[ITENS DO PEDIDO]*\n\n`;
        let total = 0;

        cart.forEach(item => {
            const qty = parseInt(item.quantity) || 1;
            msg += `> 🏷️ *${item.name.toUpperCase()}* (x${qty})\n`;
            msg += `  📏 Tamanho: ${item.size}\n`;
            msg += `  🎨 Cor: ${item.color}\n`;
            msg += `  💵 Valor Unitário: ${item.price}\n\n`;

            // Tratamento seguro de preço para o faturamento
            let priceString = String(item.price || "0");
            let priceValue = parseFloat(priceString.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
            total += priceValue * qty;
        });

        msg += `-----------------------------\n`;
        msg += `💰 *TOTAL A PAGAR:* R$ ${total.toFixed(2).replace('.', ',')}\n`;
        msg += `-----------------------------\n\n`;
        
        msg += `📍 *[ENDEREÇO DE ENTREGA]*\n`;
        msg += `🏠 ${address}, Nº ${number}\n\n`;
        
        msg += `💳 *[FORMA DE PAGAMENTO]*\n`;
        if (payment === 'Dinheiro') {
            msg += `💵 Dinheiro\n_(Por favor, informe se precisará de troco e para quanto)_\n\n`;
        } else {
            msg += `💳 ${payment}\n\n`;
        }
        msg += `🙏 Obrigado pela preferência! Aguardo a sua confirmação.`;

        const encodedMsg = encodeURIComponent(msg);
        const phone = '+5518998250535';

        const orderData = {
            address: `${address}, No ${number}`,
            paymentMethod: payment,
            total: total,
            items: cart.map(item => {
                let priceString = String(item.price || "0");
                let cleanPrice = priceString.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                return {
                    productId: item.productId || item.id,
                    name: item.name,
                    price: cleanPrice,
                    size: item.size,
                    color: item.color,
                    quantity: parseInt(item.quantity) || 1
                };
            })
        };

        try {
            const response = await fetch('http://localhost:3333/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) throw new Error("Erro ao persistir pedido no SQLite");

            localStorage.removeItem('fv_cart');
            window.renderCart(); // Limpa a interface do carrinho
            window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
        } catch (error) {
            console.error("Erro ao conectar com o banco:", error);
            alert("Ocorreu um erro ao processar o pedido no sistema. O WhatsApp será aberto para não perder a venda.");
            window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
        }
    });

    renderCart();
    loadClientProducts();
});
