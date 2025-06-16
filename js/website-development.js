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
    const saMessage = document.getElementById("saMessage");

    buttonsDiv.style.display = "none";
    saMessage.style.display = "none";

    if (selected === "Zimbabwe") {
        buttonsDiv.style.display = "block";
        document.getElementById("zimBtn").style.display = "inline-block";
        document.getElementById("otherBtn").style.display = "none";
    } else if (selected === "Other") {
        buttonsDiv.style.display = "block";
        document.getElementById("zimBtn").style.display = "none";
        document.getElementById("otherBtn").style.display = "inline-block";
    } else if (selected === "South Africa") {
        saMessage.style.display = "block";
    }
}
