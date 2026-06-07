const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({ dest: 'uploads/' });

// ==========================================
// ROTA 0: TESTE
// ==========================================
app.get('/', (req, res) => {
    res.send('API da FV Fitwear está rodando!');
});

// ==========================================
// ROTA 1: CRIAR PRODUTO (POST)
// ==========================================
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, stock, category, colors, sizes } = req.body;
        
        let imageUrl = '';
        if (req.file) {
            imageUrl = `http://localhost:3333/uploads/${req.file.filename}`;
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                price: parseFloat(price),
                stock: parseInt(stock),
                category,
                colors,
                sizes,
                imageUrl
            }
        });

        res.status(201).json(newProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar o produto' });
    }
});

// ==========================================
// ROTA 2: LISTAR PRODUTOS (GET)
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        // Se vier ?all=true, mostra todos. Senão, só os ativos.
        const { all } = req.query;
        const filter = all === 'true' ? {} : { active: true };

        const products = await prisma.product.findMany({
            where: filter,
            orderBy: { createdAt: 'desc' }
        });
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// ==========================================
// ROTA 3: BUSCAR UM PRODUTO ESPECÍFICO (GET)
// ==========================================
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({ where: { id } });
        
        if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar o produto' });
    }
});

// ==========================================
// ROTA 4: ALTERAR STATUS / OLHINHO (PATCH)
// ==========================================
app.patch('/api/products/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: { active }
        });

        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao alterar status do produto' });
    }
});

// ==========================================
// ROTA 5: EDITAR PRODUTO (PUT)
// ==========================================
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock, category, colors, sizes } = req.body;
        
        const updateData = {
            name,
            price: parseFloat(price),
            stock: parseInt(stock),
            category,
            colors,
            sizes
        };

        if (req.file) {
            updateData.imageUrl = `http://localhost:3333/uploads/${req.file.filename}`;
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: updateData
        });

        res.json(updatedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar o produto' });
    }
});

// ==========================================
// ROTA 6: DELETAR PRODUTO (DELETE)
// ==========================================
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir o produto' });
    }
});

// ==========================================
// ROTA: CRIAR NOVO PEDIDO COM QUANTIDADE DINÂMICA
// ==========================================
app.post('/api/orders', async (req, res) => {
    try {
        const { address, paymentMethod, total, items } = req.body;
        
        // 1. Cria o pedido salvando a quantidade dinâmica de cada item
        const newOrder = await prisma.order.create({
            data: {
                address,
                paymentMethod,
                total: parseFloat(total),
                status: "Pendente",
                items: {
                    create: items.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        price: parseFloat(item.price),
                        size: item.size,
                        color: item.color,
                        quantity: parseInt(item.quantity) || 1 // Quantidade dinâmica vinda do front
                    }))
                }
            }
        });

        // 2. Abate o estoque físico baseado na quantidade exata comprada
        for (const item of items) {
            const qtyToDecrement = parseInt(item.quantity) || 1;
            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: {
                        decrement: qtyToDecrement
                    }
                }
            });
        }

        res.status(201).json(newOrder);
    } catch (error) {
        console.error("Erro ao salvar pedido:", error);
        res.status(500).json({ error: 'Erro ao criar o pedido' });
    }
});

// ==========================================
// ROTA: LISTAR PEDIDOS (Para o Admin)
// ==========================================
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: { items: true }, // Traz os itens do pedido junto
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// ==========================================
// ROTA: MUDAR STATUS DO PEDIDO (E RESTAURAR ESTOQUE SE CANCELADO)
// ==========================================
app.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        // Se o pedido está sendo CANCELADO, devolvemos os itens para o estoque
        if (status === 'Cancelado' && order.status !== 'Cancelado') {
            for (const item of order.items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { increment: item.quantity }
                    }
                });
            }
        }

        // Se o pedido estava Cancelado e voltou a ser Pendente ou Pago, descontamos de novo
        if (order.status === 'Cancelado' && status !== 'Cancelado') {
            for (const item of order.items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                });
            }
        }

        // Atualiza o status do pedido
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status }
        });

        res.json(updatedOrder);
    } catch (error) {
        console.error("Erro detalhado ao atualizar status do pedido:", error);
        res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
});