// Package definitions with page ranges and prices in ZAR
const packages = {
  100: { min: 1, max: 3, name: "Starter Package", price: 100 },
  220: { min: 4, max: 6, name: "Standard Package", price: 220 },
  330: { min: 7, max: 10, name: "Pro Business Package", price: 330 },
  540: { min: 11, max: 20, name: "E-Commerce Package", price: 540 }
};

// Backend-only exchange rate Rand to USD (1 ZAR = 0.056 USD)
let exchangeRate = 0.96;

function updatePrices() {
  document.getElementById("starterPrice").innerText = (packages[100].price * exchangeRate).toFixed(2);
  document.getElementById("standardPrice").innerText = (packages[220].price * exchangeRate).toFixed(2);
  document.getElementById("proBusinessPrice").innerText = (packages[330].price * exchangeRate).toFixed(2);
  document.getElementById("ecommercePrice").innerText = (packages[540].price * exchangeRate).toFixed(2);

  document.getElementById("addOnExtraPages").innerText = (20 * exchangeRate).toFixed(2);
  document.getElementById("addOnSEO").innerText = (20 * exchangeRate).toFixed(2);
  document.getElementById("addOnPaynow").innerText = (30 * exchangeRate).toFixed(2);
  document.getElementById("addOnWhatsApp").innerText = (15 * exchangeRate).toFixed(2);
  document.getElementById("addOnMaps").innerText = (15 * exchangeRate).toFixed(2);
  document.getElementById("addOnApp").innerText = (120 * exchangeRate).toFixed(2);
}

document.addEventListener('DOMContentLoaded', function () {
  updatePageRangeIndicator(100); // Default to Starter package range
  updatePrices(); // Update prices based on exchange rate
});

function updatePages() {
  const pagesInput = document.getElementById("pages");
  const pages = parseInt(pagesInput.value);
  document.getElementById("pagesCount").innerText = pages;

  checkPackageMatch(pages);
  calculateTotal();
}

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

function checkPackageMatch(selectedPages) {
  const packageSelect = document.getElementById("package");
  const currentPackage = parseInt(packageSelect.value);

  let recommendedPackage = null;
  for (const [value, range] of Object.entries(packages)) {
    if (selectedPages >= range.min && selectedPages <= range.max) {
      recommendedPackage = { value: parseInt(value), ...range };
      break;
    }
  }

  if (!recommendedPackage && selectedPages > packages[540].max) {
    recommendedPackage = { value: 540, ...packages[540] };
  }

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

function onPackageChange() {
  const packageSelect = document.getElementById("package");
  const packageValue = packageSelect.value;
  updatePageRangeIndicator(packageValue);
  showPackageInfo(packageValue);
  calculateTotal();
}

function showPackageInfo(packageValue) {
  document.querySelectorAll('.package-info').forEach(el => el.classList.remove('active'));
  if (packageValue !== "0") {
    document.getElementById(`packageInfo${packageValue}`).classList.add('active');
  }
}

function toggleAllPackageInfo() {
  const allHidden = Array.from(document.querySelectorAll('.package-info'))
    .every(el => !el.classList.contains('active'));

  document.querySelectorAll('.package-info').forEach(el => {
    el.classList.toggle('active', allHidden);
  });

  const toggleBtn = document.querySelector('.package-toggle');
  toggleBtn.textContent = allHidden ? '▲ Hide Packages' : '▼ Show All Packages';
}

function calculateTotal() {
  let total = 0;
  const packageSelect = document.getElementById("package");
  const packageValue = packageSelect.value;

  if (packageValue !== "0") {
    total = packages[packageValue].price * exchangeRate;
  }

  document.getElementById("selectedPackage").innerText = packageSelect.selectedOptions[0].text;

  const pages = parseInt(document.getElementById("pages").value);
  document.getElementById("selectedPages").innerText = pages;

  if (packageValue !== "0" && pages > packages[packageValue].max) {
    total += (pages - packages[packageValue].max) * (10 * exchangeRate);
  }

  let addOns = [];
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked) {
      const value = parseInt(cb.value) * exchangeRate;
      total += value;
      addOns.push(`${cb.parentElement.textContent.trim()} ($${value.toFixed(2)})`);
    }
  });

  document.getElementById("selectedAddOns").innerText = addOns.length ? addOns.join(", ") : "None";
  document.getElementById("total").innerText = `$${total.toFixed(2)}`;
}

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

function downloadPDF() {
  alert("PDF download feature coming soon!");
}

function submitEmail() {
  alert("Quote submitted successfully via email.");
}