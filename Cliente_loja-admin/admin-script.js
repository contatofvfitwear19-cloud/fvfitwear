function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

function showSection(sectionId, element) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(sec => sec.classList.remove('active'));

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => link.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }

    const titles = {
        'dashboard': 'Visão Geral',
        'produtos': 'Gerenciamento de Estoque',
        'pedidos': 'Gerenciamento de Pedidos',
        'clientes': 'Base de Clientes'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.innerText = titles[sectionId] || 'Painel';
    }

    if (sectionId === 'pedidos' || sectionId === 'dashboard') {
        loadOrders();
    }

    if (window.innerWidth < 992) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    }
}

async function openProductModal(mode = 'new', id = null) {
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');

    form.dataset.mode = mode;
    form.dataset.editId = id || '';

    if (modal) {
        modal.style.display = 'flex';
        
        if (mode === 'edit') {
            modalTitle.innerText = 'Editar Produto';
            form.querySelector('.btn-save').innerText = 'SALVAR ALTERAÇÕES';
            
            try {
                const response = await fetch(`http://localhost:3333/api/products/${id}`);
                const product = await response.json();
                
                document.querySelector('input[placeholder="Ex: Top Strong Greek"]').value = product.name;
                document.getElementById('productPrice').value = product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                document.querySelector('input[placeholder="0"]').value = product.stock;
                
                const catSelect = document.getElementById('productCategory');
                if(catSelect) catSelect.value = product.category;
                
                const display = document.getElementById('selectedColors');
                display.innerHTML = '';
                if (product.colors) {
                    product.colors.split(',').forEach(color => {
                        display.innerHTML += `
                            <div class="color-tag">
                                <div class="color-preview" style="background: ${color}"></div>
                                <span>${color}</span>
                                <span class="remove-color" onclick="this.parentElement.remove()">×</span>
                            </div>
                        `;
                    });
                }
                
                document.querySelectorAll('.size-options input[type="checkbox"]').forEach(cb => cb.checked = false);
                document.getElementById('extraSizes').value = '';
                
                if (product.sizes) {
                    const sizesArr = product.sizes.split(',');
                    const extraSizesArr = [];
                    
                    sizesArr.forEach(s => {
                        const checkbox = document.querySelector(`.size-options input[value="${s}"]`);
                        if (checkbox) checkbox.checked = true;
                        else extraSizesArr.push(s);
                    });
                    
                    if (extraSizesArr.length > 0) {
                        document.getElementById('extraSizes').value = extraSizesArr.join(', ');
                    }
                }

            } catch (error) {
                console.error(error);
                alert('Erro ao puxar as informações do produto.');
            }

        } else {
            modalTitle.innerText = 'Novo Produto';
            form.reset();
            document.getElementById('selectedColors').innerHTML = '';
            form.querySelector('.btn-save').innerText = 'SALVAR NO SISTEMA';
        }
    }
}

const priceInput = document.getElementById('productPrice');

if (priceInput) {
    priceInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, "");
        
        if (!value) {
            e.target.value = "";
            return;
        }

        value = (parseInt(value) / 100).toLocaleString('pt-BR', { 
            style: 'currency',
            currency: 'BRL'
        });

        e.target.value = value;
    });
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeProductModal();
    }
});

async function renderCharts() {
    const salesCanvas = document.getElementById('mainSalesChart');
    const categoryCanvas = document.getElementById('categoryChart');

    try {
        // Busca os dados reais de Pedidos e Produtos do banco
        const [ordersRes, productsRes] = await Promise.all([
            fetch('http://localhost:3333/api/orders'),
            fetch('http://localhost:3333/api/products?all=true')
        ]);
        
        const orders = await ordersRes.json();
        const products = await productsRes.json();

        // ---- LÓGICA DO GRÁFICO DE FATURAMENTO (Últimos 7 pedidos como exemplo) ----
        // Pega os últimos pedidos válidos e extrai o total
        const validOrders = orders.filter(o => o.status !== 'Cancelado').slice(0, 7).reverse();
        const salesLabels = validOrders.map(o => new Date(o.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}));
        const salesData = validOrders.map(o => o.total);

        if (salesCanvas) {
            const ctxSales = salesCanvas.getContext('2d');
            new Chart(ctxSales, {
                type: 'line',
                data: {
                    labels: salesLabels.length > 0 ? salesLabels : ['Sem vendas'],
                    datasets: [{
                        label: 'Vendas (R$)',
                        data: salesData.length > 0 ? salesData : [0],
                        borderColor: '#d4af37',
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        // ---- LÓGICA DO GRÁFICO DE CATEGORIAS (Pizza) ----
        let catFeminino = 0;
        let catMasculino = 0;
        let catGeral = 0;

        products.forEach(p => {
            const cat = p.category.toLowerCase();
            if (cat.includes('fem')) catFeminino++;
            else if (cat.includes('masc')) catMasculino++;
            else catGeral++;
        });

        if (categoryCanvas) {
            const ctxCat = categoryCanvas.getContext('2d');
            new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: ['Feminino', 'Masculino', 'Geral/Acessórios'],
                    datasets: [{
                        data: [catFeminino, catMasculino, catGeral],
                        backgroundColor: ['#d4af37', '#0d0d0d', '#555555']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

    } catch (error) {
        console.error("Erro ao gerar gráficos dinâmicos:", error);
    }
}

function addColorTag() {
    const colorPicker = document.getElementById('productColor');
    const display = document.getElementById('selectedColors');
    
    const selectedColor = colorPicker.value.toUpperCase();

    const existingColors = Array.from(display.querySelectorAll('span:not(.remove-color)')).map(el => el.innerText);
    if (existingColors.includes(selectedColor)) return;

    const tag = document.createElement('div');
    tag.className = 'color-tag';
    tag.innerHTML = `
        <div class="color-preview" style="background: ${selectedColor}"></div>
        <span>${selectedColor}</span>
        <span class="remove-color" onclick="this.parentElement.remove()">×</span>
    `;
    display.appendChild(tag);
}

const productForm = document.getElementById('productForm');

if (productForm) {
    productForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const name = document.querySelector('input[placeholder="Ex: Top Strong Greek"]').value.trim();
        const priceString = document.getElementById('productPrice').value;
        const stock = document.querySelector('input[placeholder="0"]').value;
        const category = document.getElementById('productCategory').value;
        const imageFile = document.querySelector('input[type="file"]').files[0];

        const colorElements = document.querySelectorAll('.color-tag span:not(.remove-color)');
        const colorsArray = Array.from(colorElements).map(el => el.innerText);

        const sizeCheckboxes = document.querySelectorAll('.size-options input[type="checkbox"]:checked');
        const sizesArray = Array.from(sizeCheckboxes).map(cb => cb.value);
        
        const extraSizes = document.getElementById('extraSizes').value;
        if (extraSizes) {
            sizesArray.push(...extraSizes.split(',').map(s => s.trim()));
        }

        if (!name) return alert('Opa! Você esqueceu de dar um nome para o produto.');
        if (!priceString || priceString === 'R$ 0,00') return alert('Ei, o produto não pode ser de graça! Informe o preço.');
        if (!stock) return alert('Quantas peças temos? Preencha o estoque inicial.');
        if (colorsArray.length === 0) return alert('Por favor, adicione pelo menos uma cor para a peça!');
        if (sizesArray.length === 0) return alert('Não esqueça de selecionar os tamanhos disponíveis!');
        if (!imageFile) return alert('Uma imagem vale mais que mil palavras! Escolha uma foto para o produto.');
        
        const cleanPrice = priceString.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();

        const formData = new FormData();
        formData.append('name', name);
        formData.append('price', cleanPrice);
        formData.append('stock', stock);
        formData.append('category', category);
        formData.append('colors', colorsArray.join(','));
        formData.append('sizes', sizesArray.join(','));
        formData.append('image', imageFile);

        try {
            const btnSubmit = productForm.querySelector('.btn-save');
            btnSubmit.innerText = 'SALVANDO...';
            btnSubmit.disabled = true;

            const mode = productForm.dataset.mode || 'new';
            const editId = productForm.dataset.editId;

            const url = mode === 'edit'
                ? `http://localhost:3333/api/products/${editId}`
                : 'http://localhost:3333/api/products';
                
            const method = mode === 'edit' ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });

            if (response.ok) {
                alert(`Tudo certo! Produto ${mode === 'edit' ? 'atualizado' : 'cadastrado'} com sucesso 🚀`);
                closeProductModal();
                loadAdminProducts();
            } else {
                alert('Ops, tivemos um problema ao salvar no banco. Tente novamente!');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Não conseguimos falar com o servidor. O Back-end está rodando?');
        } finally {
            const btnSubmit = productForm.querySelector('.btn-save');
            btnSubmit.innerText = productForm.dataset.mode === 'edit' ? 'SALVAR ALTERAÇÕES' : 'SALVAR NO SISTEMA';
            btnSubmit.disabled = false;
        }
    });
}

const colorPicker = document.getElementById('productColor');
const colorHex = document.getElementById('colorHex');

if (colorPicker && colorHex) {
    colorPicker.addEventListener('input', (e) => {
        colorHex.value = e.target.value.toUpperCase();
    });

    colorHex.addEventListener('input', (e) => {
        let val = e.target.value;
        if (!val.startsWith('#')) {
            val = '#' + val;
            e.target.value = val;
        }
        if (val.length === 7) {
            colorPicker.value = val;
        }
    });
}

async function loadAdminProducts() {
    try {
        const response = await fetch('http://localhost:3333/api/products?all=true');
        const products = await response.json();

        const tbody = document.querySelector('#produtos tbody');
        if (tbody) tbody.innerHTML = '';

        products.forEach(product => {
            const formattedPrice = product.price.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            const eyeIcon = product.active ? 'fa-eye' : 'fa-eye-slash';
            const eyeColor = product.active ? '#333' : '#ccc';

            tbody.innerHTML += `
                <tr style="opacity: ${product.active ? '1' : '0.5'}">
                    <td><img src="${product.imageUrl}" width="40" style="border-radius:4px; height: 50px; object-fit: cover;"></td>
                    <td>${product.name}</td>
                    <td>${formattedPrice}</td>
                    <td>${product.stock}</td>
                    <td>
                        <i class="fas fa-edit" onclick="openProductModal('edit', '${product.id}')" title="Editar" style="cursor:pointer; margin-right: 10px;"></i>
                        <i class="fas ${eyeIcon}" style="color: ${eyeColor}; cursor: pointer;"
                        onclick="toggleVisibility('${product.id}', ${!product.active})" title="Ocultar/Mostrar"></i>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar produtos do admin:', error);
    }
}

async function toggleVisibility(id, newStatus) {
    console.log(`Tentando mudar o status do produto ${id} para: ${newStatus}`);
    try {
        const response = await fetch(`http://localhost:3333/api/products/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: newStatus })
        });
        
        if (response.ok) {
            loadAdminProducts();
        } else {
            console.error('Erro no servidor:', await response.text());
            alert('Falha ao atualizar o status no banco de dados.');
        }
    } catch (error) {
        console.error('Erro no Fetch:', error);
        alert('Erro ao tentar se comunicar com o Back-end.');
    }
}

async function deleteProduct(id) {
    if (confirm('Atenção: Tem certeza que deseja excluir este produto definitivamente? Essa ação não pode ser desfeita.')) {
        try {
            const response = await fetch(`http://localhost:3333/api/products/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Produto excluído com sucesso!');
                loadAdminProducts();
            } else {
                alert('Ops, ocorreu um erro ao excluir.');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Falha na comunicação com o servidor.');
        }
    }
}

// ==========================================
// SISTEMA DINÂMICO DE PEDIDOS E DASHBOARD
// ==========================================
async function loadOrders() {
    try {
        const response = await fetch('http://localhost:3333/api/orders');
        const orders = await response.json();

        // Pega as duas tabelas que existem no seu HTML
        const dashboardTbody = document.getElementById('dashboard-orders-tbody');
        const mainTbody = document.getElementById('main-orders-tbody');
        
        if (dashboardTbody) dashboardTbody.innerHTML = '';
        if (mainTbody) mainTbody.innerHTML = '';

        let totalFaturamento = 0;

        orders.forEach(order => {
            // Soma o faturamento (ignorando os cancelados)
            if (order.status !== 'Cancelado') {
                totalFaturamento += order.total;
            }

            const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR');
            const formattedTotal = order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Monta a listagem de itens bonitinha para a aba de pedidos completos
            let itemsHtml = "";
            if (order.items && order.items.length > 0) {
                itemsHtml = order.items.map(item => `• ${item.name} (${item.size}/${item.color})`).join('<br>');
            } else {
                itemsHtml = "Sem itens detalhados";
            }

            // Define a cor do Dropdown baseado no status
            let statusColor = '#ff9800'; 
            if (order.status === 'Pronto para Envio') statusColor = '#2196F3'; 
            if (order.status === 'Finalizado / Pago') statusColor = '#4CAF50'; 
            if (order.status === 'Cancelado') statusColor = '#F44336'; 

            // O Dropdown de Status inteligente (igual para as duas tabelas)
            const statusSelect = `
                <select onchange="updateOrderStatus('${order.id}', this.value)" 
                        style="padding: 5px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold; color: ${statusColor}; background: #fff; cursor: pointer;">
                    <option value="Pendente" ${order.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Pronto para Envio" ${order.status === 'Pronto para Envio' ? 'selected' : ''}>Pronto para Envio</option>
                    <option value="Finalizado / Pago" ${order.status === 'Finalizado / Pago' ? 'selected' : ''}>Finalizado / Pago</option>
                    <option value="Cancelado" ${order.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
            `;

            // 1. Injeta os dados na Tabela Resumida do Dashboard
            if (dashboardTbody) {
                dashboardTbody.innerHTML += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${order.address}</td>
                        <td><b>${formattedTotal}</b></td>
                        <td>${order.paymentMethod}</td>
                        <td>${statusSelect}</td>
                    </tr>
                `;
            }

            // 2. Injeta os dados na Tabela Detalhada da aba Pedidos
            if (mainTbody) {
                const shortId = order.id.split('-')[0].toUpperCase(); // Pega só o comecinho do ID UUID pra não ficar gigante na tela
                mainTbody.innerHTML += `
                    <tr>
                        <td>${formattedDate}</td>
                        <td>#${shortId}</td>
                        <td>${order.address}</td>
                        <td><small>${itemsHtml}</small></td>
                        <td><b>${formattedTotal}</b></td>
                        <td>${order.paymentMethod}</td>
                        <td>${statusSelect}</td>
                    </tr>
                `;
            }
        });

        // 3. Atualiza as caixinhas de Grana e Quantidade de Vendas no Topo
        const statValues = document.querySelectorAll('.stat-card .value');
        if (statValues.length >= 2) {
            statValues[0].innerText = totalFaturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            statValues[1].innerText = orders.length;
        }

    } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await fetch(`http://localhost:3333/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        loadOrders(); 
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao atualizar o status do pedido.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderCharts();
    loadAdminProducts();
    loadOrders();
});

// ==========================================
// FUNÇÃO DE NAVEGAÇÃO DE SUB-ABAS DO DASHBOARD (CSS CALIBRADO)
// ==========================================
window.switchDashboardTab = function(tabId, buttonElement) {
    // Esconde todos os conteúdos das sub-abas
    document.querySelectorAll('.db-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Reseta o estilo de TODOS os botões para o estado "Inativo" (Fundo escuro, borda e texto dourados)
    document.querySelectorAll('.db-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#1a1a1a';
        btn.style.color = '#d4af37';
        btn.style.border = '1px solid #d4af37';
        btn.style.fontWeight = '600';
        btn.style.boxShadow = 'none';
    });

    // Mostra a sub-aba selecionada
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.style.display = 'block';
    }

    // Aplica o estilo "Ativo" no botão clicado (Fundo dourado premium, texto preto absoluto)
    if (buttonElement) {
        buttonElement.classList.add('active');
        buttonElement.style.background = '#d4af37';
        buttonElement.style.color = '#000000';
        buttonElement.style.border = 'none';
        buttonElement.style.fontWeight = '700';
        buttonElement.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)';
    }
}