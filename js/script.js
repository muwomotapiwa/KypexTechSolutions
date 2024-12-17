const menuIcon = document.getElementById('menuIcon');
const mobileNav = document.getElementById('mobileNav');

// Toggle menu on click
menuIcon.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
    menuIcon.classList.toggle('active');
});

// Close menu when a link is clicked
const menuLinks = document.querySelectorAll('.mobile-nav a');
menuLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileNav.classList.remove('active');
        menuIcon.classList.remove('active');
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!menuIcon.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('active');
        menuIcon.classList.remove('active');
    }
});
