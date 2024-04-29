var country = "Loading";
/*if (
  document.referrer.match(/^https:\/\/www\.youtube\.com/) ||
  window.innerWidth === 1111
) {
  hide("overlayfull");
} else {
  show("overlayfull");
}
*/

//getIPDetails();

const node = document.getElementById("path");
node.addEventListener("keyup", function (event) {
  if (event.key === "Enter") {
    closeDialog("overlay");
    showDialog("shadow");
    location.href = node.value;
  }
});

function redirect() {
  //console.log(node.value);
  location.href = `${node.value}`;
}

function goFullScreen() {
  location.href = `https://www.youtube.com/redirect?q=https://${document.location.host}/launcher/index.html`;
}

function showOverlay() {
  showDialog("overlay");
  node.focus();
  node.setSelectionRange(200, 200);
}

function loading(url, geo) {
  if (geo && country !== "NZ") {
    showDialog("geoModal");
  } else {
    //showDialog("shadow");
    location.href = url;
  }
}

function openEditModal() {
  if (!localStorage.getItem("hidden")) {
    localStorage.setItem("hidden", "[]");
  }
  var hiddenItems = JSON.parse(localStorage.getItem("hidden"));
  console.log(hiddenItems);

  for (const obj of baseServices.reverse()) {
    var isChecked = hiddenItems.includes(obj["image"]);

    document
      .getElementById("serviceItems")
      .insertAdjacentHTML(
        "afterbegin",
        `<input type="checkbox" id="${obj["image"]}" name="${
          obj["image"]
        }" value="${obj["image"]}" onclick="hideService(this);" ${
          isChecked && "checked"
        } /><label for="${obj["image"]}"> ${obj["name"]}</label><br />`
      );
  }

  showDialog("editModal");
}

function hideService(service) {
  var hiddenItems = JSON.parse(localStorage.getItem("hidden"));
  if (service.checked) {
    hiddenItems.push(service.value);
  } else {
    hiddenItems = hiddenItems.filter((x) => x !== service.value);
  }
  localStorage.setItem("hidden", JSON.stringify(hiddenItems));

  console.log(hiddenItems);
}

function getIPDetails() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      country = JSON.parse(xhttp.responseText).country;
    }
  };
  xhttp.open("GET", "/api/country", true);
  xhttp.send();
}

const showDialog = (element, src) => {
  show(element);
  document.getElementById(element).classList.add("show");
  const scrollY = document.documentElement.style.getPropertyValue("--scroll-y");
  const body = document.body;
  body.style.position = "fixed";
  body.style.top = `-${scrollY}`;

  // Find the iframe within our newly-visible element
  var iframe = document.getElementById(element).querySelector("iframe");
  if (iframe) {
    //const dataSrc = iframe.getAttribute("data-src");
    const dataSrc = src;
    if (dataSrc) {
      iframe.setAttribute("src", dataSrc);

      console.log ("Setting iFrame src");

      /* ADBLOCKER
      // Check if the iframe content is loaded
      iframe.onload = function() {
          // Get the document inside the iframe
          var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

          // Define a function to hide the specified div elements
          function hideAdDivs() {

              console.log("Hiding Ads");
              console.log (iframeDoc.getElementById('div-gpt-ad-banner-left'));
              // Select the div elements with the specified ids
              var adBannerLeftDiv = iframeDoc.getElementById('div-gpt-ad-banner-left');
              var adBannerRightDiv = iframeDoc.getElementById('div-gpt-ad-banner-right');
              var adBannerTopDiv = iframeDoc.getElementById('div-gpt-ad-banner-top');
              var adBannerBottomDiv = iframeDoc.getElementById('div-gpt-ad-banner-bottom');

              // Hide each div if it exists
              if (adBannerLeftDiv) {
                  adBannerLeftDiv.style.display = 'none';
              }
              if (adBannerRightDiv) {
                adBannerRightDiv.style.display = 'none';
            }
              if (adBannerTopDiv) {
                  adBannerTopDiv.style.display = 'none';
              }
              if (adBannerBottomDiv) {
                  adBannerBottomDiv.style.display = 'none';
              }
          }

          // Call the hideAdDivs function
          hideAdDivs();
      }
      */
    }
  }

};

const closeDialog = (element) => {
  hide(element);
  const body = document.body;
  const scrollY = body.style.top;
  body.style.position = "";
  body.style.top = "";
  window.scrollTo(0, parseInt(scrollY || "0") * -1);
  document.getElementById(element).classList.remove("show");
};
window.addEventListener("scroll", () => {
  document.documentElement.style.setProperty(
    "--scroll-y",
    `${window.scrollY}px`
  );
});

function hide(e) {
  document.getElementById(e).style.display = "none";
}
function show(e) {
  document.getElementById(e).style.display = "block";
}

function toggle(e) {
  if (document.getElementById(e).style.display == "none") {
    document.getElementById(e).style.display = "flex";
  }
  else {
    document.getElementById(e).style.display = "none";
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("darkmode");

  // Check if dark mode is enabled
  var darkModeEnabled = document.body.classList.contains("darkmode");
  console.log(darkModeEnabled);

  const d = new Date();
  d.setTime(d.getTime() + (24*60*60*1000));
  let expires = "expires="+ d.toUTCString();


  document.cookie = "darkModeEnabled=" + darkModeEnabled + ";" + expires + ";path=/";


}

// Function to check and apply dark mode on page load
function checkDarkMode() {
  var darkModeEnabled = (document.cookie.split('; ').find(row => row.startsWith('darkModeEnabled=')) || '').split('=')[1] === 'true';
  if (darkModeEnabled) {
      document.body.classList.add("darkmode");
  }
  console.log("Checking: " + darkModeEnabled);
}

// Call the function on page load
window.onload = checkDarkMode();