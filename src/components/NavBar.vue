<!-- src/components/NavBar.vue -->
<template>
  <nav>
    <router-link to="/">Strona główna</router-link>
    <router-link to="/login">Logowanie</router-link>
    <router-link to="/register">Rejestracja</router-link>
  </nav>
</template>

<script>
export default {
  name: 'NavBar'
}
</script>

<style lang="scss" scoped>
@import '../styles/navBar.scss';
</style>