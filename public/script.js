// Verificamos si la librería de Supabase está cargada
if (typeof supabase === 'undefined') {
  console.error("Error: La librería de Supabase no está cargada.");
  alert("Error: No se pudo cargar Supabase. Revisa la consola para más detalles.");
} else {
  console.log("Librería de Supabase cargada correctamente");
}

// Inicializa Supabase
const supabaseUrl = 'https://vrvwmlromomnynckppqz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndtbHJvbW9tbnluY2twcHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MzQ2NjksImV4cCI6MjA2MTMxMDY2OX0.F1PJQG59heZWX2M9lHTQNRVr63Sijk-xVjOH5X8D7lE';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
window.supabase = supabaseClient;
console.log("Supabase inicializado");

// Registro
const registerBtn = document.getElementById('register-btn');
if (registerBtn) {
  console.log("Botón de registro encontrado");
  registerBtn.addEventListener('click', async () => {
    console.log("Botón de registro clickeado");
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    console.log("Correo:", email, "Contraseña:", password);

    try {
      const { data, error } = await window.supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.log("Error al registrar:", error.message);
        alert("Error al registrar: " + error.message);
      } else {
        console.log("Registro exitoso:", data.user);
        alert("Registro exitoso");
      }
    } catch (err) {
      console.log("Error inesperado:", err);
      alert("Error inesperado: " + err.message);
    }
  });
} else {
  console.log("Botón de registro NO encontrado");
}

// Inicio de sesión
const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
  console.log("Botón de inicio de sesión encontrado");
  loginBtn.addEventListener('click', async () => {
    console.log("Botón de inicio de sesión clickeado");
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    console.log("Correo:", email, "Contraseña:", password);

    try {
      const { data, error } = await window.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.log("Error al iniciar sesión:", error.message);
        alert("Error al iniciar sesión: " + error.message);
      } else {
        console.log("Inicio de sesión exitoso:", data.user);
        alert("Inicio de sesión exitoso");
      }
    } catch (err) {
      console.log("Error inesperado:", err);
      alert("Error inesperado: " + err.message);
    }
  });
} else {
  console.log("Botón de inicio de sesión NO encontrado");
}

// Publicar producto
const publishBtn = document.getElementById('publish-btn');
if (publishBtn) {
  console.log("Botón de publicar encontrado");
  publishBtn.addEventListener('click', async () => {
    console.log("Botón de publicar clickeado");
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const category = document.getElementById('product-category').value;
    const pricePerDay = parseFloat(document.getElementById('price-per-day').value);
    const salePrice = document.getElementById('sale-price').value ? parseFloat(document.getElementById('sale-price').value) : null;
    const file = document.getElementById('product-image').files[0];

    if (!name || !description || !category || !pricePerDay || !file) {
      console.log("Faltan campos obligatorios");
      alert("Por favor, completa todos los campos obligatorios.");
      return;
    }

    const { data: userData, error: userError } = await window.supabase.auth.getUser();
    if (userError || !userData.user) {
      console.log("Usuario no autenticado");
      alert("Debes iniciar sesión para publicar.");
      return;
    }

    const fileName = `${userData.user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await window.supabase.storage
      .from('tualki-images')
      .upload(fileName, file);

    if (uploadError) {
      console.log("Error al subir la imagen:", uploadError.message);
      alert("Error al subir la imagen: " + uploadError.message);
      return;
    }

    const { data: urlData } = window.supabase.storage
      .from('tualki-images')
      .getPublicUrl(fileName);

    const { data, error } = await window.supabase
      .from('products')
      .insert([
        {
          user_id: userData.user.id,
          name,
          description,
          category,
          price_per_day: pricePerDay,
          sale_price: salePrice,
          image_url: urlData.publicUrl
        }
      ]);

    if (error) {
      console.log("Error al publicar:", error.message);
      alert("Error al publicar: " + error.message);
    } else {
      console.log("Producto publicado con éxito:", data);
      alert("Producto publicado con éxito");
    }
  });
} else {
  console.log("Botón de publicar NO encontrado");
}
