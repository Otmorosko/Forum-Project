<template>
  <div id="app">
    <NavBar />
    <router-view></router-view>
    <AppFooter /> <!-- Użycie komponentu AppFooter -->
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue';
import AppFooter from './components/AppFooter.vue'; // Import komponentu AppFooter

export default {
  name: 'App',
  components: {
    NavBar,
    AppFooter // Dodanie komponentu do lokalnych komponentów
  }
}
</script>

<style lang="scss">
@import './styles/global.scss';
@import './styles/app.scss';
</style>