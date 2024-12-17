const menuIcon = document.getElementById('menuIcon');
const mobileNav = document.getElementById('mobileNav');

// Toggle mobile menu visibility
menuIcon.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
    menuIcon.classList.toggle('active');
});
