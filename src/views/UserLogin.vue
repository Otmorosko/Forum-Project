<template>
    <div class="user-login">
      <h1>Logowanie</h1>
      <form @submit.prevent="loginUser">
        <input 
          type="text" 
          v-model="identifier" 
          placeholder="Nazwa użytkownika lub email" 
          required 
        />
        <input 
          type="password" 
          v-model="password" 
          placeholder="Hasło" 
          required 
        />
        <button type="submit">Zaloguj się</button>
      </form>
      <p v-if="message" :class="{ success: isSuccess, error: !isSuccess }">{{ message }}</p>
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
      async loginUser() {
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
            
            setTimeout(() => {
              this.$router.push({
                name: 'HomeScreen',
                query: { loggedIn: 'true' }
              });
            }, 1500);
          } else {
            this.message = response.data.message || 'Błąd logowania';
            this.isSuccess = false;
          }
        } catch (error) {
          console.error('Szczegóły błędu:', error.response || error);
          this.message = error.response?.data?.message || 'Wystąpił błąd podczas logowania. Spróbuj ponownie.';
          this.isSuccess = false;
        }
      },
    },
  };
  </script>
  
  <style lang="scss" scoped>
  .user-login {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
  
    h1 {
      text-align: center;
      margin-bottom: 20px;
    }
  
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
  
      input {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
  
      button {
        padding: 10px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
  
        &:hover {
          background-color: #45a049;
        }
      }
    }
  
    p {
      margin-top: 15px;
      text-align: center;
      
      &.success {
        color: green;
      }
      
      &.error {
        color: red;
      }
    }
  }
  </style>