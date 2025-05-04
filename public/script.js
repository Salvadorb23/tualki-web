document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) {
        console.error('Error: La librería de Supabase no está cargada.');
        alert('Error: No se pudo cargar Supabase. Revisa la consola.');
        return;
    }

    const supabase = window.supabase.createClient(
        'https://vrvwmlromomnynckppqz.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndtbHJvbW9tbnluY2twcHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MzQ2NjksImV4cCI6MjA2MTMxMDY2OX0.F1PJQG59heZWX2M9lHTQNRVr63Sijk-xVjOH5X8D7lE'
    );

    const usernameElement = document.getElementById('username');
    const verifyLink = document.getElementById('verify-link');
    let user = null;
    const { data: session } = await supabase.auth.getSession();
    if (session?.session && usernameElement) {
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email, verified, first_name, last_name, id_card_front, id_card_back, location')
            .eq('id', session.session.user.id)
            .single();
        
        if (userError || !userData) {
            console.error('Error al obtener datos del usuario:', userError?.message || 'Usuario no encontrado');
            usernameElement.textContent = 'Iniciar Sesión';
            usernameElement.setAttribute('href', 'login.html');
        } else {
            user = userData;
            // Asegurar que verified tenga un valor por defecto si es null
            if (user.verified === null) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ verified: false })
                    .eq('id', session.session.user.id);
                if (updateError) {
                    console.error('Error al establecer verified por defecto:', updateError.message);
                }
                user.verified = false;
            }
            usernameElement.textContent = `${user.first_name} ${user.last_name}`;
            document.getElementById('logout').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.href = 'login.html';
            });
            // Mostrar el enlace de verificación si no está verificado
            if (verifyLink) {
                if (user.verified) {
                    verifyLink.style.display = 'none';
                } else {
                    verifyLink.style.display = 'inline';
                }
            }
        }
    } else if (usernameElement) {
        usernameElement.textContent = 'Iniciar Sesión';
        usernameElement.setAttribute('href', 'login.html');
        if (verifyLink) {
            verifyLink.style.display = 'none';
        }
    }

    if ((window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) && session?.session) {
        window.location.href = 'index.html';
    }

    const checkVerification = async () => {
        if (!session?.session) return false;
        const { data: userData, error } = await supabase
            .from('users')
            .select('verified')
            .eq('id', session.session.user.id)
            .single();
        if (error || !userData) {
            console.error('Error al verificar usuario:', error?.message || 'Usuario no encontrado');
            return false;
        }
        // Asegurar que verified tenga un valor por defecto si es null
        if (userData.verified === null) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ verified: false })
                .eq('id', session.session.user.id);
            if (updateError) {
                console.error('Error al establecer verified por defecto:', updateError.message);
            }
            return false;
        }
        return userData.verified;
    };

    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        const productsList = document.getElementById('products-list');
        const searchBar = document.getElementById('search-bar');
        const maxPriceInput = document.getElementById('max-price');
        const locationInput = document.getElementById('location-filter');
        const radiusInput = document.getElementById('radius-filter');
        const categoryLinks = document.querySelectorAll('.categories-bar a');

        if (!productsList) {
            console.error('Elemento products-list no encontrado');
            return;
        }

        let currentFilter = 'all';
        let userFavorites = new Set();

        const loadFavorites = async () => {
            if (!session?.session) return;
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
            if (!session?.session) {
                alert('Por favor, inicia sesión para gestionar favoritos.');
                window.location.href = 'login.html';
                return;
            }
            if (!(await checkVerification())) {
                alert('Para gestionar favoritos debe verificar su perfil.');
                return;
            }
            try {
                const isFavorited = userFavorites.has(productId);
                if (isFavorited) {
                    const { error } = await supabase
                        .from('favorites')
                        .delete()
                        .eq('user_id', session.session.user.id)
                        .eq('product_id', productId);
                    if (error) throw error;
                    userFavorites.delete(productId);
                    button.classList.remove('favorited');
                    alert('Producto eliminado de favoritos.');
                } else {
                    const { error } = await supabase
                        .from('favorites')
                        .insert({ user_id: session.session.user.id, product_id: productId });
                    if (error) throw error;
                    userFavorites.add(productId);
                    button.classList.add('favorited');
                    alert('Producto añadido a favoritos.');
                }
                if (currentFilter === 'favorites') loadProducts();
            } catch (error) {
                console.error('Error al gestionar favorito:', error.message);
                alert('Error: ' + error.message);
            }
        };

        const loadProducts = async () => {
            let query = supabase.from('products').select('*');

            const searchTerm = searchBar ? searchBar.value.toLowerCase() : '';
            const maxPrice = maxPriceInput ? parseFloat(maxPriceInput.value) : Infinity;
            const location = locationInput ? locationInput.value.toLowerCase() : '';

            if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);
            if (maxPrice < Infinity) query = query.lte('price_per_day', maxPrice);
            if (location) query = query.ilike('location', `%${location}%`);
            if (currentFilter === 'favorites' && session?.session) query = query.in('id', Array.from(userFavorites));
            else if (currentFilter === 'recent') query = query.order('created_at', { ascending: false });
            else if (currentFilter !== 'all' && currentFilter !== 'more') query = query.eq('category', currentFilter);

            const { data: products, error } = await query;
            if (error) {
                console.error('Error al cargar productos:', error.message);
                productsList.innerHTML = '<p>Error al cargar los productos: ' + error.message + '</p>';
                return;
            }

            console.log('Productos recibidos de Supabase:', products);

            if (products.length === 0) {
                productsList.innerHTML = '<p>No hay productos disponibles.</p>';
                return;
            }

            productsList.innerHTML = products.map(product => {
                const photos = product.photos || [null];
                const isFavorited = userFavorites.has(product.id);
                return `
                    <div class="product">
                        <div class="carousel">
                            <div class="carousel-inner" style="transform: translateX(0%)">
                                ${photos.map(photo => `<img src="${photo || 'https://via.placeholder.com/320x220?text=Sin+Imagen'}" alt="${product.name}" class="carousel-item">`).join('')}
                            </div>
                            ${photos.length > 1 ? '<button class="carousel-prev" onclick="moveCarousel(this, -1)">❮</button><button class="carousel-next" onclick="moveCarousel(this, 1)">❯</button>' : ''}
                        </div>
                        <button class="favorite-button ${isFavorited ? 'favorited' : ''}" data-product-id="${product.id}">
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </button>
                        <div class="details">
                            <h3>${product.name}</h3>
                            <p>${product.description}</p>
                            ${product.rental_type !== 'sell' ? `<p class="rental-price">Alquiler: $${product.price_per_day.toLocaleString('es-CO')} COP/día</p>` : ''}
                            ${product.sale_price ? `<p class="sale-price">Venta: $${product.sale_price.toLocaleString('es-CO')} COP</p>` : ''}
                            <p>Ubicación: ${product.location || 'No especificada'}</p>
                            <p>Categoría: ${product.category || 'Sin categoría'}</p>
                            ${product.rental_type !== 'sell' ? `<a href="pay.html?name=${encodeURIComponent(product.name)}&description=${encodeURIComponent(product.description)}&price_per_day=${product.price_per_day}&action=rent&product_id=${product.id}&seller_id=${product.user_id}" class="button">Alquilar</a>` : ''}
                            ${product.sale_price ? `<a href="pay.html?name=${encodeURIComponent(product.name)}&description=${encodeURIComponent(product.description)}&price_per_day=${product.price_per_day}&sale_price=${product.sale_price}&action=buy&product_id=${product.id}&seller_id=${product.user_id}" class="secondary-button">Comprar</a>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            document.querySelectorAll('.favorite-button').forEach(button => {
                button.addEventListener('click', () => {
                    const productId = button.getAttribute('data-product-id');
                    toggleFavorite(productId, button);
                });
            });
        };

        if (productsList) {
            await loadFavorites();
            await loadProducts();
            if (searchBar) searchBar.addEventListener('input', loadProducts);
            if (maxPriceInput) maxPriceInput.addEventListener('input', loadProducts);
            if (locationInput) locationInput.addEventListener('input', loadProducts);
            if (radiusInput) radiusInput.addEventListener('input', loadProducts);

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

    if (window.location.pathname.includes('signup.html')) {
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const firstName = document.getElementById('first_name').value;
                const lastName = document.getElementById('last_name').value;
                const idCard = document.getElementById('id_card').value;
                const idCardFront = document.getElementById('id_card_front').files[0];
                const idCardBack = document.getElementById('id_card_back').files[0];
                const location = document.getElementById('location').value;

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { first_name: firstName, last_name: lastName, id_card: idCard, location } }
                });

                if (error) {
                    console.error('Error al registrarse:', error.message);
                    alert('Error al registrarse: ' + error.message);
                    return;
                }

                let frontUrl = null, backUrl = null;
                if (idCardFront) {
                    const { data: frontData, error: frontError } = await supabase.storage
                        .from('user-documents')
                        .upload(`${data.user.id}_id_front_${Date.now()}.jpg`, idCardFront);
                    if (!frontError) frontUrl = supabase.storage.from('user-documents').getPublicUrl(frontData.path).data.publicUrl;
                }
                if (idCardBack) {
                    const { data: backData, error: backError } = await supabase.storage
                        .from('user-documents')
                        .upload(`${data.user.id}_id_back_${Date.now()}.jpg`, idCardBack);
                    if (!backError) backUrl = supabase.storage.from('user-documents').getPublicUrl(backData.path).data.publicUrl;
                }

                const { error: updateError } = await supabase
                    .from('users')
                    .update({ verified: false, id_card_front: frontUrl, id_card_back: backUrl, location: location })
                    .eq('id', data.user.id);
                if (updateError) {
                    console.error('Error al actualizar usuario:', updateError.message);
                    alert('Error al guardar documentos: ' + updateError.message);
                    return;
                }

                alert('¡Registro exitoso! Puedes verificar tu cuenta cuando desees desde tu perfil.');
                window.location.href = 'index.html';
            });
        }
    }

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

                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('verified')
                    .eq('id', data.user.id)
                    .single();
                if (userError || !userData) {
                    console.error('Error al verificar usuario:', userError?.message || 'Usuario no encontrado');
                    alert('Error al verificar tu cuenta. Contacta al soporte.');
                    await supabase.auth.signOut();
                    return;
                }

                alert('¡Inicio de sesión exitoso!');
                window.location.href = 'index.html';
            });
        }
    }

    if (window.location.pathname.includes('publish.html')) {
        const publishForm = document.getElementById('publish-form');
        if (publishForm) {
            publishForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!session?.session) {
                    alert('Por favor, inicia sesión para publicar.');
                    window.location.href = 'login.html';
                    return;
                }
                if (!(await checkVerification())) {
                    alert('Para publicar debe verificar su perfil.');
                    return;
                }

                const name = document.getElementById('name').value;
                const description = document.getElementById('description').value;
                const category = document.getElementById('category').value;
                const pricePerDay = document.getElementById('price_per_day').value ? parseFloat(document.getElementById('price_per_day').value) : null;
                const salePrice = document.getElementById('sale_price').value ? parseFloat(document.getElementById('sale_price').value) : null;
                const rentalType = document.querySelector('input[name="rental_type"]:checked').value;
                const images = document.getElementById('images').files;
                const location = document.getElementById('location').value;

                if (!name || !category || !location || (rentalType !== 'sell' && !pricePerDay)) {
                    alert('Por favor, completa todos los campos obligatorios (nombre, categoría, ubicación y precio por día si aplicable).');
                    return;
                }

                const { data: userData, error: userError } = await supabase.auth.getSession();
                if (userError || !userData.session) {
                    alert('Error de sesión. Inicia sesión nuevamente.');
                    window.location.href = 'login.html';
                    return;
                }

                const photoUrls = [];
                for (let i = 0; i < images.length && i < 5; i++) {
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('tualki-images')
                        .upload(`${Date.now()}_${images[i].name}`, images[i]);
                    if (uploadError) {
                        console.error('Error al subir imagen:', uploadError.message);
                        alert('Error al subir imagen: ' + uploadError.message);
                        return;
                    }
                    const { data: urlData } = supabase.storage.from('tualki-images').getPublicUrl(uploadData.path);
                    photoUrls.push(urlData.publicUrl);
                }

                const productData = {
                    user_id: userData.session.user.id,
                    name,
                    description,
                    category,
                    price_per_day: rentalType !== 'sell' ? pricePerDay : null,
                    sale_price: rentalType === 'sell' || (rentalType === 'rent_sell' && salePrice) ? salePrice : null,
                    rental_type: rentalType,
                    photos: photoUrls.length > 0 ? photoUrls : null,
                    location: location
                };

                const { data, error } = await supabase
                    .from('products')
                    .insert([productData]);

                if (error) {
                    console.error('Error al publicar:', error.message);
                    alert('Error al publicar: ' + error.message);
                    return;
                }

                alert('Producto enviado para aprobación. Te notificaremos cuando esté activo.');
                window.location.href = 'index.html';
            });
        }
    }

    if (window.location.pathname.includes('pay.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get('name');
        const description = urlParams.get('description');
        const pricePerDay = parseFloat(urlParams.get('price_per_day'));
        const salePrice = urlParams.get('sale_price') ? parseFloat(urlParams.get('sale_price')) : null;
        const action = urlParams.get('action');
        const productId = urlParams.get('product_id');
        const sellerId = urlParams.get('seller_id');

        const actionTitle = document.getElementById('action-title');
        const productName = document.getElementById('product-name');
        const productDescription = document.getElementById('product-description');
        const productPrice = document.getElementById('product-price');
        const payButton = document.getElementById('pay-button');
        const carouselInner = document.getElementById('carousel-inner');
        const sellerName = document.getElementById('seller-name');
        const sellerReviews = document.getElementById('seller-reviews');
        const sellerRating = document.getElementById('seller-rating');
        const sendMessageForm = document.getElementById('send-message-form');

        if (actionTitle && productName && productDescription && productPrice && carouselInner && sellerName && sellerReviews && sellerRating) {
            productName.textContent = name || 'Producto desconocido';
            productDescription.textContent = description || 'Sin descripción';
            let displayPrice = action === 'rent' ? pricePerDay : salePrice;
            actionTitle.textContent = action === 'rent' ? 'Alquilar Producto' : 'Comprar Producto';
            productPrice.textContent = displayPrice.toLocaleString('es-CO', { style: 'currency', currency: 'COP' });

            const { data: product, error: productError } = await supabase
                .from('products')
                .select('photos')
                .eq('id', productId)
                .single();
            if (productError) {
                console.error('Error al cargar fotos del producto:', productError.message);
                alert('Error al cargar fotos del producto: ' + productError.message);
                return;
            }
            const photos = product.photos || [null];
            carouselInner.innerHTML = photos.map(photo => `<img src="${photo || 'https://via.placeholder.com/600x300?text=Sin+Imagen'}" alt="${name}" class="carousel-item">`).join('');

            const { data: seller, error: sellerError } = await supabase
                .from('users')
                .select('first_name, last_name, reviews, rating')
                .eq('id', sellerId)
                .single();
            if (sellerError) {
                console.error('Error al cargar datos del vendedor:', sellerError.message);
                alert('Error al cargar datos del vendedor: ' + sellerError.message);
                return;
            }
            sellerName.textContent = `${seller.first_name} ${seller.last_name}`;
            sellerReviews.textContent = seller.reviews || 'Sin reseñas';
            sellerRating.textContent = (seller.rating || 0).toFixed(1);

            if (!session?.session) {
                alert('Por favor, inicia sesión para realizar esta acción.');
                window.location.href = 'login.html';
                return;
            }
            if (!(await checkVerification())) {
                alert('Para alquilar debe verificar su perfil.');
                window.location.href = 'index.html';
                return;
            }
        }

        if (sendMessageForm) {
            sendMessageForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const messageContent = document.getElementById('message-content').value;
                if (!messageContent) {
                    alert('Por favor, escribe un mensaje al vendedor.');
                    return;
                }

                const { data: sender, error: senderError } = await supabase.auth.getSession();
                if (senderError || !sender.session) {
                    alert('Error de sesión. Inicia sesión nuevamente.');
                    window.location.href = 'login.html';
                    return;
                }

                const { error: messageError } = await supabase
                    .from('messages')
                    .insert({
                        sender_id: sender.session.user.id,
                        receiver_id: sellerId,
                        content: messageContent,
                        product_id: productId,
                        created_at: new Date().toISOString()
                    });

                if (messageError) {
                    console.error('Error al enviar mensaje:', messageError.message);
                    alert('Error al enviar mensaje: ' + messageError.message);
                    return;
                }

                alert('Mensaje enviado al vendedor. Ahora puedes proceder con el pago.');
                sendMessageForm.style.display = 'none';
                payButton.style.display = 'block';
            });
        }

        if (payButton) {
            payButton.addEventListener('click', async () => {
                if (!session?.session) {
                    alert('Por favor, inicia sesión para pagar.');
                    window.location.href = 'login.html';
                    return;
                }
                if (!(await checkVerification())) {
                    alert('Para alquilar debe verificar su perfil.');
                    return;
                }

                const amount = action === 'rent' ? pricePerDay : salePrice;
                const commission = amount * 0.05; // 5% de comisión
                const finalAmount = amount + commission;
                const reference = 'TUALKI-' + Date.now();
                const currency = 'COP';

                const integrityKey = 'test_integrity_Eeq1kYx2Lh6tiBzqN8FELuosI2iWhyGq';
                const amountInCents = parseInt(finalAmount) * 100;
                const stringToSign = `${reference}${amountInCents}${currency}${integrityKey}`;
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
                    signature: { integrity: signature }
                });

                wompiCheckout.open(async function (result) {
                    if (result && result.status === 'APPROVED') {
                        alert('¡Pago exitoso!');
                        const { data: session } = await supabase.auth.getSession();
                        if (session.session) {
                            const { error } = await supabase
                                .from('transactions')
                                .insert({
                                    buyer_id: session.session.user.id,
                                    seller_id: sellerId,
                                    product_id: productId,
                                    amount: amount,
                                    commission: commission,
                                    total_amount: finalAmount,
                                    type: action,
                                    status: 'completed',
                                    reference: reference,
                                    created_at: new Date().toISOString()
                                });
                            if (error) {
                                console.error('Error al guardar transacción:', error.message);
                                alert('Pago exitoso, pero hubo un error al registrar: ' + error.message);
                            } else {
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
    }

    if (window.location.pathname.includes('verify.html')) {
        const verifyForm = document.getElementById('verify-form');
        if (verifyForm) {
            verifyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const firstName = document.getElementById('first_name').value;
                const lastName = document.getElementById('last_name').value;
                const idCard = document.getElementById('id_card').value;
                const idCardFront = document.getElementById('id_card_front').files[0];
                const idCardBack = document.getElementById('id_card_back').files[0];

                const { data: session } = await supabase.auth.getSession();
                if (!session.session) {
                    alert('Por favor, inicia sesión primero.');
                    window.location.href = 'login.html';
                    return;
                }

                let frontUrl = null, backUrl = null;
                if (idCardFront) {
                    const { data: frontData, error: frontError } = await supabase.storage
                        .from('user-documents')
                        .upload(`${session.session.user.id}_id_front_${Date.now()}.jpg`, idCardFront);
                    if (!frontError) frontUrl = supabase.storage.from('user-documents').getPublicUrl(frontData.path).data.publicUrl;
                }
                if (idCardBack) {
                    const { data: backData, error: backError } = await supabase.storage
                        .from('user-documents')
                        .upload(`${session.session.user.id}_id_back_${Date.now()}.jpg`, idCardBack);
                    if (!backError) backUrl = supabase.storage.from('user-documents').getPublicUrl(backData.path).data.publicUrl;
                }

                const { error } = await supabase
                    .from('users')
                    .update({ first_name: firstName, last_name: lastName, id_card: idCard, id_card_front: frontUrl, id_card_back: backUrl, verified: false })
                    .eq('id', session.session.user.id);
                if (error) {
                    console.error('Error al verificar:', error.message);
                    alert('Error al verificar: ' + error.message);
                    return;
                }

                alert('Datos enviados para aprobación. Espera confirmación manual.');
                window.location.href = 'index.html';
            });
        }
    }
});

function showCustomAlert(message) {
    const modal = document.getElementById('custom-alert');
    const messageElement = document.getElementById('custom-alert-message');
    if (modal && messageElement) {
        messageElement.textContent = message;
        modal.style.display = 'flex';
    }
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert');
    if (modal) {
        modal.style.display = 'none';
    }
}

window.alert = showCustomAlert;

function moveCarousel(button, direction) {
    if (typeof button === 'number') {
        // Handle the case where direction is passed directly (from pay.html)
        const inner = document.getElementById('carousel-inner');
        let currentTranslate = parseInt(inner.style.transform.replace(/translateX\((.*)%\)/, '$1')) || 0;
        const items = inner.querySelectorAll('.carousel-item').length;
        currentTranslate += button * 100; // button is the direction in this case
        if (currentTranslate > 0) currentTranslate = 0;
        if (currentTranslate < -100 * (items - 1)) currentTranslate = -100 * (items - 1);
        inner.style.transform = `translateX(${currentTranslate}%)`;
    } else {
        // Existing logic for index.html
        const carousel = button.parentElement;
        const inner = carousel.querySelector('.carousel-inner');
        let currentTranslate = parseInt(inner.style.transform.replace(/translateX\((.*)%\)/, '$1')) || 0;
        const items = carousel.querySelectorAll('.carousel-item').length;
        currentTranslate += direction * 100;
        if (currentTranslate > 0) currentTranslate = 0;
        if (currentTranslate < -100 * (items - 1)) currentTranslate = -100 * (items - 1);
        inner.style.transform = `translateX(${currentTranslate}%)`;
    }
}
