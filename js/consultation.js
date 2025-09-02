document.addEventListener('DOMContentLoaded', function () {
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    var tzInput = document.getElementById('timezone');
    var tzDisplay = document.getElementById('timezoneDisplay');
    if (tzInput) tzInput.value = tz;
    if (tzDisplay) tzDisplay.value = tz || 'Timezone';
  } catch (e) {
    var tzDisplay2 = document.getElementById('timezoneDisplay');
    if (tzDisplay2) tzDisplay2.value = 'Timezone';
  }
});
