const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll("[data-next], [data-back]");

function showScreen(screenId) {
  screens.forEach(function (screen) {
    screen.hidden = true;
  });

  const nextScreen = document.querySelector(`#${screenId}`);
  nextScreen.hidden = false;
}

navButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const nextScreenId = button.dataset.next;
    const backScreenId = button.dataset.back;

    if (nextScreenId) {
      showScreen(nextScreenId);
    }

    if (backScreenId) {
      showScreen(backScreenId);
    }
  });
});
