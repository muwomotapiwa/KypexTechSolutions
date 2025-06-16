const menuIcon = document.getElementById('menuIcon');
const mobileNav = document.getElementById('mobileNav');

// Toggle mobile menu visibility
menuIcon.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
    menuIcon.classList.toggle('active');
});

function handleCountrySelect() {
    const selected = document.getElementById("country").value;
    const buttonsDiv = document.getElementById("quoteButtons");

    // Hide all buttons first
    buttonsDiv.style.display = "none";
    ['zimBtn', 'rsaBtn', 'zamBtn', 'botsBtn', 'otherBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = "none";
    });

    // Show the relevant button
    if (selected === "Zimbabwe") {
        buttonsDiv.style.display = "block";
        document.getElementById("zimBtn").style.display = "inline-block";
    } else if (selected === "South Africa") {
        buttonsDiv.style.display = "block";
        document.getElementById("rsaBtn").style.display = "inline-block";
    } else if (selected === "Zambia") {
        buttonsDiv.style.display = "block";
        document.getElementById("zamBtn").style.display = "inline-block";
    } else if (selected === "Botswana") {
        buttonsDiv.style.display = "block";
        document.getElementById("botsBtn").style.display = "inline-block";
    } else if (selected === "Other") {
        buttonsDiv.style.display = "block";
        document.getElementById("otherBtn").style.display = "inline-block";
    }
}
