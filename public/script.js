// Inicializa Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://vrvwmlromomnynckppqz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndtbHJvbW9tbnluY2twcHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MzQ2NjksImV4cCI6MjA2MTMxMDY2OX0.F1PJQG59heZWX2M9lHTQNRVr63Sijk-xVjOH5X8D7lE';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

// Registro
document.getElementById('register-btn').addEventListener('click', async () => {
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  const { data, error } = await window.supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert("Error al registrar: " + error.message);
  } else {
    alert("Registro exitoso");
    console.log("Usuario registrado:", data.user);
  }
});

// Inicio de sesión
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await window.supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Error al iniciar sesión: " + error.message);
  } else {
    alert("Inicio de sesión exitoso");
    console.log("Usuario logeado:", data.user);
  }
});

// Publicar producto
const publishBtn = document.getElementById('publish-btn');
if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const category = document.getElementById('product-category').value;
    const pricePerDay = parseFloat(document.getElementById('price-per-day').value);
    const salePrice = document.getElementById('sale-price').value ? parseFloat(document.getElementById('sale-price').value) : null;
    const file = document.getElementById('product-image').files[0];

    if (!name || !description || !category || !pricePerDay || !file) {
      alert("Por favor, completa todos los campos obligatorios.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert("Debes iniciar sesión para publicar.");
      return;
    }

    const fileName = `${userData.user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tualki-images')
      .upload(fileName, file);

    if (uploadError) {
      alert("Error al subir la imagen: " + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('tualki-images')
      .getPublicUrl(fileName);

    const { data, error } = await supabase
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
      alert("Error al publicar: " + error.message);
    } else {
      alert("Producto publicado con éxito");
      console.log("Producto:", data);
    }
  });
}
