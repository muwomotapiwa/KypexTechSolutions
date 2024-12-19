document.getElementById('consultationForm').addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Thank you for submitting your consultation request. We will get back to you shortly!');
    this.reset();
});
