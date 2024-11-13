<template>
  <div class="user-login">
    <div class="form-container">
      <h1>Log in to your account</h1>
      <form @submit.prevent="loginUser ">
        <input 
          type="text" 
          v-model="identifier" 
          placeholder="Username" 
          required 
        />
        <input 
          type="password" 
          v-model="password" 
          placeholder="Password" 
          required 
        />
        <button type="submit">Log in</button>
      </form>
      <p class="login-prompt">Don't have an account? <router-link to="/register" class="register-link">Register</router-link></p>
    </div>
    <AppFooter /> <!-- Użycie komponentu AppFooter -->
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'UserLogin',

  data() {
    return {
      identifier: '',
      password: '',
      message: '',
      isSuccess: false
    };
  },
  methods: {
    async loginUser () {
      console.log('Próba logowania z danymi:', { identifier: this.identifier, password: this.password });
      try {
        const response = await axios.post('http://localhost:3000/login', {
          identifier: this.identifier,
          password: this.password,
        });

        console.log('Odpowiedź serwera:', response.data);

        if (response.data.success) {
          this.message = 'Zalogowano pomyślnie!';
          this.isSuccess = true;
          this.$router.push('/home');
          
          setTimeout(() => {
            this.message = '';
            this.isSuccess = false;
          }, 3000);
        } else {
          this.message = 'Błąd logowania. Sprawdź swoje dane.';
          this.isSuccess = false;
        }
      } catch (error) {
        console.error('Błąd podczas logowania:', error);
        this.message = 'Wystąpił błąd. Spróbuj ponownie później.';
        this.isSuccess = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import '../styles/userLogin.scss'; // Import pliku SCSS
</style>