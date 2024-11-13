<template>
    <footer class="footer">
      <div class="links">
        <a href="#">Terms of Service</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Contact Us</a>
      </div>
      <p class="copyright">© 2023 ModHub. All rights reserved.</p>
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
    flex-direction: column;
    align-items: center;
    background-color: #f0f0f0;
    padding: 20px;
}

.links {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 800px;
    margin-bottom: 10px;

    a {
      color: #333;
      text-decoration: none;
      padding: 0 15px;

      &:hover {
        text-decoration: underline;
      }
    }
}

.copyright {
    text-align: center;
    color: #666;
    font-size: 14px;
}
</style>