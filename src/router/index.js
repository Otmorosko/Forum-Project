import { createRouter, createWebHistory } from 'vue-router';
import HomeScreen from '../views/HomeScreen.vue';
import UserRegister from '../views/UserRegister.vue';
import UserLogin from '../views/UserLogin.vue';

const routes = [
  {
    path: '/',
    name: 'HomeScreen',
    component: HomeScreen,
  },
  {
    path: '/register',
    name: 'UserRegister',
    component: UserRegister,
  },
  {
    path: '/login',    // Zmieniono z '/' na '/login'
    name: 'UserLogin', // Poprawiono literówkę z 'UerLogin' na 'UserLogin'
    component: UserLogin,
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;