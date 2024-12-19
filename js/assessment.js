document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('assessmentForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you! Your request has been submitted.');
        form.reset();
    });
});
