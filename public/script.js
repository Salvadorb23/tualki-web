document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si Supabase está cargado
    if (!window.supabase) {
        console.error('Error: La librería de Supabase no está cargada.');
        alert('Error: No se pudo cargar Supabase. Revisa la consola para más detalles.');
        return;
    }

    // Inicializar Supabase
    const supabase = window.supabase.createClient(
        'https://vrvwmlromomnynckppqz.supabase.co', // Tu URL de Supabase
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndtbHJvbW9tbnluY2twcHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MzQ2NjksImV4cCI6MjA2MTMxMDY2OX0.F1PJQG59heZWX2M9lHTQNRVr63Sijk-xVjOH5X8D7lE' // Tu clave pública de Supabase
    );

    // Código para listar productos (index.html)
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    const productsList = document.getElementById('products-list');
    if (productsList) {
        const { data: products, error } = await supabase
            .from('products')
            .select('*');

        if (error) {
            console.error('Error al cargar productos:', error.message);
            productsList.innerHTML = '<p>Error al cargar los productos.</p>';
            return;
        }

        if (products.length === 0) {
            productsList.innerHTML = '<p>No hay productos disponibles.</p>';
            return;
        }

        productsList.innerHTML = products.map(product => `
            <div class="product">
                <div class="details">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p class="rental-price">Precio por día: ${product.price_per_day} COP</p>
                    ${product.sale_price ? `<p class="sale-price">Precio de venta (opcional): ${product.sale_price} COP</p>` : ''}
                    <a href="pay.html?name=${encodeURIComponent(product.name)}&description=${encodeURIComponent(product.description)}&price_per_day=${product.price_per_day}&sale_price=${product.sale_price || ''}&action=rent&product_id=${product.id}" class="button">Alquilar</a>
                    ${product.sale_price ? `<a href="pay.html?name=${encodeURIComponent(product.name)}&description=${encodeURIComponent(product.description)}&price_per_day=${product.price_per_day}&sale_price=${product.sale_price}&action=buy&product_id=${product.id}" class="secondary-button">Comprar</a>` : ''}
                </div>
            </div>
        `).join('');
    }
}
    
    // Código para la página de registro (signup.html)
    if (window.location.pathname.includes('signup.html')) {
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password
                });

                if (error) {
                    console.error('Error al registrarse:', error.message);
                    alert('Error al registrarse: ' + error.message);
                    return;
                }

                console.log('Usuario registrado:', data);
                alert('¡Registro exitoso! Por favor, inicia sesión.');
                window.location.href = 'login.html';
            });
        }
    }

    // Código para la página de inicio de sesión (login.html)
    if (window.location.pathname.includes('login.html')) {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    console.error('Error al iniciar sesión:', error.message);
                    alert('Error al iniciar sesión: ' + error.message);
                    return;
                }

                console.log('Sesión iniciada:', data);
                alert('¡Inicio de sesión exitoso!');
                window.location.href = 'index.html';
            });
        }
    }

    // Código para la página de publicación (publish.html)
    if (window.location.pathname.includes('publish.html')) {
        const publishForm = document.getElementById('publish-form');
        if (publishForm) {
            publishForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Botón de publicar clickeado');

                // Obtener datos del formulario
                const name = document.getElementById('name').value;
                const description = document.getElementById('description').value;
                const category = document.getElementById('category').value;
                const pricePerDay = parseFloat(document.getElementById('price_per_day').value);
                const salePrice = document.getElementById('sale_price').value ? parseFloat(document.getElementById('sale_price').value) : null;
                const imageFile = document.getElementById('image').files[0];

                // Verificar usuario autenticado
                const { data: userData, error: userError } = await supabase.auth.getSession();
                if (userError || !userData.session) {
                    alert('Por favor, inicia sesión para publicar un producto.');
                    window.location.href = 'login.html';
                    return;
                }
                console.log('Usuario autenticado:', userData.session.user.id);

                // Subir la imagen
                console.log('Intentando subir imagen:', imageFile.name);
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('tualki-images')
                    .upload(`${Date.now()}_${imageFile.name}`, imageFile);

                if (uploadError) {
                    console.error('Error al subir la imagen:', uploadError.message);
                    alert('Error al subir la imagen: ' + uploadError.message);
                    return;
                }
                console.log('Imagen subida con éxito:', uploadData);

                // Obtener la URL pública de la imagen
                const { data: urlData } = supabase.storage
                    .from('tualki-images')
                    .getPublicUrl(uploadData.path);
                console.log('URL de la imagen:', urlData.publicUrl);

                // Guardar el producto en la tabla 'products'
                const { data, error } = await supabase
                    .from('products')
                    .insert([
                        {
                            user_id: userData.session.user.id,
                            name,
                            description,
                            category,
                            price_per_day: pricePerDay,
                            sale_price: salePrice,
                            image_url: urlData.publicUrl
                        }
                    ]);

                if (error) {
                    console.error('Error al publicar:', error.message);
                    alert('Error al publicar: ' + error.message);
                    return;
                }

                console.log('Producto publicado con éxito:', data);
                alert('Producto publicado con éxito');
            });
        }
    }

    // Código para la página de pago (pay.html)
    if (window.location.pathname.includes('pay.html')) {
        // Obtener los parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get('name');
        const description = urlParams.get('description');
        const pricePerDay = urlParams.get('price_per_day');
        const salePrice = urlParams.get('sale_price');

        // Mostrar los detalles del producto
        document.getElementById('product-name').textContent = name || 'Producto desconocido';
        document.getElementById('product-description').textContent = description || 'Sin descripción';
        document.getElementById('product-price-per-day').textContent = pricePerDay || 'N/A';
        document.getElementById('product-sale-price').textContent = salePrice || 'N/A';

        // Configurar el botón de Wompi
        const payButton = document.getElementById('pay-button');
        payButton.addEventListener('click', () => {
            const amount = salePrice || pricePerDay; // Usar el precio de venta si existe, si no, el precio por día
            const wompiCheckout = new WidgetCheckout({
                currency: 'COP',
                amountInCents: parseInt(amount) * 100, // Convertir a centavos
                reference: 'TUALKI-' + Date.now(), // Referencia única para la transacción
                publicKey: 'TU_CLAVE_PUBLICA_WOMPI', // Reemplaza con tu clave pública de Wompi
                redirectUrl: 'https://tualki-web.vercel.app/index.html' // URL a la que redirigir después del pago
            });
            wompiCheckout.open(function (result) {
                if (result.status === 'APPROVED') {
                    alert('¡Pago exitoso!');
                } else {
                    alert('Error en el pago: ' + result.status);
                }
            });
        });
    }
});
