/* ============ WC — auth guard ============ */
/* Included as early as possible in <head> on the protected page.
   Redirects to login.html immediately if no valid session flag is present. */
(function () {
  if (localStorage.getItem('wc_auth') !== 'true') {
    window.location.replace('login.html');
  }
})();
