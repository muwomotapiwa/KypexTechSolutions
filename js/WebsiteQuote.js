// Package definitions with page ranges and prices
const packages = {
  100: { min: 1, max: 3, name: "Starter Package – $100 (Lifetime)", price: 100 },
  220: { min: 4, max: 6, name: "Standard Package – $220 (Lifetime)", price: 220 },
  330: { min: 7, max: 10, name: "Pro Business Package – $330 (Lifetime)", price: 330 },
  540: { min: 11, max: 20, name: "E-Commerce Package – $540 (Lifetime)", price: 540 }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  updatePageRangeIndicator(100); // Default to Starter package range
});

// Update page count display and check package match when slider changes
function updatePages() {
  const pagesInput = document.getElementById("pages");
  const pages = parseInt(pagesInput.value);
  document.getElementById("pagesCount").innerText = pages;
  
  checkPackageMatch(pages);
  calculateTotal();
}

// Update the page slider range indicators when package changes
function updatePageRangeIndicator(packageValue) {
  const package = packages[packageValue];
  if (!package) return;
  
  document.getElementById("minPages").textContent = package.min;
  document.getElementById("maxPages").textContent = package.max;
  
  const pagesInput = document.getElementById("pages");
  pagesInput.min = package.min;
  pagesInput.max = package.max;
  pagesInput.value = package.min;
  document.getElementById("pagesCount").innerText = package.min;
}

// Check if current page count matches selected package, suggest change if not
function checkPackageMatch(selectedPages) {
  const packageSelect = document.getElementById("package");
  const currentPackage = parseInt(packageSelect.value);
  
  // Find matching package for the selected pages
  let recommendedPackage = null;
  for (const [value, range] of Object.entries(packages)) {
    if (selectedPages >= range.min && selectedPages <= range.max) {
      recommendedPackage = { value: parseInt(value), ...range };
      break;
    }
  }
  
  // If pages exceed all packages, recommend highest package
  if (!recommendedPackage && selectedPages > packages[540].max) {
    recommendedPackage = { value: 540, ...packages[540] };
  }
  
  // If current package doesn't match recommended package
  if (recommendedPackage && currentPackage !== recommendedPackage.value) {
    const confirmChange = confirm(
      `You've selected ${selectedPages} pages.\n` +
      `This matches our ${recommendedPackage.name} (${recommendedPackage.min}-${recommendedPackage.max} pages).\n\n` +
      `Would you like to change to the ${recommendedPackage.name}?`
    );
    
    if (confirmChange) {
      packageSelect.value = recommendedPackage.value;
      onPackageChange();
    }
  }
}

// Handle package selection changes
function onPackageChange() {
  const packageSelect = document.getElementById("package");
  const packageValue = packageSelect.value;
  updatePageRangeIndicator(packageValue);
  showPackageInfo(packageValue);
  calculateTotal();
}

// Show/hide package info sections
function showPackageInfo(packageValue) {
  document.querySelectorAll('.package-info').forEach(el => {
    el.classList.remove('active');
  });
  if (packageValue !== "0") {
    document.getElementById(`packageInfo${packageValue}`).classList.add('active');
  }
}

// Toggle visibility of all package info sections
function toggleAllPackageInfo() {
  const allHidden = Array.from(document.querySelectorAll('.package-info'))
    .every(el => !el.classList.contains('active'));
  
  document.querySelectorAll('.package-info').forEach(el => {
    if (allHidden) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
  
  const toggleBtn = document.querySelector('.package-toggle');
  toggleBtn.textContent = allHidden ? '▲ Hide Packages' : '▼ Show All Packages';
}

// Calculate the total price based on selections
function calculateTotal() {
  let total = parseInt(document.getElementById("package").value) || 0;
  let packageText = document.getElementById("package").selectedOptions[0].text;
  document.getElementById("selectedPackage").innerText = packageText;
  
  const pages = parseInt(document.getElementById("pages").value);
  document.getElementById("selectedPages").innerText = pages;
  
  const currentPackageValue = parseInt(document.getElementById("package").value);
  if (currentPackageValue && pages > packages[currentPackageValue].max) {
    total += (pages - packages[currentPackageValue].max) * 10;
  }
  
  let addOns = [];
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked) {
      total += parseInt(cb.value);
      addOns.push(cb.parentElement.textContent.trim());
    }
  });
  document.getElementById("selectedAddOns").innerText = addOns.length ? addOns.join(", ") : "None";
  document.getElementById("total").innerText = `$${total.toFixed(2)}`;
}

// Send quote via WhatsApp with all details
function sendWhatsApp() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const whatsappNumber = document.getElementById("whatsapp").value;
  const package = document.getElementById("selectedPackage").innerText;
  const pages = document.getElementById("selectedPages").innerText;
  const addOns = document.getElementById("selectedAddOns").innerText;
  const total = document.getElementById("total").innerText;

  if (!name || !email || !whatsappNumber) {
    alert("Please fill in all your details before sending");
    return;
  }

  let msg = `*NEW WEBSITE QUOTE REQUEST* 🔥\n\n`;
  msg += `👤 *Client Name:* ${name}\n`;
  msg += `📧 *Email:* ${email}\n`;
  msg += `📱 *WhatsApp:* ${whatsappNumber}\n\n`;
  msg += `📦 *Selected Package:*\n${package}\n\n`;
  msg += `📄 *Number of Pages:* ${pages}\n\n`;
  msg += `➕ *Selected Add-Ons:*\n${addOns}\n\n`;
  msg += `💰 *Total Quote Amount:* ${total}\n\n`;
  msg += `💬 *Client Message:*\n"I'd like to proceed with this quote. Please contact me to discuss next steps."`;

  const encoded = encodeURIComponent(msg);
  confetti();
  window.open(`https://wa.me/27715731602?text=${encoded}`, '_blank');
}

// PDF download placeholder
function downloadPDF() {
  alert("PDF download feature coming in the next update!");
}

// Submit quote via email with all details
function submitEmail() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const whatsappNumber = document.getElementById("whatsapp").value;
  const package = document.getElementById("selectedPackage").innerText;
  const pages = document.getElementById("selectedPages").innerText;
  const addOns = document.getElementById("selectedAddOns").innerText;
  const total = document.getElementById("total").innerText;

  if (!name || !email || !whatsappNumber) {
    alert("Please fill in all your details before submitting");
    return;
  }

  let details = `📝 *NEW QUOTE REQUEST* 📝\n\n`;
  details += `🕒 ${new Date().toLocaleString()}\n\n`;
  details += `👤 *Client Information:*\n`;
  details += `- Name: ${name}\n`;
  details += `- Email: ${email}\n`;
  details += `- WhatsApp: ${whatsappNumber}\n\n`;
  details += `📦 *Package Selected:*\n${package}\n\n`;
  details += `📄 *Pages Selected:* ${pages}\n\n`;
  details += `➕ *Add-Ons Selected:*\n${addOns}\n\n`;
  details += `💰 *Total Quote:* ${total}\n\n`;
  details += `📩 This quote request was submitted via the KypexTech website calculator.`;

  alert(`✅ Thank you, ${name}!\n\nWe've received your quote request and will contact you shortly at:\n📧 ${email} or 📱 ${whatsappNumber}\n\nHere's your complete quote summary:\n\n${details}`);
}