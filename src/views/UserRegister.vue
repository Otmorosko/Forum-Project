<template>
  <div class="user-register">
    <div class="form-container">
      <h1>Utwórz konto w ModHub</h1>
      <form @submit.prevent="registerUser ">
        <input type="text" v-model="username" placeholder="Nazwa użytkownika" required />
        <input type="password" v-model="password" placeholder="Hasło" required />
        <button type="submit">Zarejestruj się</button>
      </form>
      <p v-if="message">{{ message }}</p>
      <p class="login-prompt">Masz już konto? <router-link to="/login">Zaloguj się</router-link></p>
    </div>
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
    };
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

<style lang="scss">
@import '../styles/userRegister.scss'; // Referencja do pliku stylów
</style>