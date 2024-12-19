document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('projectStartForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you for starting your project! We will get back to you shortly.');
        form.reset();
    });
});
