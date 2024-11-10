<template>
  <div class="user-register">
    <div class="form-container">
      <h1>Utwórz konto</h1>
      <form @submit.prevent="registerUser ">
        <input type="text" v-model="username" placeholder="Nazwa użytkownika" required />
        <input type="password" v-model="password" placeholder="Hasło" required />
        <button type="submit">Zarejestruj się</button>
      </form>
      <p v-if="message">{{ message }}</p>
      <p class="login-prompt">Masz już konto? <router-link to="/login">Zaloguj się</router-link></p>
    </div>

    <footer class="footer">
      <div class="links">
        <a href="#">Regulamin</a>
        <a href="#">Polityka prywatności</a>
        <a href="#">Skontaktuj się z nami</a>
      </div>
    </footer>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'UserRegister',
  data() {
    return {
      username: '',
      password: '',
      message: ''
    }
  },
  methods: {
    async registerUser () {
      if (!this.username || !this.password) {
        this.message = 'Wszystkie pola są wymagane.';
        return;
      }

      console.log('Rejestracja z danymi:', { username: this.username, password: this.password });
      try {
        const response = await axios.post('http://localhost:3000/register', {
          username: this.username,
          password: this.password
        });

        console.log('Odpowiedź serwera:', response.data); // Logowanie odpowiedzi serwera

        if (response.data.success) {
          this.message = response.data.message;
          this.$router.push('/login');
        } else {
          this.message = response.data.message;
        }
      } catch (error) {
        console.error('Błąd rejestracji:', error);
        this.message = error.response ? error.response.data.message : 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.';
      }
    }
  }
}
</script>

<style scoped>
.user-register {
  max-width: 400px;
  margin: auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.form-container {
  display: flex;
  flex-direction: column;
}

input {
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  padding: 10px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #218838;
}

.footer {
  margin-top: 20px;
  text-align: center;
}

.links a {
  margin: 0 10px;
  color: #007bff;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>