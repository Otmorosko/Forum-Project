<template>
    <footer class="footer">
      <div class="links">
        <a href="#">Terms of Service</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Contact Us</a>
      </div>
      <p class="copyright">© 2023 ModMastersForum. All rights reserved.</p>
    </footer>
  </template>
  
  <script>
  export default {
    name: 'AppFooter'
  };
  </script>
  
  <style lang="scss">
  .footer {
    display: flex;
    flex-direction: column; // Umożliwia umieszczenie tekstu praw autorskich pod linkami
    align-items: center; // Wyśrodkowuje zawartość
    background-color: #f0f0f0; // Jasnoszare tło
    padding: 20px; // Dodaje odstęp wewnętrzny
  }
  
  .links {
    display: flex;
    justify-content: space-between; // Równomierne rozmieszczenie linków
    width: 100%; // Zajmuje całą szerokość stopki
    max-width: 800px; // Ustawia maksymalną szerokość, aby linki były bardziej zwarte
    margin-bottom: 10px; // Odstęp między linkami a tekstem praw autorskich
  
    a {
      color: #333; // Ciemnoszary kolor linków
      text-decoration: none; // Bez podkreślenia
      padding: 0 15px; // Dodaje odstęp po bokach linków
  
      &:hover {
        text-decoration: underline; // Podkreślenie przy najechaniu
      }
    }
  }
  
  .copyright {
    text-align: center; // Wyśrodkowuje tekst
    color: #666; // Jaśniejszy odcień szarości dla tekstu praw autorskich
    font-size: 14px; // Ustawia rozmiar czcionki
  }
  </style>