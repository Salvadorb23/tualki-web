// Esperar a que la página esté cargada
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si Supabase está cargado
    if (!window.supabase) {
        console.error('Error: La librería de Supabase no está cargada.');
        alert('Error: No se pudo cargar Supabase. Revisa la consola para más detalles.');
        return;
    }

    // Inicializar Supabase
    const supabase = window.supabase.createClient(
        'https://vvwmrloromomynyckppq.supabase.co', // Tu URL de Supabase
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2d21ybG9yb21vbXluaWNrcHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgyMjU4ODcsImV4cCI6MjA0MzgwMTg4N30.7zq8gYomc4_0sH4aYem4cG_5d4wW5rT1e1bLq5i5jWY' // Tu clave pública de Supabase
    );

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
});
