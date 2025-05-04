document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si Supabase está cargado
    if (!window.supabase) {
        console.error('Error: La librería de Supabase no está cargada.');
        alert('Error: No se pudo cargar Supabase. Revisa la consola para más detalles.');
        return;
    }

    // Inicializar Supabase
    const supabase = window.supabase.createClient(
        'https://vrvwmlromomnynckppqz.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndtbHJvbW9tbnluY2twcHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MzQ2NjksImV4cCI6MjA2MTMxMDY2OX0.F1PJQG59heZWX2M9lHTQNRVr63Sijk-xVjOH5X8D7lE'
    );

    // Actualizar enlaces de autenticación según el estado del usuario
    const authLinks = document.querySelector('.auth-links');
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
        authLinks.innerHTML = `
            <a href="#" id="logout">Cerrar Sesión</a>
        `;
        document.getElementById('logout').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    } else {
        authLinks.innerHTML = `
            <a href="login.html">Iniciar Sesión</a>
            <a href="signup.html">Registrarse</a>
        `;
    }

    // Redirigir si el usuario ya está autenticado en login.html o signup.html
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
        if (session.session) {
            window.location.href = 'index.html';
        }
    }

    // Código para listar productos (index.html)
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        const productsList = document.getElementById('products-list');
        const searchBar = document.getElementById('search-bar');
        const maxPriceInput = document.getElementById('max-price');
        const locationInput = document.getElementById('location-filter');
        const categoryLinks = document.querySelectorAll('.categories-bar a');

        let currentFilter = 'all';
        let userFavorites = new Set();

        const loadFavorites = async () => {
            const { data: favorites, error } = await supabase
                .from('favorites')
                .select('product_id')
                .eq('user_id', session.session.user.id);
            if (error) {
                console.error('Error al cargar favoritos:', error.message);
                alert('Error al cargar favoritos: ' + error.message);
                return;
            }
            userFavorites = new Set(favorites.map(fav => fav.product_id));
        };

        const toggleFavorite = async (productId, button) => {
            try {
                const isFavorited = userFavorites.has(productId);
                if (isFavorited) {
                    const { error } = await supabase
                        .from('favorites')
                        .delete()
                        .eq('user_id', session.session.user.id)
                        .eq('product_id', productId);
                    if (error) {
                        throw new Error('Error al quitar favorito: ' + error.message);
                    }
                    userFavorites.delete(productId);
                    button.classList.remove('favorited');
                    alert('Producto eliminado de favoritos.');
                } else {
                    const { error } = await supabase
                        .from('favorites')
                        .insert({ user_id: session.session.user.id, product_id: productId });
                    if (error) {
                        throw new Error('Error al añadir favorito: ' + error.message);
                    }
                    userFavorites.add(productId);
                    button.classList.add('favorited');
                    alert('Producto añadido a favoritos.');
                }
                if (currentFilter === 'favorites') {
                    loadProducts();
                }
            } catch (error) {
                console.error(error.message);
                alert(error.message);
            }
        };

        const loadProducts = async () => {
            let query = supabase.from('products').select('*');

            const searchTerm = searchBar.value.toLowerCase();
            const maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
            const location = locationInput.value.toLowerCase();

            if (searchTerm) {
                query = query.ilike('name', `%${searchTerm}%`);
            }
            if (maxPrice) {
                query = query.lte('price_per_day', maxPrice);
            }
            if (location) {
                query = query.ilike('location', `%${location}%`);
            }
            if (currentFilter === 'favorites') {
                query = query.in('id', Array.from(userFavorites));
            } else if (currentFilter === 'recent') {
                query = query.order('created_at', { ascending: false });
            } else if (currentFilter !== 'all' && currentFilter !== 'more') {
                query = query.eq('category', currentFilter);
            }

            const { data: products, error } = await query;
            console.log('Datos de productos:', products, 'Error:', error);

            if (error) {
                console.error('Error al cargar productos:', error.message);
                productsList.innerHTML = '<p>Error al cargar los productos: ' + error.message + '</p>';
                return;
            }

            if (products.length === 0) {
                productsList.innerHTML = '<p>No hay productos disponibles.</p>';
                return;
            }

            productsList.innerHTML = products.map(product => {
                const photoUrl = product.photos && product.photos.length > 0 ? product.photos[0] : null;
                const isFavorited = userFavorites.has(product.id);
                return `
                    <div class="product">
                        <button class="favorite-button ${isFavorited ? 'favorited' : ''}" data-product-id="${product.id}">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                        ${photoUrl ? `<img src="${photoUrl}" alt="${product.name}" class="product-image">` : '<p>Sin imagen</p>'}
                        <div class="details">
                            <h3>${product.name}</h3>
                            <p>${product.description}</p>
                            <p class="rental-price">Precio por día: $${product.price_per_day.toLocaleString('es-CO')} COP</p>
                            ${product.sale_price ? `<p class="sale-price">Precio de venta: $${product.sale_price.toLocaleString('es-CO')} COP</p>` : ''}
                            <p>Ubicación: ${product.location || 'No especificada'}</p>
                            <p>Categoría: ${product.category || 'Sin categoría'}</p>
                            <a href="pay.html?name=${encodeURIComponent(product.name)}&description=${encodeURIComponent(product.description)}&price_per_day=${product.price_per_day}&sale_price=${product.sale_price || ''}&action=rent&product_id=${product.id}&seller_id=${product.user_id}" class="button">Alquilar</a>
                            ${product.sale_price ? `<a href="pay.html?name=${encodeURIComponent(product.name)}&description=${encodeURIComponent(product.description)}&price_per_day=${product.price_per_day}&sale_price=${product.sale_price}&action=buy&product_id=${product.id}&seller_id=${product.user_id}" class="secondary-button">Comprar</a>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Añadir evento a los botones de favoritos después de renderizar
            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', () => {
                    const productId = button.getAttribute('data-product-id');
                    toggleFavorite(productId, button);
                });
            });
        };

        if (productsList) {
            await loadFavorites();
            loadProducts();
            searchBar.addEventListener('input', loadProducts);
            maxPriceInput.addEventListener('input', loadProducts);
            locationInput.addEventListener('input', loadProducts);

            categoryLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    categoryLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    currentFilter = link.getAttribute('data-filter');
                    loadProducts();
                });
            });
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

                const name = document.getElementById('name').value;
                const description = document.getElementById('description').value;
                const category = document.getElementById('category').value;
                const pricePerDay = parseFloat(document.getElementById('price_per_day').value);
                const salePrice = document.getElementById('sale_price').value ? parseFloat(document.getElementById('sale_price').value) : null;
                const imageFile = document.getElementById('image').files[0];

                const { data: userData, error: userError } = await supabase.auth.getSession();
                if (userError || !userData.session) {
                    alert('Por favor, inicia sesión para publicar un producto.');
                    window.location.href = 'login.html';
                    return;
                }
                console.log('Usuario autenticado:', userData.session.user.id);

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('tualki-images')
                    .upload(`${Date.now()}_${imageFile.name}`, imageFile);

                if (uploadError) {
                    console.error('Error al subir la imagen:', uploadError.message);
                    alert('Error al subir la imagen: ' + uploadError.message);
                    return;
                }

                const { data: urlData } = supabase.storage
                    .from('tualki-images')
                    .getPublicUrl(uploadData.path);
                console.log('URL de la imagen:', urlData.publicUrl);

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
                            photos: [urlData.publicUrl]
                        }
                    ]);

                if (error) {
                    console.error('Error al publicar:', error.message);
                    alert('Error al publicar: ' + error.message);
                    return;
                }

                console.log('Producto publicado con éxito:', data);
                alert('Producto publicado con éxito');
                window.location.href = 'index.html';
            });
        }
    }

    // Código para la página de mensajes (messages.html)
    if (window.location.pathname.includes('messages.html')) {
        const messagesList = document.getElementById('messages-list');
        const sendMessageForm = document.getElementById('send-message-form');

        const loadMessages = async () => {
            const { data: session } = await supabase.auth.getSession();
            if (!session.session) {
                alert('Por favor, inicia sesión para ver tus mensajes.');
                window.location.href = 'login.html';
                return;
            }

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${session.session.user.id},receiver_id.eq.${session.session.user.id}`);

            if (error) {
                console.error('Error al cargar mensajes:', error.message);
                messagesList.innerHTML = '<p>Error al cargar los mensajes: ' + error.message + '</p>';
                return;
            }

            if (data.length === 0) {
                messagesList.innerHTML = '<p>No hay mensajes disponibles.</p>';
                return;
            }

            messagesList.innerHTML = data.map(message => `
                <div class="message">
                    <p><strong>De:</strong> ${message.sender_id}</p>
                    <p><strong>Para:</strong> ${message.receiver_id}</p>
                    <p>${message.content}</p>
                    <p><small>Enviado: ${new Date(message.created_at).toLocaleString()}</small></p>
                </div>
            `).join('');
        };

        if (messagesList) {
            await loadMessages();
            // Suscribirse a cambios en tiempo real (Realtime)
            supabase
                .channel('messages')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.session.user.id}` }, (payload) => {
                    console.log('Nuevo mensaje recibido:', payload);
                    loadMessages();
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${session.session.user.id}` }, (payload) => {
                    console.log('Nuevo mensaje enviado:', payload);
                    loadMessages();
                })
                .subscribe();
        }

        if (sendMessageForm) {
            sendMessageForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const { data: session } = await supabase.auth.getSession();
                if (!session.session) {
                    alert('Por favor, inicia sesión para enviar un mensaje.');
                    window.location.href = 'login.html';
                    return;
                }

                const receiverEmail = document.getElementById('receiver-email').value;
                const content = document.getElementById('message-content').value;

                const { data: receiver, error: receiverError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', receiverEmail)
                    .single();

                if (receiverError || !receiver) {
                    console.error('Error al buscar el destinatario:', receiverError?.message);
                    alert('El correo del destinatario no existe.');
                    return;
                }

                const { error } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: session.session.user.id,
                        receiver_id: receiver.id,
                        content
                    });

                if (error) {
                    console.error('Error al enviar mensaje:', error.message);
                    alert('Error al enviar mensaje: ' + error.message);
                    return;
                }

                alert('Mensaje enviado con éxito!');
                sendMessageForm.reset();
                await loadMessages();
            });
        }
    }

    // Código para la página de alquiler (rent.html)
    if (window.location.pathname.includes('rent.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get('name');
        const description = urlParams.get('description');
        const pricePerDay = parseFloat(urlParams.get('price_per_day'));
        const action = urlParams.get('action');
        const productId = urlParams.get('product_id');
        const sellerId = urlParams.get('seller_id');

        const actionTitle = document.getElementById('action-title');
        const productName = document.getElementById('product-name');
        const productDescription = document.getElementById('product-description');
        const productPrice = document.getElementById('product-price');
        const sendMessageForm = document.getElementById('send-message-form');
        const payButton = document.getElementById('pay-button');

        actionTitle.textContent = action === 'rent' ? 'Alquilar Producto' : 'Comprar Producto';
        productName.textContent = name || 'Producto desconocido';
        productDescription.textContent = description || 'Sin descripción';
        productPrice.textContent = pricePerDay.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

        if (sendMessageForm) {
            sendMessageForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const { data: session } = await supabase.auth.getSession();
                if (!session.session) {
                    alert('Por favor, inicia sesión para enviar un mensaje.');
                    window.location.href = 'login.html';
                    return;
                }

                const content = document.getElementById('message-content').value;

                const { error } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: session.session.user.id,
                        receiver_id: sellerId,
                        content,
                        product_id: productId
                    });

                if (error) {
                    console.error('Error al enviar mensaje:', error.message);
                    alert('Error al enviar mensaje: ' + error.message);
                    return;
                }

                alert('Mensaje enviado con éxito al vendedor!');
                sendMessageForm.style.display = 'none';
                payButton.style.display = 'block';
                sendMessageForm.reset();
            });
        }

        if (payButton) {
            payButton.addEventListener('click', () => {
                window.location.href = `pay.html?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&price_per_day=${pricePerDay}&action=${action}&product_id=${productId}`;
            });
        }
    }

    // Código para la página de entregas (deliveries.html)
    if (window.location.pathname.includes('deliveries.html')) {
        const deliveriesList = document.getElementById('deliveries-list');

        const loadDeliveries = async () => {
            const { data: session } = await supabase.auth.getSession();
            if (!session.session) {
                alert('Por favor, inicia sesión para ver tus entregas.');
                window.location.href = 'login.html';
                return;
            }

            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('buyer_id', session.session.user.id)
                .or('seller_id.eq.' + session.session.user.id);

            if (error) {
                console.error('Error al cargar entregas:', error.message);
                deliveriesList.innerHTML = '<p>Error al cargar las entregas: ' + error.message + '</p>';
                return;
            }

            if (data.length === 0) {
                deliveriesList.innerHTML = '<p>No hay entregas disponibles.</p>';
                return;
            }

            deliveriesList.innerHTML = data.map(delivery => `
                <div class="delivery">
                    <p><strong>Producto:</strong> ${delivery.product_id}</p>
                    <p><strong>Tipo:</strong> ${delivery.type}</p>
                    <p><strong>Estado:</strong> ${delivery.status || 'Pendiente'}</p>
                    <p><small>Fecha: ${delivery.rental_start ? new Date(delivery.rental_start).toLocaleString() : 'Sin fecha'}</small></p>
                </div>
            `).join('');
        };

        if (deliveriesList) {
            await loadDeliveries();
            supabase
                .channel('deliveries')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, loadDeliveries)
                .subscribe();
        }
    }

    // Código para la página de pago (pay.html)
    if (window.location.pathname.includes('pay.html')) {
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

        productName.textContent = name || 'Producto desconocido';
        productDescription.textContent = description || 'Sin descripción';

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

        productPrice.textContent = displayPrice.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

        const payButton = document.getElementById('pay-button');
        payButton.addEventListener('click', async () => {
            const amount = displayPrice;
            const reference = 'TUALKI-' + Date.now();
            const currency = 'COP';

            // Clave de integridad
            const integrityKey = 'test_integrity_Eeq1kYx2Lh6tiBzqN8FELuosI2iWhyGq';

            // Concatenar los valores para la firma (reference + amountInCents + currency + integrityKey)
            const amountInCents = parseInt(amount) * 100;
            const stringToSign = `${reference}${amountInCents}${currency}${integrityKey}`;

            // Generar la firma usando SHA-256
            const encoder = new TextEncoder();
            const data = encoder.encode(stringToSign);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const wompiCheckout = new WidgetCheckout({
                currency: 'COP',
                amountInCents: amountInCents,
                reference: reference,
                publicKey: 'pub_test_EtTODv4mMOMQj2q8Xz3LzXSjtPWRnPeJ',
                redirectUrl: 'https://tualki-web.vercel.app/index.html',
                signature: {
                    integrity: signature
                }
            });

            wompiCheckout.open(async function (result) {
                console.log('Resultado de Wompi completo:', result);

                if (result && result.status === 'APPROVED') {
                    alert('¡Pago exitoso!');
                    console.log('Pago aprobado, guardando transacción...');

                    const { data: session } = await supabase.auth.getSession();
                    if (session.session) {
                        const { error } = await supabase
                            .from('transactions')
                            .insert({
                                buyer_id: session.session.user.id,
                                product_id: productId,
                                amount: amount,
                                type: action,
                                status: 'completed',
                                reference: reference,
                                created_at: new Date().toISOString()
                            });

                        if (error) {
                            console.error('Error al guardar la transacción:', error.message);
                            alert('Pago exitoso, pero hubo un error al registrar la transacción: ' + error.message);
                        } else {
                            console.log('Transacción registrada con éxito');
                            window.location.href = 'https://tualki-web.vercel.app/index.html';
                        }
                    }
                } else {
                    const errorMessage = result?.status ? `Error en el pago: ${result.status}` : 'Error en el pago: Desconocido';
                    console.error(errorMessage);
                    alert(errorMessage);
                }
            });
        });
    }
});
