<template>
  <div class="user-register">
    <div class="form-container">
      <h1>Create your account</h1>
      <form @submit.prevent="registerUser">
        <input type="text" v-model="username" placeholder="Username" required />
        <input type="email" v-model="email" placeholder="Email" required />
        <input type="password" v-model="password" placeholder="Password" required />
        <input type="password" v-model="confirmPassword" placeholder="Confirm Password" required />
        <button type="submit">Register</button>
      </form>
      <p class="login-prompt">Already have an account? <router-link to="/login">Login</router-link></p>
    </div>

    <footer class="footer">
      <div class="links">
        <a href="#">Terms of Service</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Contact Us</a>
      </div>
      <div class="copyright">© 2023 Your Company. All rights reserved.</div>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'UserRegister',
  data() {
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  },
  methods: {
    registerUser() {
      // Tutaj logika rejestracji
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/userRegister.scss';
</style>