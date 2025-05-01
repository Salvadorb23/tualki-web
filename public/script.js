// Código para la página de pago (pay.html)
if (window.location.pathname.includes('pay.html')) {
    const hasProfile = await requireProfile();
    if (!hasProfile) return;

    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get('name');
    const description = urlParams.get('description');
    const pricePerDay = parseFloat(urlParams.get('price_per_day'));
    const salePrice = urlParams.get('sale_price') ? parseFloat(urlParams.get('sale_price')) : null;
    const action = urlParams.get('action');
    const productId = urlParams.get('product_id');

    const actionTitle = document.getElementById('action-title');
    const productName = document.getElementById('product-name');
    const productDescription = document.getElementById('product-description');
    const productPrice = document.getElementById('product-price');
    const photoGallery = document.getElementById('photo-gallery');
    const payButton = document.getElementById('pay-button');

    // Cargar fotos del producto
    const { data: product, error } = await supabase
        .from('products')
        .select('photos')
        .eq('id', productId)
        .single();

    if (error) {
        console.error('Error al cargar las fotos:', error.message);
    } else if (product.photos && product.photos.length > 0) {
        photoGallery.innerHTML = product.photos.map(photo => `
            <img src="${photo}" alt="${name}">
        `).join('');
    }

    // Configurar el título y el precio según la acción
    let displayPrice;
    if (action === 'rent') {
        actionTitle.textContent = 'Alquilar Producto';
        displayPrice = pricePerDay;
    } else if (action === 'buy') {
        actionTitle.textContent = 'Comprar Producto';
        displayPrice = salePrice;
    } else {
        actionTitle.textContent = 'Error';
        displayPrice = 0;
        productPrice.textContent = 'Precio no disponible';
        return;
    }

    productName.textContent = name;
    productDescription.textContent = description;
    productPrice.textContent = displayPrice.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

    payButton.addEventListener('click', async () => {
        const price = action === 'rent' ? pricePerDay : salePrice;
        const commissionRate = 0.1; // 10% de comisión
        const commission = price * commissionRate;
        const amountToPay = price + commission; // Total que paga el usuario

        // Configurar Wompi
        const checkout = new WidgetCheckout({
            currency: 'COP',
            amountInCents: Math.round(amountToPay * 100), // Wompi usa centavos
            reference: `TUALKI_${productId}_${Date.now()}`,
            publicKey: 'pub_prod_OPJOToiCYujZj4NTZ2fvCOVSKo7XclCX', // Ya configurada
            redirectUrl: 'https://tualki-web.vercel.app/index.html'
        });

        checkout.open(async (result) => {
            if (result.status === 'APPROVED') {
                alert('Pago exitoso. Te contactaremos para coordinar la entrega.');
                // Obtener el correo del arrendador desde Supabase
                const { data: product, error } = await supabase
                    .from('products')
                    .select('created_by')
                    .eq('id', productId)
                    .single();

                if (error) {
                    console.error('Error al obtener el arrendador:', error.message);
                    return;
                }

                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('email')
                    .eq('id', product.created_by)
                    .single();

                if (userError) {
                    console.error('Error al obtener el correo del arrendador:', userError.message);
                    return;
                }

                // Registrar la transacción
                const { data: session } = await supabase.auth.getSession();
                const buyerId = session?.user?.id;

                const { error: transactionError } = await supabase
                    .from('transactions')
                    .insert({
                        product_id: productId,
                        buyer_id: buyerId,
                        seller_id: product.created_by,
                        amount: amountToPay,
                        commission: commission,
                        status: 'pending'
                    });

                if (transactionError) {
                    console.error('Error al registrar la transacción:', transactionError.message);
                    return;
                }

                alert(`Por favor, contacta al arrendador en ${user.email} para coordinar la entrega.`);
            } else {
                alert('El pago no fue exitoso. Intenta de nuevo.');
            }
        });
    });
}
