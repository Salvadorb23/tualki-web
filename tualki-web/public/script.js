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